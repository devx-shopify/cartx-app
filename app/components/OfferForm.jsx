import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { FROZEN_PAGES, FROZEN_PAGE_PREFIXES } from "../lib/constants.js";

function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true;
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p));
}

export default function OfferForm({ offer, onSubmit, submitting }) {
  const shopify = useAppBridge();

  const [name, setName] = useState(offer?.name ?? "");
  const [enabled, setEnabled] = useState(offer?.enabled ?? true);

  const [sourceType, setSourceType] = useState(
    offer?.source?.type ?? "none"
  );
  const [productVariantIds, setProductVariantIds] = useState(
    offer?.source?.product_variant_ids ?? []
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
      const ids = selection.flatMap((p) => p.variants.map((v) => v.id));
      setProductVariantIds(ids);
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
      const ids = selection.flatMap((p) => p.variants.map((v) => v.id));
      setGiftVariants(ids);
    }
  }

  async function pickBundleVariants() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const ids = selection.flatMap((p) => p.variants.map((v) => v.id));
      setBundleVariants(ids);
    }
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

  return (
    <s-stack direction="block" gap="loose">
      <s-section heading="Offer details">
        <s-text-field
          label="Offer name"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          {...(errors.name ? { error: errors.name } : {})}
        />
        <s-checkbox
          label="Enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
      </s-section>

      <s-section heading="Source">
        <s-select
          label="What does this offer apply to?"
          value={sourceType}
          onChange={(e) => setSourceType(e.currentTarget.value)}
        >
          <s-option value="none">Entire cart (cart total)</s-option>
          <s-option value="product">Specific products</s-option>
          <s-option value="collection">A collection</s-option>
        </s-select>

        {sourceType === "product" && (
          <s-stack direction="block" gap="tight">
            <s-button onClick={pickProducts}>Select products</s-button>
            {productVariantIds.length > 0 && (
              <s-paragraph>
                {productVariantIds.length} variant(s) selected
              </s-paragraph>
            )}
          </s-stack>
        )}

        {sourceType === "collection" && (
          <s-stack direction="block" gap="tight">
            <s-button onClick={pickCollection}>Select collection</s-button>
            {collectionId && (
              <s-paragraph>Collection selected</s-paragraph>
            )}
          </s-stack>
        )}
      </s-section>

      {!isProductSource && (
        <s-section heading="Trigger">
          <s-text-field
            label="Price threshold"
            type="number"
            value={String(priceThreshold)}
            onInput={(e) => setPriceThreshold(e.currentTarget.value)}
          />
          <s-text-field
            label="Quantity threshold"
            type="number"
            value={String(quantityThreshold)}
            onInput={(e) => setQuantityThreshold(e.currentTarget.value)}
          />
          {priceThreshold && quantityThreshold && (
            <s-banner tone="info">
              OR logic — offer fires when EITHER threshold is met first
            </s-banner>
          )}
          {errors.trigger && (
            <s-banner tone="critical">{errors.trigger}</s-banner>
          )}
        </s-section>
      )}

      <s-section heading="Reward">
        <s-select
          label="Reward type"
          value={rewardType}
          onChange={(e) => setRewardType(e.currentTarget.value)}
        >
          <s-option value="auto_add_gift">Auto-add free gift</s-option>
          <s-option value="bundle">Bundle</s-option>
        </s-select>

        {rewardType === "auto_add_gift" && (
          <s-stack direction="block" gap="tight">
            <s-button onClick={pickGiftVariants}>
              Select gift products
            </s-button>
            {giftVariants.length > 0 && (
              <s-paragraph>
                {giftVariants.length} gift variant(s) selected
              </s-paragraph>
            )}
            <s-text-field
              label="Quantity per variant"
              type="number"
              value={String(quantityPerVariant)}
              onInput={(e) => setQuantityPerVariant(e.currentTarget.value)}
            />
            <s-select
              label="Add mode"
              value={addMode}
              onChange={(e) => setAddMode(e.currentTarget.value)}
            >
              <s-option value="auto">Auto add to cart</s-option>
              <s-option value="display">Show offer card only</s-option>
            </s-select>
            <s-text-field
              label="Min offer quantity"
              type="number"
              value={String(minOfferQuantity)}
              onInput={(e) => setMinOfferQuantity(e.currentTarget.value)}
            />
          </s-stack>
        )}

        {rewardType === "bundle" && (
          <s-stack direction="block" gap="tight">
            <s-button onClick={pickBundleVariants}>
              Select bundle products
            </s-button>
            {bundleVariants.length > 0 && (
              <s-paragraph>
                {bundleVariants.length} bundle variant(s) selected
              </s-paragraph>
            )}
            <s-text-field
              label="Min offer quantity"
              type="number"
              value={String(minOfferQuantity)}
              onInput={(e) => setMinOfferQuantity(e.currentTarget.value)}
            />
          </s-stack>
        )}

        {errors.reward && (
          <s-banner tone="critical">{errors.reward}</s-banner>
        )}
      </s-section>

      {!isProductSource && (
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
                label="Top message"
                value={barTopMessage}
                onInput={(e) => setBarTopMessage(e.currentTarget.value)}
              />
              <s-text-field
                label="Ribbon message"
                value={barRibbonMessage}
                onInput={(e) => setBarRibbonMessage(e.currentTarget.value)}
              />
              <s-text-field
                label="Locked message"
                value={barLockedMessage}
                onInput={(e) => setBarLockedMessage(e.currentTarget.value)}
              />
            </s-stack>
          )}
        </s-section>
      )}

      <s-section heading="Audience">
        <s-select
          label="Who can see this offer?"
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
          Use "/" for all pages, or specific paths like "/collections/sale"
        </s-paragraph>
        {pageHandles.includes("/") &&
          pageHandles.split(",").filter((h) => h.trim() && h.trim() !== "/")
            .length > 0 && (
            <s-banner tone="warning">
              "/" is a wildcard — specific handles are redundant when "/" is set
            </s-banner>
          )}
      </s-section>

      <s-button
        variant="primary"
        onClick={handleSubmit}
        {...(submitting ? { loading: true } : {})}
      >
        Save offer
      </s-button>
    </s-stack>
  );
}
