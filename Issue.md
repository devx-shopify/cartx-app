# Analytics tab — issues log

Tracking the problems found on the cartx **Analytics** tab, observed on the
`soulflower-bc21` store. We'll work through these one by one.

Screenshot reference: Analytics dashboard showing summary cards, daily trend
chart, and the "By promotion" table. Store currency ₹ (INR).

---

## Issue 1 — UI: "By promotion" table overflows / layout is off

**Symptom**
- The "By promotion" table runs to the very edge of the card (last column
  `AOV` is flush against / spilling past the right border). The table doesn't
  sit cleanly inside the section like the cards above it.
- General polish issues in the same region (heading + table spacing).

**Where it lives**
- `app/routes/app.analytics.jsx:337-363` — the table is a raw `<table>` with
  `width: 100%`, hardcoded `px` cell padding (`12px 16px`), and
  `whiteSpace: nowrap` on the headers (`SortableHeader`, line 208), rendered
  inside `<s-section padding="none">`.
- There is no horizontal-scroll wrapper around this table (unlike the trend
  chart at line 121, which has `overflow-x: auto`). With 8 columns + `nowrap`
  headers, on a narrower viewport the table can exceed the section width and
  clip/overflow instead of scrolling.

**Root-cause hypothesis**
- Raw HTML table inside a Polaris `s-section` with `padding="none"` and no
  overflow container. The section gives it no side gutter, so columns render
  edge-to-edge; and without an `overflow-x` wrapper wide content overflows the
  card rather than scrolling within it.

**Proposed fix (to confirm)**
- Wrap the table in a `div` with `overflow-x: auto` and give the section proper
  padding, OR migrate the table to Polaris `s-table`/`s-index-table` primitives
  for consistent gutters and responsive behavior.
- Audit the drill-down table too (`app/routes/app.analytics.$promotionId.jsx:96`)
  — same raw-table pattern, likely same fix.

**Resolution (done)**
Two contributing causes, fixed in two passes:
1. **Overflow/clipping (narrow screens):** `whiteSpace: nowrap` on the 8 header
   cells forced the table's intrinsic width wider than the card; with no scroll
   container the overflow painted past the right border. → Wrapped the table in
   an `overflowX: auto` scroller with a `minWidth` (720 "By promotion",
   560 drill-down).
2. **Full-bleed against the rounded card (wide screens — what was still
   visible in dev preview):** the raw table + its gray header band ran
   edge-to-edge inside `<s-section padding="none">`, so the band's square
   corners poked past the card's rounded corners with no side gutter.
   → Added a `padding: "0 16px 16px"` gutter wrapper and gave the scroller a
   `1px` border + `borderRadius: 8` (with the scroller's clipping context
   rounding the header band's corners). The table now reads as a contained,
   inset table — matching the look of the native `<s-table>` used on the
   Promotions list.
3. **Heading misalignment (3rd pass):** the "By promotion" / "Recent events"
   headings came from the `s-section heading` prop, which under `padding="none"`
   gets no left gutter — the heading hugged the card corner while the table was
   inset 16px. → Dropped the `heading` prop and rendered the heading as
   `<s-text variant="headingSm">` inside a `padding: "16px 16px 12px"` wrapper,
   aligning it with the table's left edge (mirrors the "Performance" header at
   `app.analytics.jsx:287`).
- Files: `app/routes/app.analytics.jsx`,
  `app/routes/app.analytics.$promotionId.jsx`. Lint clean (exit 0). No drawer
  rebuild needed (admin routes).
- Note: the app convention elsewhere is Polaris `<s-table>`
  (`app.promotions._index.jsx:367`). A full migration was deferred to avoid
  reworking the custom sortable headers + URL-driven sort + row-click
  drill-down; the containment fix achieves the same visual result with low risk.

**Status:** done

---

## Issue 2 — Data doesn't match Shopify's own analytics ("source of truth")

**Symptom**
- Numbers on this tab (attributed revenue, orders, AOV) don't line up with the
  figures in Shopify's native Analytics.

**What the code actually does (so we know why it differs)**
cartx analytics is a **self-contained pipeline** that does NOT read from
Shopify's analytics. It has its own definitions:

1. **Ingestion** — storefront drawer fires events
   (`app/drawer-src/src/tracker.js`) → App Proxy
   (`app/routes/proxy.analytics.jsx`) → `AnalyticsEvent` table.
2. **Revenue attribution** — the `orders/create` webhook
   (`app/routes/webhooks.orders.create.jsx` → `app/lib/attribution.server.js`)
   writes:
   - one `order_completed` row to the shop-wide `_shop` bucket using
     `order.total_price`, and
   - one `order_attributed` row **per promotion** using either the order
     `subtotal_price` (GWP/claim-gift, freebie lines) or the sum of matched
     line post-discount subtotals (volume/other).
