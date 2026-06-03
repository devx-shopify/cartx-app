import db from '../db.server.js'
import {
  ANALYTICS_BOUNDS,
  ANALYTICS_EVENTS as EVENTS,
  SHOP_WIDE_PROMOTION_ID,
  isValidEventName,
  isValidSource,
} from './analytics-events.js'

export {
  ANALYTICS_EVENTS,
  ANALYTICS_SOURCES,
  SHOP_WIDE_PROMOTION_ID,
} from './analytics-events.js'

const DROP_REASONS = {
  INVALID_EVENT: 'invalid_event',
  INVALID_SOURCE: 'invalid_source',
  OUT_OF_WINDOW: 'out_of_window',
  MISSING_OCCURRED_AT: 'missing_occurred_at',
  INTERNAL_ERROR: 'internal_error',
}

function clampInt(value, max) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n < 0) return 0
  if (n > max) return max
  return Math.round(n)
}

function parseOccurredAt(raw) {
  if (!raw) return null
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  const now = Date.now()
  const ts = date.getTime()
  if (ts < now - ANALYTICS_BOUNDS.MAX_PAST_MS) return null
  if (ts > now + ANALYTICS_BOUNDS.MAX_FUTURE_MS) return null
  return date
}

function normalizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return null
  return meta
}

// Map an incoming event payload into a Prisma-shaped row, or return null with a reason.
function shapeEvent(shopId, source, raw) {
  if (!isValidEventName(raw?.event)) {
    return { row: null, reason: DROP_REASONS.INVALID_EVENT }
  }
  if (!isValidSource(source)) {
    return { row: null, reason: DROP_REASONS.INVALID_SOURCE }
  }
  const occurredAt = parseOccurredAt(raw.occurred_at ?? raw.occurredAt)
  if (!occurredAt) {
    return {
      row: null,
      reason: raw.occurred_at || raw.occurredAt
        ? DROP_REASONS.OUT_OF_WINDOW
        : DROP_REASONS.MISSING_OCCURRED_AT,
    }
  }
  return {
    row: {
      shopId,
      event: raw.event,
      source,
      promotionId: raw.promotion_id ?? raw.promotionId ?? null,
      promotionType: raw.promotion_type ?? raw.promotionType ?? null,
      customerId: raw.customer_id ?? raw.customerId ?? null,
      sessionId: raw.session_id ?? raw.sessionId ?? null,
      cartTotal: clampInt(raw.cart_total ?? raw.cartTotal, ANALYTICS_BOUNDS.MAX_CART_CENTS),
      itemCount: clampInt(raw.item_count ?? raw.itemCount, ANALYTICS_BOUNDS.MAX_ITEM_COUNT),
      revenue: clampInt(raw.revenue, ANALYTICS_BOUNDS.MAX_CART_CENTS),
      metadata: normalizeMetadata(raw.metadata),
      occurredAt,
    },
    reason: null,
  }
}

/**
 * Persist a single event. Returns the created row, or null if validation failed.
 */
export async function recordEvent(shopId, source, payload) {
  if (!shopId) return null
  const { row } = shapeEvent(shopId, source, payload)
  if (!row) return null
  try {
    return await db.analyticsEvent.create({ data: row })
  } catch (err) {
    console.error('[cartx][analytics] recordEvent failed:', err)
    return null
  }
}

/**
 * Persist a batch of events. Splits into accepted vs dropped, never throws.
 * @returns {{ accepted: number, dropped: number, reasons: Record<string, number> }}
 */
export async function recordEventBatch(shopId, source, payloads) {
  const result = { accepted: 0, dropped: 0, reasons: {} }
  if (!shopId || !Array.isArray(payloads) || payloads.length === 0) {
    return result
  }

  const rows = []
  for (const raw of payloads) {
    const { row, reason } = shapeEvent(shopId, source, raw)
    if (row) {
      rows.push(row)
    } else {
      result.dropped += 1
      result.reasons[reason] = (result.reasons[reason] ?? 0) + 1
    }
  }

  if (rows.length === 0) return result

  try {
    const created = await db.analyticsEvent.createMany({ data: rows })
    result.accepted = created.count ?? rows.length
  } catch (err) {
    console.error('[cartx][analytics] recordEventBatch failed:', err)
    result.dropped += rows.length
    result.reasons[DROP_REASONS.INTERNAL_ERROR] =
      (result.reasons[DROP_REASONS.INTERNAL_ERROR] ?? 0) + rows.length
  }

  return result
}

/**
 * Raw event read for drill-down / debugging. Caller is responsible for shop scoping.
 */
