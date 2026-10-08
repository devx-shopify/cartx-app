import { useMemo } from "react";
import { useLoaderData, useNavigate, useOutletContext, useRouteError, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardData, presetRange, filterPromotionsForTheme } from "../lib/analytics.server.js";
import { getSelectedTheme, getShopAndTheme, loadConfig } from "../lib/config.server.js";
import { syncShopSettings } from "../lib/billing.server.js";
import { ThemeSwitcher } from "./app.jsx";

const PRESETS = [
  { id: "7d",  label: "Last 7 days",  days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
];

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "30d";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const { ianaTimezone } = await syncShopSettings(admin, session.shop);
  const tz = ianaTimezone || "UTC";

  let from, to;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
    to.setUTCHours(23, 59, 59, 999);
  } else {
    ({ from, to } = presetRange(preset, tz));
  }

  const data = await getDashboardData(session.shop, { from, to });

  // Scope the per-promotion table to the SELECTED theme's configured promotions.
  // The summary cards stay store-wide (see Issue 6). `deleted=1` also reveals
  // orphaned/deleted promotions.
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const themeConfig = await loadConfig(shopId, themeId);
  const showDeleted = url.searchParams.get("deleted") === "1";
  data.promotions = filterPromotionsForTheme(
    data.promotions,
    themeConfig,
    { showDeleted },
  );

  return { data, preset, customRange: !!(fromParam && toParam), showDeleted };
};

