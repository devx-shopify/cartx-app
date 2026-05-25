import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useSearchParams, useOutletContext, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ThemeSwitcher } from "./app.jsx";
import useConfirm from "../components/useConfirm.jsx";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import {
  migrateLegacyDiscountRules,
  syncFreebieDiscountFromConfig,
} from "../lib/discount.server.js";
import { syncVolumeDiscountConfig } from "../lib/volume-discount.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const promotions = [];
  for (const offer of config.offers) {
    promotions.push({ id: offer.id, type: "offer", name: offer.name, enabled: offer.enabled, trigger: triggerSummary(offer) });
  }
  for (const coupon of config.coupons) {
    promotions.push({ id: coupon.id, type: "coupon", name: coupon.is_automatic ? coupon.title : coupon.code, enabled: coupon.enabled, trigger: coupon.display_message || coupon.type_label || "Discount" });
  }
  for (const gift of config.claim_gifts) {
    promotions.push({ id: gift.id, type: "claim-gift", name: gift.name, enabled: gift.enabled, trigger: gift.trigger ? (gift.trigger.type === "price" ? `Rs.${gift.trigger.threshold} cart total` : `${gift.trigger.threshold} items`) : "No trigger" });
  }

  return { promotions };
};

function triggerSummary(offer) {
  const parts = [];
  if (offer.trigger.price_threshold) parts.push(`Rs.${offer.trigger.price_threshold}`);
  if (offer.trigger.quantity_threshold) parts.push(`${offer.trigger.quantity_threshold} items`);
  if (parts.length === 0 && offer.source?.type === "product") return "Product in cart";
  return parts.join(" or ") || "No threshold";
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  await migrateLegacyDiscountRules(config, session.shop);
  const body = await request.json();
  const { intent, id, type } = body;

  if (type === "offer") {
    if (intent === "delete") config.offers = config.offers.filter((o) => o.id !== id);
    else if (intent === "toggle") { const offer = config.offers.find((o) => o.id === id); if (offer) offer.enabled = !offer.enabled; }
    else if (intent === "duplicate") { const offer = config.offers.find((o) => o.id === id); if (offer) config.offers.push({ ...structuredClone(offer), id: crypto.randomUUID(), name: `${offer.name} (copy)` }); }
  } else if (type === "coupon") {
    if (intent === "delete") config.coupons = config.coupons.filter((c) => c.id !== id);
    else if (intent === "toggle") { const coupon = config.coupons.find((c) => c.id === id); if (coupon) coupon.enabled = !coupon.enabled; }
  } else if (type === "claim-gift") {
    if (intent === "delete") config.claim_gifts = config.claim_gifts.filter((g) => g.id !== id);
    else if (intent === "toggle") { const gift = config.claim_gifts.find((g) => g.id === id); if (gift) gift.enabled = !gift.enabled; }
  }

  await saveConfig(shopId, themeId, config);

  // Sync the freebie discount function whenever offers or claim gifts change.
  if (type === "offer" || type === "claim-gift") {
    await syncFreebieDiscountFromConfig(admin, session.shop, config);
  }
  if (type === "offer") {
    await syncVolumeDiscountConfig(admin, session.shop, config.offers);
  }

  return { ok: true };
};

const TYPE_LABELS = { offer: "Offer", coupon: "Coupon", "claim-gift": "Claim Gift" };
const TYPE_BADGE_TONE = { offer: "info", coupon: "info", "claim-gift": "success" };
const TABS = [
  { id: "all", label: "All" },
  { id: "offer", label: "Offers" },
  { id: "coupon", label: "Coupons" },
  { id: "claim-gift", label: "Claim Gifts" },
];

/* ── Empty State ─────────────────────────────────────────────── */

function EmptyPromotions({ hasSearch, navigate }) {
  if (hasSearch) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No promotions found</div>
        <div style={{ fontSize: 13, color: "#6d7175" }}>Try a different search term or filter.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎁</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Create your first promotion</div>
      <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 20 }}>
        Add offers, coupons, or claim gifts to boost your cart value.
      </div>
      <s-button variant="primary" onClick={() => navigate("/app/promotions/new?type=offer")}>
        Create promotion
      </s-button>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

const PAGE_SIZE = 10;

