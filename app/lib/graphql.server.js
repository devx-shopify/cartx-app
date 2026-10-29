/**
 * Shared GraphQL helpers for admin routes.
 */

/**
 * Build a display title from a product + variant title, dropping Shopify's
 * "Default Title" placeholder that single-variant products carry on their one
 * (default) variant. Without this, freebies/gifts for no-variant products show
 * up as "Default Title". Mirrors the drawer's GraphQL cart mapper.
 */
export function variantDisplayTitle(productTitle, variantTitle, fallback = '') {
  const pt = (productTitle || '').trim();
  const vt = (variantTitle || '').trim();
  if (vt && vt !== 'Default Title') return pt ? `${pt} - ${vt}` : vt;
  return pt || (fallback || '').trim();
}

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
            price
            compareAtPrice
            image { url }
            product { id, title, featuredMedia { preview { image { url } } } }
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
      const title = variantDisplayTitle(node.product?.title, node.title, node.displayName);
      // product_id lets webhooks map a deleted/updated product back to this
      // snapshot (products/delete only gives a product id, but offers store
      // variant ids).
      const product_id = node.product?.id ? node.product.id.split('/').pop() : '';
      // Prices (major units, e.g. "999.00") show as "~~₹999~~ Free" on gift cards.
      const entry = { title, image, product_id, price: node.price || '', compare_at_price: node.compareAtPrice || '' };
      map[node.id] = entry;
      map[numericId] = entry;
    }
    return map;
  } catch (err) {
    console.error('[cartx] fetchVariantData error:', err);
    return {};
  }
}

export function enrichVariantData(variantIds, variantDataMap) {
  return variantIds.map((vid) => {
    const d = variantDataMap[vid] || {};
    const entry = { variant_id: vid, product_id: d.product_id || '', title: d.title || '', image: d.image || '' };
    if (d.price) entry.price = String(d.price);
    if (d.compare_at_price) entry.compare_at_price = String(d.compare_at_price);
    return entry;
  });
}
