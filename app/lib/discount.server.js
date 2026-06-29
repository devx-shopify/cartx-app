import prisma from "../db.server.js";
import { syncVolumeDiscountConfig } from "./volume-discount.server.js";
import { captureException } from "./sentry.server.js";

const DISCOUNT_STORE_KEY = "__freebie_discount__";
const DISCOUNT_TITLE = "cartx free gift";
const FUNCTION_HANDLE = "cart-max-freebie-discount";
const METAFIELD_NAMESPACE = "$app:cart-max-freebie-discount";
const METAFIELD_KEY = "function-configuration";

// ── Helpers ──────────────────────────────────────────────

async function loadDiscountRecord(shopId) {
  const record = await prisma.themeConfig.findUnique({
    where: { shopId_themeId: { shopId, themeId: DISCOUNT_STORE_KEY } },
  });
  return record ? JSON.parse(record.config) : null;
}

async function saveDiscountRecord(shopId, data) {
  const config = JSON.stringify(data);
  await prisma.themeConfig.upsert({
    where: { shopId_themeId: { shopId, themeId: DISCOUNT_STORE_KEY } },
    create: { shopId, themeId: DISCOUNT_STORE_KEY, config },
    update: { config },
  });
}

async function deleteDiscountRecord(shopId) {
  await prisma.themeConfig
    .delete({
      where: { shopId_themeId: { shopId, themeId: DISCOUNT_STORE_KEY } },
    })
    .catch(() => {});
}

/**
 * Find our Shopify Function by its handle.
 * Returns the function GID or null.
 */
async function findFunction(admin) {
  const res = await admin.graphql(
    `#graphql
    query {
      shopifyFunctions(first: 25) {
        nodes {
          id
          title
          apiType
          app { handle }
        }
      }
    }`
  );
  const json = await res.json();
  const functions = json.data?.shopifyFunctions?.nodes ?? [];
  return (
    functions.find(
      (f) => f.title === FUNCTION_HANDLE || f.title === "cart-max-freebie-discount" || f.title === "cartx freebie discount"
    ) ?? null
  );
}

// ── Public API ───────────────────────────────────────────

const DEFAULT_RULE = {
  type: "percentage",
  value: 100,
  message: "Free Gift",
  max_cap: null,
};

/**
 * Build the metafield JSON config from stored rules.
 */
export function buildFunctionConfig(rules, defaultRule, claimRules) {
  return JSON.stringify({
    rules: rules ?? [],
    claim_rules: claimRules ?? [],
    default_rule: defaultRule ?? DEFAULT_RULE,
  });
}

/**
 * Derive metafield `rules[]` from offers that ship a freebie line item.
 * Only offers whose `discount` differs from the default are written —
 * the function falls back to `default_rule` for any offer not listed here.
 */
export function buildRulesFromOffers(offers) {
  const rules = [];
  for (const offer of offers || []) {
    if (!offer.enabled) continue;
    if (!offer.discount) continue;
    const rewardType = offer.reward?.type;
    if (rewardType !== "auto_add_gift" && rewardType !== "bundle") continue;
    rules.push({
      offer_id: offer.id,
      type: offer.discount.type,
      value: Number(offer.discount.value),
      message: offer.discount.message || "Free Gift",
      max_cap: offer.discount.max_cap ?? null,
    });
  }
  return rules;
}

/**
 * Returns true if the function should be installed for this shop —
 * i.e. there's at least one enabled freebie-bearing offer or claim gift.
 */
export function shouldHaveFreebieDiscount(config) {
  const offers = config?.offers || [];
  const claimGifts = config?.claim_gifts || [];
  const hasOfferFreebie = offers.some(
    (o) =>
      o.enabled &&
      (o.reward?.type === "auto_add_gift" || o.reward?.type === "bundle")
  );
  const hasClaimGift = claimGifts.some((g) => g.enabled);
  return hasOfferFreebie || hasClaimGift;
}

/**
 * Idempotent: create the automatic app discount if it doesn't exist.
 * Stores the discount GID in the DB for later management.
 */
