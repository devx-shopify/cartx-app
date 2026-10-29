import { describe, test, expect } from 'vitest'
import {
  hasFreebieMarker, showsQuantitySelector, giftChargedAmount,
  normalizeSectionOrder, BODY_SECTIONS, fillTemplate, formatQty, discountPercent,
  couponShortfall, splitCoupons, savingsForCode, milestonePositions, mapProgress,
} from './helpers.js'

describe('normalizeSectionOrder', () => {
  test('missing or empty order → today\'s order', () => {
    expect(normalizeSectionOrder(undefined)).toEqual(BODY_SECTIONS)
    expect(normalizeSectionOrder([])).toEqual(BODY_SECTIONS)
  })
  test('the stored default (with ribbon) → today\'s body order', () => {
    expect(normalizeSectionOrder(['progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'coupons', 'upsells', 'ribbon']))
      .toEqual(BODY_SECTIONS)
  })
  test('custom order is kept', () => {
    const order = ['progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'upsells', 'coupons']
    expect(normalizeSectionOrder(order)).toEqual(order)
  })
  test('unknown and duplicate keys dropped, missing keys appended in default order', () => {
    expect(normalizeSectionOrder(['upsells', 'bogus', 'upsells', 'line_items']))
      .toEqual(['upsells', 'line_items', 'progress_bar', 'claim_gifts', 'offer_cards', 'coupons'])
  })
})

describe('fillTemplate', () => {
  test('fills known placeholders and leaves unknown ones', () => {
    expect(fillTemplate('Add {amount} more, {x}', { amount: '₹200' })).toBe('Add ₹200 more, {x}')
    expect(fillTemplate('{pct}%', { pct: 50 })).toBe('50%')
    expect(fillTemplate(undefined, {})).toBe('')
  })
})

describe('formatQty', () => {
  test('zero-pads single digits only when on', () => {
    expect(formatQty(1, true)).toBe('01')
    expect(formatQty(9, true)).toBe('09')
    expect(formatQty(10, true)).toBe('10')
    expect(formatQty(1, false)).toBe('1')
  })
})

describe('discountPercent', () => {
  test('rounds the saving against compare-at', () => {
    expect(discountPercent('999.00', '1999.00')).toBe(50)
    expect(discountPercent(10, 0)).toBe(0)
    expect(discountPercent(10, 8)).toBe(0)
  })
})

describe('couponShortfall', () => {
  test('price minimum unmet → amount short in minor units', () => {
    expect(couponShortfall({ trigger_price: 999 }, 50000, 1)).toEqual({ locked: true, by: 'price', amount: 49900, progress: 50000 / 99900 })
  })
  test('quantity minimum unmet → items short', () => {
    expect(couponShortfall({ trigger_qty: 3 }, 500000, 1)).toEqual({ locked: true, by: 'qty', count: 2, progress: 1 / 3 })
  })
  test('price wins when both are unmet', () => {
    expect(couponShortfall({ trigger_price: 100, trigger_qty: 3 }, 0, 0).by).toBe('price')
  })
  test('already eligible / no minimum → not locked', () => {
    expect(couponShortfall({ trigger_price: 100, trigger_qty: 1 }, 10000, 1)).toEqual({ locked: false })
    expect(couponShortfall({}, 0, 0)).toEqual({ locked: false })
  })
})

describe('splitCoupons', () => {
  const coupons = [
    { code: 'EASY', trigger_price: 0 },
    { code: 'FAR', trigger_price: 5000 },
    { code: 'NEAR', trigger_price: 600 },
    { code: 'APPLIED', trigger_price: 0 },
  ]
  const cart = { total_price: 50000, item_count: 1 }
  test('locked coupons hidden unless asked for', () => {
    const r = splitCoupons(coupons, cart, ['applied'], false)
    expect(r.available.map((c) => c.code)).toEqual(['EASY'])
    expect(r.locked).toEqual([])
  })
  test('locked coupons sorted closest-first, applied excluded', () => {
    const r = splitCoupons(coupons, cart, ['APPLIED'], true)
    expect(r.available.map((c) => c.code)).toEqual(['EASY'])
    expect(r.locked.map((c) => c.code)).toEqual(['NEAR', 'FAR'])
    expect(r.locked[0]._shortfall.amount).toBe(10000)
  })
})

describe('savingsForCode', () => {
  test('sums line-level allocations for the code (AJAX shape)', () => {
    const cart = {
      items: [
        { line_level_discount_allocations: [{ amount: 1500, discount_application: { title: 'SAVE20' } }] },
        { line_level_discount_allocations: [{ amount: 500, discount_application: { title: 'save20' } }, { amount: 99, discount_application: { title: 'AUTO' } }] },
      ],
      cart_level_discount_applications: [{ title: 'SAVE20', total_allocated_amount: 2000 }],
    }
    expect(savingsForCode(cart, 'SAVE20')).toBe(2000)
  })
  test('falls back to the cart-level application (GraphQL shape)', () => {
    const cart = {
      items: [{ line_level_discount_allocations: [] }],
      cart_level_discount_applications: [{ title: 'FLAT200', type: 'discount_code', total_allocated_amount: 20000 }],
    }
    expect(savingsForCode(cart, 'flat200')).toBe(20000)
  })
  test('0 for an unknown code or no cart', () => {
    expect(savingsForCode({ items: [] }, 'X')).toBe(0)
    expect(savingsForCode(null, 'X')).toBe(0)
  })
})

describe('hasFreebieMarker', () => {
  test('true for cartx _freebie', () => {
    expect(hasFreebieMarker({ _freebie: 'true' })).toBe(true)
  })
  test('true for a partner marker containing _freebie', () => {
    expect(hasFreebieMarker({ _gokwik_freebie: 'true' })).toBe(true)
  })
  test('false for unrelated props / empty / null', () => {
    expect(hasFreebieMarker({ _unique: '123' })).toBe(false)
    expect(hasFreebieMarker({})).toBe(false)
    expect(hasFreebieMarker(null)).toBe(false)
  })
})

describe('showsQuantitySelector', () => {
  test('paid line with no gift attribute → show', () => {
    expect(showsQuantitySelector({ final_price: 37500, properties: {} })).toBe(true)
  })

  test('freebie line → hide', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: { _freebie: 'true' } })).toBe(false)
  })

  test('partner freebie line → hide', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: { _gokwik_freebie: 'true' } })).toBe(false)
  })

  test('claim line → hide (both markers)', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: { _claimed: 'true' } })).toBe(false)
    expect(showsQuantitySelector({ final_price: 0, properties: { _cartmax_claim: 'true' } })).toBe(false)
  })

  test('NEW: zero-price line with NO attribute → hide', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: {} })).toBe(false)
  })

  test('NEW: line discounted to 0 (base price > 0, no attribute) → hide', () => {
    expect(showsQuantitySelector({ price: 67500, final_price: 0, properties: {} })).toBe(false)
  })

  test('falls back to price when final_price is absent', () => {
    expect(showsQuantitySelector({ price: 500, properties: {} })).toBe(true)
    expect(showsQuantitySelector({ price: 0, properties: {} })).toBe(false)
  })

  test('missing item / no price fields → hide (safe default)', () => {
    expect(showsQuantitySelector(null)).toBe(false)
    expect(showsQuantitySelector({ properties: {} })).toBe(false)
  })
})

