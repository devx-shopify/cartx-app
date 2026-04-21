import { audienceFilter, getActiveEntries } from '../helpers.server.js'
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
  const eligible = offers.filter(
    (o) => o.enabled && audienceFilter(o, customer)
  )
  const active = getActiveEntries(page, eligible)
  const toAdd = []
  const triggeredOfferIds = new Set()

  for (const offer of active) {
    const triggered = evaluateTrigger(offer, cart, adjustedTotal, adjustedQty)
    if (!triggered) continue

    triggeredOfferIds.add(offer.id)

    if (
      offer.reward.type === 'auto_add_gift' &&
      offer.reward.add_mode === 'auto'
    ) {
      for (const variantId of offer.reward.gift_variants) {
        if (!alreadyInCart(cart, variantId, offer.id)) {
          toAdd.push({
            variant_id: variantId,
            quantity: offer.reward.quantity_per_variant,
            properties: {
              [LINE_PROPS.FREEBIE]: 'true',
              [LINE_PROPS.ACQUIRED_ON_PAGE]: page,
              [LINE_PROPS.OFFER_ID]: offer.id,
            },
          })
        }
      }
    }
  }

  // Find gift items in cart whose offer is no longer triggered — remove them
  // Skip claimed gifts — those persist until manually removed
  const toRemove = []
  for (const item of cart.items || []) {
    if (item.properties?.[LINE_PROPS.FREEBIE] !== 'true') continue
    if (item.properties?.[LINE_PROPS.CLAIMED] === 'true') continue
    const offerId = item.properties?.[LINE_PROPS.OFFER_ID]
    if (!offerId) continue
    if (!triggeredOfferIds.has(offerId)) {
      toRemove.push(item.key)
    }
  }

  return {
    to_add: toAdd,
    to_remove: toRemove,
    active_offer_ids: active.map((o) => o.id),
  }
}
