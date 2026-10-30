// =============================================================
// cartx — Product data sync (webhook-driven)
//
// Keeps the product SNAPSHOTS stored in promotions fresh (offer
// gift_variant_data, claim claimable_variant_data, upsell products) when a
// product is edited or deleted. The eval reads these snapshots and has no Admin
// API, so refreshing them here is what makes the storefront reflect changes.
//
// Safety principle: if a DELETE leaves an ENABLED promotion with no reward, the
// promotion is auto-DRAFTED (enabled=false) — the eval skips it, so its bar /
// milestone / offer card / claim section disappear instead of the storefront
// trying to give a product that no longer exists. Drafts may be incomplete (the
// schema enforces "≥1 gift/claim variant" only when enabled), which is what lets
// us park a broken promotion instead of failing to save and leaving it live.
//
// A product set to DRAFT / ARCHIVED (or taken off the Online Store) is NOT a
// delete: the snapshot's status is refreshed and the promotion stays on. The
// eval leaves unsellable products out of the cart (sellable.js), so the rest of
// the promotion keeps working and the product comes back when it's live again.
// =============================================================

import { loadConfig, saveConfig, listConfigThemeIds } from './config.server.js'
import { captureException } from './sentry.server.js'
import { variantDisplayTitle, fetchVariantData } from './graphql.server.js'
import { isSellable } from './sellable.js'
import { syncUpsellProduct, removeUpsellProduct } from './upsells.server.js'

function numeric(id) {
  const s = String(id || '')
  return s.startsWith('gid://') ? s.split('/').pop() : s
}

// Is this product referenced anywhere in the config? Cheap, DB-only — the fast
// no-op guard so a products/update for an unrelated product does no API work.
// Matches by product_id (stamped on snapshots since the enrichVariantData change;
// pre-existing snapshots backfill on their next admin save).
function isProductReferenced(config, productId) {
  const pid = numeric(productId)
  const inData = (arr) => (arr || []).some((d) => numeric(d.product_id) === pid)
  for (const o of config.offers || []) {
    if (o.reward?.type === 'auto_add_gift' && inData(o.reward.gift_variant_data)) return true
  }
  for (const cg of config.claim_gifts || []) {
    if (inData(cg.claimable_variant_data)) return true
  }
  if ((config.upsells?.products || []).some((p) => numeric(p.product_id) === pid)) return true
  return false
}

// Fetch a product's current title/image + variants (Admin auth). Returns
// { found:false } if deleted, { error:true } on a transient failure (skip — do
// not mutate on incomplete data).
async function fetchProduct(admin, productId) {
  const gid = String(productId).startsWith('gid://') ? String(productId) : `gid://shopify/Product/${productId}`
  try {
    const res = await admin.graphql(
      `#graphql
      query p($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          status
          publishedAt
          featuredMedia { preview { image { url } } }
          variants(first: 100) { nodes { id title displayName image { url } price compareAtPrice } }
        }
      }`,
      { variables: { id: gid } }
    )
    const json = await res.json()
    const p = json.data?.product
    if (!p) return { found: false }
    const productImage = p.featuredMedia?.preview?.image?.url || ''
    const byVariant = {}
    for (const v of p.variants?.nodes || []) {
      byVariant[numeric(v.id)] = {
        title: variantDisplayTitle(p.title, v.title, v.displayName),
        image: v.image?.url || productImage,
        price: v.price,
        compareAtPrice: v.compareAtPrice || null,
      }
    }
    // status + online_store decide whether the cart may offer it (sellable.js).
    // UNLISTED is sellable; out-of-stock is handled live in the drawer.
    const status = p.status || ''
    const online_store = !!p.publishedAt
    return { found: true, status, online_store, available: isSellable({ status, online_store }), title: p.title || '', handle: p.handle || '', image: productImage, byVariant }
  } catch (err) {
    console.error('[cartx] product-sync fetchProduct error:', err)
    return { error: true }
  }
}

