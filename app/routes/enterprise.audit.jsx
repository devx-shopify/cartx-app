import { Form, useLoaderData } from "react-router";
import { requireAdmin } from "../lib/admin-auth.server.js";
import { recentAudit } from "../lib/audit.server.js";

const ACTION_LABELS = {
  set_enterprise_price: "Set enterprise price",
  revert_enterprise: "Reverted to standard",
  reset_onboarding: "Reset onboarding",
  delete_store: "Deleted store",
};

export const loader = async ({ request }) => {
  const user = await requireAdmin(request);
  const entries = await recentAudit(200);
  return { entries, user };
};

export default function EnterpriseAudit() {
  const { entries, user } = useLoaderData();
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <span style={s.brand}>cartx</span>
            <span style={s.headerTitle}>Activity log</span>
          </div>
          <div style={s.headerRight}>
            <a href="/enterprise" style={s.navLink}>Stores</a>
            <a href="/enterprise/users" style={s.navLink}>Admin users</a>
            <span style={s.userEmail}>{user.email}</span>
            <Form method="post" action="/enterprise/logout">
              <button type="submit" style={s.linkBtn}>Sign out</button>
            </Form>
          </div>
        </header>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr><Th>When</Th><Th>Admin</Th><Th>Action</Th><Th>Store</Th><Th>Detail</Th></tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={5} style={s.empty}>No activity yet.</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} style={s.row}>
                    <td style={s.td}><span style={s.sub}>{new Date(e.createdAt).toLocaleString()}</span></td>
                    <td style={s.td}>{e.actorEmail}</td>
                    <td style={s.td}>{ACTION_LABELS[e.action] || e.action}</td>
                    <td style={s.td}><span style={s.sub}>{e.storeDomain || "—"}</span></td>
                    <td style={s.td}><span style={s.sub}>{e.detail || "—"}</span></td>
                  </tr>
                ))
              )}
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
  linkBtn: { background: "none", border: "none", color: "#2c6ecb", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, fontFamily: "inherit" },
  tableWrap: { background: "#fff", border: "1px solid #e3e3e3", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e3e3e3", textTransform: "uppercase", letterSpacing: 0.3 },
  row: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", verticalAlign: "top" },
  sub: { fontSize: 12, color: "#6b7280" },
  empty: { padding: 40, textAlign: "center", color: "#6b7280" },
};
