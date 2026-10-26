import { describe, test, expect, vi } from 'vitest'

vi.mock('../db.server.js', () => ({ default: {} }))
const { filterPromotionsForTheme } = await import('./analytics.server.js')

describe('filterPromotionsForTheme', () => {
  test('keeps per-product upsell rows, which are not promotions in the theme config', () => {
    const config = { offers: [], coupons: [], claim_gifts: [] }
    const rows = [
      { id: 'upsell:123', name: 'Rose Mist', type: null, status: 'active' },
      { id: 'upsell:456', name: 'Upsell product 456', type: 'upsell', status: 'deleted' },
      { id: 'gone-offer', name: 'Old', type: 'offer', status: 'deleted' },
    ]
    expect(filterPromotionsForTheme(rows, config).map((r) => r.id)).toEqual(['upsell:123'])
    expect(filterPromotionsForTheme(rows, config)[0].type).toBe('upsell')
    expect(filterPromotionsForTheme(rows, config, { showDeleted: true }).map((r) => r.id)).toEqual(['upsell:123', 'upsell:456', 'gone-offer'])
  })
})
