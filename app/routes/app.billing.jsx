import { useLoaderData, useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getActivePlan,
  createSubscription,
  createEnterpriseSubscription,
  cancelSubscription,
  clearEnterpriseStatus,
  PLANS,
  ENTERPRISE_CONTACT_EMAIL,
} from "../lib/billing.server.js";
import VStack from "../components/VStack.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const planData = await getActivePlan(admin, session.shop);
  return { planData, enterpriseContactEmail: ENTERPRISE_CONTACT_EMAIL };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();

  const planData = await getActivePlan(admin, session.shop);

  const storeName = session.shop.replace(".myshopify.com", "");
  // eslint-disable-next-line no-undef
  const returnUrl = `https://admin.shopify.com/store/${storeName}/apps/${process.env.SHOPIFY_API_KEY}/app/billing`;

  // Enterprise approval — merchant accepts admin-set custom price
  if (body._action === "approve_enterprise") {
    if (
      !planData.isEnterprise ||
      !planData.quotedPrice ||
      planData.quotedPrice <= 0
    ) {
      return { ok: false, error: "No enterprise quote to approve" };
    }
    const confirmationUrl = await createEnterpriseSubscription(
      admin,
      returnUrl,
      planData.quotedPrice,
    );
    return { ok: true, confirmationUrl };
  }

  // Subscribing to a standard plan works for everyone, including Enterprise
  // merchants downgrading to Pro. STANDARD replacement behavior cancels the
  // existing (Enterprise) sub on approval; getActivePlan then drops Enterprise.
  if (body._action === "subscribe") {
    const planKey = body.plan;
    if (!PLANS[planKey] || PLANS[planKey].amount === 0) {
      return { ok: false, error: "Invalid plan" };
    }
    const billingCycle = body.billing_cycle === "annual" ? "annual" : "monthly";
    const confirmationUrl = await createSubscription(
      admin,
      planKey,
      returnUrl,
      billingCycle,
    );
    // Enterprise store switching to a standard plan: drop Enterprise so the
    // completed switch isn't re-prompted. If they abandon the approval, the
    // still-active Enterprise subscription keeps them on Enterprise (see
    // getActivePlan — an active Enterprise sub is authoritative).
    if (planData.isLegacy) {
      await clearEnterpriseStatus(session.shop);
    }
    return { ok: true, confirmationUrl };
  }

  if (body._action === "cancel") {
    if (planData.subscriptionId) {
      await cancelSubscription(admin, planData.subscriptionId);
    } else if (!planData.isLegacy) {
      return { ok: false, error: "No active subscription" };
    }
    // Cancelling an Enterprise plan also drops Enterprise status so the store
    // doesn't get re-prompted to approve the old quote.
    if (planData.isLegacy) {
      await clearEnterpriseStatus(session.shop);
    }
    return {
      ok: true,
      toast: "Subscription cancelled. You are now on the Free plan.",
    };
  }

  return { ok: false };
};

// Client-safe plan display data
const CLIENT_PLANS = {
  free: { name: "Free", amount: 0, amountAnnual: 0, trialDays: 0 },
  pro: { name: "Pro", amount: 150, amountAnnual: 1440, trialDays: 7 },
  enterprise: { name: "Enterprise", isEnterprise: true },
};

// Normal stores see a single Pro card (+ an Enterprise contact note). Stores
// the team has put on Enterprise also see their Enterprise plan and Pro.
const ANNUAL_DISCOUNT_PCT = 20;

const FEATURE_LIST = [
  { key: "drawer", label: "Cart drawer (progress bar, upsells, coupons)" },
  { key: "promotions", label: "Unlimited promotions" },
  { key: "discount_function", label: "Automatic gift discounts at checkout" },
  { key: "theme_switcher", label: "Multi-theme configuration" },
];

const ENTERPRISE_EXTRAS = [
  "Custom pricing & invoicing",
  "Priority support & SLA",
  "Onboarding assistance",
];

