import { useState, useCallback } from "react";
import { useFetcher } from "react-router";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";

function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true;
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p));
}

export default function CouponForm({ coupon, onSubmit, submitting }) {
  // Discount data (from picker or existing coupon)
  const [shopifyDiscountId, setShopifyDiscountId] = useState(coupon?.shopify_discount_id ?? "");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [typeLabel, setTypeLabel] = useState(coupon?.type_label ?? "");
  const [title, setTitle] = useState(coupon?.title ?? "");
  const [isAutomatic, setIsAutomatic] = useState(coupon?.is_automatic ?? false);
  const [enabled, setEnabled] = useState(coupon?.enabled ?? true);

  // Display settings
  const [displayMessage, setDisplayMessage] = useState(coupon?.display_message ?? "");
  const [audience, setAudience] = useState(coupon?.audience ?? "all");
  const [pageHandles, setPageHandles] = useState(coupon?.page_handles?.join(", ") ?? "/");

  const [errors, setErrors] = useState({});

  // Discount picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const discountFetcher = useFetcher();
  const discountsLoading = discountFetcher.state !== "idle";
  const discounts = discountFetcher.data?.discounts || [];

  const hasDiscount = !!(code || title);

  const loadDiscounts = useCallback((search) => {
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    discountFetcher.load("/api/discounts" + params);
  }, [discountFetcher]);

  function openPicker() {
    setPickerOpen(true);
    loadDiscounts("");
  }

  function selectDiscount(d) {
    setShopifyDiscountId(d.id);
    setCode(d.code || '');
    setTypeLabel(d.type_label);
    setTitle(d.title);
    setIsAutomatic(d.is_automatic);
    setPickerOpen(false);
  }

  function validate() {
    const errs = {};
    if (!title.trim() && !code.trim()) errs.code = "Select a discount first";
    const handles = pageHandles.split(",").map((h) => h.trim()).filter(Boolean);
    if (handles.length === 0) errs.pageHandles = "At least one page required";
    const frozen = handles.find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const handles = pageHandles.split(",").map((h) => h.trim()).filter(Boolean);
    onSubmit({
      shopify_discount_id: shopifyDiscountId,
      code: code.trim(),
      type_label: typeLabel,
      title,
      is_automatic: isAutomatic,
      enabled,
      display_message: displayMessage || undefined,
      audience,
      page_handles: handles,
    });
  }

  return (
    <s-stack direction="block" gap="loose">
      {/* Discount selection */}
      <s-card>
        <s-stack direction="block" gap="base">
          <s-text variant="headingSm">Shopify Discount</s-text>

          {hasDiscount && !pickerOpen ? (
            <s-stack direction="block" gap="tight">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#f6f6f7", borderRadius: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: "12px", color: "#6d7175" }}>
                    {isAutomatic ? "Automatic discount" : code}
                  </div>
                </div>
                <s-badge tone="success">{typeLabel}</s-badge>
              </div>
              <s-button variant="tertiary" onClick={openPicker}>Change discount</s-button>
            </s-stack>
          ) : !pickerOpen ? (
            <s-stack direction="block" gap="tight">
              <s-button onClick={openPicker}>Select discount</s-button>
              {errors.code ? <s-text tone="critical">{errors.code}</s-text> : null}
            </s-stack>
          ) : null}

          {pickerOpen && (
            <s-stack direction="block" gap="tight">
              <s-text-field
                label="Search"
                placeholder="Search by title or code..."
                onInput={(e) => loadDiscounts(e.currentTarget.value)}
                autoFocus
              />
              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e3e3e3", borderRadius: "8px" }}>
                {discountsLoading ? (
                  <div style={{ padding: "16px", textAlign: "center" }}>
                    <s-text tone="subdued">Loading...</s-text>
                  </div>
                ) : discounts.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center" }}>
                    <s-text tone="subdued">No discounts found</s-text>
                  </div>
                ) : (
                  discounts.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => selectDiscount(d)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f1f1",
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "#f6f6f7"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = ""; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>
                            {d.title}
                          </div>
                          {d.code && d.code !== d.title && (
                            <div style={{ fontSize: "12px", color: "#6d7175", fontFamily: "monospace" }}>{d.code}</div>
                          )}
                          <div style={{ fontSize: "11px", color: "#8c9196", marginTop: "2px" }}>
                            {d.is_automatic ? "Automatic" : "Code"} · {d.status === "ACTIVE" ? "Active" : d.status === "SCHEDULED" ? "Scheduled" : "Expired"}
                          </div>
                        </div>
                        <s-badge tone={d.status === "ACTIVE" ? "success" : "attention"}>
                          {d.type_label}
                        </s-badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <s-button variant="tertiary" onClick={() => setPickerOpen(false)}>Cancel</s-button>
            </s-stack>
          )}
        </s-stack>
      </s-card>

      {/* Display settings */}
      <s-section heading="Display settings">
        <s-text-field
          label="Custom message (optional)"
          value={displayMessage}
          onInput={(e) => setDisplayMessage(e.currentTarget.value)}
          placeholder="Use this code for 20% off your order!"
          details="Shown on the coupon card in the cart drawer"
        />
        <s-checkbox
          label="Enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
      </s-section>

      <s-section heading="Audience">
        <s-select
          label="Who can see this coupon?"
          value={audience}
          onChange={(e) => setAudience(e.currentTarget.value)}
        >
          <s-option value="all">Everyone</s-option>
          <s-option value="signed_in">Signed-in customers</s-option>
          <s-option value="guest">Guests only</s-option>
          <s-option value="vip_tag">VIP customers</s-option>
        </s-select>
      </s-section>

      <s-section heading="Show on pages">
        <s-text-field
          label="Page handles (comma-separated)"
          value={pageHandles}
          onInput={(e) => setPageHandles(e.currentTarget.value)}
          details="Controls where the coupon card appears in the cart drawer"
          {...(errors.pageHandles ? { error: errors.pageHandles } : {})}
        />
      </s-section>

      <s-button
        variant="primary"
        onClick={handleSubmit}
        {...(submitting ? { loading: true } : {})}
      >
        Save coupon
      </s-button>
    </s-stack>
  );
}
