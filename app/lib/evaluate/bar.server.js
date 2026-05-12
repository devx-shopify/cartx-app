import { audienceFilter, pageMatch } from '../helpers.server.js'
import { resolveTemplate } from './messages.server.js'

function collectBarEntries(config, page, customer) {
  const entries = []

  for (const offer of config.offers) {
    if (!offer.enabled || !offer.bar?.show || !audienceFilter(offer, customer))
      continue
    if (!pageMatch(offer.page_handles, page)) continue
    entries.push({
      id: offer.id,
      source: 'offer',
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

  for (const claim of config.claim_gifts) {
    if (!claim.enabled || !claim.bar?.show || !audienceFilter(claim, customer))
      continue
    if (!pageMatch(claim.page_handles, page)) continue
    entries.push({
      id: claim.id,
      source: 'claim_gift',
      threshold: claim.trigger.threshold,
      trigger_type: claim.trigger.type,
      label: claim.bar.label,
      sub_label: claim.bar.sub_label || null,
      icon_url: claim.bar.icon_url || null,
      top_message: claim.bar.locked_message || null,
    })
  }

  for (const m of config.progress_bar.visual_milestones) {
    if (!m.enabled || !audienceFilter(m, customer)) continue
    if (!pageMatch(m.page_handles, page)) continue
    entries.push({
      id: m.id,
      source: 'visual_milestone',
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
      merged.push({
        ...group[0],
        label: group.map((e) => e.label).join('\n+ '),
        sources: group.map((e) => ({ id: e.id, source: e.source })),
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
        ? resolveTemplate(tier.top_message, { PRICE: remaining }, moneyFormat)
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
      threshold: t.threshold,
      label: t.label,
      sub_label: t.sub_label,
      icon_url: t.icon_url,
      state: t.state,
      apply_button: t.apply_button,
      ribbon_message: t.ribbon_message || null,
    })),
  }
}

export function buildBar(config, page, customer, adjustedTotal, adjustedQty, moneyFormat) {
  if (!config.progress_bar.enabled) return null

  const entries = collectBarEntries(config, page, customer)
  if (entries.length === 0) return null

  // Price priority
  const mode = entries.some((e) => e.trigger_type === 'price')
    ? 'price'
    : 'quantity'

  const filtered = entries.filter((e) => e.trigger_type === mode)
  const merged = mergeCollisions(filtered)
  merged.sort((a, b) => a.threshold - b.threshold)

  const currentValue = mode === 'price' ? adjustedTotal : adjustedQty
  return computeBarState(
    merged,
    currentValue,
    config.progress_bar.all_complete_message,
    moneyFormat
  )
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
