import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const customerId = payload?.customer?.id;
  if (customerId) {
    await db.session.deleteMany({
      where: { shop, userId: BigInt(customerId) },
    });
  }

  return new Response();
};
