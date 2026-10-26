import { describe, test, expect, vi, beforeEach } from 'vitest'

const db = {
  known: new Set(),
  upserts: [],
  rules: [],
}
vi.mock('../db.server.js', () => ({
  default: {
    upsellProduct: {
      findUnique: vi.fn(async ({ where }) => (db.known.has(where.shopId_productId.productId) ? { id: 'x' } : null)),
      upsert: vi.fn((args) => { db.upserts.push(args.create); return args }),
      deleteMany: vi.fn((args) => args),
    },
    upsellRule: {
      findMany: vi.fn(async () => db.rules),
      deleteMany: vi.fn((args) => args),
      update: vi.fn((args) => args),
    },
    $transaction: vi.fn(async (ops) => ops),
  },
}))

const { syncUpsellProduct, ShopifyApiError } = await import('./upsells.server.js')
const prisma = (await import('../db.server.js')).default

const adminReturning = (nodes) => ({ graphql: async () => ({ json: async () => ({ data: { nodes } }) }) })
const node = { id: 'gid://shopify/Product/5', title: 'Fresh', handle: 'fresh', status: 'DRAFT', featuredImage: null,
  variants: { nodes: [{ id: 'gid://shopify/ProductVariant/50', price: '12.00', compareAtPrice: '15.00' }] } }

beforeEach(() => {
  db.known = new Set(); db.upserts = []; db.rules = []
  vi.clearAllMocks()
})

describe('syncUpsellProduct (products/update)', () => {
  test('skips products no rule references, without calling Shopify', async () => {
    const admin = { graphql: vi.fn() }
    expect(await syncUpsellProduct('s', admin, '5')).toEqual({ skipped: true })
    expect(admin.graphql).not.toHaveBeenCalled()
  })

  test('refreshes a referenced product, including its status', async () => {
    db.known.add('5')
    expect(await syncUpsellProduct('s', adminReturning([node]), 'gid://shopify/Product/5')).toEqual({ refreshed: true })
    expect(db.upserts[0]).toMatchObject({ productId: '5', title: 'Fresh', handle: 'fresh', status: 'DRAFT', price: '12.00', compareAtPrice: '15.00' })
  })

  test('a product Shopify no longer returns is removed like a delete', async () => {
    db.known.add('5')
    expect(await syncUpsellProduct('s', adminReturning([null]), '5')).toMatchObject({ removed: true })
    expect(prisma.upsellProduct.deleteMany).toHaveBeenCalledWith({ where: { shopId: 's', productId: '5' } })
  })

  test('a Shopify API failure changes nothing', async () => {
    db.known.add('5')
    const failing = { graphql: async () => ({ json: async () => ({ errors: [{ message: 'Throttled' }] }) }) }
    await expect(syncUpsellProduct('s', failing, '5')).rejects.toBeInstanceOf(ShopifyApiError)
    expect(db.upserts).toEqual([])
    expect(prisma.upsellProduct.deleteMany).not.toHaveBeenCalled()
  })
})