// Reconcile ONE config against a product's current state.
//   product = null       → DELETED (drop refs; draft the promo if emptied)
//   product = { ... }    → refresh title/image/price/status + backfill; drop refs
//                          to variants gone from the product; re-enable a promo
//                          WE auto-drafted. Draft/archived products are kept and
//                          only flagged, so the cart skips just that product.
// Returns true if the config changed. Exported for unit tests.
export function reconcileConfig(config, productId, product) {
  let changed = false
  const pid = numeric(productId)
  const deleted = !product
  const isLive = (vid) => !!(product && product.byVariant[numeric(vid)])

  // Whether a snapshot entry belongs to this product. Prefer the stamped
  // product_id; when absent, fall back to "is this variant currently on the
  // product" (only meaningful when we fetched the product's variants).
  const belongs = (entry) => {
    const dPid = numeric(entry.product_id)
    if (dPid) return dPid === pid
    return isLive(entry.variant_id)
  }

  // Refresh a variant-data entry in place; returns true if it should be REMOVED
  // (variant no longer on the product). Only called when the product exists.
  const refreshEntry = (entry, withPrice) => {
    const v = product.byVariant[numeric(entry.variant_id)]
    if (!v) return true
    if (entry.title !== v.title) { entry.title = v.title; changed = true }
    if (entry.image !== v.image) { entry.image = v.image; changed = true }
    // Gift-card prices (offer gifts only; claim gifts never show a price). Also
    // backfills offers saved before prices were stored.
    if (withPrice) {
      const price = v.price ? String(v.price) : ''
      const compareAt = v.compareAtPrice ? String(v.compareAtPrice) : ''
      if (entry.price !== price) { entry.price = price; changed = true }
      if ((entry.compare_at_price || '') !== compareAt) { entry.compare_at_price = compareAt; changed = true }
    }
    if (entry.status !== product.status) { entry.status = product.status; changed = true }
    if (entry.online_store !== product.online_store) { entry.online_store = product.online_store; changed = true }
    if (numeric(entry.product_id) !== pid) { entry.product_id = pid; changed = true }
    return false
  }

  // Reconcile a promotion against the product change.
  //   promo   = object carrying `enabled` (offer OR claim gift)
  //   holder  = object holding the arrays (offer.reward for offers; cg itself)
  //   dataKey / idsKey = the variant-data + variant-id array field names
  const reconcilePromo = (promo, holder, dataKey, idsKey, deletedMsg, withPrice) => {
    const data = holder[dataKey] || []
    if (!data.some(belongs)) return
    if (deleted) {
      const drop = new Set(data.filter(belongs).map((d) => numeric(d.variant_id)))
      holder[dataKey] = data.filter((d) => !drop.has(numeric(d.variant_id)))
      holder[idsKey] = (holder[idsKey] || []).filter((v) => !drop.has(numeric(v)))
      changed = true
      if (promo.enabled && (holder[idsKey] || []).length === 0) {
        promo.enabled = false
        promo._auto_disabled = true
        promo._needs_attention = deletedMsg
      }
    } else {
      // Refresh (status included) + drop refs to variants no longer on the
      // product. A drafted product stays referenced; the eval skips it.
      const drop = new Set()
      for (const d of data.filter(belongs)) { if (refreshEntry(d, withPrice)) drop.add(numeric(d.variant_id)) }
      if (drop.size) {
        holder[dataKey] = data.filter((d) => !drop.has(numeric(d.variant_id)))
        holder[idsKey] = (holder[idsKey] || []).filter((v) => !drop.has(numeric(v)))
        changed = true
      }
      // Re-enable ONLY if WE auto-drafted it (older builds drafted the promo when
      // a gift went to draft) and it still has a reward. Never touch a
      // merchant's manual disable.
      if (promo._auto_disabled && (holder[idsKey] || []).length > 0) {
        promo.enabled = true
        delete promo._auto_disabled
        delete promo._needs_attention
        changed = true
      }
    }
  }

  // ── Offers (auto-add gift): enabled on the offer, arrays on offer.reward ──
  for (const offer of config.offers || []) {
    const r = offer.reward
    if (!r || r.type !== 'auto_add_gift') continue
    reconcilePromo(offer, r, 'gift_variant_data', 'gift_variants',
      'A gift product in this offer was deleted. Pick a new gift and re-enable it.',
      true)
  }

  // ── Claim gifts: enabled + arrays both on the claim gift object ──
  for (const cg of config.claim_gifts || []) {
    reconcilePromo(cg, cg, 'claimable_variant_data', 'claimable_variants',
      'A claim gift product was deleted. Pick a new one and re-enable it.')
  }

  // ── Upsells (product-level; empty list simply renders nothing; an
  // unsellable product is kept but left out of the cart) ──
  const ups = config.upsells
  if (ups && Array.isArray(ups.products)) {
    const before = ups.products.length
    ups.products = ups.products
      .map((p) => {
        if (numeric(p.product_id) !== pid) return p
        if (!product) return null // deleted
        const v = product.byVariant[numeric(p.variant_id)]
        if (!v) return null // that variant is gone
        if (p.title !== product.title) { p.title = product.title; changed = true }
        if (v.image && p.image_url !== v.image) { p.image_url = v.image; changed = true }
        if (v.price && p.price !== v.price) { p.price = v.price; changed = true }
        const compareAt = v.compareAtPrice || undefined
        if (p.compare_at_price !== compareAt) { p.compare_at_price = compareAt; changed = true }
        if (product.handle && p.handle !== product.handle) { p.handle = product.handle; changed = true }
        if (p.status !== product.status) { p.status = product.status; changed = true }
        if (p.online_store !== product.online_store) { p.online_store = product.online_store; changed = true }
        return p
      })
      .filter(Boolean)
    if (ups.products.length !== before) changed = true
  }

  return changed
}

