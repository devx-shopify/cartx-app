// =============================================================
// cartx — AJAX optimistic cart store + single-flight sync
//
// Same model as cart-store.js (the Storefront GraphQL store), but backed by the
// native AJAX Cart API (/cart/add.js, /cart/update.js, /cart.js). The UI mutates
// `localCart` (instant); each mutation schedules a single-flight sync that diffs
// local vs the last-known server cart, applies the MINIMAL set of AJAX calls, and
// snaps both carts to the authoritative /cart.js result. Rapid edits coalesce
// into the fewest round-trips.
//
// KEY DIFFERENCE from the GraphQL store: the AJAX cart is the SAME cart the theme
// (and other apps) mutate. So this store is NOT the sole owner — external
// mutations arrive via the fetch interceptor and are fed in through
// reconcileFromServer(), which snaps the server baseline and (when idle) the UI.
//
// Line shapes are the drawer's /cart.js shape, so CartDrawer renders them
// unchanged. The diff/line helpers are shared with the GraphQL path
// (cart-optimistic.js) — this file only owns transport + sync orchestration.
//
// NOT wired into the live drawer yet (built behind the `ajax_cart_store` flag).
// =============================================================

import { internalFetch, fetchCart, cartUpdateAll } from './helpers';
import {
  getCartDifference, addItemToLocalCart, createOptimisticItem, setLineQuantity,
} from './cart-optimistic';

// ── State + pub/sub ───────────────────────────────────────
var _state = {
  serverCart: null,   // canonical (/cart.js shape) — last authoritative cart
  localCart: null,    // optimistic overlay (/cart.js shape) — what the UI renders
  loading: false,
  ready: false,
};
var _subs = [];

export function subscribe(fn) {
  _subs.push(fn);
  return function unsubscribe() {
    var i = _subs.indexOf(fn);
    if (i !== -1) _subs.splice(i, 1);
  };
}

function notify() {
  for (var i = 0; i < _subs.length; i++) {
    try { _subs[i](_state); } catch (e) { console.error('[cartx] ajax-store subscriber error:', e); }
  }
}

// Flag gate (mirrors isGraphqlCartEnabled): opt in via localStorage
// `cartx:ajaxCartStore` = '1', window.__cartxAjaxCartStore = true, or the
// server config `_config.ajax_cart_store`. Default OFF — the current AJAX path
// stays live until this is validated and the old path is removed.
export function isAjaxCartStoreEnabled(config) {
  try {
    if (typeof window !== 'undefined' && window.__cartxAjaxCartStore === true) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cartx:ajaxCartStore') === '1') return true;
  } catch (_) { /* storage may be unavailable */ }
  return !!(config && config.ajax_cart_store);
}

export function getState() { return _state; }

// What the UI renders: the optimistic local cart (falls back to server).
export function getOptimisticCart() { return _state.localCart || _state.serverCart; }

// Debug handle — inspect from the console via window.__cartxAjaxStore.getState().
try {
  if (typeof window !== 'undefined') {
    window.__cartxAjaxStore = { getState: getState, getOptimisticCart: getOptimisticCart };
  }
} catch (_) { /* debug handle is optional */ }

// ── Init / external reconcile ─────────────────────────────

// Seed from the initial /cart.js cart (the drawer already has this on mount).
export function init(serverCart) {
  if (serverCart) {
    _state.serverCart = serverCart;
    _state.localCart = serverCart;
  }
  _state.ready = true;
  notify();
}

// Fold in a cart that changed OUTSIDE this store (theme add-to-cart, another app,
// etc.) as detected by the fetch interceptor. This is authoritative for the
// server baseline. We only snap the UI to it when we're idle (no in-flight or
// queued local edits) — otherwise a pending optimistic edit would be clobbered;
// the next sync reconciles local against this fresh baseline instead.
export function reconcileFromServer(serverCart) {
  if (!serverCart) return;
  _state.serverCart = serverCart;
  if (!_syncing && !_pendingResolve) {
    _state.localCart = serverCart;
  }
  notify();
}

// ── Single-flight sync (mirrors cart-store.js) ────────────
var _syncing = false;
var _pendingResolve = null;

function queueSync() {
  return new Promise(function (resolve) {
    if (!_syncing) { resolve(); return; }
    _pendingResolve = resolve;   // run after the current sync completes
  });
}

// Returns true if another sync was queued (so the caller should not snap yet).
function completeAndTriggerNext() {
  _syncing = false;
  if (_pendingResolve) {
    var next = _pendingResolve;
    _pendingResolve = null;
    next();
    return true;
  }
  return false;
}

