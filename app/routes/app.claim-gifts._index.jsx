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
  return { claimGifts: config.claim_gifts };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  if (intent === "delete") {
    config.claim_gifts = config.claim_gifts.filter((g) => g.id !== id);
  } else if (intent === "toggle") {
    const gift = config.claim_gifts.find((g) => g.id === id);
    if (gift) gift.enabled = !gift.enabled;
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

export default function ClaimGiftsIndex() {
  const { claimGifts } = useLoaderData();

  return (
    <s-page heading="Claim Gifts">
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/claim-gifts/new"
      >
        Create claim gift
      </s-button>

      {claimGifts.length === 0 ? (
        <s-section heading="No claim gifts yet">
          <s-paragraph>
            Create your first claim gift to let customers pick free products
            when they reach a cart threshold.
          </s-paragraph>
        </s-section>
      ) : (
        claimGifts.map((gift) => (
          <s-section key={gift.id}>
            <s-stack direction="block" gap="tight">
              <s-stack
                direction="inline"
                align="space-between"
                block-align="center"
              >
                <s-stack direction="inline" gap="tight" block-align="center">
                  <s-heading>{gift.name}</s-heading>
                  <s-badge tone={gift.enabled ? "success" : "warning"}>
                    {gift.enabled ? "Active" : "Inactive"}
                  </s-badge>
                </s-stack>
                <s-link href={`/app/claim-gifts/${gift.id}`}>Edit</s-link>
              </s-stack>

              <s-paragraph>
                {gift.trigger.type === "price"
                  ? `Rs.${gift.trigger.threshold} cart total`
                  : `${gift.trigger.threshold} items`}
                {" · "}
                {gift.claimable_variants.length} claimable variant(s)
              </s-paragraph>

              <s-stack direction="inline" gap="tight">
                {gift.page_handles.map((h) => (
                  <s-badge key={h} tone="info">
                    {h}
                  </s-badge>
                ))}
              </s-stack>

              <s-stack direction="inline" gap="tight">
                <ActionForm intent="toggle" id={gift.id}>
                  <s-button type="submit">
                    {gift.enabled ? "Disable" : "Enable"}
                  </s-button>
                </ActionForm>
                <ActionForm intent="delete" id={gift.id}>
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
