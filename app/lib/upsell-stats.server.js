// =============================================================
// cartx — Learned upsell add-rates
//
// Feeds the `performance` ranking strategy: how often each upsell product is
// added once a shopper has actually seen it. Both numbers already exist in
// DailyStats — `impressions` (fired by the drawer's IntersectionObserver) and
// `upsellAdds` — keyed by a promotionId of the form `upsell:<variant_id>`.
// No new table and no rollup migration; this just reads what's there.
//
// The eval route is the storefront hot path, so results are cached in memory
// per shop and only fetched when a shop has the strategy switched on.
// =============================================================

import prisma from '../db.server.js'
import { captureException } from './sentry.server.js'

const CACHE_TTL_MS = 10 * 60 * 1000 // add-rates move slowly; 10 min is plenty
const WINDOW_DAYS = 30

const cache = new Map() // shopId -> { at: number, rates: object }

function windowStartDate() {
  const d = new Date()
  d.setDate(d.getDate() - WINDOW_DAYS)
  return d.toISOString().slice(0, 10) // DailyStats.date is 'YYYY-MM-DD'
}

/**
 * Per-product add-rates for a shop, shaped for rankUpsells():
 *   { 'upsell:<variant_id>': { impressions, adds, rate } }
 *
 * Returns {} on any failure — a ranking signal is never worth failing the cart
 * evaluation over, and rankUpsells treats a missing entry as "no data".
 */
export async function loadUpsellAddRates(shopId) {
  if (!shopId) return {}

  const hit = cache.get(shopId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rates

  try {
    const rows = await prisma.dailyStats.findMany({
      where: {
        shopId,
        date: { gte: windowStartDate() },
        promotionId: { startsWith: 'upsell:' },
      },
      select: { promotionId: true, impressions: true, upsellAdds: true },
    })

    const totals = {}
    for (const row of rows) {
      const entry = totals[row.promotionId] || (totals[row.promotionId] = { impressions: 0, adds: 0 })
      entry.impressions += row.impressions || 0
      entry.adds += row.upsellAdds || 0
    }

    const rates = {}
    for (const key of Object.keys(totals)) {
      const { impressions, adds } = totals[key]
      rates[key] = {
        impressions,
        adds,
        rate: impressions > 0 ? Math.min(1, adds / impressions) : 0,
      }
    }

    cache.set(shopId, { at: Date.now(), rates })
    return rates
  } catch (err) {
    captureException(err, { tags: { area: 'upsell-stats' }, extra: { shopId } })
    return {}
  }
}

/** Test seam / webhook hook — drop a shop's cached rates. */
export function clearUpsellAddRateCache(shopId) {
  if (shopId) cache.delete(shopId)
  else cache.clear()
}
