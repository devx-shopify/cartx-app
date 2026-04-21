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
import OfferForm from "../components/OfferForm.jsx";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const offer = config.offers.find((o) => o.id === params.id);
  if (!offer) throw new Response("Offer not found", { status: 404 });
  return { offer };
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  const idx = config.offers.findIndex((o) => o.id === params.id);
  if (idx === -1) throw new Response("Offer not found", { status: 404 });

  config.offers[idx] = { ...config.offers[idx], ...body, id: params.id };
  await saveConfig(shopId, themeId, config);

  return { ok: true };
};

export default function EditOffer() {
  const { offer } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Offer updated");
      navigate("/app/offers");
    }
  }, [fetcher.data, navigate, shopify]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify(data), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page heading="Edit offer" backAction={{ url: "/app/offers" }}>
      <OfferForm
        offer={offer}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
