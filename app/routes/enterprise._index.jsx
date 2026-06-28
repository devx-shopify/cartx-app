import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import db from "../db.server.js";
import { requireAdmin } from "../lib/admin-auth.server.js";

export const loader = async ({ request }) => {
  const user = await requireAdmin(request);
  const stores = await db.store.findMany({ orderBy: { createdAt: "desc" } });
  return { stores, user };
};

export const action = async ({ request }) => {
  await requireAdmin(request);
  const form = await request.formData();
  const _action = form.get("_action");
  const storeDomain = String(form.get("storeDomain") || "").trim().toLowerCase();

  if (_action === "upsert_enterprise") {
    if (!storeDomain) return { error: "Store domain is required." };
    const raw = form.get("price");
    const price = raw != null && raw !== "" ? parseInt(raw, 10) : 0;
    if (Number.isNaN(price) || price < 0) return { error: "Price must be 0 or higher." };
    const notes = String(form.get("notes") || "").trim() || null;
    const store = await db.store.upsert({
      where: { storeDomain },
      create: { storeDomain, planTier: "enterprise", billingMethod: "shopify", isLegacy: true, legacyPrice: price, notes },
      update: { planTier: "enterprise", billingMethod: "shopify", isLegacy: true, legacyPrice: price, notes },
    });
    const label = price === 0 ? "Free" : `$${price}/mo`;
    return { ok: true, toast: `${store.storeDomain} set to Enterprise · ${label}` };
  }

  if (_action === "remove_enterprise") {
    if (!storeDomain) return { error: "Store domain is required." };
    await db.store.update({
      where: { storeDomain },
      data: { planTier: "free", billingMethod: "shopify", isLegacy: false, legacyPrice: null },
    });
    return { ok: true, toast: `${storeDomain} reverted to standard billing.` };
  }

  if (_action === "delete") {
    if (!storeDomain) return { error: "Store domain is required." };
    await db.store.delete({ where: { storeDomain } }).catch(() => {});
    return { ok: true, toast: `${storeDomain} removed.` };
  }

  return { error: "Unknown action." };
};

function isEnterprise(s) {
  return s.isLegacy === true || s.planTier === "enterprise";
}

