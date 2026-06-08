import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useFetcher } from "react-router";
import { isFrozenHandle } from "../lib/constants.js";
import TargetingSection from "./TargetingSection.jsx";
import TagTargetingSection from "./TagTargetingSection.jsx";
import VStack from "./VStack.jsx";
import PromotionAside from "./PromotionAside.jsx";

function describePages(pageHandles) {
  if (!Array.isArray(pageHandles) || pageHandles.length === 0) return "All pages";
  if (pageHandles.length === 1 && pageHandles[0] === "/") return "All pages";
  const count = pageHandles.length;
  if (pageHandles.every((h) => h.startsWith("/products/"))) {
    return `${count} product page${count === 1 ? "" : "s"}`;
  }
  if (pageHandles.every((h) => h.startsWith("/collections/"))) {
    return `${count} collection page${count === 1 ? "" : "s"}`;
  }
  return `${count} page${count === 1 ? "" : "s"}`;
}

function buildCouponSummary({ isAutomatic, code, title, shopifyDiscountId, typeLabel, pageHandles }) {
  const typeValue = isAutomatic ? "Automatic discount" : "Code-based";
  const codeValue = isAutomatic ? (title || null) : (code || null);

  return [
    { label: "Type", value: typeValue },
    { label: isAutomatic ? "Title" : "Code", value: codeValue },
    { label: "Discount type", value: typeLabel || null },
    { label: "Linked discount", value: shopifyDiscountId ? "Linked" : "Not linked" },
    { label: "Shown on", value: describePages(pageHandles) },
  ];
}

