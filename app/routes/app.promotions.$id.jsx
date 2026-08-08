import { useLoaderData, useOutletContext } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { fetchVariantData, enrichVariantData } from "../lib/graphql.server.js";
import {
  migrateLegacyDiscountRules,
  syncDiscounts,
} from "../lib/discount.server.js";
import {
  getActivePlan,
  offerRewardPolicyError,
  offerCapPolicyError,
  countActiveOffers,
} from "../lib/billing.server.js";
import { usePromotionForm } from "../hooks/usePromotionForm.js";
import OfferForm from "../components/OfferForm.jsx";
import CouponForm from "../components/CouponForm.jsx";
import ClaimGiftForm from "../components/ClaimGiftForm.jsx";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const offer = config.offers.find((o) => o.id === params.id);
  if (offer) {
    const allVariantIds = [
      ...(offer.source?.product_variant_ids || []),
      ...(offer.reward?.gift_variants || []),
      ...(offer.reward?.bundle_variants || []),
    ];
    const variantDataMap = await fetchVariantData(admin, allVariantIds);
    return { type: "offer", data: offer, variantDataMap };
  }

  const coupon = config.coupons.find((c) => c.id === params.id);
  if (coupon) return { type: "coupon", data: coupon, variantDataMap: {} };

  const claimGift = config.claim_gifts.find((g) => g.id === params.id);
  if (claimGift) {
    const variantDataMap = await fetchVariantData(admin, claimGift.claimable_variants || []);
    return { type: "claim-gift", data: claimGift, variantDataMap };
  }

  throw new Response("Promotion not found", { status: 404 });
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  await migrateLegacyDiscountRules(config, session.shop);
  const body = await request.json();
  const type = body._type;
  delete body._type;

  // Plan policy (Basic only; other plans unrestricted). Guard reward-type switches
  // and the active-offer cap when this edit enables an offer.
  const planData = await getActivePlan(admin, session.shop);
  if (type === "offer") {
    const rewardErr = offerRewardPolicyError(planData, body.reward?.type);
    if (rewardErr) return rewardErr;
  }
  const beforeActive = countActiveOffers(config);

  if (type === "offer") {
    const idx = config.offers.findIndex((o) => o.id === params.id);
    if (idx === -1) throw new Response("Offer not found", { status: 404 });
    if (body.reward?.type === "auto_add_gift") {
      const vids = body.reward.gift_variants || [];
      const variantDataMap = await fetchVariantData(admin, vids);
      body.reward.gift_variant_data = enrichVariantData(vids, variantDataMap);
    }
    config.offers[idx] = { ...config.offers[idx], ...body, id: params.id };
  } else if (type === "coupon") {
    const idx = config.coupons.findIndex((c) => c.id === params.id);
    if (idx === -1) throw new Response("Coupon not found", { status: 404 });
    config.coupons[idx] = { ...config.coupons[idx], ...body, id: params.id };
  } else if (type === "claim-gift") {
    const idx = config.claim_gifts.findIndex((g) => g.id === params.id);
    if (idx === -1) throw new Response("Claim gift not found", { status: 404 });
    const variantDataMap = await fetchVariantData(admin, body.claimable_variants || []);
    body.claimable_variant_data = enrichVariantData(body.claimable_variants || [], variantDataMap);
    config.claim_gifts[idx] = { ...config.claim_gifts[idx], ...body, id: params.id };
  }

  const capErr = offerCapPolicyError(planData, beforeActive, countActiveOffers(config));
  if (capErr) return capErr;

  await saveConfig(shopId, themeId, config);

  // Discount syncs are secondary effects — never let one crash the save.
  const warnings = await syncDiscounts(admin, session.shop, config, type);

  return { ok: true, warnings };
};

const TYPE_HEADINGS = {
  offer: "Edit offer",
  coupon: "Edit coupon",
  "claim-gift": "Edit claim gift",
};

const SUCCESS_LABELS = {
  offer: "Offer updated",
  coupon: "Coupon updated",
  "claim-gift": "Claim gift updated",
};

export default function EditPromotion() {
  const { type, data, variantDataMap } = useLoaderData();
  const { planData } = useOutletContext();
  const { formRef, submitting, handleSubmit, handleSave, handleDiscard } = usePromotionForm({ type, successLabels: SUCCESS_LABELS });

  return (
    <s-page heading={TYPE_HEADINGS[type] || "Edit promotion"} backAction={{ url: "/app/promotions" }}>
      <ui-save-bar id="promotion-save-bar">
        <button variant="primary" id="save-action" onClick={handleSave}></button>
        <button id="discard-action" onClick={handleDiscard}></button>
      </ui-save-bar>

      {type === "offer" && <OfferForm ref={formRef} offer={data} variantDataMap={variantDataMap} onSubmit={handleSubmit} submitting={submitting} allowedRewardTypes={planData?.offerRewardTypes} />}
      {type === "coupon" && <CouponForm ref={formRef} coupon={data} onSubmit={handleSubmit} submitting={submitting} />}
      {type === "claim-gift" && <ClaimGiftForm ref={formRef} claimGift={data} variantDataMap={variantDataMap} onSubmit={handleSubmit} submitting={submitting} />}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
