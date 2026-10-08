import { pageMatch, customerMatchesTags } from '../helpers.server.js'
import { LINE_PROPS } from '../constants.js'

function normalizeId(id) {
  const s = String(id)
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

function isClaimedInCart(cart, variantId, claimId) {
  const vid = normalizeId(variantId)
  return cart.items.some(
    (item) =>
      normalizeId(item.variant_id) === vid &&
      (item.properties?.[LINE_PROPS.CARTMAX_CLAIM] === 'true' ||
       item.properties?.[LINE_PROPS.CLAIMED] === 'true') &&
      item.properties?.[LINE_PROPS.OFFER_ID] === claimId
  )
}

export function resolveClaimGifts(
  claimGifts,
  cart,
  adjustedTotal,
  adjustedQty,
  page,
  customer
) {
  const matching = claimGifts.filter(
    (g) => g.enabled && pageMatch(g.page_handles, page) && customerMatchesTags(g, customer),
  )

  if (matching.length === 0) return null

  // Among matching rules, find those whose threshold is already met
  const metRules = matching.filter((g) => {
    const val = g.trigger.type === 'price' ? adjustedTotal : adjustedQty
    return val >= g.trigger.threshold
  })

  // Option B: show the highest-threshold unlocked rule.
  // If none are met yet, fall back to the lowest-threshold rule for progress display.
  const rule =
    metRules.length > 0
      ? metRules.slice().sort((a, b) => b.trigger.threshold - a.trigger.threshold)[0]
      : matching.slice().sort((a, b) => a.trigger.threshold - b.trigger.threshold)[0]

  const currentValue =
    rule.trigger.type === 'price' ? adjustedTotal : adjustedQty

  if (currentValue < rule.trigger.threshold) {
    const remaining = rule.trigger.threshold - currentValue
    return {
      applicable_to_current_page: true,
      threshold_remaining:
        rule.trigger.type === 'price'
          ? { price: remaining }
          : { quantity: remaining },
      section_heading: rule.section_heading,
      gifts: [],
    }
  }

  return {
    applicable_to_current_page: true,
    threshold_remaining: null,
    section_heading: rule.section_heading,
    max_claims: rule.max_claims || null,
    // What the shopper pays per claimed item (store's major units; 0 = free).
    // Lets the drawer show the real price instead of always "FREE".
    claim_price: rule.claim_price ?? 0,
    _rule_id: rule.id,
    gifts: rule.claimable_variants.map((v) => {
      const vData = (rule.claimable_variant_data || []).find(
        (d) => d.variant_id === v || normalizeId(d.variant_id) === normalizeId(v)
      )
      if (!vData) return null
      return {
        variant_id: v,
        title: vData.title || '',
        image: vData.image || '',
        in_cart: isClaimedInCart(cart, v, rule.id),
        available: true,
      }
    }).filter(Boolean),
  }
}