// Stamp the current product status + Online Store flag onto every gift and
// default-upsell snapshot in one Admin API call. Run from the admin pages so
// configs saved before these were stored (or missed by a webhook) catch up.
// Returns true if the config changed. Deleted variants are left to the
// products/delete webhook.
export async function refreshSnapshotStatuses(admin, config) {
  const entries = []
  for (const o of config.offers || []) {
    if (o.reward?.type === 'auto_add_gift') entries.push(...(o.reward.gift_variant_data || []))
  }
  for (const cg of config.claim_gifts || []) entries.push(...(cg.claimable_variant_data || []))
  const upsells = (config.upsells?.products || []).filter((p) => p.variant_id)
  const vids = [...new Set([...entries.map((d) => numeric(d.variant_id)), ...upsells.map((p) => numeric(p.variant_id))])]
  if (vids.length === 0) return false

  const map = {}
  for (let i = 0; i < vids.length; i += 250) Object.assign(map, await fetchVariantData(admin, vids.slice(i, i + 250)))
  let changed = false
  for (const entry of [...entries, ...upsells]) {
    const d = map[numeric(entry.variant_id)]
    if (!d?.status) continue
    if (entry.status !== d.status) { entry.status = d.status; changed = true }
    if (entry.online_store !== d.online_store) { entry.online_store = d.online_store; changed = true }
    if (!entry.product_id && d.product_id) { entry.product_id = d.product_id; changed = true }
  }
  return changed
}

// Admin page loaders: refresh statuses and save when they moved. Never throws;
// a failed refresh just leaves the page on the stored data.
export async function syncSnapshotStatuses(admin, shopId, themeId, config) {
  try {
    if (await refreshSnapshotStatuses(admin, config)) await saveConfig(shopId, themeId, config)
  } catch (err) {
    console.error('[cartx] snapshot status refresh failed:', shopId, themeId, err)
    captureException(err, { tags: { area: 'product_sync_status' }, extra: { shopId, themeId } })
  }
  return config
}

async function applyToShop(shop, productId, product) {
  const themeIds = await listConfigThemeIds(shop)
  for (const themeId of themeIds) {
    try {
      const config = await loadConfig(shop, themeId)
      if (reconcileConfig(config, productId, product)) {
        await saveConfig(shop, themeId, config)
      }
    } catch (err) {
      console.error('[cartx] product-sync save failed:', shop, themeId, err)
      captureException(err, { tags: { area: 'product_sync' }, extra: { shop, themeId, productId } })
    }
  }
}

/** products/update — refresh snapshots referencing this product. No-ops fast
 *  (no Admin API) when the product isn't referenced. */
export async function handleProductUpdate(shop, productId, admin) {
  await syncUpsellRules(shop, productId, admin)
  const themeIds = await listConfigThemeIds(shop)
  const configs = []
  let referenced = false
  for (const themeId of themeIds) {
    const config = await loadConfig(shop, themeId)
    configs.push({ themeId, config })
    if (isProductReferenced(config, productId)) referenced = true
  }
  if (!referenced) {
    console.log(`[cartx][product-sync] product ${productId} not referenced in any ${shop} promotion — skipping (has it been re-saved since the enrich change, so it carries product_id?)`)
    return
  }
  if (!admin) { console.warn(`[cartx][product-sync] no admin client for ${shop} — cannot refresh`); return }
  const product = await fetchProduct(admin, productId)
  if (product.error) return // transient — don't mutate on incomplete data
  for (const { themeId, config } of configs) {
    try {
      if (reconcileConfig(config, productId, product.found ? product : null)) {
        await saveConfig(shop, themeId, config)
        console.log(`[cartx][product-sync] refreshed ${shop} theme ${themeId} for product ${productId}`)
      }
    } catch (err) {
      console.error('[cartx] product-sync save failed:', shop, themeId, err)
      captureException(err, { tags: { area: 'product_sync' }, extra: { shop, themeId, productId } })
    }
  }
}

/** products/delete — drop refs to the deleted product; auto-draft any promotion
 *  it invalidates. No Admin API needed (product is gone). */
export async function handleProductDelete(shop, productId) {
  await syncUpsellRules(shop, productId, null, { deleted: true })
  await applyToShop(shop, productId, null)
}

// Upsell product rules live in their own tables, not the theme config. A
// failure here is reported but never blocks the config sync below.
async function syncUpsellRules(shop, productId, admin, { deleted = false } = {}) {
  try {
    if (deleted) await removeUpsellProduct(shop, productId)
    else await syncUpsellProduct(shop, admin, productId)
  } catch (err) {
    console.error('[cartx] upsell product sync failed:', shop, productId, err)
    captureException(err, { tags: { area: 'product_sync_upsells' }, extra: { shop, productId, deleted } })
  }
}
