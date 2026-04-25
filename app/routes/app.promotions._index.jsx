import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, Link, useSearchParams, useOutletContext } from "react-router";
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
  getFreebieDiscountStatus,
  ensureFreebieDiscount,
  deleteFreebieDiscount,
  updateFreebieDiscountConfig,
  buildFunctionConfig,
} from "../lib/discount.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const promotions = [];

  for (const offer of config.offers) {
    promotions.push({
      id: offer.id,
      type: "offer",
      name: offer.name,
      enabled: offer.enabled,
      trigger: triggerSummary(offer),
      pages: offer.page_handles || [],
    });
  }

  for (const coupon of config.coupons) {
    promotions.push({
      id: coupon.id,
      type: "coupon",
      name: coupon.is_automatic ? coupon.title : coupon.code,
      enabled: coupon.enabled,
      trigger: coupon.display_message || coupon.type_label || "Discount",
      pages: coupon.page_handles || [],
    });
  }

  for (const gift of config.claim_gifts) {
    promotions.push({
      id: gift.id,
      type: "claim-gift",
      name: gift.name,
      enabled: gift.enabled,
      trigger: gift.trigger
        ? gift.trigger.type === "price"
          ? `Rs.${gift.trigger.threshold} cart total`
          : `${gift.trigger.threshold} items`
        : "No trigger",
      pages: gift.page_handles || [],
    });
  }

  // Load discount function status
  let discountFunction = { active: false, discountId: null, functionConfig: null };
  try {
    discountFunction = await getFreebieDiscountStatus(admin, session.shop);
  } catch {
    // Function may not be deployed yet
  }

  return { promotions, discountFunction };
};

