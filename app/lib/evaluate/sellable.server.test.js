import { describe, test, expect } from 'vitest'
import { sellableConfig } from './sellable.server.js'

const gift = (vid, status = 'ACTIVE', online_store = true) => ({ variant_id: vid, product_id: `p${vid}`, title: `G${vid}`, status, online_store })

function config() {
  return {
    offers: [
      { id: 'mixed', reward: { type: 'auto_add_gift', gift_variants: ['1', '2'], gift_variant_data: [gift('1'), gift('2', 'DRAFT')] } },
      { id: 'all-draft', reward: { type: 'auto_add_gift', gift_variants: ['3'], gift_variant_data: [gift('3', 'ARCHIVED')] } },
      { id: 'discount', reward: { type: 'percentage', value: 10 } },
      { id: 'legacy', reward: { type: 'auto_add_gift', gift_variants: ['4'], gift_variant_data: [{ variant_id: '4' }] } },
    ],
    claim_gifts: [
      { id: 'claim-mixed', claimable_variants: ['5', 'gid://shopify/ProductVariant/6'], claimable_variant_data: [gift('5', 'UNLISTED'), gift('gid://shopify/ProductVariant/6', 'ACTIVE', false)] },
      { id: 'claim-none', claimable_variants: ['7'], claimable_variant_data: [gift('7', 'DRAFT')] },
    ],
    upsells: { products: [{ product_id: '8', status: 'DRAFT' }, { product_id: '9', status: 'ACTIVE', online_store: true }, { product_id: '10' }] },
  }
}

describe('sellableConfig', () => {
  test('drops unsellable gifts and keeps the rest of the offer', () => {
    const out = sellableConfig(config())
    const mixed = out.offers.find((o) => o.id === 'mixed')
    expect(mixed.reward.gift_variants).toEqual(['1'])
    expect(mixed.reward.gift_variant_data.map((d) => d.variant_id)).toEqual(['1'])
  })

  test('removes a gift offer or claim gift with nothing left to give', () => {
    const out = sellableConfig(config())
    expect(out.offers.map((o) => o.id)).toEqual(['mixed', 'discount', 'legacy'])
    expect(out.claim_gifts.map((c) => c.id)).toEqual(['claim-mixed'])
  })

  test('keeps unlisted claim gifts, drops ones off the Online Store', () => {
    const claim = sellableConfig(config()).claim_gifts[0]
    expect(claim.claimable_variants).toEqual(['5'])
  })

  test('filters upsell products and leaves the stored config untouched', () => {
    const c = config()
    const out = sellableConfig(c)
    expect(out.upsells.products.map((p) => p.product_id)).toEqual(['9', '10'])
    expect(c.upsells.products).toHaveLength(3)
    expect(c.offers[0].reward.gift_variants).toEqual(['1', '2'])
  })
})
