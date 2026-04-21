import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
} from "../lib/config.server.js";
import { generateId } from "../lib/helpers.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);

  const barSources = [];
  for (const offer of config.offers) {
    if (offer.enabled && offer.bar?.show) {
      barSources.push({
        source: "Offer",
        name: offer.name,
        threshold:
          offer.trigger.price_threshold || offer.trigger.quantity_threshold,
        type: offer.trigger.price_threshold ? "price" : "quantity",
      });
    }
  }
  for (const coupon of config.coupons) {
    if (coupon.enabled && coupon.bar?.show && coupon.trigger) {
      barSources.push({
        source: "Coupon",
        name: coupon.code,
        threshold: coupon.trigger.threshold,
        type: coupon.trigger.type,
      });
    }
  }
  for (const claim of config.claim_gifts) {
    if (claim.enabled && claim.bar?.show) {
      barSources.push({
        source: "Claim Gift",
        name: claim.name,
        threshold: claim.trigger.threshold,
        type: claim.trigger.type,
      });
    }
  }

  return {
    progressBar: config.progress_bar,
    upsells: config.upsells,
    bottomRibbon: config.bottom_ribbon,
    crossPageRemoval: config.cross_page_removal_behavior,
    barSources,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  // Milestone actions (standalone)
  if (body._action === "add_milestone") {
    config.progress_bar.visual_milestones.push({
      id: generateId(),
      enabled: true,
      trigger: { type: body.trigger_type, threshold: Number(body.threshold) },
      label: body.label,
      sub_label: body.sub_label || undefined,
      icon_url: body.icon_url || undefined,
      page_handles: body.page_handles
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
      audience: body.audience,
    });
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }

  if (body._action === "delete_milestone") {
    config.progress_bar.visual_milestones =
      config.progress_bar.visual_milestones.filter((m) => m.id !== body.id);
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }

  if (body._action === "toggle_milestone") {
    const milestone = config.progress_bar.visual_milestones.find(
      (m) => m.id === body.id
    );
    if (milestone) milestone.enabled = !milestone.enabled;
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }

  // Full settings save
  config.progress_bar.enabled = body.progress_bar_enabled;
  config.progress_bar.all_complete_message = body.all_complete_message;

  if (body.upsell_product_ids?.length > 0) {
    const gids = body.upsell_product_ids.map((id) =>
      id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`
    );
    const res = await admin.graphql(
      `#graphql
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              featuredImage { url }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }`,
      { variables: { ids: gids } }
    );
    const json = await res.json();
    const products = (json.data?.nodes ?? [])
      .filter(Boolean)
      .map((node) => {
        const firstVariant = node.variants?.edges?.[0]?.node;
        return {
          product_id: node.id,
          title: node.title,
          image_url: node.featuredImage?.url ?? "",
          variant_id: firstVariant?.id ?? "",
          price: firstVariant?.price ?? "0",
          compare_at_price: firstVariant?.compareAtPrice || undefined,
        };
      });
    config.upsells.products = products;
  } else if (!body.keep_upsell_products) {
    config.upsells.products = [];
  }
  config.upsells.enabled = body.upsells_enabled;
  config.upsells.heading = body.upsells_heading;
  config.upsells.show_on_empty_cart = body.show_on_empty_cart;

  config.bottom_ribbon = body.bottom_ribbon;
  config.cross_page_removal_behavior = body.cross_page_removal_behavior;

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

function MilestoneForm({ onAdd, submitting }) {
  const [label, setLabel] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [triggerType, setTriggerType] = useState("price");
  const [threshold, setThreshold] = useState("");
  const [pageHandles, setPageHandles] = useState("/");
  const [audience, setAudience] = useState("all");

  function handleAdd() {
    if (!label.trim() || !threshold) return;
    onAdd({
      _action: "add_milestone",
      label,
      sub_label: subLabel,
      trigger_type: triggerType,
      threshold,
      page_handles: pageHandles,
      audience,
    });
    setLabel("");
    setSubLabel("");
    setThreshold("");
  }

  return (
    <s-section heading="Add milestone">
      <s-text-field
        label="Label"
        value={label}
        onInput={(e) => setLabel(e.currentTarget.value)}
        placeholder="Free Shipping"
      />
      <s-text-field
        label="Sub label (optional)"
        value={subLabel}
        onInput={(e) => setSubLabel(e.currentTarget.value)}
      />
      <s-select
        label="Trigger type"
        value={triggerType}
        onChange={(e) => setTriggerType(e.currentTarget.value)}
      >
        <s-option value="price">Price</s-option>
        <s-option value="quantity">Quantity</s-option>
      </s-select>
      <s-text-field
        label="Threshold"
        type="number"
        value={String(threshold)}
        onInput={(e) => setThreshold(e.currentTarget.value)}
      />
      <s-text-field
        label="Page handles (comma-separated)"
        value={pageHandles}
        onInput={(e) => setPageHandles(e.currentTarget.value)}
      />
      <s-select
        label="Audience"
        value={audience}
        onChange={(e) => setAudience(e.currentTarget.value)}
      >
        <s-option value="all">Everyone</s-option>
        <s-option value="signed_in">Signed-in customers</s-option>
        <s-option value="guest">Guests only</s-option>
        <s-option value="vip_tag">VIP customers</s-option>
      </s-select>
      <s-button onClick={handleAdd} {...(submitting ? { loading: true } : {})}>
        Add milestone
      </s-button>
    </s-section>
  );
}

export default function Settings() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  const [pbEnabled, setPbEnabled] = useState(data.progressBar.enabled);
  const [allCompleteMessage, setAllCompleteMessage] = useState(
    data.progressBar.all_complete_message
  );
  const [upsellsEnabled, setUpsellsEnabled] = useState(data.upsells.enabled);
  const [upsellsHeading, setUpsellsHeading] = useState(data.upsells.heading);
  const [showOnEmptyCart, setShowOnEmptyCart] = useState(
    data.upsells.show_on_empty_cart ?? false
  );
  const [upsellProducts, setUpsellProducts] = useState(data.upsells.products);
  const [newProductIds, setNewProductIds] = useState(null);
  const [ribbonEnabled, setRibbonEnabled] = useState(
    data.bottomRibbon.enabled
  );
  const [oosOverride, setOosOverride] = useState(
    data.bottomRibbon.oos_message_override ?? ""
  );
  const [crossPageBehavior, setCrossPageBehavior] = useState(
    data.crossPageRemoval
  );

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  function handleSave() {
    const payload = {
      progress_bar_enabled: pbEnabled,
      all_complete_message: allCompleteMessage,
      upsells_enabled: upsellsEnabled,
      upsells_heading: upsellsHeading,
      show_on_empty_cart: showOnEmptyCart,
      bottom_ribbon: {
        enabled: ribbonEnabled,
        oos_message_override: oosOverride || "",
      },
      cross_page_removal_behavior: crossPageBehavior,
    };
    if (newProductIds) {
      payload.upsell_product_ids = newProductIds;
    } else {
      payload.keep_upsell_products = true;
    }
    fetcher.submit(JSON.stringify(payload), {
      method: "POST",
      encType: "application/json",
    });
  }

  async function pickProducts() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (selection) {
      const ids = selection.map((p) => p.id);
      setNewProductIds(ids);
      setUpsellProducts(
        selection.map((p) => ({
          product_id: p.id,
          title: p.title,
          image_url: p.images?.[0]?.originalSrc ?? "",
          variant_id: p.variants?.[0]?.id ?? "",
          price: p.variants?.[0]?.price ?? "0",
        }))
      );
    }
  }

  function removeProduct(productId) {
    setUpsellProducts(upsellProducts.filter((p) => p.product_id !== productId));
    if (newProductIds) {
      setNewProductIds(newProductIds.filter((id) => id !== productId));
    }
  }

  function addMilestone(milestoneData) {
    fetcher.submit(JSON.stringify(milestoneData), {
      method: "POST",
      encType: "application/json",
    });
  }

  function milestoneAction(actionName, id) {
    fetcher.submit(JSON.stringify({ _action: actionName, id }), {
      method: "POST",
      encType: "application/json",
    });
  }

  async function handleDeleteMilestone(milestone) {
    const confirmed = await shopify.modal.confirm({
      title: "Delete milestone",
      message: `Are you sure you want to delete "${milestone.label}"? This action cannot be undone.`,
      primaryAction: { content: "Delete", destructive: true },
      secondaryAction: { content: "Cancel" },
    });
    if (confirmed) {
      milestoneAction("delete_milestone", milestone.id);
    }
  }

  return (
    <s-page heading="Settings">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        {...(submitting ? { loading: true } : {})}
      >
        Save
      </s-button>

      {/* ── Progress Bar ─────────────────────────────── */}
      <s-section heading="Progress Bar">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Enable progress bar"
            checked={pbEnabled}
            onChange={(e) => setPbEnabled(e.currentTarget.checked)}
          />
          <s-text-field
            label="All tiers complete message"
            value={allCompleteMessage}
            onInput={(e) => setAllCompleteMessage(e.currentTarget.value)}
            placeholder="You unlocked all rewards!"
          />
        </s-stack>
      </s-section>

      {data.barSources.length > 0 && (
        <s-section heading="Bar sources">
          <s-paragraph color="subdued">
            These promotions contribute tiers to the progress bar.
          </s-paragraph>
          <s-stack direction="block" gap="none">
            {data.barSources.map((s, i) => (
              <span key={i}>
                {i > 0 && <s-divider />}
                <s-box padding="base none">
                  <s-stack
                    direction="inline"
                    align="space-between"
                    block-align="center"
                  >
                    <s-paragraph>
                      <s-text type="strong">{s.source}</s-text> — {s.name}
                    </s-paragraph>
                    <s-badge tone="info">
                      {s.type === "price"
                        ? `Rs.${s.threshold}`
                        : `${s.threshold} items`}
                    </s-badge>
                  </s-stack>
                </s-box>
              </span>
            ))}
          </s-stack>
        </s-section>
      )}

      {data.progressBar.visual_milestones.length > 0 && (
        <s-section heading="Visual milestones">
          <s-banner tone="info">
            Milestones are bar-only markers with no reward. Use for things like
            "Free Shipping" or "VIP Status".
          </s-banner>
          <s-stack direction="block" gap="none">
            {data.progressBar.visual_milestones.map((m, i) => (
              <span key={m.id}>
                {i > 0 && <s-divider />}
                <s-box padding="base none">
                  <s-stack direction="block" gap="tight">
                    <s-stack
                      direction="inline"
                      align="space-between"
                      block-align="center"
                    >
                      <s-stack
                        direction="inline"
                        gap="tight"
                        block-align="center"
                      >
                        <s-text type="strong">{m.label}</s-text>
                        <s-badge tone={m.enabled ? "success" : "warning"}>
                          {m.enabled ? "Active" : "Inactive"}
                        </s-badge>
                      </s-stack>
                      <s-badge tone="info">
                        {m.trigger.type === "price"
                          ? `Rs.${m.trigger.threshold}`
                          : `${m.trigger.threshold} items`}
                      </s-badge>
                    </s-stack>
                    {m.sub_label && (
                      <s-paragraph color="subdued">{m.sub_label}</s-paragraph>
                    )}
                    <s-stack direction="inline" gap="tight">
                      <s-switch
                        label={m.enabled ? "Enabled" : "Disabled"}
                        checked={m.enabled}
                        onChange={() =>
                          milestoneAction("toggle_milestone", m.id)
                        }
                      />
                      <s-button
                        tone="critical"
                        onClick={() => handleDeleteMilestone(m)}
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              </span>
            ))}
          </s-stack>
        </s-section>
      )}

      <MilestoneForm onAdd={addMilestone} submitting={submitting} />

      {/* ── Upsells ──────────────────────────────────── */}
      <s-section heading="Upsells">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Enable upsells in cart drawer"
            checked={upsellsEnabled}
            onChange={(e) => setUpsellsEnabled(e.currentTarget.checked)}
          />
          <s-text-field
            label="Section heading"
            value={upsellsHeading}
            onInput={(e) => setUpsellsHeading(e.currentTarget.value)}
            placeholder="You may also like"
          />
          <s-checkbox
            label="Show upsells when cart is empty"
            checked={showOnEmptyCart}
            onChange={(e) => setShowOnEmptyCart(e.currentTarget.checked)}
          />
        </s-stack>
      </s-section>

      <s-section heading="Upsell products">
        <s-paragraph color="subdued">
          Pick products to recommend in the cart drawer. Products already in the
          cart are hidden automatically.
        </s-paragraph>

        <s-button onClick={pickProducts}>
          {upsellProducts.length > 0 ? "Change products" : "Add products"}
        </s-button>

        {upsellProducts.length > 0 && (
          <s-stack direction="block" gap="none">
            {upsellProducts.map((p, i) => (
              <span key={p.product_id}>
                {i > 0 && <s-divider />}
                <s-box padding="base none">
                  <s-stack
                    direction="inline"
                    align="space-between"
                    block-align="center"
                  >
                    <s-stack
                      direction="inline"
                      gap="tight"
                      block-align="center"
                    >
                      {p.image_url && (
                        <s-thumbnail
                          src={p.image_url}
                          alt={p.title}
                          size="small"
                        />
                      )}
                      <s-stack direction="block" gap="none">
                        <s-text type="strong">{p.title}</s-text>
                        <s-paragraph color="subdued">
                          Rs.{p.price}
                        </s-paragraph>
                      </s-stack>
                    </s-stack>
                    <s-button
                      tone="critical"
                      onClick={() => removeProduct(p.product_id)}
                    >
                      Remove
                    </s-button>
                  </s-stack>
                </s-box>
              </span>
            ))}
          </s-stack>
        )}

        {upsellProducts.length > 6 && (
          <s-banner tone="warning">
            More than 6 products may feel overwhelming. Consider keeping it
            focused.
          </s-banner>
        )}
      </s-section>

      {/* ── Bottom Ribbon ────────────────────────────── */}
      <s-section heading="Bottom Ribbon">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Enable bottom ribbon"
            checked={ribbonEnabled}
            onChange={(e) => setRibbonEnabled(e.currentTarget.checked)}
          />
          <s-text-field
            label="Out-of-stock message override"
            value={oosOverride}
            onInput={(e) => setOosOverride(e.currentTarget.value)}
            details="Leave empty to use the default OOS message"
            placeholder="This item is currently out of stock"
          />
        </s-stack>
      </s-section>

      {/* ── Behavior ─────────────────────────────────── */}
      <s-section heading="Behavior">
        <s-stack direction="block" gap="base">
          <s-select
            label="When a customer leaves a page with active offers"
            value={crossPageBehavior}
            onChange={(e) => setCrossPageBehavior(e.currentTarget.value)}
          >
            <s-option value="silent">Remove silently</s-option>
            <s-option value="notice">Show a notice</s-option>
            <s-option value="modal">Show a confirmation modal</s-option>
          </s-select>
          <s-paragraph color="subdued">
            Controls what happens to auto-added gift items when a customer
            navigates away from the page where the offer was active. Claimed
            items are never auto-removed.
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