describe('giftChargedAmount', () => {
  test('is 0 when the gift discount landed (line is genuinely free)', () => {
    expect(giftChargedAmount({ final_line_price: 0, line_price: 0 })).toBe(0)
  })

  test('is 0 for an optimistic gift line with no price fields yet', () => {
    expect(giftChargedAmount({ properties: { _freebie: 'true' } })).toBe(0)
    expect(giftChargedAmount(null)).toBe(0)
  })

  test('reports the charge when the gift discount did NOT apply', () => {
    // Real soulflower case: BUY1GET1 code had "combines with product discounts"
    // off, so Shopify dropped our automatic gift discount and charged 262.50.
    expect(giftChargedAmount({ final_line_price: 26250, line_price: 26250 })).toBe(26250)
  })

  test('trusts final_line_price over the pre-discount line_price', () => {
    expect(giftChargedAmount({ final_line_price: 0, line_price: 26250 })).toBe(0)
  })

  test('falls back to line_price when final_line_price is absent', () => {
    expect(giftChargedAmount({ line_price: 5000 })).toBe(5000)
  })
})

describe('milestonePositions / mapProgress', () => {
  test('even spacing is unchanged', () => {
    expect(milestonePositions(3, 'even').map(Math.round)).toEqual([33, 67, 100])
    expect(mapProgress(50, 3, 'even')).toBe(50)
  })
  test('edges spacing puts milestones at both ends', () => {
    expect(milestonePositions(3, 'edges')).toEqual([0, 50, 100])
    expect(milestonePositions(1, 'edges')).toEqual([100])
  })
  test('edges fill lines up with the milestones', () => {
    expect(mapProgress(100 / 3, 3, 'edges')).toBe(0) // first milestone reached
    expect(mapProgress(200 / 3, 3, 'edges')).toBeCloseTo(50) // second reached
    expect(mapProgress(100, 3, 'edges')).toBe(100)
    expect(mapProgress(50, 3, 'edges')).toBeCloseTo(25) // halfway to the second
    expect(mapProgress(10, 3, 'edges')).toBe(0) // before the first: no room on the track
  })
})
