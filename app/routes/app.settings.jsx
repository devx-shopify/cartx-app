import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { generateId } from "../lib/helpers.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
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
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

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

function Toggle({ checked, onChange, label }) {
  return (
    <label className="cx-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="cx-toggle-track" />
      {label && <span className="cx-toggle-label">{label}</span>}
    </label>
  );
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
    <div className="cx-card">
      <div className="cx-card-header">
        <h3 className="cx-card-title">Add milestone</h3>
      </div>
      <div className="cx-card-body">
        <div className="cx-form-section">
          <div className="cx-form-row">
            <Field label="Label">
              <input
                className="cx-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Free Shipping"
              />
            </Field>
            <Field label="Sub label" optional>
              <input
                className="cx-input"
                value={subLabel}
                onChange={(e) => setSubLabel(e.target.value)}
              />
            </Field>
          </div>
          <div className="cx-form-row">
            <Field label="Trigger type">
              <select
                className="cx-input cx-select"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                <option value="price">Price</option>
                <option value="quantity">Quantity</option>
              </select>
            </Field>
            <Field label="Threshold">
              <input
                className="cx-input"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </Field>
          </div>
          <div className="cx-form-row">
            <Field label="Page handles" hint="Comma-separated">
              <input
                className="cx-input"
                value={pageHandles}
                onChange={(e) => setPageHandles(e.target.value)}
              />
            </Field>
            <Field label="Audience">
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
          </div>
          <div>
            <button
              className="cx-btn cx-btn-secondary"
              onClick={handleAdd}
              disabled={submitting}
            >
              Add milestone
            </button>
          </div>
        </div>
      </div>
    </div>
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

      <div className="cx-layout">
        {/* Progress Bar */}
        <div className="cx-card">
          <div className="cx-card-header">
            <h3 className="cx-card-title">Progress Bar</h3>
            <Toggle
              checked={pbEnabled}
              onChange={(e) => setPbEnabled(e.target.checked)}
            />
          </div>
          <div className="cx-card-body">
            <div className="cx-form-section">
              <Field label="All tiers complete message">
                <input
                  className="cx-input"
                  value={allCompleteMessage}
                  onChange={(e) => setAllCompleteMessage(e.target.value)}
                  placeholder="You unlocked all rewards!"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Bar Sources */}
        {data.barSources.length > 0 && (
          <div className="cx-card">
            <div className="cx-card-header">
              <div>
                <h3 className="cx-card-title">Bar sources</h3>
                <p className="cx-card-subtitle">
                  Promotions contributing tiers to the progress bar
                </p>
              </div>
            </div>
            {data.barSources.map((s, i) => (
              <div className="cx-list-item" key={i}>
                <div className="cx-list-item-info">
                  <div className="cx-flex cx-items-center cx-gap-sm">
                    <span className="cx-badge cx-badge-default">{s.source}</span>
                    <span className="cx-list-item-title">{s.name}</span>
                  </div>
                </div>
                <span className="cx-badge cx-badge-info">
                  {s.type === "price"
                    ? `Rs.${s.threshold}`
                    : `${s.threshold} items`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Visual Milestones */}
        {data.progressBar.visual_milestones.length > 0 && (
          <div className="cx-card">
            <div className="cx-card-header">
              <div>
                <h3 className="cx-card-title">Visual milestones</h3>
                <p className="cx-card-subtitle">
                  Bar-only markers with no reward (e.g., "Free Shipping")
                </p>
              </div>
            </div>
            {data.progressBar.visual_milestones.map((m) => (
              <div className="cx-list-item" key={m.id}>
                <div className="cx-list-item-info">
                  <div className="cx-flex cx-items-center cx-gap-sm">
                    <span className="cx-list-item-title">{m.label}</span>
                    <span className={`cx-badge cx-badge-dot ${m.enabled ? "cx-badge-success" : "cx-badge-warning"}`}>
                      {m.enabled ? "Active" : "Inactive"}
                    </span>
                    <span className="cx-badge cx-badge-info">
                      {m.trigger.type === "price"
                        ? `Rs.${m.trigger.threshold}`
                        : `${m.trigger.threshold} items`}
                    </span>
                  </div>
                  {m.sub_label && (
                    <span className="cx-list-item-desc">{m.sub_label}</span>
                  )}
                </div>
                <div className="cx-list-item-actions">
                  <Toggle
                    checked={m.enabled}
                    onChange={() => milestoneAction("toggle_milestone", m.id)}
                  />
                  <button
                    className="cx-btn cx-btn-danger cx-btn-sm"
                    onClick={() => handleDeleteMilestone(m)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <MilestoneForm onAdd={addMilestone} submitting={submitting} />

        {/* Upsells */}
        <div className="cx-card">
          <div className="cx-card-header">
            <h3 className="cx-card-title">Upsells</h3>
            <Toggle
              checked={upsellsEnabled}
              onChange={(e) => setUpsellsEnabled(e.target.checked)}
            />
          </div>
          <div className="cx-card-body">
            <div className="cx-form-section">
              <Field label="Section heading">
                <input
                  className="cx-input"
                  value={upsellsHeading}
                  onChange={(e) => setUpsellsHeading(e.target.value)}
                  placeholder="You may also like"
                />
              </Field>
              <label className="cx-checkbox">
                <input
                  type="checkbox"
                  checked={showOnEmptyCart}
                  onChange={(e) => setShowOnEmptyCart(e.target.checked)}
                />
                Show upsells when cart is empty
              </label>
            </div>
          </div>
        </div>

        {/* Upsell Products */}
        <div className="cx-card">
          <div className="cx-card-header">
            <div>
              <h3 className="cx-card-title">Upsell products</h3>
              <p className="cx-card-subtitle">
                Products already in the cart are hidden automatically
              </p>
            </div>
            <button className="cx-btn cx-btn-secondary" onClick={pickProducts}>
              {upsellProducts.length > 0 ? "Change products" : "Add products"}
            </button>
          </div>
          {upsellProducts.length > 0 ? (
            <div className="cx-card-body">
              {upsellProducts.map((p) => (
                <div className="cx-product-row" key={p.product_id}>
                  {p.image_url ? (
                    <img className="cx-product-img" src={p.image_url} alt={p.title} />
                  ) : (
                    <div className="cx-product-img" />
                  )}
                  <div className="cx-product-info">
                    <div className="cx-product-title">{p.title}</div>
                    <div className="cx-product-price">Rs.{p.price}</div>
                  </div>
                  <button
                    className="cx-btn cx-btn-ghost cx-btn-sm"
                    onClick={() => removeProduct(p.product_id)}
                    title="Remove"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {upsellProducts.length > 6 && (
                <div className="cx-banner cx-banner-warning" style={{ marginTop: 12 }}>
                  More than 6 products may feel overwhelming. Consider keeping it focused.
                </div>
              )}
            </div>
          ) : (
            <div className="cx-empty" style={{ padding: '32px 20px' }}>
              <p className="cx-empty-desc">
                No upsell products selected. Pick products to recommend in the cart drawer.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Ribbon */}
        <div className="cx-card">
          <div className="cx-card-header">
            <h3 className="cx-card-title">Bottom Ribbon</h3>
            <Toggle
              checked={ribbonEnabled}
              onChange={(e) => setRibbonEnabled(e.target.checked)}
            />
          </div>
          <div className="cx-card-body">
            <div className="cx-form-section">
              <Field
                label="Out-of-stock message override"
                hint="Leave empty to use the default OOS message"
              >
                <input
                  className="cx-input"
                  value={oosOverride}
                  onChange={(e) => setOosOverride(e.target.value)}
                  placeholder="This item is currently out of stock"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="cx-card">
          <div className="cx-card-header">
            <h3 className="cx-card-title">Behavior</h3>
          </div>
          <div className="cx-card-body">
            <div className="cx-form-section">
              <Field label="When a customer leaves a page with active offers">
                <select
                  className="cx-input cx-select"
                  value={crossPageBehavior}
                  onChange={(e) => setCrossPageBehavior(e.target.value)}
                >
                  <option value="silent">Remove silently</option>
                  <option value="notice">Show a notice</option>
                  <option value="modal">Show a confirmation modal</option>
                </select>
              </Field>
              <p className="cx-text-sm cx-text-secondary" style={{ margin: 0 }}>
                Controls what happens to auto-added gift items when a customer
                navigates away from the page where the offer was active. Claimed
                items are never auto-removed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
