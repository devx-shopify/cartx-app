// =============================================================
// cartx — Client-Side Rule Evaluation
// Mirrors the server-side triggers + bar logic for instant results.
// Used when config is cached — avoids server roundtrip.
// =============================================================

function normalizeId(id) {
  var s = String(id);
  return s.startsWith('gid://') ? s.split('/').pop() : s;
}

function isDiscountedItem(item) {
  return (item.properties && item.properties['_freebie'] === 'true') ||
    (item.properties && item.properties['_cartmax_claim'] === 'true');
}

function adjustedTotal(items) {
  var cents = 0;
  for (var i = 0; i < items.length; i++) {
    if (isDiscountedItem(items[i])) continue;
    cents += items[i].line_price || 0;
  }
  return cents / 100;
}

function adjustedQty(items) {
  var qty = 0;
  for (var i = 0; i < items.length; i++) {
    if (isDiscountedItem(items[i])) continue;
    qty += items[i].quantity || 0;
  }
  return qty;
}

function pageMatch(handles, path) {
  if (!handles || handles.length === 0) return false;
  if (handles.indexOf('/') !== -1) return true;
  var clean = path.split('?')[0];
  return handles.indexOf(clean) !== -1;
}

// ── Evaluate offers (mirrors triggers.server.js) ──────────

function evaluateTrigger(offer, adjTotal, adjQty) {
  var t = offer.trigger || {};
  var priceMet = t.price_threshold && adjTotal >= t.price_threshold;
  var qtyMet = t.quantity_threshold && adjQty >= t.quantity_threshold;
  return priceMet || qtyMet;
}

function evaluateOffers(offers, cart, adjTotal, adjQty, page) {
  var toAdd = [];
  var toRemove = [];
  var triggeredIds = {};

  for (var i = 0; i < offers.length; i++) {
    var offer = offers[i];
    if (!pageMatch(offer.page_handles, page)) continue;

    var triggered = evaluateTrigger(offer, adjTotal, adjQty);
    if (triggered) {
      triggeredIds[offer.id] = true;
      if (offer.reward && offer.reward.type === 'auto_add_gift' && offer.reward.add_mode === 'auto') {
        var giftVids = offer.reward.gift_variants || [];
        for (var g = 0; g < giftVids.length; g++) {
          var vid = normalizeId(giftVids[g]);
          var alreadyIn = (cart.items || []).some(function (li) {
            return normalizeId(li.variant_id) === vid &&
              li.properties && li.properties['_offer_id'] === offer.id;
          });
          if (!alreadyIn) {
            toAdd.push({
              variant_id: giftVids[g],
              quantity: offer.reward.quantity_per_variant || 1,
              properties: { _freebie: 'true', _offer_id: offer.id },
            });
          }
        }
      }
    }
  }

  // Find gifts to remove (offer not triggered)
  for (var j = 0; j < (cart.items || []).length; j++) {
    var item = cart.items[j];
    if (!item.properties || item.properties['_freebie'] !== 'true') continue;
    if (item.properties['_claimed'] === 'true') continue;
    var offerId = item.properties['_offer_id'];
    if (!offerId) continue;
    if (!triggeredIds[offerId]) {
      toRemove.push(item.key);
    }
  }

  return { to_add: toAdd, to_remove: toRemove };
}

// ── Build progress bar (simplified client-side) ───────────

function buildBar(config, adjTotal, adjQty, page, moneyFormat) {
  if (!config.progress_bar || !config.progress_bar.enabled) return null;

  var entries = [];

  // Collect from offers
  for (var i = 0; i < (config.offers || []).length; i++) {
    var offer = config.offers[i];
    if (!offer.bar || !offer.bar.show) continue;
    if (!pageMatch(offer.page_handles, page)) continue;
    entries.push({
      threshold: offer.trigger.price_threshold || offer.trigger.quantity_threshold,
      trigger_type: offer.trigger.price_threshold ? 'price' : 'quantity',
      label: offer.bar.label || '',
      top_message: offer.bar.top_message || null,
    });
  }

  if (entries.length === 0) return null;

  // Sort by threshold
  entries.sort(function (a, b) { return a.threshold - b.threshold; });

  // Determine mode
  var mode = entries.some(function (e) { return e.trigger_type === 'price'; }) ? 'price' : 'quantity';
  var filtered = entries.filter(function (e) { return e.trigger_type === mode; });
  if (filtered.length === 0) return null;

  var currentValue = mode === 'price' ? adjTotal : adjQty;
  var segmentWidth = 100 / filtered.length;
  var progress = 0;
  var topMessage = null;
  var tiers = [];
  var prevThreshold = 0;

  for (var t = 0; t < filtered.length; t++) {
    var tier = filtered[t];
    var state;
    if (currentValue >= tier.threshold) {
      state = 'active';
      progress += segmentWidth;
    } else if (!topMessage) {
      state = 'next';
      var remaining = tier.threshold - currentValue;
      var segmentRange = tier.threshold - prevThreshold;
      var segmentProgress = segmentRange > 0 ? (currentValue - prevThreshold) / segmentRange : 0;
      progress += segmentProgress * segmentWidth;
      if (tier.top_message) {
        var amountStr = remaining.toFixed(2);
        var formatted = moneyFormat
          ? moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amountStr)
              .replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(remaining)))
              .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amountStr.replace('.', ','))
          : '$' + amountStr;
        topMessage = tier.top_message.replace(/\[\[\s*price\s*\]\]/gi, formatted);
      }
    } else {
      state = 'inactive';
    }
    prevThreshold = tier.threshold;
    tiers.push({
      threshold: tier.threshold,
      label: tier.label,
      state: state,
    });
  }

  if (topMessage === null && currentValue >= filtered[filtered.length - 1].threshold) {
    topMessage = config.progress_bar.all_complete_message || null;
  }

  return {
    enabled: true,
    mode: mode,
    progress_pct: Math.min(progress, 100),
    top_message: topMessage,
    tiers: tiers,
  };
}

// ── Main: evaluate cart locally ───────────────────────────

export function localEvaluate(cachedConfig, cart) {
  if (!cachedConfig || !cart) return null;

  var items = cart.items || [];
  var adjTotal = adjustedTotal(items);
  var adjQty = adjustedQty(items);
  var page = window.location.pathname;

  var offerResult = evaluateOffers(cachedConfig.offers || [], cart, adjTotal, adjQty, page);
  var bar = buildBar(cachedConfig, adjTotal, adjQty, page, cachedConfig.money_format || '');

  // Ribbon from next locked tier
  var ribbonMessage = null;
  if (bar && bar.tiers) {
    for (var i = 0; i < bar.tiers.length; i++) {
      if (bar.tiers[i].state === 'next') {
        ribbonMessage = bar.tiers[i].ribbon_message || null;
        break;
      }
    }
  }

  return {
    to_add: offerResult.to_add,
    to_remove: offerResult.to_remove,
    bar: bar,
    ribbon_message: ribbonMessage,
  };
}
