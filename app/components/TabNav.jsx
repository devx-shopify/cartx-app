export default function TabNav({ tabs, value, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 28,
        borderBottom: "1px solid #e3e3e3",
        paddingInline: 4,
      }}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "12px 0",
              marginBottom: -1,
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              border: "none",
              borderBottom: active ? "2px solid #1a1a1a" : "2px solid transparent",
              borderRadius: 0,
              background: "transparent",
              color: active ? "#1a1a1a" : "#6d7175",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "color 0.12s ease, border-color 0.12s ease",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
