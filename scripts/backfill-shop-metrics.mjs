#!/usr/bin/env node
// One-off backfill for the de-duplicated shop metrics (Issue 2).
//
// For order_completed rows written BEFORE the attribution change (no
// metadata.attributed, no subtotal), this:
//   1) stamps metadata.attributed = (an order_attributed row exists for the
//      same order_id), and backfills subtotal for attributed orders from the
//      order's max order_attributed.revenue (≈ order subtotal for GWP/claim
//      gifts). Non-promo orders keep subtotal NULL — the rollup then falls back
//      to total_price, which is the best available basis for historical rows.
//   2) re-runs the rollup per shop so DailyStats `_shop` gets the new
//      attributed/non-promo columns for the retained window.
//
// Idempotent (skips rows already stamped). Raw events are pruned after 90d, so
// run with --days covering the dashboard's longest preset (90) plus margin.
//
// Usage: node scripts/backfill-shop-metrics.mjs [--days=120] [--dry]
import db from '../app/db.server.js'
import { rollupShop } from '../app/lib/rollup.server.js'

const args = process.argv.slice(2)
const daysArg = args.find((a) => a.startsWith('--days='))
const days = daysArg ? Number(daysArg.split('=')[1]) : 120
const dry = args.includes('--dry')
const since = new Date(Date.now() - days * 24 * 3600 * 1000)

console.log(`[backfill] window: since ${since.toISOString()} (${days}d), dry=${dry}`)

// 1) Stamp attributed flag (+ best-effort subtotal) on un-stamped order_completed rows.
let stamped = 0
if (!dry) {
  stamped = await db.$executeRaw`
    WITH oc AS (
      SELECT id, "shopId", metadata->>'order_id' AS order_id
      FROM "AnalyticsEvent"
      WHERE event = 'order_completed'
        AND "occurredAt" >= ${since}
        AND (metadata->>'attributed') IS NULL
    ),
    attr AS (
      SELECT "shopId", metadata->>'order_id' AS order_id, MAX(revenue) AS sub
      FROM "AnalyticsEvent"
      WHERE event = 'order_attributed' AND "occurredAt" >= ${since}
      GROUP BY "shopId", metadata->>'order_id'
    )
    UPDATE "AnalyticsEvent" e
    SET metadata = jsonb_set(e.metadata, '{attributed}', to_jsonb(a.order_id IS NOT NULL)),
        subtotal = COALESCE(e.subtotal, a.sub)
    FROM oc
    LEFT JOIN attr a ON a."shopId" = oc."shopId" AND a.order_id = oc.order_id
    WHERE e.id = oc.id
  `
}
console.log(`[backfill] stamped ${stamped} order_completed row(s)`)

// 2) Re-run the rollup per shop over the window to repopulate DailyStats.
const shops = await db.analyticsEvent.findMany({
  where: { createdAt: { gte: since } },
  select: { shopId: true },
  distinct: ['shopId'],
})
let rolled = 0
for (const { shopId } of shops) {
  if (dry) { console.log(`[backfill] would roll up ${shopId}`); continue }
  const r = await rollupShop(shopId, { since })
  rolled += r.buckets
  console.log(`[backfill] ${shopId}: ${r.buckets} buckets`)
}
console.log(`[backfill] done — ${shops.length} shop(s), ${rolled} buckets`)
process.exit(0)
