import { authenticate } from '../shopify.server'
import { handleCollectionChange } from '../lib/collection-products.server.js'
import { captureException } from '../lib/sentry.server.js'

// Keeps "A collection" trigger sources (offers, bar milestones, volume
// discounts) in step with the collection's products.
export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request)

  try {
    const collectionId = payload?.id
    if (collectionId) {
      const n = await handleCollectionChange(shop, admin, String(collectionId))
      if (n) console.log(`[cartx][${topic}] refreshed collection ${collectionId} in ${n} theme config(s) for ${shop}`)
    }
  } catch (err) {
    // Swallow + report: a non-200 makes Shopify retry forever on a bad payload.
    console.error(`[cartx][${topic}] collection refresh failed for ${shop}:`, err)
    captureException(err, { tags: { area: 'collection_products', topic }, extra: { shop, collection_id: payload?.id } })
  }

  return new Response()
}
