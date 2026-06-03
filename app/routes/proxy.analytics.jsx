import { createHmac, timingSafeEqual } from 'crypto'
import { checkRateLimit } from '../lib/rate-limit.server.js'
import { recordEventBatch } from '../lib/analytics.server.js'
import { ANALYTICS_BOUNDS, ANALYTICS_SOURCES } from '../lib/analytics-events.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const VALID_SOURCES_FOR_PROXY = new Set([
  ANALYTICS_SOURCES.DRAWER,
  ANALYTICS_SOURCES.WEB_PIXEL,
])

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS })
}

function verifyProxyHmac(requestUrl) {
  const secret = process.env.SHOPIFY_API_SECRET
  if (!secret) return false

  const params = new URL(requestUrl).searchParams
  const signature = params.get('signature')
  if (!signature) return false

  const pairs = []
  for (const [key, value] of params.entries()) {
    if (key !== 'signature') pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  const message = pairs.join('')
  const computed = createHmac('sha256', secret).update(message).digest('hex')
  try {
    return timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex'),
    )
  } catch {
    return false
  }
}

export const loader = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  return jsonResponse({ error: 'POST required' }, 405)
}

export const action = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (!verifyProxyHmac(request.url)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const shopId = url.searchParams.get('shop')
  if (!shopId) {
    return jsonResponse({ error: 'Missing shop' }, 400)
  }

  const rateResult = checkRateLimit(`analytics:${shopId}`, { limit: 60 })
  if (!rateResult.allowed) {
    return jsonResponse(
      { error: 'Rate limit exceeded', retry_after: rateResult.retryAfter },
      429,
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const events = Array.isArray(body?.events) ? body.events : null
  if (!events || events.length === 0) {
    return jsonResponse({ accepted: 0, dropped: 0, reasons: {} })
  }
  if (events.length > ANALYTICS_BOUNDS.MAX_BATCH_SIZE) {
    return jsonResponse(
      { error: `Batch too large (max ${ANALYTICS_BOUNDS.MAX_BATCH_SIZE})` },
      413,
    )
  }

  const requestedSource = typeof body.source === 'string' ? body.source : ANALYTICS_SOURCES.DRAWER
  if (!VALID_SOURCES_FOR_PROXY.has(requestedSource)) {
    return jsonResponse({ error: 'Invalid source' }, 400)
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id : null
  const enriched = sessionId
    ? events.map((e) => ({ session_id: sessionId, ...e }))
    : events

  const result = await recordEventBatch(shopId, requestedSource, enriched)
  return jsonResponse(result)
}
