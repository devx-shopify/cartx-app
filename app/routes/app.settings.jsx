import { useState, useEffect, useRef, useCallback } from "react";
import { useLoaderData, useFetcher, useOutletContext } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ThemeCopyCard, ThemeSwitcher } from "./app.jsx";
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
              handle
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
      // handle lets the drawer fetch /products/{handle}.js for live availability
      // (to show "Sold out" instead of the add button).
      return { product_id: node.id, title: node.title, handle: node.handle ?? "", image_url: node.featuredImage?.url ?? "", variant_id: firstVariant?.id ?? "", price: firstVariant?.price ?? "0", compare_at_price: firstVariant?.compareAtPrice || undefined };
    });
  } else if (!body.keep_upsell_products) {
    config.upsells.products = [];
  }
  config.upsells.enabled = body.upsells_enabled;
  config.bottom_ribbon = body.bottom_ribbon;
  config.cross_page_removal_behavior = body.cross_page_removal_behavior;

  await saveConfig(shopId, themeId, config);

  // Mark onboarding step
  await markStep(session.shop, "settings_configured");

  return { ok: true };
};

// ── Section header with right-aligned switch ────────────────────

function SectionEnableHeader({ enabled, onChange, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        background: "#f6f6f7",
        border: "1px solid var(--s-color-border, #e3e3e3)",
        borderRadius: 10,
      }}
    >
      <s-text variant="bodySm" color="subdued">{enabled ? "Enabled" : "Disabled"} on storefront</s-text>
      <s-switch
        label={label}
        labelAccessibilityVisibility="hidden"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

// ── Tier row in the lineup list ─────────────────────────────────

const SOURCE_TONE = {
  Offer: "info",
  Volume: "info",
  "Claim Gift": "success",
  Milestone: "attention",
};

