import { useMemo } from "react";
import { useLoaderData, useNavigate, useRouteError, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardData, presetRange } from "../lib/analytics.server.js";
import { syncShopSettings } from "../lib/billing.server.js";

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
  return { data, preset, customRange: !!(fromParam && toParam) };
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
  revenue:        { label: "Revenue",     align: "right", type: "number" },
  aov:            { label: "AOV",         align: "right", type: "number" },
};

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
        padding: "10px 16px",
        textAlign: col.align,
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
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
      <td style={{ padding: "12px 16px" }}>
        <s-text fontWeight="semibold">{p.name}</s-text>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <s-text tone="subdued">{TYPE_LABELS[p.type] ?? p.type ?? "—"}</s-text>
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>{p.impressions.toLocaleString()}</td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>{p.claims.toLocaleString()}</td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>{formatPct(p.conversionRate)}</td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>{p.orders.toLocaleString()}</td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>{formatMoneyCents(p.revenue, currency)}</td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>{formatMoneyCents(p.aov, currency)}</td>
    </tr>
  );
}

export default function Analytics() {
  const { data, preset, customRange } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  function setPreset(presetId) {
    const next = new URLSearchParams(searchParams);
    next.set("preset", presetId);
    next.delete("from");
    next.delete("to");
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
          {/* Summary cards */}
          <s-section>
            <s-grid gridTemplateColumns="repeat(5, 1fr)" gap="200">
              <SummaryCard label="Impressions" value={summary.impressions.toLocaleString()} />
              <SummaryCard label="Claims" value={summary.claims.toLocaleString()} sub={formatPct(summary.claimRate) + " of impressions"} />
              <SummaryCard label="Attributed orders" value={summary.orders.toLocaleString()} />
              <SummaryCard label="Attributed revenue" value={formatMoneyCents(summary.revenue, currency)} />
              <SummaryCard label="AOV lift" value={formatLift(summary.aovLift)} sub={summary.aovWithPromo > 0 ? `${formatMoneyCents(summary.aovWithPromo, currency)} vs ${formatMoneyCents(summary.aovWithoutPromo, currency)}` : null} />
            </s-grid>
          </s-section>

          {/* Daily trend */}
          <s-section heading="Daily trend">
            <DailyTrendChart daily={data.daily} />
          </s-section>

          {/* Per-promotion table */}
          <s-section padding="none">
            <div style={{ padding: "16px 16px 12px" }}>
              <s-text variant="headingSm">By promotion</s-text>
            </div>
            <div style={{ padding: "0 16px 16px" }}>
            <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--s-color-bg-surface-secondary, #f6f6f7)", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
                  {Object.keys(SORTABLE_COLUMNS).map((key) => (
                    <SortableHeader
                      key={key}
                      columnKey={key}
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={onSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPromotions.map((p) => (
                  <PromotionRow
                    key={p.id}
                    p={p}
                    currency={currency}
                    onClick={() => navigate(`/app/analytics/${encodeURIComponent(p.id)}?${searchParams.toString()}`)}
                  />
                ))}
              </tbody>
            </table>
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
