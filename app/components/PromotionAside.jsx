// Aside sidebar for promotion forms: Status + dynamic Summary.
// Sticks to the top of the viewport as the merchant scrolls the main column.

export default function PromotionAside({ enabled, onEnabledChange, summary }) {
  return (
    <s-box slot="aside">
      <div
        style={{
          position: "sticky",
          top: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <s-section heading="Status">
          <s-select
            label="Status"
            labelAccessibilityVisibility="exclusive"
            value={enabled ? "active" : "draft"}
            onChange={(e) => onEnabledChange(e.target.value === "active")}
          >
            <s-option value="active">Active</s-option>
            <s-option value="draft">Draft</s-option>
          </s-select>
        </s-section>

        {summary && summary.length > 0 && (
          <s-section heading="Summary">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {summary.map((item, i) => (
                <SummaryRow key={i} label={item.label} value={item.value} />
              ))}
            </div>
          </s-section>
        )}
      </div>
    </s-box>
  );
}

function SummaryRow({ label, value }) {
  const isEmpty =
    value == null
    || (typeof value === "string" && !value.trim())
    || (Array.isArray(value) && value.length === 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <s-text color="subdued" variant="bodySm">{label}</s-text>
      {isEmpty ? (
        <s-text color="subdued">Not set</s-text>
      ) : Array.isArray(value) ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {value.map((line, i) => (
            <s-text key={i} fontWeight="medium">{line}</s-text>
          ))}
        </div>
      ) : (
        <s-text fontWeight="medium">{value}</s-text>
      )}
    </div>
  );
}
