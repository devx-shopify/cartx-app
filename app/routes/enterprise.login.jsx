import { Form, redirect, useActionData, useNavigation } from "react-router";
import { getAdminUser, login, createUserSession } from "../lib/admin-auth.server.js";

export const loader = async ({ request }) => {
  const user = await getAdminUser(request);
  if (user) throw redirect("/enterprise");
  return null;
};

export const action = async ({ request }) => {
  const form = await request.formData();
  const user = await login(form.get("email"), form.get("password"));
  if (!user) return { error: "Invalid email or password." };
  return createUserSession(user.id, "/enterprise");
};

export default function EnterpriseLogin() {
  const actionData = useActionData();
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main style={styles.page}>
      <Form method="post" style={styles.card}>
        <div style={styles.brand}>cartx</div>
        <div style={styles.subtitle}>Enterprise admin</div>

        {actionData?.error ? (
          <div role="alert" style={styles.error}>{actionData.error}</div>
        ) : null}

        <label style={styles.label}>
          Email
          <input name="email" type="email" required autoComplete="username" style={styles.input} />
        </label>
        <label style={styles.label}>
          Password
          <input name="password" type="password" required autoComplete="current-password" style={styles.input} />
        </label>

        <button type="submit" disabled={busy} style={{ ...styles.button, ...(busy ? styles.buttonBusy : {}) }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </Form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f6f6f7",
    fontFamily: "Inter, system-ui, sans-serif",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    background: "#fff",
    border: "1px solid #e3e3e3",
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  brand: { fontFamily: "'Instrument Serif', serif", fontSize: 40, lineHeight: 1, color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: -8, marginBottom: 8 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 500, color: "#1a1a1a" },
  input: {
    padding: "10px 12px",
    border: "1px solid #c9cccf",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
  },
  button: {
    marginTop: 8,
    padding: "11px 16px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  buttonBusy: { opacity: 0.6, cursor: "default" },
  error: {
    background: "#fdecec",
    border: "1px solid #f5c2c2",
    color: "#b42318",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 13,
  },
};
