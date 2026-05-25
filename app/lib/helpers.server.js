import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES, LINE_PROPS } from './constants.js'

function isDiscountedItem(item) {
  return item.properties?.[LINE_PROPS.FREEBIE] === 'true' ||
    item.properties?.[LINE_PROPS.CARTMAX_CLAIM] === 'true'
}

export function adjustedTotal(cartItems) {
  const cents = cartItems.reduce((sum, item) => {
    if (isDiscountedItem(item)) return sum
    // Use original_line_price to ignore Shopify Function discounts (e.g. volume discount)
    // so milestone triggers evaluate against pre-discount prices
    return sum + (item.original_line_price ?? item.line_price)
  }, 0)
  // Shopify sends prices in cents; config thresholds are in dollars
  return cents / 100
}

export function adjustedQty(cartItems) {
  return cartItems.reduce((sum, item) => {
    if (isDiscountedItem(item)) return sum
    return sum + item.quantity
  }, 0)
}

export function computeTotalSavings(cart) {
  if (!cart) return 0
  // original_total_price is the cart total before any discount is applied;
  // total_price is the final amount after all discounts. Their difference
  // is the authoritative "amount saved" the customer pays less.
  const totals = (cart.original_total_price ?? 0) - (cart.total_price ?? 0)
  if (totals > 0) return totals

  // Fallback for payloads missing the top-level totals: sum per-line deltas.
  const items = cart.items || []
  return items.reduce((sum, item) => {
    const orig = item.original_line_price ?? item.line_price ?? 0
    const fin = item.final_line_price ?? item.line_price ?? 0
    return sum + Math.max(0, orig - fin)
  }, 0)
}

export function pageMatch(entryHandles, currentPath) {
  const path = currentPath.split('?')[0]
  if (entryHandles.includes('/')) return true
  return entryHandles.includes(path)
}

function normalizeTag(t) {
  return String(t).trim().toLowerCase()
}

/**
 * True when `customer` satisfies `rule.customer_tags` targeting.
 * - No targeting set → matches everyone (including guests).
 * - required_any → customer must carry at least one of these tags; a guest
 *   (no customer) therefore fails.
 * - excluded → customer must carry none of these tags; a guest passes.
 */
export function customerMatchesTags(rule, customer) {
  const target = rule?.customer_tags
  if (!target) return true
  const required = (target.required_any || []).map(normalizeTag).filter(Boolean)
  const excluded = (target.excluded || []).map(normalizeTag).filter(Boolean)
  const tags = (customer?.tags || []).map(normalizeTag)
  if (excluded.length && excluded.some((t) => tags.includes(t))) return false
  if (required.length && !required.some((t) => tags.includes(t))) return false
  return true
}

export function getActiveEntries(currentPath, allEntries) {
  const path = currentPath.split('?')[0]
  const specific = allEntries.filter(
    (e) => e.page_handles.some((h) => h !== '/' && h === path)
  )
  if (specific.length > 0) return specific

  return allEntries.filter((e) => e.page_handles.includes('/'))
}

export function isFrozenPage(path) {
  const clean = path.split('?')[0]
  if (FROZEN_PAGES.includes(clean)) return true
  return FROZEN_PAGE_PREFIXES.some((prefix) => clean.startsWith(prefix))
}

export function generateId() {
  return crypto.randomUUID()
}
