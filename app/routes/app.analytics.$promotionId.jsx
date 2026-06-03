import { useLoaderData, useNavigate, useRouteError, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getDashboardData, queryEvents } from "../lib/analytics.server.js";

const PRESETS = [
  { id: "7d",  label: "Last 7 days",  days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
];

function rangeFromPreset(presetId) {
  const days = (PRESETS.find((p) => p.id === presetId)?.days) ?? 30;
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const promotionId = params.promotionId;
  const url = new URL(request.url);
  const preset = url.searchParams.get("preset") || "30d";
  const { from, to } = rangeFromPreset(preset);

  const [dashboard, recentEvents] = await Promise.all([
    getDashboardData(session.shop, { from, to }),
    queryEvents(session.shop, { from, to, promotionId, limit: 50 }),
  ]);

  const promo = dashboard.promotions.find((p) => p.id === promotionId) ?? null;
  return { promo, promotionId, preset, recentEvents };
};

function formatMoneyCents(cents) {
  if (!Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
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
  const { promo, promotionId, recentEvents } = useLoaderData();
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
          <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="200">
            <SummaryCard label="Impressions" value={promo.impressions.toLocaleString()} />
            <SummaryCard label="Claims" value={promo.claims.toLocaleString()} sub={formatPct(promo.conversionRate)} />
            <SummaryCard label="Orders" value={promo.orders.toLocaleString()} />
            <SummaryCard label="Revenue" value={formatMoneyCents(promo.revenue)} sub={"AOV " + formatMoneyCents(promo.aov)} />
          </s-grid>
        </s-section>
      )}

      <s-section padding="none" heading="Recent events">
        {recentEvents.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6d7175" }}>
            No events recorded for this promotion in the selected range.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                    {e.cartTotal != null ? formatMoneyCents(e.cartTotal) : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    {e.revenue != null ? formatMoneyCents(e.revenue) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
