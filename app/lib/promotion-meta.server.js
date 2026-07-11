import db from '../db.server.js'

// Resolve a promotion id -> { name, type } from the shop's ThemeConfig blobs.
//
// This is the source used to *snapshot* a promotion's display name/type onto
// analytics rows at write time, so historical rows stay labeled even after the
// promotion is deleted or recreated (which would otherwise orphan the id — see
// Issue 3). Also used as a read-side fallback for rows written before the
// snapshot existed.
//
// Volume-discount offers share the same `id` as their `config.offers` entry, so
// parsing the standard arrays covers them too — no `__volume_discount__`
// special-casing needed.

const CACHE_TTL_MS = 60_000
const _cache = new Map() // shopId -> { map, ts }

const TYPE_BY_ARRAY = {
  offers: 'offer',
  coupons: 'coupon',
  claim_gifts: 'claim-gift',
}

function nameOf(item) {
  return item.name || item.title || item.code || null
}

/**
 * Build a `promotionId -> { name, type }` Map from every ThemeConfig row for a
 * shop. Cached per shop for a short TTL to keep ingestion cheap.
 */
export async function loadPromotionMeta(shopId) {
  if (!shopId) return new Map()
  const cached = _cache.get(shopId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.map

  const rows = await db.themeConfig.findMany({
    where: { shopId },
    select: { config: true },
  })
  const map = new Map()
  for (const row of rows) {
    let parsed
    try { parsed = JSON.parse(row.config) } catch { continue }
    for (const [arr, type] of Object.entries(TYPE_BY_ARRAY)) {
      for (const item of (parsed?.[arr] ?? [])) {
        if (!item?.id) continue
        const existing = map.get(item.id)
        if (!existing) {
          // First writer sets name/type (stable per id across themes).
          map.set(item.id, {
            name: nameOf(item),
            type,
            enabled: !!item.enabled,
            needsAttention: !!item._needs_attention,
          })
        } else {
          // Status is aggregated across themes: a promotion enabled in ANY
          // theme reads as Active; needs-attention if any theme flags it.
          if (item.enabled) existing.enabled = true
          if (item._needs_attention) existing.needsAttention = true
        }
      }
    }
  }
  _cache.set(shopId, { map, ts: Date.now() })
  return map
}

// Derive a display status from resolved meta. Undefined meta means the
// promotion no longer exists in any theme config → deleted.
//   active | draft | needs-attention | deleted
export function promotionStatus(meta) {
  if (!meta) return 'deleted'
  if (meta.enabled) return 'active'
  if (meta.needsAttention) return 'needs-attention'
  return 'draft'
}

export function invalidatePromotionMeta(shopId) {
  if (shopId) _cache.delete(shopId)
  else _cache.clear()
}
