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
