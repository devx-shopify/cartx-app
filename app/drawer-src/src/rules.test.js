import { describe, test, expect } from 'vitest'
import { evaluateOffers, evaluateClaimRemovals } from './rules.js'

// ── Fixtures ────────────────────────────────────────────────
// Real-world shapes: offer.gift_variants are gids; a /cart.js line's variant_id
// is a NUMBER. The removal logic must match across that gid/number boundary.
const MB_GID = 'gid://shopify/ProductVariant/47891547455741'
const MB_NUM = 47891547455741
const HAIR = 8904134098624
const FRIZZ = 8904134098648
const PDRN = 8904134098631

// A gift offer that currently grants ONLY the Mystery Box (the recycled state of
// offer "14ccf7f4" on soulflower: it used to grant PDRN + Frizz + Hair Mask).
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
function cartOf(...items) {
  return { items }
}

const ABOVE = 1500 // adjTotal ≥ 999 → mystery offer triggered
const BELOW = 500 // adjTotal < 999 → not triggered

// ── Tests ───────────────────────────────────────────────────

describe('evaluateOffers — variant-aware gift removal', () => {
  test('recycled offer id: drops stale variants, keeps the currently-granted one', () => {
    const cart = cartOf(
      paidLine('p1', 555),
      giftLine('g_mb', MB_NUM, 'O1'),
      giftLine('g_hair', HAIR, 'O1'),
      giftLine('g_frizz', FRIZZ, 'O1'),
      giftLine('g_pdrn', PDRN, 'O1'),
    )
    const r = evaluateOffers([mysteryOffer()], cart, ABOVE, 3, '/', null)
    expect(r.to_remove.sort()).toEqual(['g_frizz', 'g_hair', 'g_pdrn'])
    // Mystery Box already present + granted → not re-added.
    expect(r.to_add).toHaveLength(0)
  })

  test('legit gift under a triggered, granting offer is kept', () => {
    const cart = cartOf(paidLine('p1', 555), giftLine('g_mb', MB_NUM, 'O1'))
    const r = evaluateOffers([mysteryOffer()], cart, ABOVE, 1, '/', null)
    expect(r.to_remove).toHaveLength(0)
    expect(r.to_add).toHaveLength(0)
  })

  test('adds the granted gift when it is missing', () => {
    const cart = cartOf(paidLine('p1', 555))
    const r = evaluateOffers([mysteryOffer()], cart, ABOVE, 1, '/', null)
    expect(r.to_add).toHaveLength(1)
    expect(String(r.to_add[0].variant_id)).toContain('47891547455741')
    expect(r.to_remove).toHaveLength(0)
  })

  test('below threshold: offer not triggered → its gift is removed', () => {
    const cart = cartOf(paidLine('p1', 555), giftLine('g_mb', MB_NUM, 'O1'))
    const r = evaluateOffers([mysteryOffer()], cart, BELOW, 1, '/', null)
    expect(r.to_remove).toEqual(['g_mb'])
  })

  test('offer gone but OTHER offers exist → orphaned gift removed', () => {
    // Cart line tagged O1, but O1 is not in the config (only O2 is).
    const other = mysteryOffer({ id: 'O2' })
    const cart = cartOf(paidLine('p1', 555), giftLine('g_x', HAIR, 'O1'))
    const r = evaluateOffers([other], cart, ABOVE, 1, '/', null)
    expect(r.to_remove).toEqual(['g_x'])
  })

  test('empty-config guard: NO offers → never strip (protects mis-resolved config)', () => {
    const cart = cartOf(
      paidLine('p1', 555),
      giftLine('g_mb', MB_NUM, 'O1'),
      giftLine('g_hair', HAIR, 'O1'),
    )
    const r = evaluateOffers([], cart, ABOVE, 2, '/', null)
    expect(r.to_remove).toHaveLength(0)
    expect(r.to_add).toHaveLength(0)
  })

  test('gid/number normalization matches regardless of which side is a gid', () => {
    // line variant is a gid string; offer grants the numeric form.
    const offer = mysteryOffer({ reward: { ...mysteryOffer().reward, gift_variants: [MB_NUM] } })
    const cart = cartOf(giftLine('g_mb', MB_GID, 'O1'))
    const r = evaluateOffers([offer], cart, ABOVE, 1, '/', null)
    expect(r.to_remove).toHaveLength(0)
  })

  test('freebie line WITHOUT an offer id (e.g. a partner gift) is left untouched', () => {
    const cart = cartOf(
      { key: 'partner', variant_id: HAIR, quantity: 1, properties: { _freebie: 'true' } },
    )
    const r = evaluateOffers([mysteryOffer()], cart, ABOVE, 1, '/', null)
    expect(r.to_remove).toHaveLength(0)
  })

  test('claimed gift lines are skipped (handled by claim removal, not here)', () => {
    // Tagged O1 but a claimed line, and its variant is NOT what O1 grants.
    const cart = cartOf(giftLine('g_claim', PDRN, 'O1', { _claimed: 'true', _cartmax_claim: 'true' }))
    const r = evaluateOffers([mysteryOffer()], cart, ABOVE, 1, '/', null)
    expect(r.to_remove).toHaveLength(0)
  })

  test('stale freebie under a triggered non-gift (volume) offer is removed', () => {
    const volume = {
      id: 'V1',
      enabled: true,
      page_handles: ['/'],
      trigger: { quantity_threshold: 1 },
      reward: { type: 'volume_discount', tiers: [{ quantity: 1, value: 10 }] },
    }
    // A leftover _freebie line tagged V1 (which no longer grants any gift).
    const cart = cartOf(paidLine('p1', 555), giftLine('g_old', HAIR, 'V1'))
    const r = evaluateOffers([volume], cart, ABOVE, 3, '/', null)
    expect(r.to_remove).toEqual(['g_old'])
  })
})

