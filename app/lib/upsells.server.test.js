import { describe, test, expect } from 'vitest'
import { adminQuery, ShopifyApiError, friendlyError, fetchDefaultProducts, fetchProductSnapshots, cleanRecommendedIds } from './upsells.server.js'
import { planImport } from './upsell-import.server.js'

// Minimal stand-ins for the authenticated admin client.
const respond = (json) => ({ graphql: async () => ({ json: async () => json }) })
const failing = { graphql: async () => { throw new Error('socket hang up') } }
const product = (id, handle) => ({
  id: `gid://shopify/Product/${id}`, title: `P${id}`, handle, status: 'ACTIVE',
  featuredImage: null, variants: { nodes: [{ id: `gid://shopify/ProductVariant/${id}0`, price: '10.00', compareAtPrice: null }] },
})

describe('adminQuery', () => {
  test('returns data on success', async () => {
    expect(await adminQuery(respond({ data: { ok: 1 } }), 'query')).toEqual({ ok: 1 })
  })
  test('throws ShopifyApiError on GraphQL errors, missing data, or transport failure', async () => {
    await expect(adminQuery(respond({ errors: [{ message: 'Throttled' }] }), 'q')).rejects.toBeInstanceOf(ShopifyApiError)
    await expect(adminQuery(respond({}), 'q')).rejects.toBeInstanceOf(ShopifyApiError)
    await expect(adminQuery(failing, 'q')).rejects.toBeInstanceOf(ShopifyApiError)
  })
})

describe('API failures are never read as "no products"', () => {
  test('saving the default list fails instead of saving an empty list', async () => {
    await expect(fetchDefaultProducts(respond({ errors: [{ message: 'Throttled' }] }), ['1'])).rejects.toBeInstanceOf(ShopifyApiError)
  })
  test('rule snapshots fail instead of saving a rule with no product data', async () => {
    await expect(fetchProductSnapshots(failing, ['1'])).rejects.toBeInstanceOf(ShopifyApiError)
  })
  test('import planning fails instead of marking real products "not found"', async () => {
    await expect(planImport(failing, 'trigger,recommendation_1\na,b\n', 10)).rejects.toBeInstanceOf(ShopifyApiError)
  })
  test('import planning resolves handles on success', async () => {
    const admin = respond({ data: { products: { nodes: [product(1, 'a'), product(2, 'b')] } } })
    const plan = await planImport(admin, 'trigger,recommendation_1\na,b\n', 10)
    expect(plan.rules).toEqual([{ triggerProductId: '1', recommendedIds: ['2'] }])
  })
})

describe('friendlyError', () => {
  test('maps API and Prisma errors to merchant-facing text', () => {
    expect(friendlyError(new ShopifyApiError('x'))).toMatch(/Couldn't reach Shopify/)
    expect(friendlyError(Object.assign(new Error('dup'), { code: 'P2002' }))).toMatch(/already has a rule/)
    expect(friendlyError(new Error('boom'))).toMatch(/Something went wrong/)
  })
})

describe('cleanRecommendedIds', () => {
  test('drops self, duplicates and over-cap ids and reports them', () => {
    expect(cleanRecommendedIds('1', ['gid://shopify/Product/2', '1', '2', '3', '4'], 2)).toEqual({
      ids: ['2', '3'],
      removed: { self: 1, duplicate: 1, overCap: 1 },
    })
  })
})
