import { authenticate } from "../shopify.server";
import { sampleCsv } from "../lib/upsell-import.server.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  let body;
  try {
    body = await sampleCsv(admin);
  } catch (err) {
    console.error("[cartx] upsell sample sheet failed:", err);
    return new Response("Sample failed", { status: 500 });
  }
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cartx-upsell-rules-sample.csv"',
      "Cache-Control": "no-store",
    },
  });
};
