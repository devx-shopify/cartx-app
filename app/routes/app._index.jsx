import { useLoaderData, useFetcher, useOutletContext, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ThemeSwitcher } from "./app.jsx";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { getFreebieDiscountStatus } from "../lib/discount.server.js";
import { getOnboarding, skipOnboarding, markStep, setOnboardingTheme } from "../lib/onboarding.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);

  const activePromotions = [];
  for (const offer of config.offers) {
    if (offer.enabled) activePromotions.push({ name: offer.name, type: "Offer", id: offer.id });
  }
  for (const coupon of config.coupons) {
    if (coupon.enabled) activePromotions.push({ name: coupon.is_automatic ? coupon.title : coupon.code, type: "Coupon", id: coupon.id });
  }
  for (const gift of config.claim_gifts) {
    if (gift.enabled) activePromotions.push({ name: gift.name, type: "Claim Gift", id: gift.id });
  }

  let discountFunctionActive = false;
  try {
    const dfStatus = await getFreebieDiscountStatus(admin, session.shop);
    discountFunctionActive = dfStatus.active;
  } catch {
    // Function may not be deployed yet
  }

  const onboarding = await getOnboarding(session.shop);

  return {
    totalPromotions: config.offers.length + config.coupons.length + config.claim_gifts.length,
    activePromotions,
    progressBarEnabled: config.progress_bar.enabled,
    upsellsEnabled: config.upsells.enabled,
    upsellsCount: config.upsells.products.length,
    bottomRibbonEnabled: config.bottom_ribbon.enabled,
    milestonesCount: config.progress_bar.visual_milestones.length,
    discountFunctionActive,
    onboarding,
    shopDomain: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  if (body._action === "skip_onboarding") {
    await skipOnboarding(session.shop);
    return { ok: true };
  }

  if (body._action === "mark_step") {
    await markStep(session.shop, body.step);
    return { ok: true };
  }

  if (body._action === "set_onboarding_theme") {
    await setOnboardingTheme(session.shop, body.themeId);
    return { ok: true };
  }

  if (body._action === "toggle_progress_bar") config.progress_bar.enabled = !config.progress_bar.enabled;
  else if (body._action === "toggle_upsells") config.upsells.enabled = !config.upsells.enabled;
  else if (body._action === "toggle_ribbon") config.bottom_ribbon.enabled = !config.bottom_ribbon.enabled;

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

/* ── Setup Guide ──────────────────────────────────────────── */

const SETUP_STEPS = [
  {
    key: "offer_created",
    title: "Create your first promotion",
    description: "Add a free gift offer, BOGO deal, or spend-threshold reward to start increasing your average order value.",
    buttonLabel: "Create promotion",
    estimate: "2 min",
    type: "navigate",
    href: "/app/promotions/new?type=offer",
    accent: "#5E32E2",
    illustration: (color) => (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M20 12v8.5a.5.5 0 01-.5.5h-15a.5.5 0 01-.5-.5V12M2.5 7.5h19a.5.5 0 01.5.5v3.5a.5.5 0 01-.5.5h-19a.5.5 0 01-.5-.5V8a.5.5 0 01.5-.5zM12 21V7.5M12 7.5H7.75a2.25 2.25 0 110-4.5C10.75 3 12 7.5 12 7.5zM12 7.5h4.25a2.25 2.25 0 100-4.5C13.25 3 12 7.5 12 7.5z"
          stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "settings_configured",
    title: "Configure your settings",
    description: "Set up the progress bar milestones, upsell products, and the bottom ribbon to customize the cart drawer experience.",
    buttonLabel: "Open settings",
    estimate: "3 min",
    type: "navigate",
    href: "/app/settings",
    accent: "#0E7C66",
    illustration: (color) => (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h11M3 12h7M3 18h13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="17" cy="6" r="2.25" stroke={color} strokeWidth="1.6" fill="#fff" />
        <circle cx="13" cy="12" r="2.25" stroke={color} strokeWidth="1.6" fill="#fff" />
        <circle cx="19" cy="18" r="2.25" stroke={color} strokeWidth="1.6" fill="#fff" />
      </svg>
    ),
  },
  {
    key: "app_enabled",
    title: "Enable the app on your theme",
    description: "We'll open the theme editor with the cartx app embed pre-toggled on — just click Save in the top right to activate the cart drawer on your storefront.",
    buttonLabel: "Open theme editor",
    estimate: "1 min",
    type: "theme_editor",
    accent: "#B7791F",
    illustration: (color) => (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M3.5 9l1.25-4.5a.5.5 0 01.48-.36h13.54a.5.5 0 01.48.36L20.5 9M3.5 9v11a.5.5 0 00.5.5h16a.5.5 0 00.5-.5V9M3.5 9h17"
          stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 13.5h5v6.5h-5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "previewed",
    title: "Preview your cart drawer",
    description: "Visit your storefront to see how the cart drawer looks and works for your customers.",
    buttonLabel: "Preview store",
    estimate: "1 min",
    type: "preview",
    accent: "#1F6FEB",
    illustration: (color) => (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.6" />
      </svg>
    ),
  },
];

function StepIndicator({ done, active }) {
  if (done) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0, display: "block" }}>
        <circle cx="11" cy="11" r="11" fill="var(--s-color-bg-fill-success, #29845a)" />
        <path d="M16 8 9.5 14.5 6.5 11.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (active) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0, display: "block" }}>
        <circle cx="11" cy="11" r="10" stroke="var(--s-color-border-brand, #2c6ecb)" strokeWidth="2" fill="#fff" />
        <circle cx="11" cy="11" r="4" fill="var(--s-color-border-brand, #2c6ecb)" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0, display: "block" }}>
      <circle cx="11" cy="11" r="10" stroke="var(--s-color-border, #c9cccf)" strokeWidth="1.5" fill="#fff" />
    </svg>
  );
}

