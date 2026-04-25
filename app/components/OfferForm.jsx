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

/** Build initial display data for variant IDs from a preloaded map */
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

export default function OfferForm({
  offer,
  variantDataMap,
  onSubmit,
  submitting,
}) {
  const shopify = useAppBridge();

  const [name, setName] = useState(offer?.name ?? "");
  const [enabled, setEnabled] = useState(offer?.enabled ?? true);

  const [sourceType, setSourceType] = useState(
    offer?.source?.type ?? "none"
  );
  const [productVariantIds, setProductVariantIds] = useState(
    offer?.source?.product_variant_ids ?? []
  );
  const [productVariantDisplay, setProductVariantDisplay] = useState(
    () => buildVariantDisplay(offer?.source?.product_variant_ids, variantDataMap)
  );
  const [collectionId, setCollectionId] = useState(
    offer?.source?.collection_id ?? ""
  );

  const [priceThreshold, setPriceThreshold] = useState(
    offer?.trigger?.price_threshold ?? ""
  );
  const [quantityThreshold, setQuantityThreshold] = useState(
    offer?.trigger?.quantity_threshold ?? ""
  );

  const [rewardType, setRewardType] = useState(
    offer?.reward?.type ?? "auto_add_gift"
  );
  const [giftVariants, setGiftVariants] = useState(
    offer?.reward?.gift_variants ?? []
  );
  const [giftVariantDisplay, setGiftVariantDisplay] = useState(
    () => buildVariantDisplay(offer?.reward?.gift_variants, variantDataMap)
  );
  const [quantityPerVariant, setQuantityPerVariant] = useState(
    offer?.reward?.quantity_per_variant ?? 1
  );
  const [addMode, setAddMode] = useState(offer?.reward?.add_mode ?? "auto");
  const [minOfferQuantity, setMinOfferQuantity] = useState(
    offer?.reward?.min_offer_quantity ?? 1
  );
  const [bundleVariants, setBundleVariants] = useState(
    offer?.reward?.bundle_variants ?? []
  );
  const [bundleVariantDisplay, setBundleVariantDisplay] = useState(
    () => buildVariantDisplay(offer?.reward?.bundle_variants, variantDataMap)
  );

  const [barShow, setBarShow] = useState(offer?.bar?.show ?? false);
  const [barLabel, setBarLabel] = useState(offer?.bar?.label ?? "");
  const [barSubLabel, setBarSubLabel] = useState(offer?.bar?.sub_label ?? "");
  const [barTopMessage, setBarTopMessage] = useState(
    offer?.bar?.top_message ?? ""
  );
  const [barRibbonMessage, setBarRibbonMessage] = useState(
    offer?.bar?.ribbon_message ?? ""
  );
  const [barLockedMessage, setBarLockedMessage] = useState(
    offer?.bar?.locked_message ?? ""
  );

  const [audience, setAudience] = useState(offer?.audience ?? "all");
  const [pageHandles, setPageHandles] = useState(
    offer?.page_handles?.join(", ") ?? "/"
  );

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
      const ids = display.map((v) => v.variant_id);
      setProductVariantIds(ids);
      setProductVariantDisplay(display);
    }
  }

  async function pickCollection() {
    const selection = await shopify.resourcePicker({
      type: "collection",
      multiple: false,
      action: "select",
    });
    if (selection?.[0]) {
      setCollectionId(selection[0].id);
    }
  }

  async function pickGiftVariants() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const display = extractVariantData(selection);
      const ids = display.map((v) => v.variant_id);
      setGiftVariants(ids);
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
      const ids = display.map((v) => v.variant_id);
      setBundleVariants(ids);
      setBundleVariantDisplay(display);
    }
  }

  function removeSourceVariant(vid) {
    setProductVariantIds(productVariantIds.filter((id) => id !== vid));
    setProductVariantDisplay(productVariantDisplay.filter((v) => v.variant_id !== vid));
  }

  function removeGiftVariant(vid) {
    setGiftVariants(giftVariants.filter((id) => id !== vid));
    setGiftVariantDisplay(giftVariantDisplay.filter((v) => v.variant_id !== vid));
  }

  function removeBundleVariant(vid) {
    setBundleVariants(bundleVariants.filter((id) => id !== vid));
    setBundleVariantDisplay(bundleVariantDisplay.filter((v) => v.variant_id !== vid));
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";

    const handles = pageHandles
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (handles.length === 0) errs.pageHandles = "At least one page required";
    const frozen = handles.find(isFrozenHandle);
    if (frozen) errs.pageHandles = `"${frozen}" is a reserved page`;

    if (!isProductSource) {
      if (!priceThreshold && !quantityThreshold) {
        errs.trigger = "At least one threshold required";
      }
    }

    if (rewardType === "auto_add_gift" && giftVariants.length === 0) {
      errs.reward = "Select at least one gift variant";
    }
    if (rewardType === "bundle" && bundleVariants.length === 0) {
      errs.reward = "Select at least one bundle variant";
    }

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
      enabled,
      source:
        sourceType === "none"
          ? undefined
          : sourceType === "product"
            ? { type: "product", product_variant_ids: productVariantIds }
            : { type: "collection", collection_id: collectionId },
      trigger: {
        price_threshold: priceThreshold ? Number(priceThreshold) : undefined,
        quantity_threshold: quantityThreshold
          ? Number(quantityThreshold)
          : undefined,
      },
      reward:
        rewardType === "auto_add_gift"
          ? {
              type: "auto_add_gift",
              gift_variants: giftVariants,
              quantity_per_variant: Number(quantityPerVariant),
              add_mode: addMode,
              min_offer_quantity: Number(minOfferQuantity),
            }
          : {
              type: "bundle",
              bundle_variants: bundleVariants,
              min_offer_quantity: Number(minOfferQuantity),
            },
      bar: barShow
        ? {
            show: true,
            label: barLabel,
            sub_label: barSubLabel || undefined,
            top_message: barTopMessage || undefined,
            ribbon_message: barRibbonMessage || undefined,
            locked_message: barLockedMessage || undefined,
          }
        : undefined,
      audience,
      page_handles: handles,
    };

    onSubmit(data);
  }

  const stepDetails = (
    <>
      {/* Offer Details */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Offer details</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="Offer name" error={errors.name}>
              <input
                className={`cx-input ${errors.name ? "cx-input-error" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
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

      {/* Source */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Source</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="What does this offer apply to?">
              <select
                className="cx-input cx-select"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                <option value="none">Entire cart (cart total)</option>
                <option value="product">Specific products</option>
                <option value="collection">A collection</option>
              </select>
            </Field>

            {sourceType === "product" && (
              <>
                <div className="cx-flex cx-items-center cx-gap-md">
                  <button className="cx-btn cx-btn-secondary" onClick={pickProducts}>
                    {productVariantIds.length > 0 ? "Change products" : "Select products"}
                  </button>
                  {productVariantIds.length > 0 && (
                    <span className="cx-variant-count">
                      <span className="cx-variant-count-num">{productVariantIds.length}</span> variant(s)
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
              <div className="cx-flex cx-items-center cx-gap-md">
                <button className="cx-btn cx-btn-secondary" onClick={pickCollection}>
                  Select collection
                </button>
                {collectionId && (
                  <span className="cx-badge cx-badge-success">Collection selected</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const stepRules = (
    <>
      {/* Trigger */}
      {!isProductSource && (
        <div className="cx-card">
          <div className="cx-card-header">
            <h3 className="cx-card-title">Trigger</h3>
          </div>
          <div className="cx-card-body">
            <div className="cx-form-section">
              <div className="cx-form-row">
                <Field label="Price threshold">
                  <input
                    className="cx-input"
                    type="number"
                    value={String(priceThreshold)}
                    onChange={(e) => setPriceThreshold(e.target.value)}
                  />
                </Field>
                <Field label="Quantity threshold">
                  <input
                    className="cx-input"
                    type="number"
                    value={String(quantityThreshold)}
                    onChange={(e) => setQuantityThreshold(e.target.value)}
                  />
                </Field>
              </div>
              {priceThreshold && quantityThreshold && (
                <div className="cx-banner cx-banner-info">
                  <svg className="cx-banner-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm2 8H6v-1h1V8H6V7h3v4h1v1z"/>
                  </svg>
                  <span>OR logic — offer fires when EITHER threshold is met first</span>
                </div>
              )}
              {errors.trigger && (
                <div className="cx-banner cx-banner-danger">{errors.trigger}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reward */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Reward</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="Reward type">
              <select
                className="cx-input cx-select"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
              >
                <option value="auto_add_gift">Auto-add free gift</option>
                <option value="bundle">Bundle</option>
              </select>
            </Field>

            {rewardType === "auto_add_gift" && (
              <>
                <div className="cx-flex cx-items-center cx-gap-md">
                  <button className="cx-btn cx-btn-secondary" onClick={pickGiftVariants}>
                    {giftVariants.length > 0 ? "Change gift products" : "Select gift products"}
                  </button>
                  {giftVariants.length > 0 && (
                    <span className="cx-variant-count">
                      <span className="cx-variant-count-num">{giftVariants.length}</span> variant(s)
                    </span>
                  )}
                </div>
                <VariantList
                  variants={giftVariantDisplay}
                  onRemove={removeGiftVariant}
                />
                <div className="cx-form-row">
                  <Field label="Quantity per variant">
                    <input
                      className="cx-input"
                      type="number"
                      value={String(quantityPerVariant)}
                      onChange={(e) => setQuantityPerVariant(e.target.value)}
                    />
                  </Field>
                  <Field label="Add mode">
                    <select
                      className="cx-input cx-select"
                      value={addMode}
                      onChange={(e) => setAddMode(e.target.value)}
                    >
                      <option value="auto">Auto add to cart</option>
                      <option value="display">Show offer card only</option>
                    </select>
                  </Field>
                </div>
                <Field label="Min offer quantity">
                  <input
                    className="cx-input"
                    type="number"
                    value={String(minOfferQuantity)}
                    onChange={(e) => setMinOfferQuantity(e.target.value)}
                  />
                </Field>
              </>
            )}

            {rewardType === "bundle" && (
              <>
                <div className="cx-flex cx-items-center cx-gap-md">
                  <button className="cx-btn cx-btn-secondary" onClick={pickBundleVariants}>
                    {bundleVariants.length > 0 ? "Change bundle products" : "Select bundle products"}
                  </button>
                  {bundleVariants.length > 0 && (
                    <span className="cx-variant-count">
                      <span className="cx-variant-count-num">{bundleVariants.length}</span> variant(s)
                    </span>
                  )}
                </div>
                <VariantList
                  variants={bundleVariantDisplay}
                  onRemove={removeBundleVariant}
                />
                <Field label="Min offer quantity">
                  <input
                    className="cx-input"
                    type="number"
                    value={String(minOfferQuantity)}
                    onChange={(e) => setMinOfferQuantity(e.target.value)}
                  />
                </Field>
              </>
            )}

            {errors.reward && (
              <div className="cx-banner cx-banner-danger">{errors.reward}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const stepDisplay = (
    <>
      {/* Progress Bar */}
      {!isProductSource && (
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
                <Field label="Top message" optional>
                  <input
                    className="cx-input"
                    value={barTopMessage}
                    onChange={(e) => setBarTopMessage(e.target.value)}
                  />
                </Field>
                <div className="cx-form-row">
                  <Field label="Ribbon message" optional>
                    <input
                      className="cx-input"
                      value={barRibbonMessage}
                      onChange={(e) => setBarRibbonMessage(e.target.value)}
                    />
                  </Field>
                  <Field label="Locked message" optional>
                    <input
                      className="cx-input"
                      value={barLockedMessage}
                      onChange={(e) => setBarLockedMessage(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Targeting */}
      <div className="cx-card">
        <div className="cx-card-header">
          <h3 className="cx-card-title">Targeting</h3>
        </div>
        <div className="cx-card-body">
          <div className="cx-form-section">
            <Field label="Who can see this offer?">
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
              hint={'Use "/" for all pages, or specific paths like "/collections/sale"'}
              error={errors.pageHandles}
            >
              <input
                className={`cx-input ${errors.pageHandles ? "cx-input-error" : ""}`}
                value={pageHandles}
                onChange={(e) => setPageHandles(e.target.value)}
              />
            </Field>
            {pageHandles.includes("/") &&
              pageHandles.split(",").filter((h) => h.trim() && h.trim() !== "/")
                .length > 0 && (
                <div className="cx-banner cx-banner-warning">
                  "/" is a wildcard — specific handles are redundant when "/" is set
                </div>
              )}
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
          { label: "Rules", content: stepRules },
          { label: "Display & Targeting", content: stepDisplay },
        ]}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save offer"
      />
    </div>
  );
}
