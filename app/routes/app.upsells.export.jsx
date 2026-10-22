import { authenticate } from "../shopify.server";
import { getSelectedTheme, getShopAndTheme } from "../lib/config.server.js";
import { exportRulesCsv } from "../lib/upsell-import.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  let body;
  try {
    body = await exportRulesCsv(shopId, themeId);
  } catch (err) {
    console.error("[cartx] upsell rules export failed:", err);
    return new Response("Export failed", { status: 500 });
  }
  const safeShop = session.shop.replace(/[^a-z0-9.-]/gi, "_");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cartx-upsell-rules-${safeShop}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
