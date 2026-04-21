// =============================================================
// Cart Max — Evaluate & Enrich
// Hybrid: local eval for instant UI, server eval for accuracy.
// Single /cart/update.js call for all cart mutations.
// =============================================================

import { internalFetch, fetchCart, cartUpdateAll, getContext } from './helpers';
import { localEvaluate } from './rules';

var PROXY_URL = '/apps/cartmax/evaluate-cart';

// ── Config cache ──────────────────────────────────────────
// Cached from first server evaluate. Used for instant local eval.

var _cachedConfig = null;
var _configCacheTime = 0;
var CONFIG_CACHE_TTL = 60000; // 60s — background refresh

function isCacheValid() {
  return _cachedConfig && (Date.now() - _configCacheTime < CONFIG_CACHE_TTL);
}

// ── Evaluate-cart API ─────────────────────────────────────

async function callEvaluate(cart) {
  var ctx = getContext();
  if (!ctx.shopId || !ctx.themeId) return null;
  var res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart: {
        items: cart.items || [],
        total_price: cart.total_price || 0,
        item_count: cart.item_count || 0,
        currency: cart.currency || '',
        cart_level_discount_applications: cart.cart_level_discount_applications || [],
        discount_codes: cart.discount_codes || [],
      },
      page: window.location.pathname,
      customer: ctx.customerId
        ? { id: ctx.customerId, tags: ctx.customerTags }
        : { tags: ctx.customerTags },
      shop_id: ctx.shopId,
      theme_id: String(ctx.themeId),
      money_format: ctx.moneyFormat,
    }),
  });
  if (!res.ok) {
    console.error('[CartMax] evaluate-cart failed:', res.status, await res.text());
    return null;
  }
  var result = await res.json();
  // Cache config from server response
  if (result && result._config) {
    _cachedConfig = result._config;
    _configCacheTime = Date.now();
  }
  return result;
}

// ── Helpers ───────────────────────────────────────────────

function normalizeVariantId(id) {
  if (typeof id === 'string' && id.startsWith('gid://')) return id.split('/').pop();
  return id;
}

function simulateCart(cart, action) {
  if (!action || !cart || !cart.items) return cart;
  var items = [];
  for (var i = 0; i < cart.items.length; i++) {
    var item = cart.items[i];
    if (item.key === action.key) {
      if (action.qty > 0) {
        var unitPrice = item.quantity > 0 ? Math.round(item.price) : 0;
        var linePrice = unitPrice * action.qty;
        items.push(Object.assign({}, item, {
          quantity: action.qty,
          line_price: linePrice,
          final_line_price: linePrice,
          original_line_price: linePrice,
        }));
      }
    } else {
      items.push(item);
    }
  }
  var totalPrice = 0;
  var itemCount = 0;
  for (var j = 0; j < items.length; j++) {
    totalPrice += (items[j].final_line_price || 0);
    itemCount += (items[j].quantity || 0);
  }
  return Object.assign({}, cart, {
    items: items,
    total_price: totalPrice,
    item_count: itemCount,
    items_subtotal_price: totalPrice,
  });
}

// ── Gift unavailability tracking ──────────────────────────

var _unavailableGifts = [];
var _unavailableLastAttempt = 0;
var UNAVAILABLE_RETRY_INTERVAL = 60000;

function isGiftUnavailable(vid) {
  return _unavailableGifts.indexOf(vid) !== -1;
}

function markGiftUnavailable(vid) {
  if (_unavailableGifts.indexOf(vid) === -1) {
    _unavailableGifts.push(vid);
  }
  _unavailableLastAttempt = Date.now();
}

function shouldRetryUnavailable() {
  return Date.now() - _unavailableLastAttempt >= UNAVAILABLE_RETRY_INTERVAL;
}

function clearAvailableGifts(cartItems) {
  _unavailableGifts = _unavailableGifts.filter(function (vid) {
    return !(cartItems || []).some(function (item) {
      return String(item.variant_id) === vid;
    });
  });
}

// ── Apply result with single /cart/update.js call ─────────

