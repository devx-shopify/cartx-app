import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * cartx Volume Discount Function
 *
 * Config (from metafield):
 * {
 *   "offers": [{
 *     "offer_id": "vol-1",
 *     "variant_ids": ["123", "456"],
 *     "discount_mode": "fixed_total" | "percentage",
 *     "tiers": [{ "quantity": 3, "value": 999 }, ...],
 *     "message": "Volume Deal"
 *   }]
 * }
 *
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  if (!input.discount.discountClasses.includes(DiscountClass.Product)) {
    return { operations: [] };
  }

  const configRaw = input.discount?.metafield?.value;
  if (!configRaw) return { operations: [] };

  let config;
  try {
    config = JSON.parse(configRaw);
  } catch {
    return { operations: [] };
  }

  const offers = config.offers || [];
  if (offers.length === 0) return { operations: [] };

  const candidates = [];

  for (const offer of offers) {
    const variantIds = (offer.variant_ids || []).map(normalizeId);
    const tiers = (offer.tiers || []).slice().sort((a, b) => b.quantity - a.quantity);
    if (tiers.length === 0) continue;

    // Find qualifying lines
    const qualifyingLines = [];
    let totalQty = 0;
    let totalPrice = 0;

    for (const line of input.cart.lines) {
      if (line.merchandise.__typename !== 'ProductVariant') continue;
      // Skip freebie/gift items
      if (line.freebieAttr?.value === 'true') continue;
      const vid = normalizeId(line.merchandise.id);

      // If variant_ids specified, only count matching. If empty, count all.
      if (variantIds.length > 0 && !variantIds.includes(vid)) continue;

      const unitPrice = parseFloat(line.cost.amountPerQuantity.amount);
      const lineTotal = parseFloat(line.cost.subtotalAmount.amount);

      qualifyingLines.push({ id: line.id, quantity: line.quantity, unitPrice, lineTotal });
      totalQty += line.quantity;
      totalPrice += lineTotal;
    }

    // Find active tier (highest quantity that's met)
    const activeTier = tiers.find((t) => totalQty >= t.quantity);
    if (!activeTier) continue;

    const tierQty = activeTier.quantity;
    const message = offer.message || 'Volume Deal';

    // Cap eligible quantity per line to tierQty total.
    // Only tierQty items get the discount; extras stay at original price.
    let remaining = tierQty;
    let eligibleTotal = 0;
    const eligibleLines = [];

    for (const line of qualifyingLines) {
      if (remaining <= 0) break;
      const eligible = Math.min(line.quantity, remaining);
      const eligibleAmount = eligible * line.unitPrice;
      eligibleLines.push({ id: line.id, eligible, eligibleAmount });
      eligibleTotal += eligibleAmount;
      remaining -= eligible;
    }

    if (offer.discount_mode === 'percentage') {
      // Percentage — only discount tierQty items, convert to fixed amounts
      const pct = Math.min(activeTier.value, 100);
      const totalDiscount = eligibleTotal * (pct / 100);

      for (const line of eligibleLines) {
        const lineShare = eligibleTotal > 0 ? (line.eligibleAmount / eligibleTotal) * totalDiscount : 0;
        if (lineShare <= 0) continue;

        candidates.push({
          message,
          targets: [{ cartLine: { id: line.id } }],
          value: { fixedAmount: { amount: lineShare.toFixed(2) } },
        });
      }
    } else {
      // fixed_total — distribute discount proportionally across eligible lines only
      const targetTotal = activeTier.value;
      if (targetTotal >= eligibleTotal) continue;

      const totalDiscount = eligibleTotal - targetTotal;

      for (const line of eligibleLines) {
        const lineShare = eligibleTotal > 0 ? (line.eligibleAmount / eligibleTotal) * totalDiscount : 0;
        if (lineShare <= 0) continue;

        candidates.push({
          message,
          targets: [{ cartLine: { id: line.id } }],
          value: { fixedAmount: { amount: lineShare.toFixed(2) } },
        });
      }
    }
  }

  if (candidates.length === 0) return { operations: [] };

  return {
    operations: [{
      productDiscountsAdd: {
        candidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    }],
  };
}

function normalizeId(id) {
  const s = String(id);
  return s.startsWith('gid://') ? s.split('/').pop() : s;
}