function formatMoneyCents(cents, currency = "USD") {
  if (!Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatLift(value) {
  if (!Number.isFinite(value) || value === 0) return "—";
  const sign = value > 0 ? "+" : "";
  return sign + formatPct(value);
}

const TYPE_LABELS = {
  offer: "Offer",
  coupon: "Coupon",
  "claim-gift": "Claim Gift",
  upsell: "Upsell",
};

const STATUS_BADGE = {
  active: { label: "Active", tone: "success" },
  draft: { label: "Draft", tone: "warning" },
  "needs-attention": { label: "Needs attention", tone: "critical" },
  deleted: { label: "Deleted", tone: "auto" },
};

function StatusBadge({ status }) {
  const b = STATUS_BADGE[status] || STATUS_BADGE.draft;
  return <s-badge tone={b.tone}>{b.label}</s-badge>;
}

function SummaryCard({ label, value, sub }) {
  return (
    <s-card>
      <s-stack gap="100">
        <s-text variant="bodySm" tone="subdued">{label}</s-text>
        <s-text variant="headingLg" fontWeight="bold">{value}</s-text>
        {sub != null ? <s-text variant="bodySm" tone="subdued">{sub}</s-text> : null}
      </s-stack>
    </s-card>
  );
}

// Simple SVG trend chart. 3 series scaled to the same y-axis: impressions,
// claims, revenue (cents). No library — full control over the markup.
function DailyTrendChart({ daily }) {
  const width = 720;
  const height = 220;
  const padX = 32;
  const padY = 24;

  const series = useMemo(() => {
    const impressions = daily.map((d) => d.impressions);
    const claims = daily.map((d) => d.claims);
    const revenue = daily.map((d) => d.revenue);
    return { impressions, claims, revenue };
  }, [daily]);

  if (daily.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#6d7175" }}>
        No activity in this range yet.
      </div>
    );
  }

  function pathFor(values, maxValue) {
    if (maxValue <= 0) {
      // Flat line at the bottom
      const y = height - padY;
      return `M ${padX} ${y} L ${width - padX} ${y}`;
    }
    const xStep = (width - padX * 2) / Math.max(1, values.length - 1);
    return values.map((v, i) => {
      const x = padX + i * xStep;
      const y = height - padY - ((v / maxValue) * (height - padY * 2));
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
  }

  const maxImp = Math.max(...series.impressions, 1);
  const maxClm = Math.max(...series.claims, 1);
  const maxRev = Math.max(...series.revenue, 1);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily trend chart">
        {/* Axes */}
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#e3e3e3" />
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#e3e3e3" />

        {/* Impressions — blue */}
        <path d={pathFor(series.impressions, maxImp)} fill="none" stroke="#5b8def" strokeWidth="2" />
        {/* Claims — green */}
        <path d={pathFor(series.claims, maxClm)} fill="none" stroke="#16a34a" strokeWidth="2" />
        {/* Revenue — orange */}
        <path d={pathFor(series.revenue, maxRev)} fill="none" stroke="#ef7c1a" strokeWidth="2" strokeDasharray="4 3" />

        {/* X-axis labels — first, middle, last */}
        {[0, Math.floor(daily.length / 2), daily.length - 1].filter((i) => i >= 0 && i < daily.length).map((i) => {
          const x = padX + (i * (width - padX * 2)) / Math.max(1, daily.length - 1);
          return (
            <text key={i} x={x} y={height - 6} fontSize="10" textAnchor="middle" fill="#6d7175">
              {daily[i].date.slice(5)}
            </text>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#616161", marginTop: 8, paddingLeft: padX }}>
        <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#5b8def", marginRight: 6, verticalAlign: "middle" }} />Impressions</span>
        <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#16a34a", marginRight: 6, verticalAlign: "middle" }} />Claims</span>
        <span><span style={{ display: "inline-block", width: 10, height: 2, background: "#ef7c1a", marginRight: 6, verticalAlign: "middle" }} />Revenue</span>
      </div>
    </div>
  );
}

const SORTABLE_COLUMNS = {
  name:           { label: "Promotion",   align: "left",  type: "string" },
  type:           { label: "Type",        align: "left",  type: "string" },
  impressions:    { label: "Impressions", align: "right", type: "number" },
  claims:         { label: "Claims",      align: "right", type: "number" },
  conversionRate: { label: "Conv. rate",  align: "right", type: "number" },
  orders:         { label: "Orders",      align: "right", type: "number" },
  revenue:        { label: "Influenced revenue", align: "right", type: "number" },
  aov:            { label: "AOV",         align: "right", type: "number" },
};

// Column render order. "status" is a non-sortable badge column injected after
// "type"; every other key maps to a sortable SORTABLE_COLUMNS header.
const COLUMN_ORDER = ["name", "type", "status", "impressions", "claims", "conversionRate", "orders", "revenue", "aov"];

const DEFAULT_SORT = "revenue";
const DEFAULT_DIR = "desc";

function sortPromotions(rows, key, dir) {
  const col = SORTABLE_COLUMNS[key];
  if (!col) return rows;
  const sign = dir === "asc" ? 1 : -1;
  const out = rows.slice();
  out.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (col.type === "string") {
      return sign * String(av || "").localeCompare(String(bv || ""));
    }
    return sign * ((Number(av) || 0) - (Number(bv) || 0));
  });
  return out;
}

function SortIcon({ active, dir }) {
  if (!active) {
    return (
      <span style={{ marginLeft: 4, color: "#bbb", fontSize: 10 }}>↕</span>
    );
  }
  return (
    <span style={{ marginLeft: 4, color: "#1a1a1a", fontSize: 10 }}>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function SortableHeader({ columnKey, currentKey, currentDir, onSort }) {
  const col = SORTABLE_COLUMNS[columnKey];
  const active = currentKey === columnKey;
  return (
    <th
      onClick={() => onSort(columnKey)}
      style={{
        padding: "10px 10px",
        textAlign: col.align,
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {col.label}
      <SortIcon active={active} dir={currentDir} />
    </th>
  );
}

function PromotionRow({ p, onClick, currency }) {
  return (
    <tr
      onClick={onClick}
      style={{ cursor: "pointer", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}
    >
      <td style={{ padding: "12px 10px", wordBreak: "break-word" }}>
        <s-text fontWeight="semibold">{p.name}</s-text>
      </td>
      <td style={{ padding: "12px 10px" }}>
        <s-text tone="subdued">{TYPE_LABELS[p.type] ?? p.type ?? "—"}</s-text>
      </td>
      <td style={{ padding: "12px 10px" }}>
        <StatusBadge status={p.status} />
      </td>
      <td style={{ padding: "12px 10px", textAlign: "right" }}>{p.impressions.toLocaleString()}</td>
      <td style={{ padding: "12px 10px", textAlign: "right" }}>{p.claims.toLocaleString()}</td>
      <td style={{ padding: "12px 10px", textAlign: "right" }}>{formatPct(p.conversionRate)}</td>
      <td style={{ padding: "12px 10px", textAlign: "right" }}>{p.orders.toLocaleString()}</td>
      <td style={{ padding: "12px 10px", textAlign: "right" }}>{formatMoneyCents(p.revenue, currency)}</td>
      <td style={{ padding: "12px 10px", textAlign: "right" }}>{formatMoneyCents(p.aov, currency)}</td>
    </tr>
  );
}

export default function Analytics() {
  const { data, preset, customRange, showDeleted } = useLoaderData();
  const { themes, activeThemeId, mainThemeId } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  function setPreset(presetId) {
    const next = new URLSearchParams(searchParams);
    next.set("preset", presetId);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
  }

  function toggleDeleted(e) {
    const on = e?.target?.checked ?? !showDeleted;
    const next = new URLSearchParams(searchParams);
    if (on) next.set("deleted", "1");
    else next.delete("deleted");
    setSearchParams(next);
  }

  const sortKey = SORTABLE_COLUMNS[searchParams.get("sort")] ? searchParams.get("sort") : DEFAULT_SORT;
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : DEFAULT_DIR;

  function onSort(columnKey) {
    const next = new URLSearchParams(searchParams);
    if (columnKey === sortKey) {
      next.set("dir", sortDir === "asc" ? "desc" : "asc");
    } else {
      next.set("sort", columnKey);
      // String columns default to asc, numeric to desc (more useful first click).
      const defaultDir = SORTABLE_COLUMNS[columnKey].type === "string" ? "asc" : "desc";
      next.set("dir", defaultDir);
    }
    setSearchParams(next);
  }

  const summary = data.summary;
  const currency = data.currency || "USD";
  const activeThemeName = themes?.find((t) => t.id === activeThemeId)?.name;
  const isEmpty = data.promotions.length === 0 && summary.impressions === 0;
  const sortedPromotions = useMemo(
    () => sortPromotions(data.promotions, sortKey, sortDir),
    [data.promotions, sortKey, sortDir],
  );

  const exportUrl = `/app/analytics/export?${searchParams.toString()}`;

  return (
    <s-page heading="Analytics">
      <s-button slot="primary-action" onClick={() => { window.open(exportUrl, "_blank", "noopener"); }}>
        Download CSV
      </s-button>

      {/* Theme selector — consistent with Home/Promotions */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
      </div>

      {/* Range picker */}
      <s-section padding="none">
        <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
          <s-text variant="headingSm">Performance</s-text>
          <div style={{ display: "flex", gap: 6 }}>
            {PRESETS.map((p) => {
              const active = !customRange && preset === p.id;
              return (
                <s-button
                  key={p.id}
                  variant={active ? "primary" : "tertiary"}
                  onClick={() => setPreset(p.id)}
                >
                  {p.label}
                </s-button>
              );
            })}
          </div>
        </div>
      </s-section>

      {isEmpty ? (
        <s-section>
          <div style={{ padding: "80px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>No analytics yet</div>
            <div style={{ fontSize: 14, color: "#6d7175", marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
              Analytics will appear here once your promotions get impressions or claims from the storefront.
            </div>
            <s-button variant="primary" onClick={() => navigate("/app/promotions")}>
              View promotions
            </s-button>
          </div>
        </s-section>
      ) : (
        <>
          {/* Summary cards — store-wide totals (not scoped to the selected theme) */}
          <s-section>
            <div style={{ marginBottom: 10 }}>
              <s-text variant="bodySm" tone="subdued">Store-wide totals</s-text>
            </div>
            <s-grid gridTemplateColumns="repeat(5, 1fr)" gap="200">
              <SummaryCard label="Impressions" value={summary.impressions.toLocaleString()} />
              <SummaryCard label="Claims" value={summary.claims.toLocaleString()} sub={formatPct(summary.claimRate) + " of claim-gift views"} />
              <SummaryCard
                label="Attributed orders"
                value={summary.orders.toLocaleString()}
                sub={summary.totalOrders > 0 ? `${formatPct(summary.orders / summary.totalOrders)} of ${summary.totalOrders.toLocaleString()} orders` : null}
              />
              <SummaryCard label="Attributed revenue" value={formatMoneyCents(summary.revenue, currency)} sub="orders using a promotion" />
              <SummaryCard label="AOV lift" value={formatLift(summary.aovLift)} sub={summary.aovWithPromo > 0 ? `${formatMoneyCents(summary.aovWithPromo, currency)} vs ${formatMoneyCents(summary.aovWithoutPromo, currency)}` : null} />
            </s-grid>
          </s-section>

          {/* Daily trend */}
          <s-section heading="Daily trend">
            <DailyTrendChart daily={data.daily} />
          </s-section>

          {/* Per-promotion table */}
          <s-section padding="none">
            <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <s-text variant="headingSm">
                By promotion{activeThemeName ? ` · ${activeThemeName}` : ""}
              </s-text>
              <s-checkbox label="Show deleted" checked={showDeleted} onChange={toggleDeleted} />
            </div>
            <div style={{ padding: "0 16px 16px" }}>
            <div style={{ width: "100%", border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13 }}>
              <colgroup>
                <col style={{ width: "16%" }} />{/* name */}
                <col style={{ width: "9%" }} />{/* type */}
                <col style={{ width: "13%" }} />{/* status */}
                <col style={{ width: "11%" }} />{/* impressions */}
                <col style={{ width: "8%" }} />{/* claims */}
                <col style={{ width: "10%" }} />{/* conv. rate */}
                <col style={{ width: "9%" }} />{/* orders */}
                <col style={{ width: "13%" }} />{/* influenced revenue */}
                <col style={{ width: "11%" }} />{/* aov */}
              </colgroup>
              <thead>
                <tr style={{ background: "var(--s-color-bg-surface-secondary, #f6f6f7)", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
                  {COLUMN_ORDER.map((key) =>
                    key === "status" ? (
                      <th key="status" style={{ padding: "10px 10px", textAlign: "left", fontWeight: 600 }}>
                        Status
                      </th>
                    ) : (
                      <SortableHeader
                        key={key}
                        columnKey={key}
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onSort={onSort}
                      />
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedPromotions.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_ORDER.length} style={{ padding: "28px 16px", textAlign: "center", color: "#6d7175" }}>
                      No promotions{activeThemeName ? ` on ${activeThemeName}` : ""} in this range.
                      {!showDeleted ? " Enable “Show deleted” to include removed promotions." : ""}
                    </td>
                  </tr>
                ) : (
                  sortedPromotions.map((p) => (
                    <PromotionRow
                      key={p.id}
                      p={p}
                      currency={currency}
                      onClick={() => navigate(`/app/analytics/${encodeURIComponent(p.id)}?${searchParams.toString()}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
            </div>
            <div style={{ marginTop: 10 }}>
              <s-text variant="bodySm" tone="subdued">
                Influenced revenue = value of orders that used each promotion; an order using
                multiple promotions is counted under each (so rows can overlap — the summary
                counts each order once). Conversion rate = claims ÷ views for claim gifts,
                orders ÷ views for offers.
              </s-text>
            </div>
            </div>
          </s-section>
        </>
      )}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
