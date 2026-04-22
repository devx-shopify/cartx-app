/**
 * Displays a list of selected product variants with thumbnails and titles.
 *
 * Props:
 *  - variants: Array of { variant_id, title, variant_title?, image }
 *  - onRemove: (variant_id) => void (optional — shows remove button if provided)
 *  - emptyText: string (shown when no variants)
 */
export default function VariantList({ variants, onRemove, emptyText }) {
  if (!variants || variants.length === 0) {
    return emptyText ? (
      <span className="cx-variant-count">{emptyText}</span>
    ) : null;
  }

  return (
    <div className="cx-variant-list">
      {variants.map((v) => (
        <div className="cx-variant-item" key={v.variant_id}>
          {v.image ? (
            <img
              className="cx-variant-item-img"
              src={v.image}
              alt={v.title}
            />
          ) : (
            <div className="cx-variant-item-img-placeholder">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
          )}
          <div className="cx-variant-item-info">
            <div className="cx-variant-item-title">{v.title}</div>
            {v.variant_title && v.variant_title !== "Default Title" && (
              <div className="cx-variant-item-variant">{v.variant_title}</div>
            )}
          </div>
          {onRemove && (
            <button
              className="cx-variant-item-remove"
              onClick={() => onRemove(v.variant_id)}
              title="Remove"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Extract variant display data from a Shopify resource picker selection.
 * Call this after `shopify.resourcePicker()` returns.
 */
export function extractVariantData(selection) {
  if (!selection) return [];
  const variants = [];
  for (const product of selection) {
    for (const variant of product.variants || []) {
      variants.push({
        variant_id: variant.id,
        title: product.title,
        variant_title: variant.title || null,
        image:
          product.images?.[0]?.originalSrc ||
          product.featuredImage?.url ||
          "",
      });
    }
  }
  return variants;
}
