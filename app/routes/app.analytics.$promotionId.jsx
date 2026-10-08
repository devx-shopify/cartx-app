import { useLoaderData, useNavigate, useRouteError, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardData, queryEvents, presetRange, themePromotionStatusMap } from "../lib/analytics.server.js";
import { getSelectedTheme, getShopAndTheme, loadConfig } from "../lib/config.server.js";
import { syncShopSettings } from "../lib/billing.server.js";

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const promotionId = params.promotionId;
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "30d";

  const { ianaTimezone } = await syncShopSettings(admin, session.shop);
  const { from, to } = presetRange(preset, ianaTimezone || "UTC");

  const [dashboard, recentEvents] = await Promise.all([
    getDashboardData(session.shop, { from, to }),
    queryEvents(session.shop, { from, to, promotionId, limit: 50 }),
  ]);

  const promo = dashboard.promotions.find((p) => p.id === promotionId) ?? null;

  // Status must reflect the SELECTED theme, not the cross-theme aggregate — so
  // the drill-down agrees with the "By promotion" table. Ids not on this theme
  // (orphans) fall back to the global 'deleted'.
  if (promo) {
    const preferred = await getSelectedTheme(session.shop);
    const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
    const themeConfig = await loadConfig(shopId, themeId);
    promo.status = themePromotionStatusMap(themeConfig).get(promo.id) ?? "deleted";
  }

  return { promo, promotionId, preset, recentEvents, currency: dashboard.currency || "USD" };
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

const STATUS_BADGE = {
  active: { label: "Active", tone: "success" },
  draft: { label: "Draft", tone: "warning" },
  "needs-attention": { label: "Needs attention", tone: "critical" },
  deleted: { label: "Deleted", tone: "auto" },
};

function StatusBadge({ status }) {
  const b = STATUS_BADGE[status];
  if (!b) return null;
  return <s-badge tone={b.tone}>{b.label}</s-badge>;
}

const EVENT_LABELS = {
  promotion_viewed: "Viewed",
  gift_claimed: "Claimed",
  gift_removed: "Removed",
  upsell_added: "Upsell added",
  coupon_applied: "Coupon applied",
  coupon_rejected: "Coupon rejected",
  order_attributed: "Order",
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

export default function PromotionAnalytics() {
  const { promo, promotionId, recentEvents, currency } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <s-page heading={promo?.name ?? promotionId} backAction={{ content: "Analytics", onAction: () => navigate(`/app/analytics?${searchParams.toString()}`) }}>
      <s-button slot="primary-action" onClick={() => navigate(`/app/promotions/${encodeURIComponent(promotionId)}`)}>
        View promotion
      </s-button>

      {!promo ? (
        <s-section>
          <s-banner tone="info">No activity for this promotion in the selected range.</s-banner>
        </s-section>
      ) : (
        <s-section>
          {promo.status ? (
            <div style={{ marginBottom: 12 }}>
              <StatusBadge status={promo.status} />
            </div>
          ) : null}
          <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="200">
            <SummaryCard label="Impressions" value={promo.impressions.toLocaleString()} />
            <SummaryCard label="Claims" value={promo.claims.toLocaleString()} sub={formatPct(promo.conversionRate)} />
            <SummaryCard label="Orders" value={promo.orders.toLocaleString()} />
            <SummaryCard label="Revenue" value={formatMoneyCents(promo.revenue, currency)} sub={"AOV " + formatMoneyCents(promo.aov, currency)} />
          </s-grid>
        </s-section>
      )}

      <s-section padding="none">
        <div style={{ padding: "16px 16px 12px" }}>
          <s-text variant="headingSm">Recent events</s-text>
        </div>
        {recentEvents.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6d7175" }}>
            No events recorded for this promotion in the selected range.
          </div>
        ) : (
          <div style={{ padding: "0 16px 16px" }}>
          <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 8 }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--s-color-bg-surface-secondary, #f6f6f7)", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>When</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>Event</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600 }}>Cart total</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600 }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
                  <td style={{ padding: "10px 16px", color: "#616161" }}>
                    {new Date(e.occurredAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <s-text fontWeight="semibold">{EVENT_LABELS[e.event] ?? e.event}</s-text>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    {e.cartTotal != null ? formatMoneyCents(e.cartTotal, currency) : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    {e.revenue != null ? formatMoneyCents(e.revenue, currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
