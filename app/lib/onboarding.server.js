import db from "../db.server.js";

const ALL_STEPS = ["offer_created", "settings_configured", "app_enabled", "previewed"];

const DEFAULT_ONBOARDING = {
  completed: false,
  steps: Object.fromEntries(ALL_STEPS.map((s) => [s, false])),
};

export async function getOnboarding(shopDomain) {
  const store = await db.store.findUnique({ where: { storeDomain: shopDomain } });
  if (!store) return DEFAULT_ONBOARDING;
  try {
    const parsed = JSON.parse(store.onboarding);
    // Backfill any new steps that didn't exist in older records
    for (const key of ALL_STEPS) {
      if (parsed.steps[key] === undefined) parsed.steps[key] = false;
    }
    return parsed;
  } catch {
    return DEFAULT_ONBOARDING;
  }
}

export async function markStep(shopDomain, stepKey) {
  const onboarding = await getOnboarding(shopDomain);
  if (onboarding.completed) return onboarding;
  if (!onboarding.steps[stepKey]) {
    onboarding.steps[stepKey] = true;
    if (ALL_STEPS.every((k) => onboarding.steps[k])) {
      onboarding.completed = true;
    }
    await db.store.update({
      where: { storeDomain: shopDomain },
      data: { onboarding: JSON.stringify(onboarding) },
    });
  }
  return onboarding;
}

export async function skipOnboarding(shopDomain) {
  const onboarding = { completed: true, steps: Object.fromEntries(ALL_STEPS.map((s) => [s, true])) };
  await db.store.update({
    where: { storeDomain: shopDomain },
    data: { onboarding: JSON.stringify(onboarding) },
  });
  return onboarding;
}
