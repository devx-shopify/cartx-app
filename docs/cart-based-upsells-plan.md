# Cart-based upsells: plan

**Goal:** a merchant maps a trigger product to an ordered list of recommended
products, and the drawer shows recommendations based on what's in the cart. The
current static list stays as the default fallback. Rules can be imported and
exported as CSV.

**Status:** Planned, not built. Branch: `research`.
**Estimate:** about 12–17 working days.

## Phase 0: Spike (0.5 d)
- **T0.1** Check that the GraphQL cart returns lines newest first.
- **T0.2** Check that the Admin API can look up products by handle in batches.
- **T0.3** Check that the storefront token can read product and variant stock
  status.

**Done when:** all three are confirmed, or the plan is adjusted.

## Phase 1: Data and engine (2–3 d)
- **T1.1** Add Prisma tables for rules (per theme), product snapshots and import
  history, plus a migration.
- **T1.2** Add the new upsell settings with defaults and validation: mode,
  no-match behavior, fill with default, sold-out handling, max shown, max per
  product.
- **T1.3** Add server helpers for rules: create, edit, delete, bulk toggle, load
  by cart products.
- **T1.4** Write the recommendation logic for server and drawer, with shared test
  cases.
- **T1.5** Return rule-based recommendations from the cart proxy. Static mode stays
  unchanged.
- **T1.6** Add a feature check for later billing gating.

**Done when:** tests, lint and typecheck pass, and static-mode shops behave as
before.

## Phase 2: Admin (3–4 d)
- **T2.1** New Upsells page with a nav entry.
- **T2.2** Settings tab.
- **T2.3** Default products tab: move it from Settings, keep previous picks,
  allow reordering, fix the currency display.
- **T2.4** Product rules table with search, pagination and bulk actions.
- **T2.5** Rule edit modal with validation.
- **T2.6** Theme copy includes rules. The Settings page shows a summary card.

**Done when:** rules can be created, edited, reordered, toggled and deleted, and
copying a theme copies its rules.

## Phase 3: Drawer (2–3 d)
- **T3.1** Render recommendations from the cart contents, falling back to the
  default list.
- **T3.2** Instantly show a recommended product's own recommendations once it's
  added.
- **T3.3** Batch the stock checks. Hide or show sold-out products, per the
  setting.
- **T3.4** Add the first available variant, and show an "Adding…" state on every
  cart path.
- **T3.5** Track add order on the GraphQL cart, if T0.1 requires it.
- **T3.6** Analytics: upsell views, plus source and trigger on adds.
- **T3.7** Rebuild `cartmax.js`.

**Done when:** recommendations follow the cart, newest first with no repeats, on
both the AJAX and GraphQL carts.

## Phase 4: Import / export (2–3 d)
- **T4.1** Sample CSV and export downloads.
- **T4.2** Upload, parse and preview, with a per-row report.
- **T4.3** Apply as Replace all (default) or Merge, plus Undo last import.
- **T4.4** Import UI.

**Done when:** a sheet of about 80 products imports correctly, export then
re-import gives identical rules, and undo works.

## Phase 5: Sync and housekeeping (1–2 d)
- **T5.1** Product update and delete webhooks keep rules and snapshots current.
- **T5.2** Refresh the default list's compare-at price and handle.
- **T5.3** Per-rule analytics rollup.
- **T5.4** Clean up the upsell data on uninstall and shop redact.

**Done when:** editing, drafting or deleting a product updates the rules
correctly.

## Phase 6: QA and rollout (1–2 d)
- **T6.1** Check that static mode is unchanged.
- **T6.2** End-to-end test on `devx-dev`.
- **T6.3** Run all quality gates and update the docs.
- **T6.4** Enable per shop. Existing shops stay on static until switched.

**Done when:** everything is verified on `devx-dev`. Deploying stays with the team.
