// Cart-based upsells: rule storage (UpsellRule), product snapshots
// (UpsellProduct) and the evaluate-cart payload. Selection itself lives in the
// pure drawer module so the proxy and the drawer pick identical products.
import prisma from "../db.server.js";
import {
  numericId,
  pickRecommendations,
  selectUpsells,
  triggerProductIds,
} from "./upsell-recs.js";
import { UPSELL_CAP_LIMIT } from "./schemas.js";
import { isSellable } from "./sellable.js";

export { numericId };

const productGid = (id) => `gid://shopify/Product/${numericId(id)}`;

// ── Admin API ─────────────────────────────────────────────

/** A Shopify API failure (throttling, network, GraphQL errors). Actions turn
 *  it into a friendly message; it must never be read as "no products", or a
 *  save could wipe a list or an import could drop rules. */
export class ShopifyApiError extends Error {}

export async function adminQuery(admin, query, variables) {
  let json;
  try {
    const res = await admin.graphql(query, variables ? { variables } : undefined);
    json = await res.json();
  } catch (err) {
    throw new ShopifyApiError(err?.message || "Shopify API request failed");
  }
  if (json?.errors?.length || !json?.data) {
    throw new ShopifyApiError(JSON.stringify(json?.errors || "No data in Shopify API response"));
  }
  return json.data;
}

export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ShopifyApiError) {
    return "Couldn't reach Shopify to load the products. Nothing was changed. Please try again in a moment.";
  }
  if (err?.code === "P2002") return "This product already has a rule. Edit that rule instead.";
  if (err?.code === "P2025") return "That rule no longer exists.";
  return fallback;
}

// ── Snapshots ─────────────────────────────────────────────

export function rowToSnapshot(row) {
  return {
    product_id: row.productId,
    title: row.title,
    handle: row.handle,
    image_url: row.imageUrl,
    variant_id: row.variantId,
    price: row.price,
    compare_at_price: row.compareAtPrice || undefined,
    status: row.status,
    online_store: row.onlineStore !== false,
  };
}

export function productNodeToRow(node) {
  const v = node.variants?.nodes?.[0];
  return {
    productId: numericId(node.id),
    title: node.title || "",
    handle: node.handle || "",
    imageUrl: node.featuredImage?.url || "",
    variantId: v ? numericId(v.id) : "",
    price: v?.price ?? "0",
    compareAtPrice: v?.compareAtPrice || null,
    status: node.status || "ACTIVE",
    onlineStore: !!node.onlineStoreUrl,
  };
}

export const PRODUCT_SNAPSHOT_FIELDS = `
  id
  title
  handle
  status
  onlineStoreUrl
  featuredImage { url }
  variants(first: 1) { nodes { id price compareAtPrice } }
`;

// Deleted products are absent from the result.
export async function fetchProductSnapshots(admin, productIds) {
  const ids = [...new Set(productIds.map(numericId).filter(Boolean))];
  const rows = [];
  for (let i = 0; i < ids.length; i += 250) {
    const data = await adminQuery(
      admin,
      `#graphql
      query cartxUpsellProducts($ids: [ID!]!) {
        nodes(ids: $ids) { ... on Product { ${PRODUCT_SNAPSHOT_FIELDS} } }
      }`,
      { ids: ids.slice(i, i + 250).map(productGid) },
    );
    for (const node of data.nodes ?? []) {
      if (node?.id) rows.push(productNodeToRow(node));
    }
  }
  return rows;
}

const SNAPSHOT_BATCH = 100;

export async function upsertSnapshots(shopId, rows) {
  for (let i = 0; i < rows.length; i += SNAPSHOT_BATCH) {
    await prisma.$transaction(
      rows.slice(i, i + SNAPSHOT_BATCH).map((row) =>
        prisma.upsellProduct.upsert({
          where: { shopId_productId: { shopId, productId: row.productId } },
          create: { shopId, ...row },
          update: row,
        }),
      ),
    );
  }
}

