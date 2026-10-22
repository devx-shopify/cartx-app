import { describe, test, expect } from 'vitest'
import { pickRecommendations, triggerProductIds, isGiftLine, numericId } from './upsell-recs.js'

const snap = (id, extra = {}) => ({
  product_id: `gid://shopify/Product/${id}`,
  title: `P${id}`,
  handle: `p-${id}`,
  image_url: '',
  variant_id: `gid://shopify/ProductVariant/${id}0`,
  price: '10.00',
  status: 'ACTIVE',
  ...extra,
})
const catalogOf = (...ids) => Object.fromEntries(ids.map((id) => [String(id), snap(id)]))
const line = (productId, properties = {}) => ({ product_id: productId, properties })
const CART_BASED = { mode: 'cart_based', no_match: 'default', fill_with_default: false, sold_out: 'show', max_items: 8, max_per_trigger: 10 }
const ids = (cards) => cards.map((c) => c.product_id)

describe('numericId', () => {
  test('strips GIDs and stringifies numbers', () => {
    expect(numericId('gid://shopify/Product/42')).toBe('42')
    expect(numericId(42)).toBe('42')
    expect(numericId(null)).toBe('')
  })
})

describe('isGiftLine / triggerProductIds', () => {
  test('freebie and claim markers are gifts', () => {
    expect(isGiftLine(line(1, { _freebie: 'true' }))).toBe(true)
    expect(isGiftLine(line(1, { _cartmax_claim: 'true' }))).toBe(true)
    expect(isGiftLine(line(1, { _claimed: 'true' }))).toBe(true)
    expect(isGiftLine(line(1, { _gokwik_freebie: 'true' }))).toBe(true)
    expect(isGiftLine(line(1, { _note: 'x' }))).toBe(false)
  })
  test('keeps cart order, skips gifts, dedupes variants of one product', () => {
    const items = [line(3), line(1, { _freebie: 'true' }), line(2), line(3)]
    expect(triggerProductIds(items)).toEqual(['3', '2'])
  })
})

