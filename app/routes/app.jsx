import { Outlet, useLoaderData, useRouteError, useFetcher, useRevalidator } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import {
  getAllThemes,
  getSelectedTheme,
  setSelectedTheme,
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
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  if (body._action === "set_theme") {
    await setSelectedTheme(session.shop, body.theme_id || null);
    return { ok: true, themeId: body.theme_id };
  }

  return { ok: false };
};

const ROLE_LABELS = {
  MAIN: "Live",
  UNPUBLISHED: "Draft",
  DEMO: "Trial",
  DEVELOPMENT: "Dev",
};

function ThemeSwitcher({ themes, activeThemeId, mainThemeId }) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  function handleChange(e) {
    const themeId = e.target.value;
    const saveId = themeId === mainThemeId ? "" : themeId;
    fetcher.submit(
      JSON.stringify({ _action: "set_theme", theme_id: saveId }),
      { method: "POST", encType: "application/json" }
    );
    // Revalidate all loaders after saving so child routes re-fetch with new theme
    setTimeout(() => revalidator.revalidate(), 300);
  }

  if (themes.length <= 1) return null;

  const isMain = activeThemeId === mainThemeId;

  return (
    <div className="cx-theme-switcher">
      <div className="cx-theme-switcher-inner">
        <div className="cx-flex cx-items-center cx-gap-sm">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, color: 'var(--cx-mid-grey)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.764m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
          <span className="cx-theme-switcher-label">Editing theme:</span>
          <select
            className="cx-theme-switcher-select"
            value={activeThemeId}
            onChange={handleChange}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({ROLE_LABELS[t.role] || t.role})
              </option>
            ))}
          </select>
        </div>
        {!isMain && (
          <span className="cx-badge cx-badge-warning" style={{ fontSize: 10 }}>
            Draft
          </span>
        )}
      </div>
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
      <ThemeSwitcher
        themes={themes}
        activeThemeId={activeThemeId}
        mainThemeId={mainThemeId}
      />
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
