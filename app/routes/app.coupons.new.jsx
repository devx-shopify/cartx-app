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
import CouponForm from "../components/CouponForm.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  config.coupons.push({ id: generateId(), ...body });
  await saveConfig(shopId, themeId, config);

  return { ok: true };
};

export default function NewCoupon() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Coupon created");
      navigate("/app/coupons");
    }
  }, [fetcher.data, navigate, shopify]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify(data), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page heading="Create coupon" backAction={{ url: "/app/coupons" }}>
      <CouponForm onSubmit={handleSubmit} submitting={submitting} />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