3. **Rollup** — `app/lib/rollup.server.js` aggregates raw events into
   `DailyStats` hourly (Fly scheduled machine, `scripts/rollup.mjs`).
4. **Dashboard read** — `app/lib/analytics.server.js#getDashboardData` reads
   from `DailyStats` when it covers ≥80% of completed days, else live-aggregates
   over `AnalyticsEvent`.

### Deep-dive verdict (code-level, 2026-07-11): **NOT fully correct**

The raw event capture is sound, but the **summary cards** have genuine defects
and several metrics are misleading-by-definition. Detail below.

#### 🔴 Genuine correctness bugs

**B2.1 — "Attributed revenue" double-counts multi-promo orders.**
`attribution.server.js:266` credits each promotion in an order its *own*
`order_attributed` row, and for GWP/claim-gifts the amount is the **whole order
`subtotal_price`** (not the gift's value). The summary then **sums across
promotions** (`analytics.server.js:515,533`). So an order that triggers N
promotions counts its subtotal N times → the total can exceed real sales.
(soulflower: "Free Gift on above ₹999" ₹83,223 and "Free Perfume Set" ₹10,616
very likely share orders whose subtotals are both summed.)

**B2.2 — "Attributed orders" card actually shows *total* store orders.**
`summary.orders = shopOrders` (`analytics.server.js:534`), counting
`order_completed` — written for **every** order that hits the webhook, whether or
not a cartx promo was involved. So the card labeled "Attributed orders" is really
total store orders. The genuinely-attributed count (`attributedOrderCount`,
`:516`) is computed but never displayed.

**B2.3 — AOV lift compares apples to oranges (and is biased negative).**
- `aovWithPromo` = attributedRevenue / attributedOrderCount → based on
  **subtotal** (excl. tax/shipping, freebies zeroed).
- `aovWithoutPromo` = shopRevenue / shopOrders → based on **`total_price`**
  (incl. tax/shipping); baseline also *includes* the promo orders themselves
  (see comment `:518`).
  The two sides use different bases, so lift is systematically skewed and not
  trustworthy (`analytics.server.js:520-524`).

#### 🟡 Correct-as-computed but misleading

- **Conversion rate = claims/impressions is ~0% for every Offer by design** —
  auto-add GWP/bundle offers never emit `gift_claimed`; only *claim-gifts* do.
  The 0% conv-rate on Offer rows is structural, not a data error.
- **Per-promo Revenue = "subtotal of orders the promo touched"** = *influenced*
  revenue, NOT incremental/gift value, and not comparable to Shopify sales.
- **Claim-rate sub-label** divides by *all* impressions (incl. un-claimable offer
  impressions), diluting it.

#### 🟢 Actually correct
Raw event capture, impressions (unique session×promo), claims count, per-promo
order count, and the daily impressions/claims trend — all sound as defined.

#### Why it can't match Shopify (even after fixes)
Different definitions (attributed **subtotal** vs Shopify **gross/net sales**),
**webhook coverage** (only orders created after `orders/create` was live —
historical orders absent), tz bucketing, and B2.1's double-count. A 1:1 match
with Shopify's sales report is the wrong expectation; the goal is internal
consistency + honest labels.

#### Re: earlier "Claims = 0 everywhere" (soulflower)
Not a universal bug — the devx-dev store shows real claims (Buy 3 ₹1099 → 3
claims, 5.4%), so the pipeline works. soulflower's zeros are likely genuine (no
claim-gift claims yet) or store-specific; needs an event-level check on that
store, not a code fix.

**Open product decisions before implementing fixes** (require sign-off):
1. "Attributed revenue" definition — (a) distinct orders' subtotal counted once,
   (b) incremental/gift value only, or (c) keep per-promo but de-dupe the shop
   total.
2. "Attributed orders" — relabel to "Total orders", or show the de-duplicated
   attributed count.
3. AOV lift — drop it, or redefine on a single consistent basis (both sides
   subtotal, baseline = non-promo orders only).

#### Quantified against PROD (read-only, 2026-07-11, shop `soulflower-bc21`)
Measured over all-time `AnalyticsEvent` via the read-only WireGuard tunnel:
- **B2.1 double-count is real and exact.** Attributed revenue summed (what the
  dashboard shows) = **₹268,845.64**; counted once per order = **₹216,122.63** →
  **~24% overstated (₹52,723 phantom)**. 22 of 176 attributed orders touched 2
  promos; offer `619c6ccf` (22 orders / ₹52,723) is entirely a subset of offer
  `14ccf7f4`'s orders — every one double-credited. The inflation equals
  `619c6ccf`'s revenue to the cent.
