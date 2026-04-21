import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
} from "../lib/config.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
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
  const { shopId, themeId } = await getShopAndTheme(admin, session);
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

const TYPE_TONES = {
  offer: "magic",
  coupon: "info",
  "claim-gift": "success",
};

const TABS = ["all", "offer", "coupon", "claim-gift"];
const TAB_LABELS = {
  all: "All",
  offer: "Offers",
  coupon: "Coupons",
  "claim-gift": "Claim Gifts",
};

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

      {/* Tab filter */}
      <s-section>
        <s-stack direction="inline" gap="tight">
          {TABS.map((tab) => (
            <s-chip
              key={tab}
              label={`${TAB_LABELS[tab]} (${tabCounts[tab]})`}
              selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </s-stack>
      </s-section>

      {/* Promotions list */}
      {filtered.length === 0 ? (
        <s-section
          heading={
            activeTab === "all"
              ? "No promotions yet"
              : `No ${TAB_LABELS[activeTab].toLowerCase()} yet`
          }
        >
          <s-paragraph color="subdued">
            Create your first promotion to start adding offers, coupons, or
            claim gifts for your customers.
          </s-paragraph>
        </s-section>
      ) : (
        <s-section>
          <s-stack direction="block" gap="none">
            {filtered.map((promo, i) => (
              <span key={promo.id}>
                {i > 0 && <s-divider />}
                <s-box padding="base">
                  <s-stack direction="block" gap="tight">
                    {/* Row 1: Name + badges + edit link */}
                    <s-stack
                      direction="inline"
                      align="space-between"
                      block-align="center"
                    >
                      <s-stack
                        direction="inline"
                        gap="tight"
                        block-align="center"
                      >
                        <s-text type="strong">{promo.name}</s-text>
                        <s-badge tone={promo.enabled ? "success" : "warning"}>
                          {promo.enabled ? "Active" : "Inactive"}
                        </s-badge>
                        <s-badge tone={TYPE_TONES[promo.type]}>
                          {TYPE_LABELS[promo.type]}
                        </s-badge>
                      </s-stack>
                      <s-link href={`/app/promotions/${promo.id}`}>
                        Edit
                      </s-link>
                    </s-stack>

                    {/* Row 2: Trigger + page badges */}
                    <s-stack
                      direction="inline"
                      gap="tight"
                      block-align="center"
                    >
                      <s-paragraph color="subdued">
                        {promo.trigger}
                      </s-paragraph>
                      {promo.pages.length > 0 &&
                        promo.pages.map((h) => (
                          <s-badge key={h} tone="info">
                            {h}
                          </s-badge>
                        ))}
                    </s-stack>

                    {/* Row 3: Actions */}
                    <s-stack direction="inline" gap="tight">
                      <s-switch
                        label={promo.enabled ? "Enabled" : "Disabled"}
                        checked={promo.enabled}
                        onChange={() =>
                          submitAction("toggle", promo.id, promo.type)
                        }
                      />
                      {promo.type === "offer" && (
                        <s-button
                          onClick={() =>
                            submitAction("duplicate", promo.id, promo.type)
                          }
                        >
                          Duplicate
                        </s-button>
                      )}
                      <s-button
                        tone="critical"
                        onClick={() => handleDelete(promo)}
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              </span>
            ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
