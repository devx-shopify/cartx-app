import { captureException } from "./sentry.server.js";

// Merchant-owned shop metafield holding the drawer styling config, exposed to
// the storefront so the theme app extension can inline it (app-embed.liquid):
//   {{ shop.metafields.cartx.drawer_config.value }}
// For a metafield value to be readable in storefront/theme Liquid it needs a
// DEFINITION with access.storefront = PUBLIC_READ — we ensure that here.
// Requires the `write_metafields` access scope (added to shopify.app.toml).
const METAFIELD_NAMESPACE = "cartx";
const METAFIELD_KEY = "drawer_config";

// Create the storefront-readable definition once. Idempotent: a TAKEN error
// (definition already exists) is expected and ignored.
async function ensureDefinition(admin) {
  try {
    const res = await admin.graphql(
      `#graphql
      mutation cartxDrawerMetafieldDef($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id }
          userErrors { code field message }
        }
      }`,
      {
        variables: {
          definition: {
            name: "cartx drawer config",
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            description: "Storefront drawer styling (managed by cartx).",
            type: "json",
            ownerType: "SHOP",
            access: { storefront: "PUBLIC_READ" },
          },
        },
      }
    );
    const json = await res.json();
    const errors = json.data?.metafieldDefinitionCreate?.userErrors || [];
    const fatal = errors.filter((e) => e.code !== "TAKEN");
    if (fatal.length) console.error("[cartx] drawer metafield definition errors:", fatal);
  } catch (err) {
    // Non-fatal: the value set below still runs; surface for diagnostics.
    console.error("[cartx] ensureDefinition failed:", err);
  }
}

/**
 * Mirror the merchant's drawer styling (config.drawer) into a storefront-readable
 * shop metafield so app-embed.liquid can inline it and the storefront drawer can
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

    await ensureDefinition(admin);

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
