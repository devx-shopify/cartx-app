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
import "../styles/app.css";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;
  const themes = await getAllThemes(admin);
  const selectedThemeId = await getSelectedTheme(shopId);

  const mainTheme = themes.find((t) => t.role === "MAIN");
  const activeThemeId = selectedThemeId || mainTheme?.id || "default";

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    themes,
    activeThemeId,
    mainThemeId: mainTheme?.id || "default",
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

    targetConfig.offers = structuredClone(sourceConfig.offers);
    targetConfig.coupons = structuredClone(sourceConfig.coupons);
    targetConfig.claim_gifts = structuredClone(sourceConfig.claim_gifts);

    await saveConfig(shopId, currentThemeId, targetConfig);
    return { ok: true, toast: "Promotions copied" };
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
  const [showCopy, setShowCopy] = useState(false);
  const [copySource, setCopySource] = useState("");
  const ref = useRef(null);

  const busy = fetcher.state !== "idle" || revalidator.state === "loading";
  const copying = busy && fetcher.formData;

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowCopy(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (fetcher.data?.toast) {
      setOpen(false);
      setShowCopy(false);
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
    setShowCopy(false);
  }

  function handleCopy() {
    if (!copySource) return;
    fetcher.submit(
      JSON.stringify({ _action: "copy_promotions", source_theme_id: copySource }),
      { method: "POST", encType: "application/json", action: "/app" }
    );
  }

  if (themes.length <= 1) return null;

  const isMain = activeThemeId === mainThemeId;
  const activeTheme = themes.find((t) => t.id === activeThemeId);
  const otherThemes = themes.filter((t) => t.id !== activeThemeId);

  return (
    <div className="cx-theme-trigger-wrap" ref={ref}>
      <button
        type="button"
        className={`cx-theme-trigger ${!isMain ? "cx-theme-trigger-draft" : ""} ${busy ? "cx-theme-trigger-busy" : ""}`}
        onClick={() => { if (!busy) { setOpen(!open); setShowCopy(false); } }}
        title={`Theme: ${activeTheme?.name || "Default"}`}
        disabled={busy}
      >
        {busy ? (
          <span className="cx-spinner" />
        ) : (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.764m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        )}
        {!isMain && !busy && <span className="cx-theme-trigger-dot" />}
      </button>

      {open && (
        <div className="cx-theme-dropdown">
          <div className="cx-theme-dropdown-header">
            <span className="cx-theme-dropdown-title">Switch theme</span>
            <span className="cx-theme-dropdown-hint">Select which theme to configure</span>
          </div>
          {themes.map((t) => {
            const selected = t.id === activeThemeId;
            const live = t.id === mainThemeId;
            return (
              <button
                key={t.id}
                type="button"
                className={`cx-theme-dropdown-item ${selected ? "cx-theme-dropdown-item-active" : ""}`}
                onClick={() => selectTheme(t.id)}
              >
                <div className="cx-theme-dropdown-item-info">
                  <span className="cx-theme-dropdown-item-name">{t.name}</span>
                  <span className={`cx-badge cx-badge-dot ${live ? "cx-badge-success" : "cx-badge-warning"}`} style={{ fontSize: 10 }}>
                    {live ? "Live" : ROLE_LABELS[t.role] || t.role}
                  </span>
                </div>
                {selected && (
                  <svg width="14" height="14" fill="none" stroke="var(--cx-primary)" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Copy promotions section */}
          <div className="cx-theme-dropdown-divider" />
          {!showCopy ? (
            <button
              type="button"
              className="cx-theme-dropdown-action"
              onClick={() => { setShowCopy(true); setCopySource(otherThemes[0]?.id || ""); }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy promotions from another theme
            </button>
          ) : (
            <div className="cx-theme-dropdown-copy">
              <span className="cx-theme-dropdown-copy-label">
                Copy all promotions into <strong>{activeTheme?.name}</strong> from:
              </span>
              <select
                className="cx-input cx-select"
                value={copySource}
                onChange={(e) => setCopySource(e.target.value)}
                style={{ fontSize: 13 }}
              >
                {otherThemes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id === mainThemeId ? "Live" : ROLE_LABELS[t.role] || t.role})
                  </option>
                ))}
              </select>
              <div className="cx-banner cx-banner-warning" style={{ fontSize: 11, padding: "6px 10px" }}>
                This will replace all existing promotions on {activeTheme?.name}.
              </div>
              <div className="cx-flex cx-gap-sm">
                <button
                  type="button"
                  className="cx-btn cx-btn-primary cx-btn-sm"
                  onClick={handleCopy}
                  disabled={copying || !copySource}
                >
                  {copying ? "Copying..." : "Copy promotions"}
                </button>
                <button
                  type="button"
                  className="cx-btn cx-btn-ghost cx-btn-sm"
                  onClick={() => setShowCopy(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { apiKey, themes, activeThemeId, mainThemeId } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/promotions">Promotions</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <Outlet context={{ themes, activeThemeId, mainThemeId }} />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
