// =============================================================
// cartx — Can the storefront sell this product?
// Pure, no Node or DOM APIs: the drawer bundles it (via upsell-recs.js) and the
// server uses it to filter gifts and upsells out of evaluate-cart.
//
// Merchants may pick any product in the admin (drafts included, so a promotion
// can be set up before launch). A product only reaches the cart when Shopify
// would actually accept it in /cart/add.js: status ACTIVE or UNLISTED, and
// published to the Online Store. Anything else is rejected with a 422, so the
// drawer would show a gift or upsell that disappears the moment it's added.
// =============================================================

export var SELLABLE_STATUSES = ['ACTIVE', 'UNLISTED'];

// `status` is the Admin API ProductStatus; `online_store` is whether the product
// is published to the Online Store (Product.publishedAt). Not onlineStoreUrl:
// that is null on every product while the storefront is password-protected
// (dev stores, pre-launch), which would hide everything. Snapshots saved
// before these were stored carry neither, so a missing value counts as
// sellable (they backfill on the next product update or admin visit).
export function isSellable(entry) {
  if (!entry) return false;
  var status = entry.status ? String(entry.status).toUpperCase() : '';
  if (status && SELLABLE_STATUSES.indexOf(status) === -1) return false;
  if (entry.online_store === false) return false;
  return true;
}

// Admin-facing reason a picked product won't show in the cart, or null.
export function unsellableReason(entry) {
  if (!entry || isSellable(entry)) return null;
  var status = entry.status ? String(entry.status).toUpperCase() : '';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'ARCHIVED') return 'Archived';
  if (entry.online_store === false) return 'Not on Online Store';
  return 'Unavailable';
}
