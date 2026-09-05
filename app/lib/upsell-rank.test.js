import { describe, test, expect } from 'vitest'
import {
  adjustedTotal,
  adjustedTotalCents,
  adjustedQty,
  computeGap,
  scoreGapFiller,
  matchPairingRules,
  rankUpsells,
} from './upsell-rank.js'

// The real soulflower cart that exposed the gift-badge bug. Two gift lines, a
// BUY1GET1 code zeroing one serum, and two genuinely paid lines.
const SOULFLOWER_CART = [
  { product_id: 111, variant_id: 11, original_line_price: 41250, line_price: 41250, quantity: 1 },
  {
    product_id: 111, variant_id: 12, original_line_price: 41250, line_price: 41250, quantity: 1,
    line_level_discount_allocations: [
      { amount: 41250, discount_application: { title: 'BUY1GET1' } },
    ],
  },
  {
    product_id: 222, variant_id: 22, original_line_price: 0, line_price: 0, quantity: 1,
    properties: { _freebie: 'true', _offer_id: 'o1' },
  },
  {
    product_id: 333, variant_id: 33, original_line_price: 26250, line_price: 26250, quantity: 1,
    properties: { _freebie: 'true', _offer_id: 'o2' },
  },
  { product_id: 444, variant_id: 44, original_line_price: 99900, line_price: 99900, quantity: 1 },
]

const BAR = {
  mode: 'price',
  tiers: [
    { id: 't1', threshold: 999, trigger_type: 'price', label: '1st Mystery Box' },
    { id: 't2', threshold: 1599, trigger_type: 'price', label: '2nd Mystery Box' },
    { id: 't3', threshold: 2499, trigger_type: 'price', label: '3rd Mystery Gifts' },
  ],
}

describe('adjustedTotal', () => {
  test('matches the qualifying spend the live bar computed (₹1411.50)', () => {
    expect(adjustedTotalCents(SOULFLOWER_CART)).toBe(141150)
    expect(adjustedTotal(SOULFLOWER_CART)).toBe(1411.5)
  })

  test('excludes gift lines even when Shopify is still charging for them', () => {
    // The ₹262.50 cleanser is a gift line: charged, but not qualifying spend.
    expect(adjustedTotalCents(SOULFLOWER_CART)).toBe(41250 + 0 + 99900)
    expect(adjustedTotalCents([SOULFLOWER_CART[3]])).toBe(0)
  })

  test('subtracts external discounts but never cartx own discounts', () => {
    const cartxDiscounted = [{
      original_line_price: 50000, quantity: 1,
      line_level_discount_allocations: [
        { amount: 50000, discount_application: { title: 'cartx free gift' } },
      ],
    }]
    // cartx's own discount is the reward, not a reduction in qualifying spend.
    expect(adjustedTotalCents(cartxDiscounted)).toBe(50000)

    const externallyDiscounted = [{
      original_line_price: 50000, quantity: 1,
      line_level_discount_allocations: [
        { amount: 10000, discount_application: { title: 'SUMMER10' } },
      ],
    }]
    expect(adjustedTotalCents(externallyDiscounted)).toBe(40000)
  })

  test('handles empty / missing input', () => {
    expect(adjustedTotalCents([])).toBe(0)
    expect(adjustedTotalCents(null)).toBe(0)
    expect(adjustedQty(null)).toBe(0)
  })

  test('adjustedQty skips gift lines', () => {
    expect(adjustedQty(SOULFLOWER_CART)).toBe(3)
  })
})

