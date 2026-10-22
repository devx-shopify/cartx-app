import prisma from '../db.server.js'
import { DEFAULT_CONFIG } from './constants.js'
import { ConfigSchema } from './schemas.js'

export function normalizeThemeId(id) {
  if (!id) return id
  return id.startsWith('gid://') ? id.split('/').pop() : id
}

function deepMerge(defaults, overrides) {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] !== null &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key])
    } else {
      result[key] = overrides[key]
    }
  }
  return result
}

// ── In-memory config cache ────────────────────────────────
// Prevents repeated DB reads for the same shop/theme on every
// cart evaluation. TTL is short so merchant edits propagate quickly.

const CONFIG_CACHE_TTL = 30_000 // 30 seconds
const CONFIG_CACHE_MAX = 500   // max entries to prevent unbounded growth
const _configCache = new Map()

function cacheKey(shopId, themeId) {
  return `${shopId}::${themeId}`
}

function getCached(shopId, themeId) {
  const key = cacheKey(shopId, themeId)
  const entry = _configCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CONFIG_CACHE_TTL) {
    _configCache.delete(key)
    return null
  }
  return entry.config
}

function setCache(shopId, themeId, config) {
  // Evict oldest entries if cache is full
  if (_configCache.size >= CONFIG_CACHE_MAX) {
    const firstKey = _configCache.keys().next().value
    _configCache.delete(firstKey)
  }
  const key = cacheKey(shopId, themeId)
  _configCache.set(key, { config, ts: Date.now() })
}

function invalidateCache(shopId, themeId) {
  _configCache.delete(cacheKey(shopId, themeId))
}

// ── In-memory theme-list cache ────────────────────────────
// getAllThemes() is called from the /app parent-route loader, so it runs on
// EVERY admin page navigation. On a shop with ~100 themes that is several
// paginated GraphQL round-trips per page view. Cache the list briefly: cartx
// never creates or deletes themes, so the only staleness is a theme the
// merchant just made in Shopify, which appears after the TTL.

const THEMES_CACHE_TTL = 60_000 // 60 seconds
const THEMES_CACHE_MAX = 100    // max shops held; prevents unbounded growth
const _themesCache = new Map()

function getCachedThemes(shopId) {
  const entry = _themesCache.get(shopId)
  if (!entry) return null
  if (Date.now() - entry.ts > THEMES_CACHE_TTL) {
    _themesCache.delete(shopId)
    return null
  }
  return entry.themes
}

function setCachedThemes(shopId, themes) {
  if (_themesCache.size >= THEMES_CACHE_MAX) {
    const firstKey = _themesCache.keys().next().value
    _themesCache.delete(firstKey)
  }
  _themesCache.set(shopId, { themes, ts: Date.now() })
}

// ── Public API ────────────────────────────────────────────

export async function loadConfig(shopId, themeId) {
  const normalizedThemeId = normalizeThemeId(themeId)

  // Check cache first
  const cached = getCached(shopId, normalizedThemeId)
  if (cached) return structuredClone(cached)

  const record = await prisma.themeConfig.findUnique({
    where: { shopId_themeId: { shopId, themeId: normalizedThemeId } },
  })

  const config = record
    ? deepMerge(DEFAULT_CONFIG, JSON.parse(record.config))
    : { ...DEFAULT_CONFIG }

  stripLegacyTargetingFields(config)

  setCache(shopId, normalizedThemeId, config)
  return structuredClone(config)
}

// Drop legacy `audience` enum and short-lived `eligibility` discriminated
// union from saved entries — targeting is now driven by page_handles alone.
function stripLegacyTargetingFields(config) {
  const collections = [
    config.offers,
    config.coupons,
    config.claim_gifts,
    config.progress_bar?.visual_milestones,
  ]
  for (const list of collections) {
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      if (!entry) continue
      if (entry.audience !== undefined) delete entry.audience
      if (entry.eligibility !== undefined) delete entry.eligibility
    }
  }
}

export async function saveConfig(shopId, themeId, config) {
  const normalizedThemeId = normalizeThemeId(themeId)

  // Validate before saving — catch bad data early
  try {
    ConfigSchema.parse(config)
  } catch (err) {
    console.error('[cartx] Config validation failed:', err.errors || err.message)
    throw new Error('Invalid config: ' + (err.errors?.[0]?.message || err.message))
  }

  await prisma.themeConfig.upsert({
    where: { shopId_themeId: { shopId, themeId: normalizedThemeId } },
    create: {
      shopId,
      themeId: normalizedThemeId,
      config: JSON.stringify(config),
    },
    update: {
      config: JSON.stringify(config),
    },
  })

  // Invalidate cache so next read gets fresh data
  invalidateCache(shopId, normalizedThemeId)
}

/** Fetch shopId + themeId from an authenticated admin session.
 *  If `preferredThemeId` is provided (e.g. from a cookie), use it instead of auto-detecting. */
