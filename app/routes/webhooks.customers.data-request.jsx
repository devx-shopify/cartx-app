import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Shopify expects a 200 acknowledgment. The merchant handles the actual data export.
  // This app stores minimal customer data (only session info with userId for online tokens).

  return new Response();
};