const THEME_ROLE_LABELS = {
  MAIN: "Live",
  UNPUBLISHED: "Draft",
  DEMO: "Trial",
  DEVELOPMENT: "Dev",
};

function StepIllustration({ accent, render }) {
  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: 16,
        background: `${accent}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {render(accent)}
    </div>
  );
}

function SetupGuide({ steps, completedCount, totalSteps, previewUrl, navigate, submitAction, shopDomain, apiKey, themes, mainThemeId, shopify, selectedThemeId }) {
  const [expandedStep, setExpandedStep] = useState(() => {
    const firstIncomplete = SETUP_STEPS.find((s) => !steps[s.key]);
    return firstIncomplete?.key || SETUP_STEPS[0].key;
  });
  const [collapsed, setCollapsed] = useState(false);

  const progressPct = (completedCount / totalSteps) * 100;
  const allDone = completedCount === totalSteps;

  function pickThemeAndOpen(themeId) {
    const numericId = String(themeId).split("/").pop();
    const url = `https://${shopDomain}/admin/themes/${numericId}/editor?context=apps&template=index&activateAppId=${apiKey}/app-embed`;
    open(url, "_top");
    shopify.modal.hide("cartx-theme-picker");
    submitAction("set_onboarding_theme", { themeId });
  }

  return (
    <s-section padding="none">
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 18px",
          borderBottom: !collapsed ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
            <s-button
              variant="tertiary"
              accessibilityLabel={collapsed ? "Expand setup guide" : "Collapse setup guide"}
              onClick={() => setCollapsed(!collapsed)}
              icon={collapsed ? "chevron-end" : "chevron-down"}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
              <s-text fontWeight="bold" variant="headingMd">Setup guide</s-text>
              <s-text color="subdued" variant="bodySm">
                Use this guide to get cartx live on your store.
              </s-text>
            </div>
          </div>
          <s-button variant="tertiary" onClick={() => submitAction("skip_onboarding")}>
            Dismiss
          </s-button>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: "var(--s-color-bg-surface-secondary, #f1f1f1)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: allDone
                  ? "var(--s-color-bg-fill-success, #29845a)"
                  : "linear-gradient(90deg, #2c6ecb 0%, #5E32E2 100%)",
                borderRadius: 999,
                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          <div style={{ minWidth: 88, textAlign: "right" }}>
            <s-text color="subdued" variant="bodySm">
              {completedCount} of {totalSteps} complete
            </s-text>
          </div>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div>
          {SETUP_STEPS.map((step, idx) => {
            const done = steps[step.key];
            const isExpanded = expandedStep === step.key;
            const isLast = idx === SETUP_STEPS.length - 1;

            return (
              <div
                key={step.key}
                style={{
                  borderBottom: !isLast ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                  background: isExpanded ? "var(--s-color-bg-surface-secondary, #f7f7f7)" : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                <s-clickable onClick={() => setExpandedStep(isExpanded ? null : step.key)}>
                  <div
                    style={{
                      padding: "16px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      cursor: "pointer",
                    }}
                  >
                    <StepIndicator done={done} active={isExpanded && !done} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <s-text
                        fontWeight={isExpanded || done ? "semibold" : "medium"}
                        color={done ? "subdued" : undefined}
                      >
                        {step.title}
                      </s-text>
                    </div>
                    {!done && (
                      <div style={{ opacity: 0.6 }}>
                        <s-text color="subdued" variant="bodySm">{step.estimate}</s-text>
                      </div>
                    )}
                    <s-icon name={isExpanded ? "chevron-down" : "chevron-end"} />
                  </div>
                </s-clickable>

                {isExpanded && (
                  <div style={{ padding: "0 24px 22px 60px" }}>
                    {step.type === "preview" && !selectedThemeId ? (
                      <div style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ flex: 1, maxWidth: 520 }}>
                          <s-banner tone="warning" heading="Enable the cartx app embed first">
                            <s-paragraph>
                              We can't preview the cart drawer until you've turned on the cartx app embed on one of your themes. Open the theme editor, pick a theme, and click Save to activate it.
                            </s-paragraph>
                            <div style={{ marginTop: 10 }}>
                              <s-button onClick={() => shopify.modal.show("cartx-theme-picker")}>
                                Enable cartx on a theme
                              </s-button>
                            </div>
                          </s-banner>
                        </div>
                        <StepIllustration accent={step.accent} render={step.illustration} />
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: 24,
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
                          <s-text color="subdued">{step.description}</s-text>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                            <s-button
                              variant={done ? "secondary" : "primary"}
                              onClick={() => {
                                if (step.type === "navigate") {
                                  navigate(step.href);
                                } else if (step.type === "theme_editor") {
                                  shopify.modal.show("cartx-theme-picker");
                                } else if (step.type === "preview") {
                                  const numericId = String(selectedThemeId).split("/").pop();
                                  const url = `https://${shopDomain}?preview_theme_id=${numericId}`;
                                  open(url, "_blank");
                                  if (!done) submitAction("mark_step", step.key);
                                }
                              }}
                            >
                              {step.buttonLabel}
                            </s-button>
                            {!done && (
                              <s-button
                                variant="tertiary"
                                onClick={() => submitAction("mark_step", step.key)}
                              >
                                I've already done this
                              </s-button>
                            )}
                          </div>
                        </div>
                        <StepIllustration accent={step.accent} render={step.illustration} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <s-modal id="cartx-theme-picker" heading="Choose a theme">
        <s-paragraph>
          We'll open the editor with the cartx app embed pre-toggled on. Just hit <strong>Save</strong> in the editor to activate it on the storefront.
        </s-paragraph>
        <div
          style={{
            marginTop: 14,
            border: "1px solid var(--s-color-border, #e3e3e3)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {themes.map((theme, i) => {
            const isLive = theme.id === mainThemeId;
            const roleLabel = THEME_ROLE_LABELS[theme.role] || theme.role;
            return (
              <s-clickable key={theme.id} onClick={() => pickThemeAndOpen(theme.id)}>
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    borderBottom: i < themes.length - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <s-text fontWeight="medium">{theme.name}</s-text>
                    <s-badge tone={isLive ? "success" : undefined}>{roleLabel}</s-badge>
                  </div>
                  <s-icon name="chevron-end" />
                </div>
              </s-clickable>
            );
          })}
        </div>
        <s-button slot="footer-secondary" onClick={() => shopify.modal.hide("cartx-theme-picker")}>
          Cancel
        </s-button>
      </s-modal>
    </s-section>
  );
}

const PROMO_BADGE_TONE = {
  Offer: "info",
  Coupon: "info",
  "Claim Gift": "success",
};

export default function Dashboard() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const { themes, activeThemeId, mainThemeId, planData } = useOutletContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Updated");
  }, [fetcher.data, shopify]);

  function handleToggle(actionName) {
    fetcher.submit(JSON.stringify({ _action: actionName }), {
      method: "POST",
      encType: "application/json",
    });
  }

  function submitAction(actionName, stepKeyOrExtra) {
    let payload;
    if (typeof stepKeyOrExtra === "string") {
      payload = { _action: actionName, step: stepKeyOrExtra };
    } else if (stepKeyOrExtra && typeof stepKeyOrExtra === "object") {
      payload = { _action: actionName, ...stepKeyOrExtra };
    } else {
      payload = { _action: actionName };
    }
    fetcher.submit(JSON.stringify(payload), {
      method: "POST",
      encType: "application/json",
    });
  }

  const { onboarding } = data;
  const showWizard = !onboarding.completed;
  const steps = onboarding.steps;
  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalSteps = Object.keys(steps).length;
  const hasActivePromotions = data.activePromotions.length > 0;

  // Build storefront preview URL
  const storeHandle = data.shopDomain?.replace(".myshopify.com", "");
  const previewUrl = storeHandle ? `https://${data.shopDomain}?cartx_preview=true` : null;

  const features = [
    { title: "Progress Bar", enabled: data.progressBarEnabled, action: "toggle_progress_bar", meta: `${data.milestonesCount} milestone${data.milestonesCount !== 1 ? "s" : ""}` },
    { title: "Upsells", enabled: data.upsellsEnabled, action: "toggle_upsells", meta: `${data.upsellsCount} product${data.upsellsCount !== 1 ? "s" : ""}` },
    { title: "Bottom Ribbon", enabled: data.bottomRibbonEnabled, action: "toggle_ribbon", meta: data.bottomRibbonEnabled ? "Enabled" : "Disabled" },
  ];

  return (
    <s-page heading="cartx">
      <s-button slot="primary-action" variant="primary" onClick={() => navigate("/app/promotions/new?type=offer")}>
        Create promotion
      </s-button>

      <s-stack direction="block" gap="base">
        {/* Theme switcher row — Max only */}
        {planData?.features?.theme_switcher && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
          </div>
        )}

        {/* Onboarding setup guide */}
        {showWizard && (
          <SetupGuide
            steps={steps}
            completedCount={completedCount}
            totalSteps={totalSteps}
            previewUrl={previewUrl}
            navigate={navigate}
            submitAction={submitAction}
            shopDomain={data.shopDomain}
            apiKey={data.apiKey}
            themes={themes}
            mainThemeId={mainThemeId}
            shopify={shopify}
            selectedThemeId={onboarding.selectedThemeId}
          />
        )}

        {/* Dashboard */}
        {!showWizard && (
          <>
            {/* Stats row — single card */}
            <s-section padding="none">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
                {[
                  { label: "Promotions", value: data.totalPromotions },
                  { label: "Active", value: data.activePromotions.length },
                  { label: "Milestones", value: data.milestonesCount },
                  { label: "Upsell Products", value: data.upsellsCount },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: "20px 24px",
                      borderRight: i < 3 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                    }}
                  >
                    <s-text color="subdued" variant="bodyXs">{stat.label}</s-text>
                    <div style={{ marginTop: 4 }}>
                      <s-text fontWeight="bold" variant="headingLg">{stat.value}</s-text>
                    </div>
                  </div>
                ))}
              </div>
            </s-section>

            {/* Main grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
              {/* Active promotions */}
              <s-section padding="none">
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <s-text fontWeight="bold">Active promotions</s-text>
                    <s-button variant="tertiary" onClick={() => navigate("/app/promotions")}>View all</s-button>
                  </div>
                </div>
                {hasActivePromotions ? (
                  <>
                    {data.activePromotions.slice(0, 5).map((promo, i) => (
                      <div
                        key={promo.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 20px",
                          borderBottom: i < Math.min(data.activePromotions.length, 5) - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{ fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                            onClick={() => navigate(`/app/promotions/${promo.id}`)}
                          >{promo.name}</span>
                          <s-badge tone={PROMO_BADGE_TONE[promo.type]}>{promo.type}</s-badge>
                        </div>
                        <s-badge tone="success">Active</s-badge>
                      </div>
                    ))}
                    {data.activePromotions.length > 5 && (
                      <div style={{ textAlign: "center", padding: "12px 20px", borderTop: "1px solid var(--s-color-border, #e3e3e3)" }}>
                        <s-button variant="tertiary" onClick={() => navigate("/app/promotions")}>
                          View all {data.activePromotions.length} promotions
                        </s-button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <s-stack direction="block" gap="300" alignItems="center">
                      <s-text fontWeight="semibold">No active promotions</s-text>
                      <s-text color="subdued">Enable an existing promotion or create a new one.</s-text>
                      <div style={{ marginTop: 4 }}>
                        <s-button variant="primary" onClick={() => navigate("/app/promotions/new?type=offer")}>Create promotion</s-button>
                      </div>
                    </s-stack>
                  </div>
                )}
              </s-section>

              {/* Sidebar — consolidated */}
              <s-stack direction="block" gap="base">
                {/* Quick settings — single card */}
                <s-section padding="none">
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <s-text fontWeight="bold">Quick settings</s-text>
                      <s-button variant="tertiary" onClick={() => navigate("/app/settings")}>Settings</s-button>
                    </div>
                  </div>
                  {features.map((feature, i) => (
                    <div
                      key={feature.title}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 20px",
                        borderBottom: i < features.length - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none",
                      }}
                    >
                      <div>
                        <s-text fontWeight="medium">{feature.title}</s-text>
                        <div><s-text color="subdued" variant="bodyXs">{feature.meta}</s-text></div>
                      </div>
                      <s-switch
                        label={feature.title}
                        labelAccessibilityVisibility="hidden"
                        checked={feature.enabled}
                        onChange={() => handleToggle(feature.action)}
                      />
                    </div>
                  ))}
                </s-section>

                {/* Gift Discount */}
                <s-section padding="400">
                  <s-stack direction="block" gap="200">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <s-text fontWeight="semibold">Gift Discount</s-text>
                      {planData?.features?.discount_function ? (
                        <s-badge tone={data.discountFunctionActive ? "success" : "warning"}>
                          {data.discountFunctionActive ? "Active" : "Inactive"}
                        </s-badge>
                      ) : (
                        <s-badge tone="warning">Basic</s-badge>
                      )}
                    </div>
                    <s-text color="subdued" variant="bodyXs">
                      {planData?.features?.discount_function
                        ? (data.discountFunctionActive ? "Auto-discounts gifts at checkout" : "Not configured")
                        : "Upgrade to auto-discount gift items"
                      }
                    </s-text>
                    {planData?.features?.discount_function ? (
                      <s-button variant="tertiary" onClick={() => navigate("/app/promotions?tab=offer")}>Manage offers</s-button>
                    ) : (
                      <s-button variant="tertiary" onClick={() => navigate("/app/billing")}>Upgrade</s-button>
                    )}
                  </s-stack>
                </s-section>
              </s-stack>
            </div>
          </>
        )}
      </s-stack>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
