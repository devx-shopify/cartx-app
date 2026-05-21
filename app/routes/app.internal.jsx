import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server.js";
import VStack from "../components/VStack.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  const adminShop = process.env.ADMIN_SHOP;
  if (!adminShop || session.shop !== adminShop) {
    throw new Response("Not found", { status: 404 });
  }

  const stores = await db.store.findMany({ orderBy: { createdAt: "desc" } });
  return { stores };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  if (session.shop !== process.env.ADMIN_SHOP) {
    throw new Response("Not found", { status: 404 });
  }

  const body = await request.json();
  const { _action } = body;

  if (_action === "upsert") {
    if (!body.storeDomain) return { ok: false, error: "Store domain required" };
    const store = await db.store.upsert({
      where: { storeDomain: body.storeDomain },
      create: {
        storeDomain: body.storeDomain,
        planTier: body.planTier || "free",
        billingMethod: body.billingMethod || "shopify",
        isLegacy: body.isLegacy || false,
        legacyPrice: body.legacyPrice || null,
        notes: body.notes || null,
      },
      update: {
        planTier: body.planTier,
        billingMethod: body.billingMethod,
        isLegacy: body.isLegacy,
        legacyPrice: body.legacyPrice,
        notes: body.notes,
      },
    });
    return { ok: true, toast: `Store ${store.storeDomain} saved` };
  }

  if (_action === "toggle_legacy") {
    const store = await db.store.findUnique({ where: { storeDomain: body.storeDomain } });
    if (!store) return { ok: false, error: "Store not found" };
    const newLegacy = !store.isLegacy;
    await db.store.update({
      where: { storeDomain: body.storeDomain },
      data: {
        isLegacy: newLegacy,
        billingMethod: newLegacy ? "invoice" : "shopify",
        planTier: newLegacy ? "max" : "free",
      },
    });
    return { ok: true, toast: `${body.storeDomain} ${newLegacy ? "marked as legacy (Max plan)" : "switched to Shopify billing (Free)"}` };
  }

  if (_action === "reset_onboarding") {
    const defaultOnboarding = JSON.stringify({ completed: false, steps: { offer_created: false, settings_configured: false, previewed: false } });
    await db.store.update({
      where: { storeDomain: body.storeDomain },
      data: { onboarding: defaultOnboarding },
    });
    return { ok: true, toast: `Onboarding reset for ${body.storeDomain}` };
  }

  if (_action === "delete") {
    if (!body.storeDomain) return { ok: false, error: "Store domain required" };
    await db.store.delete({ where: { storeDomain: body.storeDomain } }).catch(() => {});
    return { ok: true, toast: `${body.storeDomain} removed` };
  }

  return { ok: false };
};

const TIER_TONE = { free: "warning", basic: "info", max: "success" };

export default function InternalAdmin() {
  const { stores } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (fetcher.data?.toast) {
      shopify.toast.show(fetcher.data.toast);
      setModalOpen(false);
      setEditing(null);
    }
    if (fetcher.data?.error) shopify.toast.show(fetcher.data.error, { isError: true });
  }, [fetcher.data, shopify]);

  const filtered = stores
    .filter((s) => {
      if (filter === "legacy") return s.isLegacy;
      if (filter === "shopify") return !s.isLegacy;
      return true;
    })
    .filter((s) =>
      !search ||
      s.storeDomain.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || "").toLowerCase().includes(search.toLowerCase())
    );

  const legacyCount = stores.filter((s) => s.isLegacy).length;
  const shopifyCount = stores.length - legacyCount;
  const paidCount = stores.filter((s) => !s.isLegacy && s.planTier !== "free").length;

  function submit(data) {
    fetcher.submit(JSON.stringify(data), { method: "POST", encType: "application/json" });
  }

  function openEdit(store) {
    setEditing(store);
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <s-page heading="Store Management">
      <s-button slot="primary-action" variant="primary" onClick={openCreate}>
        Add store
      </s-button>

      <VStack gap={400}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          {[
            { value: stores.length, label: "Total stores" },
            { value: legacyCount, label: "Legacy (invoice)" },
            { value: shopifyCount, label: "Shopify billing" },
            { value: paidCount, label: "Paid (Shopify)" },
          ].map((stat) => (
            <s-section key={stat.label} padding="400">
              <VStack gap={100}>
                <s-text fontWeight="bold" fontSize="heading-lg">{stat.value}</s-text>
                <s-text color="subdued">{stat.label}</s-text>
              </VStack>
            </s-section>
          ))}
        </div>

        {/* Stores table */}
        <s-section padding="none" accessibilityLabel="Stores list">
          <s-table>
            {/* Filter tabs */}
            <s-box slot="filters" paddingInline="small" paddingBlock="small-200" borderBlockEnd="base">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {[
                  { id: "all", label: `All (${stores.length})` },
                  { id: "legacy", label: `Legacy (${legacyCount})` },
                  { id: "shopify", label: `Shopify (${shopifyCount})` },
                ].map((tab) => (
                  <s-button
                    key={tab.id}
                    variant="tertiary"
                    pressed={filter === tab.id}
                    onClick={() => setFilter(tab.id)}
                  >
                    {tab.label}
                  </s-button>
                ))}
              </div>
            </s-box>

            {/* Search */}
            <s-box slot="filters" paddingInline="small" paddingBlock="small-200">
              <s-search-field
                label="Search stores"
                labelAccessibilityVisibility="exclusive"
                placeholder="Search by domain or notes..."
                value={search}
                onInput={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
              />
            </s-box>

            {/* Header */}
            <s-table-header-row>
              <s-table-header listSlot="primary">Store domain</s-table-header>
              <s-table-header>Plan</s-table-header>
              <s-table-header>Billing</s-table-header>
              <s-table-header>Legacy</s-table-header>
              <s-table-header listSlot="secondary">Notes</s-table-header>
              <s-table-header></s-table-header>
            </s-table-header-row>

            {/* Body */}
            <s-table-body>
              {filtered.length === 0 ? (
                <s-table-row>
                  <s-table-cell colSpan="6">
                    <s-box padding="800">
                      <VStack gap={200} style={{ alignItems: "center", textAlign: "center" }}>
                        <s-text fontWeight="semibold">
                          {search ? "No stores match your search" : "No stores yet"}
                        </s-text>
                        <s-text color="subdued">
                          {search ? "Try a different search term." : "Stores appear here when merchants install the app."}
                        </s-text>
                      </VStack>
                    </s-box>
                  </s-table-cell>
                </s-table-row>
              ) : (
                filtered.map((store) => (
                  <s-table-row key={store.id}>
                    <s-table-cell>
                      <VStack gap={100}>
                        <s-text fontWeight="semibold">{store.storeDomain}</s-text>
                        {store.legacyPrice ? (
                          <s-text color="subdued">${store.legacyPrice}/mo invoice</s-text>
                        ) : null}
                      </VStack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={TIER_TONE[store.planTier] || "info"}>
                        {store.planTier.toUpperCase()}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={store.isLegacy ? "success" : "info"}>
                        {store.billingMethod === "invoice" ? "Invoice" : store.billingMethod === "none" ? "None" : "Shopify"}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      <s-switch
                        label="Legacy"
                        labelAccessibilityVisibility="hidden"
                        checked={store.isLegacy}
                        onChange={() => submit({ _action: "toggle_legacy", storeDomain: store.storeDomain })}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-text color="subdued">{store.notes || "—"}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-button variant="tertiary" onClick={() => openEdit(store)}>
                        Edit
                      </s-button>
                    </s-table-cell>
                  </s-table-row>
                ))
              )}
            </s-table-body>
          </s-table>
        </s-section>
      </VStack>

      {/* Modal */}
      {modalOpen && (
        <StoreModal
          store={editing}
          onSave={submit}
          onDelete={submit}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          shopify={shopify}
        />
      )}
    </s-page>
  );
}

