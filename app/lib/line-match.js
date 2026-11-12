// Trigger source matching, shared by the server (evaluate), the storefront
// drawer bundle (rules.js / evaluate.js) and the progress bar builder, so a
// promotion or milestone scoped to "these products" or "this collection" counts
// the same cart lines everywhere. Keep it dependency-free (it may import
// upsell-rank.js); a change here needs BOTH deploys.
//
// A source is one of:
//   undefined / { type: 'cart' }                 → the whole cart
//   { type: 'product', product_variant_ids }     → promotions: these variants
//   { type: 'products', product_ids }            → milestones: any variant of these products
//   { type: 'collection', collection_id, collection_product_ids }
//
// `collection_product_ids` is resolved from Shopify when the merchant saves and
// kept fresh by webhooks. A collection saved before that existed has no list
// yet: it keeps counting the whole cart (the old behaviour) until it's re-saved.
// An empty list means an empty collection, which matches nothing.
import { normalizeId, isGiftLine, externalDiscountCents } from './upsell-rank.js'

function idSet(list) {
  var set = {}
  var arr = list || []
  for (var i = 0; i < arr.length; i++) set[String(normalizeId(arr[i]))] = true
  return set
}

/**
 * Turn a source into a matcher, or null when it covers the whole cart.
 * @returns {null | {variants: object|null, products: object|null}}
 */
export function sourceMatcher(source) {
  if (!source || !source.type || source.type === 'cart') return null
  if (source.type === 'product') {
    return { variants: idSet(source.product_variant_ids), products: null }
  }
  if (source.type === 'products') {
    return { variants: null, products: idSet(source.product_ids) }
  }
  if (source.type === 'collection') {
    if (!Array.isArray(source.collection_product_ids)) return null
    return { variants: null, products: idSet(source.collection_product_ids) }
  }
  return null
}

/** Does this cart line belong to the source? (null matcher = every line) */
export function lineMatches(item, matcher) {
  if (!matcher) return true
  if (!item) return false
  if (matcher.variants) return !!matcher.variants[String(normalizeId(item.variant_id))]
  if (matcher.products) return !!matcher.products[String(normalizeId(item.product_id))]
  return false
}

/**
 * Qualifying spend (MAJOR units) and quantity for the lines a source covers —
 * gift lines excluded, external discounts subtracted, exactly like
 * adjustedTotal/adjustedQty in upsell-rank.js (which this equals for the whole
 * cart).
 */
export function scopedTotals(items, source) {
  var matcher = sourceMatcher(source)
  var list = items || []
  var cents = 0
  var qty = 0
  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    if (isGiftLine(item) || !lineMatches(item, matcher)) continue
    var gross = item.original_line_price != null ? item.original_line_price : (item.line_price || 0)
    cents += Math.max(0, gross - externalDiscountCents(item))
    qty += item.quantity || 0
  }
  return { total: cents / 100, qty: qty }
}

/** True when the source narrows the cart (so the bar must use its own totals). */
export function isScoped(source) {
  return sourceMatcher(source) !== null
}

/**
 * A short stable key for a source, so bar milestones that count different
 * lines never merge into one marker just because they share a threshold.
 */
export function sourceKey(source) {
  var m = sourceMatcher(source)
  if (!m) return ''
  var set = m.variants || m.products || {}
  return (m.variants ? 'v:' : 'p:') + Object.keys(set).sort().join(',')
}

/**
 * Has a promotion's trigger been met? Shared by the server and the drawer.
 * - "Specific products" is a presence trigger: any of its variants in the cart.
 * - "A collection" counts only that collection's lines toward the threshold.
 * - No source: the whole cart's qualifying spend/quantity.
 */
export function offerTriggered(offer, items, adjTotal, adjQty) {
  var source = offer && offer.source
  if (source && source.type === 'product') {
    var matcher = sourceMatcher(source)
    var list = items || []
    for (var i = 0; i < list.length; i++) {
      if (lineMatches(list[i], matcher)) return true
    }
    return false
  }
  var total = adjTotal
  var qty = adjQty
  if (isScoped(source)) {
    var scoped = scopedTotals(items, source)
    total = scoped.total
    qty = scoped.qty
  }
  var t = (offer && offer.trigger) || {}
  return !!((t.price_threshold && total >= t.price_threshold) ||
    (t.quantity_threshold && qty >= t.quantity_threshold))
}

/** Non-gift units a volume offer counts (its source, or the whole cart). */
export function volumeQualifyingQty(offer, items) {
  var matcher = sourceMatcher(offer && offer.source)
  var list = items || []
  var qty = 0
  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    if (((item && item.properties) || {})._freebie === 'true') continue
    if (lineMatches(item, matcher)) qty += item.quantity || 0
  }
  return qty
}
