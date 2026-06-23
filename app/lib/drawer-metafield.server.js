import { captureException } from "./sentry.server.js";

// App-owned shop metafield holding the drawer styling config. The schema is
// declared DECLARATIVELY in shopify.app.toml ([shop.metafields.app.drawer_config]
// with access.storefront = "public_read") — that declaration is what exposes the
// value to theme Liquid. We only write the VALUE here; the app owns the `$app`
// namespace, so no metafield scope is needed (the standalone read/write_metafields
// scopes are deprecated). Read in app-embed.liquid as:
//   {{ shop.metafields['$app'].drawer_config.value }}
const METAFIELD_NAMESPACE = "$app";
const METAFIELD_KEY = "drawer_config";

/**
 * Mirror the merchant's drawer styling (config.drawer) into the app-owned shop
 * metafield so app-embed.liquid can inline it and the storefront drawer can
 * apply it synchronously on mount — no proxy round-trip, no styling flash.
 *
 * Best-effort: never throws. Returns true on success, false otherwise.
 */
export async function syncDrawerMetafield(admin, drawer) {
  try {
    const shopRes = await admin.graphql(
      `#graphql
      query cartxShopId {
        shop { id }
      }`
    );
    const shopJson = await shopRes.json();
    const ownerId = shopJson.data?.shop?.id;
    if (!ownerId) return false;

    const res = await admin.graphql(
      `#graphql
      mutation cartxSetDrawerMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId,
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: JSON.stringify(drawer ?? {}),
            },
          ],
        },
      }
    );
    const json = await res.json();
    const errors = json.data?.metafieldsSet?.userErrors;
    if (errors && errors.length) {
      console.error("[cartx] drawer metafield userErrors:", errors);
      return false;
    }
    return true;
  } catch (err) {
    captureException(err);
    console.error("[cartx] syncDrawerMetafield failed:", err);
    return false;
  }
}
