import { getActiveEntries, customerMatchesTags } from '../helpers.server.js'
import { LINE_PROPS } from '../constants.js'

function normalizeId(id) {
  const s = String(id)
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

function evaluateTrigger(offer, cart, adjustedTotal, adjustedQty) {
  // Product presence trigger — fires when any source variant is in cart
  if (offer.source?.type === 'product') {
    const ids = (offer.source.product_variant_ids || []).map(normalizeId)
    return cart.items.some((item) => ids.includes(normalizeId(item.variant_id)))
  }

  let scopeTotal = adjustedTotal
  let scopeQty = adjustedQty

  // Collection scoping — only count items from that collection
  // Note: collection matching requires product metadata; for now use full cart
  // This will be enhanced when collection data is available from evaluate-cart request

  const priceMet =
    offer.trigger.price_threshold && scopeTotal >= offer.trigger.price_threshold
  const qtyMet =
    offer.trigger.quantity_threshold &&
    scopeQty >= offer.trigger.quantity_threshold

  return priceMet || qtyMet
}

// ── Volume discount helpers ─────────────────────────────────

function countQualifyingItems(offer, cart) {
  const items = cart.items || []
  if (offer.source?.type === 'product') {
    const ids = (offer.source.product_variant_ids || []).map(normalizeId)
    return items.reduce((sum, item) => {
      if (item.properties?.[LINE_PROPS.FREEBIE] === 'true') return sum
      return ids.includes(normalizeId(item.variant_id)) ? sum + item.quantity : sum
    }, 0)
  }
  // Collection or no source — count all non-freebie items
  return items.reduce((sum, item) => {
    if (item.properties?.[LINE_PROPS.FREEBIE] === 'true') return sum
    return sum + item.quantity
  }, 0)
}

function getActiveVolumeTier(offer, qualifyingQty) {
  if (offer.reward.type !== 'volume_discount') return null
  const tiers = (offer.reward.tiers || []).slice().sort((a, b) => b.quantity - a.quantity)
  for (const tier of tiers) {
    if (qualifyingQty >= tier.quantity) return tier
  }
  return null
}

function getNextVolumeTier(offer, qualifyingQty) {
  if (offer.reward.type !== 'volume_discount') return null
  const tiers = (offer.reward.tiers || []).slice().sort((a, b) => a.quantity - b.quantity)
  for (const tier of tiers) {
    if (qualifyingQty < tier.quantity) return tier
  }
  return null
}

function alreadyInCart(cart, variantId, offerId) {
  const normalizedVid = normalizeId(variantId)
  return cart.items.some(
    (item) =>
      normalizeId(item.variant_id) === normalizedVid &&
      item.properties?.[LINE_PROPS.OFFER_ID] === offerId
  )
}

export function evaluateOffers(
  offers,
  cart,
  adjustedTotal,
  adjustedQty,
  page,
  customer
) {
  const eligible = offers.filter((o) => o.enabled && customerMatchesTags(o, customer))
  const active = getActiveEntries(page, eligible)
  const toAdd = []
  const toDisplay = []
  const triggeredOfferIds = new Set()
  const volumeDiscounts = []

  for (const offer of active) {
    // Volume discount offers use their own trigger logic
    if (offer.reward.type === 'volume_discount') {
      const qualifyingQty = countQualifyingItems(offer, cart)
      const activeTier = getActiveVolumeTier(offer, qualifyingQty)
      const nextTier = getNextVolumeTier(offer, qualifyingQty)

      if (activeTier) triggeredOfferIds.add(offer.id)

      volumeDiscounts.push({
        offer_id: offer.id,
        name: offer.name,
        discount_mode: offer.reward.discount_mode,
        qualifying_qty: qualifyingQty,
        active_tier: activeTier,
        next_tier: nextTier,
        tiers: offer.reward.tiers,
      })
      continue
    }

    const triggered = evaluateTrigger(offer, cart, adjustedTotal, adjustedQty)
    if (!triggered) continue

    triggeredOfferIds.add(offer.id)

    if (offer.reward.type === 'auto_add_gift') {
      if (offer.reward.add_mode === 'auto') {
        const autoVariantData = offer.reward.gift_variant_data || []
        for (const variantId of offer.reward.gift_variants) {
          if (!alreadyInCart(cart, variantId, offer.id)) {
            const gd = autoVariantData.find(
              (d) => normalizeId(d.variant_id) === normalizeId(variantId)
            )
            toAdd.push({
              variant_id: variantId,
              quantity: offer.reward.quantity_per_variant,
              // Include display data so the drawer renders the real gift line
              // instantly (no "Free gift" skeleton before reconcile).
              title: gd?.title || '',
              image: gd?.image || '',
              properties: {
                [LINE_PROPS.FREEBIE]: 'true',
                [LINE_PROPS.ACQUIRED_ON_PAGE]: page,
                [LINE_PROPS.OFFER_ID]: offer.id,
              },
            })
          }
        }
      } else if (offer.reward.add_mode === 'display') {
        const variantData = offer.reward.gift_variant_data || []
        const gifts = (offer.reward.gift_variants || []).map((vid) => {
          const data = variantData.find(
            (d) => normalizeId(d.variant_id) === normalizeId(vid)
          )
          return {
            variant_id: vid,
            title: data?.title || '',
            image: data?.image || '',
            in_cart: alreadyInCart(cart, vid, offer.id),
            available: true,
          }
        })
        toDisplay.push({
          offer_id: offer.id,
          offer_name: offer.name,
          quantity_per_variant: offer.reward.quantity_per_variant,
          gifts,
        })
      }
    }
  }

  // Build a set of ALL triggered offer IDs (across all pages, not just current page)
  // so gifts from cross-page offers aren't removed on navigation
  const allTriggeredOfferIds = new Set()
  // Per-offer set of the variants each triggered auto-gift offer CURRENTLY grants
  // (normalized numeric strings). Used to drop gift lines from a recycled/edited
  // offer id that no longer lists that variant. Built over `eligible` (all pages)
  // to match allTriggeredOfferIds' cross-page semantics.
  const allTriggeredGiftVids = new Map()
  for (const offer of eligible) {
    if (offer.reward.type === 'volume_discount') {
      const qQty = countQualifyingItems(offer, cart)
      if (getActiveVolumeTier(offer, qQty)) allTriggeredOfferIds.add(offer.id)
    } else {
      if (evaluateTrigger(offer, cart, adjustedTotal, adjustedQty)) {
        allTriggeredOfferIds.add(offer.id)
        if (offer.reward.type === 'auto_add_gift') {
          allTriggeredGiftVids.set(
            offer.id,
            new Set((offer.reward.gift_variants || []).map((v) => String(normalizeId(v))))
          )
        }
      }
    }
  }

  // Remove gift lines that no longer belong to a currently-granting offer. A gift
  // line is KEPT only when its offer is triggered AND still lists the line's
  // variant — so a recycled/edited offer id that now grants different products
  // drops its stale lines. Skip claimed gifts (handled by claim removal) and
  // lines without a cartx offer id (not ours). Guard: never strip when the config
  // has no offers, so a mis-resolved/empty config can't wipe legitimate gifts.
  const toRemove = []
  if (offers.length > 0) {
    for (const item of cart.items || []) {
      if (item.properties?.[LINE_PROPS.FREEBIE] !== 'true') continue
      if (item.properties?.[LINE_PROPS.CLAIMED] === 'true') continue
      const offerId = item.properties?.[LINE_PROPS.OFFER_ID]
      if (!offerId) continue
      const granted = allTriggeredGiftVids.get(offerId)
      const keep =
        allTriggeredOfferIds.has(offerId) &&
        granted &&
        granted.has(String(normalizeId(item.variant_id)))
      if (!keep) toRemove.push(item.key)
    }
  }

  return {
    to_add: toAdd,
    to_display: toDisplay,
    to_remove: toRemove,
    active_offer_ids: active.map((o) => o.id),
    volume_discounts: volumeDiscounts,
  }
}

export { countQualifyingItems, getActiveVolumeTier, getNextVolumeTier }