function StoreModal({ store, onSave, onDelete, onClose, shopify }) {
  const isEdit = !!store;
  const [domain, setDomain] = useState(store?.storeDomain || "");
  const [tier, setTier] = useState(store?.planTier || "free");
  const [billing, setBilling] = useState(store?.billingMethod || "shopify");
  const [legacy, setLegacy] = useState(store?.isLegacy ? "true" : "false");
  const [price, setPrice] = useState(store?.legacyPrice ? String(store.legacyPrice) : "");
  const [notes, setNotes] = useState(store?.notes || "");

  useEffect(() => {
    shopify.modal.show("store-modal");
  }, [shopify]);

  function handleSave() {
    if (!domain.trim()) return;
    onSave({
      _action: "upsert",
      storeDomain: domain.trim(),
      planTier: tier,
      billingMethod: billing,
      isLegacy: legacy === "true",
      legacyPrice: price ? parseInt(price, 10) : null,
      notes: notes.trim() || null,
    });
  }

  function handleDelete() {
    onDelete({ _action: "delete", storeDomain: store.storeDomain });
  }

  return (
    <s-modal id="store-modal" heading={isEdit ? `Edit ${store.storeDomain}` : "Add Store"} onHide={onClose}>
      <VStack gap={400}>
        <s-text-field
          label="Store domain"
          value={domain}
          onInput={(e) => setDomain(e.target.value)}
          placeholder="brand.myshopify.com"
          readOnly={isEdit}
          details={isEdit ? "" : "The full .myshopify.com domain"}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <s-select label="Plan tier" value={tier} onChange={(e) => setTier(e.target.value)}>
            <s-option value="free">Free</s-option>
            <s-option value="basic">Basic ($150/mo)</s-option>
            <s-option value="max">Max ($200/mo)</s-option>
          </s-select>
          <s-select label="Billing method" value={billing} onChange={(e) => setBilling(e.target.value)}>
            <s-option value="shopify">Shopify</s-option>
            <s-option value="invoice">External invoice</s-option>
            <s-option value="none">None</s-option>
          </s-select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <s-select label="Legacy store" value={legacy} onChange={(e) => setLegacy(e.target.value)}>
            <s-option value="false">No</s-option>
            <s-option value="true">Yes — full features, no Shopify charge</s-option>
          </s-select>
          <s-number-field
            label="Invoice price ($/month)"
            value={price}
            onInput={(e) => setPrice(e.target.value)}
            placeholder="e.g. 120"
            min="0"
            details="For your records only"
          />
        </div>

        <s-text-field
          label="Internal notes"
          value={notes}
          onInput={(e) => setNotes(e.target.value)}
          placeholder="e.g. Old brand, paying via Razorpay since Jan 2024"
        />

        {legacy === "true" && (
          <s-banner tone="info">
            This store will get Max plan features for free. No Shopify billing prompt will be shown.
          </s-banner>
        )}
      </VStack>

      <s-button slot="primary-action" variant="primary" onClick={handleSave}>
        {isEdit ? "Save changes" : "Add store"}
      </s-button>
      {isEdit && (
        <s-button slot="secondary-actions" tone="critical" onClick={handleDelete}>
          Delete store
        </s-button>
      )}
      <s-button slot="secondary-actions" onClick={() => { shopify.modal.hide("store-modal"); onClose(); }}>
        Cancel
      </s-button>
    </s-modal>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
