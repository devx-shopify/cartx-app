// =============================================================
// cartx — Optimistic cart engine (Phase C)
//
// Diff-based optimistic model, ported from devx-commerce/foxtale-star-utils
// (utils/optimistic.ts + the diff in services/sync.ts), adapted to cartx:
//  - operates on the drawer's /cart.js shape (what mapCart() produces and what
//    CartDrawer renders) — NOT the raw GraphQL Cart shape.
//  - matches lines by variant_id + properties signature (not variant alone), so
//    a freebie line and a paid line of the same variant stay distinct.
//  - emits Storefront GraphQL inputs (merchandiseId/attributes for adds, line
//    `id` for update/remove) using the `_gql_line_id` that mapCart preserves.
//
// The UI mutates `localCart` (instant); syncCart (cart-store.js) calls
// getCartDifference(server, local) and applies the minimal set of mutations.
// =============================================================

// Line properties that must NOT be part of a line's identity: they differ
// between the drawer's optimistic line and the server line for the SAME gift, so
// including them made getCartDifference think the gift was missing every cycle
// and re-add it endlessly (429 request storm + duplicate/runaway gift lines).
//  - `_acquired_on_page` is stamped per page by the server/drawer (varies).
//  - GoKwik injects `_gk_line_key` (and other `_gk*`) on the server line only.
// Everything else (incl. `_unique`, `_freebie`, `_offer_id`, real custom props)
// stays part of identity.
function isVolatileLineProp(k) {
  return k === '_acquired_on_page' || k.indexOf('_gk') === 0;
}

// Stable per-line identity: variant + a deterministic signature of properties.
// Two lines merge only if both match (mirrors the AJAX line `key` semantics).
export function propsSignature(properties) {
  var p = properties || {};
  var keys = Object.keys(p).filter(function (k) { return !isVolatileLineProp(k); }).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) parts.push(keys[i] + '=' + p[keys[i]]);
  return parts.join('&');
}

export function lineSignature(item) {
  return String(item.variant_id) + '|' + propsSignature(item.properties);
}

// gid for a variant id (the GraphQL merchandiseId).
function variantGid(variantId) {
  var s = String(variantId);
  return s.indexOf('gid://') === 0 ? s : 'gid://shopify/ProductVariant/' + s;
}

function attributesFromProps(properties) {
  var p = properties || {};
  return Object.keys(p).map(function (k) { return { key: k, value: String(p[k]) }; });
}

// Recompute cart-level totals from line items (cents). Mirrors evaluate.js
// simulateCart / CartDrawer._stripLine so optimistic totals look right pre-sync.
export function recalcTotals(cart) {
  var items = cart.items || [];
  var total = 0, original = 0, count = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    total += (it.final_line_price || 0);
    original += (it.original_line_price || it.line_price || 0);
    count += (it.quantity || 0);
  }
  return Object.assign({}, cart, {
    items: items,
    item_count: count,
    total_price: total,
    original_total_price: original,
    total_discount: Math.max(0, original - total),
    items_subtotal_price: total,
  });
}

// Build an optimistic /cart.js line for instant display before the server
// confirms it. `temp key` is replaced by the real line id on reconcile.
var _tempSeq = 0;
export function createOptimisticItem(variantId, quantity, properties, meta) {
  meta = meta || {};
  var unit = meta.price || 0;                 // cents
  var qty = quantity || 1;
  var line = unit * qty;
  _tempSeq += 1;
  return {
    key: 'pending_' + variantId + '_' + _tempSeq,
    id: Number(variantId),
    variant_id: Number(variantId),
    product_id: meta.product_id != null ? Number(meta.product_id) : null,
    quantity: qty,
    properties: properties || {},
    price: unit,
    original_price: meta.compare_at || unit,
    final_price: unit,
    line_price: line,
    original_line_price: (meta.compare_at || unit) * qty,
    final_line_price: line,
    total_discount: 0,
    discounts: [],
    title: meta.title || '',
    product_title: meta.product_title || meta.title || '',
    variant_title: meta.variant_title || null,
    image: meta.image || null,
    featured_image: meta.image ? { url: meta.image } : null,
    handle: meta.handle || '',
    url: meta.handle ? ('/products/' + meta.handle + '?variant=' + variantId) : null,
    available: true,
    line_level_discount_allocations: [],
    _optimistic: true,
  };
}

// Add (or merge into an existing same-signature line) optimistically.
export function addItemToLocalCart(cart, newItem) {
  var items = (cart.items || []).slice();
  var sig = lineSignature(newItem);
  var idx = -1;
  for (var i = 0; i < items.length; i++) {
    if (lineSignature(items[i]) === sig) { idx = i; break; }
  }
  if (idx === -1) {
    items.unshift(newItem);
  } else {
    var ex = items[idx];
    var qty = (ex.quantity || 0) + (newItem.quantity || 1);
    items[idx] = Object.assign({}, ex, {
      quantity: qty,
      line_price: (ex.price || 0) * qty,
      final_line_price: (ex.price || 0) * qty,
      original_line_price: (ex.original_price || ex.price || 0) * qty,
    });
  }
  return recalcTotals(Object.assign({}, cart, { items: items }));
}