export async function queryEvents(shopId, { from, to, event, promotionId, limit = 100 } = {}) {
  if (!shopId) return []
  const where = { shopId }
  if (from || to) {
    where.occurredAt = {}
    if (from) where.occurredAt.gte = from instanceof Date ? from : new Date(from)
    if (to) where.occurredAt.lte = to instanceof Date ? to : new Date(to)
  }
  if (event) where.event = event
  if (promotionId) where.promotionId = promotionId

  return db.analyticsEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: Math.min(limit, 500),
  })
}

/**
 * Aggregated read for the dashboard. Returns rows ordered by date asc.
 */
export async function queryDailyStats(shopId, { from, to, promotionId } = {}) {
  if (!shopId) return []
  const where = { shopId }
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = typeof from === 'string' ? from : toIsoDate(from)
    if (to) where.date.lte = typeof to === 'string' ? to : toIsoDate(to)
  }
  if (promotionId) where.promotionId = promotionId

  return db.dailyStats.findMany({
    where,
    orderBy: [{ date: 'asc' }, { promotionId: 'asc' }],
  })
}

function toIsoDate(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.toISOString().slice(0, 10)
}

const RANGE_DEFAULT_DAYS = 30

function defaultRange() {
  const to = new Date()
  to.setUTCHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - (RANGE_DEFAULT_DAYS - 1))
  from.setUTCHours(0, 0, 0, 0)
  return { from, to }
}

function parseDateBound(raw, fallback) {
  if (!raw) return fallback
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? fallback : d
}