- **B2.2 mislabel is large.** Only **176 distinct orders** (198 attributions)
  involved a cartx promo, but the "Attributed orders" card shows `shopOrders` =
  **10,619** (every store order) → overstated ~60×. cartx touched ~**1.7%** of
  orders.
- **B2.3.** aovWithoutPromo ≈ ₹729 (total_price basis) vs aovWithPromo ≈ ₹1,358
  (subtotal, double-counted) → would display **+86%**; directional but not exact.
- **Claims not broken:** 18 `gift_claimed` all-time; revenue promos are all
  auto-add Offers (no claim event) → 0% conv-rate by design.

### Approved correct-metrics spec (v1) — signed off 2026-07-11

Principle: **attribution rows are per-promo and may overlap; the per-promo table
stays "influenced" (overlap OK), but shop-level summaries must de-duplicate by
order.** Approved definitions (all recommended options accepted):

| # | Metric | Correct definition |
|---|--------|--------------------|
| ① | **Attributed revenue** (summary) | Σ **subtotal of distinct orders** that used ≥1 promo, each order once (de-duped). ~₹216k, not ₹269k. |
| ② | **Attributed orders** (summary) | Count of **distinct attributed orders** (176), sub-label "X% of <total> orders". |
| ③ | **AOV lift** (summary) | Same **subtotal** basis both sides; baseline = **non-promo orders only**. `aov_promo = attrRev/attrOrders` vs `aov_nonpromo = nonPromoRev/nonPromoOrders`. |
| ④ | Per-promo **Revenue** column | Keep values (per-promo influenced); **rename → "Influenced revenue"** + tooltip (orders may overlap across promos). |
| ⑤ | Per-promo **Conv. rate** | Type-aware: claim-gifts = claims/impr; offers = **attributed-orders/impr** (view→order). |
| ⑥ | **Claim rate** sub-label | Denominator = **claim-gift impressions only**. |

Durable implementation (same pattern as Issue 3 — snapshot the truth at write
time, aggregate in the rollup, read on both paths):
- **`attribution.server.js`**: on the `_shop` `order_completed` row, store the
  order **subtotal** and `metadata.attributed = (groups.size > 0)`.
- **Schema/migration**: `AnalyticsEvent.subtotal Int?`; `DailyStats` +
  `attributedOrders`, `attributedRevenue`, `nonPromoOrders`, `nonPromoRevenue`
  (Int, default 0). Nullable/zero-downtime.
- **`rollup.server.js`**: a per-day shop-metrics query over `order_completed`
  (split by `metadata.attributed`, sum `subtotal`, count rows = distinct orders
  since one row per order) → written onto the `_shop` DailyStats row.
- **`analytics.server.js`**: summary reads the de-duped `_shop` figures (fast
  path from DailyStats; live path from the same raw query); ⑤/⑥ from existing
  per-promo counts.
- **UI/CSV**: relabel cards + "Influenced revenue" column + conv-rate footnote.
- **Backfill**: one wide-window `rollupShop` run (raw events retained 90d)
  repopulates the new `_shop` fields for the dashboard's 7/30/90-day presets.

### Resolution (done — durable, 2026-07-11)
Implemented exactly per the approved spec:
- **`prisma/schema.prisma` + migration** `20260711102312_analytics_dedup_shop_metrics`:
  `AnalyticsEvent.subtotal Int?`; `DailyStats` + `attributedOrders`,
  `attributedRevenue`, `nonPromoOrders`, `nonPromoRevenue` (Int default 0).
  Zero-downtime; applied to local dev.
- **`attribution.server.js`**: `_shop` `order_completed` row now stores
  `subtotal` + `metadata.attributed = (groups.size > 0)`.
- **`rollup.server.js`**: per-day `order_completed` query (split by
  `metadata.attributed`, `SUM(COALESCE(subtotal, revenue))`, `COUNT` = distinct
  orders) → written onto the `_shop` DailyStats row.
- **`analytics.server.js`** (both paths): summary revenue/orders now use the
  de-duped `_shop` metrics; daily-chart revenue uses de-duped attributed revenue
  (fixes a prior cross-path inconsistency); AOV lift on one subtotal basis with
  a non-promo baseline; ⑤ type-aware conversion; ⑥ claim-rate ÷ claim-gift
  impressions.
