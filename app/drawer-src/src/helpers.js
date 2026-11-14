// =============================================================
// cartx — Shared Helpers
// =============================================================

import { formatAmount } from '../../lib/money-format.js';

// ── Internal fetch (bypasses cart interceptor) ──────────────

// cartx must not react to its OWN cart calls. That used to be done with a
// page-global boolean held for the lifetime of each request — which meant that
// while any cartx request was in flight, EVERY cart mutation on the page was
// ignored, including the theme's. A shopper whose add-to-cart happened to land
// inside that window got no cart-changed event at all: no re-evaluate, no gift
// reconcile, and a drawer still describing the previous cart.
//
// The marker now travels with the request instead, so a cartx request can only
// ever suppress itself.
var _internalFetchDepth = 0;

export var INTERNAL_HEADER = 'X-Cartx-Internal';

export function internalFetch(url, opts) {
  var o = Object.assign({}, opts || {});
  var h = o.headers;
  // Headers may arrive as a plain object or a Headers instance.
  if (h && typeof h.append === 'function') {
    var copy = new Headers(h);
    copy.set(INTERNAL_HEADER, '1');
    o.headers = copy;
  } else {
    o.headers = Object.assign({}, h || {});
    o.headers[INTERNAL_HEADER] = '1';
  }

  // Legacy global, kept ONLY as a fallback for the kill switch below and for
  // any embed still running the old interception code. Harmless when unused.
  _internalFetchDepth++;
  window.__cartmaxInternal = true;
  return fetch(url, o).finally(function () {
    _internalFetchDepth--;
    if (_internalFetchDepth === 0) {
      window.__cartmaxInternal = false;
    }
  });
}

export function fetchCart() {
  return internalFetch('/cart.js').then(function (r) { return r.json(); });
}

// Single /cart/update.js call with all changes merged
// payload: { updates: { vid: qty }, discount: "CODE1,CODE2" }
export function cartUpdateAll(payload) {
  return internalFetch('/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function (r) {
    return r.json().then(function (data) {
      // A non-2xx (e.g. 422 "updates parameter is invalid") returns an ERROR
      // object, not a cart. It must never be mistaken for the cart — doing so
      // blanks the drawer. Reject so callers' catch blocks keep the last good
      // (optimistic) cart instead.
      if (!r.ok || !data || !Array.isArray(data.items)) {
        var err = new Error((data && (data.description || data.message)) || ('cart update failed: ' + r.status));
        err.cartError = data;
        throw err;
      }
      return data;
    });
  });
}

// ── Optimistic-update utilities ─────────────────────────────
// Dispatch a locally-simulated cart through the same event channel
// evaluate.js uses for qty optimism. CartDrawer's _onOptimisticUpdate
// listener absorbs it into state without waiting for server.
export function dispatchOptimistic(cart) {
  if (!cart) return;
  window.dispatchEvent(new CustomEvent('cartmax:optimistic-update', {
    detail: { cart: cart },
  }));
}

function propertiesSignature(props) {
  if (!props) return '';
  var keys = Object.keys(props).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    parts.push(keys[i] + '=' + props[keys[i]]);
  }
  return parts.join('|');
}

function recomputeCartTotals(cart, items) {
  var totalPrice = 0;
  var originalTotal = 0;
  var itemCount = 0;
  for (var i = 0; i < items.length; i++) {
    totalPrice += (items[i].final_line_price || 0);
    originalTotal += (items[i].original_line_price || items[i].line_price || 0);
    itemCount += (items[i].quantity || 0);
  }
  return Object.assign({}, cart, {
    items: items,
    total_price: totalPrice,
    original_total_price: originalTotal,
    total_discount: Math.max(0, originalTotal - totalPrice),
    item_count: itemCount,
    items_subtotal_price: totalPrice,
  });
}

// Add a single line to a cart snapshot, coalescing with an existing line
// only if variant_id AND properties signature match.
export function simulateAdd(cart, optimisticItem) {
  if (!cart) return cart;
  var items = (cart.items || []).slice();
  var sig = propertiesSignature(optimisticItem.properties);
  var idx = -1;
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].variant_id) === String(optimisticItem.variant_id)
        && propertiesSignature(items[i].properties) === sig) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) {
    var existing = items[idx];
    var newQty = (existing.quantity || 0) + (optimisticItem.quantity || 1);
    var unitPrice = existing.price || 0;
    var newLine = newQty * unitPrice;
    items[idx] = Object.assign({}, existing, {
      quantity: newQty,
      line_price: newLine,
      final_line_price: newLine,
      original_line_price: newLine,
    });
  } else {
    items.push(optimisticItem);
  }
  return recomputeCartTotals(cart, items);
}

