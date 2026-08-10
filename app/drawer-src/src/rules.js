// =============================================================
// cartx — Client-Side Rule Evaluation
// Mirrors the server-side triggers + bar logic for instant results.
// Used when config is cached — avoids server roundtrip.
// =============================================================

import { normalizeVariantId as normalizeId, formatMoneyTemplate } from './helpers';

function isDiscountedItem(item) {
  return (item.properties && item.properties['_freebie'] === 'true') ||
    (item.properties && item.properties['_cartmax_claim'] === 'true');
}

// cartx's own discounts ("cartx free gift" / "cartx volume discount") are the
// REWARD, not a reduction in qualifying spend, so they must not lower a
// threshold. Any OTHER discount (e.g. a merchant Buy X Get Y) reduces what the
// customer pays and SHOULD count. Mirror of helpers.server.js.
var CARTX_DISCOUNT_TITLES = ['cartx free gift', 'cartx volume discount'];

function externalDiscountCents(item) {
  var allocs = item.line_level_discount_allocations || [];
  var cents = 0;
  for (var i = 0; i < allocs.length; i++) {
    var app = allocs[i].discount_application || {};
    var title = String(app.title || allocs[i].title || '').toLowerCase();
    if (CARTX_DISCOUNT_TITLES.indexOf(title) === -1) cents += (allocs[i].amount || 0);
  }
  return cents;
}

