# cartx — Migrating to a GraphQL Storefront Cart with a Local Optimistic Layer

> Status: planning. Goal: replace the AJAX-Cart-API-driven drawer with a
> **local optimistic cart** rendered on top of a **canonical Storefront
> GraphQL cart**, owning the storefront add-to-cart (ATC) path and checkout.

## 0. High-level plan & phase map

> The layer above the detail. Sections 1–10 are the deep reference; this is the
> roadmap we execute against and split into per-phase deep-dives.

**North star.** Make the Storefront GraphQL Cart the canonical cart. The Preact
drawer renders a local optimistic layer on top of it. cartx owns add-to-cart
and checkout. Ship as a strangler migration — every phase is flag-gated and
reversible; the AJAX path stays the fallback until cutover.

**Guardrails (non-negotiable):**
- AJAX path remains the default until a phase proves out behind the flag.
- Shopify Functions (volume-discount, freebie) must keep firing on the GraphQL
  cart — the make-or-break assumption.
- No shopper loses their cart — seed the GraphQL cart from the existing AJAX cart.
- Analytics + order attribution stay accurate throughout.

**Phases (sequential, each independently shippable & reversible):**

| Phase | Goal | Exit criteria |
|---|---|---|
| **P0 — Spike / de-risk** | Prove `cartCreate → cartLinesAdd → cart(id:)` on a dev store; confirm both Functions fire on the GraphQL cart; settle token delivery | Hard go/no-go. No P1+ build until green |
| **P1 — Cart service** | `cart.graphql.js`: create/read/add/update/remove, discount codes, buyer identity, note/attributes + single-flight mutation queue, behind a flag | Service callable in isolation; AJAX still default |
| **P2 — Read switch + seeding** | Drawer reads from `cart(id:)`; seed GraphQL cart from `/cart.js` on first load | Drawer renders the GraphQL cart accurately; returning carts preserved |
| **P3 — Optimistic layer** | Local cart store + queue; UI derives `optimisticCart`; qty/add/remove/coupon writes go through the queue | Instant UI; reconciles to the server cart |
| **P4 — ATC + checkout takeover** | Theme add-to-cart routes into `cartLinesAdd`; Checkout button uses `cart.checkoutUrl` | The cutover point — GraphQL cart is canonical |
| **P5 — Decommission legacy** | Remove fetch/XHR interceptor + AJAX reconciliation (keep theme cart-count sync) | Dead code gone; single code path |
| **P6 — Advanced (gated)** | userErrors/warnings surfacing, selling plans/subscriptions, markets/contextual pricing | Each behind its own setting/flag |

**Cross-cutting workstreams (run alongside the phases):**
- **Auth & cart identity** — storefront token delivery (client-side vs proxy),
  cart-id persistence, buyer identity for logged-in shoppers.
- **Functions compatibility** — verify volume + freebie functions against the
  Storefront cart (line properties, `_offer_id`).
- **Analytics parity** — keep drawer / web-pixel / attribution events firing;
  confirm order attribution still works (no Storefront cart webhooks exist).
- **Testing & QA** — unit (cart service, queue, optimistic merge) → E2E (full
  shopper journey) → QA green flag.
- **Rollout & flagging** — flag granularity, per-store enablement, rollback.

**Top risks to retire early:**
1. A Function not firing on the Storefront cart (retire in P0).
2. Concurrent-mutation `CONFLICT` / HTTP 409 (mutation queue in P1).
3. ATC takeover fragility across themes (hardest part — P4, design deferred to §7).
4. Buyer identity / customer access token for logged-in pricing.

## 1. Why we're doing this

Today the drawer runs entirely on the **AJAX Cart API** (`/cart.js`,
`/cart/add.js`, `/cart/change.js`, `/cart/update.js`) and keeps in sync by
monkey-patching `window.fetch` + `XMLHttpRequest` to observe the theme's ATC
calls. "Optimistic" means we simulate the new cart locally (`simulateAdd`,
`dispatchOptimistic`, debounced qty) then reconcile against `/cart.js`.

Three things the AJAX API can't give us cleanly, and GraphQL can:

1. **Richer cart data** — contextual/compare-at pricing, bundles,
   subscriptions/selling plans, proper per-line + cart discount allocations.
2. **Fewer round-trips** — `cartLinesAdd`/`Update`/`Remove` return the full
   updated cart, killing the add-then-refetch-`/cart.js` double request and most
   reconciliation code.
