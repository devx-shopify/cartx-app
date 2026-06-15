import db from '../db.server.js'
import {
  ANALYTICS_EVENTS as EVENTS,
  SHOP_WIDE_PROMOTION_ID,
} from './analytics-events.js'

// Default rollup window: last 26 hours. Wide enough to catch any straggler
// events that arrived just after the previous run, narrow enough that the
// query stays cheap.
const DEFAULT_WINDOW_HOURS = 26

// Read the shop's IANA timezone (synced onto Store from Shopify shop settings).
// Falls back to UTC when not yet populated — the merchant just hasn't opened the
// admin app since the field was added.
async function getShopTimezone(shopId) {
  const store = await db.store.findUnique({
    where: { storeDomain: shopId },
    select: { ianaTimezone: true },
  })
  return store?.ianaTimezone || 'UTC'
}

/**
 * Roll up AnalyticsEvent rows into DailyStats for one shop.
 *
 * Idempotent: every run UPSERTs the same `(shopId, date, promotionId)` keys,
 * so re-running for the same window converges to the correct counts.
 *
 * @param {string} shopId
 * @param {{ since?: Date, until?: Date }} [opts]
 * @returns {Promise<{ shopId: string, buckets: number, ms: number }>}
 */
export async function rollupShop(shopId, opts = {}) {
  if (!shopId) throw new Error('rollupShop: shopId required')
  const started = Date.now()
  const until = opts.until ?? new Date()
  const since = opts.since ?? new Date(until.getTime() - DEFAULT_WINDOW_HOURS * 3600 * 1000)
  const tz = opts.tz ?? (await getShopTimezone(shopId))

  // Single GROUP BY query: (date, promotionId, event) -> count + revenue.
  // Days are bucketed in the shop's local timezone: interpret the naive
  // timestamp as UTC, convert to the shop tz, then truncate to the day.
  const rows = await db.$queryRaw`
    SELECT
      to_char(date_trunc('day', ("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS date,
      COALESCE("promotionId", ${SHOP_WIDE_PROMOTION_ID}) AS "promotionId",
      "event",
      COUNT(*)::int AS count,
      COALESCE(SUM("revenue"), 0)::bigint AS revenue
    FROM "AnalyticsEvent"
    WHERE "shopId" = ${shopId}
      AND "occurredAt" >= ${since}
      AND "occurredAt" <= ${until}
    GROUP BY date, "promotionId", "event"
  `

  if (rows.length === 0) {
    return { shopId, buckets: 0, ms: Date.now() - started }
  }

  // Reshape: (date, promotionId) -> aggregate per metric.
  const buckets = new Map()
  for (const row of rows) {
    const key = `${row.date}:${row.promotionId}`
    let b = buckets.get(key)
    if (!b) {
      b = {
        date: row.date,
        promotionId: row.promotionId,
        impressions: 0, claims: 0, removals: 0,
        upsellAdds: 0, couponApplies: 0,
        checkouts: 0, orders: 0, revenue: 0,
      }
      buckets.set(key, b)
    }
    const n = row.count
    const r = Number(row.revenue)
    switch (row.event) {
      case EVENTS.PROMOTION_VIEWED:   b.impressions += n; break
      case EVENTS.GIFT_CLAIMED:       b.claims += n; break
      case EVENTS.GIFT_REMOVED:       b.removals += n; break
      case EVENTS.UPSELL_ADDED:       b.upsellAdds += n; break
      case EVENTS.COUPON_APPLIED:     b.couponApplies += n; break
      case EVENTS.CHECKOUT_STARTED:   b.checkouts += n; break
      case EVENTS.ORDER_ATTRIBUTED:   b.orders += n; b.revenue += r; break
      case EVENTS.ORDER_COMPLETED:
        if (b.promotionId === SHOP_WIDE_PROMOTION_ID) {
          b.orders += n
          b.revenue += r
        }
        break
      default: break
    }
  }

  // UPSERT each bucket. The unique key is (shopId, date, promotionId).
  await db.$transaction(
    Array.from(buckets.values()).map((b) =>
      db.dailyStats.upsert({
        where: { shopId_date_promotionId: { shopId, date: b.date, promotionId: b.promotionId } },
        update: {
          impressions: b.impressions, claims: b.claims, removals: b.removals,
          upsellAdds: b.upsellAdds, couponApplies: b.couponApplies,
          checkouts: b.checkouts, orders: b.orders, revenue: b.revenue,
        },
        create: {
          shopId,
          date: b.date,
          promotionId: b.promotionId,
          impressions: b.impressions, claims: b.claims, removals: b.removals,
          upsellAdds: b.upsellAdds, couponApplies: b.couponApplies,
          checkouts: b.checkouts, orders: b.orders, revenue: b.revenue,
        },
      }),
    ),
  )

  return { shopId, buckets: buckets.size, ms: Date.now() - started }
}

/**
 * Find every shop with recent activity and roll each one up.
 * Errors for one shop do not abort the run; they're logged and counted.
 */
export async function rollupAllShops({ windowHours = DEFAULT_WINDOW_HOURS } = {}) {
  const since = new Date(Date.now() - windowHours * 3600 * 1000)
  const distinct = await db.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { shopId: true },
    distinct: ['shopId'],
  })

  let totalBuckets = 0
  let totalFailed = 0
  for (const { shopId } of distinct) {
    try {
      const result = await rollupShop(shopId, { since })
      totalBuckets += result.buckets
      console.log(`[cartx][rollup] ${shopId}: ${result.buckets} buckets in ${result.ms}ms`)
    } catch (err) {
      totalFailed += 1
      console.error(`[cartx][rollup] ${shopId} failed:`, err)
    }
  }
  return { shops: distinct.length, totalBuckets, totalFailed }
}

/**
 * Delete raw AnalyticsEvent rows older than the retention window.
 * DailyStats is untouched so long-range dashboard reads still work.
 */
export async function pruneRawEvents({ olderThanDays = 90 } = {}) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600 * 1000)
  const result = await db.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return { deleted: result.count, cutoff }
}
