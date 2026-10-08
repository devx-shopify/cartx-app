# cartx — Product Overview & Roadmap

> A merchant-facing Shopify app that turns the cart into a revenue surface:
> a fast, fully-branded cart drawer with built-in promotions, gifts, volume
> discounts, and conversion analytics.
>
> Status as of **15 June 2026**. Audience: leadership / stakeholders.

---

## 1. Executive summary

cartx replaces the default Shopify cart with a high-converting, fully
customizable **cart drawer** that merchants control end-to-end — look, feel,
and the promotions inside it. Shoppers see free gifts, volume discounts,
"spend ₹X more to unlock" progress bars, upsells, and coupons without ever
leaving the page.

The app is **deployed in production** on Fly.io, secured to Shopify's standards
(OAuth, HMAC, full GDPR compliance), instrumented with error monitoring
(Sentry) and a real analytics pipeline that attributes revenue back to each
promotion.

**The immediate priority is go-live.** First launch is a new store, **soul
flower** — all settings and drawer UI are configured in our test store, and
the remaining work is migrating those promotions + customizer settings into
soul flower and proving the experience end-to-end. **Testing is P0**: we are
unit testing now, then a dedicated QA expert signs off before launch. Once
soul flower is live and stable, we roll out to **existing cartx customers**.

A **headless cart** migration (Shopify AJAX Cart API → Storefront GraphQL Cart
API) runs as a **parallel, lower-priority track**. It unlocks richer pricing,
subscriptions, and multi-currency markets, but it does **not** gate go-live.

---

## 2. What cartx does today

### 2.1 Cart experience
- **Slide-out cart drawer** that opens instantly on add-to-cart, with no page
  reload. Works on top of any Shopify theme.
- **Real-time updates** — quantity changes, removals, and gift unlocks reflect
  immediately with optimistic UI.
- **Fully accessible** — keyboard navigation, focus trapping, screen-reader
  announcements.
- **Branded to the merchant** — colors, fonts, radius, layout, copy, animation,
  and even confetti are all merchant-controlled.

### 2.2 Promotions engine (the revenue driver)
A single configurable engine powers multiple promotion types:

| Promotion | What the shopper sees |
|---|---|
| **Auto-add free gifts** | A freebie drops into the cart when they hit a spend/quantity threshold |
| **Claim gifts** | Shopper picks a free gift from a curated pool |
| **Volume discounts** | Tiered pricing ("buy 3 save 10%, buy 4 save 15%") |
| **Bundles** | Grouped products with special pricing |
| **Upsells** | Recommended products surfaced in the drawer |
| **Coupons** | Showcased discount codes applied/removed inline |
| **Progress bar** | "Spend ₹X more to unlock free shipping / a gift" |

Promotions are triggered by cart value, item quantity, products present, page
context, and **customer segments** (include/exclude by tag). Discounting is
enforced server-side through two **Shopify Functions** (freebie discount and
volume discount), so prices can't be tampered with from the browser.

### 2.3 Merchant admin (embedded in Shopify)
- **Promotions editor** — create, edit, duplicate, and toggle every promotion type.
- **Cart customizer** — live-preview editor for colors, typography, layout,
  copy, sections, and behavior; export/import settings; custom CSS.
- **Analytics dashboard** — views, claim rates, attributed revenue, AOV lift,
  and per-promotion drill-down with CSV export.
- **Per-theme configuration** — different drawer setups for different themes.
- **Guided onboarding** and discount-function health checks.

---

## 3. Security & compliance

cartx is built to Shopify App Store security standards:

- **OAuth** via Shopify's official framework; online + offline tokens with
  refresh support, stored in PostgreSQL.
- **Least-privilege scopes** — only what's needed (products, discounts,
  customers, orders, themes, content).
- **HMAC verification everywhere** — webhooks and app-proxy requests are
  cryptographically verified using timing-safe comparison.
