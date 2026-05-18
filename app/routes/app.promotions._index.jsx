import { useState, useEffect, useCallback } from "react";
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
import { getActivePlan, hasFeature } from "../lib/billing.server.js";
import {
  getFreebieDiscountStatus,
  ensureFreebieDiscount,
  deleteFreebieDiscount,
  updateFreebieDiscountConfig,
  buildFunctionConfig,
  syncClaimRulesToFunction,
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

  let discountFunction = { active: false, discountId: null, functionConfig: null };
  try {
    discountFunction = await getFreebieDiscountStatus(admin, session.shop);
  } catch { /* Function may not be deployed yet */ }

  return { promotions, discountFunction };
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
  const body = await request.json();
  const { intent, id, type } = body;

  if (type === "discount-function") {
    const planData = await getActivePlan(admin, session.shop);
    if (!hasFeature(planData, "discount_function")) {
      return { ok: false, error: "Upgrade to the Basic plan to use discount functions" };
    }
    try {
      if (intent === "activate") {
        const functionConfig = buildFunctionConfig(body.rules ?? [], body.default_rule ?? null);
        await ensureFreebieDiscount(admin, session.shop, functionConfig);
        return { ok: true, toast: "Discount function activated" };
      }
      if (intent === "deactivate") {
        await deleteFreebieDiscount(admin, session.shop);
        return { ok: true, toast: "Discount function deactivated" };
      }
      if (intent === "update_config") {
        await updateFreebieDiscountConfig(admin, session.shop, body.rules ?? [], body.default_rule ?? null);
        return { ok: true, toast: "Discount rules updated" };
      }
      if (intent === "add_rule") {
        const status = await getFreebieDiscountStatus(admin, session.shop);
        const currentRules = status.functionConfig?.rules ?? [];
        currentRules.push(body.rule);
        await updateFreebieDiscountConfig(admin, session.shop, currentRules, status.functionConfig?.default_rule ?? null);
        return { ok: true, toast: "Rule added" };
      }
      if (intent === "delete_rule") {
        const status = await getFreebieDiscountStatus(admin, session.shop);
        const currentRules = (status.functionConfig?.rules ?? []).filter((r) => r.offer_id !== body.rule_offer_id);
        await updateFreebieDiscountConfig(admin, session.shop, currentRules, status.functionConfig?.default_rule ?? null);
        return { ok: true, toast: "Rule removed" };
      }
      if (intent === "update_default") {
        const status = await getFreebieDiscountStatus(admin, session.shop);
        await updateFreebieDiscountConfig(admin, session.shop, status.functionConfig?.rules ?? [], body.default_rule);
        return { ok: true, toast: "Default rule updated" };
      }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

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

  // Sync discount functions when promotions are modified
  if (type === "offer") {
    await syncVolumeDiscountConfig(admin, session.shop, config.offers);
  }
  if (type === "claim-gift") {
    await syncClaimRulesToFunction(admin, session.shop, config.claim_gifts);
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
  { id: "discount-function", label: "Discount Function" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed_amount", label: "Fixed amount off" },
  { value: "fixed_price", label: "Fixed price" },
];

/* ── Discount Function Panel ─────────────────────────────────── */

function DiscountFunctionPanel({ discountFunction, fetcher, confirm }) {
  const isActive = discountFunction.active;
  const config = discountFunction.functionConfig ?? {};
  const rules = config.rules ?? [];
  const defaultRule = config.default_rule ?? { type: "percentage", value: 100, message: "Free Gift", max_cap: null };

  // Initial values for dirty checking
  const initType = defaultRule.type;
  const initValue = String(defaultRule.value);
  const initMessage = defaultRule.message || "Free Gift";
  const initMaxCap = defaultRule.max_cap != null ? String(defaultRule.max_cap) : "";

  const [defType, setDefType] = useState(initType);
  const [defValue, setDefValue] = useState(initValue);
  const [defMessage, setDefMessage] = useState(initMessage);
  const [defMaxCap, setDefMaxCap] = useState(initMaxCap);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newOfferId, setNewOfferId] = useState("");
  const [newType, setNewType] = useState("percentage");
  const [newValue, setNewValue] = useState("100");
  const [newMessage, setNewMessage] = useState("Free Gift");
  const [newMaxCap, setNewMaxCap] = useState("");
  const submitting = fetcher.state !== "idle";

  const dirty = isActive && (defType !== initType || defValue !== initValue || defMessage !== initMessage || defMaxCap !== initMaxCap);

  function submitFn(payload) {
    fetcher.submit(JSON.stringify({ type: "discount-function", ...payload }), { method: "POST", encType: "application/json" });
  }

  function handleActivate() {
    submitFn({ intent: "activate", default_rule: { type: defType, value: Number(defValue), message: defMessage, max_cap: defMaxCap ? Number(defMaxCap) : null } });
  }

  async function handleDeactivate() {
    const yes = await confirm({ title: "Deactivate discount function", message: "This will remove the automatic discount from Shopify. Gift items will no longer be discounted at checkout.", confirmLabel: "Deactivate", destructive: true });
    if (yes) submitFn({ intent: "deactivate" });
  }

  const handleSave = useCallback(() => {
    submitFn({ intent: "update_default", default_rule: { type: defType, value: Number(defValue), message: defMessage, max_cap: defMaxCap ? Number(defMaxCap) : null } });
  }, [defType, defValue, defMessage, defMaxCap]);

  const handleDiscard = useCallback(() => {
    setDefType(initType);
    setDefValue(initValue);
    setDefMessage(initMessage);
    setDefMaxCap(initMaxCap);
    document.getElementById("discount-save-bar")?.hide();
  }, [initType, initValue, initMessage, initMaxCap]);

  // Show/hide save bar based on dirty state
  useEffect(() => {
    const saveBar = document.getElementById("discount-save-bar");
    if (dirty) saveBar?.show();
    else saveBar?.hide();
  }, [dirty]);

  // Wire up save bar button events
  useEffect(() => {
    const saveBtn = document.getElementById("discount-save-action");
    const discardBtn = document.getElementById("discount-discard-action");
    saveBtn?.addEventListener("click", handleSave);
    discardBtn?.addEventListener("click", handleDiscard);
    return () => {
      saveBtn?.removeEventListener("click", handleSave);
      discardBtn?.removeEventListener("click", handleDiscard);
    };
  }, [handleSave, handleDiscard]);

  // Sync loading state
  useEffect(() => {
    const saveBtn = document.getElementById("discount-save-action");
    if (!saveBtn) return;
    if (submitting) {
      saveBtn.setAttribute("loading", "");
      saveBtn.setAttribute("disabled", "");
    } else {
      saveBtn.removeAttribute("loading");
      saveBtn.removeAttribute("disabled");
    }
  }, [submitting]);

  // Hide save bar after successful save
  useEffect(() => {
    if (fetcher.data?.ok) {
      document.getElementById("discount-save-bar")?.hide();
    }
  }, [fetcher.data]);

  function handleAddRule() {
    if (!newOfferId.trim()) return;
    submitFn({ intent: "add_rule", rule: { offer_id: newOfferId.trim(), type: newType, value: Number(newValue), message: newMessage || "Free Gift", max_cap: newMaxCap ? Number(newMaxCap) : null } });
    setShowAddRule(false); setNewOfferId(""); setNewType("percentage"); setNewValue("100"); setNewMessage("Free Gift"); setNewMaxCap("");
  }

  async function handleDeleteRule(offerId) {
    const yes = await confirm({ title: "Delete rule", message: `Remove the discount rule for offer "${offerId}"?`, confirmLabel: "Delete", destructive: true });
    if (yes) submitFn({ intent: "delete_rule", rule_offer_id: offerId });
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
      <ui-save-bar id="discount-save-bar">
        <button variant="primary" id="discount-save-action"></button>
        <button id="discount-discard-action"></button>
      </ui-save-bar>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <s-text fontWeight="bold">Gift Discount Function</s-text>
        <s-badge tone={isActive ? "success" : "warning"}>{isActive ? "Active" : "Inactive"}</s-badge>
      </div>

      {/* Method */}
      <s-section heading="Method">
        <s-stack direction="block" gap="300">
          <s-text color="subdued">
            Uses a Shopify Function to automatically discount cart items marked as freebies at checkout.
          </s-text>
          {!isActive && (
            <s-button variant="primary" onClick={handleActivate} {...(submitting ? { loading: true } : {})}>Activate discount function</s-button>
          )}
          {isActive && (
            <s-button tone="critical" onClick={handleDeactivate} {...(submitting ? { disabled: true } : {})}>Deactivate</s-button>
          )}
        </s-stack>
      </s-section>

      {/* Discount value */}
      <s-section heading="Discount value">
        <s-stack direction="block" gap="300">
          <s-grid gridTemplateColumns="1fr 1fr" gap="300">
            <s-select label="Type" value={defType} onChange={(e) => setDefType(e.target.value)}>
              {DISCOUNT_TYPES.map((dt) => <s-option key={dt.value} value={dt.value}>{dt.label}</s-option>)}
            </s-select>
            <s-number-field
              label={defType === "percentage" ? "Percentage" : defType === "fixed_amount" ? "Amount off" : "Customer pays"}
              value={defValue}
              onInput={(e) => setDefValue(e.target.value)}
              min="0"
            />
          </s-grid>
          <s-number-field
            label="Maximum discount cap"
            value={defMaxCap}
            onInput={(e) => setDefMaxCap(e.target.value)}
            placeholder="No limit"
            min="0"
            details="Leave empty for no cap on the discount amount"
          />
        </s-stack>
      </s-section>

      {/* Checkout display */}
      <s-section heading="Checkout display">
        <s-text-field
          label="Discount message"
          value={defMessage}
          onInput={(e) => setDefMessage(e.target.value)}
          placeholder="Free Gift"
          details="Shown next to the discounted line item at checkout"
        />
      </s-section>

      {/* Per-offer overrides */}
      {isActive && (
        <s-section heading="Per-offer overrides">
          <s-stack direction="block" gap="300">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <s-text color="subdued">Override the default discount for specific offers</s-text>
              <s-button onClick={() => setShowAddRule(!showAddRule)}>{showAddRule ? "Cancel" : "Add rule"}</s-button>
            </div>

            {showAddRule && (
              <s-box border="base" borderRadius="200" padding="400">
                <s-stack direction="block" gap="300">
                  <s-text-field label="Offer ID" value={newOfferId} onInput={(e) => setNewOfferId(e.target.value)} placeholder="e.g. abc123" details="The offer ID this rule applies to" />
                  <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                    <s-select label="Type" value={newType} onChange={(e) => setNewType(e.target.value)}>
                      {DISCOUNT_TYPES.map((dt) => <s-option key={dt.value} value={dt.value}>{dt.label}</s-option>)}
                    </s-select>
                    <s-number-field label={newType === "percentage" ? "Percentage" : newType === "fixed_amount" ? "Amount off" : "Customer pays"} value={newValue} onInput={(e) => setNewValue(e.target.value)} min="0" />
                  </s-grid>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                    <s-text-field label="Message" value={newMessage} onInput={(e) => setNewMessage(e.target.value)} placeholder="Free Gift" />
                    <s-number-field label="Max cap" value={newMaxCap} onInput={(e) => setNewMaxCap(e.target.value)} placeholder="No limit" min="0" />
                  </s-grid>
                  <s-button variant="primary" onClick={handleAddRule} {...(submitting || !newOfferId.trim() ? { disabled: true } : {})}>Add rule</s-button>
                </s-stack>
              </s-box>
            )}

            {rules.length === 0 && !showAddRule && (
              <s-box padding="400" style={{ textAlign: "center" }}>
                <s-text color="subdued">No per-offer rules — all freebies use the default discount above.</s-text>
              </s-box>
            )}

            {rules.map((rule, i) => (
              <div key={rule.offer_id}>
                {i > 0 && <s-divider />}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                  <s-stack direction="block" gap="100">
                    <s-stack direction="inline" gap="200" alignItems="center">
                      <s-text fontWeight="bold">{rule.offer_id}</s-text>
                      <s-badge tone="info">
                        {rule.type === "percentage" ? `${rule.value}% off` : rule.type === "fixed_amount" ? `${rule.value} off` : `Pay ${rule.value}`}
                      </s-badge>
                    </s-stack>
                    <s-stack direction="inline" gap="200" alignItems="center">
                      <s-text color="subdued">{rule.message || "Free Gift"}</s-text>
                      {rule.max_cap != null && <s-badge>Cap: {rule.max_cap}</s-badge>}
                    </s-stack>
                  </s-stack>
                  <s-button tone="critical" onClick={() => handleDeleteRule(rule.offer_id)}>Remove</s-button>
                </div>
              </div>
            ))}
          </s-stack>
        </s-section>
      )}
    </div>
  );
}

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
  const { promotions, discountFunction } = useLoaderData();
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
  const byType = activeTab === "all" ? promotions : activeTab === "discount-function" ? [] : promotions.filter((p) => p.type === activeTab);
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

  const showTable = activeTab !== "discount-function";
  const allChecked = paged.length > 0 && selected.length === paged.length;
  const someChecked = selected.length > 0 && selected.length < paged.length;

  return (
    <s-page heading="Promotions">
      <s-button slot="primary-action" variant="primary" onClick={() => navigate("/app/promotions/new?type=offer")}>
        Create promotion
      </s-button>

      {/* Theme switcher — Max only */}
      {planData?.features?.theme_switcher && (
        <s-stack direction="inline" justifyContent="end">
          <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
        </s-stack>
      )}

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
            {showTable && (
              <s-button
                variant="tertiary"
                icon="search"
                pressed={searchOpen || undefined}
                onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearch(""); setCurrentPage(0); } }}
                accessibilityLabel="Toggle search"
              />
            )}
          </div>

          {/* Bulk actions — overlays on top of tabs */}
          {showTable && selected.length > 0 && (
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
        {showTable && searchOpen && (
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

        {/* Discount Function panel */}
        {activeTab === "discount-function" && (
          <s-box padding="400">
            {planData?.features?.discount_function ? (
              <DiscountFunctionPanel discountFunction={discountFunction} fetcher={fetcher} confirm={confirmFn} />
            ) : (
              <s-box padding="800">
                <s-stack direction="block" gap="400" alignItems="center">
                  <s-badge tone="warning">Basic plan required</s-badge>
                  <s-text fontWeight="bold">Automatic gift discounts</s-text>
                  <s-text color="subdued">
                    Upgrade to the Basic plan to automatically discount gift items at checkout using Shopify Functions.
                  </s-text>
                  <s-button variant="primary" onClick={() => navigate("/app/billing")}>View plans</s-button>
                </s-stack>
              </s-box>
            )}
          </s-box>
        )}

        {/* Table */}
        {showTable && (
          filtered.length === 0 ? (
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
          )
        )}
      </s-section>}
      {confirmModal}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
