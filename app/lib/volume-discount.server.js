import prisma from "../db.server.js";

const STORE_KEY = "__volume_discount__";
const DISCOUNT_TITLE = "cartx volume discount";
const FUNCTION_HANDLE = "cartx-volume-discount";
const METAFIELD_NAMESPACE = "$app:cartx-volume-discount";
const METAFIELD_KEY = "function-configuration";

// ── DB helpers ──────────────────────────────────────────

async function loadRecord(shopId) {
  const record = await prisma.themeConfig.findUnique({
    where: { shopId_themeId: { shopId, themeId: STORE_KEY } },
  });
  return record ? JSON.parse(record.config) : null;
}

async function saveRecord(shopId, data) {
  const config = JSON.stringify(data);
  await prisma.themeConfig.upsert({
    where: { shopId_themeId: { shopId, themeId: STORE_KEY } },
    create: { shopId, themeId: STORE_KEY, config },
    update: { config },
  });
}

async function deleteRecord(shopId) {
  await prisma.themeConfig
    .delete({ where: { shopId_themeId: { shopId, themeId: STORE_KEY } } })
    .catch(() => {});
}

// ── Verify discount ─────────────────────────────────────

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
          discount { ... on DiscountAutomaticApp { status } }
        }
      }`,
      { variables: { id: gid } }
    );
    const json = await res.json();
    return json.data?.discountNode?.discount?.status ?? null;
  } catch {
    return null;
  }
}

// ── Update metafield ────────────────────────────────────

async function updateMetafield(admin, discountId, functionConfig) {
  const gid = discountId.startsWith("gid://")
    ? discountId
    : `gid://shopify/DiscountAutomaticNode/${discountId}`;

  await admin.graphql(
    `#graphql
    mutation updateMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [{
          ownerId: gid,
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "json",
          value: functionConfig,
        }],
      },
    }
  );
}

// ── Public API ──────────────────────────────────────────

function normalizeId(id) {
  const s = String(id);
  return s.startsWith("gid://") ? s.split("/").pop() : s;
}

/**
 * Build function config JSON from the app's offers.
 */
export function buildVolumeDiscountConfig(offers) {
  const volumeOffers = (offers || [])
    .filter((o) => o.enabled && o.reward?.type === "volume_discount")
    .map((o) => ({
      offer_id: o.id,
      variant_ids: (o.source?.product_variant_ids || []).map(normalizeId),
      discount_mode: o.reward.discount_mode,
      discount_priority: o.reward.discount_priority ?? 'lowest',
      tiers: (o.reward.tiers || []).slice().sort((a, b) => a.quantity - b.quantity),
      message: o.name || "Volume Deal",
    }));

  return JSON.stringify({ offers: volumeOffers });
}

/**
 * Ensure the volume discount exists.
 * Uses functionHandle (newer API) instead of functionId.
 */
export async function ensureVolumeDiscount(admin, shopId, offers) {
  const functionConfig = buildVolumeDiscountConfig(offers);

  const existing = await loadRecord(shopId);
  if (existing?.discountId) {
    const status = await verifyDiscount(admin, existing.discountId);
    if (status) {
      await updateMetafield(admin, existing.discountId, functionConfig);
      await saveRecord(shopId, { ...existing, functionConfig });
      return { discountId: existing.discountId, created: false };
    }
    await deleteRecord(shopId);
  }

  // Create discount using functionHandle (newer Discount API)
  const res = await admin.graphql(
    `#graphql
    mutation createDiscount($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount { discountId }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        discount: {
          title: DISCOUNT_TITLE,
          functionHandle: FUNCTION_HANDLE,
          discountClasses: ["PRODUCT"],
          startsAt: new Date().toISOString(),
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [{
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: functionConfig,
          }],
        },
      },
    }
  );

  const json = await res.json();
  const errors = json.data?.discountAutomaticAppCreate?.userErrors ?? [];
  if (errors.length > 0) {
    console.error("[cartx] Failed to create volume discount:", errors);
    throw new Error("Failed to create volume discount: " + errors.map((e) => e.message).join(", "));
  }

  const discountId = json.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;
  await saveRecord(shopId, { discountId, functionConfig, createdAt: new Date().toISOString() });
  return { discountId, created: true };
}

/**
 * Sync volume discount config after saving offers.
 */
export async function syncVolumeDiscountConfig(admin, shopId, offers) {
  const hasVolumeOffers = (offers || []).some(
    (o) => o.enabled && o.reward?.type === "volume_discount"
  );

  if (!hasVolumeOffers) {
    const existing = await loadRecord(shopId);
    if (existing?.discountId) {
      await deleteVolumeDiscount(admin, shopId);
    }
    return;
  }

  await ensureVolumeDiscount(admin, shopId, offers);
}

/**
 * Delete the volume discount.
 */
export async function deleteVolumeDiscount(admin, shopId) {
  const record = await loadRecord(shopId);
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
  } catch { /* may already be deleted */ }

  await deleteRecord(shopId);
  return { ok: true };
}

/**
 * Get volume discount status.
 */
export async function getVolumeDiscountStatus(admin, shopId) {
  const record = await loadRecord(shopId);
  if (!record?.discountId) {
    return { active: false, discountId: null };
  }
  const status = await verifyDiscount(admin, record.discountId);
  if (!status) {
    await deleteRecord(shopId);
    return { active: false, discountId: null };
  }
  return { active: status === "ACTIVE", discountId: record.discountId };
}
