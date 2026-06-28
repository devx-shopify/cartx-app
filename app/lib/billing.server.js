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

// Single contact address shown to merchants (Enterprise upgrades, privacy page,
// etc.). Override via the CARTX_CONTACT_EMAIL Fly secret; falls back to current.
export const ENTERPRISE_CONTACT_EMAIL =
  process.env.CARTX_CONTACT_EMAIL || "ansh.varshney@devxlabs.ai";

const INTERVAL_BY_CYCLE = {
  monthly: "EVERY_30_DAYS",
  annual: "ANNUAL",
};

// Whether to create Shopify charges as test charges (no real money, approvable
// on dev stores with no payment method). Explicit SHOPIFY_BILLING_TEST wins so
// you can force test mode in any environment; otherwise fall back to NODE_ENV
// so real merchants on production (flag unset) always get live charges.
function isBillingTest() {
  const flag = process.env.SHOPIFY_BILLING_TEST;
  if (flag != null && flag !== "") return flag === "true";
  return process.env.NODE_ENV !== "production";
}

function amountForCycle(plan, cycle) {
  return cycle === "annual" ? plan.amountAnnual : plan.amount;
}

// Enterprise stores get all features; price is set per-store in /internal
const ENTERPRISE_FEATURES = {
  discount_function: true,
  theme_switcher: true,
};

function makeEnterprisePlan({ quotedPrice = 0, approved = false, subscriptionId = null, currentAmount = null }) {
  return {
    plan: "enterprise",
    name: "Enterprise",
    amount: currentAmount ?? quotedPrice,
    quotedPrice,
    isLegacy: true,
    isEnterprise: true,
    billingMethod: "shopify",
    approved,
    needsApproval: !approved && quotedPrice > 0,
    subscriptionId,
    features: ENTERPRISE_FEATURES,
  };
}

// ── Ensure Store Record Exists ───────────────────────────

export async function ensureStoreRecord(shopDomain) {
  return db.store.upsert({
    where: { storeDomain: shopDomain },
    create: { storeDomain: shopDomain },
    update: {},
  });
}

// ── Sync Shop Currency + Timezone ────────────────────────
//
// Persists the merchant's currency code and IANA timezone onto the Store row so
// the analytics dashboard can format money correctly and the rollup cron (which
// has no admin context) can bucket events into the merchant's local days.
//
// Cheap by design: once both values are stored we skip the Shopify call. A
// merchant changing currency/timezone is rare and would be picked up on the
// next install/auth refresh.
export async function syncShopSettings(admin, shopDomain) {
  const existing = await db.store.findUnique({
    where: { storeDomain: shopDomain },
    select: { currencyCode: true, ianaTimezone: true },
  });
  if (existing?.currencyCode && existing?.ianaTimezone) {
    return existing;
  }

  let currencyCode = existing?.currencyCode ?? null;
  let ianaTimezone = existing?.ianaTimezone ?? null;
  try {
    const res = await admin.graphql(
      `#graphql
      query ShopSettings {
        shop { currencyCode ianaTimezone }
      }`,
    );
    const json = await res.json();
    currencyCode = json?.data?.shop?.currencyCode ?? currencyCode;
    ianaTimezone = json?.data?.shop?.ianaTimezone ?? ianaTimezone;
  } catch (err) {
    console.error("[cartx][billing] syncShopSettings failed:", err);
  }

  await db.store.upsert({
    where: { storeDomain: shopDomain },
    create: { storeDomain: shopDomain, currencyCode, ianaTimezone },
    update: { currencyCode, ianaTimezone },
  });
  return { currencyCode, ianaTimezone };
}

// Drop Enterprise status — used when a merchant self-downgrades to a
// standard plan. They become a normal store and must be re-negotiated to
// get Enterprise pricing back.
export async function clearEnterpriseStatus(shopDomain) {
  return db.store.update({
    where: { storeDomain: shopDomain },
    // Reset planTier too — otherwise a stale "enterprise" label lingers and the
    // /enterprise dashboard keeps showing the store as Enterprise after cancel.
    data: { planTier: "free", isLegacy: false, legacyPrice: null },
  });
}

// ── Query Active Plan ────────────────────────────────────

export async function getActivePlan(admin, shopDomain) {
  // 1. Check DB for enterprise status — admin can set custom pricing per-store
  const store = await db.store.findUnique({
    where: { storeDomain: shopDomain },
  });

  const enterprisePrice = store?.isLegacy ? (store.legacyPrice ?? 0) : null;

  // Fetch active Shopify subscriptions
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

  const enterpriseSub = subs.find(
    (s) => s.status === "ACTIVE" && s.name.startsWith("cartx Enterprise"),
  );
  // An active standard (non-Enterprise) cartx subscription, if any.
  const standardSub = subs.find(
    (s) => s.status === "ACTIVE" && s.name.startsWith("cartx ") && !s.name.startsWith("cartx Enterprise"),
  );

  // 1. An active Enterprise subscription is authoritative — the store is paying
  //    an Enterprise rate right now, regardless of the isLegacy flag.
  if (enterpriseSub) {
    const pricing = enterpriseSub.lineItems?.[0]?.plan?.pricingDetails;
    const subAmount = parseFloat(pricing?.price?.amount ?? "0");
    // If the team changed the quoted price in /internal, the active sub no
    // longer matches and the merchant must approve the new price.
    const approved = !store?.isLegacy || subAmount === enterprisePrice;
    return makeEnterprisePlan({
      quotedPrice: store?.isLegacy ? enterprisePrice : subAmount,
      approved,
      subscriptionId: enterpriseSub.id,
      currentAmount: subAmount,
    });
  }

  // 2. No Enterprise sub yet, but the team assigned this store an Enterprise
  //    price in /internal → prompt the merchant to approve it. Any existing
  //    standard sub is replaced when they approve. (We do NOT treat a stale
  //    standard sub as a downgrade here — that's handled explicitly when the
  //    merchant chooses to switch off Enterprise.)
  if (store?.isLegacy) {
    // $0 enterprise = full features, no Shopify sub needed
    if (enterprisePrice === 0) {
      return makeEnterprisePlan({ quotedPrice: 0, approved: true });
    }
    return makeEnterprisePlan({ quotedPrice: enterprisePrice, approved: false });
  }

  // 3. Standard (non-enterprise) store: free/pro logic
  if (!standardSub) {
    return { plan: "free", isLegacy: false, billingCycle: "monthly", ...PLANS.free };
  }

  const pricing = standardSub.lineItems?.[0]?.plan?.pricingDetails;
  const amount = parseFloat(pricing?.price?.amount ?? "0");
  const billingCycle = pricing?.interval === "ANNUAL" ? "annual" : "monthly";

  const proThreshold = amountForCycle(PLANS.pro, billingCycle);

  if (amount >= proThreshold) {
    return { plan: "pro", subscriptionId: standardSub.id, isLegacy: false, billingCycle, ...PLANS.pro };
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
        test: ${isBillingTest()}
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

// ── Create Enterprise Subscription (custom price) ────────

export async function createEnterpriseSubscription(admin, returnUrl, amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enterprise price must be greater than 0");
  }

  const res = await admin.graphql(
    `#graphql
    mutation createEnterpriseSubscription($name: String!, $returnUrl: URL!, $amount: Decimal!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: ${isBillingTest()}
        replacementBehavior: STANDARD
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $amount, currencyCode: USD }
              interval: EVERY_30_DAYS
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
        name: `cartx Enterprise ($${amount}/mo)`,
        returnUrl,
        amount,
      },
    },
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
