import { useState, useEffect } from "react";
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
  return {
    bottomRibbon: config.bottom_ribbon,
    crossPageRemoval: config.cross_page_removal_behavior,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  config.bottom_ribbon = body.bottom_ribbon;
  config.cross_page_removal_behavior = body.cross_page_removal_behavior;
  await saveConfig(shopId, themeId, config);

  return { ok: true };
};

export default function Settings() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  const [ribbonEnabled, setRibbonEnabled] = useState(
    data.bottomRibbon.enabled
  );
  const [oosOverride, setOosOverride] = useState(
    data.bottomRibbon.oos_message_override ?? ""
  );
  const [crossPageBehavior, setCrossPageBehavior] = useState(
    data.crossPageRemoval
  );

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  function handleSave() {
    fetcher.submit(
      JSON.stringify({
        bottom_ribbon: {
          enabled: ribbonEnabled,
          oos_message_override: oosOverride || "",
        },
        cross_page_removal_behavior: crossPageBehavior,
      }),
      { method: "POST", encType: "application/json" }
    );
  }

  return (
    <s-page heading="Settings">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(submitting ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Bottom Ribbon">
        <s-checkbox
          label="Enable bottom ribbon"
          checked={ribbonEnabled}
          onChange={(e) => setRibbonEnabled(e.currentTarget.checked)}
        />
        <s-text-field
          label="Out-of-stock message override"
          value={oosOverride}
          onInput={(e) => setOosOverride(e.currentTarget.value)}
          details="Leave empty to use the default OOS message"
          placeholder="This item is currently out of stock"
        />
      </s-section>

      <s-section heading="Cross-page removal">
        <s-select
          label="When a customer leaves a page with active offers"
          value={crossPageBehavior}
          onChange={(e) => setCrossPageBehavior(e.currentTarget.value)}
        >
          <s-option value="silent">
            Remove silently
          </s-option>
          <s-option value="notice">
            Show a notice
          </s-option>
          <s-option value="modal">
            Show a confirmation modal
          </s-option>
        </s-select>
        <s-paragraph>
          Controls what happens to auto-added gift items when a customer
          navigates away from the page where the offer was active.
          Claimed items are never auto-removed.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