export async function getShopAndTheme(admin, session, preferredThemeId) {
  const shopId = session.shop

  if (preferredThemeId) {
    return { shopId, themeId: normalizeThemeId(preferredThemeId) || preferredThemeId }
  }

  try {
    const themeRes = await admin.graphql(
      `#graphql
        query { themes(first: 1, roles: MAIN) { nodes { id } } }`
    )
    const themeJson = await themeRes.json()
    const rawThemeId = themeJson.data?.themes?.nodes?.[0]?.id ?? 'default'
    const themeId = rawThemeId.startsWith('gid://')
      ? rawThemeId.split('/').pop()
      : rawThemeId
    return { shopId, themeId }
  } catch (err) {
    console.error('[cartx] getShopAndTheme error:', err)
    return { shopId, themeId: 'default' }
  }
}

const THEMES_PAGE_SIZE = 50 // page size already proven against this API
const THEMES_MAX_PAGES = 20 // hard stop at 1000 themes, so a bad cursor can't loop forever

const ALL_THEMES_QUERY = `#graphql
  query CartxAllThemes($first: Int!, $after: String) {
    themes(first: $first, after: $after) {
      nodes {
        id
        name
        role
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }`

/**
 * Fetch EVERY theme for the shop, following cursors.
 *
 * This used to be a single `themes(first: 50)` with no pagination, which broke
 * two ways on shops with more themes than that: the extra themes were simply
 * unreachable in the admin UI (and cartx config is per-theme, so unreachable =
 * unconfigurable), and — worse — the caller derives the live theme via
 * `themes.find(t => t.role === 'MAIN')`. If MAIN sat past the cap, that returned
 * undefined and `mainThemeId` silently degraded to the string 'default', so no
 * row rendered the "Live" badge and the follow-live-theme preference could
 * never be reset.
 *
 * Sorted MAIN-first then by name so the live theme is always the first row.
 * Results are cached per shop for THEMES_CACHE_TTL.
 */
export async function getAllThemes(admin, shopId) {
  if (shopId) {
    const cached = getCachedThemes(shopId)
    if (cached) return cached
  }

  const themes = []
  let cursor = null
  let complete = true

  try {
    for (let page = 0; page < THEMES_MAX_PAGES; page++) {
      const res = await admin.graphql(ALL_THEMES_QUERY, {
        variables: { first: THEMES_PAGE_SIZE, after: cursor },
      })
      const json = await res.json()
      const conn = json.data?.themes
      if (!conn) {
        complete = false
        break
      }

      for (const t of conn.nodes ?? []) {
        themes.push({
          id: t.id.startsWith('gid://') ? t.id.split('/').pop() : t.id,
          name: t.name,
          role: t.role,
        })
      }

      if (!conn.pageInfo?.hasNextPage) break
      cursor = conn.pageInfo.endCursor
      if (!cursor) {
        complete = false
        break
      }
      // Ran out of page budget with more still to fetch.
      if (page === THEMES_MAX_PAGES - 1) complete = false
    }
  } catch (err) {
    // Return whatever pages already succeeded rather than throwing the lot
    // away — a partial list still lets the merchant work.
    console.error('[cartx] getAllThemes error:', err)
    complete = false
    if (themes.length === 0) return []
  }

  // MAIN first, then by name. The id tiebreaker keeps the order stable across
  // requests when names collide — a 100-theme shop is full of duplicate names,
  // and without it rows can swap places between renders.
  themes.sort((a, b) => {
    if (a.role === 'MAIN' && b.role !== 'MAIN') return -1
    if (b.role === 'MAIN' && a.role !== 'MAIN') return 1
    return (
      (a.name || '').localeCompare(b.name || '') ||
      String(a.id).localeCompare(String(b.id))
    )
  })

  // Only cache a COMPLETE fetch. Caching a partial list would pin a truncated
  // set of themes for the whole TTL after one transient API blip — the same
  // "half the themes don't exist" failure this function exists to fix.
  if (shopId && complete && themes.length > 0) setCachedThemes(shopId, themes)
  return themes
}

const PREFERENCE_KEY = '__preference__'

/** Read the shop's selected theme from the DB */
export async function getSelectedTheme(shopId) {
  try {
    const record = await prisma.themeConfig.findUnique({
      where: { shopId_themeId: { shopId, themeId: PREFERENCE_KEY } },
    })
    if (record) {
      const data = JSON.parse(record.config)
      return data.selectedThemeId || null
    }
  } catch (err) {
    console.error('[cartx] getSelectedTheme error:', err)
  }
  return null
}

/** Save the shop's selected theme to the DB */
export async function setSelectedTheme(shopId, themeId) {
  const config = JSON.stringify({ selectedThemeId: themeId || null })
  await prisma.themeConfig.upsert({
    where: { shopId_themeId: { shopId, themeId: PREFERENCE_KEY } },
    create: { shopId, themeId: PREFERENCE_KEY, config },
    update: { config },
  })
}

export async function patchConfig(shopId, themeId, path, value) {
  const config = await loadConfig(shopId, themeId)

  const keys = path.split('.')
  let target = config
  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]]
  }
  target[keys[keys.length - 1]] = value

  await saveConfig(shopId, themeId, config)
  return config
}

/** Theme IDs that have a saved config for this shop (excludes the preference
 *  sentinel). Used by webhook product-sync to walk every theme's config. */
export async function listConfigThemeIds(shopId) {
  const rows = await prisma.themeConfig.findMany({
    where: { shopId },
    select: { themeId: true },
  })
  return rows.map((r) => r.themeId).filter((t) => t !== PREFERENCE_KEY)
}
