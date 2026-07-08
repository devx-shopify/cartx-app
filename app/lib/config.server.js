import prisma from '../db.server.js'
import { DEFAULT_CONFIG } from './constants.js'
import { ConfigSchema } from './schemas.js'

function normalizeThemeId(id) {
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

/** Fetch all themes for the shop */
export async function getAllThemes(admin) {
  try {
    const res = await admin.graphql(
      `#graphql
        query {
          themes(first: 50) {
            nodes {
              id
              name
              role
            }
          }
        }`
    )
    const json = await res.json()
    return (json.data?.themes?.nodes ?? []).map((t) => ({
      id: t.id.startsWith('gid://') ? t.id.split('/').pop() : t.id,
      gid: t.id,
      name: t.name,
      role: t.role,
    }))
  } catch (err) {
    console.error('[cartx] getAllThemes error:', err)
    return []
  }
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
