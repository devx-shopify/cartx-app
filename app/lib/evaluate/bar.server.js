import { pageMatch, getActiveEntries, customerMatchesTags } from '../helpers.server.js'
import { resolveTemplate } from './messages.server.js'
import { orderTiers } from '../tier-order.js'

function collectBarEntries(config, page, customer) {
  const entries = []

  // Use getActiveEntries for offers — page-specific offers take priority over global ones
  const eligibleOffers = (config.offers || []).filter(
    (o) => o.enabled && o.bar?.show && customerMatchesTags(o, customer),
  )
  const activeOffers = getActiveEntries(page, eligibleOffers)
  const activeOfferIds = new Set(activeOffers.map((o) => o.id))

  for (const offer of config.offers) {
    if (!activeOfferIds.has(offer.id)) continue

    // Volume discount offers auto-generate one bar entry per tier
    if (offer.reward?.type === 'volume_discount') {
      const tiers = (offer.reward.tiers || []).slice().sort((a, b) => a.quantity - b.quantity)
      for (const tier of tiers) {
        const tierMainLabel = `Buy ${tier.quantity}`
        const tierSubLabel = offer.reward.discount_mode === 'fixed_total'
          ? `₹${tier.value}`
          : `${tier.value}% OFF`
        entries.push({
          id: offer.id + '_tier_' + tier.quantity,
          source: 'volume_discount',
          promotion_id: offer.id,
          promotion_type: 'offer',
          threshold: tier.quantity,
          trigger_type: 'quantity',
          label: tierMainLabel,
          sub_label: tierSubLabel,
          icon_url: offer.bar.icon_url || null,
          top_message: `Add [[QTY]] more for ${tierMainLabel} @ ${tierSubLabel}!`,
          ribbon_message: null,
          _volume_tier_value: tier.value,
          _volume_discount_mode: offer.reward.discount_mode,
        })
      }
      continue
    }

    entries.push({
      id: offer.id,
      source: 'offer',
      promotion_id: offer.id,
      promotion_type: 'offer',
      threshold:
        offer.trigger.price_threshold || offer.trigger.quantity_threshold,
      trigger_type: offer.trigger.price_threshold ? 'price' : 'quantity',
      label: offer.bar.label,
      sub_label: offer.bar.sub_label || null,
      icon_url: offer.bar.icon_url || null,
      top_message: offer.bar.top_message || null,
      ribbon_message: offer.bar.ribbon_message || null,
    })
  }

  // Coupons no longer contribute to the progress bar — they're showcase only

  // Check if any page-specific offers matched — if so, suppress global claims/milestones
  const hasPageSpecificOffers = activeOffers.some(
    (o) => !o.page_handles.includes('/')
  )

  // Use getActiveEntries for claims — but suppress if page-specific offers exist
  const eligibleClaims = (config.claim_gifts || []).filter(
    (c) => c.enabled && c.bar?.show && customerMatchesTags(c, customer),
  )
  const activeClaims = hasPageSpecificOffers ? [] : getActiveEntries(page, eligibleClaims)
  const activeClaimIds = new Set(activeClaims.map((c) => c.id))

  for (const claim of config.claim_gifts) {
    if (!activeClaimIds.has(claim.id)) continue
    entries.push({
      id: claim.id,
      source: 'claim_gift',
      promotion_id: claim.id,
      promotion_type: 'claim-gift',
      threshold: claim.trigger.threshold,
      trigger_type: claim.trigger.type,
      label: claim.bar.label,
      sub_label: claim.bar.sub_label || null,
      icon_url: claim.bar.icon_url || null,
      top_message: claim.bar.locked_message || null,
    })
  }

  for (const m of config.progress_bar.visual_milestones) {
    if (hasPageSpecificOffers) continue
    if (!m.enabled) continue
    if (!pageMatch(m.page_handles, page)) continue
    if (!customerMatchesTags(m, customer)) continue
    entries.push({
      id: m.id,
      source: 'visual_milestone',
      // Visual milestones are not promotions — no promotion_id/type so the
      // drawer-side observer skips them.
      promotion_id: null,
      promotion_type: null,
      threshold: m.trigger.threshold,
      trigger_type: m.trigger.type,
      label: m.label,
      sub_label: m.sub_label || null,
      icon_url: m.icon_url || null,
    })
  }

  return entries
}

function mergeCollisions(entries) {
  const groups = new Map()
  for (const e of entries) {
    const key = e.threshold
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(e)
  }

  const merged = []
  for (const [, group] of groups) {
    if (group.length === 1) {
      merged.push(group[0])
    } else {
      // For analytics impressions, fire against the first underlying source.
      // The full list is retained on `sources` for future per-source tracking.
      merged.push({
        ...group[0],
        label: group.map((e) => e.label).join('\n+ '),
        sources: group.map((e) => ({ id: e.id, source: e.source, promotion_id: e.promotion_id, promotion_type: e.promotion_type })),
      })
    }
  }
  return merged
}

