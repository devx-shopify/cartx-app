import { isSellable } from '../sellable.js'

function normalizeId(id) {
  const s = String(id)
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

// Split a promotion's variant ids into the ones the cart may offer. A variant
// whose snapshot says its product is draft / archived / off the Online Store is
// dropped; ids without a snapshot are kept (legacy data, nothing to go on).
function sellableIds(ids, data) {
  const byVid = new Map((data || []).map((d) => [normalizeId(d.variant_id), d]))
  return (ids || []).filter((vid) => {
    const d = byVid.get(normalizeId(vid))
    return !d || isSellable(d)
  })
}

function keepData(data, ids) {
  const keep = new Set(ids.map(normalizeId))
  return (data || []).filter((d) => keep.has(normalizeId(d.variant_id)))
}

// The config as the storefront should see it: unsellable gifts and upsell
// products removed, and a gift promotion left with nothing to give removed
// whole (its bar milestone, messages and cards go with it). Merchants can still
// pick drafts in the admin; they show up here once the product is live.
// Returns a new object; the stored config is untouched.
export function sellableConfig(config) {
  const offers = []
  for (const offer of config.offers || []) {
    const r = offer.reward
    if (!r || r.type !== 'auto_add_gift') { offers.push(offer); continue }
    const ids = sellableIds(r.gift_variants, r.gift_variant_data)
    if (ids.length === (r.gift_variants || []).length) { offers.push(offer); continue }
    if (ids.length === 0) continue
    offers.push({ ...offer, reward: { ...r, gift_variants: ids, gift_variant_data: keepData(r.gift_variant_data, ids) } })
  }

  const claimGifts = []
  for (const cg of config.claim_gifts || []) {
    const ids = sellableIds(cg.claimable_variants, cg.claimable_variant_data)
    if (ids.length === (cg.claimable_variants || []).length) { claimGifts.push(cg); continue }
    if (ids.length === 0) continue
    claimGifts.push({ ...cg, claimable_variants: ids, claimable_variant_data: keepData(cg.claimable_variant_data, ids) })
  }

  const out = { ...config, offers, claim_gifts: claimGifts }
  if (config.upsells && Array.isArray(config.upsells.products)) {
    out.upsells = { ...config.upsells, products: config.upsells.products.filter(isSellable) }
  }
  return out
}
