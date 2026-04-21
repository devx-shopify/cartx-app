import { useLoaderData, useFetcher } from "react-router";
import { useEffect } from "react";
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

  const activePromotions = [];
  for (const offer of config.offers) {
    if (offer.enabled) {
      activePromotions.push({ name: offer.name, type: "Offer", id: offer.id });
    }
  }
  for (const coupon of config.coupons) {
    if (coupon.enabled) {
      activePromotions.push({
        name: coupon.is_automatic ? coupon.title : coupon.code,
        type: "Coupon",
        id: coupon.id,
      });
    }
  }
  for (const gift of config.claim_gifts) {
    if (gift.enabled) {
      activePromotions.push({
        name: gift.name,
        type: "Claim Gift",
        id: gift.id,
      });
    }
  }

  return {
    totalPromotions:
      config.offers.length + config.coupons.length + config.claim_gifts.length,
    activePromotions,
    progressBarEnabled: config.progress_bar.enabled,
    upsellsEnabled: config.upsells.enabled,
    upsellsCount: config.upsells.products.length,
    bottomRibbonEnabled: config.bottom_ribbon.enabled,
    milestonesCount: config.progress_bar.visual_milestones.length,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  if (body._action === "toggle_progress_bar") {
    config.progress_bar.enabled = !config.progress_bar.enabled;
  } else if (body._action === "toggle_upsells") {
    config.upsells.enabled = !config.upsells.enabled;
  } else if (body._action === "toggle_ribbon") {
    config.bottom_ribbon.enabled = !config.bottom_ribbon.enabled;
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

export default function Dashboard() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Updated");
    }
  }, [fetcher.data, shopify]);

  function handleToggle(actionName) {
    fetcher.submit(JSON.stringify({ _action: actionName }), {
      method: "POST",
      encType: "application/json",
    });
  }

  const hasPromotions = data.totalPromotions > 0;
  const hasActivePromotions = data.activePromotions.length > 0;

  return (
    <s-page heading="Cart Max">
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/promotions/new?type=offer"
      >
        Create promotion
      </s-button>

      {/* Onboarding for new merchants */}
      {!hasPromotions && (
        <s-section heading="Get started">
          <s-banner tone="info">
            Welcome to Cart Max! Set up your cart drawer experience in a few
            steps.
          </s-banner>
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="tight" block-align="center">
                <s-badge tone="info">1</s-badge>
                <s-paragraph>
                  <s-link href="/app/promotions/new?type=offer">
                    Create your first offer
                  </s-link>
                  {" — add free gifts, BOGO deals, or cart freebies"}
                </s-paragraph>
              </s-stack>
              <s-divider />
              <s-stack direction="inline" gap="tight" block-align="center">
                <s-badge tone="info">2</s-badge>
                <s-paragraph>
                  <s-link href="/app/settings">Configure settings</s-link>
                  {" — set up the progress bar, upsells, and ribbon"}
                </s-paragraph>
              </s-stack>
              <s-divider />
              <s-stack direction="inline" gap="tight" block-align="center">
                <s-badge tone="info">3</s-badge>
                <s-paragraph>
                  Preview your cart drawer on your storefront
                </s-paragraph>
              </s-stack>
            </s-stack>
          </s-box>
        </s-section>
      )}

      {/* Active promotions */}
      {hasPromotions && (
        <s-section heading="Active promotions">
          {hasActivePromotions ? (
            <s-stack direction="block" gap="none">
              {data.activePromotions.slice(0, 5).map((promo, i) => (
                <span key={promo.id}>
                  {i > 0 && <s-divider />}
                  <s-box padding="base">
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
                        <s-badge tone="info">{promo.type}</s-badge>
                      </s-stack>
                      <s-link href={`/app/promotions/${promo.id}`}>Edit</s-link>
                    </s-stack>
                  </s-box>
                </span>
              ))}
              {data.activePromotions.length > 5 && (
                <>
                  <s-divider />
                  <s-box padding="base">
                    <s-link href="/app/promotions">
                      View all {data.activePromotions.length} active promotions
                    </s-link>
                  </s-box>
                </>
              )}
            </s-stack>
          ) : (
            <s-paragraph color="subdued">
              No active promotions.{" "}
              <s-link href="/app/promotions">Manage promotions</s-link>
            </s-paragraph>
          )}
          <s-box padding="base none none">
            <s-link href="/app/promotions">
              All promotions ({data.totalPromotions})
            </s-link>
          </s-box>
        </s-section>
      )}

      {/* Feature toggle cards */}
      <s-box slot="aside">
        <s-section heading="Progress Bar">
          <s-stack direction="block" gap="tight">
            <s-stack
              direction="inline"
              align="space-between"
              block-align="center"
            >
              <s-paragraph color="subdued">
                {data.milestonesCount} visual milestone
                {data.milestonesCount !== 1 ? "s" : ""}
              </s-paragraph>
              <s-switch
                label="Enable progress bar"
                labelAccessibilityVisibility="hidden"
                checked={data.progressBarEnabled}
                onChange={() => handleToggle("toggle_progress_bar")}
              />
            </s-stack>
            <s-link href="/app/settings">Configure</s-link>
          </s-stack>
        </s-section>

        <s-section heading="Upsells">
          <s-stack direction="block" gap="tight">
            <s-stack
              direction="inline"
              align="space-between"
              block-align="center"
            >
              {data.upsellsEnabled ? (
                <s-paragraph color="subdued">
                  {data.upsellsCount} product
                  {data.upsellsCount !== 1 ? "s" : ""}
                </s-paragraph>
              ) : (
                <s-paragraph color="subdued">Disabled</s-paragraph>
              )}
              <s-switch
                label="Enable upsells"
                labelAccessibilityVisibility="hidden"
                checked={data.upsellsEnabled}
                onChange={() => handleToggle("toggle_upsells")}
              />
            </s-stack>
            <s-link href="/app/settings">Configure</s-link>
          </s-stack>
        </s-section>

        <s-section heading="Bottom Ribbon">
          <s-stack direction="block" gap="tight">
            <s-stack
              direction="inline"
              align="space-between"
              block-align="center"
            >
              <s-paragraph color="subdued">
                {data.bottomRibbonEnabled ? "Enabled" : "Disabled"}
              </s-paragraph>
              <s-switch
                label="Enable bottom ribbon"
                labelAccessibilityVisibility="hidden"
                checked={data.bottomRibbonEnabled}
                onChange={() => handleToggle("toggle_ribbon")}
              />
            </s-stack>
            <s-link href="/app/settings">Configure</s-link>
          </s-stack>
        </s-section>
      </s-box>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