export async function loadCatalog(shopId, productIds) {
  const ids = [...new Set(productIds.map(numericId).filter(Boolean))];
  if (ids.length === 0) return {};
  const rows = await prisma.upsellProduct.findMany({
    where: { shopId, productId: { in: ids } },
  });
  const catalog = {};
  for (const row of rows) catalog[row.productId] = rowToSnapshot(row);
  return catalog;
}

// ── Rules ─────────────────────────────────────────────────

export function cleanRecommendedIds(triggerId, recommendedIds, cap = UPSELL_CAP_LIMIT) {
  const trigger = numericId(triggerId);
  const ids = [];
  const removed = { self: 0, duplicate: 0, overCap: 0 };
  for (const raw of recommendedIds || []) {
    const id = numericId(raw);
    if (!id) continue;
    if (id === trigger) { removed.self++; continue; }
    if (ids.includes(id)) { removed.duplicate++; continue; }
    if (ids.length >= cap) { removed.overCap++; continue; }
    ids.push(id);
  }
  return { ids, removed };
}

// Enabled rules only: { triggerProductId: [recommendedId, ...] }.
export async function loadRulesForProducts(shopId, themeId, productIds) {
  const ids = [...new Set(productIds.map(numericId).filter(Boolean))];
  if (ids.length === 0) return {};
  const rows = await prisma.upsellRule.findMany({
    where: { shopId, themeId, enabled: true, triggerProductId: { in: ids } },
    select: { triggerProductId: true, recommendedIds: true },
  });
  const rules = {};
  for (const row of rows) rules[row.triggerProductId] = row.recommendedIds;
  return rules;
}

// Overwrites any existing rule for the trigger. Admin edits use editRule instead.
export async function saveRule(admin, shopId, themeId, { trigger_product_id, recommended_ids, enabled = true }, cap) {
  const triggerProductId = numericId(trigger_product_id);
  const { ids } = cleanRecommendedIds(triggerProductId, recommended_ids, cap);
  if (!triggerProductId || ids.length === 0) {
    throw new Error("A rule needs a trigger product and at least one other recommended product");
  }
  await upsertSnapshots(shopId, await fetchProductSnapshots(admin, [triggerProductId, ...ids]));
  return prisma.upsellRule.upsert({
    where: { shopId_themeId_triggerProductId: { shopId, themeId, triggerProductId } },
    create: { shopId, themeId, triggerProductId, recommendedIds: ids, enabled },
    update: { recommendedIds: ids, enabled },
  });
}

// Admin create/edit: never overwrites another rule (one rule per trigger
// product per theme). Returns { error } for merchant-facing problems.
export async function editRule(admin, shopId, themeId, ruleId, input, cap) {
  const triggerProductId = numericId(input.trigger_product_id);
  if (!triggerProductId) return { error: "Pick a trigger product." };
  const { ids } = cleanRecommendedIds(triggerProductId, input.recommended_ids, cap);
  if (ids.length === 0) return { error: "Pick at least one recommended product other than the trigger." };

  const clash = await prisma.upsellRule.findUnique({
    where: { shopId_themeId_triggerProductId: { shopId, themeId, triggerProductId } },
    select: { id: true },
  });
  if (clash && clash.id !== ruleId) {
    return { error: "This product already has a rule. Edit that rule instead." };
  }

  await upsertSnapshots(shopId, await fetchProductSnapshots(admin, [triggerProductId, ...ids]));
  const data = { triggerProductId, recommendedIds: ids, enabled: input.enabled !== false };
  if (ruleId) {
    const { count } = await prisma.upsellRule.updateMany({ where: { id: ruleId, shopId, themeId }, data });
    if (count === 0) return { error: "That rule no longer exists." };
    return { ok: true };
  }
  await prisma.upsellRule.create({ data: { shopId, themeId, ...data } });
  return { ok: true };
}

