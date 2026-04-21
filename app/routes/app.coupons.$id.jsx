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
import CouponForm from "../components/CouponForm.jsx";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const coupon = config.coupons.find((c) => c.id === params.id);
  if (!coupon) throw new Response("Coupon not found", { status: 404 });
  return { coupon };
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  const idx = config.coupons.findIndex((c) => c.id === params.id);
  if (idx === -1) throw new Response("Coupon not found", { status: 404 });

  config.coupons[idx] = { ...config.coupons[idx], ...body, id: params.id };
  await saveConfig(shopId, themeId, config);

  return { ok: true };
};

export default function EditCoupon() {
  const { coupon } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Coupon updated");
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
    <s-page heading="Edit coupon" backAction={{ url: "/app/coupons" }}>
      <CouponForm
        coupon={coupon}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
