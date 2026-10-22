// Mirror of app/lib/analytics-events.js. Keep in sync.
// The drawer bundle has no module resolution to the Remix server, so this
// is duplicated rather than imported. Both files must change together.

export var ANALYTICS_EVENTS = {
  DRAWER_OPENED: 'drawer_opened',
  DRAWER_CLOSED: 'drawer_closed',
  PROMOTION_VIEWED: 'promotion_viewed',
  GIFT_CLAIMED: 'gift_claimed',
  GIFT_REMOVED: 'gift_removed',
  UPSELL_ADDED: 'upsell_added',
  UPSELL_VIEWED: 'upsell_viewed',
  COUPON_APPLIED: 'coupon_applied',
  COUPON_REJECTED: 'coupon_rejected',
};

export var ANALYTICS_BOUNDS = {
  MAX_QUEUE: 100,
  FLUSH_INTERVAL_MS: 10000,
  MAX_CART_CENTS: 10000000,
  MAX_ITEM_COUNT: 1000,
};
