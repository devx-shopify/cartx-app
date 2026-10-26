// =============================================================
// cartx — Upsell ranking engine (PURE)
//
// Imported by BOTH the server eval route (app/routes/proxy.evaluate-cart.jsx)
// and the drawer bundle (app/drawer-src/src/*, esbuild target es2018). It must
// therefore stay dependency-free: no imports, no Node APIs, no DOM.
//
// ⚠️  A change here affects the server AND the storefront drawer, so it needs
// BOTH `flyctl deploy` and `shopify app deploy` to fully ship.
//
// This is also the single canonical home for "qualifying spend" (adjustedTotal).
// That calculation previously existed three times and had already drifted:
// evaluate.js's recomputeBar omitted the external-discount subtraction, so its
// cart value ran high. The gap-filler strategy ranks against that number, so a
// wrong value means recommending products that don't actually close the gap.
// =============================================================

// Mirrors LINE_PROPS.FREEBIE / CARTMAX_CLAIM in constants.js. Inlined rather
// than imported so the drawer bundle doesn't pull in DEFAULT_CONFIG with it.
const FREEBIE_PROP = '_freebie'
const CLAIM_PROP = '_cartmax_claim'

// cartx's own automatic discounts are the REWARD (free gift, volume discount),
// not a reduction in the customer's qualifying spend — they must never lower a
// threshold (that would let the reward it grants knock itself back off). Any
// OTHER discount (e.g. a merchant "Buy X Get Y") genuinely reduces what the
// customer pays, so it SHOULD count. Titles must match those set in
// discount.server.js / volume-discount.server.js.
export const CARTX_DISCOUNT_TITLES = ['cartx free gift', 'cartx volume discount']

const DEFAULT_MAX_VISIBLE = 4

// Unlocking the next milestone always outranks merely getting closer to it:
// any candidate that closes the gap scores >= UNLOCK_FLOOR, while a candidate
// that only narrows it tops out just below.
const UNLOCK_FLOOR = 0.5
const PARTIAL_CEILING = 0.45

export function normalizeId(id) {
  const s = String(id == null ? '' : id)
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

/** A cartx gift / claimed line — excluded from qualifying spend. */
export function isGiftLine(item) {
  const props = (item && item.properties) || {}
  return props[FREEBIE_PROP] === 'true' || props[CLAIM_PROP] === 'true'
}

/** Discounts on a line that are NOT cartx's own, in minor units. */
export function externalDiscountCents(item) {
  const allocs = (item && item.line_level_discount_allocations) || []
  let cents = 0
  for (let i = 0; i < allocs.length; i++) {
    const alloc = allocs[i] || {}
    const app = alloc.discount_application || {}
    const title = String(app.title || alloc.title || '').toLowerCase()
    if (CARTX_DISCOUNT_TITLES.indexOf(title) === -1) cents += alloc.amount || 0
  }
  return cents
}

/**
 * Qualifying spend in MINOR units: pre-discount line prices for non-gift lines,
 * less only external discounts.
 */
export function adjustedTotalCents(items) {
  const list = items || []
  let cents = 0
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (isGiftLine(item)) continue
    const gross = item.original_line_price != null
      ? item.original_line_price
      : (item.line_price || 0)
    cents += Math.max(0, gross - externalDiscountCents(item))
  }
  return cents
}

/** Qualifying spend in MAJOR units — config thresholds are in dollars/rupees. */
export function adjustedTotal(items) {
  return adjustedTotalCents(items) / 100
}

/** Qualifying quantity — gift lines excluded, mirroring adjustedTotal. */
export function adjustedQty(items) {
  const list = items || []
  let qty = 0
  for (let i = 0; i < list.length; i++) {
    if (isGiftLine(list[i])) continue
    qty += list[i].quantity || 0
  }
  return qty
}

/**
 * The next PRICE milestone the shopper hasn't reached, and how far away it is.
 * Derived from thresholds rather than tier.state so a stale/optimistic state
 * can't produce a wrong gap. Returns null when there's nothing left to unlock.
 *
 * @param {{tiers: Array, mode: string}} bar  the evaluated progress bar
 * @param {number} currentTotal               qualifying spend, MAJOR units
 * @returns {{gap: number, tier: object}|null}
 */
export function computeGap(bar, currentTotal) {
  const tiers = (bar && bar.tiers) || []
  const mode = bar && bar.mode
  let best = null
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    const type = tier.trigger_type || (mode === 'quantity' ? 'quantity' : 'price')
    if (type !== 'price') continue
    const threshold = Number(tier.threshold)
    if (!(threshold > currentTotal)) continue
    if (!best || threshold < Number(best.threshold)) best = tier
  }
  if (!best) return null
  return { gap: Number(best.threshold) - currentTotal, tier: best }
}

