import { useState, useCallback } from "react";
import { useFetcher } from "react-router";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";
import StepForm from "./StepForm.jsx";

function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true;
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p));
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

export default function CouponForm({ coupon, onSubmit, submitting }) {
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

  const stepDiscount = (
    <div className="cx-card">
      <div className="cx-card-header">
        <h3 className="cx-card-title">Shopify Discount</h3>
      </div>
      <div className="cx-card-body">
        <div className="cx-form-section">
          {hasDiscount && !pickerOpen ? (
            <>
              <div className="cx-selected-discount">
                <div className="cx-selected-discount-info">
                  <div className="cx-selected-discount-title">{title}</div>
                  <div className="cx-selected-discount-meta">
                    {isAutomatic ? "Automatic discount" : code}
                  </div>
                </div>
                <span className="cx-badge cx-badge-success">{typeLabel}</span>
              </div>
              <div>
                <button className="cx-btn cx-btn-ghost" onClick={openPicker}>
                  Change discount
                </button>
              </div>
            </>
          ) : !pickerOpen ? (
            <>
              <button className="cx-btn cx-btn-secondary" onClick={openPicker}>
                Select discount
              </button>
              {errors.code && <span className="cx-error">{errors.code}</span>}
            </>
          ) : null}

          {pickerOpen && (
            <>
              <Field label="Search">
                <input
                  className="cx-input"
                  placeholder="Search by title or code..."
                  onChange={(e) => loadDiscounts(e.target.value)}
                  autoFocus
                />
              </Field>
              <div className="cx-picker-list">
                {discountsLoading ? (
                  <div className="cx-picker-empty">Loading...</div>
                ) : discounts.length === 0 ? (
                  <div className="cx-picker-empty">No discounts found</div>
                ) : (
                  discounts.map((d) => (
                    <div
                      key={d.id}
                      className="cx-picker-item"
                      onClick={() => selectDiscount(d)}
                    >
                      <div className="cx-picker-item-info">
                        <div className="cx-picker-item-title">{d.title}</div>
                        {d.code && d.code !== d.title && (
                          <div className="cx-picker-item-code">{d.code}</div>
                        )}
                        <div className="cx-picker-item-meta">
                          {d.is_automatic ? "Automatic" : "Code"} &middot;{" "}
                          {d.status === "ACTIVE" ? "Active" : d.status === "SCHEDULED" ? "Scheduled" : "Expired"}
                        </div>
                      </div>
                      <span className={`cx-badge ${d.status === "ACTIVE" ? "cx-badge-success" : "cx-badge-warning"}`}>
                        {d.type_label}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <button className="cx-btn cx-btn-ghost" onClick={() => setPickerOpen(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const stepDisplayTarget = (
    <>
      {/* Display Settings */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Display settings</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field
              label="Custom message"
              optional
              hint="Shown on the coupon card in the cart drawer"
            >
              <input
                className="cx-input"
                value={displayMessage}
                onChange={(e) => setDisplayMessage(e.target.value)}
                placeholder="Use this code for 20% off your order!"
              />
            </Field>
            <label className="cx-checkbox">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enabled
            </label>
          </div>
        </div>
      </div>

      {/* Targeting */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Targeting</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="Who can see this coupon?">
              <select
                className="cx-input cx-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="all">Everyone</option>
                <option value="signed_in">Signed-in customers</option>
                <option value="guest">Guests only</option>
                <option value="vip_tag">VIP customers</option>
              </select>
            </Field>
            <Field
              label="Show on pages"
              hint="Controls where the coupon card appears in the cart drawer"
              error={errors.pageHandles}
            >
              <input
                className={`cx-input ${errors.pageHandles ? "cx-input-error" : ""}`}
                value={pageHandles}
                onChange={(e) => setPageHandles(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="cx-layout">
      <StepForm
        steps={[
          { label: "Discount", content: stepDiscount },
          { label: "Display & Targeting", content: stepDisplayTarget },
        ]}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save coupon"
      />
    </div>
  );
}