function computeBarState(tiers, currentValue, allCompleteMsg, moneyFormat) {
  const segmentWidth = 100 / tiers.length
  let progress = 0
  let nextFound = false
  let topMessage = null
  let prevThreshold = 0

  for (const tier of tiers) {
    if (currentValue >= tier.threshold) {
      tier.state = 'active'
      progress += segmentWidth
    } else if (!nextFound) {
      tier.state = 'next'
      const remaining = tier.threshold - currentValue
      const segmentRange = tier.threshold - prevThreshold
      const segmentProgress = segmentRange > 0 ? (currentValue - prevThreshold) / segmentRange : 0
      progress += segmentProgress * segmentWidth
      nextFound = true
      topMessage = tier.top_message
        ? resolveTemplate(
            tier.top_message,
            {
              PRICE: tier._volume_tier_value || remaining,
              QTY: remaining,
            },
            moneyFormat
          )
        : null
    } else {
      tier.state = 'inactive'
    }
    prevThreshold = tier.threshold
  }

  if (!nextFound) {
    topMessage = allCompleteMsg
  }

  return {
    enabled: true,
    mode: tiers[0]?.trigger_type || null,
    progress_pct: Math.min(progress, 100),
    top_message: topMessage,
    tiers: tiers.map((t) => ({
      id: t.id,
      source: t.source,
      promotion_id: t.promotion_id || null,
      promotion_type: t.promotion_type || null,
      threshold: t.threshold,
      trigger_type: t.trigger_type,
      label: t.label,
      sub_label: t.sub_label,
      icon_url: t.icon_url,
      state: t.state,
      apply_button: t.apply_button,
      ribbon_message: t.ribbon_message || null,
    })),
  }
}

function computeTierStates(tiers, currentValue) {
  let nextFound = false
  let prevThreshold = 0
  return tiers.map((tier) => {
    let state
    let topMsg = null
    if (currentValue >= tier.threshold) {
      state = 'active'
    } else if (!nextFound) {
      state = 'next'
      nextFound = true
      const remaining = tier.threshold - currentValue
      topMsg = tier.top_message
        ? resolveTemplate(tier.top_message, { PRICE: tier._volume_tier_value || remaining, QTY: remaining }, '')
        : null
    } else {
      state = 'inactive'
    }
    const result = {
      ...tier,
      state,
      _top_message: topMsg,
      _prevThreshold: prevThreshold,
      _trigger_type: tier.trigger_type,
    }
    prevThreshold = tier.threshold
    return result
  })
}

export function buildBar(config, page, adjustedTotal, adjustedQty, moneyFormat, customer) {
  if (!config.progress_bar.enabled) return null

  const entries = collectBarEntries(config, page, customer)
  if (entries.length === 0) return null

  const tierOrder = config.progress_bar.tier_order || []

  // Separate entries by trigger type
  const priceEntries = entries.filter((e) => e.trigger_type === 'price')
  const qtyEntries = entries.filter((e) => e.trigger_type === 'quantity')

  // If both types exist, compute each independently and merge the tiers
  if (priceEntries.length > 0 && qtyEntries.length > 0) {
    const priceMerged = mergeCollisions(priceEntries)
    priceMerged.sort((a, b) => a.threshold - b.threshold)
    const priceTiers = computeTierStates(priceMerged, adjustedTotal)

    const qtyMerged = mergeCollisions(qtyEntries)
    qtyMerged.sort((a, b) => a.threshold - b.threshold)
    const qtyTiers = computeTierStates(qtyMerged, adjustedQty)

    // States are worked out in amount order above; this is display order only.
    const allTiers = orderTiers([...priceTiers, ...qtyTiers], tierOrder)
    const nextTier = allTiers.find((t) => t.state === 'next')
    const allComplete = allTiers.every((t) => t.state === 'active')

    // Compute combined progress
    const totalSegments = allTiers.length
    const activeCount = allTiers.filter((t) => t.state === 'active').length
    let progressPct = (activeCount / totalSegments) * 100
    if (nextTier) {
      // Add partial progress for the next tier
      const partial = nextTier._trigger_type === 'price'
        ? (adjustedTotal - (nextTier._prevThreshold || 0)) / (nextTier.threshold - (nextTier._prevThreshold || 0))
        : (adjustedQty - (nextTier._prevThreshold || 0)) / (nextTier.threshold - (nextTier._prevThreshold || 0))
      progressPct += Math.max(0, Math.min(1, partial)) * (100 / totalSegments)
    }

    return {
      enabled: true,
      mode: 'mixed',
      progress_pct: Math.min(progressPct, 100),
      top_message: nextTier?._top_message || (allComplete ? config.progress_bar.all_complete_message : null),
      tiers: allTiers.map((t) => ({
        id: t.id, source: t.source,
        promotion_id: t.promotion_id || null,
        promotion_type: t.promotion_type || null,
        threshold: t.threshold,
        trigger_type: t._trigger_type || t.trigger_type,
        label: t.label, sub_label: t.sub_label, icon_url: t.icon_url,
        state: t.state, ribbon_message: t.ribbon_message || null,
      })),
    }
  }

  // Single mode — original logic
  const mode = priceEntries.length > 0 ? 'price' : 'quantity'
  const filtered = mode === 'price' ? priceEntries : qtyEntries
  const merged = mergeCollisions(filtered)
  merged.sort((a, b) => a.threshold - b.threshold)

  const currentValue = mode === 'price' ? adjustedTotal : adjustedQty
  const bar = computeBarState(
    merged,
    currentValue,
    config.progress_bar.all_complete_message,
    moneyFormat
  )
  if (bar && bar.tiers) {
    bar.tiers = orderTiers(bar.tiers, tierOrder)
  }
  return bar
}

/** Get the ribbon message from the next locked bar tier */
export function getRibbonFromBar(bar) {
  if (!bar) return { ribbon_message: null, ribbon_code: null }
  const next = bar.tiers.find((t) => t.state === 'next')
  return {
    ribbon_message: next?.ribbon_message || null,
    ribbon_code: next?.apply_button?.coupon_code || null,
  }
}
