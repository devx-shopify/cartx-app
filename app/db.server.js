import { PrismaClient } from "@prisma/client";

// Augment the connection string with conservative pool settings so the app
// doesn't overwhelm a small Postgres (2 web + 2 cron machines share it) and so
// transient hiccups fail fast instead of hanging. Only fills in params that
// aren't already present in DATABASE_URL.
function buildDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const defaults = {
      connection_limit: "5", // max pooled connections per app instance
      pool_timeout: "10", // seconds to wait for a free connection
      connect_timeout: "10", // seconds to wait establishing a connection
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    return raw; // non-URL form (shouldn't happen) — use as-is
  }
}

function makeClient() {
  const url = buildDatabaseUrl();
  return new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
}

const prisma = global.prismaGlobal ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
