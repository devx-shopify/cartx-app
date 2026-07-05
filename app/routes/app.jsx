import { useState, useRef, useEffect } from "react";
import { Outlet, useLoaderData, useRouteError, useFetcher, useRevalidator } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import {
  getAllThemes,
  getSelectedTheme,
  setSelectedTheme,
  loadConfig,
  saveConfig,
  getShopAndTheme,
} from "../lib/config.server.js";
import { getActivePlan, ensureStoreRecord, syncShopSettings } from "../lib/billing.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;
  const themes = await getAllThemes(admin);
  const selectedThemeId = await getSelectedTheme(shopId);
  const mainTheme = themes.find((t) => t.role === "MAIN");
  const activeThemeId = selectedThemeId || mainTheme?.id || "default";

  // Ensure store record exists in DB (for legacy/billing tracking)
  await ensureStoreRecord(shopId);
  // Sync currency + timezone so analytics formats money correctly and the
  // rollup cron buckets events into the merchant's local days. Best-effort.
  try {
    await syncShopSettings(admin, shopId);
  } catch {
    // Non-fatal — dashboard falls back to USD/UTC until the next load.
  }

  let planData = { plan: "free", isLegacy: false, features: { discount_function: false, theme_switcher: false } };
  try {
    planData = await getActivePlan(admin, shopId);
  } catch {
    // Default to free if billing query fails
  }

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    themes,
    activeThemeId,
    mainThemeId: mainTheme?.id || "default",
    planData,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();

  if (body._action === "set_theme") {
    await setSelectedTheme(session.shop, body.theme_id || null);
    return { ok: true, themeId: body.theme_id };
  }

  if (body._action === "copy_promotions") {
    const preferred = await getSelectedTheme(session.shop);
    const { shopId, themeId: currentThemeId } = await getShopAndTheme(admin, session, preferred);
    const sourceThemeId = body.source_theme_id;

    if (!sourceThemeId || sourceThemeId === currentThemeId) {
      return { ok: false, error: "Source and target themes are the same" };
    }

    const sourceConfig = await loadConfig(shopId, sourceThemeId);
    const targetConfig = await loadConfig(shopId, currentThemeId);
    // Copy the FULL merchant configuration — promotions AND settings — so
    // applying a theme is a one-click clone, not manual re-entry. Everything a
    // merchant configures lives under these keys.
    const COPY_KEYS = [
      "offers", "coupons", "claim_gifts",
      "drawer", "progress_bar", "upsells", "bottom_ribbon",
      "cross_page_removal_behavior",
    ];
    for (const key of COPY_KEYS) {
      if (sourceConfig[key] !== undefined) targetConfig[key] = structuredClone(sourceConfig[key]);
    }
    await saveConfig(shopId, currentThemeId, targetConfig);
    return { ok: true, toast: "Settings & promotions copied" };
  }

  if (body._action === "copy_drawer") {
    const preferred = await getSelectedTheme(session.shop);
    const { shopId, themeId: currentThemeId } = await getShopAndTheme(admin, session, preferred);
    const sourceThemeId = body.source_theme_id;

    if (!sourceThemeId || sourceThemeId === currentThemeId) {
      return { ok: false, error: "Source and target themes are the same" };
    }

    const sourceConfig = await loadConfig(shopId, sourceThemeId);
    const targetConfig = await loadConfig(shopId, currentThemeId);
    targetConfig.drawer = structuredClone(sourceConfig.drawer);
    await saveConfig(shopId, currentThemeId, targetConfig);
    return { ok: true, toast: "Drawer settings copied" };
  }

  return { ok: false };
};

const ROLE_LABELS = {
  MAIN: "Live",
  UNPUBLISHED: "Draft",
  DEMO: "Trial",
  DEVELOPMENT: "Dev",
};

