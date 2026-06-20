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
        original_total_price: cart.original_total_price || 0,
        total_discount: cart.total_discount || 0,
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

// ── cartx active marker ───────────────────────────────────
// The volume-discount Shopify Function only applies when the cart carries the
// `_cartx` attribute. We set it here — when cartx is actually live on the
// storefront and the merchant has an enabled volume offer — so the discount can
// NEVER apply store-wide on a store/cart where cartx isn't engaging. Idempotent:
// set at most once per session, and skipped if the cart already has it.

var _cartxAttrEnsured = false;

function configHasVolumeOffer(cfg) {
  if (!cfg || !cfg.offers) return false;
  for (var i = 0; i < cfg.offers.length; i++) {
    var o = cfg.offers[i];
    if (o.reward && o.reward.type === 'volume_discount') return true;
  }
  return false;
}

async function ensureCartxAttribute(cart) {
  if (_cartxAttrEnsured) return;
  if (!configHasVolumeOffer(_cachedConfig)) return;
  var attrs = (cart && cart.attributes) || {};
  if (attrs._cartx === 'on') { _cartxAttrEnsured = true; return; }
  try {
    await cartUpdateAll({ attributes: { _cartx: 'on' } });
    _cartxAttrEnsured = true;
  } catch (e) {
    console.error('[cartx] failed to set _cartx cart attribute:', e);
  }
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
  var originalTotal = 0;
  var itemCount = 0;
  for (var j = 0; j < items.length; j++) {
    totalPrice += (items[j].final_line_price || 0);
    originalTotal += (items[j].original_line_price || items[j].line_price || 0);
    itemCount += (items[j].quantity || 0);
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

      // The server's eval ran against the *simulated* cart, which loses the
      // changed line's discount info (simulateCart flattens original/final
      // line prices). After Shopify processes the real update, freshCart has
      // the authoritative totals — recompute savings from those.
      var freshSavings = Math.max(
        0,
        (freshCart.original_total_price || 0) - (freshCart.total_price || 0)
      );
      _lastResult = Object.assign({}, _lastResult, { total_savings: freshSavings });

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

  var tiers = serverBar.tiers;
  var n = tiers.length;
  var mode = serverBar.mode;

  // Per-tier trigger type. Older server responses may not include it — fall back
  // to bar.mode (which only works for single-mode bars, so a mixed bar without
  // per-tier types degenerates to the old buggy behaviour and gets corrected by
  // the server roundtrip).
  function tierType(tier) {
    return tier.trigger_type || (mode === 'price' ? 'price' : 'quantity');
  }

  // First pass: compare each tier against its own current value (price vs qty).
  var stated = tiers.map(function (tier) {
    var ttype = tierType(tier);
    var cv = ttype === 'price' ? adjTotal : adjQty;
    return Object.assign({}, tier, {
      state: cv >= tier.threshold ? 'active' : 'inactive',
    });
  });

  // Promote the lowest-threshold inactive tier of EACH type to "next".
  // (Mixed-mode bars can have two "next" tiers — one per type — matching the
  // server's behaviour.)
  var nextIds = {};
  ['price', 'quantity'].forEach(function (ttype) {
    var sameType = stated.filter(function (t) {
      return tierType(t) === ttype && t.state === 'inactive';
    });
    if (sameType.length === 0) return;
    sameType.sort(function (a, b) { return a.threshold - b.threshold; });
    nextIds[sameType[0].id] = true;
  });
  var newTiers = stated.map(function (t) {
    return nextIds[t.id] ? Object.assign({}, t, { state: 'next' }) : t;
  });

  // Compute progress: full segment per active tier + partial segment for the
  // first "next" tier in render order. Partial is computed within the same
  // type's threshold band, matching the server's prevThreshold logic.
  var segmentWidth = 100 / n;
  var activeCount = 0;
  for (var ac = 0; ac < newTiers.length; ac++) {
    if (newTiers[ac].state === 'active') activeCount++;
  }
  var progress = activeCount * segmentWidth;

  var nextTier = null;
  for (var nx = 0; nx < newTiers.length; nx++) {
    if (newTiers[nx].state === 'next') { nextTier = newTiers[nx]; break; }
  }
  if (nextTier) {
    var ttypeN = tierType(nextTier);
    var cvN = ttypeN === 'price' ? adjTotal : adjQty;
    var sameTypeSorted = newTiers
      .filter(function (t) { return tierType(t) === ttypeN; })
      .slice()
      .sort(function (a, b) { return a.threshold - b.threshold; });
    var prevThreshold = 0;
    for (var p = 0; p < sameTypeSorted.length; p++) {
      if (sameTypeSorted[p].id === nextTier.id) break;
      prevThreshold = sameTypeSorted[p].threshold;
    }
    var segmentRange = nextTier.threshold - prevThreshold;
    if (segmentRange > 0) {
      var partial = (cvN - prevThreshold) / segmentRange;
      progress += Math.max(0, Math.min(1, partial)) * segmentWidth;
    }
  }

  // Resolve top_message
  var topMessage;
  if (!nextTier) {
    topMessage = (_cachedConfig && _cachedConfig.progress_bar && _cachedConfig.progress_bar.all_complete_message) || serverBar.top_message;
  } else {
    var ttypeT = tierType(nextTier);
    var cvT = ttypeT === 'price' ? adjTotal : adjQty;
    var remaining = nextTier.threshold - cvT;
    var tmpl = findTopMessage(nextTier.id);
    if (tmpl) {
      var moneyFmt = (_cachedConfig && _cachedConfig.money_format) || '';
      var formatted = formatMoneyTemplate(moneyFmt, remaining);
      topMessage = tmpl.replace(/\[\[\s*price\s*\]\]/gi, formatted);
    } else {
      topMessage = serverBar.top_message;
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
    var localResult = localEvaluate(_cachedConfig, evalCart, { id: ctx.customerId, tags: ctx.customerTags });
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
      // Mark the cart as cartx-active so the volume-discount Function may apply.
      // Sequenced after applyResult to avoid concurrent /cart/update.js writes.
      await ensureCartxAttribute(updatedCart || cart);
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
    var localResult = localEvaluate(_cachedConfig, evalCart, { id: ctx.customerId, tags: ctx.customerTags });
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
      await ensureCartxAttribute(updatedCart || cart);
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
