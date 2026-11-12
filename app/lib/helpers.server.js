import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from './constants.js'

// Qualifying spend ("adjusted" totals) lives in the shared, dependency-free
// ranking module so the server and the storefront drawer can never drift apart
// again — they previously held three copies of this and one had already lost
// the external-discount subtraction. See app/lib/upsell-rank.js.
export { adjustedTotal, adjustedQty } from './upsell-rank.js'

// Page/customer targeting is shared with the drawer bundle (app/lib/page-target.js).
export { pageMatch, getActiveEntries, customerMatchesTags } from './page-target.js'

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

export function isFrozenPage(path) {
  const clean = path.split('?')[0]
  if (FROZEN_PAGES.includes(clean)) return true
  return FROZEN_PAGE_PREFIXES.some((prefix) => clean.startsWith(prefix))
}

export function generateId() {
  return crypto.randomUUID()
}
