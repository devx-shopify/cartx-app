const cache = new Map()
const CACHE_TTL = 60_000

export async function checkAvailability(variantIds, admin) {
  if (variantIds.length === 0) return []

  const now = Date.now()
  const uncached = []
  const results = new Map()

  for (const id of variantIds) {
    const entry = cache.get(id)
    if (entry && now - entry.ts < CACHE_TTL) {
      results.set(id, entry.available)
    } else {
      uncached.push(id)
    }
  }

  if (uncached.length > 0 && admin) {
    try {
      const gids = uncached.map(
        (id) =>
          id.startsWith('gid://')
            ? id
            : `gid://shopify/ProductVariant/${id}`
      )

      const res = await admin.graphql(
        `#graphql
          query checkVariants($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on ProductVariant {
                id
                availableForSale
              }
            }
          }`,
        { variables: { ids: gids } }
      )
      const json = await res.json()

      for (const node of json.data?.nodes || []) {
        if (!node) continue
        const available = node.availableForSale ?? true
        cache.set(node.id, { available, ts: now })
        results.set(node.id, available)
      }
    } catch {
      // On error, assume all available
      for (const id of uncached) {
        results.set(id, true)
      }
    }
  }

  return variantIds.filter((id) => results.get(id) === false)
}
