// Single source of truth for analytics event names. Imported by the server
// (validation, helpers) and mirrored into the storefront bundle in Phase 2.
// Keep names snake_case and grouped by source.

export const ANALYTICS_EVENTS = {
  DRAWER_OPENED: 'drawer_opened',
  DRAWER_CLOSED: 'drawer_closed',
  PROMOTION_VIEWED: 'promotion_viewed',
  GIFT_CLAIMED: 'gift_claimed',
  GIFT_REMOVED: 'gift_removed',
  UPSELL_ADDED: 'upsell_added',
  UPSELL_VIEWED: 'upsell_viewed',
  COUPON_APPLIED: 'coupon_applied',
  COUPON_REJECTED: 'coupon_rejected',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  ORDER_COMPLETED: 'order_completed',
  ORDER_ATTRIBUTED: 'order_attributed',
}

const VALID_EVENT_NAMES = new Set(Object.values(ANALYTICS_EVENTS))

export const ANALYTICS_SOURCES = {
  DRAWER: 'drawer',
  WEB_PIXEL: 'web_pixel',
  SERVER: 'server',
}

const VALID_SOURCES = new Set(Object.values(ANALYTICS_SOURCES))

// Shop-wide bucket (used when an event has no specific promotion, e.g. drawer_opened)
export const SHOP_WIDE_PROMOTION_ID = '_shop'

// Bounds used when clamping numeric fields. Reject anything wildly out of range.
export const ANALYTICS_BOUNDS = {
  MAX_CART_CENTS: 10_000_000, // 100,000.00 of any currency
  MAX_ITEM_COUNT: 1_000,
  MAX_BATCH_SIZE: 100,
  MAX_PAST_MS: 24 * 60 * 60 * 1000, // 24h
  MAX_FUTURE_MS: 5 * 60 * 1000, // 5min clock skew tolerance
}

export function isValidEventName(name) {
  return typeof name === 'string' && VALID_EVENT_NAMES.has(name)
}

export function isValidSource(source) {
  return typeof source === 'string' && VALID_SOURCES.has(source)
}
