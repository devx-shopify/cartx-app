import { useState, useEffect, useRef, useCallback } from "react";
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
import TargetingSection from "../components/TargetingSection.jsx";
import VStack from "../components/VStack.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  // Build the bar lineup — all tiers that could appear on the progress bar.
  // Uses the same IDs as bar.server.js so tier_order matches at runtime.
  const lineup = [];
  for (const offer of config.offers) {
    if (!offer.enabled || !offer.bar?.show) continue;
    if (offer.reward?.type === "volume_discount") {
      const tiers = (offer.reward.tiers || []).slice().sort((a, b) => a.quantity - b.quantity);
      for (const tier of tiers) {
        const label = offer.reward.discount_mode === "fixed_total"
          ? `Buy ${tier.quantity} @ ${tier.value}`
          : `Buy ${tier.quantity} get ${tier.value}% off`;
        lineup.push({
          id: offer.id + "_tier_" + tier.quantity,
          source: "volume_discount",
          source_label: "Volume",
          name: offer.name + " — " + label,
          threshold: tier.quantity,
          type: "quantity",
          can_toggle: false,
        });
      }
      continue;
    }
    lineup.push({
      id: offer.id,
      source: "offer",
      source_label: "Offer",
      name: offer.name,
      threshold: offer.trigger.price_threshold || offer.trigger.quantity_threshold,
      type: offer.trigger.price_threshold ? "price" : "quantity",
      can_toggle: false,
    });
  }
  for (const claim of config.claim_gifts) {
    if (!claim.enabled || !claim.bar?.show) continue;
    lineup.push({
      id: claim.id,
      source: "claim_gift",
      source_label: "Claim Gift",
      name: claim.name,
      threshold: claim.trigger.threshold,
      type: claim.trigger.type,
      can_toggle: false,
    });
  }
  for (const m of config.progress_bar.visual_milestones) {
    lineup.push({
      id: m.id,
      source: "milestone",
      source_label: "Milestone",
      name: m.label,
      sub_label: m.sub_label || null,
      threshold: m.trigger.threshold,
      type: m.trigger.type,
      enabled: m.enabled,
      can_toggle: true,
    });
  }

  // Sort lineup by saved tier_order; unsaved items append in their natural order
  const order = config.progress_bar.tier_order || [];
  const indexOf = (id) => {
    const i = order.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  lineup.sort((a, b) => indexOf(a.id) - indexOf(b.id));

  return {
    progressBar: config.progress_bar,
    upsells: config.upsells,
    bottomRibbon: config.bottom_ribbon,
    crossPageRemoval: config.cross_page_removal_behavior,
    lineup,
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
      page_handles: Array.isArray(body.page_handles)
        ? body.page_handles
        : body.page_handles.split(",").map((h) => h.trim()).filter(Boolean),
      page_targets: body.page_targets,
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
  if (body._action === "edit_milestone") {
    const milestone = config.progress_bar.visual_milestones.find((m) => m.id === body.id);
    if (milestone) {
      milestone.label = body.label;
      milestone.sub_label = body.sub_label || undefined;
      milestone.trigger = { type: body.trigger_type, threshold: Number(body.threshold) };
      milestone.page_handles = Array.isArray(body.page_handles)
        ? body.page_handles
        : body.page_handles.split(",").map((h) => h.trim()).filter(Boolean);
      milestone.page_targets = body.page_targets;
      if (typeof body.icon_url === "string") milestone.icon_url = body.icon_url || undefined;
    }
    await saveConfig(shopId, themeId, config);
    return { ok: true };
  }

  config.progress_bar.enabled = body.progress_bar_enabled;
  config.progress_bar.all_complete_message = body.all_complete_message;
  if (Array.isArray(body.tier_order)) {
    config.progress_bar.tier_order = body.tier_order.filter((id) => typeof id === "string");
  }

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

function MilestoneFormFields({ initial, onSubmit, onCancel, submitting, submitLabel }) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [subLabel, setSubLabel] = useState(initial?.sub_label ?? "");
  const [triggerType, setTriggerType] = useState(initial?.trigger?.type ?? "price");
  const [threshold, setThreshold] = useState(String(initial?.trigger?.threshold ?? ""));
  const [pageHandles, setPageHandles] = useState(initial?.page_handles?.length ? initial.page_handles : ["/"]);
  const [pageTargets, setPageTargets] = useState(initial?.page_targets);

  function handleSubmit() {
    if (!label.trim() || !threshold) return;
    if (!Array.isArray(pageHandles) || pageHandles.length === 0) return;
    onSubmit({
      label,
      sub_label: subLabel,
      trigger_type: triggerType,
      threshold,
      page_handles: pageHandles,
      page_targets: pageTargets,
    });
  }

  return (
    <div style={{ padding: "16px 0 0" }}>
      <VStack gap={400}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <s-text-field label="Label" value={label} onInput={(e) => setLabel(e.target.value)} placeholder="Free Shipping" />
          <s-text-field label="Sub label" value={subLabel} onInput={(e) => setSubLabel(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <s-select label="Trigger type" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
            <s-option value="price">Price</s-option>
            <s-option value="quantity">Quantity</s-option>
          </s-select>
          <s-number-field label="Threshold" value={String(threshold)} onInput={(e) => setThreshold(e.target.value)} />
        </div>
        <TargetingSection
          pageHandles={pageHandles}
          pageTargets={pageTargets}
          onChange={({ page_handles, page_targets }) => { setPageHandles(page_handles); setPageTargets(page_targets); }}
          heading="Milestone targeting"
        />
        <div style={{ display: "flex", gap: 8 }}>
          <s-button onClick={handleSubmit} {...(submitting ? { disabled: true } : {})}>{submitLabel ?? "Save"}</s-button>
          <s-button variant="tertiary" onClick={onCancel}>Cancel</s-button>
        </div>
      </VStack>
    </div>
  );
}

function MilestoneForm({ onAdd, submitting }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <s-button variant="tertiary" onClick={() => setOpen(true)}>+ Add visual milestone</s-button>
    );
  }
  return (
    <MilestoneFormFields
      onSubmit={(data) => {
        onAdd({ _action: "add_milestone", ...data });
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
      submitting={submitting}
      submitLabel="Add milestone"
    />
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
  const [lineup, setLineup] = useState(data.lineup);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [upsellsEnabled, setUpsellsEnabled] = useState(data.upsells.enabled);
  const [upsellsHeading, setUpsellsHeading] = useState(data.upsells.heading);
  const [showOnEmptyCart, setShowOnEmptyCart] = useState(data.upsells.show_on_empty_cart ?? false);
  const [upsellProducts, setUpsellProducts] = useState(data.upsells.products);
  const [newProductIds, setNewProductIds] = useState(null);
  const [ribbonEnabled, setRibbonEnabled] = useState(data.bottomRibbon.enabled);
  const [oosOverride, setOosOverride] = useState(data.bottomRibbon.oos_message_override ?? "");
  const [crossPageBehavior, setCrossPageBehavior] = useState(data.crossPageRemoval);
  const [dirty, setDirty] = useState(false);

  // Snapshot of the loader-side "saved" state used to compute the dirty flag.
  // Re-snapshots whenever loader data changes (after a revalidation).
  const snapshot = useCallback(() => ({
    pbEnabled: data.progressBar.enabled,
    allCompleteMessage: data.progressBar.all_complete_message,
    tierOrder: data.lineup.map((t) => t.id).join(","),
    upsellsEnabled: data.upsells.enabled,
    upsellsHeading: data.upsells.heading,
    showOnEmptyCart: data.upsells.show_on_empty_cart ?? false,
    upsellProducts: data.upsells.products.map((p) => p.product_id).join(","),
    ribbonEnabled: data.bottomRibbon.enabled,
    oosOverride: data.bottomRibbon.oos_message_override ?? "",
    crossPageBehavior: data.crossPageRemoval,
  }), [data]);
  const initialRef = useRef(snapshot());

  // Sync local lineup + snapshot whenever loader data changes (after revalidation).
  // Preserve the user's in-progress reorder: keep existing items in their current
  // local order, refresh their fields from the server, then append any new items
  // and drop any items the server removed.
  useEffect(() => {
    setLineup((prev) => {
      const incomingById = new Map(data.lineup.map((t) => [t.id, t]));
      const kept = prev
        .filter((t) => incomingById.has(t.id))
        .map((t) => incomingById.get(t.id));
      const existingIds = new Set(kept.map((t) => t.id));
      const added = data.lineup.filter((t) => !existingIds.has(t.id));
      return [...kept, ...added];
    });
    initialRef.current = snapshot();
  }, [data, snapshot]);

  // Compute dirty by diffing every tracked field against the snapshot.
  useEffect(() => {
    const init = initialRef.current;
    const currentTierOrder = lineup.map((t) => t.id).join(",");
    const currentProducts = (newProductIds ?? upsellProducts.map((p) => p.product_id)).join(",");
    setDirty(
      pbEnabled !== init.pbEnabled ||
      allCompleteMessage !== init.allCompleteMessage ||
      currentTierOrder !== init.tierOrder ||
      upsellsEnabled !== init.upsellsEnabled ||
      upsellsHeading !== init.upsellsHeading ||
      showOnEmptyCart !== init.showOnEmptyCart ||
      currentProducts !== init.upsellProducts ||
      ribbonEnabled !== init.ribbonEnabled ||
      oosOverride !== init.oosOverride ||
      crossPageBehavior !== init.crossPageBehavior
    );
  }, [pbEnabled, allCompleteMessage, lineup, upsellsEnabled, upsellsHeading, showOnEmptyCart, upsellProducts, newProductIds, ribbonEnabled, oosOverride, crossPageBehavior, data]);

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
      tier_order: lineup.map((t) => t.id),
    };
    if (newProductIds) payload.upsell_product_ids = newProductIds;
    else payload.keep_upsell_products = true;
    fetcher.submit(JSON.stringify(payload), { method: "POST", encType: "application/json" });
  }

  function handleDiscard() {
    setPbEnabled(data.progressBar.enabled);
    setAllCompleteMessage(data.progressBar.all_complete_message);
    setLineup(data.lineup);
    setUpsellsEnabled(data.upsells.enabled);
    setUpsellsHeading(data.upsells.heading);
    setShowOnEmptyCart(data.upsells.show_on_empty_cart ?? false);
    setUpsellProducts(data.upsells.products);
    setNewProductIds(null);
    setRibbonEnabled(data.bottomRibbon.enabled);
    setOosOverride(data.bottomRibbon.oos_message_override ?? "");
    setCrossPageBehavior(data.crossPageRemoval);
    setEditingId(null);
  }

  // Save bar show/hide
  useEffect(() => {
    const el = document.getElementById("settings-save-bar");
    if (!el) return;
    if (dirty) el.show();
    else el.hide();
  }, [dirty]);


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

  function editMilestone(id, milestoneData) {
    fetcher.submit(
      JSON.stringify({ _action: "edit_milestone", id, ...milestoneData }),
      { method: "POST", encType: "application/json" }
    );
    setEditingId(null);
  }

  function milestoneAction(actionName, id) {
    fetcher.submit(JSON.stringify({ _action: actionName, id }), { method: "POST", encType: "application/json" });
  }

  async function handleDeleteMilestone(milestone) {
    const yes = await confirmFn({ title: "Delete milestone", message: `Are you sure you want to delete "${milestone.label}"? This action cannot be undone.`, confirmLabel: "Delete", destructive: true });
    if (!yes) return;
    milestoneAction("delete_milestone", milestone.id);
  }

  function handleDragStart(e, id) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch (_) { /* Safari */ }
  }
  function handleDragOver(e, id) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  }
  function handleDrop(e, dropId) {
    e.preventDefault();
    if (dragId && dragId !== dropId) {
      const ids = lineup.map((x) => x.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(dropId);
      if (from !== -1 && to !== -1) {
        const next = lineup.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setLineup(next);
      }
    }
    setDragId(null);
    setDragOverId(null);
  }
  function handleDragEnd() { setDragId(null); setDragOverId(null); }

  function thresholdBadge(item) {
    if (item.type === "price") return `${item.threshold} (price)`;
    return `${item.threshold} items`;
  }

  return (
    <>
      <ui-save-bar id="settings-save-bar">
        <button variant="primary" id="settings-save" onClick={handleSave} {...(submitting ? { disabled: true } : {})}></button>
        <button id="settings-discard" onClick={handleDiscard}></button>
      </ui-save-bar>

      <s-page heading="Settings">
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

                {/* Unified bar lineup — drag to reorder */}
                {lineup.length > 0 && (
                  <s-stack direction="block" gap="200">
                    <s-text fontWeight="semibold" variant="bodySm">Bar tier order</s-text>
                    <s-text color="subdued" variant="bodyXs">
                      Drag to reorder the tiers on your progress bar. Activation is still based on each tier's threshold — only the visual position changes. Click <strong>Save</strong> to persist the order.
                    </s-text>
                    <div style={{ marginTop: 4 }}>
                      {lineup.map((item, i) => {
                        const isMilestone = item.source === "milestone";
                        const isDragging = dragId === item.id;
                        const isOver = dragOverId === item.id && dragId && dragId !== item.id;
                        const isEditing = editingId === item.id;
                        const fullMilestone = isMilestone
                          ? data.progressBar.visual_milestones.find((m) => m.id === item.id)
                          : null;
                        return (
                          <div key={item.id} style={{ marginBottom: 6 }}>
                            <div
                              draggable={!isEditing}
                              onDragStart={(e) => handleDragStart(e, item.id)}
                              onDragOver={(e) => handleDragOver(e, item.id)}
                              onDragLeave={() => { if (dragOverId === item.id) setDragOverId(null); }}
                              onDrop={(e) => handleDrop(e, item.id)}
                              onDragEnd={handleDragEnd}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                gap: 8,
                                padding: "10px 12px",
                                border: isOver
                                  ? "1px dashed var(--s-color-border-emphasis, #2c6ecb)"
                                  : "1px solid var(--s-color-border, #e3e3e3)",
                                borderRadius: isEditing ? "8px 8px 0 0" : 8,
                                borderBottom: isEditing ? "none" : undefined,
                                background: isMilestone
                                  ? "var(--s-color-bg-surface-info, #f1f8ff)"
                                  : "var(--s-color-bg-surface, #fff)",
                                opacity: isDragging ? 0.4 : 1,
                                cursor: isEditing ? "default" : "grab",
                                userSelect: "none",
                              }}
                            >
                              <s-stack direction="inline" gap="200" alignItems="center">
                                <span aria-hidden="true" style={{ color: "var(--s-color-text-subdued, #6d7175)", fontSize: 14, lineHeight: 1, cursor: isEditing ? "default" : "grab" }}>⋮⋮</span>
                                <s-text fontWeight="semibold" variant="bodyXs" color="subdued">#{i + 1}</s-text>
                                <s-badge>{item.source_label}</s-badge>
                                <s-stack direction="block" gap="extra-small">
                                  <s-stack direction="inline" gap="200" alignItems="center">
                                    <s-text fontWeight="medium">{item.name}</s-text>
                                    {isMilestone && (
                                      <s-badge tone={item.enabled ? "success" : "warning"}>{item.enabled ? "Active" : "Off"}</s-badge>
                                    )}
                                    <s-badge tone="info">{thresholdBadge(item)}</s-badge>
                                  </s-stack>
                                  {item.sub_label && <s-text color="subdued" variant="bodyXs">{item.sub_label}</s-text>}
                                </s-stack>
                              </s-stack>
                              {isMilestone && (
                                <s-stack direction="inline" gap="200" alignItems="center">
                                  <s-switch label="Toggle" labelAccessibilityVisibility="hidden" checked={item.enabled} onChange={() => milestoneAction("toggle_milestone", item.id)} />
                                  <s-button variant="tertiary" onClick={() => setEditingId(isEditing ? null : item.id)}>{isEditing ? "Close" : "Edit"}</s-button>
                                  <s-button variant="tertiary" tone="critical" onClick={() => handleDeleteMilestone({ id: item.id, label: item.name })}>Delete</s-button>
                                </s-stack>
                              )}
                            </div>
                            {isEditing && fullMilestone && (
                              <div style={{
                                padding: "0 12px 16px",
                                border: "1px solid var(--s-color-border, #e3e3e3)",
                                borderTop: "none",
                                borderRadius: "0 0 8px 8px",
                                background: "var(--s-color-bg-surface, #fff)",
                              }}>
                                <MilestoneFormFields
                                  initial={fullMilestone}
                                  onSubmit={(d) => editMilestone(item.id, d)}
                                  onCancel={() => setEditingId(null)}
                                  submitting={submitting}
                                  submitLabel="Update milestone"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
    </>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
