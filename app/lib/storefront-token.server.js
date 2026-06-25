import prisma from "../db.server.js";
import { captureException } from "./sentry.server.js";

// The app mints a public Unauthenticated Storefront access token (via Admin
// storefrontAccessTokenCreate) and the drawer uses it to call the Storefront
// Cart API. The token inherits the app's `unauthenticated_*` scopes, so those
// must be granted (shopify.app.toml) before minting will succeed.
//
// Stored in a reserved ThemeConfig row (no schema migration), mirroring the
// discount records' `__freebie_discount__` pattern. Keyed by shopId (the shop's
// permanent domain — same shopId used by loadConfig, so the proxy and the
// admin loader resolve the same row).
const STOREFRONT_STORE_KEY = "__storefront__";
const TOKEN_TITLE = "cartx-storefront";

/** Read the stored Storefront token for a shop (no admin context needed). */
export async function loadStorefrontToken(shopId) {
  try {
    const row = await prisma.themeConfig.findUnique({
      where: { shopId_themeId: { shopId, themeId: STOREFRONT_STORE_KEY } },
    });
    if (!row) return null;
    const data = JSON.parse(row.config || "{}");
    return data.token || null;
  } catch (err) {
    console.error("[cartx] loadStorefrontToken failed:", err);
    return null;
  }
}

/**
 * Ensure a Storefront token exists for the shop, minting one on first call.
 * Admin-context only (afterAuth / an admin loader). Best-effort: never throws.
 * Returns the token or null.
 */
export async function ensureStorefrontToken(admin, shopId) {
  try {
    const existing = await loadStorefrontToken(shopId);
    if (existing) return existing;

    const res = await admin.graphql(
      `#graphql
      mutation cartxStorefrontTokenCreate($input: StorefrontAccessTokenInput!) {
        storefrontAccessTokenCreate(input: $input) {
          storefrontAccessToken { accessToken }
          userErrors { field message }
        }
      }`,
      { variables: { input: { title: TOKEN_TITLE } } }
    );
    const json = await res.json();
    const payload = json.data?.storefrontAccessTokenCreate;
    const errors = payload?.userErrors || [];
    if (errors.length) {
      console.error("[cartx] storefrontAccessTokenCreate userErrors:", errors);
      return null;
    }
    const token = payload?.storefrontAccessToken?.accessToken;
    if (!token) return null;

    await prisma.themeConfig.upsert({
      where: { shopId_themeId: { shopId, themeId: STOREFRONT_STORE_KEY } },
      create: { shopId, themeId: STOREFRONT_STORE_KEY, config: JSON.stringify({ token }) },
      update: { config: JSON.stringify({ token }) },
    });
    return token;
  } catch (err) {
    captureException(err);
    console.error("[cartx] ensureStorefrontToken failed:", err);
    return null;
  }
}