3. **Advanced discounts** — `cartDiscountCodesUpdate` reports per-code
   `applicable`, supports stackable codes, and exposes real allocations.

## 2. The decision that shapes everything

**The AJAX cart and the Storefront GraphQL cart are NOT the same cart object.**
On an Online Store theme the theme's ATC buttons and the `/checkout` link use
the AJAX cart bound to the `cart` cookie. The Storefront Cart API creates its
own cart with its own `id` and its own `checkoutUrl`.

Therefore making the GraphQL cart canonical means we **must own the ATC and the
checkout path**:

- Theme ATC buttons must route into our GraphQL cart instead of `/cart/add`.
- Checkout must point at the GraphQL cart's `checkoutUrl`, not `/checkout`.
- The fetch/XHR interceptor (observe-and-refetch) is no longer the sync
  mechanism and can eventually be removed.

This is accepted scope. ATC takeover details are deferred (see §7) — we'll
either inject data attributes / our own buttons, or intercept form submits and
map them to `cartLinesAdd`.

## 3. Target architecture: local cart + server cart

```
  ┌─────────────────────────────────────────────┐
  │  UI (Preact drawer)                           │
  │  renders  optimisticCart = serverCart ⊕ queue │
  └───────────────▲───────────────────────────────┘
                  │ derive
        ┌─────────┴──────────┐
        │  Local cart store  │   pending mutations queue (optimistic overlay)
        └─────────┬──────────┘
                  │ single-flight, serialized
        ┌─────────▼──────────┐
        │  Cart service      │   Storefront GraphQL client
        │  (cart.graphql.js) │   cartCreate / cartLinesAdd / Update / Remove /
        └─────────┬──────────┘   cartDiscountCodesUpdate / cartBuyerIdentityUpdate
                  │
        ┌─────────▼──────────┐
        │  Storefront Cart   │   canonical. id + checkoutUrl persisted.
        └────────────────────┘
```

**Local cart (optimistic)** — what the UI reads. It is
`serverCart` merged with the queue of in-flight mutations, so a +1 click or an
add shows instantly. Mirrors Shopify's `useOptimisticCart` pattern.

**Server cart (canonical)** — the Storefront GraphQL `Cart`. Every mutation
reconciles the local cart against the authoritative response.

**Mutation queue (single-flight)** — as of Oct 2025 concurrent mutations on the
same cart can return `CONFLICT` / HTTP 409. So serialize: one mutation in flight
per cart, queue the rest, coalesce rapid qty changes (we already debounce).

## 4. Cart identity & auth

- **Storefront access token.** Cart ops need an `X-Shopify-Storefront-Access-Token`.
  - *Option A (recommended): public storefront access token, client-side.* The
    Storefront Cart API is designed for this, has no rate limits for legit
    traffic, and ships bot protection. Create the token at install via Admin
    `storefrontAccessTokenCreate` and inject it into the app-embed
    (`data-storefront-token`), or expose via the existing app proxy on first load.
  - *Option B: proxy through `/apps/cartmax`.* Keeps the token server-side; adds
    a hop. Use as fallback / for server-side needs. We already have
    `data-proxy-base="/apps/cartmax"`.
- **Cart id persistence.** Store the GraphQL cart `id` in `localStorage` keyed
  per shop (`cartx:cartId:<shop>`). On load: query `cart(id:)`. If null/expired,
  `cartCreate`.
- **Buyer identity.** For logged-in customers pass
  `buyerIdentity.customerAccessToken` (we have `data-customer-id`; need the
  customer access token via Customer Account API or theme `customer` object).
  Set country/market via `@inContext` / `buyerIdentity.countryCode` for
  contextual pricing — net-new, not handled today.

## 5. The GraphQL surface we need

| Concern | Mutation / query | Notes |
|---|---|---|
| Create cart | `cartCreate` | seed from existing AJAX cart on first load (§6) |
| Read cart | `cart(id:)` | full enriched query (cost, allocations, merchandise, bundles, selling plans) |
| Add line | `cartLinesAdd` | replaces `/cart/add.js`; supports `attributes`, `sellingPlanId` |
| Change qty | `cartLinesUpdate` | replaces `/cart/change.js` |
| Remove line | `cartLinesRemove` | qty→0 path |
| Discounts | `cartDiscountCodesUpdate` | read `discountCodes[].applicable`; stackable |
| Note / attributes | `cartNoteUpdate`, `cartAttributesUpdate` | replaces `/cart/update.js` attributes |
| Buyer/market | `cartBuyerIdentityUpdate` | customer + country context |
| Checkout | `cart.checkoutUrl` | drawer Checkout button uses this |

