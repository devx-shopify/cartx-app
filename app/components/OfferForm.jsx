import { useState, forwardRef, useImperativeHandle } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { isFrozenHandle } from "../lib/constants.js";
import VariantList, { extractVariantData } from "./VariantList.jsx";
import TargetingSection from "./TargetingSection.jsx";
import VStack from "./VStack.jsx";
import PromotionAside from "./PromotionAside.jsx";

function buildVariantDisplay(ids, dataMap) {
  if (!ids || !dataMap) return [];
  return ids.map((vid) => {
    const d = dataMap[vid] || {};
    return {
      variant_id: vid,
      title: d.title || vid,
      variant_title: null,
      image: d.image || "",
    };
  });
}

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

function buildOfferSummary({
  rewardType,
  giftVariants,
  bundleVariants,
  volumeTiers,
  discountMode,
  pageHandles,
  barShow,
  triggerType,
  triggerValue,
}) {
  const rewardLabel =
    rewardType === "auto_add_gift"
      ? "Auto-add free gift"
      : rewardType === "bundle"
        ? "Bundle"
        : "Volume discount";

  // Volume tiers — sorted ascending by quantity, formatted per discount mode
  const validTiers = (volumeTiers || [])
    .filter((t) => t.quantity && t.value)
    .map((t) => ({ quantity: Number(t.quantity), value: Number(t.value) }))
    .sort((a, b) => a.quantity - b.quantity);

  const tierLines = validTiers.map((t) =>
    discountMode === "fixed_total"
      ? `Buy ${t.quantity} @ ₹${t.value}`
      : `Buy ${t.quantity} get ${t.value}% off`,
  );

  // Configured row (or Tiers row for volume_discount)
  let detailRow;
  if (rewardType === "auto_add_gift") {
    detailRow = {
      label: "Configured",
      value:
        giftVariants.length > 0
          ? `${giftVariants.length} gift product${giftVariants.length === 1 ? "" : "s"}`
          : null,
    };
  } else if (rewardType === "bundle") {
    detailRow = {
      label: "Configured",
      value:
        bundleVariants.length > 0
          ? `${bundleVariants.length} bundle product${bundleVariants.length === 1 ? "" : "s"}`
          : null,
    };
  } else {
    detailRow = {
      label: `Tiers · ${discountMode === "fixed_total" ? "Fixed total" : "% off"}`,
      value: tierLines.length > 0 ? tierLines : null,
    };
  }

  // Trigger — for volume_discount, auto-derived from lowest tier quantity
  let triggerLabel = "No trigger";
  if (rewardType === "volume_discount") {
    triggerLabel =
      validTiers.length > 0
        ? `${validTiers[0].quantity}+ items in cart`
        : "No trigger";
  } else if (triggerType === "price" && triggerValue) {
    triggerLabel = `Cart over $${triggerValue}`;
  } else if (triggerType === "quantity" && triggerValue) {
    triggerLabel = `${triggerValue}+ items in cart`;
  } else if (triggerType === "always") {
    triggerLabel = "Always active";
  }

  const pagesLabel = describePages(pageHandles);

  return [
    { label: "Reward", value: rewardLabel },
    detailRow,
    { label: "Trigger", value: triggerLabel },
    { label: "Shown on", value: pagesLabel },
    { label: "Progress bar", value: barShow ? "Enabled" : "Disabled" },
  ];
}