async function scheduleSync() {
  await queueSync();
  await runSync();
}

// Resolve once no sync is in flight and none is queued — so checkout waits for
// the server cart to reflect the shopper's latest edits before navigating.
// Bounded poll so it never hangs.
export function whenSettled(timeoutMs) {
  var deadline = timeoutMs || 4000;
  var start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  return new Promise(function (resolve) {
    (function check() {
      var elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : 0) - start;
      if ((!_syncing && !_pendingResolve) || elapsed >= deadline) { resolve(); return; }
      setTimeout(check, 50);
    })();
  });
}

// Apply a local (optimistic) cart immediately, then reconcile.
function setLocalCart(localCart) {
  _state.localCart = localCart;
  notify();
  scheduleSync();
}

function numericVariantId(merchandiseId) {
  var s = String(merchandiseId);
  return Number(s.indexOf('gid://') === 0 ? s.split('/').pop() : s);
}

function propsFromAttributes(attributes) {
  var out = {};
  (attributes || []).forEach(function (a) { out[a.key] = a.value; });
  return out;
}

// Codes currently applied to a /cart.js cart. Mirrors CartDrawer.getAppliedCodes:
// read from cart- and line-level discount APPLICATIONS (what Shopify actually
// applied), deduped — not the raw requested list.
function appliedCodesOf(cart) {
  var codes = [];
  ((cart && cart.cart_level_discount_applications) || []).forEach(function (d) {
    if (d.title) codes.push(d.title);
  });
  ((cart && cart.items) || []).forEach(function (item) {
    (item.line_level_discount_allocations || []).forEach(function (a) {
      if (a.discount_application && a.discount_application.title) codes.push(a.discount_application.title);
    });
  });
  return codes.filter(function (c, i, arr) { return arr.indexOf(c) === i; });
}

// The codes the shopper WANTS applied (the optimistic overlay). Falls back to
// whatever the server currently has applied.
function desiredCodes(cart) {
  if (cart && cart.discount_codes) return cart.discount_codes.map(function (d) { return d.code; });
  return appliedCodesOf(cart);
}

async function runSync() {
  if (!_state.localCart) return;
  _syncing = true;
  _state.loading = true; notify();

  try {
    // Diff against the LAST-KNOWN server cart. Each AJAX call below is followed
    // by an authoritative /cart.js refresh, and single-flight guarantees we're
    // the only in-store writer, so the in-memory serverCart is a valid baseline.
    var serverMapped = _state.serverCart;
    if (!serverMapped) serverMapped = await fetchCart();

    var diff = getCartDifference(serverMapped, _state.localCart);
    var lastCart = null;   // last mutation's returned cart (authoritative)
    var didAdd = false;

    // Updates + removals go through one /cart/update.js call, keyed by line key
    // (the diff emits `id = line.key` for the AJAX cart). qty 0 removes the line.
    var updates = {};
    diff.itemsToUpdate.forEach(function (u) { updates[u.id] = u.quantity; });
    diff.lineIdsToRemove.forEach(function (id) { updates[id] = 0; });
    if (Object.keys(updates).length) {
      // /cart/update.js returns the full updated cart — reuse it as the
      // authoritative result instead of a separate /cart.js round-trip.
      lastCart = await cartUpdateAll({ updates: updates });
    }

    // Adds go through /cart/add.js (converted from the diff's GraphQL-shaped
    // output back to AJAX line inputs). /cart/add.js returns the added lines,
    // not the full cart, so an add forces a fresh /cart.js below.
    if (diff.itemsToAdd.length) {
      var items = diff.itemsToAdd.map(function (a) {
        return {
          id: numericVariantId(a.merchandiseId),
          quantity: a.quantity,
          properties: propsFromAttributes(a.attributes),
        };
      });
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items }),
      });
      didAdd = true;
    }

    // Discount codes: the AJAX cart applies the FULL desired set in one
    // /cart/update.js { discount: "A,B" } call (Shopify replaces the set). Only
    // call when the desired set differs from what's actually applied.
    var wantCodes = desiredCodes(_state.localCart);
    var haveCodes = appliedCodesOf(serverMapped);
    var codesDiffer = wantCodes.length !== haveCodes.length ||
      wantCodes.some(function (c) { return haveCodes.indexOf(c) === -1; });
    if (codesDiffer) {
      lastCart = await cartUpdateAll({ discount: wantCodes.join(',') });
    }

    // Authoritative result — the next sync diffs against this. Reuse the last
    // mutation's returned cart when we can (qty/remove/discount all return it);
    // only pay a separate /cart.js when an add happened (which doesn't) or when
    // nothing mutated. This halves the round-trips for a plain qty change.
    _state.serverCart = (didAdd || !lastCart) ? await fetchCart() : lastCart;

    // Snap the UI to the authoritative cart only when settled; if more edits are
    // queued, keep localCart so we don't clobber in-flight changes.
    var hasMore = completeAndTriggerNext();
    if (!hasMore) {
      _state.localCart = _state.serverCart;
      _state.loading = false; notify();
    }
  } catch (err) {
    console.error('[cartx] ajax syncCart failed:', err);
    _state.loading = false;
    completeAndTriggerNext();   // keep localCart (optimistic); next edit retries
    notify();
  }
}

