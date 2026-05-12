import { useLoaderData, useNavigate, useFetcher } from "react-router";
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
import { fetchVariantData, enrichVariantData } from "../lib/graphql.server.js";
import { syncClaimRulesToFunction } from "../lib/discount.server.js";
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
  const body = await request.json();
  const type = body._type;
  delete body._type;

  if (type === "offer") {
    const idx = config.offers.findIndex((o) => o.id === params.id);
    if (idx === -1) throw new Response("Offer not found", { status: 404 });
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

  await saveConfig(shopId, themeId, config);

  // Sync claim rules to discount function if a claim gift was updated
  if (type === "claim-gift") {
    await syncClaimRulesToFunction(admin, session.shop, config.claim_gifts);
  }

  return { ok: true };
};

const TYPE_HEADINGS = {
  offer: "Edit offer",
  coupon: "Edit coupon",
  "claim-gift": "Edit claim gift",
};

export default function EditPromotion() {
  const { type, data, variantDataMap } = useLoaderData();
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
      const labels = { offer: "Offer updated", coupon: "Coupon updated", "claim-gift": "Claim gift updated" };
      shopify.toast.show(labels[type] || "Updated");
      navigate("/app/promotions");
    }
  }, [fetcher.data, navigate, shopify, type]);

  function handleSubmit(formData) {
    fetcher.submit(JSON.stringify({ ...formData, _type: type }), { method: "POST", encType: "application/json" });
  }

  return (
    <s-page heading={TYPE_HEADINGS[type] || "Edit promotion"} backAction={{ url: "/app/promotions" }}>
      <ui-save-bar id="promotion-save-bar">
        <button variant="primary" id="save-action"></button>
        <button id="discard-action"></button>
      </ui-save-bar>

      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {type === "offer" && <OfferForm ref={formRef} offer={data} variantDataMap={variantDataMap} onSubmit={handleSubmit} submitting={submitting} />}
        {type === "coupon" && <CouponForm ref={formRef} coupon={data} onSubmit={handleSubmit} submitting={submitting} />}
        {type === "claim-gift" && <ClaimGiftForm ref={formRef} claimGift={data} variantDataMap={variantDataMap} onSubmit={handleSubmit} submitting={submitting} />}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
