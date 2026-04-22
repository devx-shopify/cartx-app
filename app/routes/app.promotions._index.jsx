import { useState } from "react";
import { useLoaderData, useFetcher, Link } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getThemeFromRequest,
} from "../lib/config.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = getThemeFromRequest(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const promotions = [];

  for (const offer of config.offers) {
    promotions.push({
      id: offer.id,
      type: "offer",
      name: offer.name,
      enabled: offer.enabled,
      trigger: triggerSummary(offer),
      pages: offer.page_handles || [],
    });
  }

  for (const coupon of config.coupons) {
    promotions.push({
      id: coupon.id,
      type: "coupon",
      name: coupon.is_automatic ? coupon.title : coupon.code,
      enabled: coupon.enabled,
      trigger: coupon.display_message || coupon.type_label || "Discount",
      pages: coupon.page_handles || [],
    });
  }

  for (const gift of config.claim_gifts) {
    promotions.push({
      id: gift.id,
      type: "claim-gift",
      name: gift.name,
      enabled: gift.enabled,
      trigger: gift.trigger
        ? gift.trigger.type === "price"
          ? `Rs.${gift.trigger.threshold} cart total`
          : `${gift.trigger.threshold} items`
        : "No trigger",
      pages: gift.page_handles || [],
    });
  }

  return { promotions };
};

function triggerSummary(offer) {
  const parts = [];
  if (offer.trigger.price_threshold)
    parts.push(`Rs.${offer.trigger.price_threshold}`);
  if (offer.trigger.quantity_threshold)
    parts.push(`${offer.trigger.quantity_threshold} items`);
  if (parts.length === 0 && offer.source?.type === "product")
    return "Product in cart";
  return parts.join(" or ") || "No threshold";
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = getThemeFromRequest(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();
  const { intent, id, type } = body;

  if (type === "offer") {
    if (intent === "delete") {
      config.offers = config.offers.filter((o) => o.id !== id);
    } else if (intent === "toggle") {
      const offer = config.offers.find((o) => o.id === id);
      if (offer) offer.enabled = !offer.enabled;
    } else if (intent === "duplicate") {
      const offer = config.offers.find((o) => o.id === id);
      if (offer) {
        config.offers.push({
          ...structuredClone(offer),
          id: crypto.randomUUID(),
          name: `${offer.name} (copy)`,
        });
      }
    }
  } else if (type === "coupon") {
    if (intent === "delete") {
      config.coupons = config.coupons.filter((c) => c.id !== id);
    } else if (intent === "toggle") {
      const coupon = config.coupons.find((c) => c.id === id);
      if (coupon) coupon.enabled = !coupon.enabled;
    }
  } else if (type === "claim-gift") {
    if (intent === "delete") {
      config.claim_gifts = config.claim_gifts.filter((g) => g.id !== id);
    } else if (intent === "toggle") {
      const gift = config.claim_gifts.find((g) => g.id === id);
      if (gift) gift.enabled = !gift.enabled;
    }
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

const TYPE_LABELS = {
  offer: "Offer",
  coupon: "Coupon",
  "claim-gift": "Claim Gift",
};

const TYPE_BADGE_CLASS = {
  offer: "cx-badge-magic",
  coupon: "cx-badge-info",
  "claim-gift": "cx-badge-success",
};

const TABS = ["all", "offer", "coupon", "claim-gift"];
const TAB_LABELS = {
  all: "All",
  offer: "Offers",
  coupon: "Coupons",
  "claim-gift": "Claim Gifts",
};

function Toggle({ checked, onChange }) {
  return (
    <label className="cx-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="cx-toggle-track" />
    </label>
  );
}

export default function PromotionsIndex() {
  const { promotions } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [activeTab, setActiveTab] = useState("all");

  const filtered =
    activeTab === "all"
      ? promotions
      : promotions.filter((p) => p.type === activeTab);

  function submitAction(intent, id, type) {
    fetcher.submit(JSON.stringify({ intent, id, type }), {
      method: "POST",
      encType: "application/json",
    });
  }

  async function handleDelete(promo) {
    const confirmed = await shopify.modal.confirm({
      title: `Delete ${TYPE_LABELS[promo.type].toLowerCase()}`,
      message: `Are you sure you want to delete "${promo.name}"? This action cannot be undone.`,
      primaryAction: { content: "Delete", destructive: true },
      secondaryAction: { content: "Cancel" },
    });
    if (confirmed) {
      submitAction("delete", promo.id, promo.type);
    }
  }

  const tabCounts = {};
  for (const tab of TABS) {
    tabCounts[tab] =
      tab === "all"
        ? promotions.length
        : promotions.filter((p) => p.type === tab).length;
  }

  return (
    <s-page heading="Promotions">
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/promotions/new?type=offer"
      >
        Create promotion
      </s-button>

      <div className="cx-layout">
        {/* Tab filter */}
        <div className="cx-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`cx-tab ${activeTab === tab ? "cx-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
              <span style={{ opacity: 0.6, marginLeft: 4 }}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Promotions list */}
        {filtered.length === 0 ? (
          <div className="cx-card">
            <div className="cx-empty">
              <div className="cx-empty-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              </div>
              <p className="cx-empty-title">
                {activeTab === "all"
                  ? "No promotions yet"
                  : `No ${TAB_LABELS[activeTab].toLowerCase()} yet`}
              </p>
              <p className="cx-empty-desc">
                Create your first promotion to start adding offers, coupons, or
                claim gifts for your customers.
              </p>
            </div>
          </div>
        ) : (
          <div className="cx-card">
            {filtered.map((promo) => (
              <div className="cx-list-item" key={promo.id}>
                <div className="cx-list-item-info">
                  <div className="cx-flex cx-items-center cx-gap-sm">
                    <span className="cx-list-item-title">{promo.name}</span>
                    <span className={`cx-badge cx-badge-dot ${promo.enabled ? "cx-badge-success" : "cx-badge-warning"}`}>
                      {promo.enabled ? "Active" : "Inactive"}
                    </span>
                    <span className={`cx-badge ${TYPE_BADGE_CLASS[promo.type]}`}>
                      {TYPE_LABELS[promo.type]}
                    </span>
                  </div>
                  <div className="cx-list-item-meta">
                    <span className="cx-list-item-desc">{promo.trigger}</span>
                    {promo.pages.length > 0 &&
                      promo.pages.map((h) => (
                        <span key={h} className="cx-badge cx-badge-default">
                          {h}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="cx-list-item-actions">
                  <Toggle
                    checked={promo.enabled}
                    onChange={() => submitAction("toggle", promo.id, promo.type)}
                  />
                  {promo.type === "offer" && (
                    <button
                      className="cx-btn cx-btn-ghost cx-btn-sm"
                      onClick={() => submitAction("duplicate", promo.id, promo.type)}
                      title="Duplicate"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                  )}
                  <Link
                    to={`/app/promotions/${promo.id}`}
                    className="cx-btn cx-btn-secondary cx-btn-sm"
                  >
                    Edit
                  </Link>
                  <button
                    className="cx-btn cx-btn-danger cx-btn-sm"
                    onClick={() => handleDelete(promo)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
