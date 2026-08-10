// =============================================================
// cartx — Shared Helpers
// =============================================================

// ── Internal fetch (bypasses cart interceptor) ──────────────

var _internalFetchDepth = 0;

export function internalFetch(url, opts) {
  _internalFetchDepth++;
  window.__cartmaxInternal = true;
  return fetch(url, opts).finally(function () {
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

export function formatMoney(cents, currency) {
  var amount = (cents / 100).toFixed(2);
  var fmt = window.Shopify && window.Shopify.money_format;
  if (fmt) {
    return fmt
      .replace(/\{\{\s*amount\s*\}\}/, amount)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100))
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','));
  }
  var symbols = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9',
    CAD: 'CA$', AUD: 'A$', JPY: '\u00A5', CNY: '\u00A5',
  };
  return (symbols[currency] || currency + ' ') + amount;
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
  }

}

// ── Shared utilities ────────────────────────────────────────

export function normalizeVariantId(id) {
  if (typeof id === 'string' && id.startsWith('gid://')) return id.split('/').pop();
  return id;
}

export function formatMoneyTemplate(moneyFormat, amount) {
  var amountStr = amount.toFixed(2);
  var formatted = moneyFormat
    ? moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amountStr)
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(amount)))
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amountStr.replace('.', ','))
    : '$' + amountStr;
  return formatted;
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
  first.focus();
  return function () { container.removeEventListener('keydown', handler); };
}