// ── High-level actions (what CartDrawer will call once wired) ──

// meta carries display data for the instant line: { price, title, product_title,
// variant_title, image, handle, product_id, compare_at } (all optional).
export function addLine(variantId, quantity, properties, meta) {
  var base = _state.localCart || _state.serverCart || { items: [] };
  setLocalCart(addItemToLocalCart(base, createOptimisticItem(variantId, quantity, properties, meta)));
}

// True when the cart carries server-computed discounts the client can't
// reproduce (coupons, automatic/volume discounts, line discounts). For these,
// a client-side `price × qty` estimate would be wrong and flicker on qty change.
function cartHasDiscounts(cart) {
  if (!cart) return false;
  if ((cart.total_discount || 0) > 0) return true;
  if ((cart.cart_level_discount_applications || []).length) return true;
  return (cart.items || []).some(function (it) {
    return (it.final_line_price || 0) < (it.original_line_price || it.line_price || 0) ||
      (it.line_level_discount_allocations || []).length > 0;
  });
}

// Carry the last authoritative money onto a quantity-changed cart, so the total
// and line prices don't flash a wrong estimate before the sync returns the real
// (discount-aware) numbers. The quantity itself still updates instantly.
function preserveMoney(base, next) {
  return Object.assign({}, next, {
    total_price: base.total_price,
    original_total_price: base.original_total_price,
    total_discount: base.total_discount,
    items_subtotal_price: base.items_subtotal_price,
    items: (next.items || []).map(function (it) {
      var b = (base.items || []).find(function (x) { return x.key === it.key; });
      if (!b) return it;
      return Object.assign({}, it, {
        line_price: b.line_price,
        final_line_price: b.final_line_price,
        original_line_price: b.original_line_price,
      });
    }),
  });
}

export function changeQuantity(key, quantity) {
  var base = _state.localCart || _state.serverCart;
  if (!base) return;
  var next = setLineQuantity(base, key, quantity);
  // With discounts present, the money can only be computed by the server — hold
  // the last-known values (no flicker) and let the sync reconcile them.
  if (cartHasDiscounts(base)) next = preserveMoney(base, next);
  setLocalCart(next);
}

export function removeLine(key) {
  changeQuantity(key, 0);
}

// Discount codes. The optimistic overlay adds/removes the chip immediately; the
// sync applies the full desired set via /cart/update.js { discount } and the
// /cart.js refresh brings back the real totals. (AJAX cart supports discount
// codes natively via the `discount` param — same as the GraphQL path's codes.)
export function applyDiscountCode(code) {
  var base = _state.localCart || _state.serverCart;
  if (!base || !code) return;
  var codes = (base.discount_codes || appliedCodesOf(base).map(function (c) { return { code: c, applicable: true }; })).slice();
  if (codes.some(function (d) { return d.code.toUpperCase() === code.toUpperCase(); })) return;
  codes.push({ code: code, applicable: true });
  setLocalCart(Object.assign({}, base, { discount_codes: codes }));
}

export function removeDiscountCode(code) {
  var base = _state.localCart || _state.serverCart;
  if (!base) return;
  var current = base.discount_codes || appliedCodesOf(base).map(function (c) { return { code: c, applicable: true }; });
  var codes = current.filter(function (d) { return d.code.toUpperCase() !== code.toUpperCase(); });
  setLocalCart(Object.assign({}, base, { discount_codes: codes }));
}

// Cart-level attributes (e.g. the `_cartx` marker for the volume-discount
// Function). Applied directly — attributes aren't part of the line diff.
export async function setAttributes(attributes) {
  try {
    var res = await cartUpdateAll({ attributes: attributes });
    if (res) { _state.serverCart = res; _state.localCart = res; notify(); }
  } catch (e) {
    console.error('[cartx] ajax setAttributes failed:', e);
  }
}
