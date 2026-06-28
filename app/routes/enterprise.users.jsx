import { useEffect, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  requireAdmin,
  listAdminUsers,
  createAdminUser,
  deleteAdminUser,
  changePassword,
  logout,
} from "../lib/admin-auth.server.js";

export const loader = async ({ request }) => {
  const user = await requireAdmin(request);
  const users = await listAdminUsers();
  return { users, user };
};

export const action = async ({ request }) => {
  const me = await requireAdmin(request);
  const form = await request.formData();
  const _action = form.get("_action");

  if (_action === "add_user") {
    const res = await createAdminUser({
      email: form.get("email"),
      password: form.get("password"),
      name: String(form.get("name") || "").trim() || null,
    });
    return res.ok ? { ok: true, toast: `Added ${String(form.get("email")).trim().toLowerCase()}` } : { error: res.error };
  }

  if (_action === "delete_user") {
    const res = await deleteAdminUser(form.get("id"), me.id);
    if (!res.ok) return { error: res.error };
    if (res.selfRemoved) return logout(request); // removed yourself → sign out
    return { ok: true, toast: "Admin removed." };
  }

  if (_action === "change_password") {
    const res = await changePassword(me.id, form.get("currentPassword"), form.get("newPassword"));
    return res.ok ? { ok: true, toast: "Password updated." } : { error: res.error };
  }

  return { error: "Unknown action." };
};

export default function EnterpriseUsers() {
  const { users, user } = useLoaderData();
  const actionData = useActionData();
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const [showAdd, setShowAdd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (actionData?.ok) { setShowAdd(false); setShowPwd(false); }
  }, [actionData]);

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <span style={s.brand}>cartx</span>
            <span style={s.headerTitle}>Admin users</span>
          </div>
          <div style={s.headerRight}>
            <a href="/enterprise" style={s.navLink}>Stores</a>
            <a href="/enterprise/audit" style={s.navLink}>Activity</a>
            <span style={s.userEmail}>{user.email}</span>
            <Form method="post" action="/enterprise/logout">
              <button type="submit" style={s.linkBtn}>Sign out</button>
            </Form>
          </div>
        </header>

        {actionData?.toast ? <div style={s.toastOk}>{actionData.toast}</div> : null}
        {actionData?.error ? <div style={s.toastErr}>{actionData.error}</div> : null}

        <div style={s.toolbar}>
          <button type="button" style={s.primaryBtn} onClick={() => { setShowAdd((v) => !v); setShowPwd(false); }}>
            + Add admin
          </button>
          <button type="button" style={s.secondaryBtn} onClick={() => { setShowPwd((v) => !v); setShowAdd(false); }}>
            Change my password
          </button>
        </div>

        {showAdd ? (
          <Form method="post" style={s.panel}>
            <div style={s.panelTitle}>Add admin</div>
            <div style={s.field}><label style={s.flabel}>Email</label>
              <input name="email" type="email" required style={s.finput} /></div>
            <div style={s.field}><label style={s.flabel}>Name (optional)</label>
              <input name="name" style={s.finput} /></div>
            <div style={s.field}><label style={s.flabel}>Password (min 8 chars)</label>
              <input name="password" type="password" required minLength={8} style={s.finput} /></div>
            <div style={s.panelActions}>
              <button type="submit" name="_action" value="add_user" disabled={busy} style={s.primaryBtn}>
                {busy ? "Adding…" : "Add admin"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} style={s.secondaryBtn}>Cancel</button>
            </div>
          </Form>
        ) : null}

        {showPwd ? (
          <Form method="post" style={s.panel}>
            <div style={s.panelTitle}>Change my password</div>
            <div style={s.field}><label style={s.flabel}>Current password</label>
              <input name="currentPassword" type="password" required style={s.finput} /></div>
            <div style={s.field}><label style={s.flabel}>New password (min 8 chars)</label>
              <input name="newPassword" type="password" required minLength={8} style={s.finput} /></div>
            <div style={s.panelActions}>
              <button type="submit" name="_action" value="change_password" disabled={busy} style={s.primaryBtn}>
                {busy ? "Saving…" : "Update password"}
              </button>
              <button type="button" onClick={() => setShowPwd(false)} style={s.secondaryBtn}>Cancel</button>
            </div>
          </Form>
        ) : null}

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr><Th>Admin</Th><Th>Last login</Th><Th>Added</Th><Th></Th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={s.row}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{u.email}{u.id === user.id ? " (you)" : ""}</div>
                    {u.name ? <div style={s.sub}>{u.name}</div> : null}
                  </td>
                  <td style={s.td}><span style={s.sub}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</span></td>
                  <td style={s.td}><span style={s.sub}>{new Date(u.createdAt).toLocaleDateString()}</span></td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    {users.length > 1 ? (
                      <Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" name="_action" value="delete_user" style={s.dangerLink}>
                          {u.id === user.id ? "Remove me" : "Remove"}
                        </button>
                      </Form>
                    ) : <span style={s.sub}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Th({ children }) { return <th style={s.th}>{children}</th>; }

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
  toolbar: { display: "flex", gap: 12 },
  primaryBtn: { padding: "10px 16px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  secondaryBtn: { padding: "10px 16px", background: "#fff", color: "#1a1a1a", border: "1px solid #c9cccf", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  linkBtn: { background: "none", border: "none", color: "#2c6ecb", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" },
  dangerLink: { background: "none", border: "none", color: "#b42318", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" },
  panel: { background: "#fff", border: "1px solid #e3e3e3", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 },
  panelTitle: { fontSize: 16, fontWeight: 600 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  flabel: { fontSize: 13, fontWeight: 500, color: "#1a1a1a" },
  finput: { padding: "10px 12px", border: "1px solid #c9cccf", borderRadius: 8, fontSize: 14, fontFamily: "inherit" },
  panelActions: { display: "flex", gap: 8, marginTop: 4 },
  tableWrap: { background: "#fff", border: "1px solid #e3e3e3", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e3e3e3", textTransform: "uppercase", letterSpacing: 0.3 },
  row: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", verticalAlign: "top" },
  sub: { fontSize: 12, color: "#6b7280" },
};