function TierRow({
  item,
  index,
  isDragging,
  isOver,
  isEditing,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onToggle,
  onEdit,
  onDelete,
}) {
  const isMilestone = item.source === "milestone";
  const thresholdLabel = item.type === "price" ? `₹${item.threshold}` : `${item.threshold} items`;

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        border: isOver
          ? "1px dashed #2c6ecb"
          : "1px solid var(--s-color-border, #e3e3e3)",
        borderRadius: isEditing ? "10px 10px 0 0" : 10,
        borderBottom: isEditing ? "none" : undefined,
        background: "#fff",
        opacity: isDragging ? 0.4 : 1,
        cursor: isEditing ? "default" : "grab",
        userSelect: "none",
      }}
    >
      {/* Drag handle */}
      <div
        aria-hidden="true"
        style={{
          color: "#8c9196",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: isEditing ? "default" : "grab",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="5.5" cy="3" r="1.25" />
          <circle cx="10.5" cy="3" r="1.25" />
          <circle cx="5.5" cy="8" r="1.25" />
          <circle cx="10.5" cy="8" r="1.25" />
          <circle cx="5.5" cy="13" r="1.25" />
          <circle cx="10.5" cy="13" r="1.25" />
        </svg>
      </div>

      {/* Position number */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6d7175",
          minWidth: 18,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <s-text fontWeight="medium">{item.name}</s-text>
          {isMilestone && !item.enabled && (
            <s-badge tone="warning">Off</s-badge>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <s-badge tone={SOURCE_TONE[item.source_label] || undefined}>{item.source_label}</s-badge>
          <s-text color="subdued" variant="bodySm">{thresholdLabel}</s-text>
          {item.sub_label && (
            <>
              <s-text color="subdued" variant="bodySm">·</s-text>
              <s-text color="subdued" variant="bodySm">{item.sub_label}</s-text>
            </>
          )}
        </div>
      </div>

      {/* Milestone actions */}
      {isMilestone && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <s-switch
            label="Toggle milestone"
            labelAccessibilityVisibility="hidden"
            checked={item.enabled}
            onChange={onToggle}
          />
          <s-button
            variant="tertiary"
            icon="edit"
            accessibilityLabel={`${isEditing ? "Close" : "Edit"} milestone ${item.name}`}
            onClick={onEdit}
          />
          <s-button
            variant="tertiary"
            tone="critical"
            icon="delete"
            accessibilityLabel={`Delete milestone ${item.name}`}
            onClick={onDelete}
          />
        </div>
      )}
    </div>
  );
}

// ── Milestone form fields ───────────────────────────────────────

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
          <s-button variant="primary" onClick={handleSubmit} {...(submitting ? { disabled: true } : {})}>
            {submitLabel ?? "Save"}
          </s-button>
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
      <s-button onClick={() => setOpen(true)}>Add visual milestone</s-button>
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

// ── Main settings page ─────────────────────────────────────────

export default function Settings() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const { themes, activeThemeId, mainThemeId } = useOutletContext();
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
    upsellProducts: data.upsells.products.map((p) => p.product_id).join(","),
    ribbonEnabled: data.bottomRibbon.enabled,
    oosOverride: data.bottomRibbon.oos_message_override ?? "",
    crossPageBehavior: data.crossPageRemoval,
  }), [data]);
  const initialRef = useRef(snapshot());

  // Sync local lineup + snapshot whenever loader data changes (after revalidation).
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
      currentProducts !== init.upsellProducts ||
      ribbonEnabled !== init.ribbonEnabled ||
      oosOverride !== init.oosOverride ||
      crossPageBehavior !== init.crossPageBehavior
    );
  }, [pbEnabled, allCompleteMessage, lineup, upsellsEnabled, upsellProducts, newProductIds, ribbonEnabled, oosOverride, crossPageBehavior, data]);

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Settings saved");
  }, [fetcher.data, shopify]);

  function handleSave() {
    const payload = {
      progress_bar_enabled: pbEnabled,
      all_complete_message: allCompleteMessage,
      upsells_enabled: upsellsEnabled,
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

  return (
    <>
      <ui-save-bar id="settings-save-bar">
        <button variant="primary" id="settings-save" onClick={handleSave} {...(submitting ? { disabled: true } : {})}></button>
        <button id="settings-discard" onClick={handleDiscard}></button>
      </ui-save-bar>

      <s-page heading="Settings">
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
          </div>

          {/* ── Progress Bar ─────────────────────────────── */}
          <s-section
            heading="Progress bar"
            description="Show milestones that customers unlock as they add items to cart."
          >
            <VStack gap={400}>
              <SectionEnableHeader enabled={pbEnabled} onChange={setPbEnabled} label="Progress bar enabled" />

              <s-text-field
                label="All tiers complete message"
                value={allCompleteMessage}
                onInput={(e) => setAllCompleteMessage(e.target.value)}
                placeholder="You unlocked all rewards!"
                details="Shown above the bar when every milestone has been reached."
              />

              {lineup.length > 0 && (
                <VStack gap={300}>
                  <div>
                    <s-text fontWeight="semibold">Bar tier order</s-text>
                    <div style={{ marginTop: 2 }}>
                      <s-text color="subdued" variant="bodySm">
                        Drag to reorder. Activation is still based on each tier's threshold — only the visual position changes.
                      </s-text>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {lineup.map((item, i) => {
                      const isMilestone = item.source === "milestone";
                      const isEditing = editingId === item.id;
                      const fullMilestone = isMilestone
                        ? data.progressBar.visual_milestones.find((m) => m.id === item.id)
                        : null;
                      return (
                        <div key={item.id}>
                          <TierRow
                            item={item}
                            index={i}
                            isDragging={dragId === item.id}
                            isOver={dragOverId === item.id && dragId && dragId !== item.id}
                            isEditing={isEditing}
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDragLeave={() => { if (dragOverId === item.id) setDragOverId(null); }}
                            onDrop={(e) => handleDrop(e, item.id)}
                            onDragEnd={handleDragEnd}
                            onToggle={() => milestoneAction("toggle_milestone", item.id)}
                            onEdit={() => setEditingId(isEditing ? null : item.id)}
                            onDelete={() => handleDeleteMilestone({ id: item.id, label: item.name })}
                          />
                          {isEditing && fullMilestone && (
                            <div
                              style={{
                                padding: "0 14px 16px",
                                border: "1px solid var(--s-color-border, #e3e3e3)",
                                borderTop: "none",
                                borderRadius: "0 0 10px 10px",
                                background: "#fff",
                              }}
                            >
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
                </VStack>
              )}

              <MilestoneForm onAdd={addMilestone} submitting={submitting} />
            </VStack>
          </s-section>

          {/* ── Upsells ──────────────────────────────────── */}
          <s-section
            heading="Upsells"
            description="Suggest related products inside the cart drawer to increase order value."
          >
            <VStack gap={400}>
              <SectionEnableHeader enabled={upsellsEnabled} onChange={setUpsellsEnabled} label="Upsells enabled" />

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <s-text fontWeight="semibold">Products</s-text>
                  <s-button onClick={pickProducts}>
                    {upsellProducts.length > 0 ? "Change products" : "Add products"}
                  </s-button>
                </div>
                {upsellProducts.length > 0 ? (
                  <div
                    style={{
                      border: "1px solid var(--s-color-border, #e3e3e3)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {upsellProducts.map((p, i) => (
                      <div
                        key={p.product_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderBottom: i < upsellProducts.length - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                          background: "#fff",
                        }}
                      >
                        {p.image_url ? (
                          <s-thumbnail src={p.image_url} alt={p.title} size="small-200" />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 6,
                              background: "var(--s-color-bg-surface-secondary)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <s-text fontWeight="medium">{p.title}</s-text>
                          <div>
                            <s-text color="subdued" variant="bodySm">₹{p.price}</s-text>
                          </div>
                        </div>
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          icon="delete"
                          accessibilityLabel={`Remove ${p.title}`}
                          onClick={() => removeProduct(p.product_id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "28px 14px",
                      border: "1px dashed var(--s-color-border, #e3e3e3)",
                      borderRadius: 10,
                      background: "#fafafa",
                    }}
                  >
                    <s-text color="subdued">No upsell products yet</s-text>
                    <div style={{ marginTop: 10 }}>
                      <s-button onClick={pickProducts}>Add products</s-button>
                    </div>
                  </div>
                )}
                {upsellProducts.length > 6 && (
                  <div style={{ marginTop: 10 }}>
                    <s-banner tone="warning">
                      More than 6 products may feel overwhelming. Consider keeping it focused.
                    </s-banner>
                  </div>
                )}
              </div>
            </VStack>
          </s-section>

          {/* ── Bottom Ribbon ───────────────────────────── */}
          <s-section
            heading="Bottom ribbon"
            description="Sticky banner shown at the bottom of the drawer (e.g. for the next unlock or out-of-stock messages)."
          >
            <VStack gap={400}>
              <SectionEnableHeader enabled={ribbonEnabled} onChange={setRibbonEnabled} label="Bottom ribbon enabled" />
              <s-text-field
                label="Out-of-stock message override"
                value={oosOverride}
                onInput={(e) => setOosOverride(e.target.value)}
                placeholder="This item is currently out of stock"
                details="Leave empty to use the default message."
              />
            </VStack>
          </s-section>

          {/* ── Behavior ────────────────────────────────── */}
          <s-section
            heading="Behavior"
            description="Fine-tune how the cart drawer behaves between pages."
          >
            <s-select
              label="Cross-page gift removal"
              value={crossPageBehavior}
              onChange={(e) => setCrossPageBehavior(e.target.value)}
              details="What happens to auto-added gifts when a customer leaves the page where the offer was active. Claimed items are never removed."
            >
              <s-option value="silent">Remove silently</s-option>
              <s-option value="notice">Show a notice</s-option>
              <s-option value="modal">Show a confirmation modal</s-option>
            </s-select>
          </s-section>

          {/* ── Copy from another theme ─────────────────── */}
          <ThemeCopyCard themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />

        </div>
        {confirmModal}
      </s-page>
    </>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