export async function ensureFreebieDiscount(admin, shopId, functionConfig) {
  // Check if we already have a discount stored
  const existing = await loadDiscountRecord(shopId);
  if (existing?.discountId) {
    // Verify it still exists in Shopify
    const status = await verifyDiscount(admin, existing.discountId);
    if (status) {
      // Update metafield config if provided
      if (functionConfig != null) {
        await updateDiscountMetafield(
          admin,
          existing.discountId,
          functionConfig
        );
        await saveDiscountRecord(shopId, {
          ...existing,
          functionConfig,
        });
      }
      return { discountId: existing.discountId, created: false };
    }
    // Discount was deleted externally — recreate
    await deleteDiscountRecord(shopId);
  }

  // Find the function
  const fn = await findFunction(admin);
  if (!fn) {
    throw new Error(
      "cartx Freebie Discount function not found. Deploy the app first with `shopify app deploy`."
    );
  }

  const metafieldValue =
    functionConfig ?? buildFunctionConfig(null, null);

  // Self-heal: adopt an orphaned discount with our title rather than creating a
  // duplicate (Shopify rejects that with "Title must be unique").
  const orphanId = await findExistingDiscount(admin);
  if (orphanId) {
    await updateDiscountMetafield(admin, orphanId, metafieldValue);
    await saveDiscountRecord(shopId, {
      discountId: orphanId,
      functionConfig: metafieldValue,
      adoptedAt: new Date().toISOString(),
    });
    return { discountId: orphanId, created: false, adopted: true };
  }

  const res = await admin.graphql(
    `#graphql
    mutation createDiscount($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        discount: {
          title: DISCOUNT_TITLE,
          functionId: fn.id,
          startsAt: new Date().toISOString(),
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: metafieldValue,
            },
          ],
        },
      },
    }
  );

  const json = await res.json();
  const errors = json.data?.discountAutomaticAppCreate?.userErrors ?? [];
  if (errors.length > 0) {
    // Unique-title race: adopt the existing discount instead of failing.
    if (errors.some((e) => /unique/i.test(e.message))) {
      const raced = await findExistingDiscount(admin);
      if (raced) {
        await updateDiscountMetafield(admin, raced, metafieldValue);
        await saveDiscountRecord(shopId, {
          discountId: raced,
          functionConfig: metafieldValue,
          adoptedAt: new Date().toISOString(),
        });
        return { discountId: raced, created: false, adopted: true };
      }
    }
    throw new Error(
      "Failed to create discount: " + errors.map((e) => e.message).join(", ")
    );
  }

  const discountId =
    json.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;

  await saveDiscountRecord(shopId, {
    discountId,
    functionConfig: metafieldValue,
    createdAt: new Date().toISOString(),
  });

  return { discountId, created: true };
}

/**
 * Find an existing freebie discount by title and return its numeric id, or null.
 * Lets us adopt an orphaned discount (local record lost, but it still exists in
 * Shopify) instead of failing the unique-title create.
 */
async function findExistingDiscount(admin) {
  try {
    const res = await admin.graphql(
      `#graphql
      query findFreebieDiscount($query: String!) {
        discountNodes(first: 25, query: $query) {
          nodes {
            id
            discount {
              __typename
              ... on DiscountAutomaticApp { title }
            }
          }
        }
      }`,
      { variables: { query: `title:'${DISCOUNT_TITLE}'` } }
    );
    const json = await res.json();
    const nodes = json.data?.discountNodes?.nodes ?? [];
    const match = nodes.find(
      (n) =>
        n.discount?.__typename === "DiscountAutomaticApp" &&
        n.discount?.title === DISCOUNT_TITLE
    );
    return match ? String(match.id).split("/").pop() : null;
  } catch (err) {
    console.error("[cartx] findExistingDiscount (freebie) failed:", err);
    return null;
  }
}

/**
 * Verify a discount still exists in Shopify. Returns status or null.
 */
async function verifyDiscount(admin, discountId) {
  try {
    const gid = discountId.startsWith("gid://")
      ? discountId
      : `gid://shopify/DiscountNode/${discountId}`;

    const res = await admin.graphql(
      `#graphql
      query checkDiscount($id: ID!) {
        discountNode(id: $id) {
          id
          discount {
            ... on DiscountAutomaticApp {
              status
              title
            }
          }
        }
      }`,
      { variables: { id: gid } }
    );
    const json = await res.json();
    const node = json.data?.discountNode;
    if (!node) return null;
    return node.discount?.status ?? "ACTIVE";
  } catch {
    return null;
  }
}

/**
 * Update the metafield on an existing discount.
 */