export default function EnterpriseDashboard() {
  const { stores, user } = useLoaderData();
  const actionData = useActionData();
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  // `editing`: undefined = panel closed, null = adding new, object = editing a store
  const [editing, setEditing] = useState(undefined);
  const [search, setSearch] = useState("");

  // Close the panel once an action succeeds.
  useEffect(() => {
    if (actionData?.ok) setEditing(undefined);
  }, [actionData]);

  const enterprise = stores.filter(isEnterprise);
  const standard = stores.filter((s) => !isEnterprise(s));
  const mrr = enterprise.reduce((sum, s) => sum + (s.legacyPrice || 0), 0);

  const filtered = stores.filter(
    (s) =>
      !search ||
      s.storeDomain.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main style={s.page}>
      <div style={s.shell}>
        {/* Header */}
        <header style={s.header}>
          <div>
            <span style={s.brand}>cartx</span>
            <span style={s.headerTitle}>Store Management</span>
          </div>
          <div style={s.headerRight}>
            <a href="/enterprise/users" style={s.navLink}>Admin users</a>
            <span style={s.userEmail}>{user.email}</span>
            <Form method="post" action="/enterprise/logout">
              <button type="submit" style={s.linkBtn}>Sign out</button>
            </Form>
          </div>
        </header>

        {/* Flash */}
        {actionData?.toast ? <div style={s.toastOk}>{actionData.toast}</div> : null}
        {actionData?.error ? <div style={s.toastErr}>{actionData.error}</div> : null}

        {/* Stats */}
        <div style={s.stats}>
          <Stat label="Total stores" value={stores.length} />
          <Stat label="Enterprise" value={enterprise.length} accent="#1a8c33" />
          <Stat label="Standard" value={standard.length} accent="#2c6ecb" />
          <Stat label="Enterprise MRR" value={`$${mrr.toLocaleString()}`} accent="#5e32e2" />
        </div>

        {/* Toolbar */}
        <div style={s.toolbar}>
          <input
            placeholder="Search by domain or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.search}
          />
          <button type="button" style={s.primaryBtn} onClick={() => setEditing(null)}>
            + Add enterprise store
          </button>
        </div>

        {/* Add / Edit panel */}
        {editing !== undefined ? (
          <StoreForm store={editing} busy={busy} onCancel={() => setEditing(undefined)} />
        ) : null}

        {/* Table */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <Th>Store</Th>
                <Th>Plan</Th>
                <Th>Price</Th>
                <Th>Notes</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={s.empty}>
                    {search ? "No stores match your search." : "No stores yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((store) => {
                  const ent = isEnterprise(store);
                  const price = store.legacyPrice ?? 0;
                  return (
                    <tr key={store.id} style={s.row}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600 }}>{store.storeDomain}</div>
                        <div style={s.sub}>Added {new Date(store.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td style={s.td}>
                        <span style={ent ? s.badgeEnt : s.badgeStd}>
                          {ent ? "Enterprise" : store.planTier === "pro" ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td style={s.td}>
                        {ent ? (price === 0 ? <span style={s.sub}>Free</span> : <span style={{ fontWeight: 500 }}>${price}/mo</span>) : <span style={s.sub}>—</span>}
                      </td>
                      <td style={s.td}><span style={s.sub}>{store.notes || "—"}</span></td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        <button type="button" style={s.linkBtn} onClick={() => setEditing(store)}>Edit</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StoreForm({ store, busy, onCancel }) {
  const isEdit = !!store;
  return (
    <Form method="post" style={s.panel}>
      <div style={s.panelTitle}>{isEdit ? `Edit ${store.storeDomain}` : "Add enterprise store"}</div>
      <p style={s.panelHint}>
        {isEdit
          ? "Update enterprise pricing. The merchant is billed via Shopify at the price you set, and must approve any change on their billing page."
          : "Set a custom-priced Enterprise plan. The merchant will see an approval prompt on their billing page (until then they stay on Free). $0 = full features, free."}
      </p>

      <div style={s.field}>
        <label style={s.flabel}>Store domain</label>
        <input
          name="storeDomain"
          defaultValue={store?.storeDomain || ""}
          placeholder="brand.myshopify.com"
          readOnly={isEdit}
          required
          style={{ ...s.finput, ...(isEdit ? s.readonly : {}) }}
        />
      </div>

      <div style={s.field}>
        <label style={s.flabel}>Monthly price (USD)</label>
        <input
          name="price"
          type="number"
          min="0"
          defaultValue={store?.legacyPrice != null ? String(store.legacyPrice) : "200"}
          style={s.finput}
        />
      </div>

      <div style={s.field}>
        <label style={s.flabel}>Internal notes</label>
        <input
          name="notes"
          defaultValue={store?.notes || ""}
          placeholder="e.g. Negotiated $80/mo for high volume"
          style={s.finput}
        />
      </div>

      <div style={s.panelActions}>
        <button type="submit" name="_action" value="upsert_enterprise" disabled={busy} style={s.primaryBtn}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add store"}
        </button>
        <button type="button" onClick={onCancel} style={s.secondaryBtn}>Cancel</button>
        {isEdit ? (
          <>
            <button type="submit" name="_action" value="remove_enterprise" style={s.secondaryBtn}>Revert to standard</button>
            <button type="submit" name="_action" value="delete" style={s.dangerBtn}>Delete store</button>
          </>
        ) : null}
      </div>
    </Form>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || "#1a1a1a", lineHeight: 1.2 }}>{value}</div>
      <div style={s.sub}>{label}</div>
    </div>
  );
}

function Th({ children }) {
  return <th style={s.th}>{children}</th>;
}

const s = {
  page: { minHeight: "100vh", background: "#f6f6f7", fontFamily: "Inter, system-ui, sans-serif", padding: "24px 16px" },
  shell: { maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand: { fontFamily: "'Instrument Serif', serif", fontSize: 28, color: "#1a1a1a", marginRight: 12 },
  headerTitle: { fontSize: 15, fontWeight: 600, color: "#42474c" },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  navLink: { fontSize: 13, fontWeight: 500, color: "#2c6ecb", textDecoration: "none" },
  userEmail: { fontSize: 13, color: "#6b7280" },
  toastOk: { background: "#eafaf0", border: "1px solid #aee4c4", color: "#136c39", padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  toastErr: { background: "#fdecec", border: "1px solid #f5c2c2", color: "#b42318", padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  stats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  statCard: { background: "#fff", border: "1px solid #e3e3e3", borderRadius: 12, padding: 16 },
  toolbar: { display: "flex", gap: 12, alignItems: "center" },
  search: { flex: 1, padding: "10px 12px", border: "1px solid #c9cccf", borderRadius: 8, fontSize: 14, fontFamily: "inherit" },
  primaryBtn: { padding: "10px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  secondaryBtn: { padding: "10px 16px", background: "#fff", color: "#1a1a1a", border: "1px solid #c9cccf", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  dangerBtn: { padding: "10px 16px", background: "#fff", color: "#b42318", border: "1px solid #f0b4b4", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  linkBtn: { background: "none", border: "none", color: "#2c6ecb", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" },
  panel: { background: "#fff", border: "1px solid #e3e3e3", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  panelTitle: { fontSize: 16, fontWeight: 600 },
  panelHint: { fontSize: 13, color: "#6b7280", margin: 0 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  flabel: { fontSize: 13, fontWeight: 500, color: "#1a1a1a" },
  finput: { padding: "10px 12px", border: "1px solid #c9cccf", borderRadius: 8, fontSize: 14, fontFamily: "inherit" },
  readonly: { background: "#f6f6f7", color: "#6b7280" },
  panelActions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 },
  tableWrap: { background: "#fff", border: "1px solid #e3e3e3", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e3e3e3", textTransform: "uppercase", letterSpacing: 0.3 },
  row: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", verticalAlign: "top" },
  sub: { fontSize: 12, color: "#6b7280" },
  empty: { padding: 40, textAlign: "center", color: "#6b7280" },
  badgeEnt: { background: "#eafaf0", color: "#136c39", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
  badgeStd: { background: "#eef3fb", color: "#2c6ecb", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
};
