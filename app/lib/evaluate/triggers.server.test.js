import { describe, test, expect } from 'vitest'
import { evaluateOffers } from './triggers.server.js'

// Server mirror of the client (rules.js) variant-aware removal. Same recycled-id
// scenario: offer grants only the Mystery Box now, but the cart still carries
// gift lines from when that offer id granted PDRN + Frizz + Hair Mask.
const MB_GID = 'gid://shopify/ProductVariant/47891547455741'
const MB_NUM = 47891547455741
const HAIR = 8904134098624
const FRIZZ = 8904134098648

function mysteryOffer(overrides = {}) {
  return {
    id: 'O1',
    enabled: true,
    page_handles: ['/'],
    trigger: { price_threshold: 999 },
    reward: {
      type: 'auto_add_gift',
      add_mode: 'auto',
      quantity_per_variant: 1,
      gift_variants: [MB_GID],
      gift_variant_data: [{ variant_id: MB_GID, title: 'Mystery Box Freebie', image: '' }],
    },
    ...overrides,
  }
}
function paidLine(key, variantId) {
  return { key, variant_id: variantId, quantity: 1, properties: {} }
}
function giftLine(key, variantId, offerId, extra) {
  return {
    key,
    variant_id: variantId,
    quantity: 1,
    properties: Object.assign({ _freebie: 'true', _offer_id: offerId }, extra || {}),
  }
}

describe('triggers.server evaluateOffers — variant-aware removal (parity)', () => {
  test('recycled offer id: drops stale variants, keeps the granted one', () => {
    const cart = {
      items: [
        paidLine('p1', 555),
        giftLine('g_mb', MB_NUM, 'O1'),
        giftLine('g_hair', HAIR, 'O1'),
        giftLine('g_frizz', FRIZZ, 'O1'),
      ],
    }
    const r = evaluateOffers([mysteryOffer()], cart, 1500, 3, '/', null)
    expect(r.to_remove.sort()).toEqual(['g_frizz', 'g_hair'])
  })

  test('legit granted gift is kept', () => {
    const cart = { items: [paidLine('p1', 555), giftLine('g_mb', MB_NUM, 'O1')] }
    const r = evaluateOffers([mysteryOffer()], cart, 1500, 1, '/', null)
    expect(r.to_remove).toHaveLength(0)
  })

  test('empty-config guard: no offers → never strip', () => {
    const cart = { items: [giftLine('g_mb', MB_NUM, 'O1'), giftLine('g_hair', HAIR, 'O1')] }
    const r = evaluateOffers([], cart, 1500, 2, '/', null)
    expect(r.to_remove).toHaveLength(0)
  })
})
