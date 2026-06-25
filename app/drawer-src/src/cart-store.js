// =============================================================
// cartx — Two-cart optimistic store + single-flight sync (Phase C)
//
// Ties the diff engine (cart-optimistic.js) to the Storefront service
// (storefront-cart.js), ported from devx-commerce/foxtale-star-utils
// (stores/cart.ts + services/sync.ts), as a framework-free pub/sub store
// (cartx's drawer is Preact, not React/Zustand).
//
// Model: the UI mutates `localCart` (instant); each mutation schedules a
// single-flight syncCart() that fetches the canonical server cart, diffs it,
// applies the MINIMAL set of GraphQL mutations, and snaps both carts to the
// authoritative result. Rapid edits coalesce into the fewest round-trips —
// the core "faster UI, fewer round-trips" win.
//
// NOT yet wired into the live drawer (Phase D does that, behind the
// `graphql_cart_enabled` flag). Carts are in the /cart.js shape (mapCart
// output) so CartDrawer renders them unchanged.
// =============================================================

import {
  getOrCreateCart, getCart, cartLinesAdd, cartLinesUpdate, cartLinesRemove,
  cartDiscountCodesUpdate, mapCart, storeCartId, whenStorefrontReady,
} from './storefront-cart';
import {
  getCartDifference, getDiscountCodesUpdate, addItemToLocalCart,
  createOptimisticItem, setLineQuantity,
} from './cart-optimistic';

// ── State + pub/sub ───────────────────────────────────────
var _state = {
  cartId: null,
  serverCart: null,   // canonical (/cart.js shape via mapCart)
  localCart: null,    // optimistic overlay (/cart.js shape)
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
    try { _subs[i](_state); } catch (e) { console.error('[cartx] store subscriber error:', e); }
  }
}

export function getState() { return _state; }

// What the UI renders: the optimistic local cart (falls back to server).
export function getOptimisticCart() { return _state.localCart || _state.serverCart; }

function snapTo(gqlCart) {
  var mapped = mapCart(gqlCart);
  _state.serverCart = mapped;
  _state.localCart = mapped;
  if (mapped && mapped._gql_cart_id) { _state.cartId = mapped._gql_cart_id; storeCartId(mapped._gql_cart_id); }
  notify();
}

// Apply a local (optimistic) cart immediately, then reconcile.
function setLocalCart(localCart) {
  _state.localCart = localCart;
  notify();
  scheduleSync();
}

// ── Init ──────────────────────────────────────────────────
// `seedAjaxCart` (the /cart.js-shape cart) seeds the GraphQL cart in the SAME
// step as creation, so we snap exactly once — the cart is never rendered empty
// before its items land (the "item flashes away" glitch).
export async function initStore(seedAjaxCart) {
  if (_state.ready) return _state;
  _state.loading = true; notify();
  try {
    var ok = await whenStorefrontReady(8000);
    if (!ok) { _state.ready = true; _state.loading = false; notify(); return _state; }

    var gqlCart = await getOrCreateCart();
    if (gqlCart && gqlCart.id) { _state.cartId = gqlCart.id; storeCartId(gqlCart.id); }

    // If the GraphQL cart is empty but the AJAX cart has items, seed first and
    // snap to the SEEDED result — no empty intermediate render.
    var empty = !gqlCart || !((gqlCart.lines && gqlCart.lines.edges) || []).length;
    var seedItems = (seedAjaxCart && seedAjaxCart.items) || [];
    if (empty && seedItems.length && _state.cartId) {
      var lines = seedItems.map(function (it) {
        return {
          merchandiseId: 'gid://shopify/ProductVariant/' + it.variant_id,
          quantity: it.quantity,
          attributes: Object.keys(it.properties || {}).map(function (k) {
            return { key: k, value: String(it.properties[k]) };
          }),
        };
      });
      var res = await cartLinesAdd(_state.cartId, lines);
      if (res.cart) gqlCart = res.cart;
    }
    if (gqlCart) snapTo(gqlCart);
  } catch (e) {
    console.error('[cartx] initStore failed:', e);
  } finally {
    _state.loading = false; _state.ready = true; notify();
  }
  return _state;
}

