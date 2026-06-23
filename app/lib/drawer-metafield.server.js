import { captureException } from "./sentry.server.js";

// App-owned metafield (reserved `$app:` namespace) on the SHOP resource holding
// the drawer styling config. The app's own theme app extension can read its own
// app-owned metafields via the reserved-prefix syntax in app-embed.liquid:
//   {{ shop.metafields["$app:cartx"].drawer_config.value }}
// (Shopify "Reserved prefixes for metafields in theme app extensions".) No
// definition / storefront-access grant is required for the owning app's
// extension to read it.
const METAFIELD_NAMESPACE = "$app:cartx";
const METAFIELD_KEY = "drawer_config";

/**
 * Mirror the merchant's drawer styling (config.drawer) into an app-data
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