describe('computeGap', () => {
  test('finds the next unreached price tier', () => {
    const gap = computeGap(BAR, 1411.5)
    expect(gap.tier.id).toBe('t2')
    expect(gap.gap).toBeCloseTo(187.5)
  })

  test('is null when every tier is reached', () => {
    expect(computeGap(BAR, 9999)).toBe(null)
  })

  test('is null when there is no bar', () => {
    expect(computeGap(null, 100)).toBe(null)
    expect(computeGap({ tiers: [] }, 100)).toBe(null)
  })

  test('ignores quantity tiers in a mixed bar', () => {
    const mixed = {
      mode: 'mixed',
      tiers: [
        { id: 'q1', threshold: 3, trigger_type: 'quantity' },
        { id: 'p1', threshold: 1599, trigger_type: 'price' },
      ],
    }
    expect(computeGap(mixed, 1411.5).tier.id).toBe('p1')
  })

  test('is driven by thresholds, not a possibly-stale tier.state', () => {
    const stale = {
      mode: 'price',
      tiers: [{ id: 't1', threshold: 999, trigger_type: 'price', state: 'next' }],
    }
    // Already past 999, so despite state:'next' there is nothing left to unlock.
    expect(computeGap(stale, 1411.5)).toBe(null)
  })
})

describe('scoreGapFiller', () => {
  test('a product priced exactly at the gap is the perfect fit', () => {
    expect(scoreGapFiller(187.5, 187.5, 1)).toBe(1)
  })

  test('the cheapest sufficient product wins', () => {
    const tight = scoreGapFiller(200, 187.5, 1)
    const loose = scoreGapFiller(350, 187.5, 1)
    expect(tight).toBeGreaterThan(loose)
  })

  test('any unlocking product outranks any product that falls short', () => {
    const worstUnlock = scoreGapFiller(100000, 187.5, 1)
    const bestPartial = scoreGapFiller(187.49, 187.5, 1)
    expect(worstUnlock).toBeGreaterThan(bestPartial)
  })

  test('falling short scores proportionally to the gap covered', () => {
    expect(scoreGapFiller(93.75, 187.5, 1)).toBeCloseTo(0.225)
  })

  test('tolerance widens the acceptable overshoot', () => {
    const strict = scoreGapFiller(375, 187.5, 1)
    const relaxed = scoreGapFiller(375, 187.5, 4)
    expect(relaxed).toBeGreaterThan(strict)
  })

  test('degenerate inputs score zero', () => {
    expect(scoreGapFiller(100, 0, 1)).toBe(0)
    expect(scoreGapFiller(0, 100, 1)).toBe(0)
    expect(scoreGapFiller(undefined, undefined, 1)).toBe(0)
  })
})

describe('matchPairingRules', () => {
  const rules = [
    { when_product_ids: [111], then_variant_ids: [99], boost: 2 },
    { when_product_ids: [999], then_variant_ids: [88], boost: 5 },
  ]

  test('boosts only the targets whose trigger product is in the cart', () => {
    const boosts = matchPairingRules(rules, SOULFLOWER_CART)
    expect(boosts['99']).toBe(2)
    expect(boosts['88']).toBeUndefined()
  })

  test('normalizes gid:// ids on both sides', () => {
    const boosts = matchPairingRules(
      [{ when_product_ids: ['gid://shopify/Product/111'], then_variant_ids: ['gid://shopify/ProductVariant/99'] }],
      SOULFLOWER_CART
    )
    expect(boosts['99']).toBe(1)
  })

  test('no rules means no boosts', () => {
    expect(matchPairingRules([], SOULFLOWER_CART)).toEqual({})
    expect(matchPairingRules(null, null)).toEqual({})
  })
})

