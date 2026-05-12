import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES, LINE_PROPS } from './constants.js'

function isDiscountedItem(item) {
  return item.properties?.[LINE_PROPS.FREEBIE] === 'true' ||
    item.properties?.[LINE_PROPS.CARTMAX_CLAIM] === 'true'
}

export function adjustedTotal(cartItems) {
  const cents = cartItems.reduce((sum, item) => {
    if (isDiscountedItem(item)) return sum
    return sum + item.line_price
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

export function pageMatch(entryHandles, currentPath) {
  const path = currentPath.split('?')[0]
  if (entryHandles.includes('/')) return true
  return entryHandles.includes(path)
}

export function getActiveEntries(currentPath, allEntries) {
  const path = currentPath.split('?')[0]
  const specific = allEntries.filter(
    (e) => e.page_handles.some((h) => h !== '/' && h === path)
  )
  if (specific.length > 0) return specific

  return allEntries.filter((e) => e.page_handles.includes('/'))
}

export function audienceFilter(entry, customer) {
  switch (entry.audience) {
    case 'all':
      return true
    case 'signed_in':
      return !!customer
    case 'guest':
      return !customer
    case 'vip_tag':
      return customer?.tags?.includes('VIP') ?? false
    default:
      return true
  }
}

export function isFrozenPage(path) {
  const clean = path.split('?')[0]
  if (FROZEN_PAGES.includes(clean)) return true
  return FROZEN_PAGE_PREFIXES.some((prefix) => clean.startsWith(prefix))
}

export function generateId() {
  return crypto.randomUUID()
}