function eachDay(from, to) {
  const days = []
  const cursor = new Date(from)
  cursor.setUTCHours(0, 0, 0, 0)
  const endStamp = new Date(to)
  endStamp.setUTCHours(0, 0, 0, 0)
  while (cursor.getTime() <= endStamp.getTime()) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

// Coverage threshold for the DailyStats short-circuit. If at least this fraction
// of days in the requested range has a row in DailyStats, we trust the rollup
// and skip the live aggregation entirely. Today's bucket is intentionally
// excluded from the coverage check since the rollup runs hourly and the most
// recent day is always partial.
const DAILYSTATS_COVERAGE_THRESHOLD = 0.8

/**
 * Aggregate analytics for the admin dashboard.
 *
 * Returns:
 *   {
 *     range: { from, to },
 *     summary: { impressions, claims, claimRate, revenue, orders, aovWithPromo, aovWithoutPromo, aovLift },
 *     daily:   [{ date, impressions, claims, revenue }],
 *     promotions: [{ id, type, impressions, claims, removals, upsellAdds, couponApplies, orders, revenue, conversionRate, aov }],
 *     source:  'daily_stats' | 'live'
 *   }
 *
 * Path selection:
 * - If DailyStats covers >=80% of completed days in the range, build the
 *   dashboard from DailyStats (cheap).
 * - Otherwise live-aggregate over AnalyticsEvent with two raw queries.
 */
export async function getDashboardData(shopId, { from, to } = {}) {
  if (!shopId) return emptyDashboard()
  const range = (() => {
    const def = defaultRange()
    return {
      from: parseDateBound(from, def.from),
      to: parseDateBound(to, def.to),
    }
  })()

  // Try the rollup short-circuit first.
  const fromDate = toIsoDate(range.from)
  const toDate = toIsoDate(range.to)
  const dailyStatsRows = await db.dailyStats.findMany({
    where: { shopId, date: { gte: fromDate, lte: toDate } },
    orderBy: [{ date: 'asc' }, { promotionId: 'asc' }],
  })
  if (dailyStatsRows.length > 0) {
    const todayStr = toIsoDate(new Date())
    const completedDays = eachDay(range.from, range.to).filter((d) => d < todayStr)
    if (completedDays.length === 0) {
      // Range is just today — DailyStats can't possibly cover it. Skip.
    } else {
      const covered = new Set(dailyStatsRows.filter((r) => r.date < todayStr).map((r) => r.date))
      const coverage = covered.size / completedDays.length
      if (coverage >= DAILYSTATS_COVERAGE_THRESHOLD) {
        return await buildFromDailyStats(shopId, range, dailyStatsRows)
      }
    }
  }

  // 1. Per-promotion rollup.
  const perPromo = await db.$queryRaw`
    SELECT
      "promotionId",
      "promotionType",
      "event",
      COUNT(*)::int AS count,
      COALESCE(SUM("revenue"), 0)::bigint AS revenue
    FROM "AnalyticsEvent"
    WHERE "shopId" = ${shopId}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" <= ${range.to}
    GROUP BY "promotionId", "promotionType", "event"
  `

  // 2. Per-day rollup.
  const perDay = await db.$queryRaw`
    SELECT
      to_char(date_trunc('day', "occurredAt"), 'YYYY-MM-DD') AS date,
      "event",
      COUNT(*)::int AS count,
      COALESCE(SUM("revenue"), 0)::bigint AS revenue
    FROM "AnalyticsEvent"
    WHERE "shopId" = ${shopId}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" <= ${range.to}
    GROUP BY date, "event"
    ORDER BY date ASC
  `

  // Daily trend — zero-fill so the chart doesn't have gaps.
  const dailyMap = new Map()
  for (const day of eachDay(range.from, range.to)) {
    dailyMap.set(day, { date: day, impressions: 0, claims: 0, revenue: 0 })
  }
  for (const row of perDay) {
    const bucket = dailyMap.get(row.date)
    if (!bucket) continue
    if (row.event === EVENTS.PROMOTION_VIEWED) bucket.impressions += row.count
    else if (row.event === EVENTS.GIFT_CLAIMED) bucket.claims += row.count
    else if (row.event === EVENTS.ORDER_ATTRIBUTED) bucket.revenue += Number(row.revenue)
  }

  // Per-promotion rollup.
  const promoMap = new Map()
  function bucket(id, type) {
    let b = promoMap.get(id)
    if (!b) {
      b = {
        id,
        type: type || null,
        impressions: 0,
        claims: 0,
        removals: 0,
        upsellAdds: 0,
        couponApplies: 0,
        orders: 0,
        revenue: 0,
      }
      promoMap.set(id, b)
    }
    if (!b.type && type) b.type = type
    return b
  }
  for (const row of perPromo) {
    if (!row.promotionId) continue
    const b = bucket(row.promotionId, row.promotionType)
    const n = row.count
    const r = Number(row.revenue)
    switch (row.event) {
      case EVENTS.PROMOTION_VIEWED: b.impressions += n; break
      case EVENTS.GIFT_CLAIMED:     b.claims += n; break
      case EVENTS.GIFT_REMOVED:     b.removals += n; break
      case EVENTS.UPSELL_ADDED:     b.upsellAdds += n; break
      case EVENTS.COUPON_APPLIED:   b.couponApplies += n; break
      case EVENTS.ORDER_ATTRIBUTED: b.orders += n; b.revenue += r; break
    }
  }

  // Strip the shop-wide bucket from the per-promotion table; it powers AOV-without instead.
  const shopBucket = promoMap.get(SHOP_WIDE_PROMOTION_ID)
  promoMap.delete(SHOP_WIDE_PROMOTION_ID)

  // Shop-wide counts come from the `_shop` bucket OR from rolling up across
  // every promotion. We use the shop bucket for orders (ground truth from the
  // orders/create webhook), and per-promo for impressions/claims (the only
  // place they exist).
  let shopOrders = 0
  let shopRevenue = 0
  for (const row of perPromo) {
    if (row.promotionId !== SHOP_WIDE_PROMOTION_ID) continue
    if (row.event === EVENTS.ORDER_COMPLETED) {
      shopOrders += row.count
      shopRevenue += Number(row.revenue)
    }
  }
  void shopBucket // reserved for future shop-only KPIs

  const promotions = Array.from(promoMap.values()).map((b) => ({
    ...b,
    conversionRate: b.impressions > 0 ? b.claims / b.impressions : 0,
    aov: b.orders > 0 ? b.revenue / b.orders : 0,
  }))

  // Attach promotion names by reading ThemeConfig blobs for this shop.
  const themeConfigs = await db.themeConfig.findMany({
    where: { shopId },
    select: { config: true },
  })
  const idToName = new Map()
  for (const tc of themeConfigs) {
    let parsed
    try { parsed = JSON.parse(tc.config) } catch { continue }
    for (const arr of ['offers', 'coupons', 'claim_gifts']) {
      for (const item of (parsed?.[arr] ?? [])) {
        if (item?.id) idToName.set(item.id, item.name || item.title || item.code || item.id)
      }
    }
  }
  for (const p of promotions) {
    p.name = idToName.get(p.id) || p.id
  }
  promotions.sort((a, b) => b.revenue - a.revenue || b.impressions - a.impressions)

  // Summary cards.
  const totalImpressions = promotions.reduce((sum, p) => sum + p.impressions, 0)
  const totalClaims = promotions.reduce((sum, p) => sum + p.claims, 0)
  const attributedRevenue = promotions.reduce((sum, p) => sum + p.revenue, 0)
  const attributedOrderCount = promotions.reduce((sum, p) => sum + p.orders, 0)
  const claimRate = totalImpressions > 0 ? totalClaims / totalImpressions : 0
  // Note: shop-wide AOV includes attributed orders too. Splitting these out
  // cleanly requires per-order joins; this is a v1 directional metric.
  const aovWithPromo = attributedOrderCount > 0 ? attributedRevenue / attributedOrderCount : 0
  const aovWithoutPromo = shopOrders > 0 ? shopRevenue / shopOrders : 0
  const aovLift = aovWithoutPromo > 0
    ? (aovWithPromo - aovWithoutPromo) / aovWithoutPromo
    : 0

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    summary: {
      impressions: totalImpressions,
      claims: totalClaims,
      claimRate,
      revenue: attributedRevenue,
      orders: shopOrders,
      aovWithPromo,
      aovWithoutPromo,
      aovLift,
    },
    daily: Array.from(dailyMap.values()),
    promotions,
    source: 'live',
  }
}

