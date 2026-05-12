export default function VariantList({ variants, onRemove, emptyText }) {
  if (!variants || variants.length === 0) {
    return emptyText ? (
      <s-text color="subdued">{emptyText}</s-text>
    ) : null;
  }

  return (
    <s-box border="base" borderRadius="200" overflow="hidden">
      {variants.map((v, i) => (
        <div
          key={v.variant_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 12px",
            ...(i < variants.length - 1
              ? { borderBottom: "var(--s-border-width-1) solid var(--s-color-border)" }
              : {}),
          }}
        >
          {v.image ? (
            <s-thumbnail src={v.image} alt={v.title} size="small-200" />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--s-color-bg-surface-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--s-color-text-secondary)",
              }}
            >
              <s-icon type="image" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <s-text type="strong" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {v.title}
            </s-text>
            {v.variant_title && v.variant_title !== "Default Title" && (
              <s-text color="subdued">{v.variant_title}</s-text>
            )}
          </div>
          {onRemove && (
            <s-button
              variant="tertiary"
              tone="critical"
              onClick={() => onRemove(v.variant_id)}
              accessibilityLabel="Remove"
            >
              <svg slot="icon" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </s-button>
          )}
        </div>
      ))}
    </s-box>
  );
}

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
