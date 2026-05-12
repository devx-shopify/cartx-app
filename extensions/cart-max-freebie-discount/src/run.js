// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/** @type {FunctionRunResult} */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.All,
  discounts: [],
};

/**
 * Shopify Product Discount Function for cartx.
 *
 * Items with `_freebie: "true"` are discounted. The `_offer_id` determines the rule:
 *   - claim_rules match → use claim_price (customer pays fixed amount)
 *   - GWP rules match → use that rule's type/value
 *   - No match → default_rule (100% off)
 *
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const configRaw = input?.discountNode?.metafield?.value ?? "{}";
  const config = JSON.parse(configRaw);
  const defaultRule = config.default_rule ?? { type: "percentage", value: 100, message: "Free Gift", max_cap: null };

  /** @type {Record<string, any>} */
  const rulesMap = {};
  for (const rule of config.rules ?? []) {
    if (rule.offer_id) rulesMap[rule.offer_id] = rule;
  }

  /** @type {Record<string, any>} */
  const claimRulesMap = {};
  for (const rule of config.claim_rules ?? []) {
    if (rule.offer_id) claimRulesMap[rule.offer_id] = rule;
  }

  /** @type {any[]} */
  const discounts = [];

  // Collect percentage-group targets (same pct + message → one discount entry)
  /** @type {Map<string, { pct: number, message: string, targets: any[] }>} */
  const pctGroups = new Map();

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    if (line.attribute?.value !== "true") continue;

    const variantId = line.merchandise.id;
    const offerId = line.offerIdAttr?.value ?? "";
    const linePrice = parseFloat(line.cost.amountPerQuantity.amount);
    const target = { productVariant: { id: variantId, quantity: line.quantity } };

    // Skip items with no offer_id — prevents tampering via _freebie: "true" alone
    if (!offerId) continue;

    // Check claim_rules first, then GWP rules, then default
    const claimRule = claimRulesMap[offerId];
    if (claimRule) {
      const claimPrice = claimRule.claim_price ?? 0;
      const discount = linePrice - claimPrice;
      if (discount <= 0) continue;
      const msg = claimRule.message || "Claimed Gift";

      // Use fixedAmount for exact pricing (no rounding issues)
      discounts.push({
        message: msg,
        value: { fixedAmount: { amount: String(discount) } },
        targets: [target],
      });
      continue;
    }

    const rule = rulesMap[offerId] ?? defaultRule;

    if (rule.type === "fixed_price") {
      const discount = linePrice - rule.value;
      if (discount <= 0) continue;
      const capped = rule.max_cap != null ? Math.min(discount, rule.max_cap) : discount;
      discounts.push({
        message: rule.message || "Free Gift",
        value: { fixedAmount: { amount: String(capped) } },
        targets: [target],
      });
    } else if (rule.type === "fixed_amount") {
      let amount = rule.value;
      if (rule.max_cap != null) amount = Math.min(amount, rule.max_cap);
      discounts.push({
        message: rule.message || "Free Gift",
        value: { fixedAmount: { amount: String(amount) } },
        targets: [target],
      });
    } else {
      // percentage — group same pct+message together
      const pct = Math.min(rule.value ?? 100, 100);
      const msg = rule.message || "Free Gift";
      const key = pct + "|" + msg;
      if (!pctGroups.has(key)) {
        pctGroups.set(key, { pct, message: msg, targets: [] });
      }
      /** @type {{ targets: any[] }} */ (pctGroups.get(key)).targets.push(target);
    }
  }

  // Add grouped percentage discounts
  for (const [, group] of pctGroups) {
    discounts.push({
      message: group.message,
      value: { percentage: { value: String(group.pct) } },
      targets: group.targets,
    });
  }

  if (discounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All,
    discounts,
  };
}
