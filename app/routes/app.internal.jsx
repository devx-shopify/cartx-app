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

  if (_action === "upsert_enterprise") {
    if (!body.storeDomain) return { ok: false, error: "Store domain required" };
    const price = body.price != null && body.price !== "" ? parseInt(body.price, 10) : 0;
    if (Number.isNaN(price) || price < 0) {
      return { ok: false, error: "Price must be 0 or higher" };
    }
    const store = await db.store.upsert({
      where: { storeDomain: body.storeDomain.trim().toLowerCase() },
      create: {
        storeDomain: body.storeDomain.trim().toLowerCase(),
        planTier: "enterprise",
        billingMethod: "shopify",
        isLegacy: true,
        legacyPrice: price,
        notes: body.notes || null,
      },
      update: {
        planTier: "enterprise",
        billingMethod: "shopify",
        isLegacy: true,
        legacyPrice: price,
        notes: body.notes,
      },
    });
    const priceLabel = price === 0 ? "Free" : `$${price}/mo`;
    return { ok: true, toast: `${store.storeDomain} set to Enterprise · ${priceLabel}` };
  }

  if (_action === "remove_enterprise") {
    if (!body.storeDomain) return { ok: false, error: "Store domain required" };
    await db.store.update({
      where: { storeDomain: body.storeDomain },
      data: {
        planTier: "free",
        billingMethod: "shopify",
        isLegacy: false,
        legacyPrice: null,
      },
    });
    return { ok: true, toast: `${body.storeDomain} reverted to standard billing` };
  }

  if (_action === "reset_onboarding") {
    const defaultOnboarding = JSON.stringify({
      completed: false,
      steps: { offer_created: false, settings_configured: false, app_enabled: false, previewed: false },
      selectedThemeId: null,
    });
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

function isEnterprise(store) {
  return store.isLegacy === true || store.planTier === "enterprise";
}

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

  const enterpriseStores = stores.filter(isEnterprise);
  const standardStores = stores.filter((s) => !isEnterprise(s));
  const enterpriseMRR = enterpriseStores.reduce((sum, s) => sum + (s.legacyPrice || 0), 0);

  const filtered = stores
    .filter((s) => {
      if (filter === "enterprise") return isEnterprise(s);
      if (filter === "standard") return !isEnterprise(s);
      return true;
    })
    .filter((s) =>
      !search ||
      s.storeDomain.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || "").toLowerCase().includes(search.toLowerCase())
    );

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
        Add enterprise store
      </s-button>

      <VStack gap={400}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatCard label="Total stores" value={stores.length} />
          <StatCard label="Enterprise" value={enterpriseStores.length} accent="#1a8c33" />
          <StatCard label="Standard" value={standardStores.length} accent="#2c6ecb" />
          <StatCard label="Enterprise MRR" value={`$${enterpriseMRR.toLocaleString()}`} accent="#5e32e2" />
        </div>

        {/* Stores table */}
        <s-section padding="none" accessibilityLabel="Stores list">
          <s-table>
            {/* Filter tabs */}
            <s-box slot="filters" paddingInline="small" paddingBlock="small-200" borderBlockEnd="base">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {[
                  { id: "all", label: `All (${stores.length})` },
                  { id: "enterprise", label: `Enterprise (${enterpriseStores.length})` },
                  { id: "standard", label: `Standard (${standardStores.length})` },
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
              <s-table-header listSlot="primary">Store</s-table-header>
              <s-table-header>Plan</s-table-header>
              <s-table-header>Price</s-table-header>
              <s-table-header listSlot="secondary">Notes</s-table-header>
              <s-table-header></s-table-header>
            </s-table-header-row>

            {/* Body */}
            <s-table-body>
              {filtered.length === 0 ? (
                <s-table-row>
                  <s-table-cell colSpan="5">
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
                filtered.map((store) => {
                  const enterprise = isEnterprise(store);
                  const price = store.legacyPrice ?? 0;
                  return (
                    <s-table-row key={store.id}>
                      <s-table-cell>
                        <VStack gap={100}>
                          <s-text fontWeight="semibold">{store.storeDomain}</s-text>
                          <s-text color="subdued" variant="bodyXs">
                            Added {new Date(store.createdAt).toLocaleDateString()}
                          </s-text>
                        </VStack>
                      </s-table-cell>
                      <s-table-cell>
                        {enterprise ? (
                          <s-badge tone="success">Enterprise</s-badge>
                        ) : (
                          <s-badge tone="info">
                            {store.planTier === "pro" ? "Pro" : "Free"}
                          </s-badge>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {enterprise ? (
                          price === 0 ? (
                            <s-text color="subdued">Free</s-text>
                          ) : (
                            <s-text fontWeight="medium">${price}/mo</s-text>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
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
                  );
                })
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
          onRemoveEnterprise={submit}
          onDelete={submit}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          shopify={shopify}
        />
      )}
    </s-page>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <s-section padding="400">
      <VStack gap={100}>
        <div style={{ fontSize: 24, fontWeight: 700, color: accent || "#1a1a1a", lineHeight: 1.2 }}>
          {value}
        </div>
        <s-text color="subdued" variant="bodySm">{label}</s-text>
      </VStack>
    </s-section>
  );
}

function StoreModal({ store, onSave, onRemoveEnterprise, onDelete, onClose, shopify }) {
  const isEdit = !!store;
  const storeIsEnterprise = isEdit ? isEnterprise(store) : true;
  const [domain, setDomain] = useState(store?.storeDomain || "");
  const [price, setPrice] = useState(store?.legacyPrice != null ? String(store.legacyPrice) : "200");
  const [notes, setNotes] = useState(store?.notes || "");

  useEffect(() => {
    shopify.modal.show("store-modal");
  }, [shopify]);

  function handleSave() {
    if (!domain.trim()) {
      shopify.toast.show("Store domain is required", { isError: true });
      return;
    }
    onSave({
      _action: "upsert_enterprise",
      storeDomain: domain.trim().toLowerCase(),
      price: parseInt(price, 10) || 0,
      notes: notes.trim() || null,
    });
  }

  function handleRemoveEnterprise() {
    onRemoveEnterprise({ _action: "remove_enterprise", storeDomain: store.storeDomain });
  }

  function handleDelete() {
    onDelete({ _action: "delete", storeDomain: store.storeDomain });
  }

  const numericPrice = parseInt(price, 10);
  const isFree = !Number.isFinite(numericPrice) || numericPrice === 0;

  return (
    <s-modal id="store-modal" heading={isEdit ? `Edit ${store.storeDomain}` : "Add enterprise store"} onHide={onClose}>
      <VStack gap={400}>
        <s-banner tone="info">
          {isEdit
            ? "Update the enterprise pricing for this store. Merchants are billed via Shopify at the price you set."
            : "Set up a custom-priced Enterprise plan. Once added, the merchant will see an approval prompt on their billing page."
          }
        </s-banner>

        <s-text-field
          label="Store domain"
          value={domain}
          onInput={(e) => setDomain(e.target.value)}
          placeholder="brand.myshopify.com"
          readOnly={isEdit}
          details={isEdit ? "Locked once created — delete and re-add to change the domain." : "Full .myshopify.com domain (e.g. brand.myshopify.com)"}
        />

        <s-number-field
          label="Monthly price (USD)"
          value={price}
          onInput={(e) => setPrice(e.target.value)}
          placeholder="200"
          min="0"
          details={
            isFree
              ? "Free — merchant gets full Enterprise features at no charge"
              : `Merchant will be billed $${numericPrice}/month via Shopify`
          }
        />

        <s-text-field
          label="Internal notes"
          value={notes}
          onInput={(e) => setNotes(e.target.value)}
          placeholder="e.g. Negotiated at $80/mo for high volume — contact via Slack"
        />

        {!isFree && (
          <s-banner tone="warning">
            <s-paragraph>
              {isEdit && store?.legacyPrice && store.legacyPrice !== numericPrice
                ? `Changing the price from $${store.legacyPrice} to $${numericPrice} will require the merchant to re-approve the subscription. Their existing subscription stays active until they approve the new one.`
                : `The merchant will need to approve a $${numericPrice}/month Shopify subscription on their billing page. Until then, they stay on the Free plan.`
              }
            </s-paragraph>
          </s-banner>
        )}
      </VStack>

      <s-button slot="primary-action" variant="primary" onClick={handleSave}>
        {isEdit ? "Save changes" : "Add store"}
      </s-button>
      {isEdit && storeIsEnterprise && (
        <s-button slot="secondary-actions" onClick={handleRemoveEnterprise}>
          Revert to standard
        </s-button>
      )}
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