async function updateDiscountMetafield(admin, discountId, functionConfig) {
  const gid = discountId.startsWith("gid://")
    ? discountId
    : `gid://shopify/DiscountAutomaticNode/${discountId}`;

  // Get the metafield id first
  const metaRes = await admin.graphql(
    `#graphql
    query getDiscountMeta($id: ID!) {
      discountNode(id: $id) {
        metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
          id
        }
      }
    }`,
    { variables: { id: gid } }
  );
  const metaJson = await metaRes.json();
  const metafieldId = metaJson.data?.discountNode?.metafield?.id;

  if (metafieldId) {
    const res = await admin.graphql(
      `#graphql
      mutation updateMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: gid,
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: functionConfig,
            },
          ],
        },
      }
    );
    // The metafield write is what actually configures the discount Function —
    // a silent failure leaves a live discount with stale config, so surface it.
    const json = await res.json();
    const errors = json.data?.metafieldsSet?.userErrors ?? [];
    if (errors.length > 0) {
      throw new Error(
        `Failed to update discount metafield: ${errors.map((e) => e.message).join("; ")}`,
      );
    }
  }
}

/**
 * Get the freebie discount status for this shop.
 */
export async function getFreebieDiscountStatus(admin, shopId) {
  const record = await loadDiscountRecord(shopId);
  if (!record?.discountId) {
    return { active: false, discountId: null, functionConfig: null };
  }

  const status = await verifyDiscount(admin, record.discountId);
  if (!status) {
    // Discount was deleted externally
    await deleteDiscountRecord(shopId);
    return { active: false, discountId: null, functionConfig: null };
  }

  // Parse the stored config to return rules
  let parsedConfig = null;
  try {
    parsedConfig = JSON.parse(record.functionConfig ?? "{}");
  } catch {
    parsedConfig = {};
  }

  return {
    active: status === "ACTIVE",
    status,
    discountId: record.discountId,
    functionConfig: parsedConfig,
  };
}

/**
 * Deactivate and delete the freebie discount.
 */
export async function deleteFreebieDiscount(admin, shopId) {
  const record = await loadDiscountRecord(shopId);
  if (!record?.discountId) return { ok: true };

  const gid = record.discountId.startsWith("gid://")
    ? record.discountId
    : `gid://shopify/DiscountAutomaticNode/${record.discountId}`;

  try {
    await admin.graphql(
      `#graphql
      mutation deleteDiscount($id: ID!) {
        discountAutomaticDelete(id: $id) {
          deletedAutomaticDiscountId
          userErrors { field message }
        }
      }`,
      { variables: { id: gid } }
    );
  } catch {
    // Discount may already be deleted
  }

  await deleteDiscountRecord(shopId);
  return { ok: true };
}

/**
 * Build claim_rules from claim_gifts config for the discount function.
 */
export function buildClaimRules(claimGifts) {
  return (claimGifts || [])
    .filter((g) => g.enabled)
    .map((g) => ({
      offer_id: g.id,
      claim_price: g.claim_price ?? 0,
      message: g.claim_price > 0 ? `Claimed for Rs.${g.claim_price}` : "Claimed Gift",
    }));
}

/**
 * Sync claim_rules into the discount function config.
 * Call after saving claim gifts to keep the function in sync.
 */
export async function syncClaimRulesToFunction(admin, shopId, claimGifts) {
  const record = await loadDiscountRecord(shopId);
  if (!record?.discountId) return; // No active discount function, skip

  let parsedConfig = {};
  try {
    parsedConfig = JSON.parse(record.functionConfig ?? "{}");
  } catch { /* use empty */ }

  const claimRules = buildClaimRules(claimGifts);
  const functionConfig = buildFunctionConfig(
    parsedConfig.rules ?? [],
    parsedConfig.default_rule ?? null,
    claimRules
  );
  await updateDiscountMetafield(admin, record.discountId, functionConfig);
  await saveDiscountRecord(shopId, { ...record, functionConfig });
}

/**
 * Move legacy `discount_function.rules[]` (keyed by offer_id) into per-offer
 * `offer.discount` fields. Idempotent — after the first run, the legacy rules
 * array is emptied on the discount record so subsequent calls no-op.
 *
 * Mutates `config` in place. Returns true if anything was migrated, signalling
 * that the caller should save the config.
 */
export async function migrateLegacyDiscountRules(config, shopId) {
  const record = await loadDiscountRecord(shopId);
  if (!record?.functionConfig) return false;

  let parsed;
  try {
    parsed = JSON.parse(record.functionConfig);
  } catch {
    return false;
  }
  const legacyRules = Array.isArray(parsed?.rules) ? parsed.rules : [];
  if (legacyRules.length === 0) return false;

  let touched = false;
  for (const rule of legacyRules) {
    if (!rule?.offer_id) continue;
    const offer = (config.offers || []).find((o) => o.id === rule.offer_id);
    if (!offer) continue;
    if (offer.discount) continue;
    const rewardType = offer.reward?.type;
    if (rewardType !== "auto_add_gift" && rewardType !== "bundle") continue;
    offer.discount = {
      type: rule.type ?? "percentage",
      value: Number(rule.value ?? 100),
      message: rule.message || "Free Gift",
      max_cap: rule.max_cap ?? null,
    };
    touched = true;
  }

  // Clear legacy rules so we don't try to migrate again.
  const updatedRecord = {
    ...record,
    functionConfig: JSON.stringify({ ...parsed, rules: [] }),
  };
  await saveDiscountRecord(shopId, updatedRecord);

  return touched;
}

/**
 * One-shot sync of the freebie discount function from the full app config.
 *
 * - If the shop has at least one enabled freebie-bearing offer or claim gift,
 *   ensure the Shopify Function discount is installed and its metafield matches
 *   `config.offers[].discount` + `config.claim_gifts[].claim_price`.
 * - If nothing needs the function, leaves an existing installation intact
 *   (zero rules + zero claim_rules → function is a no-op) — merchants can
 *   remove it manually if they want.
 * - Tolerates a missing Shopify Function (not yet deployed); callers must
 *   not rely on this throwing.
 */
export async function syncFreebieDiscountFromConfig(admin, shopId, config) {
  const rules = buildRulesFromOffers(config.offers);
  const claimRules = buildClaimRules(config.claim_gifts);
  const functionConfig = buildFunctionConfig(rules, DEFAULT_RULE, claimRules);

  const record = await loadDiscountRecord(shopId);

  // Already installed → just refresh the metafield.
  if (record?.discountId) {
    try {
      await updateDiscountMetafield(admin, record.discountId, functionConfig);
      await saveDiscountRecord(shopId, { ...record, functionConfig });
    } catch (err) {
      console.error("[cartx] syncFreebieDiscountFromConfig update failed:", err);
    }
    return;
  }

  // Not installed — only create if the shop actually needs it now.
  if (!shouldHaveFreebieDiscount(config)) return;

  try {
    await ensureFreebieDiscount(admin, shopId, functionConfig);
  } catch (err) {
    // Function not deployed yet, or Shopify rejected the mutation — surface
    // in logs but don't break the save flow.
    console.error("[cartx] syncFreebieDiscountFromConfig install failed:", err);
  }
}

/**
 * Update just the function config (rules) on an existing discount.
 */
export async function updateFreebieDiscountConfig(
  admin,
  shopId,
  rules,
  defaultRule,
  claimRules
) {
  const record = await loadDiscountRecord(shopId);
  if (!record?.discountId) {
    throw new Error("No active discount function. Activate it first.");
  }

  const functionConfig = buildFunctionConfig(rules, defaultRule, claimRules);
  await updateDiscountMetafield(admin, record.discountId, functionConfig);
  await saveDiscountRecord(shopId, {
    ...record,
    functionConfig,
  });

  return { ok: true };
}

/**
 * Sync the freebie + volume Shopify discounts after a promotion is saved.
 *
 * These are secondary effects: the promotion config is already persisted by the
 * time this runs, so a Shopify API failure here must never crash the save. Each
 * sync is isolated; failures are logged, reported to Sentry, and returned as
 * human-readable warnings the UI can surface. The next save retries the sync.
 *
 * @returns {Promise<string[]>} warnings (empty when everything succeeded)
 */
export async function syncDiscounts(admin, shopId, config, type) {
  const warnings = [];

  if (type === "offer" || type === "claim-gift") {
    try {
      await syncFreebieDiscountFromConfig(admin, shopId, config);
    } catch (err) {
      console.error("[cartx] freebie discount sync failed:", err);
      captureException(err, { tags: { area: "freebie_discount_sync" }, extra: { shopId } });
      warnings.push(
        "Your promotion was saved, but the free-gift discount couldn't sync with Shopify. It will retry on the next save."
      );
    }
  }

  if (type === "offer") {
    try {
      await syncVolumeDiscountConfig(admin, shopId, config.offers);
    } catch (err) {
      console.error("[cartx] volume discount sync failed:", err);
      captureException(err, { tags: { area: "volume_discount_sync" }, extra: { shopId } });
      warnings.push(
        "Your promotion was saved, but the volume discount couldn't sync with Shopify. It will retry on the next save."
      );
    }
  }

  return warnings;
}
