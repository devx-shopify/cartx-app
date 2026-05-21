import { useLoaderData, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getActivePlan,
  createSubscription,
  cancelSubscription,
  PLANS,
} from "../lib/billing.server.js";
import VStack from "../components/VStack.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const planData = await getActivePlan(admin, session.shop);
  return { planData };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();

  // Legacy stores cannot modify billing
  const planData = await getActivePlan(admin, session.shop);
  if (planData.isLegacy) {
    return { ok: false, error: "Your plan is managed externally" };
  }

  if (body._action === "subscribe") {
    const planKey = body.plan;
    if (!PLANS[planKey] || PLANS[planKey].amount === 0) {
      return { ok: false, error: "Invalid plan" };
    }
    const billingCycle = body.billing_cycle === "annual" ? "annual" : "monthly";
    const storeName = session.shop.replace(".myshopify.com", "");
    // eslint-disable-next-line no-undef
    const returnUrl = `https://admin.shopify.com/store/${storeName}/apps/${process.env.SHOPIFY_API_KEY}/app/billing`;
    const confirmationUrl = await createSubscription(admin, planKey, returnUrl, billingCycle);
    return { ok: true, confirmationUrl };
  }

  if (body._action === "cancel") {
    if (planData.subscriptionId) {
      await cancelSubscription(admin, planData.subscriptionId);
      return {
        ok: true,
        toast: "Subscription cancelled. You are now on the Free plan.",
      };
    }
    return { ok: false, error: "No active subscription" };
  }

  return { ok: false };
};

// Client-safe plan display data
const CLIENT_PLANS = {
  free: { name: "Free", amount: 0, amountAnnual: 0, trialDays: 0 },
  basic: { name: "Basic", amount: 150, amountAnnual: 1440, trialDays: 7 },
  max: { name: "Max", amount: 200, amountAnnual: 1920, trialDays: 7 },
};

const PLAN_ORDER = ["free", "basic", "max"];
const ANNUAL_DISCOUNT_PCT = 20;

const FEATURE_LIST = [
  { key: "drawer", label: "Cart drawer (progress bar, upsells, coupons)" },
  { key: "promotions", label: "Unlimited promotions" },
  { key: "discount_function", label: "Automatic gift discounts at checkout" },
  { key: "theme_switcher", label: "Multi-theme configuration" },
];

const PLAN_FEATURES = {
  free: { drawer: true, promotions: true, discount_function: false, theme_switcher: false },
  basic: { drawer: true, promotions: true, discount_function: true, theme_switcher: false },
  max: { drawer: true, promotions: true, discount_function: true, theme_switcher: true },
};

