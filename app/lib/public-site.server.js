// Kill switch for cartx's public (non-app) pages.
//
//   PUBLIC_SITE_DISABLED=1   -> "/", "/guide" and "/enterprise/*" return a bare 404
//   PRIVACY_PAGE_DISABLED=1  -> "/privacy" returns a bare 404 too (off by default:
//                               the policy covers data we still process for
//                               installed stores, so check with legal first)
//
// Set/unset with `fly secrets set|unset ... -a cartx` (restarts the machines).
//
// Only the marketing/portal pages are gated. The routes installed stores depend
// on (/app, /auth, /proxy, /webhooks, /api, /health) are never touched, and
// "/?shop=..." still redirects into the app because that is how Shopify sends
// merchants in.

const isOn = (value) => /^(1|true|yes|on)$/i.test(String(value ?? "").trim());

export function isHiddenPublicPath(url) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (isOn(process.env.PUBLIC_SITE_DISABLED)) {
    if (pathname === "/") return !url.searchParams.has("shop");
    if (pathname === "/guide") return true;
    if (pathname === "/enterprise" || pathname.startsWith("/enterprise/")) return true;
  }

  if (isOn(process.env.PRIVACY_PAGE_DISABLED) && pathname === "/privacy") return true;

  return false;
}

export function notFoundResponse() {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Call first in the loader/action of every gated route. entry.server.jsx swaps
// document responses for a bare 404, but loaders and actions still run before
// it (and alone for client-side .data requests), so they must refuse too — e.g.
// the enterprise login action must not issue a session while the portal is off.
export function assertPublicPageEnabled(request) {
  if (isHiddenPublicPath(new URL(request.url))) throw notFoundResponse();
}