Query enough on every mutation response to render the drawer without a refetch:
`cost { totalAmount subtotalAmount totalDutyAmount }`, per-line
`cost { totalAmount compareAtAmountPerQuantity }`,
`discountAllocations { discountedAmount ... }`, and
`merchandise { ... on ProductVariant { price compareAtPrice product {...} } }`.

## 6. Migration / rollout (strangler — ship incrementally)

1. **Spike (de-risk first).** Stand up the Storefront client + token. Prove
   `cartCreate` → `cartLinesAdd` → `cart(id:)` works against a dev store and that
   our Shopify Functions (volume-discount, freebie) still fire on the GraphQL
   cart. **Do not proceed until this passes.**
2. **Cart service module** (`cart.graphql.js`) behind a feature flag. AJAX path
   stays the default.
3. **Read switch.** Drawer reads from GraphQL `cart(id:)`. On first load, **seed
   the GraphQL cart from the existing AJAX cart** (read `/cart.js`, `cartLinesAdd`
   the lines) so returning shoppers don't lose their cart.
4. **Local optimistic layer.** Introduce the local cart store + mutation queue;
   UI derives `optimisticCart`. Move qty/remove/add/coupon writes onto the queue.
5. **ATC takeover** (§7) + checkout → `checkoutUrl`. This is the cutover point.
6. **Remove the fetch/XHR interceptor** and AJAX-specific reconciliation
   (`simulateAdd`, `/cart.js` refetch). Keep `updateCartCount` for the theme
   bubble.

Each step is independently shippable and reversible via the flag.

## 7. ATC takeover (details TBD — deferred)

Decide between:
- **(a) Intercept form submits.** Bind to theme ATC `<form>`s, read variant id +
  qty + line-item properties, route to `cartLinesAdd`, `preventDefault` the
  native post. Most compatible, but per-theme markup is fragile (our existing
  interceptor already shows this).
- **(b) Inject/replace buttons.** Add `data-cartx-atc` attributes or replace the
  ATC node with our own button. More control, more theme-specific setup.

Likely a hybrid with a small per-theme adapter. Whatever we pick, checkout must
move to `checkoutUrl` at the same time.

## 8. Edge cases & gotchas

- **Concurrency / CONFLICT** — serialize mutations per cart (§3).
- **Expired/invalid cart id** — `cart(id:)` returns null → recreate + re-seed.
- **Existing AJAX cart migration** on first GraphQL load (§6.3).
- **Inventory / userErrors / warnings** — surface `cart*` `userErrors` and cart
  `warnings` (e.g. quantity adjusted, item unavailable) in the drawer.
- **Selling plans / subscriptions** — pass `sellingPlanId` on add; render plan.
- **Multi-currency / markets** — `@inContext`; net-new, gate behind a setting.
- **Note & attributes** — port current `/cart/update.js` usage in `evaluate.js`
  (gift auto-add at line 201 → `cartLinesAdd`; qty/removals → `cartLinesUpdate`).
- **No webhooks** fire for Storefront cart create/update — anything relying on
  that must use order webhooks instead.
- **Gift cards to cart & carrier-calculated rates** are not supported by the
  Storefront Cart API yet — confirm we don't depend on them.

## 9. What stays the same

- Preact drawer UI, settings → CSS vars (`applyDrawerSettings`), focus trap,
  a11y live region.
- Theme cart-count bubble sync (`updateCartCount` selectors).
- Shopify Functions (`cartx-volume-discount`, `cart-max-freebie-discount`) — they
  execute on the Storefront Cart API unchanged.
- App proxy (`/apps/cartmax`) and analytics.

## 10. Open questions to resolve

- [ ] Token delivery: public client-side token vs proxy? (lean: client-side)
- [ ] Customer access token source for `buyerIdentity` on logged-in shoppers.
- [ ] ATC strategy (a) vs (b) vs hybrid.
- [ ] Do we support markets/contextual pricing in v1 or defer?
- [ ] Storefront API version to pin.

## 11. Phase deep-dives

### P0 — Spike / de-risk

**Objective.** Prove the headless cart is viable *before* committing to P1+.
Throwaway code on a dev store; the one output is a **go / no-go** decision.

