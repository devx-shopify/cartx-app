import { createHmac, timingSafeEqual } from "crypto";
import { EvaluateCartRequestSchema } from "../lib/schemas.js";
import { checkRateLimit } from "../lib/rate-limit.server.js";
import { loadConfig } from "../lib/config.server.js";
import { adjustedTotal, adjustedQty, isFrozenPage, computeTotalSavings } from "../lib/helpers.server.js";
import { evaluateOffers } from "../lib/evaluate/triggers.server.js";
import { buildBar, getRibbonFromBar } from "../lib/evaluate/bar.server.js";
import { resolveAvailableCoupons } from "../lib/evaluate/coupons.server.js";
import { resolveClaimGifts } from "../lib/evaluate/claims.server.js";

function verifyProxyHmac(requestUrl) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const params = new URL(requestUrl).searchParams;
  const signature = params.get("signature");
  if (!signature) return false;

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key !== "signature") {
      pairs.push(`${key}=${value}`);
    }
  }
  pairs.sort();
  const message = pairs.join("");
  const computed = createHmac("sha256", secret).update(message).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// GET — Shopify proxy health check
export const loader = async () => {
  return new Response("OK", { status: 200 });
};

export const action = async ({ request }) => {
  if (!verifyProxyHmac(request.url)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // shop comes from Shopify-signed query param — trust it
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shop") || body.shop_id;

  if (shopId) {
    const rateResult = checkRateLimit(shopId);
    if (!rateResult.allowed) {
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  }
  const themeId = body.theme_id;

  if (!shopId || !themeId) {
    return Response.json({ error: "Missing shop or theme_id" }, { status: 400 });
  }

  const parsed = EvaluateCartRequestSchema.safeParse({
    ...body,
    shop_id: shopId,
    theme_id: String(themeId),
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cart, page, customer, money_format: moneyFormat } = parsed.data;

  if (isFrozenPage(page)) {
    return Response.json({
      frozen: true,
      to_add: [],
      to_remove: [],
      offer_displays: [],
      bar: null,
      ribbon_message: null,
      oos_message: null,
      applied_coupons: [],
      available_coupons: [],
      claim_gifts: null,
      upsells: null,
      total_savings: 0,
    });
  }

  let config;
  try {
    config = await loadConfig(shopId, themeId);
  } catch (err) {
    console.error('[cartx] loadConfig error:', err);
    return Response.json({ error: "Config load failed" }, { status: 500 });
  }

  const cartItems = cart.items || [];
  const adjTotal = adjustedTotal(cartItems);
  const adjQty = adjustedQty(cartItems);

  let offerResult, bar, ribbon_message, availableCoupons, claimGifts;
  try {
    offerResult = evaluateOffers(config.offers || [], cart, adjTotal, adjQty, page, customer);
    bar = buildBar(config, page, customer, adjTotal, adjQty, moneyFormat);
    ({ ribbon_message } = getRibbonFromBar(bar));
    availableCoupons = resolveAvailableCoupons(config.coupons || [], cart, page, customer);
    claimGifts = resolveClaimGifts(config.claim_gifts || [], cart, adjTotal, adjQty, page, customer);
  } catch (err) {
    console.error('[cartx] Evaluate pipeline error:', err);
    return Response.json({ error: "Evaluation failed", message: err.message }, { status: 500 });
  }

  // Remove claimed items whose threshold is no longer met
  const claimRemovals = [];
  for (const item of cartItems) {
    if (
      item.properties?.['_claimed'] !== 'true' &&
      item.properties?.['_cartmax_claim'] !== 'true'
    ) continue;
    const claimId = item.properties?.['_offer_id'];
    if (!claimId) continue;
    const rule = (config.claim_gifts || []).find((g) => g.id === claimId && g.enabled);
    if (!rule) {
      claimRemovals.push(item.key);
      continue;
    }
    const currentValue = rule.trigger.type === 'price' ? adjTotal : adjQty;
    if (currentValue < rule.trigger.threshold) {
      claimRemovals.push(item.key);
    }
  }

  const oosMessage =
    config.bottom_ribbon.enabled
      ? config.bottom_ribbon.oos_message_override || null
      : null;

  const totalSavings = computeTotalSavings(cart);

  // Build lightweight config for client-side caching
  const clientConfig = {
    offers: (config.offers || []).filter((o) => o.enabled).map((o) => ({
      id: o.id,
      trigger: o.trigger,
      reward: { type: o.reward.type, gift_variants: o.reward.gift_variants, quantity_per_variant: o.reward.quantity_per_variant, add_mode: o.reward.add_mode },
      page_handles: o.page_handles,
      audience: o.audience,
      bar: o.bar,
    })),
    progress_bar: config.progress_bar,
    money_format: moneyFormat || '',
  };

  return Response.json({
    frozen: false,
    to_add: offerResult.to_add,
    to_remove: [...(offerResult.to_remove || []), ...claimRemovals],
    offer_displays: offerResult.to_display || [],
    bar,
    ribbon_message,
    oos_message: oosMessage,
    available_coupons: availableCoupons,
    claim_gifts: claimGifts,
    total_savings: totalSavings,
    volume_discounts: offerResult.volume_discounts || [],
    _config: clientConfig,
    drawer: config.drawer,
    upsells: config.upsells?.enabled ? {
      enabled: true,
      heading: config.upsells.heading,
      show_on_empty_cart: config.upsells.show_on_empty_cart || false,
      products: (config.upsells.products || []).filter((p) => {
        const pid = p.product_id?.startsWith('gid://') ? p.product_id.split('/').pop() : String(p.product_id);
        return !cartItems.some((item) => {
          const itemPid = String(item.product_id).startsWith('gid://') ? String(item.product_id).split('/').pop() : String(item.product_id);
          return itemPid === pid;
        });
      }),
    } : null,
  });
};
