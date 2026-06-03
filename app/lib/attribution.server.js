import db from '../db.server.js'
import {
  ANALYTICS_EVENTS,
  ANALYTICS_SOURCES,
  SHOP_WIDE_PROMOTION_ID,
} from './analytics-events.js'

// Parse a Shopify Admin REST order JSON into a list of analytics rows.
//
// Two attribution paths:
//
// 1. Line-property path (`_offer_id`) — GWP, claim-gift, and other offers
//    that tag the lines they affect. For each group:
//      - GWP/claim-gift (matched lines are all freebies → discount function
//        zeroed them): credit the order's `subtotal_price` (the customer's
//        non-freebie spend that unlocked the gift).
//      - Volume discount or other revenue-producing lines: credit the sum of
//        post-discount line subtotals.
//
// 2. Discount-application path (cartx volume_discount) — Shopify Functions
//    cart discounts that change line prices without adding `_offer_id`.
//    Match `order.discount_applications[].title` against the known cartx
//    volume_discount title, walk each line's `discount_allocations` to find
//    the lines it touched, then look up the cartx offer that owns that
//    variant via the volume_discount config in `ThemeConfig`. Credit each
//    matched line's post-discount subtotal to the corresponding offer.
//
// When the same promotion attribution exists in both paths, the second pass
// merges into the same bucket so we don't double-write rows.
//
// All amounts are in the order's presentment currency, stored as integer cents.
// Shopify REST returns string decimals like "29.95" — convert to cents safely.

const DOLLARS_TO_CENTS = 100
const VOLUME_DISCOUNT_STORE_KEY = '__volume_discount__'
const VOLUME_DISCOUNT_TITLE = 'cartx volume discount'

function toCents(value) {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Math.round(value * DOLLARS_TO_CENTS)
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * DOLLARS_TO_CENTS)
}

function lineSubtotalCents(line) {
  // `price` is the per-unit price. Subtract every discount the line carries:
  // - `total_discount` is the legacy Shopify Scripts field (often 0)
  // - `discount_allocations[].amount` is where Shopify Functions / discount
  //   codes land. We MUST include these, otherwise freebies look like full
  //   revenue lines.
  const gross = toCents(line.price) * (line.quantity ?? 1)
  let discount = toCents(line.total_discount)
  if (Array.isArray(line.discount_allocations)) {
    for (const a of line.discount_allocations) {
      discount += toCents(a.amount)
    }
  }
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

function normalizeVariantId(id) {
  if (id === null || id === undefined) return null
  const s = String(id)
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

/**
 * Load the cartx volume_discount config and build a variant_id → offer_id map.
 * Returns an empty map if the shop has no volume_discount offers configured.
 */
async function loadVolumeOfferMap(shopId) {
  const record = await db.themeConfig.findUnique({
    where: { shopId_themeId: { shopId, themeId: VOLUME_DISCOUNT_STORE_KEY } },
    select: { config: true },
  })
  const result = new Map()
  if (!record) return result
  let payload
  try {
    payload = JSON.parse(record.config)
    if (!payload?.functionConfig) return result
    payload = JSON.parse(payload.functionConfig)
  } catch {
    return result
  }
  for (const offer of payload?.offers ?? []) {
    if (!offer?.offer_id) continue
    for (const vid of offer.variant_ids ?? []) {
      const norm = normalizeVariantId(vid)
      if (norm) result.set(norm, offer.offer_id)
    }
  }
  return result
}

/**
 * Find the indices of `order.discount_applications` that correspond to the
 * cartx volume_discount Function. Title-based — that's what we control via
 * `DISCOUNT_TITLE` in volume-discount.server.js.
 */
function findVolumeApplicationIndices(order) {
  const indices = new Set()
  const apps = order.discount_applications
  if (!Array.isArray(apps)) return indices
  apps.forEach((app, i) => {
    if (!app) return
    if (typeof app.title === 'string' && app.title.toLowerCase() === VOLUME_DISCOUNT_TITLE) {
      indices.add(i)
    }
  })
  return indices
}

function lineHasAllocationFrom(line, indices) {
  if (!Array.isArray(line.discount_allocations) || indices.size === 0) return false
  for (const a of line.discount_allocations) {
    if (a && indices.has(a.discount_application_index)) return true
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

  // `subtotal_price` is the line total AFTER all line-level discounts
  // (including Shopify Functions zeroing freebies) and BEFORE shipping/tax.
  // Freebies are already at $0 in this number, so it equals what the
  // customer paid for non-freebie lines — exactly the revenue we want to
  // credit to GWP / claim-gift promotions.
  const orderSubtotalCents = toCents(order.subtotal_price) || totalCents

  // Bucket by promotion.
  // promotionType: 'offer' | 'claim-gift' (default 'offer'; set from claim flag).
  const groups = new Map() // offer_id -> { lineRevenue, lineIds, lineCount, claim, allFreebies, source }
  function bucketFor(offerId, source) {
    let b = groups.get(offerId)
    if (!b) {
      b = {
        lineRevenue: 0,
        lineIds: [],
        lineCount: 0,
        claim: false,
        allFreebies: true,
        source, // 'line_property' | 'volume_discount'
      }
      groups.set(offerId, b)
    }
    return b
  }

  // Pass 1: line-property attribution (`_offer_id`).
  for (const line of order.line_items || []) {
    const offerId = readOfferId(line)
    if (!offerId) continue
    const isClaim = readClaimFlag(line)
    const isFreebie = readFreebieFlag(line)
    const bucket = bucketFor(offerId, 'line_property')
    bucket.lineRevenue += lineSubtotalCents(line)
    bucket.lineIds.push(String(line.id))
    bucket.lineCount += line.quantity ?? 1
    if (isClaim) bucket.claim = true
    if (!isFreebie) bucket.allFreebies = false
  }

  // Pass 2: volume_discount attribution via discount_applications.
  const volumeIndices = findVolumeApplicationIndices(order)
  if (volumeIndices.size > 0) {
    const variantToOffer = await loadVolumeOfferMap(shopId)
    if (variantToOffer.size > 0) {
      for (const line of order.line_items || []) {
        if (!lineHasAllocationFrom(line, volumeIndices)) continue
        const variantId = normalizeVariantId(line.variant_id)
        const offerId = variantToOffer.get(variantId)
        if (!offerId) continue
        // Skip if this line was already credited via `_offer_id` to the same
        // offer — avoids double-counting when both signals point at the same
        // promotion.
        const existing = groups.get(offerId)
        if (existing && existing.lineIds.includes(String(line.id))) continue
        const bucket = bucketFor(offerId, 'volume_discount')
        bucket.lineRevenue += lineSubtotalCents(line)
        bucket.lineIds.push(String(line.id))
        bucket.lineCount += line.quantity ?? 1
        bucket.allFreebies = false
      }
    }
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
    // with the order subtotal (= non-freebie spend, since subtotal_price
    // already excludes the zeroed freebie lines).
    // Volume discount / other: matched lines carry real post-discount
    // revenue → credit that directly.
    const attribution = bucket.allFreebies ? orderSubtotalCents : bucket.lineRevenue
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
        attribution_source: bucket.source,
        attribution_mode: bucket.allFreebies ? 'non_freebie_subtotal' : 'line_subtotal',
      },
      occurredAt,
    })
  }

  await db.analyticsEvent.createMany({ data: rows })
  return { orderId, attributed: groups.size, alreadyProcessed: false }
}