function adjustedTotal(items) {
  var cents = 0;
  for (var i = 0; i < items.length; i++) {
    if (isDiscountedItem(items[i])) continue;
    var gross = items[i].original_line_price || items[i].line_price || 0;
    cents += Math.max(0, gross - externalDiscountCents(items[i]));
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

function normalizeTag(t) {
  return String(t).trim().toLowerCase();
}

// Client mirror of customerMatchesTags from helpers.server.js.
// Keeps optimistic local eval in sync with server filtering, otherwise
// an offer can flash on screen before the server response removes it.
function customerMatchesTags(rule, customer) {
  var target = rule && rule.customer_tags;
  if (!target) return true;
  var required = (target.required_any || []).map(normalizeTag).filter(Boolean);
  var excluded = (target.excluded || []).map(normalizeTag).filter(Boolean);
  var tags = ((customer && customer.tags) || []).map(normalizeTag);
  if (excluded.length) {
    for (var i = 0; i < excluded.length; i++) {
      if (tags.indexOf(excluded[i]) !== -1) return false;
    }
  }
  if (required.length) {
    var matched = false;
    for (var j = 0; j < required.length; j++) {
      if (tags.indexOf(required[j]) !== -1) { matched = true; break; }
    }
    if (!matched) return false;
  }
  return true;
}

function evaluateTrigger(offer, cart, adjTotal, adjQty) {
  // Product-presence trigger — fires when any source variant is in the cart
  // (e.g. a product-page gift with an empty `trigger: {}`). Mirrors the server
  // (triggers.server.js); without this the local AJAX-cart reconcile can never
  // add such a gift, since it drives gift add/remove from local eval, not the
  // server's to_add.
  if (offer.source && offer.source.type === 'product') {
    // Compare as strings: `product_variant_ids` are gids that normalize to a
    // numeric STRING, but a /cart.js line's `variant_id` is a NUMBER that
    // normalizeVariantId leaves untouched — so `indexOf` (strict ===) never
    // matches without coercing both sides. (The server's normalizeId does
    // String(id); mirror that here.) Getting this wrong makes the offer read as
    // "not triggered" locally, which yanks the just-added gift back out.
    var ids = (offer.source.product_variant_ids || []).map(function (v) {
      return String(normalizeId(v));
    });
    return (cart.items || []).some(function (li) {
      return ids.indexOf(String(normalizeId(li.variant_id))) !== -1;
    });
  }
  var t = offer.trigger || {};
  var priceMet = t.price_threshold && adjTotal >= t.price_threshold;
  var qtyMet = t.quantity_threshold && adjQty >= t.quantity_threshold;
  return priceMet || qtyMet;
}

export function evaluateOffers(offers, cart, adjTotal, adjQty, page, customer) {
  var toAdd = [];
  var toRemove = [];
  var triggeredIds = {};
  // Per-offer set of the variants it CURRENTLY grants (normalized to a numeric
  // string). Populated only for triggered auto-gift offers. The removal pass
  // keeps a gift line only if it appears here under its own offer id — so a
  // line survives ONLY while its offer still lists that exact variant.
  var triggeredGiftVids = {};

  for (var i = 0; i < offers.length; i++) {
    var offer = offers[i];
    if (!pageMatch(offer.page_handles, page)) continue;
    if (!customerMatchesTags(offer, customer)) continue;

    var triggered = evaluateTrigger(offer, cart, adjTotal, adjQty);
    if (triggered) {
      triggeredIds[offer.id] = true;
      if (offer.reward && offer.reward.type === 'auto_add_gift') {
        // Record the exact variants this offer grants right now. `gift_variants`
        // are gids → normalize to a numeric STRING; a /cart.js line's variant_id
        // is a NUMBER that normalizeId leaves untouched, so both sides must be
        // String()'d to compare (same coercion the product-presence trigger uses).
        var grantSet = {};
        var grantList = offer.reward.gift_variants || [];
        for (var gvi = 0; gvi < grantList.length; gvi++) {
          grantSet[String(normalizeId(grantList[gvi]))] = true;
        }
        triggeredGiftVids[offer.id] = grantSet;
      }
      if (offer.reward && offer.reward.type === 'auto_add_gift' && offer.reward.add_mode === 'auto') {
        var giftVids = offer.reward.gift_variants || [];
        for (var g = 0; g < giftVids.length; g++) {
          // String()-coerce both sides: gift_variants are gids (→ numeric string)
          // and a /cart.js line's variant_id is a number, so a bare === never
          // matches — which made a present gift look absent and get re-added.
          var vid = String(normalizeId(giftVids[g]));
          var alreadyIn = (cart.items || []).some(function (li) {
            return String(normalizeId(li.variant_id)) === vid &&
              li.properties && li.properties['_offer_id'] === offer.id;
          });
          if (!alreadyIn) {
            // Attach the gift's display data (cached in the offer config) so the
            // drawer can render an optimistic gift line instantly, with the real
            // title/image, before the server add lands.
            var gdata = (offer.reward.gift_variant_data || []).find(function (d) {
              return String(normalizeId(d.variant_id)) === vid;
            }) || {};
            toAdd.push({
              variant_id: giftVids[g],
              quantity: offer.reward.quantity_per_variant || 1,
              properties: { _freebie: 'true', _offer_id: offer.id },
              title: gdata.title || '',
              image: gdata.image || '',
            });
          }
        }
      }
    }
  }

  // Remove gift lines that no longer belong to a currently-granting offer.
  // A cartx auto-gift line is KEPT only when its offer is triggered on this eval
  // AND that offer still lists the line's variant in gift_variants. This drops:
  //   - gifts whose offer is gone / disabled / below threshold (not triggered), and
  //   - stale gifts from a *recycled or edited* offer id that now grants different
  //     products (e.g. "Free Gift ₹999" reused as the Mystery Box offer) — the old
  //     lines share the offer id but not the current variant.
  // Guard: when the cached config has NO offers (e.g. a mis-resolved / empty theme
  // config), never strip — cartx isn't authoritative here and a blanket removal
  // would wipe legitimate gifts. Mirrors evaluateClaimRemovals' cold-cache guard.
  if (offers.length > 0) {
    for (var j = 0; j < (cart.items || []).length; j++) {
      var item = cart.items[j];
      if (!item.properties || item.properties['_freebie'] !== 'true') continue;
      if (item.properties['_claimed'] === 'true') continue; // claim gifts handled elsewhere
      var offerId = item.properties['_offer_id'];
      if (!offerId) continue; // not a cartx-owned gift line — leave it alone
      var granted = triggeredGiftVids[offerId];
      var keep = !!(triggeredIds[offerId] && granted &&
        granted[String(normalizeId(item.variant_id))]);
      if (!keep) toRemove.push(item.key);
    }
  }

  return { to_add: toAdd, to_remove: toRemove };
}

// Claimed gifts to pull from the cart. A claimed line is removed when EITHER:
//   - its claim offer is still enabled but the cart dropped below its threshold, OR
//   - its claim offer is gone from the config (disabled/deleted) → orphaned. This
//     is the AJAX-store case the server can't fix: soulflower disabled its
//     "Choose your gifts" claim, but the AJAX drawer ignores the server's
//     to_remove, so a stale claimed line (e.g. a coconut-oil gift from a retired
//     promo) strands in the cart across refreshes.
// `configPopulated` guards the orphan branch: only strip when the cached config
// actually has offers or claim gifts. A cold / empty / mis-resolved config must
// never mass-strip claimed gifts (mirrors the auto-gift empty-config guard).
// The enabled cache only holds ENABLED claims, so "id not found" == the offer is
// disabled/deleted — a genuine orphan, not a cross-page miss (claim cache isn't
// page-filtered).
export function evaluateClaimRemovals(claimGifts, items, adjTotal, adjQty, configPopulated) {
  var removals = [];
  var rules = claimGifts || [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var p = item.properties;
    if (!p) continue;
    if (p['_claimed'] !== 'true' && p['_cartmax_claim'] !== 'true') continue;
    var claimId = p['_offer_id'];
    if (!claimId) continue;
    var rule = null;
    for (var r = 0; r < rules.length; r++) {
      if (rules[r].id === claimId) { rule = rules[r]; break; }
    }
    if (rule && rule.trigger) {
      // Enabled claim offer still present → pull only if now below its threshold.
      var currentValue = rule.trigger.type === 'price' ? adjTotal : adjQty;
      if (currentValue < rule.trigger.threshold) removals.push(item.key);
    } else if (configPopulated) {
      // No matching enabled claim offer in a real (populated) config → orphaned.
      removals.push(item.key);
    }
  }
  return removals;
}

// ── Build progress bar (simplified client-side) ───────────

function buildBar(config, adjTotal, adjQty, page, moneyFormat, customer) {
  if (!config.progress_bar || !config.progress_bar.enabled) return null;

  var entries = [];

  // Collect from offers
  for (var i = 0; i < (config.offers || []).length; i++) {
    var offer = config.offers[i];
    if (!offer.bar || !offer.bar.show) continue;
    if (!pageMatch(offer.page_handles, page)) continue;
    if (!customerMatchesTags(offer, customer)) continue;
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
        var formatted = formatMoneyTemplate(moneyFormat, remaining);
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

export function localEvaluate(cachedConfig, cart, customer) {
  if (!cachedConfig || !cart) return null;

  var items = cart.items || [];
  var adjTotal = adjustedTotal(items);
  var adjQty = adjustedQty(items);
  var page = window.location.pathname;

  var cfgOffers = cachedConfig.offers || [];
  var cfgClaims = cachedConfig.claim_gifts || [];
  // Config is "populated" (a real, resolved config) when it carries any offers
  // or claim gifts — used to gate orphaned-claim removal against an empty/
  // mis-resolved config, exactly as evaluateOffers gates freebie removal.
  var configPopulated = cfgOffers.length > 0 || cfgClaims.length > 0;

  var offerResult = evaluateOffers(cfgOffers, cart, adjTotal, adjQty, page, customer);
  var claimRemovals = evaluateClaimRemovals(cfgClaims, items, adjTotal, adjQty, configPopulated);
  if (claimRemovals.length) {
    offerResult.to_remove = (offerResult.to_remove || []).concat(claimRemovals);
  }
  var bar = buildBar(cachedConfig, adjTotal, adjQty, page, cachedConfig.money_format || '', customer);

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