export default function PromotionsIndex() {
  const { promotions } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchParams] = useSearchParams();
  const { themes, activeThemeId, mainThemeId, planData } = useOutletContext();
  const [confirmFn, confirmModal] = useConfirm();
  const navigate = useNavigate();

  const initialTab = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (fetcher.data?.toast) shopify.toast.show(fetcher.data.toast);
    if (fetcher.data?.error) shopify.toast.show(fetcher.data.error, { isError: true });
  }, [fetcher.data, shopify]);

  // Counts
  const offerCount = promotions.filter((p) => p.type === "offer").length;
  const couponCount = promotions.filter((p) => p.type === "coupon").length;
  const claimCount = promotions.filter((p) => p.type === "claim-gift").length;

  // Filter & sort
  const byType = activeTab === "all" ? promotions : promotions.filter((p) => p.type === activeTab);
  const filtered = (search
    ? byType.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.trigger.toLowerCase().includes(search.toLowerCase()))
    : byType
  ).toSorted((a, b) => a.name.localeCompare(b.name));

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

  // Actions
  function submitAction(intent, id, type) {
    fetcher.submit(JSON.stringify({ intent, id, type }), { method: "POST", encType: "application/json" });
  }

  function switchTab(tabId) {
    setActiveTab(tabId);
    setSelected([]);
    setSearch("");
    setSearchOpen(false);
    setCurrentPage(0);
  }

  function toggleSelect(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selected.length === paged.length) setSelected([]);
    else setSelected(paged.map((p) => p.id));
  }

  async function bulkActivate() {
    for (const id of selected) {
      const promo = filtered.find((p) => p.id === id);
      if (promo && !promo.enabled) submitAction("toggle", id, promo.type);
    }
    setSelected([]);
  }

  async function bulkDeactivate() {
    for (const id of selected) {
      const promo = filtered.find((p) => p.id === id);
      if (promo && promo.enabled) submitAction("toggle", id, promo.type);
    }
    setSelected([]);
  }

  async function bulkDelete() {
    const yes = await confirmFn({ title: "Delete selected", message: `Are you sure you want to delete ${selected.length} promotion(s)? This action cannot be undone.`, confirmLabel: "Delete", destructive: true });
    if (!yes) return;
    for (const id of selected) {
      const promo = filtered.find((p) => p.id === id);
      if (promo) submitAction("delete", id, promo.type);
    }
    setSelected([]);
  }

  const allChecked = paged.length > 0 && selected.length === paged.length;
  const someChecked = selected.length > 0 && selected.length < paged.length;

  return (
    <s-page heading="Promotions">
      <s-button slot="primary-action" variant="primary" onClick={() => navigate("/app/promotions/new?type=offer")}>
        Create promotion
      </s-button>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
      </div>

      {/* Full-page empty state when no promotions exist */}
      {promotions.length === 0 && (
        <s-section>
          <div style={{ padding: "80px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎁</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Create your first promotion</div>
            <div style={{ fontSize: 14, color: "#6d7175", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Add offers, coupons, or claim gifts to increase your average order value and delight your customers.
            </div>
            <s-button variant="primary" onClick={() => navigate("/app/promotions/new?type=offer")}>
              Create promotion
            </s-button>
          </div>
        </s-section>
      )}

      {/* Table section — only when promotions exist */}
      {promotions.length > 0 && <s-section padding="none">
        {/* Tab bar + bulk actions overlay */}
        <div style={{ position: "relative", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
          {/* Tabs row */}
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {TABS.map((tab) => {
                const count = tab.id === "all" ? promotions.length
                  : tab.id === "offer" ? offerCount
                  : tab.id === "coupon" ? couponCount
                  : tab.id === "claim-gift" ? claimCount
                  : null;
                const isActive = activeTab === tab.id;
                return (
                  <div
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => switchTab(tab.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 450,
                      color: isActive ? "var(--s-color-text, #1a1a1a)" : "var(--s-color-text-secondary, #616161)",
                      backgroundColor: isActive ? "var(--s-color-bg-surface-secondary, #f1f1f1)" : "transparent",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                      transition: "background-color 0.15s, color 0.15s",
                    }}
                  >
                    {tab.label}{count != null ? ` (${count})` : ""}
                  </div>
                );
              })}
            </div>
            <s-button
              variant="tertiary"
              icon="search"
              pressed={searchOpen || undefined}
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearch(""); setCurrentPage(0); } }}
              accessibilityLabel="Toggle search"
            />
          </div>

          {/* Bulk actions — overlays on top of tabs */}
          {selected.length > 0 && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", gap: 10,
              padding: "0 20px",
              backgroundColor: "var(--s-color-bg-surface, #fff)",
              zIndex: 1,
            }}>
              <s-text fontWeight="semibold">{selected.length} selected</s-text>
              {selected.length === 1 && (
                <s-button onClick={() => navigate(`/app/promotions/${selected[0]}`)}>Edit</s-button>
              )}
              <s-button onClick={bulkActivate}>Activate</s-button>
              <s-button onClick={bulkDeactivate}>Deactivate</s-button>
              {selected.length === 1 && filtered.find((p) => p.id === selected[0])?.type === "offer" && (
                <s-button onClick={() => submitAction("duplicate", selected[0], "offer")}>Duplicate</s-button>
              )}
              <s-button tone="critical" onClick={bulkDelete}>Delete</s-button>
            </div>
          )}
        </div>

        {/* Expandable search field */}
        {searchOpen && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
            <s-stack direction="inline" gap="300" alignItems="end">
              <div style={{ flex: 1 }}>
                <s-search-field
                  label="Search promotions"
                  labelAccessibilityVisibility="exclusive"
                  placeholder="Search by name or trigger..."
                  value={search}
                  onInput={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
                  onClear={() => { setSearch(""); setCurrentPage(0); }}
                />
              </div>
              <s-button variant="tertiary" onClick={() => { setSearchOpen(false); setSearch(""); setCurrentPage(0); }}>
                Cancel
              </s-button>
            </s-stack>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
            <EmptyPromotions hasSearch={!!search} navigate={navigate} />
          ) : (
            <>
              <s-table>
                <s-table-header-row>
                  <s-table-header listSlot="primary">
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-checkbox
                        checked={allChecked || undefined}
                        indeterminate={someChecked || undefined}
                        onChange={toggleSelectAll}
                        accessibilityLabel="Select all"
                      />
                      <s-text fontWeight="semibold">Name</s-text>
                    </s-stack>
                  </s-table-header>
                  <s-table-header>Status</s-table-header>
                  <s-table-header>Type</s-table-header>
                  <s-table-header>Trigger</s-table-header>
                </s-table-header-row>

                <s-table-body>
                  {paged.map((promo) => (
                    <s-table-row key={promo.id}>
                      <s-table-cell listSlot="primary">
                        <s-stack direction="inline" gap="small" alignItems="center">
                          <s-checkbox
                            checked={selected.includes(promo.id) || undefined}
                            onChange={() => toggleSelect(promo.id)}
                            accessibilityLabel={`Select ${promo.name}`}
                          />
                          <s-stack direction="block" gap="extra-small">
                            <span
                              role="link"
                              onClick={() => navigate(`/app/promotions/${promo.id}`)}
                              style={{ fontWeight: 600, cursor: "pointer" }}
                              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                            >{promo.name}</span>
                            <s-text color="subdued">{TYPE_LABELS[promo.type]}</s-text>
                          </s-stack>
                        </s-stack>
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge tone={promo.enabled ? "success" : "warning"}>
                          {promo.enabled ? "Active" : "Draft"}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge tone={TYPE_BADGE_TONE[promo.type]}>{TYPE_LABELS[promo.type]}</s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text color="subdued">{promo.trigger}</s-text>
                      </s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>

              {/* Pagination */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "14px 20px" }}>
                <s-button
                  variant="tertiary"
                  icon="chevron-left"
                  disabled={!hasPreviousPage || undefined}
                  onClick={() => { setCurrentPage((p) => p - 1); setSelected([]); }}
                  accessibilityLabel="Previous page"
                />
                <s-text color="subdued">
                  Showing {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length} promotions
                </s-text>
                <s-button
                  variant="tertiary"
                  icon="chevron-right"
                  disabled={!hasNextPage || undefined}
                  onClick={() => { setCurrentPage((p) => p + 1); setSelected([]); }}
                  accessibilityLabel="Next page"
                />
              </div>
            </>
          )}
      </s-section>}
      {confirmModal}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
