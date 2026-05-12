import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useFetcher } from "react-router";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";

function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true;
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p));
}

export default forwardRef(function CouponForm({ coupon, onSubmit, submitting }, ref) {
  const [shopifyDiscountId, setShopifyDiscountId] = useState(coupon?.shopify_discount_id ?? "");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [typeLabel, setTypeLabel] = useState(coupon?.type_label ?? "");
  const [title, setTitle] = useState(coupon?.title ?? "");
  const [isAutomatic, setIsAutomatic] = useState(coupon?.is_automatic ?? false);
  const [enabled, setEnabled] = useState(coupon?.enabled ?? true);
  const [displayMessage, setDisplayMessage] = useState(coupon?.display_message ?? "");
  const [audience, setAudience] = useState(coupon?.audience ?? "all");
  const [pageHandles, setPageHandles] = useState(coupon?.page_handles?.join(", ") ?? "/");
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
      shopify_discount_id: shopifyDiscountId, code: code.trim(), type_label: typeLabel,
      title, is_automatic: isAutomatic, enabled, display_message: displayMessage || undefined,
      audience, page_handles: handles,
    });
  }

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  return (
    <>
      {/* Shopify Discount */}
      <s-section heading="Shopify Discount">
        <s-stack direction="block" gap="400">
          {hasDiscount && !pickerOpen ? (
            <>
              <s-box padding="400" border="base" borderRadius="200" background="bg-surface-secondary">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 13, color: "#6d7175" }}>{isAutomatic ? "Automatic discount" : code}</span>
                    <s-badge tone="success">{typeLabel}</s-badge>
                  </div>
                </div>
              </s-box>
              <s-button variant="tertiary" onClick={openPicker}>Change discount</s-button>
            </>
          ) : !pickerOpen ? (
            <>
              <s-button onClick={openPicker}>Select discount</s-button>
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
        </s-stack>
      </s-section>

      {/* Display Settings */}
      <s-section heading="Display settings">
        <s-stack direction="block" gap="400">
          <s-text-field label="Custom message" value={displayMessage} onInput={(e) => setDisplayMessage(e.target.value)} placeholder="Use this code for 20% off your order!" details="Shown on the coupon card in the cart drawer" />
          <s-checkbox label="Enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </s-stack>
      </s-section>

      {/* Targeting */}
      <s-section heading="Targeting">
        <s-stack direction="block" gap="400">
          <s-select label="Who can see this coupon?" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <s-option value="all">Everyone</s-option>
            <s-option value="signed_in">Signed-in customers</s-option>
            <s-option value="guest">Guests only</s-option>
            <s-option value="vip_tag">VIP customers</s-option>
          </s-select>
          <s-text-field label="Show on pages" value={pageHandles} onInput={(e) => setPageHandles(e.target.value)} details="Controls where the coupon card appears in the cart drawer" error={errors.pageHandles || ""} />
        </s-stack>
      </s-section>
    </>
  );
});
