// Resolves "A collection" trigger sources into the collection's product IDs, so
// the evaluator, the drawer and the volume discount Function can tell which
// cart lines belong to it (cart lines carry product_id, not collections).
//
// Resolved on save (offers + bar milestones) and refreshed by the
// collections/update, collections/delete and products/update webhooks. The
// list is stored on the source as `collection_product_ids` (see line-match.js).
import { normalizeId } from './upsell-rank.js'
import { listConfigThemeIds, loadConfig, saveConfig } from './config.server.js'
import { captureException } from './sentry.server.js'

// Product IDs are sent to the storefront config and the Function input, so the
// list is capped. Above this the merchant is warned to use a smaller collection.
export const COLLECTION_PRODUCT_CAP = 2500

const QUERY = `#graphql
  query CartxCollectionProducts($id: ID!, $after: String) {
    collection(id: $id) {
      id
      title
      products(first: 250, after: $after) {
        nodes { id }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

function toGid(id) {
  const s = String(id || '')
  return s.startsWith('gid://') ? s : `gid://shopify/Collection/${s}`
}

/**
 * Fetch a collection's product IDs (numeric strings), up to the cap.
 * @returns {Promise<{found: boolean, title?: string, product_ids?: string[], truncated?: boolean, error?: boolean}>}
 */
export async function fetchCollectionProducts(admin, collectionId) {
  const ids = []
  let title
  let after = null
  try {
    for (;;) {
      const res = await admin.graphql(QUERY, { variables: { id: toGid(collectionId), after } })
      const json = await res.json()
      const col = json?.data?.collection
      if (!col) return { found: false }
      title = col.title
      for (const n of col.products.nodes) ids.push(normalizeId(n.id))
      if (ids.length >= COLLECTION_PRODUCT_CAP) {
        return { found: true, title, product_ids: ids.slice(0, COLLECTION_PRODUCT_CAP), truncated: true }
      }
      if (!col.products.pageInfo.hasNextPage) break
      after = col.products.pageInfo.endCursor
    }
  } catch (err) {
    console.error('[cartx] collection product fetch failed:', collectionId, err)
    captureException(err, { tags: { area: 'collection_products' }, extra: { collectionId } })
    return { found: false, error: true }
  }
  return { found: true, title, product_ids: ids, truncated: false }
}

/** Every collection-typed source in a config: offers and bar milestones. */
export function collectionSources(config) {
  const out = []
  for (const o of config?.offers || []) {
    if (o.source?.type === 'collection' && o.source.collection_id) out.push(o.source)
  }
  for (const m of config?.progress_bar?.visual_milestones || []) {
    if (m.source?.type === 'collection' && m.source.collection_id) out.push(m.source)
  }
  return out
}

/**
 * Fill `collection_product_ids` (+ title) on the given sources. Fetches each
 * collection once. Returns merchant-facing warnings (missing / too large).
 * A transient fetch error leaves the source's previous list untouched.
 */
export async function resolveCollectionSources(admin, sources) {
  const warnings = []
  const cache = new Map()
  for (const source of sources || []) {
    if (!source || source.type !== 'collection' || !source.collection_id) continue
    const key = normalizeId(source.collection_id)
    if (!cache.has(key)) cache.set(key, await fetchCollectionProducts(admin, source.collection_id))
    const r = cache.get(key)
    if (r.error) {
      warnings.push("The collection's products couldn't be loaded from Shopify. Save again to retry.")
      continue
    }
    if (!r.found) {
      source.collection_product_ids = []
      warnings.push('The selected collection no longer exists, so it matches no products. Pick another collection.')
      continue
    }
    source.collection_title = r.title
    source.collection_product_ids = r.product_ids
    if (r.truncated) {
      warnings.push(`"${r.title}" has more than ${COLLECTION_PRODUCT_CAP} products; only the first ${COLLECTION_PRODUCT_CAP} count. Use a smaller collection.`)
    }
  }
  return [...new Set(warnings)]
}

function sameIds(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  const s = new Set(a)
  return b.every((x) => s.has(x))
}

/**
 * Re-resolve collection sources across every theme config of a shop.
 * `shouldRefresh(source)` picks which sources to refetch (e.g. one collection,
 * or ones that might contain a product). Returns configs that changed, so the
 * caller can re-sync the volume discount Function.
 */
export async function refreshShopCollections(shop, admin, shouldRefresh) {
  const changed = []
  if (!admin) return changed
  const themeIds = await listConfigThemeIds(shop)
  const cache = new Map()
  for (const themeId of themeIds) {
    try {
      const config = await loadConfig(shop, themeId)
      let dirty = false
      for (const source of collectionSources(config)) {
        if (!shouldRefresh(source)) continue
        const key = normalizeId(source.collection_id)
        if (!cache.has(key)) cache.set(key, await fetchCollectionProducts(admin, source.collection_id))
        const r = cache.get(key)
        if (r.error) continue
        const next = r.found ? r.product_ids : []
        if (!sameIds(source.collection_product_ids, next) || (r.found && source.collection_title !== r.title)) {
          source.collection_product_ids = next
          if (r.found) source.collection_title = r.title
          dirty = true
        }
      }
      if (dirty) {
        await saveConfig(shop, themeId, config)
        changed.push({ themeId, config })
      }
    } catch (err) {
      console.error('[cartx] collection refresh failed:', shop, themeId, err)
      captureException(err, { tags: { area: 'collection_products' }, extra: { shop, themeId } })
    }
  }
  return changed
}

/** Does any theme config of the shop use a collection source? (cheap pre-check) */
export async function shopUsesCollections(shop) {
  for (const themeId of await listConfigThemeIds(shop)) {
    if (collectionSources(await loadConfig(shop, themeId)).length) return true
  }
  return false
}

// After a refresh, re-sync the volume discount Function from the theme the
// merchant edits (the same config every admin save syncs from), but only when
// it actually changed and has a collection-scoped volume offer.
async function resyncVolume(shop, admin, changed) {
  const { getSelectedTheme } = await import('./config.server.js')
  const selected = await getSelectedTheme(shop)
  const hit = changed.find((c) => String(c.themeId) === String(selected)) || (changed.length === 1 ? changed[0] : null)
  if (!hit) return
  const usesVolume = (hit.config.offers || []).some(
    (o) => o.enabled && o.reward?.type === 'volume_discount' && o.source?.type === 'collection'
  )
  if (!usesVolume) return
  const { syncDiscounts } = await import('./discount.server.js')
  await syncDiscounts(admin, shop, hit.config, 'offer')
}

/** collections/update and collections/delete: refresh sources using that collection. */
export async function handleCollectionChange(shop, admin, collectionId) {
  const key = normalizeId(collectionId)
  const changed = await refreshShopCollections(shop, admin, (s) => normalizeId(s.collection_id) === key)
  if (changed.length) await resyncVolume(shop, admin, changed)
  return changed.length
}

// products/update can move a product in or out of a smart collection (tags,
// type, vendor...). Refetching every collection source per product edit would
// be heavy during bulk edits, so it runs at most once per shop per window.
const PRODUCT_REFRESH_WINDOW_MS = 60 * 1000
const lastProductRefresh = new Map()

export async function handleProductChangeForCollections(shop, admin, now = Date.now()) {
  const last = lastProductRefresh.get(shop) || 0
  if (now - last < PRODUCT_REFRESH_WINDOW_MS) return 0
  if (!(await shopUsesCollections(shop))) return 0
  lastProductRefresh.set(shop, now)
  const changed = await refreshShopCollections(shop, admin, () => true)
  if (changed.length) await resyncVolume(shop, admin, changed)
  return changed.length
}
