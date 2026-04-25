import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";
import VariantList, { extractVariantData } from "./VariantList.jsx";
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

/** Build initial display data from the variant data map or existing claimable_variant_data */
function buildInitialDisplay(claimGift, variantDataMap) {
  // Prefer the enriched data stored on the claim gift
  if (claimGift?.claimable_variant_data?.length) {
    return claimGift.claimable_variant_data.map((d) => ({
      variant_id: d.variant_id,
      title: d.title || d.variant_id,
      variant_title: null,
      image: d.image || "",
    }));
  }
  // Fall back to resolved map from the loader
  if (claimGift?.claimable_variants && variantDataMap) {
    return claimGift.claimable_variants.map((vid) => {
      const d = variantDataMap[vid] || {};
      return {
        variant_id: vid,
        title: d.title || vid,
        variant_title: null,
        image: d.image || "",
      };
    });
  }
  return [];
}

export default function ClaimGiftForm({
  claimGift,
  variantDataMap,
  onSubmit,
  submitting,
}) {
  const shopify = useAppBridge();

  const [name, setName] = useState(claimGift?.name ?? "");
  const [sectionHeading, setSectionHeading] = useState(
    claimGift?.section_heading ?? ""
  );
  const [enabled, setEnabled] = useState(claimGift?.enabled ?? true);

  const [triggerType, setTriggerType] = useState(
    claimGift?.trigger?.type ?? "price"
  );
  const [threshold, setThreshold] = useState(
    claimGift?.trigger?.threshold ?? ""
  );

  const [claimableVariants, setClaimableVariants] = useState(
    claimGift?.claimable_variants ?? []
  );
  const [claimableDisplay, setClaimableDisplay] = useState(
    () => buildInitialDisplay(claimGift, variantDataMap)
  );
  const [maxClaims, setMaxClaims] = useState(
    claimGift?.max_claims ?? ""
  );

  const [barShow, setBarShow] = useState(claimGift?.bar?.show ?? false);
  const [barLabel, setBarLabel] = useState(claimGift?.bar?.label ?? "");
  const [barSubLabel, setBarSubLabel] = useState(
    claimGift?.bar?.sub_label ?? ""
  );
  const [barLockedMessage, setBarLockedMessage] = useState(
    claimGift?.bar?.locked_message ?? ""
  );
  const [barUnlockedMessage, setBarUnlockedMessage] = useState(
    claimGift?.bar?.unlocked_message ?? ""
  );

  const [audience, setAudience] = useState(claimGift?.audience ?? "all");
  const [pageHandles, setPageHandles] = useState(
    claimGift?.page_handles?.join(", ") ?? "/"
  );

  const [errors, setErrors] = useState({});

  async function pickClaimableProducts() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const display = extractVariantData(selection);
      const ids = display.map((v) => v.variant_id);
      setClaimableVariants(ids);
      setClaimableDisplay(display);
    }
  }

  function removeClaimableVariant(vid) {
    setClaimableVariants(claimableVariants.filter((id) => id !== vid));
    setClaimableDisplay(claimableDisplay.filter((v) => v.variant_id !== vid));
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!sectionHeading.trim())
      errs.sectionHeading = "Section heading is required";

    if (!threshold || Number(threshold) <= 0) {
      errs.threshold = "Threshold must be a positive number";
    }

    if (claimableVariants.length === 0) {
      errs.variants = "Select at least one claimable product";
    }

    const handles = pageHandles
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (handles.length === 0) errs.pageHandles = "At least one page required";
    const frozen = handles.find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;

    if (barShow && !barLabel.trim()) {
      errs.barLabel = "Bar label is required when bar is shown";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const handles = pageHandles
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    const data = {
      name,
      section_heading: sectionHeading,
      enabled,
      trigger: { type: triggerType, threshold: Number(threshold) },
      claimable_variants: claimableVariants,
      max_claims: maxClaims ? Number(maxClaims) : undefined,
      bar: barShow
        ? {
            show: true,
            label: barLabel,
            sub_label: barSubLabel || undefined,
            locked_message: barLockedMessage || undefined,
            unlocked_message: barUnlockedMessage || undefined,
          }
        : undefined,
      audience,
      page_handles: handles,
    };

    onSubmit(data);
  }

  const stepDetails = (
    <>
      {/* Basic Info */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Basic info</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="Name" hint="Internal label, not shown to customers" error={errors.name}>
              <input
                className={`cx-input ${errors.name ? "cx-input-error" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field
              label="Section heading"
              hint="Shown above the claim section in the cart drawer"
              error={errors.sectionHeading}
            >
              <input
                className={`cx-input ${errors.sectionHeading ? "cx-input-error" : ""}`}
                value={sectionHeading}
                onChange={(e) => setSectionHeading(e.target.value)}
                placeholder="Add freebies at Rs.1"
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

      {/* Trigger */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Trigger</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <div className="cx-form-row">
              <Field label="Threshold type">
                <select
                  className="cx-input cx-select"
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                >
                  <option value="price">Price</option>
                  <option value="quantity">Quantity</option>
                </select>
              </Field>
              <Field
                label={triggerType === "price" ? "Minimum cart total" : "Minimum items"}
                error={errors.threshold}
              >
                <input
                  className={`cx-input ${errors.threshold ? "cx-input-error" : ""}`}
                  type="number"
                  value={String(threshold)}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const stepProducts = (
    <div className="cx-card">
      <div className="cx-card-header">
        <h3 className="cx-card-title">Claimable products</h3>
      </div>
      <div className="cx-card-body">
        <div className="cx-form-section">
          <div className="cx-flex cx-items-center cx-gap-md">
            <button className="cx-btn cx-btn-secondary" onClick={pickClaimableProducts}>
              {claimableVariants.length > 0 ? "Change products" : "Select products"}
            </button>
            {claimableVariants.length > 0 && (
              <span className="cx-variant-count">
                <span className="cx-variant-count-num">{claimableVariants.length}</span> variant(s)
              </span>
            )}
          </div>
          <VariantList
            variants={claimableDisplay}
            onRemove={removeClaimableVariant}
          />
          <p className="cx-text-sm cx-text-secondary" style={{ margin: 0 }}>
            Customers can pick from these products once threshold is met.
            Out-of-stock products are hidden automatically.
          </p>
          {errors.variants && (
            <div className="cx-banner cx-banner-danger">{errors.variants}</div>
          )}
          <Field
            label="Max gifts a customer can claim"
            hint="Leave empty to allow claiming all products"
          >
            <input
              className="cx-input"
              type="number"
              value={String(maxClaims)}
              onChange={(e) => setMaxClaims(e.target.value)}
              placeholder={String(claimableVariants.length || 1)}
            />
          </Field>
        </div>
      </div>
    </div>
  );

  const stepDisplay = (
    <>
      {/* Progress Bar */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Progress Bar</h3>
          <label className="cx-checkbox">
            <input
              type="checkbox"
              checked={barShow}
              onChange={(e) => setBarShow(e.target.checked)}
            />
            Show on progress bar
          </label>
        </div>
        {barShow && (
          <div className="cx-card-body">
            <div className="cx-form-section">
              <Field label="Bar label" error={errors.barLabel}>
                <input
                  className={`cx-input ${errors.barLabel ? "cx-input-error" : ""}`}
                  value={barLabel}
                  onChange={(e) => setBarLabel(e.target.value)}
                />
              </Field>
              <Field label="Sub label" optional>
                <input
                  className="cx-input"
                  value={barSubLabel}
                  onChange={(e) => setBarSubLabel(e.target.value)}
                />
              </Field>
              <div className="cx-form-row">
                <Field label="Locked message" optional>
                  <input
                    className="cx-input"
                    value={barLockedMessage}
                    onChange={(e) => setBarLockedMessage(e.target.value)}
                  />
                </Field>
                <Field label="Unlocked message" optional>
                  <input
                    className="cx-input"
                    value={barUnlockedMessage}
                    onChange={(e) => setBarUnlockedMessage(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}
        {!barShow && (
          <div className="cx-card-body">
            <div className="cx-banner cx-banner-info">
              <svg className="cx-banner-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm2 8H6v-1h1V8H6V7h3v4h1v1z"/>
              </svg>
              <span>Bar tier is hidden on pages where this claim gift isn't displayed.</span>
            </div>
          </div>
        )}
      </div>

      {/* Targeting */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Targeting</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="Who can see this claim gift?">
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
              label="Active on pages"
              hint="Controls where the claim section appears. Claimed items persist across pages."
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
          { label: "Details", content: stepDetails },
          { label: "Products", content: stepProducts },
          { label: "Display & Targeting", content: stepDisplay },
        ]}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save claim gift"
      />
    </div>
  );
}
