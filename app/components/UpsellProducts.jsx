import { numericId } from "../lib/upsell-recs.js";

export const productGid = (id) => `gid://shopify/Product/${numericId(id)}`;

// Resource-picker result -> display items, keeping the previous order for
// products that stay selected and appending new ones in picker order.
export function mergeSelection(previous, selection) {
  const picked = selection.map((p) => ({
    id: numericId(p.id),
    title: p.title,
    image: p.images?.[0]?.originalSrc || "",
    price: p.variants?.[0]?.price,
  }));
  const pickedIds = new Set(picked.map((p) => p.id));
  const kept = previous.filter((p) => pickedIds.has(p.id));
  const keptIds = new Set(kept.map((p) => p.id));
  return [...kept, ...picked.filter((p) => !keptIds.has(p.id))];
}

function move(list, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item);
  return next;
}

export function Thumb({ src, alt }) {
  if (src) return <s-thumbnail src={src} alt={alt} size="small-200" />;
  return (
    <div
      aria-hidden="true"
      style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, background: "var(--s-color-bg-surface-secondary)" }}
    />
  );
}

export function OrderedProducts({ items, onChange, renderMeta, emptyText, onAdd, addLabel }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "28px 14px",
          border: "1px dashed var(--s-color-border, #e3e3e3)",
          borderRadius: 10,
          background: "#fafafa",
        }}
      >
        <s-text color="subdued">{emptyText}</s-text>
        {onAdd && (
          <div style={{ marginTop: 10 }}>
            <s-button onClick={onAdd}>{addLabel || "Add products"}</s-button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 10, overflow: "hidden" }}>
      {items.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderBottom: i < items.length - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
            background: "#fff",
          }}
        >
          <div style={{ width: 18, textAlign: "right" }}>
            <s-text color="subdued" variant="bodySm">{i + 1}</s-text>
          </div>
          <Thumb src={p.image} alt={p.title} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <s-text fontWeight="medium">{p.title}</s-text>
            {renderMeta ? <div>{renderMeta(p)}</div> : null}
          </div>
          <s-stack direction="inline" gap="extra-small">
            <s-button variant="tertiary" icon="arrow-up" accessibilityLabel={`Move ${p.title} up`}
              disabled={i === 0 || undefined} onClick={() => onChange(move(items, i, -1))} />
            <s-button variant="tertiary" icon="arrow-down" accessibilityLabel={`Move ${p.title} down`}
              disabled={i === items.length - 1 || undefined} onClick={() => onChange(move(items, i, 1))} />
            <s-button variant="tertiary" tone="critical" icon="delete" accessibilityLabel={`Remove ${p.title}`}
              onClick={() => onChange(items.filter((x) => x.id !== p.id))} />
          </s-stack>
        </div>
      ))}
    </div>
  );
}
