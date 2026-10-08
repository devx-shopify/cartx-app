import { authenticate } from '../shopify.server'
import { handleProductUpdate } from '../lib/product-sync.server.js'
import { captureException } from '../lib/sentry.server.js'

export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request)

  try {
    const productId = payload?.id
    console.log(`[cartx][${topic}] received for ${shop} product ${productId}`)
    if (productId) await handleProductUpdate(shop, String(productId), admin)
  } catch (err) {
    // Swallow + report: returning non-200 makes Shopify retry, and product
    // snapshots going briefly stale must never loop a bad payload forever.
    console.error(`[cartx][${topic}] product sync failed for ${shop}:`, err)
    captureException(err, { tags: { area: 'product_sync', topic }, extra: { shop, product_id: payload?.id } })
  }

  return new Response()
}