**Make-or-break assumption (grounded in code).** Both Functions key off cart
line **attributes**, not anything AJAX-specific:
- `cart-max-freebie-discount` reads `attribute(key:"_freebie")` +
  `attribute(key:"_offer_id")`; config from metafield `$app:cart-max-freebie-discount`.
- `cartx-volume-discount` reads `attribute(key:"_freebie")`; config from
  `$app:cartx-volume-discount`; uses `cart_lines_discounts_generate_run` (discountClasses).

In AJAX these come from line-item **properties**; in the Storefront Cart API
they must come from `cartLinesAdd(lines:[{ attributes:[{key,value}] }])`. If
Storefront line attributes populate the Function input's `attribute(key:)`
identically, the migration is green. If not, stop and rethink. (Experiment #1.)

**Experiments (pass bar):**
1. **Functions fire on a Storefront cart** *(the gate)* — `cartCreate` →
   `cartLinesAdd` with `_freebie`/`_offer_id` attributes + matching automatic
   discount active → freebie + volume allocations appear on the line.
2. **Core lifecycle** — create → add → read → update → remove; each mutation
   returns a full, render-able cart (no `/cart.js` refetch needed).
3. **Discount codes** — `cartDiscountCodesUpdate` reports `applicable` correctly
   for valid + invalid codes.
4. **Token delivery** — public token via Admin `storefrontAccessTokenCreate`,
   client-side call succeeds (no CORS/auth wall).
5. **Checkout handoff** — `cart.checkoutUrl` lands in checkout with discounts intact.
6. **Concurrency probe** — overlapping `cartLinesUpdate` → observe `CONFLICT`/409
   (confirms P1 mutation-queue need).
7. **Seed-from-AJAX** — replay `/cart.js` lines (properties→attributes) into
   `cartLinesAdd`; result matches the AJAX cart.

**Decisions to settle:** Storefront API version to pin; token delivery
(client-side vs proxy, exp #4); buyer-identity path (confirm only, impl in P6).

**Go/No-go:** GO only if #1, #2, #5 fully pass. #3/#6/#7 inform design.
Any failure in #1 → stop. Time-box 2–3 focused days.

**Result log (spike run on `devx-dev.myshopify.com`, Storefront API `2026-01`):**

Verdict: **GO.** Central assumption holds — Storefront cart line `attributes`
populate the Function input's `attribute(key:)` identically to AJAX line
properties, and our Function fires on a Storefront-created cart.

- **#4 Token — PASS.** Public Unauthenticated Storefront token works via
  `X-Shopify-Storefront-Access-Token`. API version `2026-01` validated.
- **#1 Functions fire (THE GATE) — PASS.** `cartCreate` → `cartLinesAdd` of the
  freebie (Ice Cream) with `_freebie=true` + `_offer_id` → `cart-max-freebie-discount`
  applied `CartAutomaticDiscountAllocation "Free Gift"`, line `totalAmount` → 0.
  Scales with quantity (qty 2 → ₹24 discount, total 0). Non-freebie line untouched.
- **#2 Lifecycle — PASS.** create / read / `cartLinesUpdate` / `cartLinesRemove`
  each return the full render-able cart (cost + per-line + allocations); no
  `/cart.js` refetch needed.
- **#3 Discount codes — PASS.** Invalid code → `discountCodes[].applicable=false`,
  no userError.
- **#5 Checkout — PARTIAL.** `checkoutUrl` returned and cart-level totals already
  net the automatic discount. *Still TODO: open `checkoutUrl` in a browser and
  confirm the freebie/volume discounts carry into the order.*
- **#6 Concurrency — CONFIRMS QUEUE NEED.** Two overlapping `cartLinesUpdate`
  returned HTTP 200 with **no `CONFLICT`/409**, but produced a **silent
  lost-update** (last-writer-wins): the read-back showed one write clobbered the
  other with no error surfaced. → P1 single-flight mutation queue is mandatory
  (guards against silent loss, not just 409s).

**Still open / not yet run:**
- **Volume Function** (`cartx-volume-discount`) not exercised — need a volume
  variant + tier config to repeat #1 for it (mechanism is identical: reads
  `_freebie` attribute + automatic discount).
- **#7 seed-from-AJAX** not run (needs a live `/cart.js`); mechanism is just
  replaying lines into `cartLinesAdd` with attributes.
- **Buyer identity** for logged-in shoppers (customer access token) — deferred to P6.

**Decisions settled:** token delivery = public client-side token (Option A) works.
API version `2026-01` validated (confirm final pin). Concurrency model =
serialize per cart.

### P1 — Cart service (`cart.graphql.js` + single-flight queue)

**Goal.** A self-contained Storefront-cart service, callable in isolation,
behind a feature flag. **AJAX stays the default** — P1 does not change the live
drawer's behavior. Exit: service works + unit-tested; flag off in prod.

**Where it lives.** New module `app/drawer-src/src/storefront-cart.js`, bundled
into `extensions/cart-max-drawer/assets/cartmax.js` by `app/drawer-src/build.js`
(esbuild, IIFE/Preact). Consumed later by `evaluate.js`/`CartDrawer.jsx` in P2+.

**Token delivery (corrected).** No Liquid filter exposes a Storefront token.
Mint it at install via Admin `storefrontAccessTokenCreate`, persist on the
`Store` row, and deliver it (plus API version) to the drawer in the existing
`/apps/cartmax/evaluate-cart` proxy `_config` payload — *not* via `app-embed.liquid`.

**Build tasks (split):**

| Task | What | Files | Done when |
|---|---|---|---|
| **T1 — Token plumbing** | Mint storefront token at install/first load; persist on `Store`; return `storefront_token` + `storefront_api_version` in proxy `_config` | `app/shopify.server.js` (afterAuth), `prisma/schema.prisma` (Store), `app/routes/proxy.evaluate-cart.jsx`, `app/lib/config.server.js` | Drawer can read token+version from cached `_config` |
| **T2 — GraphQL client + ops** | `POST /api/{version}/graphql.json` with token header; ops: `cartCreate`, `getCart(id)`, `cartLinesAdd/Update/Remove`, `cartDiscountCodesUpdate`, `cartNoteUpdate`, `cartAttributesUpdate`, `cartBuyerIdentityUpdate` | new `storefront-cart.js` | Each op callable, returns parsed cart + userErrors |
| **T3 — Enriched query + mapper** | One reusable cart fragment (cost, per-line cost + `compareAtAmountPerQuantity`, `discountAllocations`, merchandise, sellingPlan); map GraphQL `Cart` → the drawer's existing `/cart.js` shape (incl. line `id`→`key`, attributes→`properties`, amounts→cents) | `storefront-cart.js` | `mapCart(gqlCart)` returns an object the current UI renders unchanged |
| **T4 — Single-flight queue** | Serialize one mutation per cart; queue the rest; coalesce rapid qty changes (reuse existing debounce). Driven by the P0 finding: concurrent writes silently lose, no 409 | `storefront-cart.js` | Overlapping calls run sequentially; final state deterministic |
| **T5 — Cart identity** | Persist cart `id` in `localStorage` `cartx:cartId:<shop>`; on load `getCart(id)`, if null/expired → `cartCreate`; expose `getOrCreateCart()` | `storefront-cart.js`, `helpers.js` (`getContext` add token/version) | Returning sessions reuse the cart; invalid id self-heals |
| **T6 — Feature flag** | `graphql_cart_enabled` (default false) in `DEFAULT_CONFIG`; passthrough in proxy `_config`; client reads it; service is a no-op path until flipped | `app/lib/constants.js`, `proxy.evaluate-cart.jsx`, `evaluate.js` | Flag visible client-side; off = zero behavior change |
| **T7 — Errors/warnings** | Surface `cart*` `userErrors` + cart `warnings` (qty adjusted, unavailable) in a normalized shape for the UI to consume in P3 | `storefront-cart.js` | Errors/warnings returned, never thrown into the render path |
| **T8 — Tests + dev harness** | Unit tests: queue serialization/coalescing, `mapCart` fidelity, error handling. A throwaway dev page to exercise the service against a dev store | `app/drawer-src/__tests__/` (or existing test setup) | Tests green; service demoably works end-to-end |

**Order:** T1+T6 (plumbing) → T2 → T3 → T4/T5 → T7 → T8.

**Key design calls to lock in P1:**
- **Line identity:** drawer keys lines by `key`; Storefront uses line `id`
  (with `?cart=` suffix). The mapper owns this translation.
- **No multi-type batching:** one queued action = one mutation returning the full
  cart (simpler than the old single `/cart/update.js` batch; the queue covers ordering).
- **Token is public** but still scope it to least privilege; rotate via Admin if needed.

**Out of scope for P1 (later phases):** drawer reading from the service (P2),
optimistic overlay (P3), ATC/checkout takeover (P4), interceptor removal (P5),
markets/subscriptions surfacing (P6).
