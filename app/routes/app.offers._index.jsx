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
  return { offers: config.offers };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  if (intent === "delete") {
    config.offers = config.offers.filter((o) => o.id !== id);
  } else if (intent === "toggle") {
    const offer = config.offers.find((o) => o.id === id);
    if (offer) offer.enabled = !offer.enabled;
  } else if (intent === "duplicate") {
    const offer = config.offers.find((o) => o.id === id);
    if (offer) {
      config.offers.push({
        ...structuredClone(offer),
        id: crypto.randomUUID(),
        name: `${offer.name} (copy)`,
      });
    }
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

function sourceLabel(offer) {
  if (!offer.source) return "Entire cart";
  if (offer.source.type === "product") return "Product presence";
  return "Collection";
}

function triggerLabel(offer) {
  const parts = [];
  if (offer.trigger.price_threshold)
    parts.push(`Rs.${offer.trigger.price_threshold} total`);
  if (offer.trigger.quantity_threshold)
    parts.push(`${offer.trigger.quantity_threshold} items`);
  if (parts.length === 0 && offer.source?.type === "product")
    return "On product in cart";
  return parts.join(" or ") || "No threshold";
}

function rewardLabel(offer) {
  if (offer.reward.type === "auto_add_gift") {
    const mode = offer.reward.add_mode === "auto" ? "Auto-add" : "Display";
    return `${mode}: ${offer.reward.gift_variants.length} gift(s)`;
  }
  return `Bundle: ${offer.reward.bundle_variants.length} item(s)`;
}

function ActionForm({ intent, id, children }) {
  return (
    <Form method="post" style={{ display: "inline" }}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      {children}
    </Form>
  );
}

export default function OffersIndex() {
  const { offers } = useLoaderData();

  return (
    <s-page heading="Offers">
      <s-button slot="primary-action" variant="primary" href="/app/offers/new">
        Create offer
      </s-button>

      {offers.length === 0 ? (
        <s-section heading="No offers yet">
          <s-paragraph>
            Create your first offer to start adding free gifts, BOGO deals, or
            cart freebies for your customers.
          </s-paragraph>
        </s-section>
      ) : (
        offers.map((offer) => (
          <s-section key={offer.id}>
            <s-stack direction="block" gap="tight">
              <s-stack
                direction="inline"
                align="space-between"
                block-align="center"
              >
                <s-stack direction="inline" gap="tight" block-align="center">
                  <s-heading>{offer.name}</s-heading>
                  <s-badge tone={offer.enabled ? "success" : "warning"}>
                    {offer.enabled ? "Active" : "Inactive"}
                  </s-badge>
                  <s-badge>{sourceLabel(offer)}</s-badge>
                </s-stack>
                <s-link href={`/app/offers/${offer.id}`}>Edit</s-link>
              </s-stack>

              <s-paragraph>
                {triggerLabel(offer)} &middot; {rewardLabel(offer)}
              </s-paragraph>

              <s-stack direction="inline" gap="tight">
                {offer.page_handles.map((h) => (
                  <s-badge key={h} tone="info">
                    {h}
                  </s-badge>
                ))}
              </s-stack>

              <s-stack direction="inline" gap="tight">
                <ActionForm intent="toggle" id={offer.id}>
                  <s-button type="submit">
                    {offer.enabled ? "Disable" : "Enable"}
                  </s-button>
                </ActionForm>
                <ActionForm intent="duplicate" id={offer.id}>
                  <s-button type="submit">Duplicate</s-button>
                </ActionForm>
                <ActionForm intent="delete" id={offer.id}>
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
