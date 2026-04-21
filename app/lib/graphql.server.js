/**
 * Shared GraphQL helpers for admin routes.
 */

export async function fetchVariantData(admin, variantIds) {
  if (!variantIds || variantIds.length === 0) return {};

  const gids = variantIds.map((id) =>
    id.startsWith('gid://') ? id : `gid://shopify/ProductVariant/${id}`
  );

  try {
    const res = await admin.graphql(
      `#graphql
      query variants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            displayName
            image { url }
            product { title, featuredMedia { preview { image { url } } } }
          }
        }
      }`,
      { variables: { ids: gids } }
    );
    const json = await res.json();
    const map = {};
    for (const node of json.data?.nodes || []) {
      if (!node || !node.id) continue;
      const numericId = node.id.split('/').pop();
      const image = node.image?.url || node.product?.featuredMedia?.preview?.image?.url || '';
      const title = node.displayName || node.product?.title || '';
      map[node.id] = { title, image };
      map[numericId] = { title, image };
    }
    return map;
  } catch (err) {
    console.error('[CartMax] fetchVariantData error:', err);
    return {};
  }
}

export function enrichVariantData(variantIds, variantDataMap) {
  return variantIds.map((vid) => {
    const d = variantDataMap[vid] || {};
    return { variant_id: vid, title: d.title || '', image: d.image || '' };
  });
}