/**
 * How well a candidate closes the milestone gap, 0..1.
 *
 * Closes it  → UNLOCK_FLOOR..1, best when the overshoot is smallest, so the
 *              CHEAPEST sufficient product wins rather than the priciest.
 * Falls short → 0..PARTIAL_CEILING, proportional to how much of the gap it covers.
 *
 * `tolerance` scales how much overshoot is acceptable: 1.0 means a product
 * costing twice the gap scores at the floor.
 */
export function scoreGapFiller(price, gap, tolerance) {
  const p = Number(price)
  const g = Number(gap)
  if (!(g > 0) || !(p > 0)) return 0
  if (p < g) return PARTIAL_CEILING * (p / g)
  const tol = Number(tolerance) > 0 ? Number(tolerance) : 1
  const overshoot = Math.min(1, (p - g) / (g * tol))
  return UNLOCK_FLOOR + (1 - UNLOCK_FLOOR) * (1 - overshoot)
}

/**
 * Rank the candidate upsell products for a given cart (candidates come from
 * upsell-recs.js: cart-based product rules, then the default list).
 *
 * Every strategy is opt-in: with none enabled this returns the pool in its
 * authored order minus exclusions, which is exactly the pre-engine behaviour.
 *
 * @param {object}  input
 * @param {Array}   input.pool        candidate upsell product snapshots
 * @param {Array}   input.cartItems   current cart lines
 * @param {object}  input.gap         result of computeGap(), or null
 * @param {object}  input.strategies  config.upsells.strategies
 * @param {object}  input.addRates    { 'upsell:<product_id>': { impressions, rate } }
 * @param {number}  input.maxVisible
 * @returns {Array} copies of the pool entries, ordered, annotated with
 *                  `_score` and `_unlocks_tier`
 */
export function rankUpsells(input) {
  const opts = input || {}
  const pool = opts.pool || []
  const cartItems = opts.cartItems || []
  const strategies = opts.strategies || {}
  const gapInfo = opts.gap || null
  const addRates = opts.addRates || {}
  const maxVisible = Number(opts.maxVisible) > 0 ? Number(opts.maxVisible) : DEFAULT_MAX_VISIBLE

  // Exclude anything already in the cart. Product-level (server's historical
  // behaviour) OR variant-level (the drawer's) — keep both so neither surface
  // starts showing something the shopper already has.
  const inCartProducts = {}
  const inCartVariants = {}
  for (let i = 0; i < cartItems.length; i++) {
    inCartProducts[normalizeId(cartItems[i].product_id)] = true
    inCartVariants[normalizeId(cartItems[i].variant_id)] = true
  }

  const gapCfg = strategies.gap_filler || {}
  const perfCfg = strategies.performance || {}
  const minImpressions = Number(perfCfg.min_impressions) > 0 ? Number(perfCfg.min_impressions) : 50

  const scored = []
  for (let i = 0; i < pool.length; i++) {
    const product = pool[i]
    const vid = normalizeId(product.variant_id)
    const pid = normalizeId(product.product_id)
    if (inCartProducts[pid] || inCartVariants[vid]) continue

    let score = 0
    let unlocksTier = null

    if (gapCfg.enabled && gapInfo && gapInfo.gap > 0) {
      const price = Number(product.price)
      score += scoreGapFiller(price, gapInfo.gap, gapCfg.overshoot_tolerance)
      if (price >= gapInfo.gap) unlocksTier = gapInfo.tier
    }

    if (perfCfg.enabled) {
      const stat = addRates['upsell:' + pid]
      // Ignore thin data so a brand-new product isn't buried before it's had a
      // fair chance to be seen.
      if (stat && stat.impressions >= minImpressions) {
        score += Math.max(0, Math.min(1, Number(stat.rate) || 0))
      }
    }

    scored.push({ product: product, score: score, unlocksTier: unlocksTier, index: i })
  }

  // Score desc, then authored order — so a pool with no strategies enabled (all
  // scores 0) comes back exactly as the merchant arranged it.
  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index))

  const out = []
  for (let i = 0; i < scored.length && i < maxVisible; i++) {
    const entry = scored[i]
    out.push(Object.assign({}, entry.product, {
      _score: entry.score,
      _unlocks_tier: entry.unlocksTier,
    }))
  }
  return out
}
