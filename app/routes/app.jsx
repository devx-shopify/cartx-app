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
import { getActivePlan, hasFeature, ensureStoreRecord } from "../lib/billing.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;
  const themes = await getAllThemes(admin);
  const selectedThemeId = await getSelectedTheme(shopId);
  const mainTheme = themes.find((t) => t.role === "MAIN");
  const activeThemeId = selectedThemeId || mainTheme?.id || "default";

  // Ensure store record exists in DB (for legacy/billing tracking)
  await ensureStoreRecord(shopId);

  let planData = { plan: "free", isLegacy: false, features: { discount_function: false, theme_switcher: false } };
  try {
    planData = await getActivePlan(admin, shopId);
  } catch {
    // Default to free if billing query fails
  }

  // eslint-disable-next-line no-undef
  const isAdmin = shopId === process.env.ADMIN_SHOP;

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    themes,
    activeThemeId,
    mainThemeId: mainTheme?.id || "default",
    planData,
    isAdmin,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();

  if (body._action === "set_theme") {
    const planData = await getActivePlan(admin, session.shop);
    if (!hasFeature(planData, "theme_switcher")) {
      return { ok: false, error: "Upgrade to the Max plan to use the theme switcher" };
    }
    await setSelectedTheme(session.shop, body.theme_id || null);
    return { ok: true, themeId: body.theme_id };
  }

  if (body._action === "copy_promotions") {
    const planData = await getActivePlan(admin, session.shop);
    if (!hasFeature(planData, "theme_switcher")) {
      return { ok: false, error: "Upgrade to the Max plan to use the theme switcher" };
    }
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

  if (body._action === "copy_drawer") {
    const planData = await getActivePlan(admin, session.shop);
    if (!hasFeature(planData, "theme_switcher")) {
      return { ok: false, error: "Upgrade to the Max plan to use the theme switcher" };
    }
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
    <div style={{ position: "relative" }} ref={ref}>
      <s-button
        onClick={() => { if (!busy) { setOpen(!open); setShowCopy(false); } }}
        {...(busy ? { loading: true, disabled: true } : {})}
        accessibilityLabel={`Theme: ${activeTheme?.name || "Default"}`}
      >
        Theme
        {!isMain && !busy && (
          <s-badge tone="warning" style={{ marginLeft: 4 }}>Draft</s-badge>
        )}
      </s-button>

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

          <s-divider />
          {!showCopy ? (
            <div
              onClick={() => { setShowCopy(true); setCopySource(otherThemes[0]?.id || ""); }}
              style={{ padding: "10px 12px", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#2c6ecb" }}
            >
              Copy promotions from another theme
            </div>
          ) : (
            <s-box padding="300">
              <s-stack direction="block" gap="200">
                <s-text color="subdued" style={{ fontSize: 12 }}>
                  Copy all promotions into <strong>{activeTheme?.name}</strong> from:
                </s-text>
                <s-select label="" value={copySource} onChange={(e) => setCopySource(e.target.value)}>
                  {otherThemes.map((t) => (
                    <s-option key={t.id} value={t.id}>
                      {t.name} ({t.id === mainThemeId ? "Live" : ROLE_LABELS[t.role] || t.role})
                    </s-option>
                  ))}
                </s-select>
                <s-banner tone="warning">
                  This will replace all existing promotions on {activeTheme?.name}.
                </s-banner>
                <s-stack gap="200">
                  <s-button variant="primary" onClick={handleCopy} {...(copying ? { loading: true, disabled: true } : {})} disabled={!copySource}>
                    {copying ? "Copying..." : "Copy promotions"}
                  </s-button>
                  <s-button onClick={() => setShowCopy(false)}>Cancel</s-button>
                </s-stack>
              </s-stack>
            </s-box>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { apiKey, themes, activeThemeId, mainThemeId, planData, isAdmin } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/cart-customizer">Customize Cart</s-link>
        <s-link href="/app/promotions">Promotions</s-link>
        <s-link href="/app/settings">Settings</s-link>
        {!planData.isLegacy && <s-link href="/app/billing">Plans</s-link>}
        {isAdmin && <s-link href="/app/internal">Admin</s-link>}
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
