import { authenticate } from '../shopify.server'
import { attributeOrder } from '../lib/attribution.server.js'
import { captureException } from '../lib/sentry.server.js'

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request)

  try {
    const result = await attributeOrder(shop, payload)
    if (result.alreadyProcessed) {
      console.log(`[cartx][${topic}] order ${result.orderId} already processed (duplicate delivery)`)
    } else {
      console.log(
        `[cartx][${topic}] attributed order ${result.orderId} to ${result.attributed} promotion(s) for ${shop}`,
      )
    }
  } catch (err) {
    // Swallow — returning non-200 triggers Shopify retries, and we don't want
    // a single bad payload to loop forever. But report it: a swallowed error
    // here means order attribution (revenue analytics) is silently breaking.
    console.error(`[cartx][${topic}] attribution failed for ${shop}:`, err)
    captureException(err, {
      tags: { area: 'order_attribution', topic },
      extra: { shop, order_id: payload?.id },
    })
  }

  return new Response()
}