export function ThemeSwitcher({ themes, activeThemeId, mainThemeId }) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const busy = fetcher.state !== "idle" || revalidator.state === "loading";

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (fetcher.data?.toast) {
      setOpen(false);
      revalidator.revalidate();
    }
  }, [fetcher.data, revalidator]);

  function selectTheme(themeId) {
    const saveId = themeId === mainThemeId ? "" : themeId;
    fetcher.submit(
      JSON.stringify({ _action: "set_theme", theme_id: saveId }),
      { method: "POST", encType: "application/json", action: "/app" }
    );
    setTimeout(() => revalidator.revalidate(), 300);
    setOpen(false);
  }

  if (themes.length <= 1) return null;

  const isMain = activeThemeId === mainThemeId;
  const activeTheme = themes.find((t) => t.id === activeThemeId);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        type="button"
        onClick={() => { if (!busy) setOpen(!open); }}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${activeTheme?.name || "Default"}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px 6px 12px",
          borderRadius: 999,
          border: "1px solid var(--s-color-border, #e3e3e3)",
          background: open ? "var(--s-color-bg-surface-secondary, #f6f6f7)" : "var(--s-color-bg-surface, #ffffff)",
          color: "var(--s-color-text, #1a1a1a)",
          fontSize: 13,
          fontWeight: 500,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
          transition: "background 0.12s ease, border-color 0.12s ease",
        }}
        onMouseOver={(e) => { if (!busy && !open) e.currentTarget.style.background = "var(--s-color-bg-surface-secondary, #f6f6f7)"; }}
        onMouseOut={(e) => { if (!busy && !open) e.currentTarget.style.background = "var(--s-color-bg-surface, #ffffff)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span style={{ color: "var(--s-color-text-secondary, #6d7175)" }}>Theme</span>
        <span style={{ fontWeight: 600 }}>{activeTheme?.name || "Default"}</span>
        {!isMain && !busy && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1,
              padding: "3px 7px",
              borderRadius: 999,
              background: "#fff4d6",
              color: "#7a5a00",
            }}
          >
            Draft
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            background: "#fff",
            border: "1px solid #e3e3e3",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e3e3e3" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>Switch theme</div>
            <div style={{ fontSize: 12, color: "#6d7175", marginTop: 2 }}>Select which theme to configure</div>
          </div>

          {themes.map((t) => {
            const selected = t.id === activeThemeId;
            const live = t.id === mainThemeId;
            return (
              <div
                key={t.id}
                onClick={() => selectTheme(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: selected ? "#f1f8ff" : "transparent",
                  borderBottom: "1px solid #e3e3e3",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 13, color: "#1a1a1a" }}>{t.name}</span>
                  <s-badge tone={live ? "success" : "warning"}>
                    {live ? "Live" : ROLE_LABELS[t.role] || t.role}
                  </s-badge>
                </div>
                {selected && (
                  <svg width="14" height="14" fill="none" stroke="var(--s-color-text-brand)" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}

// Roomy "copy config from another theme" card — lives on the Settings page (the
// theme dropdown was too cramped for it). Copies the full merchant config
// (promotions + settings) into the theme currently being edited.
export function ThemeCopyCard({ themes, activeThemeId, mainThemeId }) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [copySource, setCopySource] = useState("");

  const busy = fetcher.state !== "idle" || revalidator.state === "loading";
  const copying = busy && fetcher.formData;

  useEffect(() => {
    if (fetcher.data?.toast) revalidator.revalidate();
  }, [fetcher.data, revalidator]);

  if (!themes || themes.length <= 1) return null;

  const activeTheme = themes.find((t) => t.id === activeThemeId);
  const otherThemes = themes.filter((t) => t.id !== activeThemeId);
  const source = copySource || otherThemes[0]?.id || "";

  function handleCopy() {
    if (!source) return;
    fetcher.submit(
      JSON.stringify({ _action: "copy_promotions", source_theme_id: source }),
      { method: "POST", encType: "application/json", action: "/app" }
    );
  }

  return (
    <s-section heading="Copy from another theme">
      <s-stack direction="block" gap="300">
        <s-text color="subdued">
          Copy all promotions and settings — offers, coupons, gifts, drawer design,
          progress bar, upsells, and ribbon — from another theme into the theme
          you're currently editing (<strong>{activeTheme?.name || "current"}</strong>).
          Switch the target theme from the theme selector on the Home page.
        </s-text>
        <s-select label="Copy from" value={source} onChange={(e) => setCopySource(e.target.value)}>
          {otherThemes.map((t) => (
            <s-option key={t.id} value={t.id}>
              {t.name} ({t.id === mainThemeId ? "Live" : ROLE_LABELS[t.role] || t.role})
            </s-option>
          ))}
        </s-select>
        <s-banner tone="warning">
          This replaces all existing promotions and settings on {activeTheme?.name || "the current theme"}.
        </s-banner>
        <div>
          <s-button variant="primary" onClick={handleCopy} {...(copying ? { loading: true, disabled: true } : {})} disabled={!source}>
            {copying ? "Copying…" : "Copy everything"}
          </s-button>
        </div>
      </s-stack>
    </s-section>
  );
}

export default function App() {
  const { apiKey, themes, activeThemeId, mainThemeId, planData } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/cart-customizer">Customize Cart</s-link>
        <s-link href="/app/promotions">Promotions</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/billing">Plans</s-link>
      </s-app-nav>
      <Outlet context={{ themes, activeThemeId, mainThemeId, planData }} />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