async function applyResult(result, cart, pendingAction) {
  if (result.frozen) return null;

  // Dispatch bar/ribbon to Preact IMMEDIATELY
  window.dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: result }));

  var existingItems = cart.items || [];

  // Build update payload (qty changes + removals)
  var updates = {};
  var hasUpdates = false;

  // 1. User's pending action
  if (pendingAction) {
    updates[pendingAction.key] = pendingAction.qty;
    hasUpdates = true;
  }

  // 2. Remove stale gifts
  for (var j = 0; j < (result.to_remove || []).length; j++) {
    updates[result.to_remove[j]] = 0;
    hasUpdates = true;
  }

  // 3. Collect NEW gifts
  var canRetry = shouldRetryUnavailable();
  var itemsToAdd = [];
  for (var i = 0; i < (result.to_add || []).length; i++) {
    var item = result.to_add[i];
    var offerId = item.properties && item.properties['_offer_id'];
    var vid = String(normalizeVariantId(item.variant_id));
    var alreadyIn = existingItems.some(function (li) {
      return String(li.variant_id) === vid &&
        li.properties && li.properties['_offer_id'] === offerId;
    });
    if (alreadyIn) continue;
    if (isGiftUnavailable(vid) && !canRetry) continue;
    itemsToAdd.push(item);
  }

  var didChange = false;

  // 4. Send /cart/update.js for qty + removals
  if (hasUpdates) {
    try {
      await cartUpdateAll({ updates: updates });
      didChange = true;
    } catch (e) {
      console.error('[CartMax] cartUpdateAll failed:', e);
    }
  }

  // 5. Add new gifts via /cart/add.js (needs properties)
  if (itemsToAdd.length > 0) {
    var addPayload = itemsToAdd.map(function (item) {
      return {
        id: Number(normalizeVariantId(item.variant_id)),
        quantity: item.quantity || 1,
        properties: item.properties || {},
      };
    });
    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: addPayload }),
      });
      didChange = true;
    } catch (e) {
      console.error('[CartMax] gift add failed:', e);
    }
  }

  // 6. Fetch final cart, detect unavailable gifts, sync drawer
  if (didChange || hasUpdates) {
    try {
      var freshCart = await fetchCart();

      // Detect failed gift adds
      if (itemsToAdd.length > 0) {
        for (var k = 0; k < itemsToAdd.length; k++) {
          var addedVid = String(normalizeVariantId(itemsToAdd[k].variant_id));
          var inFreshCart = (freshCart.items || []).some(function (li) {
            return String(li.variant_id) === addedVid;
          });
          if (!inFreshCart) {
            markGiftUnavailable(addedVid);
            console.warn('[CartMax] Gift variant unavailable:', addedVid);
          }
        }
      }

      clearAvailableGifts(freshCart.items);

      window.dispatchEvent(new CustomEvent('cartmax:gift-unavailable', {
        detail: { variants: _unavailableGifts.slice() },
      }));
      window.dispatchEvent(new CustomEvent('cartmax:internal-reload', { detail: { cart: freshCart } }));
      return freshCart;
    } catch (e) {}
  }

  return null;
}

// ── Core evaluate runner ──────────────────────────────────

var _lastResult = null;
var _evaluating = false;
var _pendingCart = null;
var _pendingAction = null;

async function runEvaluate(cart, action) {
  if (!cart) return;

  if (_evaluating) {
    _pendingCart = cart;
    _pendingAction = action || null;
    return;
  }

  var ctx = getContext();
  if (!ctx.shopId || !ctx.themeId) return;

  // Simulate cart with pending action
  var evalCart = action ? simulateCart(cart, action) : cart;

  // ── Local eval for instant feedback (if config is cached) ──
  if (isCacheValid()) {
    try {
      var localResult = localEvaluate(_cachedConfig, evalCart);
      if (localResult) {
        // Push bar/ribbon immediately — don't wait for server
        window.dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: localResult }));
      }
    } catch (e) {
      // Local eval failed — no problem, server eval will handle it
    }
  }

  // ── Server eval for accuracy (gifts, coupons, claims, upsells) ──
  _evaluating = true;
  try {
    var result = await callEvaluate(evalCart);
    if (result) {
      _lastResult = result;
      await applyResult(result, cart, action || null);
    }
  } catch (err) {
    console.error('[CartMax] Evaluate error:', err);
  } finally {
    _evaluating = false;
  }

  // Process queued cart
  if (_pendingCart) {
    var nextCart = _pendingCart;
    var nextAction = _pendingAction;
    _pendingCart = null;
    _pendingAction = null;
    runEvaluate(nextCart, nextAction);
  }
}

// ── Events ────────────────────────────────────────────────

window.addEventListener('cartmax:drawer-opened', function () {
  if (_lastResult) {
    window.dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: _lastResult }));
  }
});

window.addEventListener('cartmax:cart-action', function (e) {
  var detail = e.detail || {};
  runEvaluate(detail.cart, detail.action);
});

window.addEventListener('cartmax:cart-changed', function (e) {
  runEvaluate(e.detail && e.detail.cart);
});

// ── Warmup ────────────────────────────────────────────────

fetchCart()
  .then(function (cart) { return runEvaluate(cart); })
  .catch(function () {});