- **Full GDPR compliance** — mandatory `customers/data_request`,
  `customers/redact`, and `shop/redact` webhooks implemented, including full
  data cleanup on shop uninstall.
- **Rate limiting** — sliding-window limiter per store on public endpoints.
- **Input validation** — every inbound request is schema-validated (Zod) with
  numeric bounds clamping to prevent abuse.
- **Tamper-proof discounts** — discounts are applied by server-side Shopify
  Functions, never trusted from the client.

---

## 4. Deployment & infrastructure

- **Platform:** Fly.io, primary region **Mumbai (bom)** — optimized for our
  current merchant base.
- **CI/CD:** GitHub Actions auto-deploys on every push to `main`.
- **Containerized:** hardened Docker image (non-root, production-only deps),
  database migrations run automatically on boot.
- **Always-warm:** machines stay running so the embedded app loads instantly
  inside Shopify admin.
- **Health checks:** `/health` endpoint verifies database connectivity; Fly
  auto-restarts unhealthy machines.

---

## 5. Error monitoring & reliability

- **Sentry** across the web server and background jobs — unhandled errors are
  captured automatically and safely (monitoring never breaks the app).
- **Cron heartbeats** — the hourly analytics rollup and daily retention jobs
  report check-ins to Sentry, so a missed or failed run alerts us immediately.
- **Uptime monitoring** on the health endpoint.
- **Defensive webhook handling** — order-attribution errors are logged without
  triggering Shopify retries.

---

## 6. Analytics

A genuine two-tier analytics pipeline, not just dashboards:

- **Raw events** (`AnalyticsEvent`) — captured from three sources: the cart
  **drawer**, the Shopify **Web Pixel** (checkout funnel), and the **server**
  (order webhooks). Validated and bounds-checked on ingest.
- **Daily aggregates** (`DailyStats`) — an **hourly rollup** job folds raw
  events into timezone-aware daily stats per promotion. Dashboards read these
  for fast, long-range queries.
- **Revenue attribution** — the `orders/create` webhook links each order back
  to the promotion that drove it, via both line-item tagging (gifts) and
  discount-application matching (volume discounts).
- **Retention** — raw events pruned after 90 days; aggregates kept
  indefinitely. Keeps the database lean and costs predictable.

Merchants get: total views, claim rate, attributed revenue and orders, AOV
**with vs. without** promotions (the lift number that proves ROI), daily
trends, and per-promotion breakdowns.

---

## 7. Promotions architecture (how it holds together)

1. **Configure** in the admin → stored per theme (`ThemeConfig`).
2. **Evaluate** — when the cart changes, the drawer asks the server which
   promotions apply (triggers, segments, thresholds), with a fast local
   estimate for instant feedback.
3. **Enforce** — Shopify Functions apply the actual discounts server-side at
   checkout, so the math is always correct and never client-trusted.
4. **Measure** — every interaction emits an analytics event; orders are
   attributed back to promotions for true ROI.

---

## 8. Go-live plan (the priority)

The goal is to put cartx into the hands of real merchants — starting with
**soul flower**, then existing cartx customers. **Quality is the gate, not
speed:** nothing launches until QA gives a green flag.

### 8.1 Track A — soul flower launch (P0)
The first production store. Status: settings and drawer UI are fully
configured in our **test store**. Remaining work:

1. **Migrate configuration** — port all promotions + customizer settings from
   the test store into the soul flower store.
2. **Unit testing** *(in progress now)* — verify the promotions engine,
   triggers, discount functions, and analytics events at the unit level.
3. **End-to-end testing** — exercise the full shopper journey: add to cart →
   drawer → gifts / volume discounts / coupons → checkout → order attribution,
   across devices and the live theme.
4. **QA sign-off** — a dedicated QA expert runs the full suite and gives the
   **green flag**. This is the launch gate.
5. **Go-live** — enable cartx on soul flower in production; monitor closely.

