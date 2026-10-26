import { describe, test, expect, vi, beforeEach } from 'vitest'

const created = []
vi.mock('../db.server.js', () => ({
  default: {
    analyticsEvent: {
      findFirst: vi.fn(async () => null),
      createMany: vi.fn(async ({ data }) => { created.push(...data) }),
    },
    themeConfig: { findUnique: vi.fn(async () => null) },
  },
}))
vi.mock('./promotion-meta.server.js', () => ({ loadPromotionMeta: vi.fn(async () => new Map()) }))

const { attributeOrder } = await import('./attribution.server.js')

const line = (id, productId, price, properties = []) => ({
  id, product_id: productId, variant_id: productId * 10, title: `Product ${productId}`,
  price, quantity: 1, total_discount: '0.00', discount_allocations: [], properties,
})

beforeEach(() => { created.length = 0 })

describe('attributeOrder: upsell lines', () => {
  test('credits each upsell line to upsell:<product_id> with its revenue and source', async () => {
    await attributeOrder('shop.myshopify.com', {
      id: 1001,
      total_price: '800.00',
      subtotal_price: '800.00',
      line_items: [
        line(1, 11, '500.00'),
        line(2, 22, '200.00', [{ name: '_cartx_upsell', value: 'rule:11' }]),
        line(3, 33, '100.00', [{ name: '_cartx_upsell', value: 'default' }]),
      ],
    })
    const shopRow = created.find((r) => r.promotionId === '_shop')
    expect(shopRow.metadata.attributed).toBe(true)

    const upsells = created.filter((r) => r.promotionType === 'upsell')
    expect(upsells.map((r) => [r.promotionId, r.revenue, r.promotionName, r.metadata.upsell_sources])).toEqual([
      ['upsell:22', 20000, 'Product 22', ['rule:11']],
      ['upsell:33', 10000, 'Product 33', ['default']],
    ])
  })

  test('orders without upsell lines are not attributed to upsells', async () => {
    await attributeOrder('shop.myshopify.com', {
      id: 1002, total_price: '500.00', subtotal_price: '500.00', line_items: [line(1, 11, '500.00')],
    })
    expect(created.filter((r) => r.promotionType === 'upsell')).toEqual([])
    expect(created.find((r) => r.promotionId === '_shop').metadata.attributed).toBe(false)
  })
})
