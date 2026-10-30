// Upsell product rules: CSV import (preview → apply → undo), export and the
// downloadable sample sheet. The file format lives in upsell-csv.js.
import prisma from "../db.server.js";
import { identifierKey, parseCsv, readImportRows, toCsv } from "./upsell-csv.js";
import { isSellable } from "./sellable.js";
import { PRODUCT_SNAPSHOT_FIELDS, adminQuery, cleanRecommendedIds, productNodeToRow, upsertSnapshots } from "./upsells.server.js";

// Snapshot rows use onlineStore; isSellable reads the config-style online_store.
const snap = (row) => ({ status: row.status, online_store: row.onlineStore });

const HANDLES_PER_QUERY = 50; // keeps the search query string well under the API limit
const PARALLEL_QUERIES = 4; // lookups in flight at once: faster for big sheets, gentle on the rate limit
const KEEP_IMPORTS = 5;

// ── Resolve identifiers → product snapshots ───────────────────

async function resolveIdentifiers(admin, idents) {
  const handles = [...new Set(idents.filter((i) => i.kind === "handle").map((i) => i.value))];
  const ids = [...new Set(idents.filter((i) => i.kind === "id").map((i) => i.value))];
  const out = {};

  const jobs = [];
  for (let i = 0; i < handles.length; i += HANDLES_PER_QUERY) {
    const batch = handles.slice(i, i + HANDLES_PER_QUERY);
    jobs.push(async () => {
      const query = batch.map((h) => `handle:"${h.replace(/"/g, "")}"`).join(" OR ");
      const data = await adminQuery(
        admin,
        `#graphql
        query cartxUpsellImportHandles($query: String!) {
          products(first: 250, query: $query) { nodes { ${PRODUCT_SNAPSHOT_FIELDS} } }
        }`,
        { query },
      );
      for (const node of data.products?.nodes ?? []) {
        // The search can match loosely; keep exact handle matches only.
        const handle = String(node.handle || "").toLowerCase();
        if (batch.includes(handle)) out[`handle:${handle}`] = productNodeToRow(node);
      }
    });
  }
  for (let i = 0; i < ids.length; i += 250) {
    const batch = ids.slice(i, i + 250);
    jobs.push(async () => {
      const data = await adminQuery(
        admin,
        `#graphql
        query cartxUpsellImportIds($ids: [ID!]!) {
          nodes(ids: $ids) { ... on Product { ${PRODUCT_SNAPSHOT_FIELDS} } }
        }`,
        { ids: batch.map((id) => `gid://shopify/Product/${id}`) },
      );
      for (const node of data.nodes ?? []) {
        if (node?.id) {
          const row = productNodeToRow(node);
          out[`id:${row.productId}`] = row;
        }
      }
    });
  }

  // A few lookups at a time. Any failure rejects the whole resolve, so a
  // throttled call can never turn real products into "not found".
  for (let i = 0; i < jobs.length; i += PARALLEL_QUERIES) {
    await Promise.all(jobs.slice(i, i + PARALLEL_QUERIES).map((job) => job()));
  }
  return out;
}

// ── Plan an import ────────────────────────────────────────────

/**
 * Parse + resolve a CSV into the rules it would write and a per-row report.
 * Nothing is written. Rows the merchant must fix are "skipped"; rows that
 * import with something dropped are "warning".
 */
