import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";

function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true;
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p));
}

export default function ClaimGiftForm({ claimGift, onSubmit, submitting }) {
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
      const ids = selection.flatMap((p) => p.variants.map((v) => v.id));
      setClaimableVariants(ids);
    }
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

  return (
    <s-stack direction="block" gap="loose">
      <s-section heading="Basic info">
        <s-text-field
          label="Name"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          details="Internal label, not shown to customers"
          {...(errors.name ? { error: errors.name } : {})}
        />
        <s-text-field
          label="Section heading"
          value={sectionHeading}
          onInput={(e) => setSectionHeading(e.currentTarget.value)}
          placeholder="Add freebies at Rs.1"
          details="Shown above the claim section in the cart drawer"
          {...(errors.sectionHeading ? { error: errors.sectionHeading } : {})}
        />
        <s-checkbox
          label="Enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
      </s-section>

      <s-section heading="Trigger">
        <s-select
          label="Threshold type"
          value={triggerType}
          onChange={(e) => setTriggerType(e.currentTarget.value)}
        >
          <s-option value="price">Price</s-option>
          <s-option value="quantity">Quantity</s-option>
        </s-select>

        {triggerType === "price" && (
          <s-text-field
            label="Minimum cart total"
            type="number"
            value={String(threshold)}
            onInput={(e) => setThreshold(e.currentTarget.value)}
            {...(errors.threshold ? { error: errors.threshold } : {})}
          />
        )}

        {triggerType === "quantity" && (
          <s-text-field
            label="Minimum items"
            type="number"
            value={String(threshold)}
            onInput={(e) => setThreshold(e.currentTarget.value)}
            {...(errors.threshold ? { error: errors.threshold } : {})}
          />
        )}
      </s-section>

      <s-section heading="Claimable products">
        <s-button onClick={pickClaimableProducts}>Select products</s-button>
        {claimableVariants.length > 0 && (
          <s-paragraph>
            {claimableVariants.length} variant(s) selected
          </s-paragraph>
        )}
        <s-paragraph>
          Customers can pick from these products once threshold is met.
          Out-of-stock products are hidden automatically.
        </s-paragraph>
        {errors.variants && (
          <s-banner tone="critical">{errors.variants}</s-banner>
        )}
        <s-text-field
          label="Max gifts a customer can claim"
          type="number"
          value={String(maxClaims)}
          onInput={(e) => setMaxClaims(e.currentTarget.value)}
          details="Leave empty to allow claiming all products"
          placeholder={String(claimableVariants.length || 1)}
        />
      </s-section>

      <s-section heading="Progress Bar">
        <s-checkbox
          label="Show on progress bar"
          checked={barShow}
          onChange={(e) => setBarShow(e.currentTarget.checked)}
        />
        {barShow && (
          <s-stack direction="block" gap="tight">
            <s-text-field
              label="Bar label"
              value={barLabel}
              onInput={(e) => setBarLabel(e.currentTarget.value)}
              {...(errors.barLabel ? { error: errors.barLabel } : {})}
            />
            <s-text-field
              label="Sub label (optional)"
              value={barSubLabel}
              onInput={(e) => setBarSubLabel(e.currentTarget.value)}
            />
            <s-text-field
              label="Locked message"
              value={barLockedMessage}
              onInput={(e) => setBarLockedMessage(e.currentTarget.value)}
            />
            <s-text-field
              label="Unlocked message"
              value={barUnlockedMessage}
              onInput={(e) => setBarUnlockedMessage(e.currentTarget.value)}
            />
          </s-stack>
        )}
        <s-banner tone="info">
          Bar tier is hidden on pages where this claim gift isn't displayed.
        </s-banner>
      </s-section>

      <s-section heading="Audience">
        <s-select
          label="Who can see this claim gift?"
          value={audience}
          onChange={(e) => setAudience(e.currentTarget.value)}
        >
          <s-option value="all">Everyone</s-option>
          <s-option value="signed_in">Signed-in customers</s-option>
          <s-option value="guest">Guests only</s-option>
          <s-option value="vip_tag">VIP customers</s-option>
        </s-select>
      </s-section>

      <s-section heading="Active on pages">
        <s-text-field
          label="Page handles (comma-separated)"
          value={pageHandles}
          onInput={(e) => setPageHandles(e.currentTarget.value)}
          {...(errors.pageHandles ? { error: errors.pageHandles } : {})}
        />
        <s-paragraph>
          Controls where the claim section appears. Claimed items persist across pages.
        </s-paragraph>
      </s-section>

      <s-button
        variant="primary"
        onClick={handleSubmit}
        {...(submitting ? { loading: true } : {})}
      >
        Save claim gift
      </s-button>
    </s-stack>
  );
}
