import { useState, useMemo, useRef, useEffect } from "react";

// Shared theme picker: search + paginate a shop's theme list.
//
// Shops can carry a lot of themes (agency stores routinely sit at 100+ once
// CLI dev themes accumulate), and cartx config is stored PER THEME — so every
// theme has to stay reachable. Three surfaces pick a theme and all three used
// to render the whole list flat: the header switcher, the Settings
// "copy from another theme" card, and the Home setup-guide picker.

export const THEME_PAGE_SIZE = 10;

// Shopify theme roles → merchant-facing labels.
export const THEME_ROLE_LABELS = {
  MAIN: "Live",
  UNPUBLISHED: "Draft",
  DEMO: "Trial",
  DEVELOPMENT: "Dev",
};

// Below this many themes the search box is more clutter than help — a short
// list is faster to scan than to filter.
const SEARCH_THRESHOLD = 8;

export function roleLabel(role) {
  return THEME_ROLE_LABELS[role] || role || "";
}

/**
 * Filter + paginate a theme list. Matches name, numeric id, and role label,
 * so "live", "dawn", or a partial theme id all narrow the list.
 *
 * The list arrives pre-sorted (MAIN first, then by name) from getAllThemes().
 */
export function useThemeSearch(themes, pageSize = THEME_PAGE_SIZE, pinIds = []) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const list = useMemo(() => themes || [], [themes]);
  const pinKey = pinIds.filter(Boolean).join(",");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = !q
      ? list
      : list.filter(
          (t) =>
            (t.name || "").toLowerCase().includes(q) ||
            String(t.id || "").toLowerCase().includes(q) ||
            roleLabel(t.role).toLowerCase().includes(q)
        );

    // Hoist the live + currently-selected themes onto page 1. A plain
    // alphabetical list buries them on page 4 of 10, and they're the two a
    // merchant reaches for most.
    const pins = pinKey ? pinKey.split(",") : [];
    if (pins.length === 0) return matched;
    const rank = (t) => {
      const i = pins.indexOf(String(t.id));
      return i === -1 ? pins.length : i;
    };
    return matched.slice().sort((a, b) => rank(a) - rank(b));
  }, [list, query, pinKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Derive rather than clamp in an effect: a narrowing filter can leave `page`
  // past the end, and an effect would render one empty frame first.
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return {
    query,
    setQuery: (v) => {
      setQuery(v);
      setPage(0);
    },
    clearQuery: () => {
      setQuery("");
      setPage(0);
    },
    page: safePage,
    setPage,
    paged,
    filteredCount: filtered.length,
    totalCount: list.length,
    totalPages,
    hasNextPage: safePage < totalPages - 1,
    hasPreviousPage: safePage > 0,
    pageSize,
    showSearch: list.length > SEARCH_THRESHOLD,
  };
}

// The selected row keeps its own background, so hover/focus must not paint
// over it.
function highlightRow(e, isActive, on) {
  if (isActive) return;
  e.currentTarget.style.background = on
    ? "var(--s-color-bg-surface-secondary, #f6f6f7)"
    : "transparent";
}

const ROW_RESET = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: "9px 12px",
  background: "transparent",
  border: "none",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};

/**
 * @param {object[]} themes            pre-sorted theme list ({ id, name, role })
 * @param {string}   [activeThemeId]   highlighted + marked as current
 * @param {string}   [mainThemeId]     which id counts as the live theme
 * @param {Function} onSelect          (themeId) => void
 * @param {Function} [renderTrailing]  (theme, isActive) => node, right-hand slot
 * @param {boolean}  [focusSearchOnOpen] focus the search box on mount
 */