export async function planImport(admin, csvText, cap) {
  const parsed = readImportRows(parseCsv(csvText));
  if (parsed.error) return { error: parsed.error };
  if (parsed.rows.length === 0) return { error: "The file has a header but no rules." };

  const idents = parsed.rows.flatMap((r) => [r.trigger, ...r.recs.map((x) => x.ident)]).filter(Boolean);
  const products = await resolveIdentifiers(admin, idents);

  const report = [];
  const byTrigger = new Map(); // triggerId -> index in `report`
  for (const row of parsed.rows) {
    const entry = { line: row.line, trigger: row.triggerRaw, triggerTitle: null, recs: [], status: "ok", messages: [], triggerId: null, recIds: [] };
    report.push(entry);
    const trigger = row.trigger && products[identifierKey(row.trigger)];
    if (!row.trigger) {
      entry.status = "skipped";
      entry.messages.push("No trigger product.");
      continue;
    }
    if (!trigger) {
      entry.status = "skipped";
      entry.messages.push(`Trigger product "${row.triggerRaw}" not found.`);
      continue;
    }
    entry.triggerId = trigger.productId;
    entry.triggerTitle = trigger.title;
    if (!isSellable(snap(trigger))) entry.messages.push("Trigger product isn't live on the Online Store.");

    const unknown = [];
    const found = [];
    for (const rec of row.recs) {
      const p = products[identifierKey(rec.ident)];
      if (p) found.push(p); else unknown.push(rec.raw);
    }
    if (unknown.length) entry.messages.push(`Not found, left out: ${unknown.join(", ")}.`);
    const { ids, removed } = cleanRecommendedIds(trigger.productId, found.map((p) => p.productId), cap);
    if (removed.self) entry.messages.push("The trigger can't recommend itself; left out.");
    if (removed.duplicate) entry.messages.push(`${removed.duplicate} duplicate ${removed.duplicate === 1 ? "product" : "products"} left out.`);
    if (removed.overCap) entry.messages.push(`Over the limit of ${cap}; the last ${removed.overCap} left out.`);
    const titles = Object.fromEntries(found.map((p) => [p.productId, p]));
    const inactive = ids.filter((id) => !isSellable(snap(titles[id]))).length;
    if (inactive) entry.messages.push(`${inactive} recommended ${inactive === 1 ? "product isn't" : "products aren't"} live (kept, hidden in the cart until live).`);
    entry.recIds = ids;
    entry.recs = ids.map((id) => titles[id].title);

    if (ids.length === 0) {
      entry.status = "skipped";
      entry.messages.push("No valid recommended products.");
      continue;
    }
    if (entry.messages.length) entry.status = "warning";

    // The same trigger twice: the later row wins.
    if (byTrigger.has(trigger.productId)) {
      const earlier = report[byTrigger.get(trigger.productId)];
      earlier.status = "skipped";
      earlier.messages.push(`Replaced by row ${row.line} (same trigger product).`);
    }
    byTrigger.set(trigger.productId, report.length - 1);
  }

  const rules = report.filter((r) => r.status !== "skipped").map((r) => ({ triggerProductId: r.triggerId, recommendedIds: r.recIds }));
  const usedIds = new Set(rules.flatMap((r) => [r.triggerProductId, ...r.recommendedIds]));
  const snapshots = Object.values(products).filter((p, i, all) => usedIds.has(p.productId) && all.findIndex((q) => q.productId === p.productId) === i);
  const counts = {
    rows: report.length,
    ok: report.filter((r) => r.status === "ok").length,
    warning: report.filter((r) => r.status === "warning").length,
    skipped: report.filter((r) => r.status === "skipped").length,
  };
  return {
    rules,
    snapshots,
    counts,
    report: report.map(({ triggerId: _t, recIds: _r, ...rest }) => rest),
  };
}

// ── Apply / undo ──────────────────────────────────────────────

async function currentRules(shopId, themeId) {
  const rows = await prisma.upsellRule.findMany({ where: { shopId, themeId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ triggerProductId: r.triggerProductId, recommendedIds: r.recommendedIds, enabled: r.enabled }));
}

/** Write a planned import. mode "replace" swaps out every rule on the theme;
 *  "merge" only replaces the rules of triggers in the file. The previous rule
 *  set is saved first so the import can be undone. */
