import { EvaluateCartRequestSchema } from '../lib/schemas.js'
import { loadConfig } from '../lib/config.server.js'
import { adjustedTotal, adjustedQty, isFrozenPage } from '../lib/helpers.server.js'
import { evaluateOffers } from '../lib/evaluate/triggers.server.js'
import { buildBar, getRibbonFromBar } from '../lib/evaluate/bar.server.js'
import { resolveAvailableCoupons } from '../lib/evaluate/coupons.server.js'
import { resolveClaimGifts } from '../lib/evaluate/claims.server.js'
import { checkRateLimit } from '../lib/rate-limit.server.js'
import db from '../db.server.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  })
}

// Handle CORS preflight
export const loader = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  return jsonResponse({ error: 'POST required' }, 405)
}

export const action = async ({ request }) => {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // 1. Parse + validate
  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const parsed = EvaluateCartRequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse(
      { error: 'Validation failed', details: parsed.error.flatten() },
      400
    )
  }

  const { cart, page, customer, shop_id: shopId, theme_id: themeId } = parsed.data

  // 2. Rate limiting
  const rateResult = checkRateLimit(shopId)
  if (!rateResult.allowed) {
    return jsonResponse(
      { error: 'Rate limit exceeded' },
      429
    )
  }

  // 3. Validate shop is installed
  const session = await db.session.findFirst({ where: { shop: shopId } })
  if (!session) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // 4. Frozen page check
  if (isFrozenPage(page)) {
    return jsonResponse({
      frozen: true,
      to_add: [],
      to_remove: [],
      bar: null,
      ribbon_message: null,
      ribbon_code: null,
      oos_message: null,
      applied_coupons: [],
      available_coupons: [],
      total_savings: 0,
      claim_gifts: null,
      unavailable_variants: [],
      cross_page_removal_notices: [],
    })
  }

  // 5. Load config
  const config = await loadConfig(shopId, themeId)

  // 6. Compute adjusted totals (excluding freebie lines)
  const cartItems = cart.items || []
  const adjTotal = adjustedTotal(cartItems)
  const adjQty = adjustedQty(cartItems)

  // 7. Evaluate offers → to_add
  const offerResult = evaluateOffers(
    config.offers,
    cart,
    adjTotal,
    adjQty,
    page,
    customer
  )

  // 8. Build bar
  const bar = buildBar(config, page, customer, adjTotal, adjQty)
  const { ribbon_message, ribbon_code } = getRibbonFromBar(bar)

  // 9. Coupons
  const availableCoupons = resolveAvailableCoupons(
    config.coupons,
    cart,
    page,
    customer
  )
  const appliedCoupons = availableCoupons.filter((c) => c.applied)
  const totalSavings = cart.total_discount || 0

  // 10. Claim gifts
  const claimGifts = resolveClaimGifts(
    config.claim_gifts,
    cart,
    adjTotal,
    adjQty,
    page,
    customer
  )

  // 11. Remove claimed items whose threshold is no longer met
  const toRemove = []
  for (const item of cartItems) {
    if (
      item.properties?.['_claimed'] !== 'true' &&
      item.properties?.['_cartmax_claim'] !== 'true'
    ) continue
    const claimId = item.properties?.['_offer_id']
    if (!claimId) continue
    const rule = config.claim_gifts.find((g) => g.id === claimId && g.enabled)
    if (!rule) {
      // Rule deleted or disabled — remove the claimed item
      toRemove.push(item.key)
      continue
    }
    const currentValue = rule.trigger.type === 'price' ? adjTotal : adjQty
    if (currentValue < rule.trigger.threshold) {
      toRemove.push(item.key)
    }
  }

  // 12. Bottom ribbon OOS override
  const oosMessage = config.bottom_ribbon.enabled
    ? config.bottom_ribbon.oos_message_override || null
    : null

  return jsonResponse({
    frozen: false,
    to_add: offerResult.to_add,
    to_remove: toRemove,
    bar,
    ribbon_message,
    ribbon_code,
    oos_message: oosMessage,
    applied_coupons: appliedCoupons,
    available_coupons: availableCoupons,
    total_savings: totalSavings,
    claim_gifts: claimGifts,
    unavailable_variants: [],
    cross_page_removal_notices: [],
    drawer: config.drawer,
  })
}
