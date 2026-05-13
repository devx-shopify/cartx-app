import { useNavigate, useFetcher, useSearchParams } from "react-router";
import { useEffect, useRef, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
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
import { syncClaimRulesToFunction } from "../lib/discount.server.js";
import { syncVolumeDiscountConfig } from "../lib/volume-discount.server.js";
import { markStep } from "../lib/onboarding.server.js";
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
  const body = await request.json();
  const type = body._type;
  delete body._type;

  if (type === "offer") {
    config.offers.push({ id: generateId(), ...body });
  } else if (type === "coupon") {
    config.coupons.push({ id: generateId(), ...body });
  } else if (type === "claim-gift") {
    const variantDataMap = await fetchVariantData(admin, body.claimable_variants || []);
    body.claimable_variant_data = enrichVariantData(body.claimable_variants || [], variantDataMap);
    config.claim_gifts.push({ id: generateId(), ...body });
  }

  await saveConfig(shopId, themeId, config);

  // Sync claim rules to discount function if a claim gift was created
  if (type === "claim-gift") {
    await syncClaimRulesToFunction(admin, session.shop, config.claim_gifts);
  }

  // Sync volume discount config if an offer was created
  if (type === "offer") {
    await syncVolumeDiscountConfig(admin, session.shop, config.offers);
  }

  // Mark onboarding step
  await markStep(session.shop, "offer_created");

  return { ok: true };
};

const TYPE_LABELS = {
  offer: "Create offer",
  coupon: "Create coupon",
  "claim-gift": "Create claim gift",
};

export default function NewPromotion() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") || "offer";
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";
  const formRef = useRef(null);

  const handleSave = useCallback(() => {
    formRef.current?.submit();
  }, []);

  const handleDiscard = useCallback(() => {
    document.getElementById("promotion-save-bar")?.hide();
    navigate("/app/promotions");
  }, [navigate]);

  // Show/hide save bar
  useEffect(() => {
    const saveBar = document.getElementById("promotion-save-bar");
    saveBar?.show();
    return () => saveBar?.hide();
  }, []);

  // Wire up save bar button events
  useEffect(() => {
    const saveBtn = document.getElementById("save-action");
    const discardBtn = document.getElementById("discard-action");
    saveBtn?.addEventListener("click", handleSave);
    discardBtn?.addEventListener("click", handleDiscard);
    return () => {
      saveBtn?.removeEventListener("click", handleSave);
      discardBtn?.removeEventListener("click", handleDiscard);
    };
  }, [handleSave, handleDiscard]);

  // Sync loading state to save button
  useEffect(() => {
    const saveBtn = document.getElementById("save-action");
    if (!saveBtn) return;
    if (submitting) {
      saveBtn.setAttribute("loading", "");
      saveBtn.setAttribute("disabled", "");
    } else {
      saveBtn.removeAttribute("loading");
      saveBtn.removeAttribute("disabled");
    }
  }, [submitting]);

  useEffect(() => {
    if (fetcher.data?.ok) {
      document.getElementById("promotion-save-bar")?.hide();
      const labels = { offer: "Offer created", coupon: "Coupon created", "claim-gift": "Claim gift created" };
      shopify.toast.show(labels[type] || "Created");
      navigate("/app/promotions");
    }
  }, [fetcher.data, navigate, shopify, type]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify({ ...data, _type: type }), { method: "POST", encType: "application/json" });
  }

  return (
    <s-page heading={TYPE_LABELS[type] || "Create promotion"} backAction={{ url: "/app/promotions" }}>
      <ui-save-bar id="promotion-save-bar">
        <button variant="primary" id="save-action"></button>
        <button id="discard-action"></button>
      </ui-save-bar>

      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
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
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
