import db from "../db.server.js";

// ── Plan Definitions ─────────────────────────────────────

// Annual prices = monthly × 12 × 0.8 (20% discount).
// Amounts are sent to Shopify as USD decimals.
export const PLANS = {
  free: {
    name: "Free",
    amount: 0,
    features: {
      discount_function: false,
      theme_switcher: false,
    },
  },
  pro: {
    name: "Pro",
    amount: 150.0,
    amountAnnual: 1440.0, // 150 × 12 × 0.8
    trialDays: 7,
    features: {
      discount_function: true,
      theme_switcher: true,
    },
  },
};

export const ENTERPRISE_CONTACT_EMAIL = "ansh.varshney@devxlabs.ai";

const INTERVAL_BY_CYCLE = {
  monthly: "EVERY_30_DAYS",
  annual: "ANNUAL",
};

function amountForCycle(plan, cycle) {
  return cycle === "annual" ? plan.amountAnnual : plan.amount;
}

// Legacy / Enterprise stores get all features at custom pricing
const LEGACY_PLAN = {
  plan: "enterprise",
  name: "Enterprise",
  amount: 0,
  isLegacy: true,
  billingMethod: "invoice",
  features: {
    discount_function: true,
    theme_switcher: true,
  },
};

// ── Ensure Store Record Exists ───────────────────────────

export async function ensureStoreRecord(shopDomain) {
  return db.store.upsert({
    where: { storeDomain: shopDomain },
    create: { storeDomain: shopDomain },
    update: {},
  });
}

// ── Query Active Plan ────────────────────────────────────

export async function getActivePlan(admin, shopDomain) {
  // 1. Check DB for legacy status first — DB is source of truth for legacy
  const store = await db.store.findUnique({
    where: { storeDomain: shopDomain },
  });

  if (store?.isLegacy) {
    return { ...LEGACY_PLAN, legacyPrice: store.legacyPrice };
  }

  // 2. For non-legacy stores, check Shopify billing API
  const res = await admin.graphql(
    `#graphql
    query {
      app {
        installation {
          activeSubscriptions {
            id
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price { amount currencyCode }
                    interval
                  }
                }
              }
            }
            trialDays
          }
        }
      }
    }`
  );
  const json = await res.json();
  const subs = json.data?.app?.installation?.activeSubscriptions ?? [];

  const active = subs.find(
    (s) => s.status === "ACTIVE" && s.name.startsWith("cartx ")
  );

  if (!active) {
    return { plan: "free", isLegacy: false, billingCycle: "monthly", ...PLANS.free };
  }

  const pricing = active.lineItems?.[0]?.plan?.pricingDetails;
  const amount = parseFloat(pricing?.price?.amount ?? "0");
  const billingCycle = pricing?.interval === "ANNUAL" ? "annual" : "monthly";

  const proThreshold = amountForCycle(PLANS.pro, billingCycle);

  if (amount >= proThreshold) {
    return { plan: "pro", subscriptionId: active.id, isLegacy: false, billingCycle, ...PLANS.pro };
  }

  return { plan: "free", isLegacy: false, billingCycle: "monthly", ...PLANS.free };
}

// ── Create Subscription ──────────────────────────────────

export async function createSubscription(admin, planKey, returnUrl, billingCycle = "monthly") {
  const plan = PLANS[planKey];
  if (!plan || plan.amount === 0) {
    throw new Error("Cannot create subscription for free plan");
  }
  const cycle = billingCycle === "annual" ? "annual" : "monthly";
  const amount = amountForCycle(plan, cycle);
  const interval = INTERVAL_BY_CYCLE[cycle];

  const res = await admin.graphql(
    `#graphql
    mutation createSubscription($name: String!, $returnUrl: URL!, $trialDays: Int!, $amount: Decimal!, $interval: AppPricingInterval!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        trialDays: $trialDays
        test: ${process.env.NODE_ENV !== "production" ? "true" : "false"}
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $amount, currencyCode: USD }
              interval: $interval
            }
          }
        }]
      ) {
        confirmationUrl
        userErrors { field message }
      }
    }`,
    {
      variables: {
        name: `cartx ${plan.name} (${cycle === "annual" ? "Annual" : "Monthly"})`,
        returnUrl,
        trialDays: plan.trialDays,
        amount,
        interval,
      },
    }
  );

  const json = await res.json();
  const errors = json.data?.appSubscriptionCreate?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return json.data.appSubscriptionCreate.confirmationUrl;
}

// ── Cancel Subscription (downgrade to free) ──────────────

export async function cancelSubscription(admin, subscriptionId) {
  const res = await admin.graphql(
    `#graphql
    mutation cancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription { id status }
        userErrors { field message }
      }
    }`,
    { variables: { id: subscriptionId } }
  );

  const json = await res.json();
  const errors = json.data?.appSubscriptionCancel?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return { ok: true };
}

// ── Feature Checks ───────────────────────────────────────

export function hasFeature(planData, feature) {
  return planData?.features?.[feature] === true;
}

export function requireFeature(planData, feature) {
  if (!hasFeature(planData, feature)) {
    throw new Response(
      JSON.stringify({
        error: "This feature requires the Pro plan",
        upgrade_required: true,
        required_plan: "pro",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}