describe('evaluateClaimRemovals — orphaned & below-threshold claim gifts', () => {
  const COCONUT = 47557292982525
  function claimLine(key, variantId, offerId) {
    return {
      key,
      variant_id: variantId,
      quantity: 1,
      properties: { _freebie: 'true', _cartmax_claim: 'true', _claimed: 'true', _offer_id: offerId },
    }
  }

  test('orphaned claim (offer disabled → empty claim cache) is removed when config is populated', () => {
    // soulflower's live case: claim_gifts:[] but offers exist → configPopulated.
    const items = [claimLine('c1', COCONUT, '8ab27360')]
    expect(evaluateClaimRemovals([], items, 3750, 8, true)).toEqual(['c1'])
  })

  test('orphaned claim is NOT removed when the config is empty (cold/mis-resolved guard)', () => {
    const items = [claimLine('c1', COCONUT, '8ab27360')]
    expect(evaluateClaimRemovals([], items, 3750, 8, false)).toEqual([])
  })

  test('enabled claim still in config is kept while above threshold', () => {
    const items = [claimLine('c1', COCONUT, 'CL1')]
    const claims = [{ id: 'CL1', trigger: { type: 'price', threshold: 999 } }]
    expect(evaluateClaimRemovals(claims, items, 3750, 8, true)).toEqual([])
  })

  test('enabled claim is pulled once the cart drops below its threshold', () => {
    const items = [claimLine('c1', COCONUT, 'CL1')]
    const claims = [{ id: 'CL1', trigger: { type: 'price', threshold: 999 } }]
    expect(evaluateClaimRemovals(claims, items, 500, 3, true)).toEqual(['c1'])
  })

  test('non-claim lines are ignored', () => {
    const items = [{ key: 'p1', variant_id: 111, quantity: 1, properties: {} }]
    expect(evaluateClaimRemovals([], items, 3750, 8, true)).toEqual([])
  })
})
