import { useNavigate, useFetcher, useSearchParams } from "react-router";
import { useEffect } from "react";
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
      <div className="cx-layout">
        {/* Type selector */}
        <div className="cx-type-selector">
          <button
            className={`cx-type-option ${type === "offer" ? "cx-type-option-active" : ""}`}
            onClick={() => setSearchParams({ type: "offer" })}
          >
            <div className="cx-type-option-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <div className="cx-type-option-label">Offer</div>
          </button>
          <button
            className={`cx-type-option ${type === "coupon" ? "cx-type-option-active" : ""}`}
            onClick={() => setSearchParams({ type: "coupon" })}
          >
            <div className="cx-type-option-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div className="cx-type-option-label">Coupon</div>
          </button>
          <button
            className={`cx-type-option ${type === "claim-gift" ? "cx-type-option-active" : ""}`}
            onClick={() => setSearchParams({ type: "claim-gift" })}
          >
            <div className="cx-type-option-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div className="cx-type-option-label">Claim Gift</div>
          </button>
        </div>
      </div>

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
