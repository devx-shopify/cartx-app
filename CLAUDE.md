# cartx — project context for Claude Code

cartx is a Shopify embedded app: a fast, fully-branded **cart drawer** with
built-in promotions (free gifts, claim gifts, volume discounts, bundles,
upsells, coupons, progress bar). React Router admin + Preact storefront drawer;
Prisma/Postgres; deployed on Fly.io; Sentry monitoring; two Shopify Functions
(`cart-max-freebie-discount`, `cartx-volume-discount`).

## Key docs (read these to continue work)
- **`docs/graphql-cart-migration-plan.md`** — the active initiative. Headless-cart
  migration (Shopify AJAX Cart API → Storefront GraphQL Cart API). Contains: §0
  high-level phase map (P0–P6), §1–10 detailed reference, §11 per-phase deep-dives
  with a P0 result log and the P1 build-task breakdown.
- `docs/cartx-overview-and-roadmap.md` — product/leadership overview + go-live roadmap.
- `docs/drawer-settings.md` — every Customize Cart design setting: key, where it
  lives, default, and the rule that defaults keep today's drawer.

## GraphQL migration — current status (as of 2026-06-16)
- **Priority:** secondary. The P0 *go-live* (soul flower launch, then existing
  customers) is the real P0; this migration runs parallel and does NOT gate go-live.
- **P0 spike: DONE → GO.** Verified live on `devx-dev.myshopify.com` (Storefront
  API `2026-01`): Storefront cart line `attributes` populate the Function input's
  `attribute(key:)` identically to AJAX line properties — our discount Functions
  fire on a headless cart **unchanged**. Full create/read/update/remove lifecycle
  works; discount-code applicability works. Concurrency = **silent lost-update,
  no 409** → single-flight mutation queue is mandatory. See §11 result log.
- **P1: planned, NOT built.** New module `app/drawer-src/src/storefront-cart.js`
  behind a `graphql_cart_enabled` flag; AJAX stays default. Tasks T1–T8 in §11.
  **Suggested next step:** build T2/T3 (pure-client GraphQL ops + `mapCart` to the
  drawer's existing `/cart.js` shape) — self-contained, no store/schema changes.
- **Still open from P0:** volume-Function gate test (need a volume variant + tiers)
  and a checkout visual confirm (open `cart.checkoutUrl`, verify discounts carry).

## Conventions
- Brand name is lowercase **cartx**.
- Drawer bundle: `app/drawer-src/src/*` → esbuild (`app/drawer-src/build.js`) →
  `extensions/cart-max-drawer/assets/cartmax.js`.
- Storefront token is delivered via the `/apps/cartmax` proxy `_config` (NOT a
  Liquid filter — none exists for it).
- **Deploy split:** drawer/extension changes ship with `shopify app deploy`
  (Shopify CDN); server changes ship to Fly. CI (`.github/workflows/fly-deploy.yml`)
  deliberately excludes `app/drawer-src/**`, so a drawer-only push runs no CI —
  that is correct, not a failure.
- `app/lib/upsell-rank.js`, `app/lib/upsell-recs.js` and `app/lib/sellable.js`
  are imported by BOTH the server and the drawer bundle (esbuild follows the
  relative import). They must stay dependency-free (upsell-recs may import
  upsell-rank and sellable), and a change to any of them needs BOTH deploys.
  sellable.js is the single rule for "can the storefront sell this product"
  (ACTIVE or UNLISTED, published to the Online Store); gifts and upsells that
  fail it are picked in the admin but left out of evaluate-cart. upsell-rank.js is also the single home for
  `adjustedTotal` / `adjustedQty` — do not reintroduce local copies; three had
  already drifted apart once.
- The progress bar is built by ONE shared module, `app/lib/progress-bar.js`
  (with `page-target.js`, `template.js`, `tier-order.js`, `money-format.js`),
  used by the server (`evaluate/bar.server.js` re-exports it) and by the
  drawer's instant bar (`drawer-src/src/rules.js`). Keep them dependency-free;
  a change needs BOTH deploys. A separate drawer copy had drifted (it skipped
  claim gifts + Settings milestones) and caused bar layout shift.
- Custom milestones (Settings → Progress bar) have `display`: `with_others`
  (default) | `only_this`. `only_this` is allowed only on page-targeted
  milestones; on its page the bar shows only it and gift offers + claim gifts
  pause (`offersPausedOnPage`); gifts already in the cart stay.
- Upsells: `upsell-recs.js` picks the candidates (cart-based product rules from
  the `UpsellRule` table, then the default list); `upsell-rank.js` orders them
  (gap-filler, Shopify recommendations, performance). Upsell analytics use the
  id `upsell:<product_id>`; lines added from a card carry `_cartx_upsell` for
  order attribution.

## Quality gates
- `npm test` runs both Shopify Function suites (freebie + volume) via the
  workspaces. Keep them green; the volume gate test guards the cartx-active
  safety gate that prevents discounts going live store-wide.
- `npm run lint` must exit 0 (errors only; ~40 a11y/unused warnings are
  tolerated). Build artifacts (`cartmax.js`) and generated code are not linted.
- **Known gap (post-go-live):** `npm run typecheck` passes but `tsconfig.json`
  `include` omits `.js/.jsx`, so the app source is effectively unchecked.
  Enabling `checkJs`/`.jsx` is a large triage deferred until after launch.
- Legacy `storefront/src/*` is superseded by `app/drawer-src/src/*` (both
  esbuild to the same `cartmax.js`); the drawer build is canonical.
- Trigger sources: `app/lib/line-match.js` decides which cart lines a
  promotion / bar milestone counts (whole cart, specific products, or a
  collection) and is shared by the server, the drawer and the progress bar
  (both deploys). Collections are resolved to product IDs on save
  (`collection-products.server.js`, cap 2500) and refreshed by the
  collections/update, collections/delete and products/update webhooks. A
  collection saved before this has no product list and still counts the whole
  cart until re-saved. The volume Function filters on `product_ids` per offer.
