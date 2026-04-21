import { useNavigate, useFetcher } from "react-router";
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

  const variantDataMap = await fetchVariantData(admin, body.claimable_variants || []);
  body.claimable_variant_data = enrichVariantData(body.claimable_variants || [], variantDataMap);

  config.claim_gifts.push({ id: generateId(), ...body });
  await saveConfig(shopId, themeId, config);

  return { ok: true };
};

export default function NewClaimGift() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Claim gift created");
      navigate("/app/claim-gifts");
    }
  }, [fetcher.data, navigate, shopify]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify(data), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page heading="Create claim gift" backAction={{ url: "/app/claim-gifts" }}>
      <ClaimGiftForm onSubmit={handleSubmit} submitting={submitting} />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
