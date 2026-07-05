import { useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { generateId } from "../lib/helpers.server.js";
import { fetchVariantData, enrichVariantData } from "../lib/graphql.server.js";
import {
  migrateLegacyDiscountRules,
  syncDiscounts,
} from "../lib/discount.server.js";
import { markStep } from "../lib/onboarding.server.js";
import { usePromotionForm } from "../hooks/usePromotionForm.js";
import OfferForm from "../components/OfferForm.jsx";
import CouponForm from "../components/CouponForm.jsx";
import ClaimGiftForm from "../components/ClaimGiftForm.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  await migrateLegacyDiscountRules(config, session.shop);
  const body = await request.json();
  const type = body._type;
  delete body._type;

  if (type === "offer") {
    // Enrich gift variants (title + image) so the drawer can render the gift
    // instantly — the "Show offer card" cards AND the auto-added gift line
    // (optimistic add) — without an extra storefront fetch.
    if (body.reward?.type === "auto_add_gift") {
      const vids = body.reward.gift_variants || [];
      const variantDataMap = await fetchVariantData(admin, vids);
      body.reward.gift_variant_data = enrichVariantData(vids, variantDataMap);
    }
    config.offers.push({ id: generateId(), ...body });
  } else if (type === "coupon") {
    config.coupons.push({ id: generateId(), ...body });
  } else if (type === "claim-gift") {
    const variantDataMap = await fetchVariantData(admin, body.claimable_variants || []);
    body.claimable_variant_data = enrichVariantData(body.claimable_variants || [], variantDataMap);
    config.claim_gifts.push({ id: generateId(), ...body });
  }

  await saveConfig(shopId, themeId, config);

  // Discount syncs are secondary effects — the promotion is already saved. A
  // Shopify API hiccup here must not crash the save; surface it as a warning.
  const warnings = await syncDiscounts(admin, session.shop, config, type);

  // Mark onboarding step
  await markStep(session.shop, "offer_created");

  return { ok: true, warnings };
};

const TYPE_LABELS = {
  offer: "Create offer",
  coupon: "Create coupon",
  "claim-gift": "Create claim gift",
};

const SUCCESS_LABELS = {
  offer: "Offer created",
  coupon: "Coupon created",
  "claim-gift": "Claim gift created",
};

export default function NewPromotion() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") || "offer";
  const { formRef, submitting, handleSubmit, handleSave, handleDiscard } = usePromotionForm({ type, successLabels: SUCCESS_LABELS });

  return (
    <s-page heading={TYPE_LABELS[type] || "Create promotion"} backAction={{ url: "/app/promotions" }}>
      <ui-save-bar id="promotion-save-bar">
        <button variant="primary" id="save-action" onClick={handleSave}></button>
        <button id="discard-action" onClick={handleDiscard}></button>
      </ui-save-bar>

      {/* Type selector */}
      <s-section heading="Promotion type">
        <s-select
          label="What kind of promotion do you want to create?"
          value={type}
          onChange={(e) => setSearchParams({ type: e.target.value })}
        >
          <s-option value="offer">Offer — auto-add free gifts or bundles</s-option>
          <s-option value="coupon">Coupon — link a Shopify discount code</s-option>
          <s-option value="claim-gift">Claim Gift — let customers pick a freebie</s-option>
        </s-select>
      </s-section>

      {type === "offer" && <OfferForm ref={formRef} onSubmit={handleSubmit} submitting={submitting} />}
      {type === "coupon" && <CouponForm ref={formRef} onSubmit={handleSubmit} submitting={submitting} />}
      {type === "claim-gift" && <ClaimGiftForm ref={formRef} onSubmit={handleSubmit} submitting={submitting} />}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
