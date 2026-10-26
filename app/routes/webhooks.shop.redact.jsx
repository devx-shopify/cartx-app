import { authenticate } from "../shopify.server";
import db from "../db.server";
import { deleteShopUpsellData } from "../lib/upsells.server.js";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await db.session.deleteMany({ where: { shop } });
  await db.themeConfig.deleteMany({ where: { shopId: shop } });
  await deleteShopUpsellData(shop);
  await db.store.deleteMany({ where: { storeDomain: shop } });

  return new Response();
};