### 8.2 Track B — existing cartx customers
Once soul flower is live and stable, roll the validated build out to existing
customers in a **phased** manner:
- Re-confirm each store's promotions + customizer config.
- Staged enablement (pilot cohort → broader rollout) with monitoring between
  waves.
- Watch Sentry + analytics for regressions; keep rollback simple per store.

### 8.3 Testing is P0 — what "green flag" means
- **Unit tests** cover the promotion evaluation logic, triggers, discount
  function behavior, and analytics event recording.
- **End-to-end / QA** covers the real storefront: drawer behavior, gift unlocks,
  volume tiers, coupon apply/remove, checkout, and revenue attribution.
- **QA expert** owns the final sign-off. No launch — soul flower or customer
  rollout — proceeds without it.

### 8.4 Parallel track — headless cart (not a priority)
> Detailed engineering plan: [`graphql-cart-migration-plan.md`](./graphql-cart-migration-plan.md)

The migration from Shopify's legacy **AJAX Cart API** to the **Storefront
GraphQL Cart API** runs in the background and **does not gate go-live**. It
unlocks richer pricing, subscriptions/selling plans, multi-currency markets,
fewer round-trips, and a more robust foundation. It stays flag-gated and
reversible so it never threatens the live launches. We invest in it
opportunistically — typically after the soul flower launch is stable — and
revisit its priority once the customer rollout is underway.

---

## 9. Milestones — from 15 June 2026

Quality-gated, weekly cadence. Dates are targets; the **QA green flag (M4) is a
hard gate** — go-live does not happen before it.

### Track A — soul flower & customer rollout (priority)

| # | Date | Milestone | Outcome |
|---|---|---|---|
| **M0** | **15 Jun 2026** | Baseline | Settings + drawer UI configured in the test store; roadmap locked |
| **M1** | **20 Jun 2026** | Config migrated to soul flower | All promotions + customizer settings ported into the soul flower store |
| **M2** | **27 Jun 2026** | Unit testing complete | Promotions engine, triggers, discount functions, analytics events verified |
| **M3** | **4 Jul 2026** | End-to-end testing complete | Full shopper journey validated across devices on the live theme |
| **M4** | **11 Jul 2026** | **QA green flag** *(hard gate)* | Dedicated QA expert signs off launch readiness |
| **M5** | **15 Jul 2026** | **soul flower go-live** | cartx live in production on soul flower; close monitoring |
| **M6** | **22 Jul 2026** | Stabilization | One week of live soul flower data; issues triaged and resolved |
| **M7** | **29 Jul 2026** | Customer rollout begins | Validated build enabled for a pilot cohort of existing cartx customers |
| **M8** | **7 Aug 2026** | Rollout complete | Phased rollout to existing customers finished; monitoring steady-state |

### Track B — headless cart (parallel, lower priority, no hard dates)
Worked opportunistically alongside Track A; revisited after soul flower is
stable. Sequence (flag-gated, reversible — see the migration plan):
spike / go-no-go → cart service behind flag → read switch + cart seeding →
optimistic layer → add-to-cart + checkout takeover → remove legacy interceptor.

### Phase view (Track A)
- **Weeks 1–2 (15–27 Jun):** Migrate config + unit testing → M1, M2
- **Weeks 3–4 (28 Jun–11 Jul):** E2E testing + QA green flag → M3, M4
- **Week 4–5 (11–22 Jul):** Go-live + stabilize → M5, M6
- **Weeks 6–8 (22 Jul–7 Aug):** Customer rollout → M7, M8

---

## 10. Open decisions
**Track A (launch):**
- Customer rollout cohorts — which existing stores go first, and wave size.
- Rollback playbook per store if a regression appears post-enablement.

**Track B (headless cart, when revisited):**
- Storefront token delivery: public client-side token vs. server proxy.
- Customer access token source for logged-in buyer identity.
- Add-to-cart strategy: intercept form submits vs. inject buttons (likely hybrid).
- Markets / contextual pricing in v1 or deferred.
- Storefront API version to pin.
