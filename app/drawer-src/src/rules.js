// =============================================================
// cartx — Client-Side Rule Evaluation
// Mirrors the server-side triggers + bar logic for instant results.
// Used when config is cached — avoids server roundtrip.
// =============================================================

import { normalizeVariantId as normalizeId, storeMoneyFormat } from './helpers';
import { adjustedTotal, adjustedQty } from '../../lib/upsell-rank.js';
// ^ shared with the server (helpers.server.js re-exports the same functions),
// so qualifying spend is computed identically on both sides.
import { pageMatch, customerMatchesTags, offersPausedOnPage } from '../../lib/page-target.js';
import { buildBar } from '../../lib/progress-bar.js';
// ^ also shared with the server: the instant bar is built by the SAME code as
// the server's, so no milestone pops in when the server result lands.

// ── Evaluate offers (mirrors triggers.server.js) ──────────

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

// `paused`: an "Only this milestone" custom milestone is on this page, so no
// gift is added here. Triggers are still worked out so gifts already in the
// cart are kept (mirrors the server's evaluateOffers).
export function evaluateOffers(offers, cart, adjTotal, adjQty, page, customer, paused) {
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
      if (!paused && offer.reward && offer.reward.type === 'auto_add_gift' && offer.reward.add_mode === 'auto') {
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

  var paused = offersPausedOnPage(cachedConfig, page, customer);
  var offerResult = evaluateOffers(cfgOffers, cart, adjTotal, adjQty, page, customer, paused);
  var claimRemovals = evaluateClaimRemovals(cfgClaims, items, adjTotal, adjQty, configPopulated);
  if (claimRemovals.length) {
    offerResult.to_remove = (offerResult.to_remove || []).concat(claimRemovals);
  }
  var bar = buildBar(cachedConfig, page, adjTotal, adjQty, cachedConfig.money_format || storeMoneyFormat(), customer);

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