- **UI** (`app.analytics.jsx`): "Attributed orders" shows distinct attributed +
  "X% of N orders" sub-label; "Influenced revenue" column rename + footnote.
  **CSV** header renamed too.
- **`scripts/backfill-shop-metrics.mjs`**: idempotent one-off — stamps
  `attributed`/`subtotal` on historical `order_completed` rows and re-rolls the
  window so the fast path is correct for existing data.

**Verified on dev** (synthetic double-count: one order triggering two offers):
both read paths return **de-duped ₹3000 (not ₹5000)**, **2/3 orders**, **+200%
lift**, type-aware conv; backfill correctly stamps old-style rows and repopulates
`DailyStats`. `npm test` 13/13, lint 0.

**Prod rollout (team — not done here; read-only access + no-deploy):**
1. `prisma migrate deploy` (runs via `npm run setup`).
2. Deploy the app (attribution starts stamping new orders).
3. `node scripts/backfill-shop-metrics.mjs --days=120` once, to correct history.
Expected soulflower effect: Attributed revenue ₹268,846 → **₹216,123**;
Attributed orders 10,619 → **176 (1.7%)**.

**Status:** done (durable) — pending prod migrate + backfill by the team

---

## Issue 3 — Rows showing raw UUIDs as the promotion name

**Symptom**
Two rows show a raw UUID instead of a name, with Type `—`:
- `07c5f65e-08d1-450a-941f-e316aef7bbea` — 15 impressions, type `—`
- `f8253187-da4e-41fa-ba52-a1df319f0865` — 4 impressions, type `—`

**Why this happens (code)**
- `getDashboardData` builds `idToName` **only** from the `offers`, `coupons`,
  and `claim_gifts` arrays inside `ThemeConfig` blobs
  (`analytics.server.js:451-456`; type map at `:549`). If a promotion id isn't
  in one of those three arrays, `p.name` falls back to the raw id
  (`:458`) and `type` stays `null` → renders `—`.

