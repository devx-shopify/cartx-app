# cartx — Migrating to a GraphQL Storefront Cart with a Local Optimistic Layer

> Status: planning. Goal: replace the AJAX-Cart-API-driven drawer with a
> **local optimistic cart** rendered on top of a **canonical Storefront
> GraphQL cart**, owning the storefront add-to-cart (ATC) path and checkout.

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
