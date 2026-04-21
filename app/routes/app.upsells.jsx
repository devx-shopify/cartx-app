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
  return { upsells: config.upsells };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  // Fetch fresh product data for selected products
  if (body.product_ids?.length > 0) {
    const gids = body.product_ids.map((id) =>
      id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`
    );
    const res = await admin.graphql(
      `#graphql
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              featuredImage { url }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }`,
      { variables: { ids: gids } }
    );
    const json = await res.json();
    const products = (json.data?.nodes ?? [])
      .filter(Boolean)
      .map((node) => ({
        product_id: node.id,
        title: node.title,
        image_url: node.featuredImage?.url ?? "",
        variant_id: node.variants.edges[0]?.node.id ?? "",
        price: node.variants.edges[0]?.node.price ?? "0",
        compare_at_price: node.variants.edges[0]?.node.compareAtPrice || undefined,
      }));

    config.upsells = {
      enabled: body.enabled,
      heading: body.heading,
      show_on_empty_cart: body.show_on_empty_cart,
      products,
    };
  } else {
    config.upsells = {
      enabled: body.enabled,
      heading: body.heading,
      show_on_empty_cart: body.show_on_empty_cart,
      products: body.keep_products ? config.upsells.products : [],
    };
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

export default function Upsells() {
  const { upsells } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  const [enabled, setEnabled] = useState(upsells.enabled);
  const [heading, setHeading] = useState(upsells.heading);
  const [showOnEmptyCart, setShowOnEmptyCart] = useState(
    upsells.show_on_empty_cart ?? false
  );
  const [products, setProducts] = useState(upsells.products);
  const [newProductIds, setNewProductIds] = useState(null);

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Upsells saved");
    }
  }, [fetcher.data, shopify]);

  async function pickProducts() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const ids = selection.map((p) => p.id);
      setNewProductIds(ids);
      setProducts(selection.map((p) => ({
        product_id: p.id,
        title: p.title,
        image_url: p.images?.[0]?.originalSrc ?? "",
        variant_id: p.variants?.[0]?.id ?? "",
        price: p.variants?.[0]?.price ?? "0",
      })));
    }
  }

  function removeProduct(productId) {
    setProducts(products.filter((p) => p.product_id !== productId));
    if (newProductIds) {
      setNewProductIds(newProductIds.filter((id) => id !== productId));
    }
  }

  function handleSave() {
    const payload = {
      enabled,
      heading,
      show_on_empty_cart: showOnEmptyCart,
    };

    if (newProductIds) {
      payload.product_ids = newProductIds;
    } else {
      payload.keep_products = true;
    }

    fetcher.submit(JSON.stringify(payload), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page heading="Upsells">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(submitting ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Settings">
        <s-checkbox
          label="Enable upsells in cart drawer"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
        <s-text-field
          label="Section heading"
          value={heading}
          onInput={(e) => setHeading(e.currentTarget.value)}
          placeholder="You may also like"
        />
        <s-checkbox
          label="Show upsells when cart is empty"
          checked={showOnEmptyCart}
          onChange={(e) => setShowOnEmptyCart(e.currentTarget.checked)}
        />
      </s-section>

      <s-section heading="Upsell products">
        <s-banner tone="info">
          Pick products to recommend in the cart drawer. Products already in the
          cart are hidden automatically.
        </s-banner>

        <s-button onClick={pickProducts}>
          {products.length > 0 ? "Change products" : "Add products"}
        </s-button>

        {products.length > 0 && (
          <s-stack direction="block" gap="tight">
            {products.map((p) => (
              <s-stack
                key={p.product_id}
                direction="inline"
                align="space-between"
                block-align="center"
              >
                <s-paragraph>
                  {p.title} — Rs.{p.price}
                </s-paragraph>
                <s-button
                  tone="critical"
                  onClick={() => removeProduct(p.product_id)}
                >
                  Remove
                </s-button>
              </s-stack>
            ))}
          </s-stack>
        )}

        {products.length > 6 && (
          <s-banner tone="warning">
            More than 6 products may feel overwhelming. Consider keeping it
            focused.
          </s-banner>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