**Candidate explanations (to confirm against this store's data)**
1. **Deleted promotions** — the promotion was removed from `ThemeConfig`
   (delete/duplicate flows in `app.promotions._index.jsx`) but its historical
   `AnalyticsEvent` rows still carry the old id.
2. **Volume-discount / bundle offers** — these live under a *different*
   ThemeConfig key `__volume_discount__` with a nested `functionConfig.offers`
   shape (`attribution.server.js:99-122`), which the dashboard name lookup does
   **not** read. So their ids show as `—`.
3. **Progress-bar tier / milestone ids** — impressions come from
   `data-cartmax-promo-id` on observed tiles (`CartDrawer.jsx:1710`,
   `_observePromo`). If a tier's `promotion_id` isn't one of the three named
   arrays, it surfaces as a bare id.

**How to definitively identify them**
- Query the store's `ThemeConfig` rows (all `themeId`s incl. `__volume_discount__`)
  and search these two ids; and query `AnalyticsEvent` for
  `promotionId IN (...)` to see which `event`/`source`/`promotionType` they carry.
- These are impression-only (0 orders/claims/revenue), which fits "viewed in the
  drawer but not a named/attributable offer."

**Confirmed RCA**
- Analytics never persisted a promotion's name/type — both were resolved *at
  read time* from the current `ThemeConfig` (`analytics.server.js` name lookup).
- Promotion ids are `crypto.randomUUID()` (`helpers.server.js:107`), so the two
  UUIDs are real former promotion ids. When a promotion is **deleted or
  recreated** (delete filters it out of config; recreate mints a new UUID) the
  old id leaves config but immutable `AnalyticsEvent`/`DailyStats` rows keep it →
  lookup misses → raw UUID printed.
- The Type shows "—" specifically because the live store renders via the
  **DailyStats fast path**, and `DailyStats` had **no name/type columns** — type
  was backfilled only from current config, which the orphan isn't in.
- Not reproducible in dev: dev has no delete/recreate history AND (with little
  DailyStats coverage) uses the live path, which reads type straight off the
  event. Pure data-history condition, not an env/code difference.

**Resolution (done — durable, Option A: snapshot at write time)**
Name + type are now captured server-side when the event is written (promotion is
guaranteed to still exist in config at that moment), so labels are immutable and
independent of the config lifecycle:
- **Schema + migration** (`20260710190247_analytics_promotion_name_type_snapshot`):
  `AnalyticsEvent.promotionName`; `DailyStats.promotionName` + `promotionType`
  (all nullable — zero-downtime). Applied to local dev DB.
- **New resolver** `app/lib/promotion-meta.server.js` — cached
  `id → {name,type}` map from `ThemeConfig` (volume-discount offers share the
  same id as their `config.offers` entry, so no special-casing).
- **Ingestion** (`analytics.server.js` `stampPromotionMeta`, called from
  `recordEvent`/`recordEventBatch`) stamps name/type from live config.
- **Order attribution** (`attribution.server.js`) stamps the name on
  `order_attributed` rows.
- **Rollup** (`rollup.server.js`) carries name/type into the new `DailyStats`
  columns (`MAX()` per bucket; update only overwrites with a non-null label so a
  later deleted-promo window can't erase a good name).
- **Read side** (both `getDashboardData` paths): resolve name/type by priority
  **snapshot → current config → "Deleted promotion (<short id>)"**. Raw UUIDs are
  never shown again, and the fast-path "—" type is fixed (type now stored).
- Verified end-to-end on dev DB: (a) live path — snapshot survives config
  deletion, orphan → "Deleted promotion (…)"; (b) fast path — rollup persists and
  reads back `name`/`type` from `DailyStats`. `npm test` green (13/13), lint 0.
- **Existing orphans** (the two live-store UUIDs): their real names were never
  persisted anywhere, so they'll show "Deleted promotion (<short id>)". Every
  promotion from now on is labeled durably, including future deletions.
- **Confirmed on prod (2026-07-11, read-only):** both UUIDs are **deleted
  Offers** (`promotion_type='offer'` in the raw events) —
  `07c5f65e…` (31 impressions + 1 order on 2026-07-06) and `f8253187…`
  (22 impressions on 2026-06-16/17). They rendered as UUID + "—" because the
  store uses the DailyStats fast path (no type column pre-fix); post-fix they
  show "Deleted promotion (…)" with type **Offer**. Validates the RCA.
- **Deploy note:** prod needs `prisma migrate deploy` (runs via the existing
  `npm run setup`). No `shopify app deploy` performed; no drawer rebuild needed.

**Status:** done

---

## Issue 4 — Show each promotion's current status (Active / Draft)

**Symptom**
- The "By promotion" table has no status column. A merchant can't tell whether a
  listed promotion is currently Active or Draft.

**Where the status lives**
- Promotions are stored in `ThemeConfig` under `offers` / `coupons` /
  `claim_gifts`; status is the `enabled` boolean.
- The Promotions list already renders this as a badge:
  `app.promotions._index.jsx:408` →
  `<s-badge tone={promo.enabled ? "success" : "warning"}>{promo.enabled ? "Active" : "Draft"}</s-badge>`.
- The analytics builder reads these same arrays but currently pulls only
  `name`/`type` (`analytics.server.js:451-456`, `:549-557`) — `enabled` is
  discarded.

**Resolution (done)**
Status is derived from **current config** at read time (it's a live property, not
historical — merchants want the promotion's status *now*), so no schema change /
migration / drawer rebuild was needed. Four states:
- **Active** (`enabled`) · **Draft** (manually disabled) · **Needs attention**
  (`enabled:false` + `_needs_attention`, i.e. auto-drafted by
  `product-sync.server.js` when a used product was deleted/unavailable) ·
  **Deleted** (id no longer in any theme config — the Issue 3 overlap).
- **Decisions applied:** deleted → "Deleted" badge; 3 live states surfaced;
  status column **not** sortable; multi-theme = **enabled-in-any-theme wins**
  (aggregated in `loadPromotionMeta`).

Changes:
- `promotion-meta.server.js`: resolver now also returns `enabled` +
  `needsAttention` (aggregated across themes); new `promotionStatus(meta)` helper
  maps to `active | draft | needs-attention | deleted`.
- `analytics.server.js`: both read paths attach `p.status = promotionStatus(cfg)`.
- `app.analytics.jsx`: non-sortable **Status** column (badge) inserted after
  Type via a `COLUMN_ORDER` array; `StatusBadge` with verified `s-badge` tones
  (active→success, draft→warning, needs-attention→critical, deleted→auto).
- `app.analytics.$promotionId.jsx`: status badge above the drill-down cards.
- `app.analytics.export.jsx`: **Status** column added to the CSV.
- Verified end-to-end on dev DB (all four states resolve correctly, incl. a
  deleted/not-in-config promo). `npm test` green (13/13), lint 0. No migration,
  no drawer rebuild.

**Status:** done

---

## Suggested order of work
1. **Issue 1** (UI overflow) — quick, isolated, low risk.
2. **Issue 3** (UUID identification) — needs a DB lookup; informs Issues 2 & 4.
3. **Issue 4** (status column) — builds on the name/type resolution touched by 3.
4. **Issue 2** (data correctness / source of truth) — largest; depends on
   findings from 3 and the claims investigation.
