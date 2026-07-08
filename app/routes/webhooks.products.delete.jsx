import { authenticate } from '../shopify.server'
import { handleProductDelete } from '../lib/product-sync.server.js'
import { captureException } from '../lib/sentry.server.js'

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request)

  try {
    const productId = payload?.id
    console.log(`[cartx][${topic}] received for ${shop} product ${productId}`)
    // Drop refs to the deleted product and auto-draft any promotion it leaves
    // without a reward (no Admin API needed — the product is gone).
    if (productId) await handleProductDelete(shop, String(productId))
  } catch (err) {
    console.error(`[cartx][${topic}] product delete sync failed for ${shop}:`, err)
    captureException(err, { tags: { area: 'product_sync', topic }, extra: { shop, product_id: payload?.id } })
  }

  return new Response()
}
