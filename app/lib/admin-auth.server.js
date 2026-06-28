import { createCookieSessionStorage, redirect } from "react-router";
import db from "../db.server.js";
import { hashPassword, verifyPassword } from "./password.js";

// Standalone email/password auth for the /enterprise dashboard — independent of
// Shopify admin auth. Session is a signed, httpOnly cookie.
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SHOPIFY_API_SECRET ||
  "cartx-dev-insecure-secret-change-me";

// Login lockout: after MAX_FAILED consecutive failures, block this account for
// LOCK_MINUTES. Resets on a successful login.
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

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

// Attempt a login. Returns { user } on success, or { user: null, lockedUntil }
// (lockedUntil set when the account is currently locked or just got locked).
export async function login(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !password) return { user: null };

  const user = await db.adminUser.findUnique({ where: { email: normalized } });
  if (!user) return { user: null };

  // Currently locked out.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { user: null, lockedUntil: user.lockedUntil };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const failed = (user.failedAttempts || 0) + 1;
    const data = { failedAttempts: failed };
    if (failed >= MAX_FAILED) {
      data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      data.failedAttempts = 0;
    }
    await db.adminUser.update({ where: { id: user.id }, data });
    return { user: null, lockedUntil: data.lockedUntil || null };
  }

  // Success — clear counters, stamp last login.
  await db.adminUser.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { user };
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

// ── Admin user management (used by /enterprise/users) ──────

export async function listAdminUsers() {
  return db.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, lastLoginAt: true, createdAt: true },
  });
}

// Returns { ok } or { ok:false, error }.
export async function createAdminUser({ email, password, name }) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!password || String(password).length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const existing = await db.adminUser.findUnique({ where: { email: normalized } });
  if (existing) return { ok: false, error: "An admin with that email already exists." };
  await db.adminUser.create({
    data: { email: normalized, passwordHash: hashPassword(password), name: name || null },
  });
  return { ok: true };
}

// Prevent removing the last admin (would lock everyone out).
export async function deleteAdminUser(id, currentUserId) {
  const count = await db.adminUser.count();
  if (count <= 1) return { ok: false, error: "Can't remove the only admin." };
  await db.adminUser.delete({ where: { id } }).catch(() => {});
  return { ok: true, selfRemoved: id === currentUserId };
}

export async function changePassword(userId, currentPassword, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  const user = await db.adminUser.findUnique({ where: { id: userId } });
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return { ok: false, error: "Current password is incorrect." };
  }
  await db.adminUser.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { ok: true };
}