// Drop a cart-level discount code; totals stay as-is (we cannot predict
// the new total without re-running the merchant's discount engine).
export function simulateCouponRemove(cart, code) {
  if (!cart || !code) return cart;
  var upper = String(code).toUpperCase();
  var apps = (cart.cart_level_discount_applications || []).filter(function (d) {
    return !(d.title && d.title.toUpperCase() === upper);
  });
  return Object.assign({}, cart, { cart_level_discount_applications: apps });
}

// ── Money formatting ────────────────────────────────────────

// Price display mode from layout.price_decimals; set by the drawer config.
var _priceDecimals = 'store';
export function setPriceDecimals(mode) {
  _priceDecimals = mode === 'hide_zero' || mode === 'hide' ? mode : 'store';
}

// The store's money format: the app embed's data-money-format (shop.money_format)
// first, then the theme's window.Shopify.money_format if it sets one.
export function storeMoneyFormat() {
  var el = typeof document !== 'undefined' && document.getElementById('cartmax-root');
  return (el && el.dataset && el.dataset.moneyFormat)
    || (typeof window !== 'undefined' && window.Shopify && window.Shopify.money_format) || '';
}

export function formatMoney(cents, currency) {
  return formatAmount((Number(cents) || 0) / 100, storeMoneyFormat(), _priceDecimals, currency);
}

// ── Image URL resize ────────────────────────────────────────

export function resizeImage(url, size) {
  if (!url) return '';
  size = size || 128;
  return url.replace(/(\.\w{3,4})(\?.*)?$/, '_' + size + 'x$1$2');
}

// ── Theme cart count badge updates ──────────────────────────

var COUNT_SELECTORS = [
  '.cart-count-bubble span[aria-hidden="true"]',
  '.cart-count-bubble',
  '.cart-count',
  '[data-cart-count]',
  '#CartCount',
  '#cart-icon-bubble span[aria-hidden="true"]',
  '#cart-icon-bubble',
  '.cart-link__bubble-num',
];

var BUBBLE_SELECTORS = ['.cart-count-bubble', '#cart-icon-bubble'];

export function updateCartCount(count) {
  COUNT_SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.children.length === 0 || el.matches('[aria-hidden="true"]')) {
        el.textContent = count;
      }
    });
  });
  BUBBLE_SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (count > 0) {
        el.removeAttribute('hidden');
        el.style.display = '';
      } else {
        el.setAttribute('hidden', '');
      }
    });
  });
}

// ── Context (shop/theme/customer from data attributes) ──────

export function getContext() {
  var el = document.getElementById('cartmax-root');
  if (!el) return { shopId: '', themeId: '', customerId: '', customerTags: [] };
  var tags = [];
  try {
    tags = JSON.parse(decodeURIComponent(el.dataset.customerTags || '[]'));
  } catch (e) {
    tags = [];
  }
  var themeId = el.dataset.themeId ||
    (window.Shopify && window.Shopify.theme && String(window.Shopify.theme.id)) || '';
  var moneyFormat = el.dataset.moneyFormat ||
    (window.Shopify && window.Shopify.money_format) || '';
  return {
    shopId: el.dataset.shopId || '',
    themeId: themeId,
    customerId: el.dataset.customerId || '',
    customerTags: Array.isArray(tags) ? tags : [],
    moneyFormat: moneyFormat,
  };
}

// ── Drawer settings → CSS custom properties ─────────────────

var RADIUS_MAP = { none: '0', small: '6px', medium: '10px', large: '12px', pill: '999px' };
var HEADING_SIZE_MAP = { small: '16px', medium: '18px', large: '20px' };
var BODY_SIZE_MAP = { small: '12px', medium: '13px', large: '14px' };
var IMG_SIZE_MAP = { small: '70px', medium: '90px', large: '110px' };
var DENSITY_MAP = { compact: '8px', comfortable: '16px', spacious: '20px' };
var ANIM_SPEED_MAP = { fast: '150ms', normal: '250ms', slow: '400ms' };