// Seed the GraphQL cart from the existing AJAX (/cart.js) cart on first load,
// so returning shoppers don't lose their cart at cutover. Only seeds when the
// GraphQL cart is empty and the AJAX cart has lines. ajaxCart is the /cart.js
// shape (items[] with variant_id, quantity, properties).
export async function seedFromAjaxCart(ajaxCart) {
  if (!ajaxCart || !(ajaxCart.items || []).length) return;
  var server = _state.serverCart;
  if (server && (server.items || []).length) return;   // already has lines
  var lines = ajaxCart.items.map(function (it) {
    return {
      merchandiseId: 'gid://shopify/ProductVariant/' + it.variant_id,
      quantity: it.quantity,
      attributes: Object.keys(it.properties || {}).map(function (k) {
        return { key: k, value: String(it.properties[k]) };
      }),
    };
  });
  try {
    if (!_state.cartId) { var c = await getOrCreateCart(); if (c) snapTo(c); }
    if (!_state.cartId) return;
    var res = await cartLinesAdd(_state.cartId, lines);
    if (res.cart) snapTo(res.cart);
  } catch (e) {
    console.error('[cartx] seedFromAjaxCart failed:', e);
  }
}

// ── Single-flight sync (mirrors reference services/sync.ts) ──
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

async function runSync() {
  if (!_state.localCart) return;
  _syncing = true;
  _state.loading = true; notify();

  try {
    var cartId = _state.cartId;
    if (!cartId) {
      var created = await getOrCreateCart();
      if (!created) throw new Error('no cart');
      cartId = created.id;
      _state.cartId = cartId;
      snapTo(created);
    }

    // Diff against the LAST-KNOWN server cart (kept current by snapTo from each
    // mutation response) — no getCart round-trip per edit. Each cart mutation
    // returns the full authoritative cart, and single-flight guarantees we're
    // the only writer, so the in-memory serverCart is trustworthy. We only
    // fetch if we somehow have no baseline (self-heal).
    var serverMapped = _state.serverCart;
    if (!serverMapped) {
      var fetched = await getCart(cartId);
      if (!fetched) {
        var recreated = await getOrCreateCart();
        fetched = recreated;
        cartId = recreated && recreated.id;
        _state.cartId = cartId;
      }
      serverMapped = mapCart(fetched);
    }

    var diff = getCartDifference(serverMapped, _state.localCart);
    var updatedGql = null;

    if (diff.lineIdsToRemove.length) {
      var r = await cartLinesRemove(cartId, diff.lineIdsToRemove);
      if (r.cart) updatedGql = r.cart;
    }
    if (diff.itemsToUpdate.length) {
      var u = await cartLinesUpdate(cartId, diff.itemsToUpdate);
      if (u.cart) updatedGql = u.cart;
    }
    if (diff.itemsToAdd.length) {
      var a = await cartLinesAdd(cartId, diff.itemsToAdd);
      if (a.cart) updatedGql = a.cart;
    }

    var codes = getDiscountCodesUpdate(updatedGql ? mapCart(updatedGql) : serverMapped, _state.localCart);
    if (codes) {
      var d = await cartDiscountCodesUpdate(cartId, codes);
      if (d.cart) updatedGql = d.cart;
    }

    // Snap only when settled; if more edits queued, let the next sync snap so
    // we don't clobber the shopper's in-flight changes.
    var hasMore = completeAndTriggerNext();
    if (!hasMore) {
      if (updatedGql) snapTo(updatedGql);   // authoritative cart from the mutation
      _state.loading = false; notify();
    }
  } catch (err) {
    console.error('[cartx] syncCart failed:', err);
    _state.loading = false;
    completeAndTriggerNext();   // keep localCart (optimistic); next edit retries
    notify();
  }
}

// ── High-level actions (what CartDrawer calls in Phase D) ──

export function addLine(variantId, quantity, properties, meta) {
  var base = _state.localCart || _state.serverCart || { items: [] };
  setLocalCart(addItemToLocalCart(base, createOptimisticItem(variantId, quantity, properties, meta)));
}

export function changeQuantity(key, quantity) {
  var base = _state.localCart || _state.serverCart;
  if (!base) return;
  setLocalCart(setLineQuantity(base, key, quantity));
}

export function removeLine(key) {
  changeQuantity(key, 0);
}

export function applyDiscountCode(code) {
  var base = _state.localCart || _state.serverCart;
  if (!base) return;
  var codes = ((base.discount_codes) || []).slice();
  if (codes.some(function (d) { return d.code === code; })) return;
  codes.push({ code: code, applicable: true });
  setLocalCart(Object.assign({}, base, { discount_codes: codes }));
}

export function removeDiscountCode(code) {
  var base = _state.localCart || _state.serverCart;
  if (!base) return;
  var codes = ((base.discount_codes) || []).filter(function (d) { return d.code !== code; });
  setLocalCart(Object.assign({}, base, { discount_codes: codes }));
}
