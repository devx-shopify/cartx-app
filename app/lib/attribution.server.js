import db from '../db.server.js'
import {
  ANALYTICS_EVENTS,
  ANALYTICS_SOURCES,
  SHOP_WIDE_PROMOTION_ID,
} from './analytics-events.js'

// Parse a Shopify Admin REST order JSON into a list of analytics rows.
//
// Logic:
// - Group line items by `_offer_id` line item property.
// - Always emit one shop-wide `order_completed` row for the whole order.
// - For each promotion group, attribute revenue using this model:
//     - If the matched lines have non-zero subtotal (e.g. volume_discount),
//       attribute the sum of those line subtotals — that's the revenue the
//       promotion produced directly.
//     - If the matched lines are all free (GWP / claim-gift — discount
//       function zeroed them at checkout), attribute the non-freebie portion
//       of the order instead — i.e. the cart total minus all `_freebie`
//       lines. That's the spend the customer made to unlock the gift.
//   When multiple GWPs trigger on the same order each gets full credit; this
//   over-counts but is transparent and useful in v1.
//
// All amounts are in the order's presentment currency, stored as integer cents.
// Shopify REST returns string decimals like "29.95" — convert to cents safely.

const DOLLARS_TO_CENTS = 100

function toCents(value) {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Math.round(value * DOLLARS_TO_CENTS)
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * DOLLARS_TO_CENTS)
}

function lineSubtotalCents(line) {
  // `price` is the per-unit price. Shopify also returns `total_discount` per
  // line that we subtract to get the actual revenue captured for that line.
  const gross = toCents(line.price) * (line.quantity ?? 1)
  const discount = toCents(line.total_discount)
  return Math.max(0, gross - discount)
}

function readOfferId(line) {
  const props = line.properties
  if (!Array.isArray(props)) return null
  for (const p of props) {
    if (p && p.name === '_offer_id') return p.value || null
  }
  return null
}

function readClaimFlag(line) {
  const props = line.properties
  if (!Array.isArray(props)) return false
  for (const p of props) {
    if (p && p.name === '_cartmax_claim' && p.value === 'true') return true
  }
  return false
}

function readFreebieFlag(line) {
  const props = line.properties
  if (!Array.isArray(props)) return false
  for (const p of props) {
    if (p && p.name === '_freebie' && p.value === 'true') return true
  }
  return false
}

/**
 * Attribute a Shopify order to cartx promotions.
 *
 * Idempotent on `order.id`: re-running for the same order is a no-op.
 *
 * @param {string} shopId
 * @param {object} order — Shopify REST order payload from the orders/create webhook
 * @returns {Promise<{ orderId: string, attributed: number, alreadyProcessed: boolean }>}
 */
export async function attributeOrder(shopId, order) {
  if (!shopId || !order || !order.id) {
    return { orderId: null, attributed: 0, alreadyProcessed: false }
  }
  const orderId = String(order.id)

  // Idempotency: if we already wrote any row for this order, bail out.
  const existing = await db.analyticsEvent.findFirst({
    where: {
      shopId,
      event: ANALYTICS_EVENTS.ORDER_COMPLETED,
      metadata: { path: ['order_id'], equals: orderId },
    },
    select: { id: true },
  })
  if (existing) {
    return { orderId, attributed: 0, alreadyProcessed: true }
  }

  const occurredAt = order.created_at ? new Date(order.created_at) : new Date()
  const totalCents = toCents(order.total_price)
  const customerId = order.customer?.id ? String(order.customer.id) : null
  const orderIdMeta = { order_id: orderId }

  // First pass: total up freebie revenue so we can compute the non-freebie
  // portion of the order (used as the GWP attribution revenue).
  let freebieTotalCents = 0
  for (const line of order.line_items || []) {
    if (readFreebieFlag(line)) {
      freebieTotalCents += lineSubtotalCents(line)
    }
  }
  // `subtotal_price` excludes shipping/tax; closer to "cart total" than `total_price`.
  const orderSubtotalCents = toCents(order.subtotal_price) || totalCents
  const nonFreebieCents = Math.max(0, orderSubtotalCents - freebieTotalCents)

  // Second pass: bucket by promotion.
  const groups = new Map() // offer_id -> { lineRevenue, lineIds, lineCount, claim, allFreebies }
  for (const line of order.line_items || []) {
    const offerId = readOfferId(line)
    if (!offerId) continue
    const isClaim = readClaimFlag(line)
    const isFreebie = readFreebieFlag(line)
    const bucket = groups.get(offerId) ?? {
      lineRevenue: 0,
      lineIds: [],
      lineCount: 0,
      claim: false,
      allFreebies: true,
    }
    bucket.lineRevenue += lineSubtotalCents(line)
    bucket.lineIds.push(String(line.id))
    bucket.lineCount += line.quantity ?? 1
    if (isClaim) bucket.claim = true
    if (!isFreebie) bucket.allFreebies = false
    groups.set(offerId, bucket)
  }

  const rows = []
  rows.push({
    shopId,
    event: ANALYTICS_EVENTS.ORDER_COMPLETED,
    source: ANALYTICS_SOURCES.SERVER,
    promotionId: SHOP_WIDE_PROMOTION_ID,
    customerId,
    cartTotal: totalCents,
    revenue: totalCents,
    metadata: orderIdMeta,
    occurredAt,
  })

  for (const [offerId, bucket] of groups.entries()) {
    // GWP / claim-gift: matched lines are all freebies → credit promotion
    // with the spend the customer made to unlock them.
    // Volume discount / other: matched lines carry real revenue → use that.
    const attribution = bucket.allFreebies ? nonFreebieCents : bucket.lineRevenue
    rows.push({
      shopId,
      event: ANALYTICS_EVENTS.ORDER_ATTRIBUTED,
      source: ANALYTICS_SOURCES.SERVER,
      promotionId: offerId,
      promotionType: bucket.claim ? 'claim-gift' : 'offer',
      customerId,
      cartTotal: totalCents,
      revenue: attribution,
      metadata: {
        order_id: orderId,
        line_item_ids: bucket.lineIds,
        line_quantity: bucket.lineCount,
        attribution_mode: bucket.allFreebies ? 'non_freebie_subtotal' : 'line_subtotal',
      },
      occurredAt,
    })
  }

  await db.analyticsEvent.createMany({ data: rows })
  return { orderId, attributed: groups.size, alreadyProcessed: false }
}
