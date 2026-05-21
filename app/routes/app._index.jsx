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
import { getOnboarding, skipOnboarding, markStep } from "../lib/onboarding.server.js";

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
    type: "navigate",
    href: "/app/promotions/new?type=offer",
  },
  {
    key: "settings_configured",
    title: "Configure your settings",
    description: "Set up the progress bar milestones, upsell products, and the bottom ribbon to customize the cart drawer experience.",
    buttonLabel: "Open settings",
    type: "navigate",
    href: "/app/settings",
  },
  {
    key: "app_enabled",
    title: "Enable the app on your theme",
    description: "Open the theme editor, find cartx in the App embeds section, and toggle it on. This activates the cart drawer on your storefront.",
    buttonLabel: "Open theme editor",
    type: "theme_editor",
  },
  {
    key: "previewed",
    title: "Preview your cart drawer",
    description: "Visit your storefront to see how the cart drawer looks and works for your customers.",
    buttonLabel: "Preview store",
    type: "preview",
  },
];

function SetupGuide({ steps, completedCount, totalSteps, previewUrl, navigate, submitAction, shopDomain }) {
  const [expandedStep, setExpandedStep] = useState(() => {
    const firstIncomplete = SETUP_STEPS.find((s) => !steps[s.key]);
    return firstIncomplete?.key || SETUP_STEPS[0].key;
  });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <s-section padding="none">
      {/* Header */}
      <s-box padding="base">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-button
              variant="tertiary"
              accessibilityLabel={collapsed ? "Expand setup guide" : "Collapse setup guide"}
              onClick={() => setCollapsed(!collapsed)}
              icon={collapsed ? "chevron-end" : "chevron-down"}
            />
            <s-stack direction="block" gap="extra-small">
              <s-text fontWeight="bold">Setup guide</s-text>
              <s-text color="subdued">{completedCount} of {totalSteps} tasks complete</s-text>
            </s-stack>
          </s-stack>
          <s-button variant="tertiary" onClick={() => submitAction("skip_onboarding")}>
            Dismiss
          </s-button>
        </s-stack>
      </s-box>

      {/* Progress */}
      {!collapsed && (
        <s-box paddingInline="base" paddingBlockEnd="small">
          <div style={{
            display: "flex", gap: 6,
          }}>
            {SETUP_STEPS.map((step) => (
              <div key={step.key} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: steps[step.key]
                  ? "var(--s-color-bg-fill-success, #29845a)"
                  : "var(--s-color-bg-surface-secondary, #e3e3e3)",
                transition: "background 0.3s ease",
              }} />
            ))}
          </div>
        </s-box>
      )}

      {/* Steps */}
      {!collapsed && (
        <s-box paddingInline="small" paddingBlockEnd="small">
          <s-stack direction="block" gap="none">
            {SETUP_STEPS.map((step) => {
              const done = steps[step.key];
              const isExpanded = expandedStep === step.key;

              return (
                <div key={step.key}>
                  {/* Step row — always visible */}
                  <s-box
                    padding="small"
                    borderRadius="base"
                    background={isExpanded ? "bg-surface-secondary" : undefined}
                  >
                    <s-stack direction="block" gap="small">
                      {/* Clickable header */}
                      <s-clickable onClick={() => setExpandedStep(isExpanded ? null : step.key)}>
                        <s-stack direction="inline" gap="small" alignItems="center">
                          {/* Circle indicator */}
                          {done ? (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                              <circle cx="10" cy="10" r="10" fill="var(--s-color-bg-fill-success, #29845a)" />
                              <path d="M14.5 7 8.5 13 5.5 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : isExpanded ? (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                              <circle cx="10" cy="10" r="9" stroke="var(--s-color-border-brand, #2c6ecb)" strokeWidth="2" strokeDasharray="4 2" />
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                              <circle cx="10" cy="10" r="9" stroke="var(--s-color-border, #c9cccf)" strokeWidth="1.5" />
                            </svg>
                          )}
                          <s-text
                            fontWeight={isExpanded ? "semibold" : "regular"}
                            color={done ? "subdued" : undefined}
                          >
                            {step.title}
                          </s-text>
                        </s-stack>
                      </s-clickable>

                      {/* Expanded content */}
                      {isExpanded && !done && (
                        <s-box paddingInlineStart="700">
                          <s-stack direction="block" gap="300">
                            <s-text color="subdued">{step.description}</s-text>
                            <s-stack direction="inline" gap="small">
                              <s-button
                                variant="primary"
                                onClick={() => {
                                  if (step.type === "navigate") {
                                    navigate(step.href);
                                  } else if (step.type === "theme_editor") {
                                    const editorUrl = `https://${shopDomain}/admin/themes/current/editor?context=apps`;
                                    open(editorUrl, "_top");
                                    submitAction("mark_step", step.key);
                                  } else if (step.type === "preview") {
                                    if (previewUrl) open(previewUrl, "_blank");
                                    submitAction("mark_step", step.key);
                                  }
                                }}
                              >
                                {step.buttonLabel}
                              </s-button>
                            </s-stack>
                          </s-stack>
                        </s-box>
                      )}
                    </s-stack>
                  </s-box>
                </div>
              );
            })}
          </s-stack>
        </s-box>
      )}
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

  function submitAction(actionName, stepKey) {
    const payload = { _action: actionName };
    if (stepKey) payload.step = stepKey;
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
