import { describe, test, expect, vi } from 'vitest'

// reconcileConfig is pure; stub the modules that would open a database.
vi.mock('./config.server.js', () => ({ loadConfig: vi.fn(), saveConfig: vi.fn(), listConfigThemeIds: vi.fn() }))
vi.mock('./upsells.server.js', () => ({ syncUpsellProduct: vi.fn(), removeUpsellProduct: vi.fn() }))
vi.mock('./sentry.server.js', () => ({ captureException: vi.fn() }))

const { reconcileConfig } = await import('./product-sync.server.js')

const product = {
  status: 'ACTIVE',
  online_store: true,
  available: true,
  title: 'Arm Cuff',
  byVariant: { 11: { title: 'Arm Cuff', image: 'img.png', price: '1499.00', compareAtPrice: '1999.00' } },
}

function config(giftData, claimData) {
  return {
    offers: [{ id: 'O1', enabled: true, reward: { type: 'auto_add_gift', gift_variants: ['11'], gift_variant_data: [giftData] } }],
    claim_gifts: claimData ? [{ id: 'C1', enabled: true, claimable_variants: ['11'], claimable_variant_data: [claimData] }] : [],
    upsells: { products: [] },
  }
}

describe('reconcileConfig — gift card prices', () => {
  test('refreshes a stored offer gift price', () => {
    const c = config({ variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png', price: '999.00', compare_at_price: '' })
    expect(reconcileConfig(c, '1', product)).toBe(true)
    expect(c.offers[0].reward.gift_variant_data[0]).toMatchObject({ price: '1499.00', compare_at_price: '1999.00' })
  })

  test('backfills an offer saved before prices were stored', () => {
    const c = config({ variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png' })
    expect(reconcileConfig(c, '1', product)).toBe(true)
    expect(c.offers[0].reward.gift_variant_data[0].price).toBe('1499.00')
  })

  test('leaves claim gift snapshots without prices', () => {
    const live = { status: 'ACTIVE', online_store: true }
    const entry = { variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png', ...live }
    const c = config({ variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png', price: '1499.00', compare_at_price: '1999.00', ...live }, entry)
    expect(reconcileConfig(c, '1', product)).toBe(false)
    expect(c.claim_gifts[0].claimable_variant_data[0].price).toBeUndefined()
  })
})

describe('reconcileConfig — draft products', () => {
  const draft = { ...product, status: 'DRAFT', available: false }

  test('keeps the promotion on and flags the gift', () => {
    const c = config({ variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png', status: 'ACTIVE', online_store: true })
    expect(reconcileConfig(c, '1', draft)).toBe(true)
    expect(c.offers[0].enabled).toBe(true)
    expect(c.offers[0].reward.gift_variants).toEqual(['11'])
    expect(c.offers[0].reward.gift_variant_data[0].status).toBe('DRAFT')
  })

  test('re-enables a promotion an older build auto-drafted', () => {
    const c = config({ variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png' })
    Object.assign(c.offers[0], { enabled: false, _auto_disabled: true, _needs_attention: 'x' })
    reconcileConfig(c, '1', product)
    expect(c.offers[0].enabled).toBe(true)
    expect(c.offers[0]._needs_attention).toBeUndefined()
  })

  test('flags a drafted upsell product without removing it', () => {
    const c = config({ variant_id: '99', product_id: '9' })
    c.upsells.products = [{ product_id: '1', variant_id: '11', title: 'Arm Cuff', price: '1499.00' }]
    reconcileConfig(c, '1', draft)
    expect(c.upsells.products).toHaveLength(1)
    expect(c.upsells.products[0].status).toBe('DRAFT')
  })
})
