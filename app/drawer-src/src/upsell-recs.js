// =============================================================
// cartx — Upsell recommendations (cart-based + static)
// Pure, dependency-free: the drawer bundles it and the server imports it
// directly (proxy.evaluate-cart), so both pick the exact same products.
// =============================================================

// "gid://shopify/Product/123" | 123 | "123" -> "123"
export function numericId(id) {
  if (id === null || id === undefined) return '';
  var s = String(id);
  return s.indexOf('gid://') === 0 ? s.split('/').pop() : s;
}

// cartx gift lines (auto-added freebies, claimed gifts) never trigger
// recommendations. Same markers as rules.js / helpers.showsQuantitySelector.
export function isGiftLine(item) {
  var p = (item && item.properties) || {};
  if (p['_claimed'] === 'true' || p['_cartmax_claim'] === 'true') return true;
  for (var k in p) {
    if (!Object.prototype.hasOwnProperty.call(p, k)) continue;
    if (k.indexOf('_freebie') !== -1 && (p[k] === 'true' || p[k] === true)) return true;
  }
  return false;
}

// The products whose rules apply: non-gift lines, newest first, deduped.
export function triggerProductIds(items) {
  var out = [];
  (items || []).forEach(function (item) {
    if (isGiftLine(item)) return;
    var pid = numericId(item.product_id);
    if (pid && out.indexOf(pid) === -1) out.push(pid);
  });
  return out;
}

function toCard(snapshot, source, triggerId) {
  return {
    product_id: numericId(snapshot.product_id),
    title: snapshot.title,
    handle: snapshot.handle || '',
    image_url: snapshot.image_url || '',
    variant_id: numericId(snapshot.variant_id),
    price: snapshot.price,
    compare_at_price: snapshot.compare_at_price || undefined,
    source: source,
    trigger_product_id: triggerId || null,
  };
}

/**
 * Pick the upsell cards for a cart.
 *
 * @param {object} input
 * @param {Array}  input.items     cart lines, newest first ({ product_id, properties })
 * @param {object} input.rules     { triggerProductId: [recommendedProductId, ...] } (enabled rules only)
 * @param {object} input.catalog   { productId: snapshot } for rule products
 *                                 (snapshot: product_id, title, handle, image_url, variant_id,
 *                                 price, compare_at_price, status)
 * @param {Array}  input.defaults  the default list (config.upsells.products), in order
 * @param {object} input.settings  config.upsells (mode, no_match, fill_with_default,
 *                                 sold_out, max_items, max_per_trigger)
 * @param {object} [input.unavailable] { productId: true } known sold out; skipped when sold_out = 'hide'
 * @param {number} [input.limit]   override the card cap (the drawer asks for extra to backfill)
 * @returns {Array} cards: { product_id, title, handle, image_url, variant_id, price,
 *                  compare_at_price, source: 'rule' | 'default', trigger_product_id }
 */
export function pickRecommendations(input) {
  var items = input.items || [];
  var rules = input.rules || {};
  var catalog = input.catalog || {};
  var defaults = input.defaults || [];
  var settings = input.settings || {};
  var unavailable = input.unavailable || {};
  var hideSoldOut = settings.sold_out !== 'show';

  // Every product already in the cart (any variant, gifts included) is excluded.
  var seen = {};
  items.forEach(function (item) {
    var pid = numericId(item.product_id);
    if (pid) seen[pid] = true;
  });

  var cards = [];
  function take(snapshot, source, triggerId) {
    var pid = numericId(snapshot && snapshot.product_id);
    if (!pid || seen[pid]) return;
    if (hideSoldOut && unavailable[pid]) return;
    seen[pid] = true;
    cards.push(toCard(snapshot, source, triggerId));
  }
  function takeDefaults() {
    defaults.forEach(function (p) { take(p, 'default', null); });
  }

  var limit = input.limit || settings.max_items || 8;

  if (settings.mode !== 'cart_based') {
    takeDefaults();
    return cards.slice(0, limit);
  }

  var maxPerTrigger = settings.max_per_trigger || 10;
  triggerProductIds(items).forEach(function (triggerId) {
    var recs = rules[triggerId];
    if (!recs || !recs.length) return;
    recs.slice(0, maxPerTrigger).forEach(function (recId) {
      var snap = catalog[numericId(recId)];
      if (!snap || (snap.status && snap.status !== 'ACTIVE')) return; // draft / archived / deleted
      take(snap, 'rule', triggerId);
    });
  });

  if (cards.length === 0) {
    if (settings.no_match !== 'none') takeDefaults();
  } else if (settings.fill_with_default) {
    takeDefaults();
  }

  return cards.slice(0, limit);
}
