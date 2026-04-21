import { useNavigate, useFetcher, useSearchParams } from "react-router";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
} from "../lib/config.server.js";
import { generateId } from "../lib/helpers.server.js";
import { fetchVariantData, enrichVariantData } from "../lib/graphql.server.js";
import OfferForm from "../components/OfferForm.jsx";
import CouponForm from "../components/CouponForm.jsx";
import ClaimGiftForm from "../components/ClaimGiftForm.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();
  const type = body._type;
  delete body._type;

  if (type === "offer") {
    config.offers.push({ id: generateId(), ...body });
  } else if (type === "coupon") {
    config.coupons.push({ id: generateId(), ...body });
  } else if (type === "claim-gift") {
    const variantDataMap = await fetchVariantData(
      admin,
      body.claimable_variants || []
    );
    body.claimable_variant_data = enrichVariantData(
      body.claimable_variants || [],
      variantDataMap
    );
    config.claim_gifts.push({ id: generateId(), ...body });
  }

  await saveConfig(shopId, themeId, config);
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

  useEffect(() => {
    if (fetcher.data?.ok) {
      const labels = {
        offer: "Offer created",
        coupon: "Coupon created",
        "claim-gift": "Claim gift created",
      };
      shopify.toast.show(labels[type] || "Created");
      navigate("/app/promotions");
    }
  }, [fetcher.data, navigate, shopify, type]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify({ ...data, _type: type }), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page
      heading={TYPE_LABELS[type] || "Create promotion"}
      backAction={{ url: "/app/promotions" }}
    >
      {/* Type selector */}
      <s-section heading="Promotion type">
        <s-stack direction="inline" gap="tight">
          <s-chip
            label="Offer"
            selected={type === "offer"}
            onClick={() => setSearchParams({ type: "offer" })}
          />
          <s-chip
            label="Coupon"
            selected={type === "coupon"}
            onClick={() => setSearchParams({ type: "coupon" })}
          />
          <s-chip
            label="Claim Gift"
            selected={type === "claim-gift"}
            onClick={() => setSearchParams({ type: "claim-gift" })}
          />
        </s-stack>
      </s-section>

      {type === "offer" && (
        <OfferForm onSubmit={handleSubmit} submitting={submitting} />
      )}
      {type === "coupon" && (
        <CouponForm onSubmit={handleSubmit} submitting={submitting} />
      )}
      {type === "claim-gift" && (
        <ClaimGiftForm onSubmit={handleSubmit} submitting={submitting} />
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
