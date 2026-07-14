import db from '../db.server.js'
import { loadPromotionMeta, promotionStatus } from './promotion-meta.server.js'
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
      promotionName: raw.promotion_name ?? raw.promotionName ?? null,
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

// Snapshot the promotion display name/type onto promotion-scoped rows from the
// shop's live config, so historical rows stay labeled even if the promotion is
// later deleted/recreated. Best-effort: a config-read failure leaves rows as-is.
async function stampPromotionMeta(shopId, rows) {
  const needs = rows.some(
    (r) => r.promotionId &&
      r.promotionId !== SHOP_WIDE_PROMOTION_ID &&
      (!r.promotionName || !r.promotionType),
  )
  if (!needs) return
  let map
  try {
    map = await loadPromotionMeta(shopId)
  } catch (err) {
    console.error('[cartx][analytics] stampPromotionMeta failed:', err)
    return
  }
  for (const r of rows) {
    if (!r.promotionId || r.promotionId === SHOP_WIDE_PROMOTION_ID) continue
    const meta = map.get(r.promotionId)
    if (!meta) continue
    if (!r.promotionName && meta.name) r.promotionName = meta.name
    if (!r.promotionType && meta.type) r.promotionType = meta.type
  }
}

/**
 * Persist a single event. Returns the created row, or null if validation failed.
 */
export async function recordEvent(shopId, source, payload) {
  if (!shopId) return null
  const { row } = shapeEvent(shopId, source, payload)
  if (!row) return null
  await stampPromotionMeta(shopId, [row])
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

  await stampPromotionMeta(shopId, rows)

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

// Friendly label for a promotion id that can't be resolved to a name (deleted
// or recreated — its config entry is gone). A short id suffix keeps rows
// distinguishable without exposing a full UUID.
function unknownPromotionLabel(id) {
  const short = typeof id === 'string' ? id.slice(0, 8) : ''
  return short ? `Deleted promotion (${short})` : 'Deleted promotion'
}

// Type-aware "view → action" rate. Claim-gifts convert a view into a claim;
// auto-add offers have no claim step, so their funnel is view → attributed
// order. Using claims/impressions for offers would always read 0%.
function conversionRateFor(p) {
  if (!p.impressions) return 0
  return p.type === 'claim-gift' ? p.claims / p.impressions : p.orders / p.impressions
}

// Set of promotion ids configured on a single theme's config
// (offers/coupons/claim_gifts). Used to scope the analytics table to the
// selected theme. See Issue 6.
export function themePromotionIds(config) {
  const ids = new Set()
  for (const arr of ['offers', 'coupons', 'claim_gifts']) {
    for (const item of (config?.[arr] ?? [])) {
      if (item?.id) ids.add(item.id)
    }
  }
  return ids
}

// Scope a dashboard's promotions to the selected theme: keep promotions
// configured on that theme, plus — when `showDeleted` — the orphaned rows whose
// promotion no longer exists in any config (status 'deleted'). Promotions that
// belong only to *other* themes stay hidden (switch themes to see them).
export function filterPromotionsForTheme(promotions, themeIds, { showDeleted = false } = {}) {
  return promotions.filter(
    (p) => themeIds.has(p.id) || (showDeleted && p.status === 'deleted'),
  )
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

// ── Timezone-aware day helpers ───────────────────────────
// Day bucketing uses the shop's IANA timezone so "today" and per-day rows line
// up with the merchant's local calendar instead of UTC. (A 11pm IST order would
// otherwise land on the previous UTC day.)

// 'YYYY-MM-DD' civil date of an instant in `tz`. en-CA formats as ISO date.
function civilDate(date, tz = 'UTC') {
  const d = date instanceof Date ? date : new Date(date)
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

// Offset in minutes (+ east of UTC) of `tz` at the given instant.
function tzOffsetMinutes(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]))
  const hour = p.hour === '24' ? '00' : p.hour
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +hour, +p.minute, +p.second)
  return Math.round((asUTC - date.getTime()) / 60000)
}

// Instant of local midnight (start of day) for civil date key 'YYYY-MM-DD' in `tz`.
function startOfLocalDay(key, tz = 'UTC') {
  const [y, m, d] = key.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const offset = tzOffsetMinutes(guess, tz)
  return new Date(guess.getTime() - offset * 60000)
}

