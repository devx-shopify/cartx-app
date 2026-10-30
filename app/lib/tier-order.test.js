import { describe, it, expect } from 'vitest'
import { orderTiers, defaultTierOrder, isDefaultTierOrder, outOfAmountOrder } from './tier-order.js'

const t = (id, type, threshold) => ({ id, type, threshold })
const ids = (list) => list.map((x) => x.id)

const buy1 = t('buy1', 'quantity', 1)
const p799 = t('p799', 'price', 799)
const p1099 = t('p1099', 'price', 1099)
const p1200 = t('p1200', 'price', 1200)
const p2000 = t('p2000', 'price', 2000)

describe('defaultTierOrder', () => {
  it('sorts quantity milestones first, then price, each by amount', () => {
    expect(ids(defaultTierOrder([p2000, p799, buy1, p1200]))).toEqual(['buy1', 'p799', 'p1200', 'p2000'])
  })

  it('reads trigger_type when there is no type (bar evaluator tiers)', () => {
    const tiers = [{ id: 'b', trigger_type: 'price', threshold: 900 }, { id: 'a', trigger_type: 'price', threshold: 100 }]
    expect(ids(defaultTierOrder(tiers))).toEqual(['a', 'b'])
  })
})

describe('orderTiers', () => {
  it('uses the default order when nothing was reordered', () => {
    expect(ids(orderTiers([p2000, p1200, buy1], []))).toEqual(['buy1', 'p1200', 'p2000'])
  })

  it('slots a milestone missing from the saved order in by amount', () => {
    const saved = ['buy1', 'p799', 'p1099', 'p2000']
    expect(ids(orderTiers([buy1, p799, p1099, p2000, p1200], saved)))
      .toEqual(['buy1', 'p799', 'p1099', 'p1200', 'p2000'])
  })

  it('keeps a manual order that breaks amount order', () => {
    const saved = ['p2000', 'p799', 'buy1']
    expect(ids(orderTiers([buy1, p799, p2000], saved))).toEqual(['p2000', 'p799', 'buy1'])
  })

  it('puts a new lowest milestone before the first of its kind', () => {
    const p100 = t('p100', 'price', 100)
    expect(ids(orderTiers([buy1, p799, p2000, p100], ['buy1', 'p799', 'p2000'])))
      .toEqual(['buy1', 'p100', 'p799', 'p2000'])
  })

  it('places a new kind where it goes by default', () => {
    const q3 = t('q3', 'quantity', 3)
    expect(ids(orderTiers([p799, p2000, q3], ['p799', 'p2000']))).toEqual(['q3', 'p799', 'p2000'])
    expect(ids(orderTiers([buy1, p799], ['buy1']))).toEqual(['buy1', 'p799'])
  })

  it('ignores saved ids that no longer exist', () => {
    expect(ids(orderTiers([p799, p2000], ['gone', 'p2000', 'p799']))).toEqual(['p2000', 'p799'])
  })
})

describe('isDefaultTierOrder / outOfAmountOrder', () => {
  it('detects the default order', () => {
    expect(isDefaultTierOrder([buy1, p799, p2000])).toBe(true)
    expect(isDefaultTierOrder([p799, buy1])).toBe(false)
  })

  it('lists same-kind pairs shown higher amount first', () => {
    const pairs = outOfAmountOrder([buy1, p2000, p1200])
    expect(pairs.map(([a, b]) => [a.id, b.id])).toEqual([['p2000', 'p1200']])
    expect(outOfAmountOrder([p799, buy1])).toEqual([])
  })
})