// Set a line's quantity (0 removes it) optimistically, keyed by drawer `key`.
export function setLineQuantity(cart, key, quantity) {
  var items = [];
  (cart.items || []).forEach(function (it) {
    if (it.key !== key) { items.push(it); return; }
    if (quantity <= 0) return;   // remove
    items.push(Object.assign({}, it, {
      quantity: quantity,
      line_price: (it.price || 0) * quantity,
      final_line_price: (it.price || 0) * quantity,
      original_line_price: (it.original_price || it.price || 0) * quantity,
    }));
  });
  return recalcTotals(Object.assign({}, cart, { items: items }));
}

/**
 * Diff the canonical server cart against the optimistic local cart and return
 * the minimal Storefront mutations to reconcile them. Matches lines by
 * signature (variant + properties); distributes quantity deltas across lines.
 *
 * Returns:
 *   itemsToAdd:    [{ merchandiseId, quantity, attributes }]   → cartLinesAdd
 *   itemsToUpdate: [{ id, quantity }]                          → cartLinesUpdate
 *   lineIdsToRemove: [ id ]                                    → cartLinesRemove
 */
export function getCartDifference(serverCart, localCart) {
  var serverItems = (serverCart && serverCart.items) || [];
  var localItems = (localCart && localCart.items) || [];

  var itemsToAdd = [];
  var itemsToUpdate = [];
  var lineIdsToRemove = [];

  // Group server lines by signature (a signature can map to >1 line).
  var serverBySig = {};
  serverItems.forEach(function (it) {
    var sig = lineSignature(it);
    (serverBySig[sig] = serverBySig[sig] || []).push(it);
  });
  // Sum local quantity per signature, remembering a representative line.
  var localBySig = {};
  localItems.forEach(function (it) {
    var sig = lineSignature(it);
    if (!localBySig[sig]) localBySig[sig] = { qty: 0, sample: it };
    localBySig[sig].qty += (it.quantity || 0);
  });

  // Adds: signatures present locally but not on the server.
  Object.keys(localBySig).forEach(function (sig) {
    if (serverBySig[sig]) return;
    var entry = localBySig[sig];
    if (entry.qty > 0) {
      itemsToAdd.push({
        merchandiseId: variantGid(entry.sample.variant_id),
        quantity: entry.qty,
        attributes: attributesFromProps(entry.sample.properties),
      });
    }
  });

  // Updates / removes: reconcile quantity per server signature.
  Object.keys(serverBySig).forEach(function (sig) {
    var lines = serverBySig[sig];
    var serverQty = lines.reduce(function (s, l) { return s + (l.quantity || 0); }, 0);
    var localQty = localBySig[sig] ? localBySig[sig].qty : 0;
    var diff = localQty - serverQty;
    if (diff === 0) return;

    if (diff > 0) {
      // Local has more → bump the first line.
      var first = lines[0];
      itemsToUpdate.push({ id: first._gql_line_id || first.key, quantity: (first.quantity || 0) + diff });
    } else {
      // Local has fewer (or zero) → drain reduction across lines; remove at 0.
      var remaining = -diff;
      for (var i = 0; i < lines.length && remaining > 0; i++) {
        var l = lines[i];
        var take = Math.min(l.quantity || 0, remaining);
        remaining -= take;
        var nextQty = (l.quantity || 0) - take;
        var lineId = l._gql_line_id || l.key;
        if (nextQty <= 0) lineIdsToRemove.push(lineId);
        else itemsToUpdate.push({ id: lineId, quantity: nextQty });
      }
    }
  });

  return { itemsToAdd: itemsToAdd, itemsToUpdate: itemsToUpdate, lineIdsToRemove: lineIdsToRemove };
}

// Discount-code diff (mirrors reference getDiscountCodeDifferences). Returns the
// final desired code list for cartDiscountCodesUpdate, or null if unchanged.
export function getDiscountCodesUpdate(serverCart, localCart) {
  var s = ((serverCart && serverCart.discount_codes) || []).map(function (d) { return d.code; });
  var l = ((localCart && localCart.discount_codes) || []).map(function (d) { return d.code; });
  var add = l.filter(function (c) { return s.indexOf(c) === -1; });
  var remove = s.filter(function (c) { return l.indexOf(c) === -1; });
  if (!add.length && !remove.length) return null;
  return l.slice();   // desired final set = local codes
}
