import { getActiveEntries, customerMatchesTags } from '../helpers.server.js'
import { LINE_PROPS } from '../constants.js'
import { offerTriggered, volumeQualifyingQty } from '../line-match.js'

function normalizeId(id) {
  const s = String(id)
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

// Trigger + volume counting live in the shared matcher (app/lib/line-match.js)
// so the drawer counts exactly the same lines.
function evaluateTrigger(offer, cart, adjustedTotal, adjustedQty) {
  return offerTriggered(offer, cart.items, adjustedTotal, adjustedQty)
}

function countQualifyingItems(offer, cart) {
  return volumeQualifyingQty(offer, cart.items)
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
  customer,
  { paused = false } = {}
) {
  const eligible = offers.filter((o) => o.enabled && customerMatchesTags(o, customer))
  const active = getActiveEntries(page, eligible)
  // `paused` is a boolean or a per-offer predicate (pausedOnPage).
  const isPaused = typeof paused === 'function' ? paused : () => paused
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

    // An "Only this milestone" custom milestone on this page pauses gift
    // offers here ("Only this page's promotions" pauses the "All pages" ones):
    // nothing new is added or shown. Gifts already in the cart are kept by the
    // cross-page pass below. (Volume discounts are applied by the Function
    // wherever the cart is, so they're still reported above.)
    if (isPaused(offer)) continue

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
            // Absent on offers saved before prices were stored; the card then
            // shows the title only.
            price: data?.price || '',
            compare_at_price: data?.compare_at_price || '',
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
