import { describe, it, expect } from 'vitest'
import { sourceMatcher, scopedTotals, offerTriggered, volumeQualifyingQty, sourceKey } from './line-match.js'
import { buildBar } from './progress-bar.js'

const line = (variant, product, qty, cents, props) => ({
  variant_id: variant, product_id: product, quantity: qty,
  original_line_price: cents * qty, line_price: cents * qty, properties: props || {},
})
const ITEMS = [
  line(11, 501, 2, 10000),                      // in collection: ₹200
  line(22, 999, 1, 30000),                      // outside: ₹300
  line(33, 501, 1, 5000, { _freebie: 'true' }), // gift: never counts
]
const COL = { type: 'collection', collection_id: 'gid://shopify/Collection/7', collection_product_ids: ['gid://shopify/Product/501'] }

describe('line-match', () => {
  it('no source / cart source = whole cart', () => {
    expect(sourceMatcher(undefined)).toBe(null)
    expect(sourceMatcher({ type: 'cart' })).toBe(null)
    expect(scopedTotals(ITEMS, undefined)).toEqual({ total: 500, qty: 3 })
  })
  it('collection counts only its products, gifts excluded', () => {
    expect(scopedTotals(ITEMS, COL)).toEqual({ total: 200, qty: 2 })
  })
  it('an unresolved collection (old offer) keeps counting the whole cart', () => {
    expect(scopedTotals(ITEMS, { type: 'collection', collection_id: '7' })).toEqual({ total: 500, qty: 3 })
  })
  it('an empty collection matches nothing', () => {
    expect(scopedTotals(ITEMS, { ...COL, collection_product_ids: [] })).toEqual({ total: 0, qty: 0 })
  })
  it('milestone "products" source matches any variant of the product', () => {
    expect(scopedTotals(ITEMS, { type: 'products', product_ids: ['999'] })).toEqual({ total: 300, qty: 1 })
  })
  it('external discounts lower scoped spend', () => {
    const disc = { ...line(11, 501, 2, 10000), line_level_discount_allocations: [{ amount: 5000, discount_application: { title: 'B2G2' } }] }
    expect(scopedTotals([disc], COL).total).toBe(150)
  })
  it('offerTriggered: collection threshold uses collection spend only', () => {
    const offer = { source: COL, trigger: { price_threshold: 250 } }
    expect(offerTriggered(offer, ITEMS, 500, 3)).toBe(false)
    expect(offerTriggered({ ...offer, trigger: { price_threshold: 200 } }, ITEMS, 500, 3)).toBe(true)
  })
  it('offerTriggered: product source is presence, no source uses whole cart', () => {
    expect(offerTriggered({ source: { type: 'product', product_variant_ids: ['gid://shopify/ProductVariant/22'] }, trigger: {} }, ITEMS, 0, 0)).toBe(true)
    expect(offerTriggered({ trigger: { quantity_threshold: 3 } }, ITEMS, 500, 3)).toBe(true)
  })
  it('volumeQualifyingQty skips gifts and other products', () => {
    expect(volumeQualifyingQty({ source: COL }, ITEMS)).toBe(2)
    expect(volumeQualifyingQty({}, ITEMS)).toBe(3)
  })
  it('sourceKey separates different scopes', () => {
    expect(sourceKey(undefined)).toBe('')
    expect(sourceKey(COL)).not.toBe(sourceKey({ type: 'products', product_ids: ['999'] }))
  })
})

describe('progress bar with a scoped milestone', () => {
  const config = {
    offers: [],
    claim_gifts: [],
    progress_bar: {
      enabled: true,
      visual_milestones: [
        { id: 'm1', enabled: true, trigger: { type: 'price', threshold: 250 }, label: 'Herbs ₹250', page_handles: ['/'], source: COL },
        { id: 'm2', enabled: true, trigger: { type: 'price', threshold: 400 }, label: 'Cart ₹400', page_handles: ['/'] },
      ],
    },
  }
  it('collection milestone stays locked while the whole cart passes its own', () => {
    const bar = buildBar(config, '/', 500, 3, '₹{{amount}}', null, ITEMS)
    const m1 = bar.tiers.find((t) => t.id === 'm1')
    const m2 = bar.tiers.find((t) => t.id === 'm2')
    expect(m2.state).toBe('active')
    expect(m1.state).not.toBe('active')
    expect(m1.scope_ref).toBe('m1')
  })
})
