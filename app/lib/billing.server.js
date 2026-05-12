import db from "../db.server.js";

// ── Plan Definitions ─────────────────────────────────────

export const PLANS = {
  free: {
    name: "Free",
    amount: 0,
    features: {
      discount_function: false,
      theme_switcher: false,
    },
  },
  basic: {
    name: "Basic",
    amount: 150.0,
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    features: {
      discount_function: true,
      theme_switcher: false,
    },
  },
  max: {
    name: "Max",
    amount: 200.0,
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    features: {
      discount_function: true,
      theme_switcher: true,
    },
  },
};

// Legacy stores get max features at no charge
const LEGACY_PLAN = {
  plan: "max",
  name: "Max",
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
    return { plan: "free", isLegacy: false, ...PLANS.free };
  }

  const amount = parseFloat(
    active.lineItems?.[0]?.plan?.pricingDetails?.price?.amount ?? "0"
  );

  if (amount >= PLANS.max.amount) {
    return { plan: "max", subscriptionId: active.id, isLegacy: false, ...PLANS.max };
  }
  if (amount >= PLANS.basic.amount) {
    return { plan: "basic", subscriptionId: active.id, isLegacy: false, ...PLANS.basic };
  }

  return { plan: "free", isLegacy: false, ...PLANS.free };
}

// ── Create Subscription ──────────────────────────────────

export async function createSubscription(admin, planKey, returnUrl) {
  const plan = PLANS[planKey];
  if (!plan || plan.amount === 0) {
    throw new Error("Cannot create subscription for free plan");
  }

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
        name: `cartx ${plan.name}`,
        returnUrl,
        trialDays: plan.trialDays,
        amount: plan.amount,
        interval: plan.interval,
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
    const needed =
      feature === "theme_switcher" ? "Max" : "Basic";
    throw new Response(
      JSON.stringify({
        error: `This feature requires the ${needed} plan`,
        upgrade_required: true,
        required_plan: needed.toLowerCase(),
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}
