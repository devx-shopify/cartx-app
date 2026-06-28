import { createCookieSessionStorage, redirect } from "react-router";
import db from "../db.server.js";
import { verifyPassword } from "./password.js";

// Standalone email/password auth for the /enterprise dashboard — independent of
// Shopify admin auth. Session is a signed, httpOnly cookie.
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SHOPIFY_API_SECRET ||
  "cartx-dev-insecure-secret-change-me";

const storage = createCookieSessionStorage({
  cookie: {
    name: "__cartx_admin",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    secrets: [SESSION_SECRET],
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

// Returns the AdminUser on success, null otherwise.
export async function login(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !password) return null;
  const user = await db.adminUser.findUnique({ where: { email: normalized } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export async function createUserSession(userId, redirectTo) {
  const session = await storage.getSession();
  session.set("adminUserId", userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

// Current admin user (or null) — safe fields only.
export async function getAdminUser(request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  const userId = session.get("adminUserId");
  if (!userId) return null;
  return db.adminUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
}

// Gate a loader/action — throws a redirect to the login page when signed out.
export async function requireAdmin(request) {
  const user = await getAdminUser(request);
  if (!user) throw redirect("/enterprise/login");
  return user;
}

export async function logout(request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return redirect("/enterprise/login", {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}
