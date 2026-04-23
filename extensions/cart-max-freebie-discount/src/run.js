// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/** @type {FunctionRunResult} */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

const DEFAULT_RULE = {
  type: "percentage",
  value: 100,
  message: "Free Gift",
  max_cap: null,
};

/**
 * Shopify Product Discount Function for Cart Max free gifts.
 *
 * Reads metafield config for per-offer discount rules.
 * Falls back to 100% off for any line with `_freebie: "true"`.
 *
 * Metafield config shape:
 * {
 *   "rules": [
 *     { "offer_id": "abc", "type": "percentage", "value": 100, "message": "Free Gift", "max_cap": null },
 *     { "offer_id": "def", "type": "fixed_amount", "value": 5.00, "message": "$5 off", "max_cap": null },
 *     { "offer_id": "ghi", "type": "fixed_price", "value": 1.99, "message": "Gift for $1.99", "max_cap": null }
 *   ],
 *   "default_rule": { "type": "percentage", "value": 100, "message": "Free Gift", "max_cap": null }
 * }
 *
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const configRaw = input?.discountNode?.metafield?.value ?? "{}";
  const config = JSON.parse(configRaw);
  const defaultRule = config.default_rule ?? DEFAULT_RULE;

  /** @type {Record<string, any>} */
  const rulesMap = {};
  if (Array.isArray(config.rules)) {
    for (const rule of config.rules) {
      if (rule.offer_id) rulesMap[rule.offer_id] = rule;
    }
  }

  const discounts = [];

  // Collect targets grouped by rule key (for percentage / fixed_amount)
  /** @type {Map<string, { rule: any, targets: any[] }>} */
  const groups = new Map();

  for (const line of input.cart.lines) {
    if (line.attribute?.value !== "true") continue;
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const variantId = line.merchandise.id;
    const offerId = line.offerIdAttr?.value ?? "";
    const rule = rulesMap[offerId] ?? defaultRule;
    const linePrice = parseFloat(line.cost.amountPerQuantity.amount);

    if (rule.type === "fixed_price") {
      // fixed_price: customer pays rule.value, discount = price - value (per item)
      const discountPerItem = linePrice - rule.value;
      if (discountPerItem <= 0) continue;

      const cappedAmount =
        rule.max_cap != null
          ? Math.min(discountPerItem, rule.max_cap)
          : discountPerItem;

      discounts.push({
        message: rule.message || "Free Gift",
        value: { fixedAmount: { amount: String(cappedAmount) } },
        targets: [{ productVariant: { id: variantId, quantity: line.quantity } }],
      });
    } else {
      // Group percentage and fixed_amount rules together
      const groupKey = `${rule.type}|${rule.value}|${rule.message ?? ""}|${rule.max_cap ?? ""}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { rule, targets: [] });
      }
      groups
        .get(groupKey)
        .targets.push({ productVariant: { id: variantId, quantity: line.quantity } });
    }
  }

  // Build grouped discounts
  for (const [, { rule, targets }] of groups) {
    if (targets.length === 0) continue;

    const message = rule.message || "Free Gift";

    if (rule.type === "fixed_amount") {
      let amount = rule.value;
      if (rule.max_cap != null) amount = Math.min(amount, rule.max_cap);

      discounts.push({
        message,
        value: { fixedAmount: { amount: String(amount) } },
        targets,
      });
    } else {
      // percentage (default)
      const pct = Math.min(rule.value ?? 100, 100);
      discounts.push({
        message,
        value: { percentage: { value: String(pct) } },
        targets,
      });
    }
  }

  if (discounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.First,
    discounts,
  };
}
