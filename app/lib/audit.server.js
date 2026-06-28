import db from "../db.server.js";

// Record an /enterprise admin action. Best-effort — never block the action.
export async function logAudit({ actorEmail, action, storeDomain = null, detail = null }) {
  try {
    await db.auditLog.create({
      data: { actorEmail, action, storeDomain, detail },
    });
  } catch (err) {
    console.error("[cartx] audit log failed:", err);
  }
}

export async function recentAudit(limit = 100) {
  return db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
