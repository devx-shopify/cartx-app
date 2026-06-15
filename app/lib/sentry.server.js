// Lightweight, resilient Sentry wrapper.
//
// Design goals:
// - Never break the app. If @sentry/node isn't installed or SENTRY_DSN isn't
//   set, every export here is a safe no-op.
// - One init per process. Both the web server (entry.server) and the cron
//   scripts (rollup/retention) call initSentry() on startup.
//
// Setup: `npm install` (adds @sentry/node) and set the SENTRY_DSN env var.
// Optional: SENTRY_ENVIRONMENT, SENTRY_TRACES_SAMPLE_RATE.

let Sentry = null;
let initPromise = null;

export function initSentry() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!process.env.SENTRY_DSN) return null;
    try {
      const mod = await import("@sentry/node");
      mod.init({
        dsn: process.env.SENTRY_DSN,
        environment:
          process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
      });
      Sentry = mod;
      return Sentry;
    } catch (err) {
      console.error(
        "[cartx][sentry] init failed — is @sentry/node installed? Continuing without error reporting.",
        err,
      );
      Sentry = null;
      return null;
    }
  })();
  return initPromise;
}

export function captureException(error, context) {
  try {
    if (Sentry) Sentry.captureException(error, context);
  } catch {
    // Reporting must never throw.
  }
}

// Flush buffered events before a short-lived process (cron script) exits.
export async function flushSentry(timeout = 2000) {
  try {
    if (Sentry) await Sentry.flush(timeout);
  } catch {
    // ignore
  }
}