export async function applyImport(shopId, themeId, plan, mode) {
  await upsertSnapshots(shopId, plan.snapshots);
  const previous = await currentRules(shopId, themeId);
  const ops = [
    prisma.upsellImport.create({
      data: { shopId, themeId, previousRules: previous, summary: { ...plan.counts, mode } },
    }),
  ];
  if (mode === "replace") {
    ops.push(prisma.upsellRule.deleteMany({ where: { shopId, themeId } }));
    ops.push(prisma.upsellRule.createMany({
      data: plan.rules.map((r) => ({ shopId, themeId, triggerProductId: r.triggerProductId, recommendedIds: r.recommendedIds, enabled: true })),
    }));
  } else {
    for (const r of plan.rules) {
      ops.push(prisma.upsellRule.upsert({
        where: { shopId_themeId_triggerProductId: { shopId, themeId, triggerProductId: r.triggerProductId } },
        create: { shopId, themeId, triggerProductId: r.triggerProductId, recommendedIds: r.recommendedIds, enabled: true },
        update: { recommendedIds: r.recommendedIds },
      }));
    }
  }
  await prisma.$transaction(ops);

  const old = await prisma.upsellImport.findMany({
    where: { shopId, themeId },
    orderBy: { createdAt: "desc" },
    skip: KEEP_IMPORTS,
    select: { id: true },
  });
  if (old.length) await prisma.upsellImport.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return { applied: plan.rules.length };
}

export async function lastImport(shopId, themeId) {
  return prisma.upsellImport.findFirst({
    where: { shopId, themeId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, summary: true },
  });
}

export async function undoLastImport(shopId, themeId) {
  const last = await prisma.upsellImport.findFirst({ where: { shopId, themeId }, orderBy: { createdAt: "desc" } });
  if (!last) return { error: "There's no import to undo." };
  const previous = Array.isArray(last.previousRules) ? last.previousRules : [];
  await prisma.$transaction([
    prisma.upsellRule.deleteMany({ where: { shopId, themeId } }),
    prisma.upsellRule.createMany({
      data: previous.map((r) => ({ shopId, themeId, triggerProductId: r.triggerProductId, recommendedIds: r.recommendedIds, enabled: r.enabled !== false })),
    }),
    prisma.upsellImport.delete({ where: { id: last.id } }),
  ]);
  return { restored: previous.length };
}

// ── Export / sample ───────────────────────────────────────────

// Re-importing the export unchanged recreates the same rules.
export async function exportRulesCsv(shopId, themeId) {
  const rules = await prisma.upsellRule.findMany({ where: { shopId, themeId }, orderBy: { createdAt: "asc" } });
  const ids = [...new Set(rules.flatMap((r) => [r.triggerProductId, ...r.recommendedIds]))];
  const snaps = await prisma.upsellProduct.findMany({ where: { shopId, productId: { in: ids } } });
  const byId = Object.fromEntries(snaps.map((s) => [s.productId, s]));
  const ref = (id) => byId[id]?.handle || id;
  const width = Math.max(1, ...rules.map((r) => r.recommendedIds.length));

  const header = ["trigger", "trigger_title"];
  for (let i = 1; i <= width; i++) header.push(`recommendation_${i}`, `recommendation_${i}_title`);
  const rows = [header];
  for (const r of rules) {
    const row = [ref(r.triggerProductId), byId[r.triggerProductId]?.title || ""];
    for (let i = 0; i < width; i++) {
      const id = r.recommendedIds[i];
      row.push(id ? ref(id) : "", id ? byId[id]?.title || "" : "");
    }
    rows.push(row);
  }
  return toCsv(rows);
}

export async function sampleCsv(admin) {
  const data = await adminQuery(
    admin,
    `#graphql
    query cartxUpsellSample { products(first: 8, query: "status:active") { nodes { handle } } }`,
  );
  const h = (data.products?.nodes ?? []).map((n) => n.handle);
  const rows = [["trigger", "recommendation_1", "recommendation_2", "recommendation_3", "recommendation_4", "recommendation_5"]];
  if (h.length >= 4) {
    rows.push([h[0], h[1], h[2], h[3], "", ""]);
    if (h.length >= 7) rows.push([h[4], h[5], h[6], "", "", ""]);
  } else {
    rows.push(["your-product-handle", "recommended-product-handle", "another-product-handle", "", "", ""]);
  }
  return toCsv(rows);
}
