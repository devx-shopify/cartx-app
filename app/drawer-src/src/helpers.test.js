import { describe, test, expect } from 'vitest'
import { hasFreebieMarker, showsQuantitySelector, giftChargedAmount } from './helpers.js'

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
