import { describe, test, expect } from 'vitest'
import { hasFreebieMarker, showsQuantitySelector } from './helpers.js'

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
