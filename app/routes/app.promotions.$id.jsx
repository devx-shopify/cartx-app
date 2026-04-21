import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
} from "../lib/config.server.js";
import { fetchVariantData, enrichVariantData } from "../lib/graphql.server.js";
import OfferForm from "../components/OfferForm.jsx";
import CouponForm from "../components/CouponForm.jsx";
import ClaimGiftForm from "../components/ClaimGiftForm.jsx";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);

  const offer = config.offers.find((o) => o.id === params.id);
  if (offer) return { type: "offer", data: offer };

  const coupon = config.coupons.find((c) => c.id === params.id);
  if (coupon) return { type: "coupon", data: coupon };

  const claimGift = config.claim_gifts.find((g) => g.id === params.id);
  if (claimGift) return { type: "claim-gift", data: claimGift };

  throw new Response("Promotion not found", { status: 404 });
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
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
    if (idx === -1)
      throw new Response("Claim gift not found", { status: 404 });
    const variantDataMap = await fetchVariantData(
      admin,
      body.claimable_variants || []
    );
    body.claimable_variant_data = enrichVariantData(
      body.claimable_variants || [],
      variantDataMap
    );
    config.claim_gifts[idx] = {
      ...config.claim_gifts[idx],
      ...body,
      id: params.id,
    };
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

const TYPE_HEADINGS = {
  offer: "Edit offer",
  coupon: "Edit coupon",
  "claim-gift": "Edit claim gift",
};

export default function EditPromotion() {
  const { type, data } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      const labels = {
        offer: "Offer updated",
        coupon: "Coupon updated",
        "claim-gift": "Claim gift updated",
      };
      shopify.toast.show(labels[type] || "Updated");
      navigate("/app/promotions");
    }
  }, [fetcher.data, navigate, shopify, type]);

  function handleSubmit(formData) {
    fetcher.submit(JSON.stringify({ ...formData, _type: type }), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page
      heading={TYPE_HEADINGS[type] || "Edit promotion"}
      backAction={{ url: "/app/promotions" }}
    >
      {type === "offer" && (
        <OfferForm
          offer={data}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
      {type === "coupon" && (
        <CouponForm
          coupon={data}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
      {type === "claim-gift" && (
        <ClaimGiftForm
          claimGift={data}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