export async function listRules(shopId, themeId, { query = "", page = 0, pageSize = 25 } = {}) {
  const where = { shopId, themeId };
  const q = query.trim();
  if (q) {
    const matches = await prisma.upsellProduct.findMany({
      where: { shopId, title: { contains: q, mode: "insensitive" } },
      select: { productId: true },
    });
    where.triggerProductId = { in: matches.map((m) => m.productId) };
  }
  const [total, rows, all] = await Promise.all([
    prisma.upsellRule.count({ where }),
    prisma.upsellRule.findMany({ where, orderBy: { updatedAt: "desc" }, skip: page * pageSize, take: pageSize }),
    prisma.upsellRule.count({ where: { shopId, themeId } }),
  ]);
  const catalog = await loadCatalog(shopId, rows.flatMap((r) => [r.triggerProductId, ...r.recommendedIds]));
  return {
    total,
    totalAll: all,
    rules: rows.map((r) => ({
      id: r.id,
      triggerProductId: r.triggerProductId,
      recommendedIds: r.recommendedIds,
      enabled: r.enabled,
      updatedAt: r.updatedAt.toISOString(),
    })),
    catalog,
  };
}

export async function getRule(shopId, themeId, ruleId) {
  if (!ruleId) return null;
  return prisma.upsellRule.findFirst({ where: { id: ruleId, shopId, themeId } });
}

export async function getShopCurrency(shopId) {
  const store = await prisma.store.findUnique({ where: { storeDomain: shopId }, select: { currencyCode: true } });
  return store?.currencyCode || "USD";
}

export async function countRules(shopId, themeId) {
  return prisma.upsellRule.count({ where: { shopId, themeId } });
}

// Replaces the target theme's rules.
export async function copyRules(shopId, sourceThemeId, targetThemeId) {
  const source = await prisma.upsellRule.findMany({ where: { shopId, themeId: sourceThemeId } });
  await prisma.$transaction([
    prisma.upsellRule.deleteMany({ where: { shopId, themeId: targetThemeId } }),
    prisma.upsellRule.createMany({
      data: source.map((r) => ({
        shopId,
        themeId: targetThemeId,
        triggerProductId: r.triggerProductId,
        recommendedIds: r.recommendedIds,
        enabled: r.enabled,
      })),
    }),
  ]);
  return source.length;
}

// Same shape (GIDs) the drawer has always read from config.upsells.products.
export async function fetchDefaultProducts(admin, productIds) {
  const order = productIds.map(numericId).filter(Boolean);
  if (order.length === 0) return [];
  const data = await adminQuery(
    admin,
    `#graphql
    query cartxUpsellDefaults($ids: [ID!]!) {
      nodes(ids: $ids) { ... on Product { ${PRODUCT_SNAPSHOT_FIELDS} } }
    }`,
    { ids: order.map(productGid) },
  );
  const byId = {};
  for (const node of data.nodes ?? []) {
    if (node?.id) byId[numericId(node.id)] = node;
  }
  return order
    .filter((id) => byId[id])
    .map((id) => {
      const node = byId[id];
      const v = node.variants?.nodes?.[0];
      return {
        product_id: node.id,
        title: node.title,
        handle: node.handle ?? "",
        image_url: node.featuredImage?.url ?? "",
        variant_id: v?.id ?? "",
        price: v?.price ?? "0",
        compare_at_price: v?.compareAtPrice || undefined,
        status: node.status || "ACTIVE",
        online_store: !!node.onlineStoreUrl,
      };
    });
}

export async function deleteRules(shopId, themeId, ruleIds) {
  return prisma.upsellRule.deleteMany({ where: { shopId, themeId, id: { in: ruleIds } } });
}

export async function setRulesEnabled(shopId, themeId, ruleIds, enabled) {
  return prisma.upsellRule.updateMany({
    where: { shopId, themeId, id: { in: ruleIds } },
    data: { enabled },
  });
}

// ── evaluate-cart payload ─────────────────────────────────

function settingsOf(upsells) {
  return {
    mode: upsells.mode || "static",
    no_match: upsells.no_match || "default",
    fill_with_default: upsells.fill_with_default === true,
    sold_out: upsells.sold_out || "hide",
    max_visible: upsells.max_visible || 4,
    max_per_trigger: upsells.max_per_trigger || 10,
    strategies: upsells.strategies || {},
  };
}

