import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Delete all data for this shop
  await db.session.deleteMany({ where: { shop } });
  await db.themeConfig.deleteMany({ where: { shopId: shop } });

  return new Response();
};
