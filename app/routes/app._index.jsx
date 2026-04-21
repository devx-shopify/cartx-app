import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { loadConfig, getShopAndTheme } from "../lib/config.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);

  return {
    offersCount: config.offers.filter((o) => o.enabled).length,
    totalOffers: config.offers.length,
    couponsCount: config.coupons.filter((c) => c.enabled).length,
    totalCoupons: config.coupons.length,
    claimGiftsCount: config.claim_gifts.filter((g) => g.enabled).length,
    totalClaimGifts: config.claim_gifts.length,
    progressBarEnabled: config.progress_bar.enabled,
    milestonesCount: config.progress_bar.visual_milestones.length,
    bottomRibbonEnabled: config.bottom_ribbon.enabled,
    upsellsEnabled: config.upsells.enabled,
    upsellsCount: config.upsells.products.length,
  };
};

export default function Dashboard() {
  const data = useLoaderData();

  return (
    <s-page heading="Cart Max">
      <s-section heading="Offers">
        <s-stack direction="inline" align="space-between" block-align="center">
          <s-paragraph>
            {data.offersCount} active of {data.totalOffers} total
          </s-paragraph>
          <s-link href="/app/offers">Manage</s-link>
        </s-stack>
      </s-section>

      <s-section heading="Coupons">
        <s-stack direction="inline" align="space-between" block-align="center">
          <s-paragraph>
            {data.couponsCount} active of {data.totalCoupons} total
          </s-paragraph>
          <s-link href="/app/coupons">Manage</s-link>
        </s-stack>
      </s-section>

      <s-section heading="Claim Gifts">
        <s-stack direction="inline" align="space-between" block-align="center">
          <s-paragraph>
            {data.claimGiftsCount} active of {data.totalClaimGifts} total
          </s-paragraph>
          <s-link href="/app/claim-gifts">Manage</s-link>
        </s-stack>
      </s-section>

      <s-box slot="aside">
        <s-section heading="Progress Bar">
          <s-stack direction="block" gap="tight">
            <s-badge tone={data.progressBarEnabled ? "success" : "warning"}>
              {data.progressBarEnabled ? "On" : "Off"}
            </s-badge>
            <s-paragraph>
              {data.milestonesCount} visual milestone{data.milestonesCount !== 1 ? "s" : ""}
            </s-paragraph>
            <s-link href="/app/progress-bar">Configure</s-link>
          </s-stack>
        </s-section>

        <s-section heading="Bottom Ribbon">
          <s-stack direction="block" gap="tight">
            <s-badge tone={data.bottomRibbonEnabled ? "success" : "warning"}>
              {data.bottomRibbonEnabled ? "On" : "Off"}
            </s-badge>
            <s-link href="/app/settings">Configure</s-link>
          </s-stack>
        </s-section>

        <s-section heading="Upsells">
          <s-stack direction="block" gap="tight">
            <s-badge tone={data.upsellsEnabled ? "success" : "warning"}>
              {data.upsellsEnabled ? "On" : "Off"}
            </s-badge>
            {data.upsellsEnabled && (
              <s-paragraph>
                {data.upsellsCount} product{data.upsellsCount !== 1 ? "s" : ""}
              </s-paragraph>
            )}
            <s-link href="/app/upsells">Configure</s-link>
          </s-stack>
        </s-section>
      </s-box>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