// `products` is the resolved, ranked list, so drawer bundles that predate
// cart-based upsells still render the right cards. The drawer re-runs the same
// selection locally from the rest (defaults, rules, catalog, add-rates). Cart-based
// mode sends the rules for the cart's products plus the rules of the products
// being recommended, so a recommendation's own recommendations show the moment
// it's added. `bar` and `addRates` feed the gap-filler and performance ranking.
export async function buildUpsellsPayload({ shopId, themeId, upsells, items, bar, addRates = {} }) {
  const settings = settingsOf(upsells);
  // Drafts / products off the Online Store can be picked but never reach the cart.
  const defaults = (upsells.products || []).filter(isSellable);
  const base = {
    enabled: true,
    heading: upsells.heading,
    show_on_empty_cart: upsells.show_on_empty_cart || false,
    settings,
    add_rates: addRates,
    defaults,
  };

  if (settings.mode !== "cart_based") {
    return { ...base, products: selectUpsells({ items, defaults, settings, bar, addRates }) };
  }

  const rules = await loadRulesForProducts(shopId, themeId, triggerProductIds(items));
  const catalog = await loadCatalog(shopId, Object.values(rules).flat());
  const products = selectUpsells({ items, rules, catalog, defaults, settings, bar, addRates });

  // Lookahead: rules of everything we might show (twice the cap, so sold-out
  // backfill candidates are covered too).
  const candidates = pickRecommendations({ items, rules, catalog, defaults, settings, limit: settings.max_visible * 2 });
  const lookahead = await loadRulesForProducts(
    shopId,
    themeId,
    candidates.map((c) => c.product_id).filter((id) => !rules[id]),
  );
  Object.assign(rules, lookahead);
  const missing = Object.values(lookahead).flat().filter((id) => !catalog[id]);
  Object.assign(catalog, await loadCatalog(shopId, missing));

  return { ...base, products, rules, catalog };
}

// ── Product webhooks / shop data removal ──────────────────

// products/update. Refreshes the snapshot when a rule references the product
// (status included, so a drafted product is skipped until it's republished).
// A product the Admin API no longer returns is handled as a delete.
export async function syncUpsellProduct(shopId, admin, productId) {
  const id = numericId(productId);
  const known = await prisma.upsellProduct.findUnique({
    where: { shopId_productId: { shopId, productId: id } },
    select: { id: true },
  });
  if (!known || !admin) return { skipped: true };
  const [row] = await fetchProductSnapshots(admin, [id]);
  if (!row) return removeUpsellProduct(shopId, id);
  await upsertSnapshots(shopId, [row]);
  return { refreshed: true };
}

// products/delete. Drops the rules the product triggers (every theme), removes
// it from every recommendation list, drops rules left empty, and deletes the
// snapshot. One transaction, so a rule is never left half-updated.
export async function removeUpsellProduct(shopId, productId) {
  const id = numericId(productId);
  const listing = await prisma.upsellRule.findMany({
    where: { shopId, recommendedIds: { has: id } },
    select: { id: true, triggerProductId: true, recommendedIds: true },
  });
  const ops = [prisma.upsellRule.deleteMany({ where: { shopId, triggerProductId: id } })];
  const emptied = [];
  for (const rule of listing) {
    if (rule.triggerProductId === id) continue;
    const rest = rule.recommendedIds.filter((r) => r !== id);
    if (rest.length === 0) emptied.push(rule.id);
    else ops.push(prisma.upsellRule.update({ where: { id: rule.id }, data: { recommendedIds: rest } }));
  }
  if (emptied.length) ops.push(prisma.upsellRule.deleteMany({ where: { shopId, id: { in: emptied } } }));
  ops.push(prisma.upsellProduct.deleteMany({ where: { shopId, productId: id } }));
  await prisma.$transaction(ops);
  return { removed: true, rulesUpdated: listing.length };
}

// shop/redact: every upsell row for the shop.
export async function deleteShopUpsellData(shopId) {
  await prisma.$transaction([
    prisma.upsellRule.deleteMany({ where: { shopId } }),
    prisma.upsellProduct.deleteMany({ where: { shopId } }),
    prisma.upsellImport.deleteMany({ where: { shopId } }),
  ]);
}