export default function BillingPage() {
  const { planData } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      open(fetcher.data.confirmationUrl, "_top");
    }
    if (fetcher.data?.toast) shopify.toast.show(fetcher.data.toast);
    if (fetcher.data?.error)
      shopify.toast.show(fetcher.data.error, { isError: true });
  }, [fetcher.data, shopify]);

  const [activePlanAction, setActivePlanAction] = useState(null);
  const submitting = fetcher.state !== "idle";
  const currentPlan = planData.plan;
  const currentCycle = planData.billingCycle ?? "monthly";
  // Default the toggle to the cycle the merchant is already on, so it's
  // immediately obvious what they're paying for.
  const [billingCycle, setBillingCycle] = useState(currentCycle);

  useEffect(() => {
    if (!submitting) setActivePlanAction(null);
  }, [submitting]);

  function handleSubscribe(planKey) {
    setActivePlanAction(planKey);
    fetcher.submit(
      JSON.stringify({ _action: "subscribe", plan: planKey, billing_cycle: billingCycle }),
      { method: "POST", encType: "application/json" },
    );
  }

  function handleCancel() {
    setActivePlanAction("free");
    fetcher.submit(JSON.stringify({ _action: "cancel" }), {
      method: "POST",
      encType: "application/json",
    });
  }

  // Legacy stores see a simple message
  if (planData.isLegacy) {
    return (
      <s-page heading="Plans & Billing" backAction={{ url: "/app" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <s-section>
            <VStack gap={400} style={{ alignItems: "center", textAlign: "center" }}>
              <s-badge tone="success">Max Plan</s-badge>
              <s-text fontWeight="bold">Your plan is managed externally</s-text>
              <s-paragraph color="subdued">
                You have full access to all cartx features. Your billing is handled outside of Shopify. If you have questions about your plan, please contact our team.
              </s-paragraph>
            </VStack>
          </s-section>
        </div>
      </s-page>
    );
  }

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  return (
    <s-page heading="Plans & Billing" backAction={{ url: "/app" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <VStack gap={600}>
          <s-banner tone="info">
            {`You are currently on the `}<strong>{CLIENT_PLANS[currentPlan]?.name || "Free"}</strong>{` plan`}
            {currentPlan !== "free" && currentCycle === "annual" ? ", billed annually" : ""}
            {`.${currentPlan === "free" ? " Upgrade to unlock discount functions and more." : ""}`}
          </s-banner>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            {PLAN_ORDER.map((planKey) => {
              const plan = CLIENT_PLANS[planKey];
              const isCurrent = currentPlan === planKey;
              const planIdx = PLAN_ORDER.indexOf(planKey);
              const isUpgrade = planIdx > currentIdx;
              const isDowngrade = planIdx < currentIdx;
              const isRecommended = planKey === "basic";

              return (
                <div
                  key={planKey}
                  style={{
                    border: isCurrent
                      ? "2px solid #2c6ecb"
                      : isRecommended
                        ? "2px solid #8c6bef"
                        : "1px solid #e3e3e3",
                    borderRadius: 12,
                    background: "#fff",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isRecommended && !isCurrent && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        background: "#8c6bef",
                        color: "#fff",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 0",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Most popular
                    </div>
                  )}

                  <div
                    style={{
                      paddingTop: isRecommended && !isCurrent ? 16 : 0,
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</span>
                      {isCurrent && <s-badge tone="success">Current</s-badge>}
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      {plan.amount === 0 ? (
                        <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>$0</span>
                      ) : billingCycle === "annual" ? (
                        <>
                          <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>
                            ${(plan.amountAnnual / 12).toFixed(0)}
                          </span>
                          <span style={{ fontSize: 14, color: "#6d7175", marginLeft: 2 }}>/mo</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}>${plan.amount}</span>
                          <span style={{ fontSize: 14, color: "#6d7175", marginLeft: 2 }}>/mo</span>
                        </>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 20, minHeight: 20 }}>
                      {plan.amount === 0 ? (
                        "Free forever"
                      ) : billingCycle === "annual" ? (
                        <span>Billed annually as <strong style={{ color: "#1a1a1a" }}>${plan.amountAnnual}</strong></span>
                      ) : plan.trialDays > 0 ? (
                        <span style={{ color: "#2c6ecb", fontWeight: 500 }}>{plan.trialDays}-day free trial</span>
                      ) : null}
                    </div>

                    <div style={{ borderTop: "1px solid #e3e3e3", margin: "0 0 16px" }} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                      {FEATURE_LIST.map((feat) => {
                        const has = PLAN_FEATURES[planKey][feat.key];
                        return (
                          <div key={feat.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                              {has ? (
                                <path d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z" fill="#1a8c33" />
                              ) : (
                                <path d="M4 8h8" stroke="#b0b0b0" strokeWidth="1.5" strokeLinecap="round" />
                              )}
                            </svg>
                            <span style={{ fontSize: 13, lineHeight: "18px", color: has ? "#1a1a1a" : "#8c8c8c" }}>
                              {feat.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: 24 }}>
                      {isCurrent ? (
                        currentPlan !== "free" ? (
                          billingCycle !== currentCycle ? (
                            <s-button
                              variant="primary"
                              onClick={() => handleSubscribe(planKey)}
                              fullWidth
                              {...(activePlanAction === planKey ? { loading: true, disabled: true } : submitting ? { disabled: true } : {})}
                            >
                              Switch to {billingCycle === "annual" ? "annual" : "monthly"} billing
                            </s-button>
                          ) : (
                            <s-button
                              tone="critical"
                              onClick={handleCancel}
                              fullWidth
                              {...(activePlanAction === "free" ? { loading: true, disabled: true } : submitting ? { disabled: true } : {})}
                            >
                              Cancel subscription
                            </s-button>
                          )
                        ) : (
                          <s-button disabled fullWidth>Current plan</s-button>
                        )
                      ) : isUpgrade ? (
                        <s-button
                          variant="primary"
                          onClick={() => handleSubscribe(planKey)}
                          fullWidth
                          {...(activePlanAction === planKey ? { loading: true, disabled: true } : submitting ? { disabled: true } : {})}
                        >
                          {currentPlan === "free" ? "Start free trial" : `Upgrade to ${plan.name}`}
                        </s-button>
                      ) : isDowngrade ? (
                        planKey === "free" ? (
                          <s-button
                            onClick={handleCancel}
                            fullWidth
                            {...(activePlanAction === "free" ? { loading: true, disabled: true } : submitting ? { disabled: true } : {})}
                          >
                            Downgrade to Free
                          </s-button>
                        ) : (
                          <s-button
                            onClick={() => handleSubscribe(planKey)}
                            fullWidth
                            {...(activePlanAction === planKey ? { loading: true, disabled: true } : submitting ? { disabled: true } : {})}
                          >
                            Switch to {plan.name}
                          </s-button>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </VStack>
      </div>
    </s-page>
  );
}

function BillingCycleToggle({ value, onChange }) {
  const options = [
    { id: "monthly", label: "Monthly" },
    { id: "annual", label: "Yearly" },
  ];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <div
        role="tablist"
        aria-label="Billing cycle"
        style={{
          display: "inline-flex",
          padding: 4,
          background: "#e4e5e7",
          borderRadius: 999,
          border: "1px solid #d4d6d8",
        }}
      >
        {options.map((opt) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(opt.id)}
              style={{
                minWidth: 110,
                padding: "8px 20px",
                borderRadius: 999,
                border: "none",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? "#1a1a1a" : "#5c5f62",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1,
          padding: "5px 9px",
          borderRadius: 999,
          background: "#daf3e1",
          color: "#0a6b2a",
          whiteSpace: "nowrap",
        }}
      >
        Save {ANNUAL_DISCOUNT_PCT}% with yearly
      </span>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
