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

**Why it will legitimately differ from Shopify (candidate causes to verify)**
- **Different metric definition.** cartx "Attributed revenue" = *promotion-
  attributed subtotal* (freebie lines zeroed, shipping/tax excluded). Shopify
  "sales" = gross/net sales across the whole store. These are not the same
  number by design.
- **Attribution window / coverage.** cartx only has data for orders received
  via the `orders/create` webhook *after the app was installed / webhook
  registered*. Historical orders won't be attributed.
- **AOV lift is explicitly a v1 directional metric** — see comment at
  `app/lib/analytics.server.js:468-471`. `aovWithPromo` includes attributed
  orders in the shop-wide baseline too, so lift is approximate.
- **Timezone bucketing.** Days are bucketed in the shop's IANA timezone
  (`analytics.server.js`, `rollup.server.js`). If the shop tz isn't synced onto
  the `Store` row yet it falls back to UTC → day boundaries shift vs Shopify.
- **Rollup vs live drift.** If `DailyStats` is stale/partial (rollup missed a
  run) but still ≥80% covered, the fast path can under-report recent days.
- **Possible double-count / miss in attribution** — line-property path vs
  volume-discount path (`attribution.server.js`, pass 1 & 2). Needs a spot check
  against a known order.

**Sub-observation (likely a real bug): Claims = 0 everywhere**
- Every row shows `Claims 0` and `Conv. rate 0%` despite hundreds/thousands of
  impressions, including on `Claim Gift` promotions.
- `claims` is populated only by `gift_claimed` events
  (`analytics.server.js:409`, emitted at `CartDrawer.jsx:2178/2186/2234`).
- Need to confirm whether `gift_claimed` is actually firing/reaching the server
  for this store, or whether claims are being attributed under a different
  `promotion_id` than the impression (see Issue 3 — id mismatch would split
  impressions and claims across different rows).

**Action items**
- [ ] Decide and document the **source of truth** + exact metric definitions
      (what "revenue"/"orders"/"AOV" mean on this tab vs Shopify).
- [ ] Verify the shop's `ianaTimezone` and `currencyCode` are synced on `Store`.
- [ ] Verify rollup freshness for this shop (last `DailyStats` date).
- [ ] Trace one real order end-to-end through `attributeOrder` and compare to
      Shopify's order detail.
- [ ] Investigate why claims are 0 (event firing? id mismatch? consent gating?).

**Status:** open — investigation needed

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

**Proposed fix (to confirm)**
- In `getDashboardData` / `buildFromDailyStats`, capture `enabled` into an
  `idToStatus` map alongside `idToName`/`idToType`, attach `status` to each
  promotion row, and render a status badge column in the table
  (`app.analytics.jsx`) plus in the CSV export
  (`app.analytics.export.jsx`).
- Decide how to label promotions that no longer exist in config (Issue 3
  overlap) — e.g. "Deleted" / "Archived".

**Status:** open

---

## Suggested order of work
1. **Issue 1** (UI overflow) — quick, isolated, low risk.
2. **Issue 3** (UUID identification) — needs a DB lookup; informs Issues 2 & 4.
3. **Issue 4** (status column) — builds on the name/type resolution touched by 3.
4. **Issue 2** (data correctness / source of truth) — largest; depends on
   findings from 3 and the claims investigation.
