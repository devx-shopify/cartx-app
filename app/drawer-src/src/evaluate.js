// =============================================================
// cartx — Evaluate & Enrich
// Hybrid: local eval for instant UI, server eval for accuracy.
// Single /cart/update.js call for all cart mutations.
// =============================================================

import { internalFetch, fetchCart, cartUpdateAll, getContext, normalizeVariantId, formatMoneyTemplate } from './helpers';
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
    console.error('[cartx] evaluate-cart failed:', res.status, await res.text());
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

function simulateCart(cart, actions) {
  if (!actions || actions.length === 0 || !cart || !cart.items) return cart;
  // Build a map of key → qty for all pending actions
  var actionMap = {};
  for (var a = 0; a < actions.length; a++) {
    actionMap[actions[a].key] = actions[a].qty;
  }
  var items = [];
  for (var i = 0; i < cart.items.length; i++) {
    var item = cart.items[i];
    if (actionMap.hasOwnProperty(item.key)) {
      var newQty = actionMap[item.key];
      if (newQty > 0) {
        var unitPrice = item.quantity > 0 ? Math.round(item.price) : 0;
        var linePrice = unitPrice * newQty;
        items.push(Object.assign({}, item, {
          quantity: newQty,
          line_price: linePrice,
          final_line_price: linePrice,
          original_line_price: linePrice,
        }));
      }
      // qty 0 = remove, so don't push
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

async function applyResult(result, cart, pendingActions) {
  if (result.frozen) return null;

  var existingItems = cart.items || [];

  // Build update payload (qty changes + removals)
  var updates = {};
  var hasUpdates = false;

  // 1. User's pending actions (may be multiple from rapid clicks)
  for (var pa = 0; pa < pendingActions.length; pa++) {
    updates[pendingActions[pa].key] = pendingActions[pa].qty;
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
      console.error('[cartx] cartUpdateAll failed:', e);
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
      console.error('[cartx] gift add failed:', e);
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
            console.warn('[cartx] Gift variant unavailable:', addedVid);
          }
        }
      }

      clearAvailableGifts(freshCart.items);

      window.dispatchEvent(new CustomEvent('cartmax:gift-unavailable', {
        detail: { variants: _unavailableGifts.slice() },
      }));
      window.dispatchEvent(new CustomEvent('cartmax:internal-reload', {
        detail: { cart: freshCart, evalResult: _lastResult },
      }));
      return freshCart;
    } catch (e) {
      // Push last known eval result so drawer doesn't stall
      if (_lastResult) {
        window.dispatchEvent(new CustomEvent('cartmax:eval-result', {
          detail: Object.assign({}, _lastResult, { _server: true }),
        }));
      }
    }
  }

  return null;
}

// ── Recompute bar against server tiers with local cart value ──

function recomputeBar(serverBar, cart) {
  if (!serverBar || !serverBar.tiers || serverBar.tiers.length === 0) return serverBar;

  var adjTotal = 0, adjQty = 0;
  var items = cart.items || [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.properties && (it.properties['_freebie'] === 'true' || it.properties['_cartmax_claim'] === 'true')) continue;
    adjTotal += (it.original_line_price || it.line_price || 0);
    adjQty += (it.quantity || 0);
  }
  adjTotal /= 100;

  var currentValue = serverBar.mode === 'price' ? adjTotal : adjQty;
  var tiers = serverBar.tiers;
  var n = tiers.length;
  var segmentWidth = 100 / n;
  var progress = 0;
  var prevThreshold = 0;
  var nextFound = false;
  var newTiers = [];

  for (var t = 0; t < n; t++) {
    var tier = tiers[t];
    var state;
    if (currentValue >= tier.threshold) {
      state = 'active';
      progress += segmentWidth;
    } else if (!nextFound) {
      state = 'next';
      nextFound = true;
      var segmentRange = tier.threshold - prevThreshold;
      progress += segmentRange > 0 ? ((currentValue - prevThreshold) / segmentRange) * segmentWidth : 0;
    } else {
      state = 'inactive';
    }
    prevThreshold = tier.threshold;
    newTiers.push(Object.assign({}, tier, { state: state }));
  }

  // Resolve top_message from the "next" tier using cached config
  var topMessage = null;
  if (!nextFound) {
    topMessage = (_cachedConfig && _cachedConfig.progress_bar && _cachedConfig.progress_bar.all_complete_message) || serverBar.top_message;
  } else {
    // Find the next tier and resolve its message
    for (var m = 0; m < newTiers.length; m++) {
      if (newTiers[m].state === 'next') {
        var remaining = newTiers[m].threshold - currentValue;
        // Try to find the message template from cached config offers
        var tmpl = findTopMessage(newTiers[m].id);
        if (tmpl) {
          var moneyFmt = (_cachedConfig && _cachedConfig.money_format) || '';
          var formatted = formatMoneyTemplate(moneyFmt, remaining);
          topMessage = tmpl.replace(/\[\[\s*price\s*\]\]/gi, formatted);
        } else {
          topMessage = serverBar.top_message;
        }
        break;
      }
    }
  }

  return Object.assign({}, serverBar, {
    progress_pct: Math.min(progress, 100),
    top_message: topMessage,
    tiers: newTiers,
  });
}