async function buildFromDailyStats(shopId, range, rows) {
  // Promotion-level rollup.
  const promoMap = new Map()
  let shopOrders = 0
  let shopRevenue = 0
  for (const row of rows) {
    if (row.promotionId === SHOP_WIDE_PROMOTION_ID) {
      shopOrders += row.orders
      shopRevenue += row.revenue
      continue
    }
    let b = promoMap.get(row.promotionId)
    if (!b) {
      b = {
        id: row.promotionId,
        type: null,
        impressions: 0, claims: 0, removals: 0,
        upsellAdds: 0, couponApplies: 0,
        orders: 0, revenue: 0,
      }
      promoMap.set(row.promotionId, b)
    }
    b.impressions += row.impressions
    b.claims += row.claims
    b.removals += row.removals
    b.upsellAdds += row.upsellAdds
    b.couponApplies += row.couponApplies
    b.orders += row.orders
    b.revenue += row.revenue
  }

  // Daily series — zero-fill any missing days.
  const dailyMap = new Map()
  for (const day of eachDay(range.from, range.to)) {
    dailyMap.set(day, { date: day, impressions: 0, claims: 0, revenue: 0 })
  }
  for (const row of rows) {
    const bucket = dailyMap.get(row.date)
    if (!bucket) continue
    bucket.impressions += row.impressions
    bucket.claims += row.claims
    bucket.revenue += row.revenue
  }

  // Promotion-type backfill from ThemeConfig (DailyStats doesn't store type).
  const themeConfigs = await db.themeConfig.findMany({
    where: { shopId },
    select: { config: true },
  })
  const idToName = new Map()
  const idToType = new Map()
  for (const tc of themeConfigs) {
    let parsed
    try { parsed = JSON.parse(tc.config) } catch { continue }
    for (const [arr, type] of [['offers', 'offer'], ['coupons', 'coupon'], ['claim_gifts', 'claim-gift']]) {
      for (const item of (parsed?.[arr] ?? [])) {
        if (item?.id) {
          idToName.set(item.id, item.name || item.title || item.code || item.id)
          idToType.set(item.id, type)
        }
      }
    }
  }

  const promotions = Array.from(promoMap.values()).map((b) => ({
    ...b,
    name: idToName.get(b.id) || b.id,
    type: idToType.get(b.id) || b.type,
    conversionRate: b.impressions > 0 ? b.claims / b.impressions : 0,
    aov: b.orders > 0 ? b.revenue / b.orders : 0,
  }))
  promotions.sort((a, b) => b.revenue - a.revenue || b.impressions - a.impressions)

  const totalImpressions = promotions.reduce((s, p) => s + p.impressions, 0)
  const totalClaims = promotions.reduce((s, p) => s + p.claims, 0)
  const attributedRevenue = promotions.reduce((s, p) => s + p.revenue, 0)
  const attributedOrderCount = promotions.reduce((s, p) => s + p.orders, 0)
  const claimRate = totalImpressions > 0 ? totalClaims / totalImpressions : 0
  const aovWithPromo = attributedOrderCount > 0 ? attributedRevenue / attributedOrderCount : 0
  const aovWithoutPromo = shopOrders > 0 ? shopRevenue / shopOrders : 0
  const aovLift = aovWithoutPromo > 0 ? (aovWithPromo - aovWithoutPromo) / aovWithoutPromo : 0

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    summary: {
      impressions: totalImpressions,
      claims: totalClaims,
      claimRate,
      revenue: attributedRevenue,
      orders: shopOrders,
      aovWithPromo,
      aovWithoutPromo,
      aovLift,
    },
    daily: Array.from(dailyMap.values()),
    promotions,
    source: 'daily_stats',
  }
}

function emptyDashboard() {
  return {
    range: { from: null, to: null },
    summary: {
      impressions: 0, claims: 0, claimRate: 0, revenue: 0,
      orders: 0, aovWithPromo: 0, aovWithoutPromo: 0, aovLift: 0,
    },
    daily: [],
    promotions: [],
  }
}
