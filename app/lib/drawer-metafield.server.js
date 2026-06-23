import { captureException } from "./sentry.server.js";

// App-data metafield holding the drawer styling config. Stored on the app
// installation (not a shared resource), so it's isolated to this app and
// readable in the theme app extension via the Liquid `app` object:
//   {{ app.metafields.cartx.drawer_config.value }}
// App-data metafields need no definition and no storefront-access grant — the
// AppInstallation owner provides isolation (see Shopify "App-data metafields").
const METAFIELD_NAMESPACE = "cartx";
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
    const installRes = await admin.graphql(
      `#graphql
      query cartxAppInstallationId {
        currentAppInstallation { id }
      }`
    );
    const installJson = await installRes.json();
    const ownerId = installJson.data?.currentAppInstallation?.id;
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