function findTopMessage(tierId) {
  if (!_cachedConfig || !_cachedConfig.offers) return null;
  for (var i = 0; i < _cachedConfig.offers.length; i++) {
    var o = _cachedConfig.offers[i];
    if (o.id === tierId && o.bar && o.bar.top_message) return o.bar.top_message;
  }
  return null;
}

// ── Core evaluate runner ──────────────────────────────────

var _lastResult = null;
var _evaluating = false;
var _pendingCart = null;
var _pendingActions = [];
var _evaluateResolvers = []; // Resolvers waiting for evaluate to settle

// Returns a promise that resolves when all in-flight evaluations complete.
// Resolves immediately if nothing is running.
export function waitForEvaluate() {
  if (!_evaluating && _pendingActions.length === 0 && !_pendingCart) {
    return Promise.resolve();
  }
  return new Promise(function (resolve) {
    _evaluateResolvers.push(resolve);
  });
}

function _flushEvaluateResolvers() {
  if (_evaluating || _pendingCart) return; // still working
  var resolvers = _evaluateResolvers;
  _evaluateResolvers = [];
  for (var i = 0; i < resolvers.length; i++) resolvers[i]();
}

async function runEvaluate(cart, action) {
  if (!cart) return;

  if (_evaluating) {
    _pendingCart = cart;
    if (action) _pendingActions.push(action);
    return;
  }

  // Wrap single action into array for unified handling
  var actions = action ? [action] : [];

  var ctx = getContext();
  if (!ctx.shopId || !ctx.themeId) return;

  // Simulate cart with pending actions for eval
  var evalCart = actions.length > 0 ? simulateCart(cart, actions) : cart;

  // ── FAST PATH: optimistic local eval ──
  // Push simulated cart + local eval result to drawer IMMEDIATELY
  // so user sees qty/price/bar changes with zero latency.
  if (actions.length > 0) {
    window.dispatchEvent(new CustomEvent('cartmax:optimistic-update', {
      detail: { cart: evalCart },
    }));
  }
  if (isCacheValid()) {
    var localResult = localEvaluate(_cachedConfig, evalCart);
    if (localResult && _lastResult && _lastResult.bar) {
      var serverBar = _lastResult.bar;
      var optimistic = Object.assign({}, _lastResult, {
        ribbon_message: localResult.ribbon_message,
      });

      // Recompute progress + tier states against the SERVER's tiers
      // using the simulated cart value. This is always correct regardless
      // of whether local eval has different tier count.
      optimistic.bar = recomputeBar(serverBar, evalCart);

      window.dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: optimistic }));
    } else if (localResult && !_lastResult) {
      window.dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: localResult }));
    }
  }

  // ── ACCURATE PATH: server eval + apply ──
  _evaluating = true;
  try {
    var result = await callEvaluate(evalCart);
    if (result) {
      _lastResult = result;
      var updatedCart = await applyResult(result, cart, actions);
      // If no cart mutations happened, push eval result directly
      if (!updatedCart) {
        window.dispatchEvent(new CustomEvent('cartmax:eval-result', {
          detail: Object.assign({}, result, { _server: true }),
        }));
      }
    }
  } catch (err) {
    console.error('[cartx] Evaluate error:', err);
  } finally {
    _evaluating = false;
  }

  // Process queued actions (may be multiple from rapid clicks)
  if (_pendingCart) {
    var nextCart = _pendingCart;
    var nextActions = _pendingActions;
    _pendingCart = null;
    _pendingActions = [];
    runEvaluateBatch(nextCart, nextActions);
  } else {
    _flushEvaluateResolvers();
  }
}

// Process accumulated pending actions as a batch
async function runEvaluateBatch(cart, actions) {
  if (!cart) return;

  var ctx = getContext();
  if (!ctx.shopId || !ctx.themeId) return;

  var evalCart = actions.length > 0 ? simulateCart(cart, actions) : cart;

  if (actions.length > 0) {
    window.dispatchEvent(new CustomEvent('cartmax:optimistic-update', {
      detail: { cart: evalCart },
    }));
  }
  if (isCacheValid()) {
    var localResult = localEvaluate(_cachedConfig, evalCart);
    if (localResult && _lastResult && _lastResult.bar) {
      var optimistic = Object.assign({}, _lastResult, {
        ribbon_message: localResult.ribbon_message,
      });
      optimistic.bar = recomputeBar(_lastResult.bar, evalCart);
      window.dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: optimistic }));
    }
  }

  _evaluating = true;
  try {
    var result = await callEvaluate(evalCart);
    if (result) {
      _lastResult = result;
      var updatedCart = await applyResult(result, cart, actions);
      if (!updatedCart) {
        window.dispatchEvent(new CustomEvent('cartmax:eval-result', {
          detail: Object.assign({}, result, { _server: true }),
        }));
      }
    }
  } catch (err) {
    console.error('[cartx] Evaluate error:', err);
  } finally {
    _evaluating = false;
  }

  if (_pendingCart) {
    var nextCart = _pendingCart;
    var nextActions = _pendingActions;
    _pendingCart = null;
    _pendingActions = [];
    runEvaluateBatch(nextCart, nextActions);
  } else {
    _flushEvaluateResolvers();
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