function triggerSummary(offer) {
  const parts = [];
  if (offer.trigger.price_threshold)
    parts.push(`Rs.${offer.trigger.price_threshold}`);
  if (offer.trigger.quantity_threshold)
    parts.push(`${offer.trigger.quantity_threshold} items`);
  if (parts.length === 0 && offer.source?.type === "product")
    return "Product in cart";
  return parts.join(" or ") || "No threshold";
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();
  const { intent, id, type } = body;

  // ── Discount function actions ──
  if (type === "discount-function") {
    try {
      if (intent === "activate") {
        const functionConfig = buildFunctionConfig(
          body.rules ?? [],
          body.default_rule ?? null
        );
        await ensureFreebieDiscount(admin, session.shop, functionConfig);
        return { ok: true, toast: "Discount function activated" };
      }
      if (intent === "deactivate") {
        await deleteFreebieDiscount(admin, session.shop);
        return { ok: true, toast: "Discount function deactivated" };
      }
      if (intent === "update_config") {
        await updateFreebieDiscountConfig(
          admin,
          session.shop,
          body.rules ?? [],
          body.default_rule ?? null
        );
        return { ok: true, toast: "Discount rules updated" };
      }
      if (intent === "add_rule") {
        // Get current config, add rule, update
        const status = await getFreebieDiscountStatus(admin, session.shop);
        const currentRules = status.functionConfig?.rules ?? [];
        const newRule = body.rule;
        currentRules.push(newRule);
        await updateFreebieDiscountConfig(
          admin,
          session.shop,
          currentRules,
          status.functionConfig?.default_rule ?? null
        );
        return { ok: true, toast: "Rule added" };
      }
      if (intent === "delete_rule") {
        const status = await getFreebieDiscountStatus(admin, session.shop);
        const currentRules = (status.functionConfig?.rules ?? []).filter(
          (r) => r.offer_id !== body.rule_offer_id
        );
        await updateFreebieDiscountConfig(
          admin,
          session.shop,
          currentRules,
          status.functionConfig?.default_rule ?? null
        );
        return { ok: true, toast: "Rule removed" };
      }
      if (intent === "update_default") {
        const status = await getFreebieDiscountStatus(admin, session.shop);
        await updateFreebieDiscountConfig(
          admin,
          session.shop,
          status.functionConfig?.rules ?? [],
          body.default_rule
        );
        return { ok: true, toast: "Default rule updated" };
      }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Standard promotion actions ──
  if (type === "offer") {
    if (intent === "delete") {
      config.offers = config.offers.filter((o) => o.id !== id);
    } else if (intent === "toggle") {
      const offer = config.offers.find((o) => o.id === id);
      if (offer) offer.enabled = !offer.enabled;
    } else if (intent === "duplicate") {
      const offer = config.offers.find((o) => o.id === id);
      if (offer) {
        config.offers.push({
          ...structuredClone(offer),
          id: crypto.randomUUID(),
          name: `${offer.name} (copy)`,
        });
      }
    }
  } else if (type === "coupon") {
    if (intent === "delete") {
      config.coupons = config.coupons.filter((c) => c.id !== id);
    } else if (intent === "toggle") {
      const coupon = config.coupons.find((c) => c.id === id);
      if (coupon) coupon.enabled = !coupon.enabled;
    }
  } else if (type === "claim-gift") {
    if (intent === "delete") {
      config.claim_gifts = config.claim_gifts.filter((g) => g.id !== id);
    } else if (intent === "toggle") {
      const gift = config.claim_gifts.find((g) => g.id === id);
      if (gift) gift.enabled = !gift.enabled;
    }
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

const TYPE_LABELS = {
  offer: "Offer",
  coupon: "Coupon",
  "claim-gift": "Claim Gift",
};

const TYPE_BADGE_CLASS = {
  offer: "cx-badge-magic",
  coupon: "cx-badge-info",
  "claim-gift": "cx-badge-success",
};

const TABS = ["all", "offer", "coupon", "claim-gift", "discount-function"];
const TAB_LABELS = {
  all: "All",
  offer: "Offers",
  coupon: "Coupons",
  "claim-gift": "Claim Gifts",
  "discount-function": "Discount Functions",
};

function Toggle({ checked, onChange }) {
  return (
    <label className="cx-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="cx-toggle-track" />
    </label>
  );
}

function Field({ label, hint, error, children, optional }) {
  return (
    <div className="cx-field">
      {label && (
        <label className="cx-label">
          {label}
          {optional && <span className="cx-label-optional"> (optional)</span>}
        </label>
      )}
      {children}
      {hint && <span className="cx-hint">{hint}</span>}
      {error && <span className="cx-error">{error}</span>}
    </div>
  );
}

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed_amount", label: "Fixed amount off" },
  { value: "fixed_price", label: "Fixed price" },
];

function DiscountFunctionPanel({ discountFunction, fetcher, confirm }) {
  const isActive = discountFunction.active;
  const config = discountFunction.functionConfig ?? {};
  const rules = config.rules ?? [];
  const defaultRule = config.default_rule ?? {
    type: "percentage",
    value: 100,
    message: "Free Gift",
    max_cap: null,
  };

  // Default rule form state
  const [defType, setDefType] = useState(defaultRule.type);
  const [defValue, setDefValue] = useState(String(defaultRule.value));
  const [defMessage, setDefMessage] = useState(defaultRule.message || "Free Gift");
  const [defMaxCap, setDefMaxCap] = useState(
    defaultRule.max_cap != null ? String(defaultRule.max_cap) : ""
  );

  // New rule form state
  const [showAddRule, setShowAddRule] = useState(false);
  const [newOfferId, setNewOfferId] = useState("");
  const [newType, setNewType] = useState("percentage");
  const [newValue, setNewValue] = useState("100");
  const [newMessage, setNewMessage] = useState("Free Gift");
  const [newMaxCap, setNewMaxCap] = useState("");

  const submitting = fetcher.state !== "idle";

  function submitFn(payload) {
    fetcher.submit(JSON.stringify({ type: "discount-function", ...payload }), {
      method: "POST",
      encType: "application/json",
    });
  }

  function handleActivate() {
    submitFn({
      intent: "activate",
      default_rule: {
        type: defType,
        value: Number(defValue),
        message: defMessage,
        max_cap: defMaxCap ? Number(defMaxCap) : null,
      },
    });
  }

  async function handleDeactivate() {
    const yes = await confirm({
      title: "Deactivate discount function",
      message: "This will remove the automatic discount from Shopify. Gift items will no longer be discounted at checkout.",
      confirmLabel: "Deactivate",
      destructive: true,
    });
    if (yes) submitFn({ intent: "deactivate" });
  }

  function handleUpdateDefault() {
    submitFn({
      intent: "update_default",
      default_rule: {
        type: defType,
        value: Number(defValue),
        message: defMessage,
        max_cap: defMaxCap ? Number(defMaxCap) : null,
      },
    });
  }

  function handleAddRule() {
    if (!newOfferId.trim()) return;
    submitFn({
      intent: "add_rule",
      rule: {
        offer_id: newOfferId.trim(),
        type: newType,
        value: Number(newValue),
        message: newMessage || "Free Gift",
        max_cap: newMaxCap ? Number(newMaxCap) : null,
      },
    });
    setShowAddRule(false);
    setNewOfferId("");
    setNewType("percentage");
    setNewValue("100");
    setNewMessage("Free Gift");
    setNewMaxCap("");
  }

  async function handleDeleteRule(offerId) {
    const yes = await confirm({
      title: "Delete rule",
      message: `Remove the discount rule for offer "${offerId}"?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (yes) submitFn({ intent: "delete_rule", rule_offer_id: offerId });
  }

  return (
    <>
      {/* Status Card */}
      <div className="cx-card">
        <div className="cx-card-header">
          <div>
            <h3 className="cx-card-title">Gift Discount Function</h3>
            <p className="cx-card-subtitle">
              Automatically discounts items marked as freebies at checkout
            </p>
          </div>
          <span
            className={`cx-badge cx-badge-dot ${isActive ? "cx-badge-success" : "cx-badge-warning"}`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="cx-card-body">
          {!isActive ? (
            <div className="cx-banner cx-banner-info" style={{ marginBottom: 16 }}>
              <svg
                className="cx-banner-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm2 8H6v-1h1V8H6V7h3v4h1v1z" />
              </svg>
              <span>
                Activate the discount function to automatically apply discounts
                to gift items at checkout. Make sure you&apos;ve deployed the
                app with <code>shopify app deploy</code> first.
              </span>
            </div>
          ) : (
            <div
              className="cx-banner cx-banner-success"
              style={{ marginBottom: 16 }}
            >
              <svg
                className="cx-banner-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.7 5.3l-4.5 4.5a.5.5 0 01-.7 0L4.3 8.6a.5.5 0 01.7-.7L6.5 9.4l4.1-4.1a.5.5 0 01.7.7z" />
              </svg>
              <span>
                Discount function is active. Gift items with{" "}
                <code>_freebie: true</code> will be discounted at checkout.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Default Rule */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Default discount rule</h3>
        </div>
        <div className="cx-card-body">
          <p
            className="cx-text-sm cx-text-secondary"
            style={{ margin: "0 0 12px" }}
          >
            Applied to all freebie items that don&apos;t match a specific
            per-offer rule below.
          </p>
          <div className="cx-form-section">
            <div className="cx-form-row">
              <Field label="Discount type">
                <select
                  className="cx-input cx-select"
                  value={defType}
                  onChange={(e) => setDefType(e.target.value)}
                >
                  {DISCOUNT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  defType === "percentage"
                    ? "Percentage"
                    : defType === "fixed_amount"
                      ? "Amount off"
                      : "Customer pays"
                }
              >
                <input
                  className="cx-input"
                  type="number"
                  value={defValue}
                  onChange={(e) => setDefValue(e.target.value)}
                  min="0"
                  step={defType === "percentage" ? "1" : "0.01"}
                />
              </Field>
            </div>
            <div className="cx-form-row">
              <Field label="Checkout message">
                <input
                  className="cx-input"
                  value={defMessage}
                  onChange={(e) => setDefMessage(e.target.value)}
                  placeholder="Free Gift"
                />
              </Field>
              <Field label="Max discount cap" optional>
                <input
                  className="cx-input"
                  type="number"
                  value={defMaxCap}
                  onChange={(e) => setDefMaxCap(e.target.value)}
                  placeholder="No limit"
                  min="0"
                  step="0.01"
                />
              </Field>
            </div>
            <div className="cx-flex cx-gap-sm">
              {isActive ? (
                <>
                  <button
                    className="cx-btn cx-btn-primary"
                    onClick={handleUpdateDefault}
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save default rule"}
                  </button>
                  <button
                    className="cx-btn cx-btn-danger"
                    onClick={handleDeactivate}
                    disabled={submitting}
                  >
                    Deactivate
                  </button>
                </>
              ) : (
                <button
                  className="cx-btn cx-btn-primary"
                  onClick={handleActivate}
                  disabled={submitting}
                >
                  {submitting ? "Activating..." : "Activate discount function"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Per-Offer Rules */}
      {isActive && (
        <div className="cx-card">
          <div className="cx-card-header">
            <div>
              <h3 className="cx-card-title">Per-offer rules</h3>
              <p className="cx-card-subtitle">
                Override the default rule for specific offers
              </p>
            </div>
            <button
              className="cx-btn cx-btn-secondary"
              onClick={() => setShowAddRule(!showAddRule)}
            >
              {showAddRule ? "Cancel" : "Add rule"}
            </button>
          </div>

          {showAddRule && (
            <div className="cx-card-body" style={{ borderBottom: "1px solid var(--cx-border)" }}>
              <div className="cx-form-section">
                <Field
                  label="Offer ID"
                  hint="The offer ID this rule applies to (from the offer's URL or config)"
                >
                  <input
                    className="cx-input"
                    value={newOfferId}
                    onChange={(e) => setNewOfferId(e.target.value)}
                    placeholder="e.g. abc123-def456"
                  />
                </Field>
                <div className="cx-form-row">
                  <Field label="Discount type">
                    <select
                      className="cx-input cx-select"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      {DISCOUNT_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={
                      newType === "percentage"
                        ? "Percentage"
                        : newType === "fixed_amount"
                          ? "Amount off"
                          : "Customer pays"
                    }
                  >
                    <input
                      className="cx-input"
                      type="number"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      min="0"
                    />
                  </Field>
                </div>
                <div className="cx-form-row">
                  <Field label="Checkout message">
                    <input
                      className="cx-input"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Free Gift"
                    />
                  </Field>
                  <Field label="Max cap" optional>
                    <input
                      className="cx-input"
                      type="number"
                      value={newMaxCap}
                      onChange={(e) => setNewMaxCap(e.target.value)}
                      placeholder="No limit"
                      min="0"
                    />
                  </Field>
                </div>
                <button
                  className="cx-btn cx-btn-primary"
                  onClick={handleAddRule}
                  disabled={submitting || !newOfferId.trim()}
                >
                  Add rule
                </button>
              </div>
            </div>
          )}

          {rules.length === 0 && !showAddRule ? (
            <div className="cx-empty" style={{ padding: "32px 20px" }}>
              <p className="cx-empty-desc">
                No per-offer rules. All freebie items use the default rule
                above.
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <div className="cx-list-item" key={rule.offer_id}>
                <div className="cx-list-item-info">
                  <div className="cx-flex cx-items-center cx-gap-sm">
                    <span className="cx-list-item-title">
                      {rule.offer_id}
                    </span>
                    <span className="cx-badge cx-badge-info">
                      {rule.type === "percentage"
                        ? `${rule.value}% off`
                        : rule.type === "fixed_amount"
                          ? `${rule.value} off`
                          : `Pay ${rule.value}`}
                    </span>
                  </div>
                  <div className="cx-list-item-meta">
                    <span className="cx-list-item-desc">
                      {rule.message || "Free Gift"}
                    </span>
                    {rule.max_cap != null && (
                      <span className="cx-badge cx-badge-default">
                        Cap: {rule.max_cap}
                      </span>
                    )}
                  </div>
                </div>
                <div className="cx-list-item-actions">
                  <button
                    className="cx-btn cx-btn-danger cx-btn-sm"
                    onClick={() => handleDeleteRule(rule.offer_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

export default function PromotionsIndex() {
  const { promotions, discountFunction } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchParams] = useSearchParams();
  const { themes, activeThemeId, mainThemeId } = useOutletContext();
  const [confirmFn, confirmModal] = useConfirm();

  const initialTab = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (fetcher.data?.toast) {
      shopify.toast.show(fetcher.data.toast);
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const filtered =
    activeTab === "all"
      ? promotions
      : activeTab === "discount-function"
        ? []
        : promotions.filter((p) => p.type === activeTab);

  function submitAction(intent, id, type) {
    fetcher.submit(JSON.stringify({ intent, id, type }), {
      method: "POST",
      encType: "application/json",
    });
  }

  async function handleDelete(promo) {
    const yes = await confirmFn({
      title: `Delete ${TYPE_LABELS[promo.type].toLowerCase()}`,
      message: `Are you sure you want to delete "${promo.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (yes) submitAction("delete", promo.id, promo.type);
  }

  const tabCounts = {};
  for (const tab of TABS) {
    if (tab === "discount-function") {
      tabCounts[tab] = discountFunction.active ? 1 : 0;
    } else {
      tabCounts[tab] =
        tab === "all"
          ? promotions.length
          : promotions.filter((p) => p.type === tab).length;
    }
  }

  return (
    <s-page heading="Promotions">
      <div className="cx-layout">
        <div className="cx-page-actions">
          <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
          <Link to="/app/promotions/new?type=offer" className="cx-btn cx-btn-primary">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create promotion
          </Link>
        </div>
        {/* Tab filter */}
        <div className="cx-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`cx-tab ${activeTab === tab ? "cx-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
              <span style={{ opacity: 0.6, marginLeft: 4 }}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Discount Functions panel */}
        {activeTab === "discount-function" && (
          <DiscountFunctionPanel
            discountFunction={discountFunction}
            fetcher={fetcher}
            confirm={confirmFn}
          />
        )}

        {/* Promotions list (all non-function tabs) */}
        {activeTab !== "discount-function" && (
          <>
            {filtered.length === 0 ? (
              <div className="cx-card">
                <div className="cx-empty">
                  <div className="cx-empty-icon">
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6h.008v.008H6V6z"
                      />
                    </svg>
                  </div>
                  <p className="cx-empty-title">
                    {activeTab === "all"
                      ? "No promotions yet"
                      : `No ${TAB_LABELS[activeTab].toLowerCase()} yet`}
                  </p>
                  <p className="cx-empty-desc">
                    Create your first promotion to start adding offers,
                    coupons, or claim gifts for your customers.
                  </p>
                </div>
              </div>
            ) : (
              <div className="cx-card">
                {filtered.map((promo) => (
                  <div className="cx-list-item" key={promo.id}>
                    <div className="cx-list-item-info">
                      <div className="cx-flex cx-items-center cx-gap-sm">
                        <span className="cx-list-item-title">
                          {promo.name}
                        </span>
                        <span
                          className={`cx-badge cx-badge-dot ${promo.enabled ? "cx-badge-success" : "cx-badge-warning"}`}
                        >
                          {promo.enabled ? "Active" : "Inactive"}
                        </span>
                        <span
                          className={`cx-badge ${TYPE_BADGE_CLASS[promo.type]}`}
                        >
                          {TYPE_LABELS[promo.type]}
                        </span>
                      </div>
                      <div className="cx-list-item-meta">
                        <span className="cx-list-item-desc">
                          {promo.trigger}
                        </span>
                        {promo.pages.length > 0 &&
                          promo.pages.map((h) => (
                            <span
                              key={h}
                              className="cx-badge cx-badge-default"
                            >
                              {h}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="cx-list-item-actions">
                      <Toggle
                        checked={promo.enabled}
                        onChange={() =>
                          submitAction("toggle", promo.id, promo.type)
                        }
                      />
                      {promo.type === "offer" && (
                        <button
                          className="cx-btn cx-btn-ghost cx-btn-sm"
                          onClick={() =>
                            submitAction("duplicate", promo.id, promo.type)
                          }
                          title="Duplicate"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        </button>
                      )}
                      <Link
                        to={`/app/promotions/${promo.id}`}
                        className="cx-btn cx-btn-secondary cx-btn-sm"
                      >
                        Edit
                      </Link>
                      <button
                        className="cx-btn cx-btn-danger cx-btn-sm"
                        onClick={() => handleDelete(promo)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {confirmModal}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
