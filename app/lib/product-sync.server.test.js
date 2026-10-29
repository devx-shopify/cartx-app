import { describe, test, expect, vi } from 'vitest'

// reconcileConfig is pure; stub the modules that would open a database.
vi.mock('./config.server.js', () => ({ loadConfig: vi.fn(), saveConfig: vi.fn(), listConfigThemeIds: vi.fn() }))
vi.mock('./upsells.server.js', () => ({ syncUpsellProduct: vi.fn(), removeUpsellProduct: vi.fn() }))
vi.mock('./sentry.server.js', () => ({ captureException: vi.fn() }))

const { reconcileConfig } = await import('./product-sync.server.js')

const product = {
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
    const entry = { variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png' }
    const c = config({ variant_id: '11', product_id: '1', title: 'Arm Cuff', image: 'img.png', price: '1499.00', compare_at_price: '1999.00' }, entry)
    expect(reconcileConfig(c, '1', product)).toBe(false)
    expect(c.claim_gifts[0].claimable_variant_data[0].price).toBeUndefined()
  })
})
