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
  lineSignature, recalcTotals,
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

// The AJAX optimistic store is now the LIVE cart path (default ON). Kill
// switches remain, so it can be disabled without a deploy if anything surfaces:
// localStorage `cartx:ajaxCartStore` = '0', window.__cartxAjaxCartStore = false,
// or the server config `_config.ajax_cart_store === false`. The old optimistic
// path is still in place as the fallback until it's removed in a later cleanup.
export function isAjaxCartStoreEnabled(config) {
  try {
    if (typeof window !== 'undefined' && window.__cartxAjaxCartStore === false) return false;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cartx:ajaxCartStore') === '0') return false;
  } catch (_) { /* storage may be unavailable */ }
  if (config && config.ajax_cart_store === false) return false;
  return true;
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
export function reconcileFromServer(serverCart, force) {
  if (!serverCart) return;
  _state.serverCart = serverCart;
  // Snap the UI when idle, or when the caller has an authoritative cart it wants
  // reflected immediately (e.g. a coupon apply/remove, which is a direct awaited
  // update.js call — its result IS the truth, so it must show without waiting).
  if (force || (!_syncing && !_pendingResolve)) {
    _state.localCart = serverCart;
  }
  notify();
}

// ── Single-flight sync (mirrors cart-store.js) ────────────
var _syncing = false;
var _pendingResolve = null;

function queueSync() {
  return new Promise(function (resolve) {
    // Claim the slot SYNCHRONOUSLY. If we deferred `_syncing = true` to runSync
    // (after this promise's await), a burst of setLocalCart calls in the same
    // tick — e.g. a product removal plus each gift the reconcile pulls — would
    // ALL pass this check and run concurrent syncs, each diffing against the
    // same stale server cart and re-sending already-removed line keys (→ 422
    // "updates parameter is invalid"). Claiming here serialises them.
    if (!_syncing) { _syncing = true; resolve(); return; }
    _pendingResolve = resolve;   // run after the current sync completes
  });
}

// Returns true if another sync was queued (so the caller should not snap yet).
// Hands the slot to the queued sync (keeps _syncing = true) or releases it.
function completeAndTriggerNext() {
  if (_pendingResolve) {
    var next = _pendingResolve;
    _pendingResolve = null;
    next();   // queued sync takes over the slot — leave _syncing = true
    return true;
  }
  _syncing = false;
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
// Replace unpriced placeholder lines with the real ones returned by
// /cart/add.js. Matched on variant + properties signature, the same identity
// the diff uses. Only placeholders are touched: a line that already has real
// money is left alone so this can never clobber a reconciled cart.
function fillPlaceholders(cart, addedLines) {
  if (!cart || !addedLines || !addedLines.length) return cart;
  var bySig = {};
  addedLines.forEach(function (l) { bySig[lineSignature(l)] = l; });

  var touched = false;
  var items = (cart.items || []).map(function (it) {
    if (!it._cartx_unpriced) return it;
    var real = bySig[lineSignature(it)];
    if (!real) return it;
    touched = true;
    return Object.assign({}, it, real, { _cartx_unpriced: false });
  });
  return touched ? recalcTotals(Object.assign({}, cart, { items: items })) : cart;
}

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

// ── Un-addable (e.g. sold-out) variant backoff ────────────
// When /cart/add.js rejects a variant (422 "…already sold out."), we must NOT
// retry it every reconcile. `_reconcileLocalGifts` calls addLine on each cart
// change, so without a cooldown a sold-out gift retries in a tight loop →
// /cart/add.js 422 storm → 429 rate-limit (the soulflower incident). Mark the
// variant and skip re-adding it for a cooldown; after it lapses we retry once.
var _unavailableVids = {};
var UNAVAILABLE_RETRY_MS = 60000;
function isVidUnavailable(vid) {
  var t = _unavailableVids[vid];
  return t != null && (Date.now() - t) < UNAVAILABLE_RETRY_MS;
}
function markVidUnavailable(vid) { _unavailableVids[vid] = Date.now(); }

async function runSync() {
  // _syncing is already claimed by queueSync(); release/hand-off on early return.
  if (!_state.localCart) { completeAndTriggerNext(); return; }
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
      var items = diff.itemsToAdd
        .map(function (a) {
          return {
            id: numericVariantId(a.merchandiseId),
            quantity: a.quantity,
            properties: propsFromAttributes(a.attributes),
          };
        })
        // Don't re-send a variant we already know is un-addable (within cooldown).
        .filter(function (it) { return !isVidUnavailable(it.id); });
      if (items.length) {
        var addRes = await internalFetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items }),
        });
        // A rejected add (e.g. 422 "…already sold out.") must not be retried in a
        // loop. Mark the attempted variants so addLine/the diff skip them for a
        // cooldown; localCart snaps to the server cart below, dropping the line.
        if (!addRes.ok) {
          items.forEach(function (it) { markVidUnavailable(it.id); });
        } else {
          // The add response already carries the real price/title/image for every
          // line it created. We used to read only `.ok` and throw the body away,
          // then spend a whole /cart.js round-trip (measured at 710ms on a live
          // store) re-fetching what we were just handed. Fill the placeholders
          // from it and notify now; the /cart.js below still runs for
          // authoritative cart-level totals, but off the critical path.
          try {
            var added = await addRes.json();
            var addedLines = (added && added.items) || (added && added.id ? [added] : []);
            if (addedLines.length) setLocalCart(fillPlaceholders(_state.localCart, addedLines));
          } catch (_) { /* fall through to the /cart.js reconcile */ }
        }
        didAdd = true;
      }
    }

    // NOTE: discount codes are NOT reconciled here. The drawer is the single
    // owner of coupons — it applies/removes them with direct, validated
    // /cart/update.js { discount } calls. Shopify preserves the applied codes
    // across quantity/add/remove `updates` calls, so they survive this sync
    // untouched. (Previously the store ALSO reconciled codes from its own
    // discount_codes view, which — when that view was incomplete — sent a
    // reduced set and silently DROPPED a previously-applied coupon.)

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
  // Skip a variant that just failed to add (e.g. a sold-out gift). This is what
  // stops the retry storm: _reconcileLocalGifts re-adds gifts every cycle, so a
  // no-op here keeps the optimistic cart matching the server (no phantom line,
  // no diff → no /cart/add.js retry). Retries once automatically after cooldown.
  if (isVidUnavailable(numericVariantId(variantId))) return;
  var base = _state.localCart || _state.serverCart || { items: [] };
  setLocalCart(addItemToLocalCart(base, createOptimisticItem(variantId, quantity, properties, meta)));
}

// True when the cart carries server-computed discounts the client can't
// reproduce (coupons, automatic/volume discounts, line discounts). For these,
// a client-side `price × qty` estimate would be wrong and flicker on qty change.
export function cartHasDiscounts(cart) {
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

// Discount codes are intentionally NOT managed by this store — the drawer owns
// them via direct, validated /cart/update.js { discount } calls (see
// CartDrawer.handleCouponApply/Remove). Keeping a second owner here caused
// coupons to be dropped, so the optimistic apply/remove helpers were removed.

// Cart-level attributes (e.g. the `_cartx` marker for the volume-discount
// Function). Applied directly — attributes aren't part of the line diff.
export async function setAttributes(attributes) {
  try {
    await cartUpdateAll({ attributes: attributes });
    // Read back /cart.js so discount allocations stay complete — the update.js
    // response can drop them, which blanks the price-breakup coupon line.
    var res = await fetchCart();
    if (res) { _state.serverCart = res; _state.localCart = res; notify(); }
  } catch (e) {
    console.error('[cartx] ajax setAttributes failed:', e);
  }
}
