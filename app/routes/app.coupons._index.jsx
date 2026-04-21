import { useLoaderData, Form } from "react-router";
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
  return { coupons: config.coupons };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  if (intent === "delete") {
    config.coupons = config.coupons.filter((c) => c.id !== id);
  } else if (intent === "toggle") {
    const coupon = config.coupons.find((c) => c.id === id);
    if (coupon) coupon.enabled = !coupon.enabled;
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

function ActionForm({ intent, id, children }) {
  return (
    <Form method="post" style={{ display: "inline" }}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      {children}
    </Form>
  );
}

export default function CouponsIndex() {
  const { coupons } = useLoaderData();

  return (
    <s-page heading="Coupons">
      <s-button slot="primary-action" variant="primary" href="/app/coupons/new">
        Add discount
      </s-button>

      {coupons.length === 0 ? (
        <s-section heading="No coupons yet">
          <s-paragraph>
            Select discounts from your Shopify store to showcase in the cart drawer.
          </s-paragraph>
        </s-section>
      ) : (
        coupons.map((coupon) => (
          <s-section key={coupon.id}>
            <s-stack direction="block" gap="tight">
              <s-stack
                direction="inline"
                align="space-between"
                block-align="center"
              >
                <s-stack direction="inline" gap="tight" block-align="center">
                  <s-heading>{coupon.is_automatic ? coupon.title : coupon.code}</s-heading>
                  <s-badge tone={coupon.enabled ? "success" : "warning"}>
                    {coupon.enabled ? "Active" : "Inactive"}
                  </s-badge>
                  <s-badge>{coupon.type_label}</s-badge>
                  {coupon.is_automatic && <s-badge tone="info">Automatic</s-badge>}
                </s-stack>
                <s-link href={`/app/coupons/${coupon.id}`}>Edit</s-link>
              </s-stack>

              {coupon.display_message && (
                <s-paragraph>{coupon.display_message}</s-paragraph>
              )}

              <s-stack direction="inline" gap="tight">
                {coupon.page_handles.map((h) => (
                  <s-badge key={h} tone="info">{h}</s-badge>
                ))}
              </s-stack>

              <s-stack direction="inline" gap="tight">
                <ActionForm intent="toggle" id={coupon.id}>
                  <s-button type="submit">
                    {coupon.enabled ? "Disable" : "Enable"}
                  </s-button>
                </ActionForm>
                <ActionForm intent="delete" id={coupon.id}>
                  <s-button type="submit" tone="critical">
                    Delete
                  </s-button>
                </ActionForm>
              </s-stack>
            </s-stack>
          </s-section>
        ))
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
