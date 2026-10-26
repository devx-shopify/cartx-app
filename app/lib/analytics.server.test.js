import { describe, test, expect, vi } from 'vitest'

vi.mock('../db.server.js', () => ({ default: {} }))
const { filterPromotionsForTheme } = await import('./analytics.server.js')

describe('filterPromotionsForTheme', () => {
  test('keeps per-product upsell rows, which are not promotions in the theme config', () => {
    const config = { offers: [], coupons: [], claim_gifts: [] }
    const rows = [
      { id: 'upsell:123', name: 'Rose Mist', type: null },
      { id: 'gone-offer', name: 'Old', type: 'offer', status: 'deleted' },
    ]
    expect(filterPromotionsForTheme(rows, config)).toEqual([
      { id: 'upsell:123', name: 'Rose Mist', type: 'upsell', status: 'active' },
    ])
  })
})