const PLAN_FEATURES = {
  free: {
    drawer: true,
    promotions: true,
    discount_function: false,
    theme_switcher: false,
  },
  pro: {
    drawer: true,
    promotions: true,
    discount_function: true,
    theme_switcher: true,
  },
  enterprise: {
    drawer: true,
    promotions: true,
    discount_function: true,
    theme_switcher: true,
  },
};

export default function BillingPage() {
  const { planData, enterpriseContactEmail } = useLoaderData();
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

  // Pro is always first, Enterprise always second — regardless of plan/amount.
  // For enterprise stores the Enterprise card shows their cartx-set price + a
  // cancel option; for everyone else it's a contact-only card (email to upgrade).
  const isEnterpriseStore = planData.isLegacy;
  const planOrder = ["pro", "enterprise"];

  useEffect(() => {
    if (!submitting) setActivePlanAction(null);
  }, [submitting]);

  function handleSubscribe(planKey) {
    setActivePlanAction(planKey);
    fetcher.submit(
      JSON.stringify({
        _action: "subscribe",
        plan: planKey,
        billing_cycle: billingCycle,
      }),
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

  // Enterprise — admin has set a custom price the merchant hasn't approved yet
  // (initial quote or a price change). Once approved, fall through to the full
  // plan picker so they can switch to Pro or cancel themselves.
  if (planData.isLegacy && planData.needsApproval) {
    return (
      <EnterprisePage
        planData={planData}
        fetcher={fetcher}
        submitting={submitting}
      />
    );
  }

  return (
    <s-page heading="Plans & Billing" backAction={{ url: "/app" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <VStack gap={600}>
          <s-banner tone="info">
            {`You are currently on the `}
            <strong>{CLIENT_PLANS[currentPlan]?.name || "Free"}</strong>
            {` plan`}
            {currentPlan === "enterprise" && planData.amount > 0
              ? ` at $${planData.amount}/mo`
              : ""}
            {currentPlan !== "free" && currentCycle === "annual"
              ? ", billed annually"
              : ""}
            {`.${
              currentPlan === "free"
                ? " Upgrade to unlock discount functions and more."
                : currentPlan === "enterprise"
                  ? " You can switch to Pro or cancel anytime below."
                  : ""
            }`}
          </s-banner>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <BillingCycleToggle
              value={billingCycle}
              onChange={setBillingCycle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                planOrder.length > 1 ? "1fr 1fr" : "minmax(0, 440px)",
              justifyContent: "center",
              gap: 16,
            }}
          >
            {planOrder.map((planKey) => {
              const plan = CLIENT_PLANS[planKey];
              const isEnterprise = plan.isEnterprise === true;
              const isCurrent = currentPlan === planKey;
              const isRecommended = planKey === "pro" && currentPlan === "free";

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
                  {isRecommended && (
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
                      paddingTop: isRecommended ? 16 : 0,
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {plan.name}
                      </span>
                      {isCurrent && <s-badge tone="success">Current</s-badge>}
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      {isEnterprise ? (
                        isEnterpriseStore ? (
                          <>
                            <span
                              style={{
                                fontSize: 32,
                                fontWeight: 700,
                                color: "#1a1a1a",
                              }}
                            >
                              {planData.amount > 0
                                ? `$${planData.amount}`
                                : "Free"}
                            </span>
                            {planData.amount > 0 && (
                              <span
                                style={{
                                  fontSize: 14,
                                  color: "#6d7175",
                                  marginLeft: 2,
                                }}
                              >
                                /mo
                              </span>
                            )}
                          </>
                        ) : (
                          <span
                            style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a" }}
                          >
                            Custom
                          </span>
                        )
                      ) : billingCycle === "annual" ? (
                        <>
                          <span
                            style={{
                              fontSize: 32,
                              fontWeight: 700,
                              color: "#1a1a1a",
                            }}
                          >
                            ${(plan.amountAnnual / 12).toFixed(0)}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              color: "#6d7175",
                              marginLeft: 2,
                            }}
                          >
                            /mo
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: 32,
                              fontWeight: 700,
                              color: "#1a1a1a",
                            }}
                          >
                            ${plan.amount}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              color: "#6d7175",
                              marginLeft: 2,
                            }}
                          >
                            /mo
                          </span>
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#6d7175",
                        marginBottom: 20,
                        minHeight: 20,
                      }}
                    >
                      {isEnterprise ? (
                        "Your custom plan, managed with the cartx team"
                      ) : billingCycle === "annual" ? (
                        <span>
                          Billed annually as{" "}
                          <strong style={{ color: "#1a1a1a" }}>
                            ${plan.amountAnnual}
                          </strong>
                        </span>
                      ) : plan.trialDays > 0 ? (
                        <span style={{ color: "#2c6ecb", fontWeight: 500 }}>
                          {plan.trialDays}-day free trial
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid #e3e3e3",
                        margin: "0 0 16px",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      {FEATURE_LIST.map((feat) => {
                        const has = PLAN_FEATURES[planKey][feat.key];
                        return (
                          <div
                            key={feat.key}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ flexShrink: 0, marginTop: 1 }}
                            >
                              {has ? (
                                <path
                                  d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z"
                                  fill="#1a8c33"
                                />
                              ) : (
                                <path
                                  d="M4 8h8"
                                  stroke="#b0b0b0"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>
                            <span
                              style={{
                                fontSize: 13,
                                lineHeight: "18px",
                                color: has ? "#1a1a1a" : "#8c8c8c",
                              }}
                            >
                              {feat.label}
                            </span>
                          </div>
                        );
                      })}
                      {isEnterprise &&
                        ENTERPRISE_EXTRAS.map((extra) => (
                          <div
                            key={extra}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              style={{ flexShrink: 0, marginTop: 1 }}
                            >
                              <path
                                d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z"
                                fill="#1a8c33"
                              />
                            </svg>
                            <span
                              style={{
                                fontSize: 13,
                                lineHeight: "18px",
                                color: "#1a1a1a",
                              }}
                            >
                              {extra}
                            </span>
                          </div>
                        ))}
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: 24 }}>
                      {isEnterprise ? (
                        isEnterpriseStore ? (
                          <s-button
                            tone="critical"
                            onClick={handleCancel}
                            fullWidth
                            {...(activePlanAction === "free"
                              ? { loading: true, disabled: true }
                              : submitting
                                ? { disabled: true }
                                : {})}
                          >
                            Cancel subscription
                          </s-button>
                        ) : (
                          <div style={{ textAlign: "center", fontSize: 13, color: "#6d7175" }}>
                            Email{" "}
                            <a
                              href={`mailto:${enterpriseContactEmail}?subject=${encodeURIComponent("Enterprise plan for my store")}`}
                              style={{ color: "#2c6ecb", fontWeight: 500 }}
                            >
                              {enterpriseContactEmail}
                            </a>
                            {" "}to upgrade
                          </div>
                        )
                      ) : isCurrent ? (
                        billingCycle !== currentCycle ? (
                          <s-button
                            variant="primary"
                            onClick={() => handleSubscribe(planKey)}
                            fullWidth
                            {...(activePlanAction === planKey
                              ? { loading: true, disabled: true }
                              : submitting
                                ? { disabled: true }
                                : {})}
                          >
                            Switch to{" "}
                            {billingCycle === "annual" ? "annual" : "monthly"}{" "}
                            billing
                          </s-button>
                        ) : (
                          <s-button
                            tone="critical"
                            onClick={handleCancel}
                            fullWidth
                            {...(activePlanAction === "free"
                              ? { loading: true, disabled: true }
                              : submitting
                                ? { disabled: true }
                                : {})}
                          >
                            Cancel subscription
                          </s-button>
                        )
                      ) : (
                        <s-button
                          variant="primary"
                          onClick={() => handleSubscribe(planKey)}
                          fullWidth
                          {...(activePlanAction === planKey
                            ? { loading: true, disabled: true }
                            : submitting
                              ? { disabled: true }
                              : {})}
                        >
                          {currentPlan === "free"
                            ? "Start free trial"
                            : currentPlan === "enterprise"
                              ? `Switch to ${plan.name}`
                              : `Upgrade to ${plan.name}`}
                        </s-button>
                      )}
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

function EnterprisePage({ planData, fetcher, submitting }) {
  const { quotedPrice = 0, approved, needsApproval, amount } = planData;
  const isFree = quotedPrice === 0;
  const priceChanged = approved === false && amount && amount !== quotedPrice;

  function handleApprove() {
    fetcher.submit(JSON.stringify({ _action: "approve_enterprise" }), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page heading="Plans & Billing" backAction={{ url: "/app" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <s-section>
          <VStack
            gap={500}
            style={{ alignItems: "center", textAlign: "center" }}
          >
            <s-badge tone="success">Enterprise plan</s-badge>

            {needsApproval ? (
              <>
                <s-text fontWeight="bold" variant="headingLg">
                  {priceChanged
                    ? "Your Enterprise plan price has changed"
                    : "Approve your Enterprise plan"}
                </s-text>
                <s-paragraph color="subdued">
                  {priceChanged
                    ? `Your custom price was updated from $${amount} to $${quotedPrice}/month. Approve the new subscription to continue — your current subscription stays active until you do.`
                    : `The cartx team has set up a custom Enterprise plan for your store at $${quotedPrice}/month. Approve the Shopify subscription to unlock all features.`}
                </s-paragraph>
                <div
                  style={{
                    background: "#f6f3ff",
                    border: "1px solid #d6c9f5",
                    borderRadius: 12,
                    padding: "20px 24px",
                    width: "100%",
                    maxWidth: 360,
                  }}
                >
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      color: "#1a1a1a",
                      lineHeight: 1.1,
                    }}
                  >
                    ${quotedPrice}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#6d7175",
                        marginLeft: 4,
                      }}
                    >
                      /mo
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6d7175" }}>
                    Billed monthly via Shopify
                  </div>
                </div>
                <s-button
                  variant="primary"
                  onClick={handleApprove}
                  {...(submitting ? { loading: true, disabled: true } : {})}
                >
                  Approve & subscribe
                </s-button>
                <s-text color="subdued" variant="bodySm">
                  You'll be redirected to Shopify's billing approval page.
                  Cancel anytime from this page.
                </s-text>
              </>
            ) : (
              <>
                <s-text fontWeight="bold" variant="headingLg">
                  {isFree
                    ? "You're on the Enterprise plan"
                    : `You're on Enterprise · $${amount || quotedPrice}/mo`}
                </s-text>
                <s-paragraph color="subdued">
                  {isFree
                    ? "You have full access to all cartx features, free of charge. Your plan is managed by the cartx team — contact us for any changes."
                    : `Your custom Enterprise plan is active and billed via Shopify. Contact the cartx team if you need to change your plan.`}
                </s-paragraph>
                <FeatureChecklist />
              </>
            )}
          </VStack>
        </s-section>
      </div>
    </s-page>
  );
}

function FeatureChecklist() {
  const items = [
    "Cart drawer (progress bar, upsells, coupons)",
    "Unlimited promotions",
    "Automatic gift discounts at checkout",
    "Multi-theme configuration",
    "Priority support",
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 8,
        alignItems: "flex-start",
        width: "100%",
        maxWidth: 360,
      }}
    >
      {items.map((label) => (
        <div
          key={label}
          style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path
              d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z"
              fill="#1a8c33"
            />
          </svg>
          <span style={{ fontSize: 13, lineHeight: "18px", color: "#1a1a1a" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