describe('pickRecommendations: cart_based', () => {
  test('newest line first, then each rule in merchant order', () => {
    // Cart: K9 shampoo (1) added first, Botoliss shampoo (2) added after -> 2 is newest.
    const items = [line(2), line(1)]
    const rules = { 1: ['11', '12', '13'], 2: ['21', '22', '23'] }
    const cards = pickRecommendations({ items, rules, catalog: catalogOf(11, 12, 13, 21, 22, 23), settings: CART_BASED })
    expect(ids(cards)).toEqual(['21', '22', '23', '11', '12', '13'])
    expect(cards[0]).toMatchObject({ source: 'rule', trigger_product_id: '2', variant_id: '210' })
  })

  test('a product recommended by two lines appears once, at the newer line', () => {
    const items = [line(2), line(1)]
    const rules = { 1: ['30', '11'], 2: ['30', '21'] }
    const cards = pickRecommendations({ items, rules, catalog: catalogOf(11, 21, 30), settings: CART_BASED })
    expect(ids(cards)).toEqual(['30', '21', '11'])
    expect(cards[0].trigger_product_id).toBe('2')
  })

  test('never recommends a product already in the cart (any variant)', () => {
    const items = [line(1), line('gid://shopify/Product/12')]
    const rules = { 1: ['12', '13'] }
    expect(ids(pickRecommendations({ items, rules, catalog: catalogOf(12, 13), settings: CART_BASED }))).toEqual(['13'])
  })

  test('gift lines do not trigger rules', () => {
    const items = [line(1, { _freebie: 'true' })]
    const rules = { 1: ['11'] }
    expect(pickRecommendations({ items, rules, catalog: catalogOf(11), settings: { ...CART_BASED, no_match: 'none' } })).toEqual([])
  })

  test('skips draft, archived and missing products', () => {
    const catalog = { ...catalogOf(11), 12: snap(12, { status: 'DRAFT' }), 13: snap(13, { status: 'ARCHIVED' }) }
    const cards = pickRecommendations({ items: [line(1)], rules: { 1: ['14', '12', '13', '11'] }, catalog, settings: CART_BASED })
    expect(ids(cards)).toEqual(['11'])
  })

  test('max_per_trigger reads only the first N of a rule', () => {
    const rules = { 1: ['11', '12', '13'] }
    const cards = pickRecommendations({ items: [line(1)], rules, catalog: catalogOf(11, 12, 13), settings: { ...CART_BASED, max_per_trigger: 2 } })
    expect(ids(cards)).toEqual(['11', '12'])
  })

  test('max_items caps the total across lines; limit overrides it', () => {
    const rules = { 1: ['11', '12'], 2: ['21', '22'] }
    const input = { items: [line(2), line(1)], rules, catalog: catalogOf(11, 12, 21, 22), settings: { ...CART_BASED, max_items: 3 } }
    expect(ids(pickRecommendations(input))).toEqual(['21', '22', '11'])
    expect(ids(pickRecommendations({ ...input, limit: 4 }))).toEqual(['21', '22', '11', '12'])
  })

  test('no rule matches -> default list (no_match = default)', () => {
    const cards = pickRecommendations({ items: [line(1)], rules: {}, defaults: [snap(50), snap(51)], settings: CART_BASED })
    expect(ids(cards)).toEqual(['50', '51'])
    expect(cards[0]).toMatchObject({ source: 'default', trigger_product_id: null })
  })

  test('no rule matches and no_match = none -> nothing', () => {
    expect(pickRecommendations({ items: [line(1)], rules: {}, defaults: [snap(50)], settings: { ...CART_BASED, no_match: 'none' } })).toEqual([])
  })

  test('no rule matches and default list empty -> nothing', () => {
    expect(pickRecommendations({ items: [line(1)], rules: {}, defaults: [], settings: CART_BASED })).toEqual([])
  })

  test('rule matches -> defaults are not added unless fill_with_default', () => {
    const base = { items: [line(1)], rules: { 1: ['11'] }, catalog: catalogOf(11), defaults: [snap(50), snap(11)] }
    expect(ids(pickRecommendations({ ...base, settings: CART_BASED }))).toEqual(['11'])
    expect(ids(pickRecommendations({ ...base, settings: { ...CART_BASED, fill_with_default: true } }))).toEqual(['11', '50'])
  })

  test('empty cart -> default list', () => {
    expect(ids(pickRecommendations({ items: [], rules: { 1: ['11'] }, catalog: catalogOf(11), defaults: [snap(50)], settings: CART_BASED }))).toEqual(['50'])
  })

  test('sold_out = hide skips known-unavailable products and backfills from later ones', () => {
    const base = { items: [line(1)], rules: { 1: ['11', '12', '13'] }, catalog: catalogOf(11, 12, 13), unavailable: { 11: true } }
    expect(ids(pickRecommendations({ ...base, settings: { ...CART_BASED, sold_out: 'hide', max_items: 2 } }))).toEqual(['12', '13'])
    expect(ids(pickRecommendations({ ...base, settings: { ...CART_BASED, sold_out: 'show', max_items: 2 } }))).toEqual(['11', '12'])
  })
})

describe('pickRecommendations: static mode', () => {
  test('default list minus in-cart products, ignores rules', () => {
    const defaults = [snap(50), snap(51), snap(52)]
    const cards = pickRecommendations({
      items: [line(51)],
      rules: { 51: ['11'] },
      catalog: catalogOf(11),
      defaults,
      settings: { mode: 'static', max_items: 8 },
    })
    expect(ids(cards)).toEqual(['50', '52'])
  })

  test('max_items caps static mode too', () => {
    const defaults = [snap(50), snap(51), snap(52)]
    expect(ids(pickRecommendations({ items: [], defaults, settings: { mode: 'static', max_items: 2 } }))).toEqual(['50', '51'])
  })

  test('sold-out defaults are hidden unless sold_out = show', () => {
    const base = { items: [], defaults: [snap(50), snap(51)], unavailable: { 50: true } }
    expect(ids(pickRecommendations({ ...base, settings: { mode: 'static' } }))).toEqual(['51'])
    expect(ids(pickRecommendations({ ...base, settings: { mode: 'static', sold_out: 'show' } }))).toEqual(['50', '51'])
  })

  test('missing settings behave as static', () => {
    expect(ids(pickRecommendations({ items: [], defaults: [snap(50)] }))).toEqual(['50'])
  })
})
