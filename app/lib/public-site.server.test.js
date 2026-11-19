import { afterEach, describe, expect, it } from "vitest";
import { isHiddenPublicPath, assertPublicPageEnabled } from "./public-site.server.js";

const hidden = (path) => isHiddenPublicPath(new URL(path, "https://cartx.fly.dev"));

afterEach(() => {
  delete process.env.PUBLIC_SITE_DISABLED;
  delete process.env.PRIVACY_PAGE_DISABLED;
});

describe("public-site kill switch", () => {
  it("hides nothing when the switches are off", () => {
    for (const p of ["/", "/guide", "/enterprise", "/enterprise/login", "/privacy"]) {
      expect(hidden(p)).toBe(false);
    }
  });

  it("hides the marketing pages and the enterprise portal when PUBLIC_SITE_DISABLED is on", () => {
    process.env.PUBLIC_SITE_DISABLED = "1";
    for (const p of ["/", "/guide", "/guide/", "/enterprise", "/enterprise/", "/enterprise/login", "/enterprise/users", "/enterprise/audit", "/enterprise/logout"]) {
      expect(hidden(p), p).toBe(true);
    }
  });

  it("never hides the routes installed stores depend on", () => {
    process.env.PUBLIC_SITE_DISABLED = "true";
    process.env.PRIVACY_PAGE_DISABLED = "true";
    for (const p of ["/app", "/app/promotions", "/auth/login", "/proxy/evaluate-cart", "/webhooks/orders/create", "/api/discounts", "/health", "/robots.txt", "/enterprisey", "/guidebook"]) {
      expect(hidden(p), p).toBe(false);
    }
  });

  it("keeps Shopify's /?shop= entry into the app working", () => {
    process.env.PUBLIC_SITE_DISABLED = "1";
    expect(hidden("/?shop=demo.myshopify.com&host=abc")).toBe(false);
  });

  it("keeps /privacy up unless PRIVACY_PAGE_DISABLED is set", () => {
    process.env.PUBLIC_SITE_DISABLED = "1";
    expect(hidden("/privacy")).toBe(false);
    process.env.PRIVACY_PAGE_DISABLED = "yes";
    expect(hidden("/privacy")).toBe(true);
  });

  it("treats unrecognised values as off", () => {
    process.env.PUBLIC_SITE_DISABLED = "0";
    expect(hidden("/")).toBe(false);
    process.env.PUBLIC_SITE_DISABLED = "false";
    expect(hidden("/guide")).toBe(false);
  });

  it("assertPublicPageEnabled throws a bare noindex 404", () => {
    process.env.PUBLIC_SITE_DISABLED = "1";
    let thrown;
    try {
      assertPublicPageEnabled(new Request("https://cartx.fly.dev/guide"));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect(thrown.status).toBe(404);
    expect(thrown.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(() => assertPublicPageEnabled(new Request("https://cartx.fly.dev/app"))).not.toThrow();
  });
});
