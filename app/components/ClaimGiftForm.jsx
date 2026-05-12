import { useState, forwardRef, useImperativeHandle } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";
import VariantList, { extractVariantData } from "./VariantList.jsx";

function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true;
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p));
}

function buildInitialDisplay(claimGift, variantDataMap) {
  if (claimGift?.claimable_variant_data?.length) {
    return claimGift.claimable_variant_data.map((d) => ({
      variant_id: d.variant_id, title: d.title || d.variant_id, variant_title: null, image: d.image || "",
    }));
  }
  if (claimGift?.claimable_variants && variantDataMap) {
    return claimGift.claimable_variants.map((vid) => {
      const d = variantDataMap[vid] || {};
      return { variant_id: vid, title: d.title || vid, variant_title: null, image: d.image || "" };
    });
  }
  return [];
}

export default forwardRef(function ClaimGiftForm({ claimGift, variantDataMap, onSubmit, submitting }, ref) {
  const shopify = useAppBridge();

  const [name, setName] = useState(claimGift?.name ?? "");
  const [sectionHeading, setSectionHeading] = useState(claimGift?.section_heading ?? "");
  const [enabled, setEnabled] = useState(claimGift?.enabled ?? true);
  const [triggerType, setTriggerType] = useState(claimGift?.trigger?.type ?? "price");
  const [threshold, setThreshold] = useState(claimGift?.trigger?.threshold ?? "");
  const [claimableVariants, setClaimableVariants] = useState(claimGift?.claimable_variants ?? []);
  const [claimableDisplay, setClaimableDisplay] = useState(() => buildInitialDisplay(claimGift, variantDataMap));
  const [maxClaims, setMaxClaims] = useState(claimGift?.max_claims ?? "");
  const [claimPrice, setClaimPrice] = useState(claimGift?.claim_price ?? "0");
  const [barShow, setBarShow] = useState(claimGift?.bar?.show ?? false);
  const [barLabel, setBarLabel] = useState(claimGift?.bar?.label ?? "");
  const [barSubLabel, setBarSubLabel] = useState(claimGift?.bar?.sub_label ?? "");
  const [barLockedMessage, setBarLockedMessage] = useState(claimGift?.bar?.locked_message ?? "");
  const [audience, setAudience] = useState(claimGift?.audience ?? "all");
  const [pageHandles, setPageHandles] = useState(claimGift?.page_handles?.join(", ") ?? "/");
  const [errors, setErrors] = useState({});

  async function pickClaimableProducts() {
    const selection = await shopify.resourcePicker({ type: "product", multiple: true, action: "select" });
    if (selection) { const display = extractVariantData(selection); setClaimableVariants(display.map((v) => v.variant_id)); setClaimableDisplay(display); }
  }
  function removeClaimableVariant(vid) { setClaimableVariants(claimableVariants.filter((id) => id !== vid)); setClaimableDisplay(claimableDisplay.filter((v) => v.variant_id !== vid)); }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!sectionHeading.trim()) errs.sectionHeading = "Section heading is required";
    if (!threshold || Number(threshold) <= 0) errs.threshold = "Threshold must be a positive number";
    if (claimableVariants.length === 0) errs.variants = "Select at least one claimable product";
    const handles = pageHandles.split(",").map((h) => h.trim()).filter(Boolean);
    if (handles.length === 0) errs.pageHandles = "At least one page required";
    const frozen = handles.find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;
    if (barShow && !barLabel.trim()) errs.barLabel = "Bar label is required when bar is shown";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const handles = pageHandles.split(",").map((h) => h.trim()).filter(Boolean);
    onSubmit({
      name, section_heading: sectionHeading, enabled,
      trigger: { type: triggerType, threshold: Number(threshold) },
      claimable_variants: claimableVariants,
      claim_price: Number(claimPrice),
      max_claims: maxClaims ? Number(maxClaims) : undefined,
      bar: barShow ? { show: true, label: barLabel, sub_label: barSubLabel || undefined, locked_message: barLockedMessage || undefined } : undefined,
      audience, page_handles: handles,
    });
  }

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  return (
    <>
      {/* Basic Info */}
      <s-section heading="Basic info">
        <s-stack direction="block" gap="400">
          <s-text-field label="Name" value={name} onInput={(e) => setName(e.target.value)} error={errors.name || ""} details="Internal label, not shown to customers" />
          <s-text-field label="Section heading" value={sectionHeading} onInput={(e) => setSectionHeading(e.target.value)} error={errors.sectionHeading || ""} placeholder="Add freebies at Rs.1" details="Shown above the claim section in the cart drawer" />
          <s-checkbox label="Enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </s-stack>
      </s-section>

      {/* Trigger */}
      <s-section heading="Trigger">
        <s-grid gridTemplateColumns="1fr 1fr" gap="400">
          <s-select label="Threshold type" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
            <s-option value="price">Price</s-option>
            <s-option value="quantity">Quantity</s-option>
          </s-select>
          <s-number-field label={triggerType === "price" ? "Minimum cart total" : "Minimum items"} value={String(threshold)} onInput={(e) => setThreshold(e.target.value)} error={errors.threshold || ""} />
        </s-grid>
      </s-section>

      {/* Claimable Products */}
      <s-section heading="Claimable products">
        <s-stack direction="block" gap="400">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <s-button onClick={pickClaimableProducts}>{claimableVariants.length > 0 ? "Change products" : "Select products"}</s-button>
            {claimableVariants.length > 0 && <span style={{ fontSize: 13, color: "#6d7175" }}>{claimableVariants.length} variant(s)</span>}
          </div>
          <VariantList variants={claimableDisplay} onRemove={removeClaimableVariant} />
          <s-paragraph color="subdued">Customers can pick from these products once threshold is met. Out-of-stock products are hidden automatically.</s-paragraph>
          {errors.variants && <s-banner tone="critical">{errors.variants}</s-banner>}
          <s-grid gridTemplateColumns="1fr 1fr" gap="400">
            <s-select label="Customer pays" value={String(claimPrice)} onChange={(e) => setClaimPrice(e.target.value)}>
              <s-option value="0">Free (Rs.0)</s-option>
              <s-option value="1">Nominal (Rs.1)</s-option>
              <s-option value="9">Rs.9</s-option>
              <s-option value="49">Rs.49</s-option>
              <s-option value="99">Rs.99</s-option>
            </s-select>
            <s-number-field label="Max gifts per customer" value={String(maxClaims)} onInput={(e) => setMaxClaims(e.target.value)} placeholder={String(claimableVariants.length || 1)} details="Leave empty for all" />
          </s-grid>
        </s-stack>
      </s-section>

      {/* Progress Bar */}
      <s-section heading="Progress bar">
        <s-stack direction="block" gap="400">
          <s-checkbox label="Show on progress bar" checked={barShow} onChange={(e) => setBarShow(e.target.checked)} />
          {barShow ? (
            <>
              <s-text-field label="Bar label" value={barLabel} onInput={(e) => setBarLabel(e.target.value)} error={errors.barLabel || ""} details="Shown on the progress bar milestone" />
              <s-text-field label="Top message" value={barLockedMessage} onInput={(e) => setBarLockedMessage(e.target.value)} details="Message above the bar when this is the next milestone. Use [[ price ]] for remaining amount" />
            </>
          ) : (
            <s-banner tone="info">Bar tier is hidden on pages where this claim gift isn&apos;t displayed.</s-banner>
          )}
        </s-stack>
      </s-section>

      {/* Targeting */}
      <s-section heading="Targeting">
        <s-stack direction="block" gap="400">
          <s-select label="Who can see this claim gift?" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <s-option value="all">Everyone</s-option>
            <s-option value="signed_in">Signed-in customers</s-option>
            <s-option value="guest">Guests only</s-option>
            <s-option value="vip_tag">VIP customers</s-option>
          </s-select>
          <s-text-field label="Active on pages" value={pageHandles} onInput={(e) => setPageHandles(e.target.value)} details="Controls where the claim section appears. Claimed items persist across pages." error={errors.pageHandles || ""} />
        </s-stack>
      </s-section>
    </>
  );
});
