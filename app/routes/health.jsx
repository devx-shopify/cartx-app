// Public health check — no auth. Used by Fly's http health check (auto-restart
// a hung machine) and by the Sentry Uptime monitor (alert if the app is down).
//
// Verifies DB connectivity, since an app that can't reach Postgres can't serve
// real requests. Returns 200 when healthy, 503 otherwise. We deliberately do
// NOT report failures to Sentry here — this endpoint is polled frequently, and
// the Uptime monitor is the right place to alert on sustained downtime.
import db from "../db.server.js";

export const loader = async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok" }, { status: 200 });
  } catch {
    return Response.json({ status: "error", db: "down" }, { status: 503 });
  }
};