export default function ThemeSearchList({
  themes,
  activeThemeId,
  mainThemeId,
  onSelect,
  renderTrailing,
  emptyLabel = "No themes match",
  // Cap the scroll region, not just the row count. 10 two-line rows is ~480px,
  // which plus header + search + pager still runs off a short laptop window —
  // i.e. the original off-screen bug, just at 10 rows instead of 100. The vh
  // term is what actually bounds it. Pass "" to disable (inline, non-popover).
  maxHeight = "min(320px, 45vh)",
  searchPlaceholder = "Search by name or ID…",
  focusSearchOnOpen = false,
  ariaLabel = "Themes",
  pinIds = [],
}) {
  const s = useThemeSearch(themes, THEME_PAGE_SIZE, pinIds);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!focusSearchOnOpen || !s.showSearch) return;
    // s-search-field is a custom element; focus() may land on the host and
    // delegate internally. Best-effort — nothing breaks if it doesn't take.
    const id = setTimeout(() => {
      try {
        searchRef.current?.focus?.();
      } catch {
        /* non-fatal */
      }
    }, 0);
    return () => clearTimeout(id);
  }, [focusSearchOnOpen, s.showSearch]);

  const from = s.filteredCount === 0 ? 0 : s.page * s.pageSize + 1;
  const to = Math.min((s.page + 1) * s.pageSize, s.filteredCount);

  return (
    <div>
      {s.showSearch && (
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--s-color-border, #e3e3e3)",
          }}
        >
          <div style={{ flex: 1 }}>
            <s-search-field
              ref={searchRef}
              label="Search themes"
              labelAccessibilityVisibility="exclusive"
              placeholder={searchPlaceholder}
              value={s.query}
              onInput={(e) => s.setQuery(e.target.value)}
              onClear={() => s.clearQuery()}
            />
          </div>
        </div>
      )}

      {/* Plain focusable <button> rows rather than role="menu"/"menuitem": a
          menu may not contain a textbox, and we deliberately don't implement
          arrow-key navigation, so claiming the menu pattern would promise
          keyboard behaviour that isn't there. Buttons are Tab/Enter-accessible
          natively. */}
      <div
        aria-label={ariaLabel}
        style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      >
        {s.paged.length === 0 ? (
          <div
            style={{
              padding: "20px 12px",
              fontSize: 13,
              color: "var(--s-color-text-secondary, #6d7175)",
              textAlign: "center",
            }}
          >
            {emptyLabel}
          </div>
        ) : (
          s.paged.map((t, i) => {
            const isActive = t.id === activeThemeId;
            const isLive = t.id === mainThemeId || t.role === "MAIN";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect?.(t.id)}
                style={{
                  ...ROW_RESET,
                  background: isActive
                    ? "var(--s-color-bg-surface-selected, #f1f8ff)"
                    : "transparent",
                  ...(i < s.paged.length - 1
                    ? { borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }
                    : {}),
                }}
                // Focus mirrors hover: the rows are keyboard-focusable, so a
                // Tab user needs the same highlight a mouse user gets.
                onMouseOver={(e) => highlightRow(e, isActive, true)}
                onFocus={(e) => highlightRow(e, isActive, true)}
                onMouseOut={(e) => highlightRow(e, isActive, false)}
                onBlur={(e) => highlightRow(e, isActive, false)}
              >
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: "var(--s-color-text, #1a1a1a)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name}
                    </span>
                    {isLive ? (
                      <s-badge tone="success">Live</s-badge>
                    ) : (
                      <s-badge>{roleLabel(t.role)}</s-badge>
                    )}
                  </span>
                  {/* The numeric id disambiguates the near-duplicate names a
                      100-theme store accumulates ("Copy of Dawn", "Dawn (1)"),
                      and it's the value that keys ThemeConfig. */}
                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      fontSize: 11,
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--s-color-text-secondary, #6d7175)",
                    }}
                  >
                    {t.id}
                  </span>
                </span>
                {renderTrailing ? renderTrailing(t, isActive) : null}
              </button>
            );
          })
        )}
      </div>

      {s.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderTop: "1px solid var(--s-color-border, #e3e3e3)",
          }}
        >
          <s-button
            variant="tertiary"
            icon="chevron-left"
            disabled={!s.hasPreviousPage || undefined}
            onClick={() => s.setPage(s.page - 1)}
            accessibilityLabel="Previous page"
          />
          <s-text color="subdued" role="status">
            {from} - {to} / {s.filteredCount}
          </s-text>
          <s-button
            variant="tertiary"
            icon="chevron-right"
            disabled={!s.hasNextPage || undefined}
            onClick={() => s.setPage(s.page + 1)}
            accessibilityLabel="Next page"
          />
        </div>
      )}
    </div>
  );
}
