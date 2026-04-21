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
import ClaimGiftForm from "../components/ClaimGiftForm.jsx";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const claimGift = config.claim_gifts.find((g) => g.id === params.id);
  if (!claimGift) throw new Response("Claim gift not found", { status: 404 });
  return { claimGift };
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  const idx = config.claim_gifts.findIndex((g) => g.id === params.id);
  if (idx === -1) throw new Response("Claim gift not found", { status: 404 });

  const variantDataMap = await fetchVariantData(admin, body.claimable_variants || []);
  body.claimable_variant_data = enrichVariantData(body.claimable_variants || [], variantDataMap);

  config.claim_gifts[idx] = {
    ...config.claim_gifts[idx],
    ...body,
    id: params.id,
  };
  await saveConfig(shopId, themeId, config);

  return { ok: true };
};

export default function EditClaimGift() {
  const { claimGift } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Claim gift updated");
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
    <s-page heading="Edit claim gift" backAction={{ url: "/app/claim-gifts" }}>
      <ClaimGiftForm
        claimGift={claimGift}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