// Add `n` days to a 'YYYY-MM-DD' key (pure calendar math, tz-independent).
function addDaysToKey(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

const PRESET_DAYS = { '7d': 7, '30d': 30, '90d': 90 }

// Build a {from, to} instant window covering the last N *local* days in `tz`,
// aligned to local midnight boundaries. Shared by every analytics route so the
// dashboard, drill-down, and CSV export agree on what "last 30 days" means.
export function presetRange(preset, tz = 'UTC') {
  const days = PRESET_DAYS[preset] ?? RANGE_DEFAULT_DAYS
  const todayKey = civilDate(new Date(), tz)
  const fromKey = addDaysToKey(todayKey, -(days - 1))
  const from = startOfLocalDay(fromKey, tz)
  // End of today (local) = start of tomorrow minus 1ms.
  const to = new Date(startOfLocalDay(addDaysToKey(todayKey, 1), tz).getTime() - 1)
  return { from, to }
}

// Enumerate the local day keys ('YYYY-MM-DD' in `tz`) spanned by [from, to].
function eachDay(from, to, tz = 'UTC') {
  const days = []
  let key = civilDate(from, tz)
  const endKey = civilDate(to, tz)
  let guard = 0
  while (key <= endKey && guard++ < 1000) {
    days.push(key)
    key = addDaysToKey(key, 1)
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

  // Currency + timezone for formatting and day bucketing. Synced onto the Store
  // row from Shopify shop settings; fall back to USD/UTC if not yet populated.
  const store = await db.store.findUnique({
    where: { storeDomain: shopId },
    select: { currencyCode: true, ianaTimezone: true },
  })
  const currency = store?.currencyCode || 'USD'
  const tz = store?.ianaTimezone || 'UTC'

  const range = (() => {
    const def = defaultRange()
    return {
      from: parseDateBound(from, def.from),
      to: parseDateBound(to, def.to),
    }
  })()

  // Try the rollup short-circuit first. DailyStats keys are local (tz) days.
  const fromDate = civilDate(range.from, tz)
  const toDate = civilDate(range.to, tz)
  const dailyStatsRows = await db.dailyStats.findMany({
    where: { shopId, date: { gte: fromDate, lte: toDate } },
    orderBy: [{ date: 'asc' }, { promotionId: 'asc' }],
  })
  if (dailyStatsRows.length > 0) {
    const todayStr = civilDate(new Date(), tz)
    const completedDays = eachDay(range.from, range.to, tz).filter((d) => d < todayStr)
    if (completedDays.length === 0) {
      // Range is just today — DailyStats can't possibly cover it. Skip.
    } else {
      const covered = new Set(dailyStatsRows.filter((r) => r.date < todayStr).map((r) => r.date))
      const coverage = covered.size / completedDays.length
      if (coverage >= DAILYSTATS_COVERAGE_THRESHOLD) {
        return await buildFromDailyStats(shopId, range, dailyStatsRows, { currency, tz })
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

  // 2. Per-day impressions/claims (revenue comes from the de-duped shop metrics).
  const perDay = await db.$queryRaw`
    SELECT
      to_char(date_trunc('day', ("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS date,
      "event",
      COUNT(*)::int AS count
    FROM "AnalyticsEvent"
    WHERE "shopId" = ${shopId}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" <= ${range.to}
      AND "event" IN (${EVENTS.PROMOTION_VIEWED}, ${EVENTS.GIFT_CLAIMED})
    GROUP BY date, "event"
    ORDER BY date ASC
  `

  // 2b. Per-day de-duplicated shop metrics from order_completed (one row per
  // order → COUNT is a distinct-order count, no multi-promo double-counting).
  // Splits attributed vs non-promo and sums the order subtotal (falling back to
  // total_price for rows written before subtotal capture).
  const shopByDay = await db.$queryRaw`
    SELECT
      to_char(date_trunc('day', ("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE COALESCE(("metadata"->>'attributed')::boolean, false))::int AS attr_orders,
      COALESCE(SUM(COALESCE("subtotal", "revenue")) FILTER (WHERE COALESCE(("metadata"->>'attributed')::boolean, false)), 0)::bigint AS attr_revenue,
      COUNT(*) FILTER (WHERE NOT COALESCE(("metadata"->>'attributed')::boolean, false))::int AS nonpromo_orders,
      COALESCE(SUM(COALESCE("subtotal", "revenue")) FILTER (WHERE NOT COALESCE(("metadata"->>'attributed')::boolean, false)), 0)::bigint AS nonpromo_revenue
    FROM "AnalyticsEvent"
    WHERE "shopId" = ${shopId}
      AND "event" = ${EVENTS.ORDER_COMPLETED}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" <= ${range.to}
    GROUP BY date
  `
  const shopDayMap = new Map(shopByDay.map((r) => [r.date, r]))

  // Daily trend — zero-fill. Revenue is the de-duplicated attributed revenue
  // (each order once), so the chart sums to the summary card.
  const dailyMap = new Map()
  for (const day of eachDay(range.from, range.to, tz)) {
    const s = shopDayMap.get(day)
    dailyMap.set(day, { date: day, impressions: 0, claims: 0, revenue: s ? Number(s.attr_revenue) : 0 })
  }
  for (const row of perDay) {
    const b = dailyMap.get(row.date)
    if (!b) continue
    if (row.event === EVENTS.PROMOTION_VIEWED) b.impressions += row.count
    else if (row.event === EVENTS.GIFT_CLAIMED) b.claims += row.count
  }

  // Shop-level totals = sum of the per-day de-duped metrics.
  let totalOrders = 0, attributedOrders = 0, attributedRevenue = 0
  let nonPromoOrders = 0, nonPromoRevenue = 0
  for (const r of shopByDay) {
    totalOrders += r.total_orders
    attributedOrders += r.attr_orders
    attributedRevenue += Number(r.attr_revenue)
    nonPromoOrders += r.nonpromo_orders
    nonPromoRevenue += Number(r.nonpromo_revenue)
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

  // Strip the shop-wide bucket from the per-promotion table; its de-duplicated
  // totals were computed above (attributedOrders/attributedRevenue/…).
  promoMap.delete(SHOP_WIDE_PROMOTION_ID)

  const promotions = Array.from(promoMap.values()).map((b) => ({
    ...b,
    aov: b.orders > 0 ? b.revenue / b.orders : 0,
  }))

  // Resolve display name + type for each promotion. Priority:
  //   1. snapshot stored on the events (survives config deletion)
  //   2. current ThemeConfig (labels rows written before snapshots existed,
  //      as long as the promotion still exists)
  //   3. friendly "Deleted promotion" fallback (never a raw UUID)
  const storedMeta = await db.$queryRaw`
    SELECT DISTINCT ON ("promotionId")
      "promotionId", "promotionName", "promotionType"
    FROM "AnalyticsEvent"
    WHERE "shopId" = ${shopId}
      AND "occurredAt" >= ${range.from}
      AND "occurredAt" <= ${range.to}
      AND "promotionId" IS NOT NULL
      AND ("promotionName" IS NOT NULL OR "promotionType" IS NOT NULL)
    ORDER BY "promotionId", "occurredAt" DESC
  `
  const storedMetaMap = new Map()
  for (const row of storedMeta) {
    storedMetaMap.set(row.promotionId, { name: row.promotionName, type: row.promotionType })
  }
  const configMeta = await loadPromotionMeta(shopId)

  for (const p of promotions) {
    const stored = storedMetaMap.get(p.id)
    const cfg = configMeta.get(p.id)
    p.name = stored?.name || cfg?.name || unknownPromotionLabel(p.id)
    p.type = p.type || stored?.type || cfg?.type || null
    p.status = promotionStatus(cfg)
    p.conversionRate = conversionRateFor(p)
  }
  promotions.sort((a, b) => b.revenue - a.revenue || b.impressions - a.impressions)

  // Summary cards. Shop-level revenue/orders use the DE-DUPLICATED shop metrics
  // (each order counted once); the per-promo table keeps its influenced figures.
  const totalImpressions = promotions.reduce((s, p) => s + p.impressions, 0)
  const totalClaims = promotions.reduce((s, p) => s + p.claims, 0)
  // Claim rate is claims ÷ claim-gift impressions only (offer impressions can't
  // be claimed, so including them would dilute it).
  const claimGiftImpressions = promotions.reduce((s, p) => s + (p.type === 'claim-gift' ? p.impressions : 0), 0)
  const claimRate = claimGiftImpressions > 0 ? totalClaims / claimGiftImpressions : 0
  // AOV lift on a single consistent (subtotal) basis; baseline = non-promo orders.
  const aovWithPromo = attributedOrders > 0 ? attributedRevenue / attributedOrders : 0
  const aovWithoutPromo = nonPromoOrders > 0 ? nonPromoRevenue / nonPromoOrders : 0
  const aovLift = aovWithoutPromo > 0 ? (aovWithPromo - aovWithoutPromo) / aovWithoutPromo : 0

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    currency,
    summary: {
      impressions: totalImpressions,
      claims: totalClaims,
      claimRate,
      revenue: attributedRevenue,
      orders: attributedOrders,
      totalOrders,
      aovWithPromo,
      aovWithoutPromo,
      aovLift,
    },
    daily: Array.from(dailyMap.values()),
    promotions,
    source: 'live',
  }
}

async function buildFromDailyStats(shopId, range, rows, { currency = 'USD', tz = 'UTC' } = {}) {
  // Promotion-level rollup + de-duplicated shop metrics from the `_shop` rows.
  const promoMap = new Map()
  let totalOrders = 0, attributedOrders = 0, attributedRevenue = 0
  let nonPromoOrders = 0, nonPromoRevenue = 0
  const shopRevByDate = new Map() // date -> de-duped attributed revenue
  for (const row of rows) {
    if (row.promotionId === SHOP_WIDE_PROMOTION_ID) {
      totalOrders += row.orders
      attributedOrders += row.attributedOrders
      attributedRevenue += row.attributedRevenue
      nonPromoOrders += row.nonPromoOrders
      nonPromoRevenue += row.nonPromoRevenue
      shopRevByDate.set(row.date, (shopRevByDate.get(row.date) || 0) + row.attributedRevenue)
      continue
    }
    let b = promoMap.get(row.promotionId)
    if (!b) {
      b = {
        id: row.promotionId,
        name: null,
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
    // Snapshot name/type persisted on DailyStats — survives config deletion.
    if (!b.name && row.promotionName) b.name = row.promotionName
    if (!b.type && row.promotionType) b.type = row.promotionType
  }

  // Daily series — zero-fill. Revenue is the de-duplicated attributed revenue
  // from the `_shop` row (each order once); impressions/claims from per-promo.
  const dailyMap = new Map()
  for (const day of eachDay(range.from, range.to, tz)) {
    dailyMap.set(day, { date: day, impressions: 0, claims: 0, revenue: shopRevByDate.get(day) || 0 })
  }
  for (const row of rows) {
    if (row.promotionId === SHOP_WIDE_PROMOTION_ID) continue
    const bucket = dailyMap.get(row.date)
    if (!bucket) continue
    bucket.impressions += row.impressions
    bucket.claims += row.claims
  }

  // Name/type resolution priority (mirrors the live path):
  //   1. snapshot stored on DailyStats (b.name / b.type — survives deletion)
  //   2. current ThemeConfig (still-live promotions)
  //   3. friendly "Deleted promotion" fallback (never a raw UUID)
  const configMeta = await loadPromotionMeta(shopId)

  const promotions = Array.from(promoMap.values()).map((b) => {
    const cfg = configMeta.get(b.id)
    const p = {
      ...b,
      name: b.name || cfg?.name || unknownPromotionLabel(b.id),
      type: b.type || cfg?.type || null,
      status: promotionStatus(cfg),
      aov: b.orders > 0 ? b.revenue / b.orders : 0,
    }
    p.conversionRate = conversionRateFor(p)
    return p
  })
  promotions.sort((a, b) => b.revenue - a.revenue || b.impressions - a.impressions)

  const totalImpressions = promotions.reduce((s, p) => s + p.impressions, 0)
  const totalClaims = promotions.reduce((s, p) => s + p.claims, 0)
  const claimGiftImpressions = promotions.reduce((s, p) => s + (p.type === 'claim-gift' ? p.impressions : 0), 0)
  const claimRate = claimGiftImpressions > 0 ? totalClaims / claimGiftImpressions : 0
  const aovWithPromo = attributedOrders > 0 ? attributedRevenue / attributedOrders : 0
  const aovWithoutPromo = nonPromoOrders > 0 ? nonPromoRevenue / nonPromoOrders : 0
  const aovLift = aovWithoutPromo > 0 ? (aovWithPromo - aovWithoutPromo) / aovWithoutPromo : 0

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    currency,
    summary: {
      impressions: totalImpressions,
      claims: totalClaims,
      claimRate,
      revenue: attributedRevenue,
      orders: attributedOrders,
      totalOrders,
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
    currency: 'USD',
    summary: {
      impressions: 0, claims: 0, claimRate: 0, revenue: 0,
      orders: 0, totalOrders: 0, aovWithPromo: 0, aovWithoutPromo: 0, aovLift: 0,
    },
    daily: [],
    promotions: [],
  }
}
