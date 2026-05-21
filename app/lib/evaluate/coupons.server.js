import { pageMatch } from '../helpers.server.js'

/**
 * Collect all applied discount codes from the cart.
 */
function getAppliedCodes(cart) {
  const codes = new Set()
  // From cart-level discount applications (title field)
  for (const d of cart.cart_level_discount_applications || []) {
    if (d.title) codes.add(d.title.toUpperCase())
  }
  // From line-level discount allocations
  for (const item of cart.items || []) {
    for (const alloc of item.line_level_discount_allocations || []) {
      const title = alloc.discount_application?.title
      if (title) codes.add(title.toUpperCase())
    }
  }
  // From cart.discount_codes array (Shopify AJAX API includes this)
  for (const dc of cart.discount_codes || []) {
    if (dc.code) codes.add(dc.code.toUpperCase())
  }
  return codes
}

/**
 * Return coupons to showcase in the drawer for the current page/audience.
 * Marks each as applied if its code is found in the cart's discount applications.
 */
export function resolveAvailableCoupons(coupons, cart, page) {
  const appliedCodes = getAppliedCodes(cart)
  const results = []

  for (const coupon of coupons) {
    if (!coupon.enabled) continue
    if (!pageMatch(coupon.page_handles, page)) continue

    const codeUpper = (coupon.code || '').toUpperCase()
    const titleUpper = (coupon.title || '').toUpperCase()
    // Code discounts match by code; automatic discounts match by title in cart applications
    const isApplied = coupon.is_automatic
      ? appliedCodes.has(titleUpper)
      : codeUpper && appliedCodes.has(codeUpper)

    results.push({
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      type_label: coupon.type_label,
      is_automatic: coupon.is_automatic || false,
      display_message: coupon.display_message || null,
      applied: isApplied,
    })
  }

  return results
}
