import { useState, forwardRef, useImperativeHandle } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { isFrozenHandle } from "../lib/constants.js";
import VariantList, { extractVariantData } from "./VariantList.jsx";

function buildVariantDisplay(ids, dataMap) {
  if (!ids || !dataMap) return [];
  return ids.map((vid) => {
    const d = dataMap[vid] || {};
    return { variant_id: vid, title: d.title || vid, variant_title: null, image: d.image || "" };
  });
}

export default forwardRef(function OfferForm({ offer, variantDataMap, onSubmit, submitting }, ref) {
  const shopify = useAppBridge();

  const [name, setName] = useState(offer?.name ?? "");
  const [enabled, setEnabled] = useState(offer?.enabled ?? true);
  const [sourceType, setSourceType] = useState(offer?.source?.type ?? "none");
  const [productVariantIds, setProductVariantIds] = useState(offer?.source?.product_variant_ids ?? []);
  const [productVariantDisplay, setProductVariantDisplay] = useState(() => buildVariantDisplay(offer?.source?.product_variant_ids, variantDataMap));
  const [collectionId, setCollectionId] = useState(offer?.source?.collection_id ?? "");
  const [triggerType, setTriggerType] = useState(
    offer?.trigger?.price_threshold ? "price" : offer?.trigger?.quantity_threshold ? "quantity" : "price"
  );
  const [triggerValue, setTriggerValue] = useState(
    offer?.trigger?.price_threshold ?? offer?.trigger?.quantity_threshold ?? ""
  );
  const [rewardType, setRewardType] = useState(offer?.reward?.type ?? "auto_add_gift");
  const [giftVariants, setGiftVariants] = useState(offer?.reward?.gift_variants ?? []);
  const [giftVariantDisplay, setGiftVariantDisplay] = useState(() => buildVariantDisplay(offer?.reward?.gift_variants, variantDataMap));
  const [quantityPerVariant, setQuantityPerVariant] = useState(offer?.reward?.quantity_per_variant ?? 1);
  const [addMode, setAddMode] = useState(offer?.reward?.add_mode ?? "auto");
  const [minOfferQuantity, setMinOfferQuantity] = useState(offer?.reward?.min_offer_quantity ?? 1);
  const [bundleVariants, setBundleVariants] = useState(offer?.reward?.bundle_variants ?? []);
  const [bundleVariantDisplay, setBundleVariantDisplay] = useState(() => buildVariantDisplay(offer?.reward?.bundle_variants, variantDataMap));
  const [discountMode, setDiscountMode] = useState(offer?.reward?.discount_mode ?? "fixed_total");
  const [volumeTiers, setVolumeTiers] = useState(offer?.reward?.tiers ?? [{ quantity: 3, value: 999 }]);
  const [barShow, setBarShow] = useState(offer?.bar?.show ?? false);
  const [barLabel, setBarLabel] = useState(offer?.bar?.label ?? "");
  const [barSubLabel, setBarSubLabel] = useState(offer?.bar?.sub_label ?? "");
  const [barTopMessage, setBarTopMessage] = useState(offer?.bar?.top_message ?? "");
  const [barRibbonMessage, setBarRibbonMessage] = useState(offer?.bar?.ribbon_message ?? "");
  const [barLockedMessage, setBarLockedMessage] = useState(offer?.bar?.locked_message ?? "");
  const [audience, setAudience] = useState(offer?.audience ?? "all");
  const [pageHandles, setPageHandles] = useState(offer?.page_handles?.join(", ") ?? "/");
  const [errors, setErrors] = useState({});

  const isProductSource = sourceType === "product";

  async function pickProducts() {
    const selection = await shopify.resourcePicker({ type: "product", multiple: true, action: "select" });
    if (selection) { const display = extractVariantData(selection); setProductVariantIds(display.map((v) => v.variant_id)); setProductVariantDisplay(display); }
  }
  async function pickCollection() {
    const selection = await shopify.resourcePicker({ type: "collection", multiple: false, action: "select" });
    if (selection?.[0]) setCollectionId(selection[0].id);
  }
  async function pickGiftVariants() {
    const selection = await shopify.resourcePicker({ type: "product", multiple: true, action: "select" });
    if (selection) { const display = extractVariantData(selection); setGiftVariants(display.map((v) => v.variant_id)); setGiftVariantDisplay(display); }
  }
  async function pickBundleVariants() {
    const selection = await shopify.resourcePicker({ type: "product", multiple: true, action: "select" });
    if (selection) { const display = extractVariantData(selection); setBundleVariants(display.map((v) => v.variant_id)); setBundleVariantDisplay(display); }
  }
  function removeSourceVariant(vid) { setProductVariantIds(productVariantIds.filter((id) => id !== vid)); setProductVariantDisplay(productVariantDisplay.filter((v) => v.variant_id !== vid)); }
  function removeGiftVariant(vid) { setGiftVariants(giftVariants.filter((id) => id !== vid)); setGiftVariantDisplay(giftVariantDisplay.filter((v) => v.variant_id !== vid)); }
  function removeBundleVariant(vid) { setBundleVariants(bundleVariants.filter((id) => id !== vid)); setBundleVariantDisplay(bundleVariantDisplay.filter((v) => v.variant_id !== vid)); }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    const handles = pageHandles.split(",").map((h) => h.trim().replace(/^["']+|["']+$/g, "")).filter(Boolean);
    if (handles.length === 0) errs.pageHandles = "At least one page required";
    const frozen = handles.find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;
    if (!isProductSource && rewardType !== "volume_discount" && !triggerValue) errs.trigger = "Threshold value is required";
    if (rewardType === "auto_add_gift" && giftVariants.length === 0) errs.reward = "Select at least one gift variant";
    if (rewardType === "bundle" && bundleVariants.length === 0) errs.reward = "Select at least one bundle variant";
    if (rewardType === "volume_discount" && volumeTiers.length === 0) errs.reward = "Add at least one volume tier";
    if (rewardType === "volume_discount" && volumeTiers.some((t) => !t.quantity || !t.value)) errs.reward = "All tiers need quantity and value";
    if (barShow && !barLabel.trim()) errs.barLabel = "Bar label is required when bar is shown";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const handles = pageHandles.split(",").map((h) => h.trim().replace(/^["']+|["']+$/g, "")).filter(Boolean);
    onSubmit({
      name, enabled,
      source: sourceType === "none" ? undefined : sourceType === "product" ? { type: "product", product_variant_ids: productVariantIds } : { type: "collection", collection_id: collectionId },
      trigger: rewardType === "volume_discount"
        ? { quantity_threshold: Math.min(...volumeTiers.map((t) => Number(t.quantity))) }
        : {
            price_threshold: triggerType === "price" && triggerValue ? Number(triggerValue) : undefined,
            quantity_threshold: triggerType === "quantity" && triggerValue ? Number(triggerValue) : undefined,
          },
      reward: rewardType === "auto_add_gift"
        ? { type: "auto_add_gift", gift_variants: giftVariants, quantity_per_variant: Number(quantityPerVariant), add_mode: addMode, min_offer_quantity: Number(minOfferQuantity) }
        : rewardType === "volume_discount"
        ? { type: "volume_discount", discount_mode: discountMode, tiers: volumeTiers.map((t) => ({ quantity: Number(t.quantity), value: Number(t.value), message: t.message || undefined })) }
        : { type: "bundle", bundle_variants: bundleVariants, min_offer_quantity: Number(minOfferQuantity) },
      bar: barShow ? { show: true, label: barLabel, sub_label: barSubLabel || undefined, top_message: barTopMessage || undefined, ribbon_message: barRibbonMessage || undefined, locked_message: barLockedMessage || undefined } : undefined,
      audience, page_handles: handles,
    });
  }

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  return (
    <>
      {/* Details */}
      <s-section heading="Offer details">
        <s-stack direction="block" gap="400">
          <s-text-field label="Offer name" value={name} onInput={(e) => setName(e.target.value)} error={errors.name || ""} />
          <s-checkbox label="Enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </s-stack>
      </s-section>

      {/* Reward — shown first so the form adapts based on reward type */}
      <s-section heading="Reward">
        <s-stack direction="block" gap="400">
          <s-select label="Reward type" value={rewardType} onChange={(e) => setRewardType(e.target.value)}>
            <s-option value="auto_add_gift">Auto-add free gift</s-option>
            <s-option value="bundle">Bundle</s-option>
            <s-option value="volume_discount">Volume discount</s-option>
          </s-select>
          {rewardType === "auto_add_gift" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s-button onClick={pickGiftVariants}>{giftVariants.length > 0 ? "Change gift products" : "Select gift products"}</s-button>
                {giftVariants.length > 0 && <span style={{ fontSize: 13, color: "#6d7175" }}>{giftVariants.length} variant(s)</span>}
              </div>
              <VariantList variants={giftVariantDisplay} onRemove={removeGiftVariant} />
              <s-grid gridTemplateColumns="1fr 1fr" gap="400">
                <s-number-field label="Quantity per variant" value={String(quantityPerVariant)} onInput={(e) => setQuantityPerVariant(e.target.value)} />
                <s-select label="Add mode" value={addMode} onChange={(e) => setAddMode(e.target.value)}>
                  <s-option value="auto">Auto add to cart</s-option>
                  <s-option value="display">Show offer card only</s-option>
                </s-select>
              </s-grid>
              <s-number-field label="Min offer quantity" value={String(minOfferQuantity)} onInput={(e) => setMinOfferQuantity(e.target.value)} />
            </>
          )}
          {rewardType === "bundle" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s-button onClick={pickBundleVariants}>{bundleVariants.length > 0 ? "Change bundle products" : "Select bundle products"}</s-button>
                {bundleVariants.length > 0 && <span style={{ fontSize: 13, color: "#6d7175" }}>{bundleVariants.length} variant(s)</span>}
              </div>
              <VariantList variants={bundleVariantDisplay} onRemove={removeBundleVariant} />
              <s-number-field label="Min offer quantity" value={String(minOfferQuantity)} onInput={(e) => setMinOfferQuantity(e.target.value)} />
            </>
          )}
          {rewardType === "volume_discount" && (
            <>
              <s-select label="Discount mode" value={discountMode} onChange={(e) => setDiscountMode(e.target.value)}>
                <s-option value="fixed_total">Fixed total (Buy 3 @ ₹999)</s-option>
                <s-option value="percentage">Percentage off (Buy 3 get 10% off)</s-option>
              </s-select>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Volume tiers</div>
                {volumeTiers.map((tier, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                    <s-number-field
                      label="Quantity"
                      value={String(tier.quantity)}
                      onInput={(e) => { const t = [...volumeTiers]; t[idx] = { ...t[idx], quantity: e.target.value }; setVolumeTiers(t); }}
                      min="1"
                      style={{ flex: 1 }}
                    />
                    <s-number-field
                      label={discountMode === "fixed_total" ? "Total price" : "% off"}
                      value={String(tier.value)}
                      onInput={(e) => { const t = [...volumeTiers]; t[idx] = { ...t[idx], value: e.target.value }; setVolumeTiers(t); }}
                      min="0"
                      style={{ flex: 1 }}
                    />
                    <s-text-field
                      label="Message (optional)"
                      value={tier.message || ""}
                      onInput={(e) => { const t = [...volumeTiers]; t[idx] = { ...t[idx], message: e.target.value }; setVolumeTiers(t); }}
                      placeholder={discountMode === "fixed_total" ? `Buy ${tier.quantity || "X"} @ ₹${tier.value || "Y"}` : `Buy ${tier.quantity || "X"} get ${tier.value || "Y"}% off`}
                      style={{ flex: 2 }}
                    />
                    {volumeTiers.length > 1 && (
                      <s-button tone="critical" variant="tertiary" onClick={() => setVolumeTiers(volumeTiers.filter((_, i) => i !== idx))}>Remove</s-button>
                    )}
                  </div>
                ))}
                <s-button onClick={() => setVolumeTiers([...volumeTiers, { quantity: "", value: "", message: "" }])}>
                  Add tier
                </s-button>
              </div>
              <s-banner tone="info">
                Tiers are evaluated highest-first. The customer always gets the best deal they qualify for. Trigger threshold is auto-set to the lowest tier.
              </s-banner>
            </>
          )}
          {errors.reward && <s-banner tone="critical">{errors.reward}</s-banner>}
        </s-stack>
      </s-section>

      {/* Source */}
      <s-section heading="Source">
        <s-stack direction="block" gap="400">
          <s-select label="What does this offer apply to?" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            <s-option value="none">Entire cart (cart total)</s-option>
            <s-option value="product">Specific products</s-option>
            <s-option value="collection">A collection</s-option>
          </s-select>
          {sourceType === "product" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s-button onClick={pickProducts}>{productVariantIds.length > 0 ? "Change products" : "Select products"}</s-button>
                {productVariantIds.length > 0 && <span style={{ fontSize: 13, color: "#6d7175" }}>{productVariantIds.length} variant(s)</span>}
              </div>
              <VariantList variants={productVariantDisplay} onRemove={removeSourceVariant} />
            </>
          )}
          {sourceType === "collection" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <s-button onClick={pickCollection}>Select collection</s-button>
              {collectionId && <s-badge tone="success">Collection selected</s-badge>}
            </div>
          )}
        </s-stack>
      </s-section>

      {/* Trigger — hidden for product source and volume discount */}
      {!isProductSource && rewardType !== "volume_discount" && (
        <s-section heading="Trigger">
          <s-stack direction="block" gap="400">
            <s-select label="Trigger type" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
              <s-option value="price">Cart total (price)</s-option>
              <s-option value="quantity">Item count (quantity)</s-option>
            </s-select>
            <s-number-field
              label={triggerType === "price" ? "Minimum cart total" : "Minimum number of items"}
              value={String(triggerValue)}
              onInput={(e) => setTriggerValue(e.target.value)}
              error={errors.trigger || ""}
              min="0"
            />
          </s-stack>
        </s-section>
      )}

      {/* Progress Bar */}
      {(!isProductSource || rewardType === "volume_discount") && (
        <s-section heading="Progress bar">
          <s-stack direction="block" gap="400">
            <s-checkbox label="Show on progress bar" checked={barShow} onChange={(e) => setBarShow(e.target.checked)} />
            {barShow && rewardType !== "volume_discount" && (
              <>
                <s-text-field label="Bar label" value={barLabel} onInput={(e) => setBarLabel(e.target.value)} error={errors.barLabel || ""} details="Shown on the progress bar milestone" />
                <s-text-field label="Top message" value={barTopMessage} onInput={(e) => setBarTopMessage(e.target.value)} details="Message above the bar. Use [[ price ]] for remaining amount" />
                <s-text-field label="Ribbon message" value={barRibbonMessage} onInput={(e) => setBarRibbonMessage(e.target.value)} details="Shown in the bottom ribbon when this is the next milestone" />
              </>
            )}
            {barShow && rewardType === "volume_discount" && (
              <s-text color="subdued">Labels and messages are auto-generated from your volume tiers (e.g. "Buy 3 @ 999")</s-text>
            )}
          </s-stack>
        </s-section>
      )}

      {/* Targeting */}
      <s-section heading="Targeting">
        <s-stack direction="block" gap="400">
          <s-select label="Who can see this offer?" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <s-option value="all">Everyone</s-option>
            <s-option value="signed_in">Signed-in customers</s-option>
            <s-option value="guest">Guests only</s-option>
            <s-option value="vip_tag">VIP customers</s-option>
          </s-select>
          <s-text-field label="Active on pages" value={pageHandles} onInput={(e) => setPageHandles(e.target.value)} error={errors.pageHandles || ""} details={'Use "/" for all pages, or comma-separated paths like "/collections/sale"'} />
          {pageHandles.includes("/") && pageHandles.split(",").filter((h) => h.trim() && h.trim() !== "/").length > 0 && (
            <s-banner tone="warning">&quot;/&quot; is a wildcard — specific handles are redundant when &quot;/&quot; is set</s-banner>
          )}
        </s-stack>
      </s-section>
    </>
  );
});
