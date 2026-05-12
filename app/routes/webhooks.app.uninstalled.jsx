import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Preserve ThemeConfig and Store records so configs survive reinstalls.
  // Only sessions are deleted (Shopify requires fresh auth on reinstall).
  // Reset onboarding so returning merchants see the setup guide again.
  const defaultOnboarding = JSON.stringify({ completed: false, steps: { offer_created: false, settings_configured: false, app_enabled: false, previewed: false } });
  await db.store.updateMany({
    where: { storeDomain: shop },
    data: { onboarding: defaultOnboarding },
  });

  return new Response();
};