describe('rankUpsells', () => {
  const POOL = [
    { variant_id: 501, product_id: 601, title: 'Cheap',     price: '50.00' },
    { variant_id: 502, product_id: 602, title: 'Just right', price: '199.00' },
    { variant_id: 503, product_id: 603, title: 'Expensive', price: '1200.00' },
    { variant_id: 504, product_id: 604, title: 'Close',     price: '180.00' },
  ]

  test('with no strategies enabled it preserves the merchant order (todays behaviour)', () => {
    const out = rankUpsells({ pool: POOL, cartItems: [], maxVisible: 10 })
    expect(out.map((p) => p.title)).toEqual(['Cheap', 'Just right', 'Expensive', 'Close'])
  })

  test('excludes products already in the cart by product OR variant id', () => {
    const out = rankUpsells({
      pool: POOL,
      cartItems: [
        { product_id: 601, variant_id: 501 },
        { product_id: 'gid://shopify/Product/602', variant_id: 'gid://shopify/ProductVariant/502' },
      ],
      maxVisible: 10,
    })
    expect(out.map((p) => p.title)).toEqual(['Expensive', 'Close'])
  })

  test('gap_filler puts the cheapest product that closes the gap first', () => {
    const out = rankUpsells({
      pool: POOL,
      cartItems: SOULFLOWER_CART,
      gap: computeGap(BAR, 1411.5), // ₹187.50 short of the 2nd Mystery Box
      strategies: { gap_filler: { enabled: true, overshoot_tolerance: 1 } },
      maxVisible: 10,
    })
    expect(out[0].title).toBe('Just right')
    expect(out[0]._unlocks_tier.id).toBe('t2')
  })

  test('products that fall short carry no unlock annotation', () => {
    const out = rankUpsells({
      pool: POOL,
      cartItems: SOULFLOWER_CART,
      gap: computeGap(BAR, 1411.5),
      strategies: { gap_filler: { enabled: true } },
      maxVisible: 10,
    })
    const close = out.find((p) => p.title === 'Close')
    expect(close._unlocks_tier).toBe(null)
  })

  test('gap_filler is inert when every milestone is already unlocked', () => {
    const out = rankUpsells({
      pool: POOL,
      cartItems: [],
      gap: computeGap(BAR, 9999),
      strategies: { gap_filler: { enabled: true } },
      maxVisible: 10,
    })
    expect(out.map((p) => p.title)).toEqual(['Cheap', 'Just right', 'Expensive', 'Close'])
    expect(out.every((p) => p._unlocks_tier === null)).toBe(true)
  })

  test('pairing boost can outrank a gap fit', () => {
    const out = rankUpsells({
      pool: POOL,
      cartItems: SOULFLOWER_CART,
      gap: computeGap(BAR, 1411.5),
      strategies: {
        gap_filler: { enabled: true },
        pairing: { enabled: true, rules: [{ when_product_ids: [444], then_variant_ids: [501], boost: 5 }] },
      },
      maxVisible: 10,
    })
    expect(out[0].title).toBe('Cheap')
  })

  test('performance ranking ignores products below the impression floor', () => {
    const out = rankUpsells({
      pool: POOL,
      cartItems: [],
      strategies: { performance: { enabled: true, min_impressions: 50 } },
      addRates: {
        'upsell:503': { impressions: 500, rate: 0.9 },  // proven
        'upsell:501': { impressions: 3, rate: 1.0 },    // too thin to trust
      },
      maxVisible: 10,
    })
    expect(out[0].title).toBe('Expensive')
    expect(out.map((p) => p.title)).toEqual(['Expensive', 'Cheap', 'Just right', 'Close'])
  })

  test('caps the list at max_visible', () => {
    const out = rankUpsells({ pool: POOL, cartItems: [], maxVisible: 2 })
    expect(out).toHaveLength(2)
  })

  test('never mutates the pool it was given', () => {
    const snapshot = JSON.parse(JSON.stringify(POOL))
    rankUpsells({
      pool: POOL,
      cartItems: SOULFLOWER_CART,
      gap: computeGap(BAR, 1411.5),
      strategies: { gap_filler: { enabled: true } },
    })
    expect(POOL).toEqual(snapshot)
  })

  test('survives an empty pool and missing input', () => {
    expect(rankUpsells({ pool: [], cartItems: [] })).toEqual([])
    expect(rankUpsells({})).toEqual([])
    expect(rankUpsells()).toEqual([])
  })
})