export function applyDrawerSettings(settings) {
  if (!settings) return;
  var root = document.getElementById('cartmax-root');
  if (!root) return;
  var s = root.style;

  // Colors
  var c = settings.colors;
  if (c) {
    if (c.primary) s.setProperty('--cartmax-primary', c.primary);
    if (c.primary_text) s.setProperty('--cartmax-primary-text', c.primary_text);
    if (c.background) s.setProperty('--cartmax-bg', c.background);
    if (c.text) s.setProperty('--cartmax-text', c.text);
    if (c.secondary_text) s.setProperty('--cartmax-text-secondary', c.secondary_text);
    if (c.border) s.setProperty('--cartmax-border', c.border);
    if (c.accent) s.setProperty('--cartmax-accent', c.accent);
    if (c.secondary_accent) s.setProperty('--cartmax-secondary-accent', c.secondary_accent);
    if (c.overlay_opacity != null) s.setProperty('--cartmax-overlay-opacity', c.overlay_opacity);
    if (c.savings_bg) s.setProperty('--cartmax-savings-bg', c.savings_bg);
    if (c.savings_text) s.setProperty('--cartmax-savings-text', c.savings_text);
    if (c.savings_amount) s.setProperty('--cartmax-savings-amount', c.savings_amount);
  }

  // Shape
  var sh = settings.shape;
  if (sh) {
    if (sh.border_radius && RADIUS_MAP[sh.border_radius]) {
      s.setProperty('--cartmax-radius', RADIUS_MAP[sh.border_radius]);
    }
  }

  // Typography
  var t = settings.typography;
  if (t) {
    if (t.heading_size && HEADING_SIZE_MAP[t.heading_size]) {
      s.setProperty('--cartmax-heading-size', HEADING_SIZE_MAP[t.heading_size]);
    }
    if (t.body_size && BODY_SIZE_MAP[t.body_size]) {
      s.setProperty('--cartmax-body-size', BODY_SIZE_MAP[t.body_size]);
    }
  }

  // Layout
  var l = settings.layout;
  if (l) {
    if (l.drawer_width) s.setProperty('--cartmax-width', l.drawer_width + 'px');
    if (l.image_size && IMG_SIZE_MAP[l.image_size]) {
      s.setProperty('--cartmax-img-size', IMG_SIZE_MAP[l.image_size]);
    }
    if (l.density && DENSITY_MAP[l.density]) {
      s.setProperty('--cartmax-density-padding', DENSITY_MAP[l.density]);
    }
    if (l.empty_icon_color) s.setProperty('--cartmax-empty-icon-color', l.empty_icon_color);
  }

  // Animation speed
  var b = settings.behavior;
  if (b && b.animation_speed && ANIM_SPEED_MAP[b.animation_speed]) {
    s.setProperty('--cartmax-anim-speed', ANIM_SPEED_MAP[b.animation_speed]);
  }

  // Progress bar
  var TRACK_H_MAP = { thin: '4px', normal: '6px', thick: '8px' };
  var pb = settings.progress_bar;
  if (pb) {
    if (pb.track_thickness && TRACK_H_MAP[pb.track_thickness]) {
      s.setProperty('--cartmax-track-h', TRACK_H_MAP[pb.track_thickness]);
    }
    if (pb.badge_bg_color) s.setProperty('--cartmax-badge-bg', pb.badge_bg_color);
    if (pb.badge_text_color) s.setProperty('--cartmax-badge-text', pb.badge_text_color);
    setOrClear(s, '--cartmax-pb-card-bg', pb.card_bg);
    setOrClear(s, '--cartmax-pb-card-bg-end', pb.card_bg_end || pb.card_bg);
    setOrClear(s, '--cartmax-pb-card-border', pb.card_border);
    setOrClear(s, '--cartmax-pb-fill', pb.fill_color);
    setOrClear(s, '--cartmax-pb-reached', pb.reached_dot_color);
    setOrClear(s, '--cartmax-pb-track', pb.track_color);
    setOrClear(s, '--cartmax-pb-locked', pb.locked_dot_color);
    setOrClear(s, '--cartmax-pb-label', pb.label_color);
  }

  // The newer optional colours are cleared when emptied, so a merchant can go
  // back to the default look without a page reload.
  if (c) {
    setOrClear(s, '--cartmax-add-btn-bg', c.add_button_bg);
    setOrClear(s, '--cartmax-add-btn-text', c.add_button_text);
    setOrClear(s, '--cartmax-success', c.success);
    setOrClear(s, '--cartmax-danger', c.danger);
    setOrClear(s, '--cartmax-muted', c.muted);
    setOrClear(s, '--cartmax-footer-bg', c.footer_bg);
    setOrClear(s, '--cartmax-upsells-bg', c.upsells_bg);
    setOrClear(s, '--cartmax-coupons-bg', c.coupons_bg);
    setOrClear(s, '--cartmax-gifts-bg', c.gifts_bg);
    // Elements that used fixed greys/black follow the brand colours once the
    // merchant changes them from the built-in defaults (unchanged stores keep
    // the exact look they always had).
    setOrClear(s, '--cartmax-primary-hover', brandColor(c.primary, '#1a1a1a') ? 'color-mix(in srgb, ' + c.primary + ' 85%, #000000)' : '');
    setOrClear(s, '--cartmax-ink', brandColor(c.text, '#1a1a1a') ? c.text : '');
    setOrClear(s, '--cartmax-line', brandColor(c.border, '#f0f0f0') ? c.border : '');
  }
  if (l) {
    setOrClear(s, '--cartmax-pad-x-desktop', Number(l.content_padding) > 0 ? Number(l.content_padding) + 'px' : '');
    setOrClear(s, '--cartmax-pad-x-mobile', Number(l.content_padding_mobile) > 0 ? Number(l.content_padding_mobile) + 'px' : '');
  }
  var ab = settings.announcement_bar;
  if (ab) {
    setOrClear(s, '--cartmax-announce-bg', ab.bg_color);
    setOrClear(s, '--cartmax-announce-text', ab.text_color);
  }
  if (t) {
    setOrClear(s, '--cartmax-heading-font', t.heading_font ? '"' + String(t.heading_font).replace(/["\\]/g, '') + '", sans-serif' : '');
    setOrClear(s, '--cartmax-heading-spacing', Number(t.heading_letter_spacing) > 0 ? Number(t.heading_letter_spacing) + 'px' : '');
    setOrClear(s, '--cartmax-item-font', t.item_font ? '"' + String(t.item_font).replace(/["\\]/g, '') + '", sans-serif' : '');
  }
}

// True when a colour setting holds something other than its built-in default.
function brandColor(value, builtIn) {
  return !!value && String(value).trim().toLowerCase() !== builtIn;
}

function setOrClear(style, name, value) {
  if (value) style.setProperty(name, value);
  else style.removeProperty(name);
}

// ── Drawer layout helpers (pure, unit-tested) ───────────────

// Body sections the merchant can reorder. Today's order is the fallback.
export var BODY_SECTIONS = ['progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'coupons', 'special_offer', 'upsells'];

// The merchant's order, keeping only known body sections (each once), with any
// missing ones appended in the default order. 'ribbon' is stored in the same
// list but renders outside the body, so it is ignored here.
export function normalizeSectionOrder(order) {
  var out = [];
  (Array.isArray(order) ? order : []).forEach(function (key) {
    if (BODY_SECTIONS.indexOf(key) !== -1 && out.indexOf(key) === -1) out.push(key);
  });
  BODY_SECTIONS.forEach(function (key) {
    if (out.indexOf(key) !== -1) return;
    // Orders saved before Special Offer existed get it just above the upsells.
    var at = key === 'special_offer' ? out.indexOf('upsells') : -1;
    if (at === -1) out.push(key);
    else out.splice(at, 0, key);
  });
  return out;
}

// Milestone positions (percent of the track) and the fill to match.
// The bar's progress_pct is computed for 'even' spacing: milestone i sits at
// (i + 1) / n and each segment is 100 / n wide. 'edges' puts the first
// milestone at 0 and the last at 100, so the fill is remapped segment by
// segment; progress before the first milestone has no room and shows as 0.
export function milestonePositions(n, spacing) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out.push(spacing === 'edges' && n > 1 ? (i / (n - 1)) * 100 : ((i + 1) / n) * 100);
  }
  return out;
}

export function mapProgress(pct, n, spacing) {
  var p = Math.max(0, Math.min(Number(pct) || 0, 100));
  if (spacing !== 'edges' || n < 2) return p;
  var seg = 100 / n;
  if (p <= seg) return 0;
  var k = Math.min(Math.floor((p - seg) / seg), n - 2); // segment between milestone k and k + 1
  var within = (p - seg - k * seg) / seg;
  return Math.round(((k + within) / (n - 1)) * 10000) / 100;
}

// Fill {name} placeholders. Unknown placeholders are left as they are.
// Gift milestones for the Freebies section: how many of the bar's gift tiers
// are reached, and the locked ones still ahead (cheapest first). A tier counts
// when its offer is an auto-add gift; the row uses that offer's first gift.
// `total`/`qty` are the cart's qualifying spend (major units) and item count;
// scope 'next' keeps only the nearest locked gift.
export function buildFreebieTiers(bar, offers, total, qty, scope) {
  var result = { total: 0, unlocked: 0, locked: [] };
  if (!bar || !bar.tiers || !bar.tiers.length) return result;
  var giftOffers = {};
  (offers || []).forEach(function (o) {
    if (o && o.reward && o.reward.type === 'auto_add_gift') giftOffers[o.id] = o;
  });
  var locked = [];
  bar.tiers.forEach(function (t) {
    // Offers sharing a threshold merge into one tier; look through its sources.
    var ids = (t.sources && t.sources.length)
      ? t.sources.map(function (s) { return s.promotion_id || s.id; })
      : [t.promotion_id || t.id];
    var offer = null;
    for (var i = 0; i < ids.length && !offer; i++) offer = giftOffers[ids[i]] || null;
    if (!offer) return;
    result.total++;
    if (t.state === 'active') { result.unlocked++; return; }
    var gift = (offer.reward.gift_variant_data || [])[0] || {};
    var byQty = t.trigger_type === 'quantity';
    locked.push({
      id: t.id,
      title: gift.title || t.label || '',
      image: gift.image || '',
      by: byQty ? 'quantity' : 'price',
      threshold: t.threshold,
      remaining: Math.max(0, t.threshold - (byQty ? qty : total)),
    });
  });
  locked.sort(function (a, b) { return a.threshold - b.threshold; });
  result.locked = scope === 'next' ? locked.slice(0, 1) : locked;
  return result;
}

export function fillTemplate(template, values) {
  return String(template || '').replace(/\{(\w+)\}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match;
  });
}

// Quantities under 10 as "01" when zero-padding is on. Display only.
export function formatQty(qty, zeroPad) {
  var n = Number(qty) || 0;
  return zeroPad && n >= 0 && n < 10 ? '0' + n : String(n);
}

// Whole-percent discount from a compare-at price, or 0 when there is none.
// Compare-at (MRP) savings on the cart lines, in cents: for each line,
// compare-at x quantity above the line's pre-discount price. Discounts are
// counted separately (original_total_price - total_price), so the two add up
// without double counting. compareCache maps variant id -> compare-at cents.
export function compareAtSavings(items, compareCache) {
  if (!items || !compareCache) return 0;
  return items.reduce(function (sum, item) {
    var unit = Number(compareCache[String(item.variant_id)]) || 0;
    var qty = Number(item.quantity) || 0;
    var original = Number(item.original_line_price != null ? item.original_line_price : item.line_price) || 0;
    return sum + Math.max(0, unit * qty - original);
  }, 0);
}

export function discountPercent(price, compareAt) {
  var p = Number(price) || 0;
  var c = Number(compareAt) || 0;
  if (c <= 0 || p >= c) return 0;
  return Math.round((c - p) / c * 100);
}

// How far the cart is from a coupon's minimum. trigger_price is in major units
// (as the server sends it); the cart total is in minor units.
//   { locked: false } when the cart already qualifies
//   { locked: true, by: 'price', amount: <minor units short> }
//   { locked: true, by: 'qty', count: <items short> }
// A price shortfall wins when both minimums are unmet: it's the one shoppers act on.
export function couponShortfall(coupon, cartTotal, itemCount) {
  var minPrice = Math.round((Number(coupon && coupon.trigger_price) || 0) * 100);
  var minQty = Number(coupon && coupon.trigger_qty) || 0;
  var total = Number(cartTotal) || 0;
  var count = Number(itemCount) || 0;
  if (minPrice > 0 && total < minPrice) {
    return { locked: true, by: 'price', amount: minPrice - total, progress: total / minPrice };
  }
  if (minQty > 0 && count < minQty) {
    return { locked: true, by: 'qty', count: minQty - count, progress: count / minQty };
  }
  return { locked: false };
}

// Split the coupons to show into the ones the cart qualifies for and the ones
// it doesn't yet. Applied codes are left out of both. Locked coupons come back
// only when `showLocked` is on, closest-to-unlocking first.
export function splitCoupons(coupons, cart, appliedCodes, showLocked) {
  var applied = (appliedCodes || []).map(function (c) { return String(c).toUpperCase(); });
  var total = cart ? (cart.total_price || 0) : 0;
  var count = cart ? (cart.item_count || 0) : 0;
  var available = [];
  var locked = [];
  (coupons || []).forEach(function (c) {
    if (applied.indexOf(String(c.code || '').toUpperCase()) !== -1) return;
    var gap = couponShortfall(c, total, count);
    if (!gap.locked) available.push(c);
    else if (showLocked) locked.push(Object.assign({}, c, { _shortfall: gap }));
  });
  locked.sort(function (a, b) { return b._shortfall.progress - a._shortfall.progress; });
  return { available: available, locked: locked };
}

// What one applied code saved, in minor units. Line-level allocations first
// (order-level codes are spread across lines on /cart.js); the cart-level
// application only when there are none, so the amount is never counted twice.
export function savingsForCode(cart, code) {
  if (!cart || !code) return 0;
  var up = String(code).toUpperCase();
  var lineSum = 0;
  (cart.items || []).forEach(function (it) {
    (it.line_level_discount_allocations || []).forEach(function (a) {
      var da = a.discount_application || {};
      if (da.title && da.title.toUpperCase() === up) lineSum += (a.amount || 0);
    });
  });
  if (lineSum > 0) return lineSum;
  var cartSum = 0;
  (cart.cart_level_discount_applications || []).forEach(function (d) {
    if (d.title && d.title.toUpperCase() === up) cartSum += (d.total_allocated_amount || 0);
  });
  return cartSum;
}

// ── Shared utilities ────────────────────────────────────────

export function normalizeVariantId(id) {
  if (typeof id === 'string' && id.startsWith('gid://')) return id.split('/').pop();
  return id;
}

export function formatMoneyTemplate(moneyFormat, amount) {
  return formatAmount(amount, moneyFormat || storeMoneyFormat(), _priceDecimals);
}

// ── Gift-line detection / quantity-selector policy ──────────

// A line is a "free gift" if ANY of its properties is a freebie marker — cartx's
// own `_freebie`, or a third-party one whose key contains `_freebie` (e.g.
// GoKwik's `_gokwik_freebie`). Marks gift lines so the drawer can hide the
// quantity selector / remove / variant switcher and show FREE, so a shopper
// can't bump the quantity of a gift a partner app added.
export function hasFreebieMarker(properties) {
  if (!properties) return false;
  for (var k in properties) {
    if (!Object.prototype.hasOwnProperty.call(properties, k)) continue;
    if (k.indexOf('_freebie') === -1) continue;
    var v = properties[k];
    if (v === 'true' || v === true) return true;
  }
  return false;
}

// The quantity selector shows ONLY for a real paid line. It is hidden when the
// line is a gift — a freebie/claim marker is present — OR when the effective
// price is 0. A ₹0 line is treated as a gift (a freebie whose attribute may be
// missing, or any free line), so shoppers can't change the quantity of anything
// they aren't paying for. `final_price` is the per-unit price the shopper pays
// (minor units); fall back to `price` if absent, and treat 0 / missing as free.
export function showsQuantitySelector(item) {
  if (!item) return false;
  var p = item.properties || {};
  var isClaim = p['_claimed'] === 'true' || p['_cartmax_claim'] === 'true';
  var isFreebie = hasFreebieMarker(p) && !isClaim;
  if (isFreebie || isClaim) return false;
  var unit = item.final_price != null ? item.final_price : (item.price || 0);
  return Number(unit) > 0;
}

// A paid-for product made free by a Shopify discount (e.g. a native "Buy 2 Get
// 2" splits off a ₹0 line). Shopify sets its quantity from the paid line, so
// the drawer shows the quantity in a disabled stepper instead of hiding it.
// cartx's own gift / claim lines are excluded (they keep their own layout).
export function showsReadOnlyQuantity(item) {
  if (!item || showsQuantitySelector(item)) return false;
  var p = item.properties || {};
  if (hasFreebieMarker(p) || p['_claimed'] === 'true' || p['_cartmax_claim'] === 'true') return false;
  return (item.line_level_discount_allocations || []).some(function (a) {
    return (a.amount || 0) > 0;
  });
}

// Total MRP of the cart in minor units: per line, the higher of the cached
// compare-at price and Shopify's original price, times the quantity. Shared by
// the footer strikethrough and the Price Break Up so the two always match.
export function cartMrpTotal(items, compareAtCache) {
  var cache = compareAtCache || {};
  var total = 0;
  (items || []).forEach(function (it) {
    var original = Number(it.original_price) || 0;
    var compareUnit = Number(cache[String(it.variant_id)]) || 0;
    var unit = compareUnit > original ? compareUnit : original;
    total += unit * (Number(it.quantity) || 0);
  });
  return total;
}

// The automatic (non-code) discounts on the cart, one row per title, largest
// first: line-level ones (a native B2G2's free line) from each line's
// allocations, order-level ones (an automatic "10% off") from
// cart_level_discount_applications. Coupon codes are left out — they have their
// own row. cartx's own Function discounts get readable labels.
export function automaticDiscountRows(cart, appliedCodes, labels) {
  if (!cart) return [];
  var codes = (appliedCodes || []).map(function (c) { return String(c).toUpperCase(); });
  var names = labels || {};
  var byTitle = {};
  var order = [];
  function add(app, amount) {
    if (!app || !app.title || !(amount > 0)) return;
    if (app.type === 'discount_code') return;
    if (codes.indexOf(String(app.title).toUpperCase()) !== -1) return;
    var key = String(app.title).toLowerCase();
    if (!byTitle[key]) { byTitle[key] = { title: app.title, amount: 0 }; order.push(key); }
    byTitle[key].amount += amount;
  }
  (cart.items || []).forEach(function (it) {
    (it.line_level_discount_allocations || []).forEach(function (a) {
      add(a.discount_application, Number(a.amount) || 0);
    });
  });
  (cart.cart_level_discount_applications || []).forEach(function (d) {
    var key = d && d.title ? String(d.title).toLowerCase() : '';
    if (byTitle[key]) return; // already counted from the line allocations
    add(d, Number(d.total_allocated_amount) || 0);
  });
  return order.map(function (key) {
    var row = byTitle[key];
    var label = names[key] || row.title;
    return { title: label, amount: row.amount };
  }).sort(function (a, b) { return b.amount - a.amount; });
}

// What a gift line is ACTUALLY charging the shopper, in minor units. 0 means
// the discount landed and the line really is free. > 0 means it did NOT land —
// e.g. a merchant discount code with "combines with product discounts" off
// makes Shopify drop our automatic gift discount, and the shopper is charged
// for a line we'd otherwise label FREE. Missing price fields read as 0, so
// optimistic (not-yet-reconciled) gift lines still count as free.
export function giftChargedAmount(item) {
  if (!item) return 0;
  var line = item.final_line_price != null ? item.final_line_price : item.line_price;
  var n = Number(line || 0);
  return n > 0 ? n : 0;
}

// Splits a merchant message on **double asterisks** into plain and bold parts:
// "Add **₹363 more** to get a gift" → [{text:'Add ',bold:false},
// {text:'₹363 more',bold:true}, {text:' to get a gift',bold:false}].
// Rendered as text nodes and <strong>, never as HTML, so it is safe. An
// unpaired ** is left as typed.
export function boldParts(text) {
  var s = text == null ? '' : String(text);
  var parts = s.split('**');
  if (parts.length < 3) return [{ text: s, bold: false }];
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var last = i === parts.length - 1;
    // An odd number of ** leaves the last part unclosed: keep it plain, with its **.
    if (last && i % 2 === 1) {
      out.push({ text: '**' + parts[i], bold: false });
    } else if (parts[i]) {
      out.push({ text: parts[i], bold: i % 2 === 1 });
    }
  }
  return out;
}

// Variant text for a cart line: "Black / M", or "Color: Black / Size: M" when
// the store shows option names. Names come from the line's options_with_values;
// values from variant_title, because a variant swap updates variant_title
// straight away while options_with_values catches up on the next cart read.
// If the two don't line up (or the product has no real options) the plain
// variant_title is used.
export function variantText(item, showNames) {
  if (!item || !item.variant_title) return '';
  var title = String(item.variant_title);
  if (!showNames) return title;
  var opts = Array.isArray(item.options_with_values) ? item.options_with_values : [];
  var values = title.split(' / ');
  if (!opts.length || opts.length !== values.length) return title;
  return opts.map(function (o, i) {
    var name = o && o.name ? String(o.name) : '';
    return name && name !== 'Title' ? name + ': ' + values[i] : values[i];
  }).join(' / ');
}

// The struck "was" price shown before the FREE badge on a free gift line, when
// the store turns it on. 0 = show nothing (setting off, or no real price to
// strike — e.g. a $0 gift product).
export function giftOriginalPrice(item, show) {
  if (!show || !item) return 0;
  var n = Number(item.original_line_price || 0);
  return n > 0 ? n : 0;
}

// ── Focus trap for accessibility ────────────────────────────

var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container) {
  var focusables = container.querySelectorAll(FOCUSABLE);
  if (focusables.length === 0) return null;
  var first = focusables[0];
  var last = focusables[focusables.length - 1];
  function handler(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }
  container.addEventListener('keydown', handler);
  // Start on Close so header buttons like Clear All aren't one Enter away.
  (container.querySelector('.cartmax-close') || first).focus();
  return function () { container.removeEventListener('keydown', handler); };
}

// ── Special Offer showcase (pure, unit-tested) ──────────────
// Every source is normalised to one card shape; prices in major units.
//   { product_id, handle, title, image_url, price, compare_at_price, variant_id, available }

function firstAvailable(variants, isAvailable) {
  for (var i = 0; i < variants.length; i++) if (isAvailable(variants[i])) return variants[i];
  return null;
}

function cardFrom(id, handle, title, image, v, available) {
  var price = v ? Number(v.price) : 0;
  var compare = v && v.compare ? Number(v.compare) : 0;
  return {
    product_id: String(id || '').split('/').pop(),
    handle: handle || '',
    title: title || '',
    image_url: image || '',
    price: price,
    compare_at_price: compare > price ? compare : null,
    variant_id: v ? String(v.id).split('/').pop() : null,
    available: !!available && !!v,
  };
}

// /products/<handle>.js — prices in cents, in the shopper's currency.
export function showcaseFromAjax(p) {
  if (!p || !p.id) return null;
  var vs = p.variants || [];
  var v = firstAvailable(vs, function (x) { return x.available; }) || vs[0];
  var image = p.featured_image || (p.images && p.images[0]) || '';
  return cardFrom(p.id, p.handle, p.title, image, v && {
    id: v.id, price: (Number(v.price) || 0) / 100, compare: (Number(v.compare_at_price) || 0) / 100,
  }, p.available);
}

// Storefront API Product node — prices are decimal strings.
export function showcaseFromStorefront(n) {
  if (!n || !n.id) return null;
  var vs = (n.variants && n.variants.nodes) || [];
  var v = firstAvailable(vs, function (x) { return x.availableForSale; }) || vs[0];
  return cardFrom(n.id, n.handle, n.title, n.featuredImage && n.featuredImage.url, v && {
    id: v.id, price: v.price && v.price.amount, compare: v.compareAtPrice && v.compareAtPrice.amount,
  }, n.availableForSale);
}

// Cards to show: in stock, not already in the cart, each product once, capped.
export function pickSpecialProducts(products, cartItems, max) {
  var inCart = {};
  (cartItems || []).forEach(function (it) { if (it && it.product_id != null) inCart[String(it.product_id)] = true; });
  var seen = {};
  var out = [];
  var limit = Math.max(1, Number(max) || 6);
  (products || []).forEach(function (p) {
    if (!p || !p.available || !p.variant_id || out.length >= limit) return;
    if (inCart[p.product_id] || seen[p.product_id]) return;
    seen[p.product_id] = true;
    out.push(p);
  });
  return out;
}

// "Did the cart change?" key for the promo eval (CartDrawer._maybeRunAjaxPromo /
// _maybeRunGqlPromo skip the server eval when it is unchanged).
// Lines: variant + qty + offer id, plus ':u' for an unpriced placeholder so the
// placeholder and its priced self differ. Codes: applied discount codes, so a
// coupon apply/remove re-evaluates.
// Money: each line's final price and the cart's total discount. A quantity
// change shows instantly with the old (pre-discount) money; Shopify's reply then
// brings an automatic discount (e.g. a merchant Buy 2 Get 2) with the same
// variants and quantities. Without money in the key that reply was skipped and
// the bar stayed on the pre-discount value (Just Herbs, Nov 2026: stuck at ₹796
// on a ₹398 cart, unlocking gift tiers the shopper had not reached).
export function promoCartSignature(cart) {
  var items = (cart && cart.items) || [];
  var lines = items.map(function (it) {
    var fin = it.final_line_price != null ? it.final_line_price : it.line_price;
    return it.variant_id + ':' + (it.quantity || 0) + ':'
      + (it.properties ? (it.properties._offer_id || '') : '')
      + (it._cartx_unpriced ? ':u' : '')
      + '$' + (Number(fin) || 0);
  }).sort().join('|');
  var codes = ((cart && cart.discount_codes) || [])
    .filter(function (d) { return d.applicable; })
    .map(function (d) { return d.code; })
    .sort()
    .join(',');
  return lines + '#' + codes + '#' + (Number(cart && cart.total_discount) || 0);
}