export default forwardRef(function CouponForm({ coupon, onSubmit, submitting }, ref) {
  const [shopifyDiscountId, setShopifyDiscountId] = useState(coupon?.shopify_discount_id ?? "");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [typeLabel, setTypeLabel] = useState(coupon?.type_label ?? "");
  const [title, setTitle] = useState(coupon?.title ?? "");
  const [isAutomatic, setIsAutomatic] = useState(coupon?.is_automatic ?? false);
  const [enabled, setEnabled] = useState(coupon?.enabled ?? true);
  const [displayMessage, setDisplayMessage] = useState(coupon?.display_message ?? "");
  const [accent, setAccent] = useState(coupon?.accent ?? "");
  const [triggerQty, setTriggerQty] = useState(coupon?.trigger_qty ?? "");
  const [triggerPrice, setTriggerPrice] = useState(coupon?.trigger_price ?? "");
  const [pageHandles, setPageHandles] = useState(coupon?.page_handles?.length ? coupon.page_handles : ["/"]);
  const [pageTargets, setPageTargets] = useState(coupon?.page_targets);
  const [customerTags, setCustomerTags] = useState(coupon?.customer_tags);
  const [errors, setErrors] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const discountFetcher = useFetcher();
  const discountsLoading = discountFetcher.state !== "idle";
  const discounts = discountFetcher.data?.discounts || [];
  const hasDiscount = !!(code || title);

  const loadDiscounts = useCallback((search) => {
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    discountFetcher.load("/api/discounts" + params);
  }, [discountFetcher]);

  function openPicker() { setPickerOpen(true); loadDiscounts(""); }

  function selectDiscount(d) {
    setShopifyDiscountId(d.id); setCode(d.code || ""); setTypeLabel(d.type_label);
    setTitle(d.title); setIsAutomatic(d.is_automatic); setPickerOpen(false);
  }

  function validate() {
    const errs = {};
    if (!title.trim() && !code.trim()) errs.code = "Select a discount first";
    if (!Array.isArray(pageHandles) || pageHandles.length === 0) errs.pageHandles = "Select at least one page";
    const frozen = (pageHandles || []).find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit({
      shopify_discount_id: shopifyDiscountId, code: code.trim(), type_label: typeLabel,
      title, is_automatic: isAutomatic, enabled, display_message: displayMessage || undefined,
      accent: accent.trim() || undefined,
      trigger_qty: triggerQty !== "" ? Number(triggerQty) : undefined,
      trigger_price: triggerPrice !== "" ? Number(triggerPrice) : undefined,
      page_handles: pageHandles, page_targets: pageTargets,
      customer_tags: customerTags,
    });
  }

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  return (
    <>
      {/* Shopify Discount */}
      <s-section heading="Shopify Discount">
        <VStack gap={400}>
          {hasDiscount && !pickerOpen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                border: "1px solid var(--s-color-border, #e3e3e3)",
                borderRadius: 12,
                background: "#fff",
              }}
            >
              {/* Discount icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#e8f5ea",
                  color: "#0a6b2a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 6L6 14" />
                  <circle cx="7" cy="7" r="1.5" />
                  <circle cx="13" cy="13" r="1.5" />
                </svg>
              </div>

              {/* Title + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#1a1a1a",
                    marginBottom: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {isAutomatic ? (
                    <span style={{ fontSize: 12, color: "#6d7175" }}>Automatic discount</span>
                  ) : (
                    code && (
                      <span
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 12,
                          padding: "2px 8px",
                          background: "#f1f1f1",
                          borderRadius: 6,
                          color: "#1a1a1a",
                        }}
                      >
                        {code}
                      </span>
                    )
                  )}
                  {typeLabel && <s-badge tone="success">{typeLabel}</s-badge>}
                </div>
              </div>

              {/* Change button */}
              <s-button variant="secondary" onClick={openPicker}>Change</s-button>
            </div>
          ) : !pickerOpen ? (
            <>
              <s-button variant="primary" onClick={openPicker}>Select discount</s-button>
              {errors.code && <s-banner tone="critical">{errors.code}</s-banner>}
            </>
          ) : null}

          {pickerOpen && (
            <>
              <s-text-field label="Search" placeholder="Search by title or code..." onInput={(e) => loadDiscounts(e.target.value)} />
              <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, maxHeight: 300, overflowY: "auto" }}>
                {discountsLoading ? (
                  <div style={{ textAlign: "center", padding: "20px" }}><s-spinner /></div>
                ) : discounts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", fontSize: 13, color: "#6d7175" }}>No discounts found</div>
                ) : (
                  discounts.map((d) => (
                    <div key={d.id} onClick={() => selectDiscount(d)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #e3e3e3" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#f6f6f7"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
                        {d.code && d.code !== d.title && <div style={{ fontFamily: "monospace", fontSize: 11, color: "#6d7175" }}>{d.code}</div>}
                        <div style={{ fontSize: 11, color: "#8c9196", marginTop: 2 }}>
                          {d.is_automatic ? "Automatic" : "Code"} &middot; {d.status === "ACTIVE" ? "Active" : d.status === "SCHEDULED" ? "Scheduled" : "Expired"}
                        </div>
                      </div>
                      <s-badge tone={d.status === "ACTIVE" ? "success" : "warning"}>{d.type_label}</s-badge>
                    </div>
                  ))
                )}
              </div>
              <s-button variant="tertiary" onClick={() => setPickerOpen(false)}>Cancel</s-button>
            </>
          )}
        </VStack>
      </s-section>

      {/* Display Settings */}
      <s-section heading="Cart card display" description="Controls how this coupon appears as a card in the cart drawer's discount block.">
        <VStack gap={400}>
          <s-text-field
            label="Accent label"
            value={accent}
            onInput={(e) => setAccent(e.target.value)}
            placeholder="e.g. ₹100 OFF or 20% OFF"
            details="Short label on the coloured strip of the card. Keep it under 10 characters."
          />
          <s-text-field
            label="Savings text"
            value={displayMessage}
            onInput={(e) => setDisplayMessage(e.target.value)}
            placeholder="e.g. Save ₹100 on this order"
            details="Description shown below the code on the card."
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <s-text-field
              label="Min. cart quantity"
              type="number"
              value={String(triggerQty)}
              onInput={(e) => setTriggerQty(e.target.value)}
              details="Only show this card when the cart has at least this many items. Leave empty to always show."
            />
            <s-text-field
              label="Min. cart total"
              type="number"
              value={String(triggerPrice)}
              onInput={(e) => setTriggerPrice(e.target.value)}
              details="Only show when the cart total is at least this amount. Leave empty to always show."
            />
          </div>
        </VStack>
      </s-section>

      <PromotionAside
        enabled={enabled}
        onEnabledChange={setEnabled}
        summary={buildCouponSummary({ isAutomatic, code, title, shopifyDiscountId, typeLabel, pageHandles })}
      />

      {/* Targeting */}
      <TargetingSection
        pageHandles={pageHandles}
        pageTargets={pageTargets}
        onChange={({ page_handles, page_targets }) => { setPageHandles(page_handles); setPageTargets(page_targets); }}
      />
      {errors.pageHandles && <s-banner tone="critical">{errors.pageHandles}</s-banner>}

      <TagTargetingSection value={customerTags} onChange={setCustomerTags} />
    </>
  );
});
