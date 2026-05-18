import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import useConfirm from "../components/useConfirm.jsx";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { generateId } from "../lib/helpers.server.js";
import { markStep } from "../lib/onboarding.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const barSources = [];
  for (const offer of config.offers) {
    if (offer.enabled && offer.bar?.show) {
      barSources.push({ source: "Offer", name: offer.name, threshold: offer.trigger.price_threshold || offer.trigger.quantity_threshold, type: offer.trigger.price_threshold ? "price" : "quantity" });
    }
  }
  for (const coupon of config.coupons) {
    if (coupon.enabled && coupon.bar?.show && coupon.trigger) {
      barSources.push({ source: "Coupon", name: coupon.code, threshold: coupon.trigger.threshold, type: coupon.trigger.type });
    }
  }
  for (const claim of config.claim_gifts) {
    if (claim.enabled && claim.bar?.show) {
      barSources.push({ source: "Claim Gift", name: claim.name, threshold: claim.trigger.threshold, type: claim.trigger.type });
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
      page_handles: body.page_handles.split(",").map((h) => h.trim()).filter(Boolean),
      audience: body.audience,
    });
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }
  if (body._action === "delete_milestone") {
    config.progress_bar.visual_milestones = config.progress_bar.visual_milestones.filter((m) => m.id !== body.id);
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }
  if (body._action === "toggle_milestone") {
    const milestone = config.progress_bar.visual_milestones.find((m) => m.id === body.id);
    if (milestone) milestone.enabled = !milestone.enabled;
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }

  config.progress_bar.enabled = body.progress_bar_enabled;
  config.progress_bar.all_complete_message = body.all_complete_message;

  if (body.upsell_product_ids?.length > 0) {
    const gids = body.upsell_product_ids.map((id) => id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`);
    const res = await admin.graphql(
      `#graphql
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              featuredImage { url }
              variants(first: 1) { edges { node { id price compareAtPrice } } }
            }
          }
        }`,
      { variables: { ids: gids } }
    );
    const json = await res.json();
    config.upsells.products = (json.data?.nodes ?? []).filter(Boolean).map((node) => {
      const firstVariant = node.variants?.edges?.[0]?.node;
      return { product_id: node.id, title: node.title, image_url: node.featuredImage?.url ?? "", variant_id: firstVariant?.id ?? "", price: firstVariant?.price ?? "0", compare_at_price: firstVariant?.compareAtPrice || undefined };
    });
  } else if (!body.keep_upsell_products) {
    config.upsells.products = [];
  }
  config.upsells.enabled = body.upsells_enabled;
  config.upsells.heading = body.upsells_heading;
  config.upsells.show_on_empty_cart = body.show_on_empty_cart;
  config.bottom_ribbon = body.bottom_ribbon;
  config.cross_page_removal_behavior = body.cross_page_removal_behavior;

  await saveConfig(shopId, themeId, config);

  // Mark onboarding step
  await markStep(session.shop, "settings_configured");

  return { ok: true };
};

function MilestoneForm({ onAdd, submitting }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [triggerType, setTriggerType] = useState("price");
  const [threshold, setThreshold] = useState("");
  const [pageHandles, setPageHandles] = useState("/");
  const [audience, setAudience] = useState("all");

  function handleAdd() {
    if (!label.trim() || !threshold) return;
    onAdd({ _action: "add_milestone", label, sub_label: subLabel, trigger_type: triggerType, threshold, page_handles: pageHandles, audience });
    setLabel(""); setSubLabel(""); setThreshold(""); setOpen(false);
  }

  if (!open) {
    return (
      <s-button variant="tertiary" onClick={() => setOpen(true)}>+ Add visual milestone</s-button>
    );
  }

  return (
    <div style={{ padding: "16px 0 0" }}>
      <s-stack direction="block" gap="400">
        <s-grid gridTemplateColumns="1fr 1fr" gap="400">
          <s-text-field label="Label" value={label} onInput={(e) => setLabel(e.target.value)} placeholder="Free Shipping" />
          <s-text-field label="Sub label" value={subLabel} onInput={(e) => setSubLabel(e.target.value)} />
        </s-grid>
        <s-grid gridTemplateColumns="1fr 1fr" gap="400">
          <s-select label="Trigger type" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
            <s-option value="price">Price</s-option>
            <s-option value="quantity">Quantity</s-option>
          </s-select>
          <s-number-field label="Threshold" value={String(threshold)} onInput={(e) => setThreshold(e.target.value)} />
        </s-grid>
        <s-grid gridTemplateColumns="1fr 1fr" gap="400">
          <s-text-field label="Page handles" value={pageHandles} onInput={(e) => setPageHandles(e.target.value)} details="Comma-separated" />
          <s-select label="Audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <s-option value="all">Everyone</s-option>
            <s-option value="signed_in">Signed-in customers</s-option>
            <s-option value="guest">Guests only</s-option>
            <s-option value="vip_tag">VIP customers</s-option>
          </s-select>
        </s-grid>
        <s-stack direction="inline" gap="200">
          <s-button onClick={handleAdd} {...(submitting ? { disabled: true } : {})}>Add milestone</s-button>
          <s-button variant="tertiary" onClick={() => setOpen(false)}>Cancel</s-button>
        </s-stack>
      </s-stack>
    </div>
  );
}

export default function Settings() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";
  const [confirmFn, confirmModal] = useConfirm();

  const [pbEnabled, setPbEnabled] = useState(data.progressBar.enabled);
  const [allCompleteMessage, setAllCompleteMessage] = useState(data.progressBar.all_complete_message);
  const [upsellsEnabled, setUpsellsEnabled] = useState(data.upsells.enabled);
  const [upsellsHeading, setUpsellsHeading] = useState(data.upsells.heading);
  const [showOnEmptyCart, setShowOnEmptyCart] = useState(data.upsells.show_on_empty_cart ?? false);
  const [upsellProducts, setUpsellProducts] = useState(data.upsells.products);
  const [newProductIds, setNewProductIds] = useState(null);
  const [ribbonEnabled, setRibbonEnabled] = useState(data.bottomRibbon.enabled);
  const [oosOverride, setOosOverride] = useState(data.bottomRibbon.oos_message_override ?? "");
  const [crossPageBehavior, setCrossPageBehavior] = useState(data.crossPageRemoval);

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Settings saved");
  }, [fetcher.data, shopify]);

  function handleSave() {
    const payload = {
      progress_bar_enabled: pbEnabled,
      all_complete_message: allCompleteMessage,
      upsells_enabled: upsellsEnabled,
      upsells_heading: upsellsHeading,
      show_on_empty_cart: showOnEmptyCart,
      bottom_ribbon: { enabled: ribbonEnabled, oos_message_override: oosOverride || "" },
      cross_page_removal_behavior: crossPageBehavior,
    };
    if (newProductIds) payload.upsell_product_ids = newProductIds;
    else payload.keep_upsell_products = true;
    fetcher.submit(JSON.stringify(payload), { method: "POST", encType: "application/json" });
  }

  async function pickProducts() {
    const selection = await shopify.resourcePicker({ type: "product", multiple: true, action: "select" });
    if (selection) {
      setNewProductIds(selection.map((p) => p.id));
      setUpsellProducts(selection.map((p) => ({ product_id: p.id, title: p.title, image_url: p.images?.[0]?.originalSrc ?? "", variant_id: p.variants?.[0]?.id ?? "", price: p.variants?.[0]?.price ?? "0" })));
    }
  }

  function removeProduct(productId) {
    setUpsellProducts(upsellProducts.filter((p) => p.product_id !== productId));
    if (newProductIds) setNewProductIds(newProductIds.filter((id) => id !== productId));
  }

  function addMilestone(milestoneData) {
    fetcher.submit(JSON.stringify(milestoneData), { method: "POST", encType: "application/json" });
  }

  function milestoneAction(actionName, id) {
    fetcher.submit(JSON.stringify({ _action: actionName, id }), { method: "POST", encType: "application/json" });
  }

  async function handleDeleteMilestone(milestone) {
    const yes = await confirmFn({ title: "Delete milestone", message: `Are you sure you want to delete "${milestone.label}"? This action cannot be undone.`, confirmLabel: "Delete", destructive: true });
    if (!yes) return;
    milestoneAction("delete_milestone", milestone.id);
  }

  const milestones = data.progressBar.visual_milestones;
  const barSources = data.barSources;

  return (
    <s-page heading="Settings">
      <s-button slot="primary-action" variant="primary" onClick={handleSave} {...(submitting ? { loading: true } : {})}>
        Save
      </s-button>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <s-stack direction="block" gap="base">

          {/* ── Progress Bar ─────────────────────────────── */}
          <s-section padding="none">
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <s-text fontWeight="bold">Progress Bar</s-text>
                <s-switch label="Progress Bar" labelAccessibilityVisibility="hidden" checked={pbEnabled} onChange={(e) => setPbEnabled(e.target.checked)} />
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <s-stack direction="block" gap="400">
                <s-text-field label="All tiers complete message" value={allCompleteMessage} onInput={(e) => setAllCompleteMessage(e.target.value)} placeholder="You unlocked all rewards!" />

                {/* Bar sources */}
                {barSources.length > 0 && (
                  <s-stack direction="block" gap="200">
                    <s-text fontWeight="semibold" variant="bodySm">Bar sources</s-text>
                    <s-text color="subdued" variant="bodyXs">Promotions contributing tiers to the bar</s-text>
                    {barSources.map((s, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 0",
                        borderTop: i === 0 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                        borderBottom: "1px solid var(--s-color-border, #e3e3e3)",
                      }}>
                        <s-stack direction="inline" gap="200" alignItems="center">
                          <s-badge>{s.source}</s-badge>
                          <s-text fontWeight="medium">{s.name}</s-text>
                        </s-stack>
                        <s-badge tone="info">{s.type === "price" ? `${s.threshold} (price)` : `${s.threshold} items`}</s-badge>
                      </div>
                    ))}
                  </s-stack>
                )}

                {/* Visual milestones */}
                {milestones.length > 0 && (
                  <s-stack direction="block" gap="200">
                    <s-text fontWeight="semibold" variant="bodySm">Visual milestones</s-text>
                    {milestones.map((m, i) => (
                      <div key={m.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 0",
                        borderTop: i === 0 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                        borderBottom: "1px solid var(--s-color-border, #e3e3e3)",
                      }}>
                        <s-stack direction="block" gap="extra-small">
                          <s-stack direction="inline" gap="200" alignItems="center">
                            <s-text fontWeight="medium">{m.label}</s-text>
                            <s-badge tone={m.enabled ? "success" : "warning"}>{m.enabled ? "Active" : "Off"}</s-badge>
                            <s-badge tone="info">{m.trigger.type === "price" ? `${m.trigger.threshold} (price)` : `${m.trigger.threshold} items`}</s-badge>
                          </s-stack>
                          {m.sub_label && <s-text color="subdued" variant="bodyXs">{m.sub_label}</s-text>}
                        </s-stack>
                        <s-stack direction="inline" gap="200" alignItems="center">
                          <s-switch label="Toggle" labelAccessibilityVisibility="hidden" checked={m.enabled} onChange={() => milestoneAction("toggle_milestone", m.id)} />
                          <s-button variant="tertiary" tone="critical" onClick={() => handleDeleteMilestone(m)}>Delete</s-button>
                        </s-stack>
                      </div>
                    ))}
                  </s-stack>
                )}

                <MilestoneForm onAdd={addMilestone} submitting={submitting} />
              </s-stack>
            </div>
          </s-section>

          {/* ── Upsells ──────────────────────────────────── */}
          <s-section padding="none">
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <s-text fontWeight="bold">Upsells</s-text>
                <s-switch label="Upsells" labelAccessibilityVisibility="hidden" checked={upsellsEnabled} onChange={(e) => setUpsellsEnabled(e.target.checked)} />
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <s-stack direction="block" gap="400">
                <s-text-field label="Section heading" value={upsellsHeading} onInput={(e) => setUpsellsHeading(e.target.value)} placeholder="You may also like" />
                <s-checkbox label="Show upsells when cart is empty" checked={showOnEmptyCart} onChange={(e) => setShowOnEmptyCart(e.target.checked)} />

                {/* Product list */}
                <s-stack direction="block" gap="200">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <s-text fontWeight="semibold" variant="bodySm">Products</s-text>
                    <s-button variant="tertiary" onClick={pickProducts}>{upsellProducts.length > 0 ? "Change" : "Add products"}</s-button>
                  </div>
                  {upsellProducts.length > 0 ? (
                    <>
                      {upsellProducts.map((p, i) => (
                        <div key={p.product_id} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "8px 0",
                          borderBottom: i < upsellProducts.length - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                        }}>
                          {p.image_url ? (
                            <s-thumbnail src={p.image_url} alt={p.title} size="small-200" />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--s-color-bg-surface-secondary)" }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <s-text fontWeight="medium">{p.title}</s-text>
                            <div><s-text color="subdued" variant="bodyXs">{p.price}</s-text></div>
                          </div>
                          <s-button variant="tertiary" onClick={() => removeProduct(p.product_id)} accessibilityLabel="Remove">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </s-button>
                        </div>
                      ))}
                      {upsellProducts.length > 6 && (
                        <s-banner tone="warning">More than 6 products may feel overwhelming. Consider keeping it focused.</s-banner>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <s-text color="subdued" variant="bodySm">No products selected</s-text>
                    </div>
                  )}
                </s-stack>
              </s-stack>
            </div>
          </s-section>

          {/* ── Bottom Ribbon + Behavior ──────────────────── */}
          <s-section padding="none">
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <s-text fontWeight="bold">Bottom Ribbon</s-text>
                <s-switch label="Bottom Ribbon" labelAccessibilityVisibility="hidden" checked={ribbonEnabled} onChange={(e) => setRibbonEnabled(e.target.checked)} />
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <s-text-field
                label="Out-of-stock message override"
                value={oosOverride}
                onInput={(e) => setOosOverride(e.target.value)}
                placeholder="This item is currently out of stock"
                details="Leave empty to use the default"
              />
            </div>
          </s-section>

          {/* ── Behavior ─────────────────────────────────── */}
          <s-section padding="none">
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
              <s-text fontWeight="bold">Behavior</s-text>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <s-stack direction="block" gap="300">
                <s-select label="Cross-page gift removal" value={crossPageBehavior} onChange={(e) => setCrossPageBehavior(e.target.value)}>
                  <s-option value="silent">Remove silently</s-option>
                  <s-option value="notice">Show a notice</s-option>
                  <s-option value="modal">Show a confirmation modal</s-option>
                </s-select>
                <s-text color="subdued" variant="bodyXs">
                  What happens to auto-added gifts when a customer leaves the page where the offer was active. Claimed items are never removed.
                </s-text>
              </s-stack>
            </div>
          </s-section>

        </s-stack>
      </div>
      {confirmModal}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