export default forwardRef(function OfferForm(
  { offer, variantDataMap, onSubmit, submitting },
  ref,
) {
  const shopify = useAppBridge();

  const [name, setName] = useState(offer?.name ?? "");
  const [enabled, setEnabled] = useState(offer?.enabled ?? true);
  const [sourceType, setSourceType] = useState(offer?.source?.type ?? "none");
  const [productVariantIds, setProductVariantIds] = useState(
    offer?.source?.product_variant_ids ?? [],
  );
  const [productVariantDisplay, setProductVariantDisplay] = useState(() =>
    buildVariantDisplay(offer?.source?.product_variant_ids, variantDataMap),
  );
  const [collectionId, setCollectionId] = useState(
    offer?.source?.collection_id ?? "",
  );
  const [triggerType, setTriggerType] = useState(
    offer?.trigger?.price_threshold
      ? "price"
      : offer?.trigger?.quantity_threshold
        ? "quantity"
        : "price",
  );
  const [triggerValue, setTriggerValue] = useState(
    offer?.trigger?.price_threshold ?? offer?.trigger?.quantity_threshold ?? "",
  );
  const [rewardType, setRewardType] = useState(
    offer?.reward?.type ?? "auto_add_gift",
  );
  const [giftVariants, setGiftVariants] = useState(
    offer?.reward?.gift_variants ?? [],
  );
  const [giftVariantDisplay, setGiftVariantDisplay] = useState(() =>
    buildVariantDisplay(offer?.reward?.gift_variants, variantDataMap),
  );
  const [quantityPerVariant, setQuantityPerVariant] = useState(
    offer?.reward?.quantity_per_variant ?? 1,
  );
  const [addMode, setAddMode] = useState(offer?.reward?.add_mode ?? "auto");
  const [minOfferQuantity, setMinOfferQuantity] = useState(
    offer?.reward?.min_offer_quantity ?? 1,
  );
  const [bundleVariants, setBundleVariants] = useState(
    offer?.reward?.bundle_variants ?? [],
  );
  const [bundleVariantDisplay, setBundleVariantDisplay] = useState(() =>
    buildVariantDisplay(offer?.reward?.bundle_variants, variantDataMap),
  );
  const [discountMode, setDiscountMode] = useState(
    offer?.reward?.discount_mode ?? "fixed_total",
  );
  const [volumeTiers, setVolumeTiers] = useState(
    offer?.reward?.tiers ?? [{ quantity: 3, value: 999 }],
  );
  const [discountType, setDiscountType] = useState(
    offer?.discount?.type ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    offer?.discount?.value != null ? String(offer.discount.value) : "100",
  );
  const [discountMessage, setDiscountMessage] = useState(
    offer?.discount?.message ?? "Free Gift",
  );
  const [discountMaxCap, setDiscountMaxCap] = useState(
    offer?.discount?.max_cap != null ? String(offer.discount.max_cap) : "",
  );
  const [barShow, setBarShow] = useState(offer?.bar?.show ?? false);
  const [barLabel, setBarLabel] = useState(offer?.bar?.label ?? "");
  const [barSubLabel, setBarSubLabel] = useState(offer?.bar?.sub_label ?? "");
  const [barTopMessage, setBarTopMessage] = useState(
    offer?.bar?.top_message ?? "",
  );
  const [barRibbonMessage, setBarRibbonMessage] = useState(
    offer?.bar?.ribbon_message ?? "",
  );
  const [barLockedMessage, setBarLockedMessage] = useState(
    offer?.bar?.locked_message ?? "",
  );
  const [pageHandles, setPageHandles] = useState(
    offer?.page_handles?.length ? offer.page_handles : ["/"],
  );
  const [pageTargets, setPageTargets] = useState(offer?.page_targets);
  const [errors, setErrors] = useState({});

  const isProductSource = sourceType === "product";

  async function pickProducts() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const display = extractVariantData(selection);
      setProductVariantIds(display.map((v) => v.variant_id));
      setProductVariantDisplay(display);
    }
  }
  async function pickCollection() {
    const selection = await shopify.resourcePicker({
      type: "collection",
      multiple: false,
      action: "select",
    });
    if (selection?.[0]) setCollectionId(selection[0].id);
  }
  async function pickGiftVariants() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const display = extractVariantData(selection);
      setGiftVariants(display.map((v) => v.variant_id));
      setGiftVariantDisplay(display);
    }
  }
  async function pickBundleVariants() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const display = extractVariantData(selection);
      setBundleVariants(display.map((v) => v.variant_id));
      setBundleVariantDisplay(display);
    }
  }
  function removeSourceVariant(vid) {
    setProductVariantIds(productVariantIds.filter((id) => id !== vid));
    setProductVariantDisplay(
      productVariantDisplay.filter((v) => v.variant_id !== vid),
    );
  }
  function removeGiftVariant(vid) {
    setGiftVariants(giftVariants.filter((id) => id !== vid));
    setGiftVariantDisplay(
      giftVariantDisplay.filter((v) => v.variant_id !== vid),
    );
  }
  function removeBundleVariant(vid) {
    setBundleVariants(bundleVariants.filter((id) => id !== vid));
    setBundleVariantDisplay(
      bundleVariantDisplay.filter((v) => v.variant_id !== vid),
    );
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!Array.isArray(pageHandles) || pageHandles.length === 0)
      errs.pageHandles = "Select at least one page";
    const frozen = (pageHandles || []).find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;
    if (!isProductSource && rewardType !== "volume_discount" && !triggerValue)
      errs.trigger = "Threshold value is required";
    if (rewardType === "auto_add_gift" && giftVariants.length === 0)
      errs.reward = "Select at least one gift variant";
    if (rewardType === "bundle" && bundleVariants.length === 0)
      errs.reward = "Select at least one bundle variant";
    if (rewardType === "volume_discount" && volumeTiers.length === 0)
      errs.reward = "Add at least one volume tier";
    if (
      rewardType === "volume_discount" &&
      volumeTiers.some((t) => !t.quantity || !t.value)
    )
      errs.reward = "All tiers need quantity and value";
    if (barShow && rewardType !== "volume_discount" && !barLabel.trim())
      errs.barLabel = "Bar label is required when bar is shown";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const carriesFreebie =
      rewardType === "auto_add_gift" || rewardType === "bundle";
    const lowestTier =
      rewardType === "volume_discount"
        ? [...volumeTiers].sort(
            (a, b) => Number(a.quantity) - Number(b.quantity),
          )[0]
        : null;
    onSubmit({
      name,
      enabled,
      source:
        sourceType === "none"
          ? undefined
          : sourceType === "product"
            ? { type: "product", product_variant_ids: productVariantIds }
            : { type: "collection", collection_id: collectionId },
      trigger:
        rewardType === "volume_discount"
          ? {
              quantity_threshold: Math.min(
                ...volumeTiers.map((t) => Number(t.quantity)),
              ),
            }
          : {
              price_threshold:
                triggerType === "price" && triggerValue
                  ? Number(triggerValue)
                  : undefined,
              quantity_threshold:
                triggerType === "quantity" && triggerValue
                  ? Number(triggerValue)
                  : undefined,
            },
      discount: carriesFreebie
        ? {
            type: discountType,
            value: Number(discountValue),
            message: discountMessage.trim() || "Free Gift",
            max_cap: discountMaxCap ? Number(discountMaxCap) : null,
          }
        : undefined,
      reward:
        rewardType === "auto_add_gift"
          ? {
              type: "auto_add_gift",
              gift_variants: giftVariants,
              quantity_per_variant: Number(quantityPerVariant),
              add_mode: addMode,
              min_offer_quantity: Number(minOfferQuantity),
            }
          : rewardType === "volume_discount"
            ? {
                type: "volume_discount",
                discount_mode: discountMode,
                tiers: volumeTiers.map((t) => ({
                  quantity: Number(t.quantity),
                  value: Number(t.value),
                  message: t.message || undefined,
                })),
              }
            : {
                type: "bundle",
                bundle_variants: bundleVariants,
                min_offer_quantity: Number(minOfferQuantity),
              },
      bar: barShow
        ? {
            show: true,
            label:
              rewardType === "volume_discount" && !barLabel.trim()
                ? lowestTier?.message?.trim() ||
                  (discountMode === "fixed_total"
                    ? `Buy ${lowestTier?.quantity} @ ₹${lowestTier?.value}`
                    : `Buy ${lowestTier?.quantity} get ${lowestTier?.value}% off`) ||
                  name
                : barLabel,
            sub_label: barSubLabel || undefined,
            top_message: barTopMessage || undefined,
            ribbon_message: barRibbonMessage || undefined,
            locked_message: barLockedMessage || undefined,
          }
        : undefined,
      page_handles: pageHandles,
      page_targets: pageTargets,
    });
  }

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  return (
    <>
      {/* Details */}
      <s-section heading="Offer details">
        <VStack gap={400}>
          <s-text-field
            label="Offer name"
            value={name}
            onInput={(e) => setName(e.target.value)}
            error={errors.name || ""}
          />
        </VStack>
      </s-section>

      <PromotionAside
        enabled={enabled}
        onEnabledChange={setEnabled}
        summary={buildOfferSummary({
          rewardType,
          giftVariants,
          bundleVariants,
          volumeTiers,
          discountMode,
          pageHandles,
          barShow,
          triggerType,
          triggerValue,
        })}
      />

      {/* Reward — shown first so the form adapts based on reward type */}
      <s-section heading="Reward">
        <VStack gap={400}>
          <s-select
            label="Reward type"
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value)}
          >
            <s-option value="auto_add_gift">Auto-add free gift</s-option>
            <s-option value="bundle">Bundle</s-option>
            <s-option value="volume_discount">Volume discount</s-option>
          </s-select>
          {rewardType === "auto_add_gift" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s-button onClick={pickGiftVariants}>
                  {giftVariants.length > 0
                    ? "Change gift products"
                    : "Select gift products"}
                </s-button>
                {giftVariants.length > 0 && (
                  <span style={{ fontSize: 13, color: "#6d7175" }}>
                    {giftVariants.length} variant(s)
                  </span>
                )}
              </div>
              <VariantList
                variants={giftVariantDisplay}
                onRemove={removeGiftVariant}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <s-number-field
                  label="Quantity per variant"
                  value={String(quantityPerVariant)}
                  onInput={(e) => setQuantityPerVariant(e.target.value)}
                />
                <s-select
                  label="Add mode"
                  value={addMode}
                  onChange={(e) => setAddMode(e.target.value)}
                >
                  <s-option value="auto">Auto add to cart</s-option>
                  <s-option value="display">Show offer card only</s-option>
                </s-select>
              </div>
              <s-number-field
                label="Min offer quantity"
                value={String(minOfferQuantity)}
                onInput={(e) => setMinOfferQuantity(e.target.value)}
              />
            </>
          )}
          {rewardType === "bundle" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s-button onClick={pickBundleVariants}>
                  {bundleVariants.length > 0
                    ? "Change bundle products"
                    : "Select bundle products"}
                </s-button>
                {bundleVariants.length > 0 && (
                  <span style={{ fontSize: 13, color: "#6d7175" }}>
                    {bundleVariants.length} variant(s)
                  </span>
                )}
              </div>
              <VariantList
                variants={bundleVariantDisplay}
                onRemove={removeBundleVariant}
              />
              <s-number-field
                label="Min offer quantity"
                value={String(minOfferQuantity)}
                onInput={(e) => setMinOfferQuantity(e.target.value)}
              />
            </>
          )}
          {rewardType === "volume_discount" && (
            <>
              <s-select
                label="Discount mode"
                value={discountMode}
                onChange={(e) => setDiscountMode(e.target.value)}
              >
                <s-option value="fixed_total">
                  Fixed total (Buy 3 @ ₹999)
                </s-option>
                <s-option value="percentage">
                  Percentage off (Buy 3 get 10% off)
                </s-option>
              </s-select>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Volume tiers
                </div>
                {volumeTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                      marginBottom: 8,
                    }}
                  >
                    <s-number-field
                      label="Quantity"
                      value={String(tier.quantity)}
                      onInput={(e) => {
                        const t = [...volumeTiers];
                        t[idx] = { ...t[idx], quantity: e.target.value };
                        setVolumeTiers(t);
                      }}
                      min="1"
                      style={{ flex: 1 }}
                    />
                    <s-number-field
                      label={
                        discountMode === "fixed_total" ? "Total price" : "% off"
                      }
                      value={String(tier.value)}
                      onInput={(e) => {
                        const t = [...volumeTiers];
                        t[idx] = { ...t[idx], value: e.target.value };
                        setVolumeTiers(t);
                      }}
                      min="0"
                      style={{ flex: 1 }}
                    />
                    <s-text-field
                      label="Message (optional)"
                      value={tier.message || ""}
                      onInput={(e) => {
                        const t = [...volumeTiers];
                        t[idx] = { ...t[idx], message: e.target.value };
                        setVolumeTiers(t);
                      }}
                      placeholder={
                        discountMode === "fixed_total"
                          ? `Buy ${tier.quantity || "X"} @ ₹${tier.value || "Y"}`
                          : `Buy ${tier.quantity || "X"} get ${tier.value || "Y"}% off`
                      }
                      style={{ flex: 2 }}
                    />
                    {volumeTiers.length > 1 && (
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        icon="delete"
                        accessibilityLabel={`Remove tier ${idx + 1}`}
                        onClick={() =>
                          setVolumeTiers(
                            volumeTiers.filter((_, i) => i !== idx),
                          )
                        }
                      />
                    )}
                  </div>
                ))}
                <s-button
                  onClick={() =>
                    setVolumeTiers([
                      ...volumeTiers,
                      { quantity: "", value: "", message: "" },
                    ])
                  }
                >
                  Add tier
                </s-button>
              </div>
              <s-banner tone="info">
                Tiers are evaluated highest-first. The customer always gets the
                best deal they qualify for. Trigger threshold is auto-set to the
                lowest tier.
              </s-banner>
            </>
          )}
          {errors.reward && (
            <s-banner tone="critical">{errors.reward}</s-banner>
          )}
        </VStack>
      </s-section>

      {/* Discount at checkout — only for offers that ship a gift line item */}
      {(rewardType === "auto_add_gift" || rewardType === "bundle") && (
        <s-section
          heading="Discount at checkout"
          description="Applied to the gift line item by an automatic Shopify discount. Activated automatically when this offer is saved."
        >
          <VStack gap={400}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <s-select
                label="Discount type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <s-option value="percentage">Percentage off</s-option>
                <s-option value="fixed_amount">Fixed amount off</s-option>
                <s-option value="fixed_price">
                  Fixed price (customer pays)
                </s-option>
              </s-select>
              <s-number-field
                label={
                  discountType === "percentage"
                    ? "Percentage"
                    : discountType === "fixed_amount"
                      ? "Amount off"
                      : "Customer pays"
                }
                value={String(discountValue)}
                onInput={(e) => setDiscountValue(e.target.value)}
                min="0"
              />
            </div>
            <s-text-field
              label="Discount message"
              value={discountMessage}
              onInput={(e) => setDiscountMessage(e.target.value)}
              placeholder="Free Gift"
              details="Shown next to the discounted line item at checkout"
            />
            <s-number-field
              label="Maximum discount cap"
              value={String(discountMaxCap)}
              onInput={(e) => setDiscountMaxCap(e.target.value)}
              placeholder="No limit"
              min="0"
              details="Optional. Leave empty for no cap."
            />
          </VStack>
        </s-section>
      )}

      {/* Source */}
      <s-section heading="Source">
        <VStack gap={400}>
          <s-select
            label="What does this offer apply to?"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
          >
            <s-option value="none">Entire cart (cart total)</s-option>
            <s-option value="product">Specific products</s-option>
            <s-option value="collection">A collection</s-option>
          </s-select>
          {sourceType === "product" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s-button onClick={pickProducts}>
                  {productVariantIds.length > 0
                    ? "Change products"
                    : "Select products"}
                </s-button>
                {productVariantIds.length > 0 && (
                  <span style={{ fontSize: 13, color: "#6d7175" }}>
                    {productVariantIds.length} variant(s)
                  </span>
                )}
              </div>
              <VariantList
                variants={productVariantDisplay}
                onRemove={removeSourceVariant}
              />
            </>
          )}
          {sourceType === "collection" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <s-button onClick={pickCollection}>Select collection</s-button>
              {collectionId && (
                <s-badge tone="success">Collection selected</s-badge>
              )}
            </div>
          )}
        </VStack>
      </s-section>

      {/* Trigger — hidden for product source and volume discount */}
      {!isProductSource && rewardType !== "volume_discount" && (
        <s-section heading="Trigger">
          <VStack gap={400}>
            <s-select
              label="Trigger type"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
            >
              <s-option value="price">Cart total (price)</s-option>
              <s-option value="quantity">Item count (quantity)</s-option>
            </s-select>
            <s-number-field
              label={
                triggerType === "price"
                  ? "Minimum cart total"
                  : "Minimum number of items"
              }
              value={String(triggerValue)}
              onInput={(e) => setTriggerValue(e.target.value)}
              error={errors.trigger || ""}
              min="0"
            />
          </VStack>
        </s-section>
      )}

      {/* Progress Bar */}
      {(!isProductSource || rewardType === "volume_discount") && (
        <s-section heading="Progress bar">
          <VStack gap={400}>
            <s-checkbox
              label="Show on progress bar"
              checked={barShow}
              onChange={(e) => setBarShow(e.target.checked)}
            />
            {barShow && rewardType !== "volume_discount" && (
              <>
                <s-text-field
                  label="Bar label"
                  value={barLabel}
                  onInput={(e) => setBarLabel(e.target.value)}
                  error={errors.barLabel || ""}
                  details="Shown on the progress bar milestone"
                />
                <s-text-field
                  label="Bar sub label"
                  value={barSubLabel}
                  onInput={(e) => setBarSubLabel(e.target.value)}
                  details="Optional smaller text shown below the bar label"
                />
                <s-text-field
                  label="Top message"
                  value={barTopMessage}
                  onInput={(e) => setBarTopMessage(e.target.value)}
                  details="Message above the bar. Use [[ price ]] for remaining amount"
                />
                <s-text-field
                  label="Ribbon message"
                  value={barRibbonMessage}
                  onInput={(e) => setBarRibbonMessage(e.target.value)}
                  details="Shown in the bottom ribbon when this is the next milestone"
                />
              </>
            )}
            {barShow && rewardType === "volume_discount" && (
              <s-text color="subdued">
                Labels and messages are auto-generated from your volume tiers
                (e.g. "Buy 3 @ 999")
              </s-text>
            )}
          </VStack>
        </s-section>
      )}

      {/* Targeting */}
      <TargetingSection
        pageHandles={pageHandles}
        pageTargets={pageTargets}
        onChange={({ page_handles, page_targets }) => {
          setPageHandles(page_handles);
          setPageTargets(page_targets);
        }}
      />
      {errors.pageHandles && (
        <s-banner tone="critical">{errors.pageHandles}</s-banner>
      )}
    </>
  );
});
