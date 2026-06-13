# Cart System Comparison: CartX vs Foxtale star-utils

## Overview

| Dimension | CartX (`app/drawer-src/`) | Foxtale star-utils (`@foxtale/star-utils`) |
|---|---|---|
| Language | JavaScript (no types) | TypeScript throughout |
| UI framework | Preact 10 (class component) | React 18/19 (hooks) |
| State management | Class instance state + custom events | Zustand 5 (persisted) |
| Cart API | Shopify AJAX API (`/cart/*.js`) | Shopify Storefront API (GraphQL) |
| Promotion logic | Server-evaluated on every cart change | Client-evaluated from Strapi CMS config |
| Optimistic updates | Event-driven, single-path | Dual-state (cart + localCart), sync-on-mutate |
| Sync serialisation | None (debounce only) | Queue — max 1 sync in-flight |
| Cart persistence | None (memory only) | localStorage (Zustand persist) |
| Cross-domain sync | None | iframe + `postMessage` |
| Quantity validation | None at add time | Pre-validated before optimistic update |
| Auto-coupon apply | Manual, per-call | Declarative side effect (useAutoApplyCoupons) |
| Bundle delivery | Preact IIFE injected via Theme App Extension | npm package, consumed by storefront app |

---

## 1. Cart API Layer

### CartX — Shopify AJAX API
CartX intercepts native Shopify cart endpoints at the browser level: `/cart/add.js`, `/cart/update.js`, `/cart/change.js`, `/cart/clear.js`. Both `fetch` and `XMLHttpRequest` are patched in `app-embed.liquid` before the Preact bundle loads.

```
Theme/3rd-party code calls /cart/add.js
    ↓
Patched fetch intercepts it
    ↓
Lets original request complete (returns to caller untouched)
    ↓
Re-fetches /cart.js
    ↓
Dispatches cartmax:cart-changed → Preact drawer reacts
```

All cart mutations inside the drawer also go through native AJAX endpoints:
- `/cart/update.js` — qty changes + removals (single call, `updates` map)
- `/cart/add.js` — new freebie lines (needs `properties`)
- `/discount` cookie — coupon codes (not a JSON API)

**Data model:** Shopify AJAX cart (`/cart.js`) — `items[]`, `total_price`, `original_total_price`, `item_count`, `discount_codes`, `cart_level_discount_applications`.

### Foxtale star-utils — Shopify Storefront API (GraphQL)
All cart operations are explicit GraphQL mutations against the Storefront API. There is no interception — the calling app controls every cart mutation.

```
useOptimisticCartActions.addToCart(line, product)
    ↓
Mutates localCart instantly (optimistic)
    ↓
syncCart() → cartLinesAdd mutation → Storefront API
```

**Data model:** Storefront API `Cart` — richer type system, `lines.edges[].node`, `cost`, `discountAllocations` per line, `estimatedCost`, variant `selectedOptions`, full product type etc.

### Key difference
CartX works with Shopify's own cart session (no token, no app credentials needed on the storefront). Star-utils requires a Storefront API access token. CartX can intercept any ATC call from any theme or third-party app automatically; star-utils only knows about mutations it makes itself.

---

## 2. State Management

### CartX — Class component state + custom events
State lives entirely inside the `CartDrawer` Preact class component. There is no global state store. Communication between the evaluation engine (`evaluate.js`) and the drawer happens through window custom events.

```
evaluate.js dispatches:
  cartmax:eval-result        → drawer updates evalResult in state
  cartmax:optimistic-update  → drawer updates cart in state  
  cartmax:internal-reload    → drawer replaces cart + evalResult
  cartmax:gift-unavailable   → drawer updates unavailableGifts

drawer dispatches:
  cartmax:cart-action        → evaluate.js starts a new eval
  cartmax:drawer-opened      → evaluate.js re-pushes last result
```

No persistence. Every page load loses cart state and re-fetches `/cart.js` on warmup.

### Foxtale star-utils — Zustand persisted stores
Three persisted Zustand stores: `CartStore`, `ConfigStore`, `CustomerStore`. Cart data (`cart`, `localCart`, `strapiCart`, `discountCode`) survives page refresh and populates immediately on hydration.

```ts
CartStore persists: cart, localCart, strapiCart, strapiCartExpiry, discountCode
ConfigStore persists: defaultConfig, globalConfigs
CustomerStore persists: customer data
```

The stores expose typed setters. Any component anywhere in the tree can read or write without prop drilling or event buses.

### Key difference
CartX's event bus works but creates hidden coupling — a `cartmax:cart-changed` event from anywhere can trigger drawer state changes. Debugging requires tracing event listeners. Zustand's explicit store makes data flow visible and testable. CartX also has no persistence, meaning the drawer always starts blank on every page load and must re-evaluate.

---

## 3. Optimistic Update Strategy

### CartX — Optimistic via simulated cart
`evaluate.js` applies an optimistic path when the user changes qty:

```
User changes qty
    ↓
simulateCart(cart, actions)  → apply pending qty changes locally
    ↓
localEvaluate(_cachedConfig, simulatedCart)  → client-side bar/ribbon
    ↓
recomputeBar(serverBar, simulatedCart)  → progress % recalculated
    ↓
dispatch cartmax:eval-result (instant)
    ↓  (parallel)
callEvaluate(simulatedCart)  → server eval
    ↓
applyResult() → /cart/update.js + /cart/add.js
    ↓
dispatch cartmax:internal-reload (final)
```

The optimistic cart is synthetic — it is never stored anywhere, just dispatched as an event payload. The "real" cart only arrives after the server round-trip.

**Problem:** `simulateCart()` only adjusts quantities. It recalculates `total_price` based on flat line prices, losing any existing Shopify discount data (compare-at prices, automatic discounts). The server's `freshCart` after the mutation is what sets the authoritative savings.

### Foxtale star-utils — Dual-state (cart + localCart)
`localCart` is a fully persisted, always-up-to-date cart object in Zustand. Every mutation updates it immediately using the same `CartLine` type as the server response.

```
addItemToLocalCart() / removeItemFromLocalCart() / updateItemInLocalCart()
    → all recalculate totals locally using recalculateCartTotals()
    → freebie detection: lines with totalAmount === 0 keep totalAmount = 0

setLocalCart(updatedCart)
    → triggers syncCart() automatically
    → syncCart diffs localCart vs server cart via getCartDifference()
    → applies delta
    → setCart(serverCart) reconciles
```

`localCart` is structurally identical to `cart` — it can be rendered directly without any transformation. Freebies are handled correctly (price stays 0 even on quantity change). The UI never shows a synthetic/approximated state.

### Key difference
CartX's optimistic approach loses discount context (compare-at prices, automatic discounts) because `simulateCart()` flattens prices. Star-utils preserves all price/discount data because the `CartLine` is a proper typed object, not a JS object approximation. CartX also dispatches the optimistic update as an ephemeral event — if the component remounts before the server responds, the optimistic state is gone.

---

## 4. Sync Serialisation

### CartX — Debounce only
`_debounceTimers` delays qty-change calls by 300ms to batch rapid clicks. But there is no protection against concurrent syncs. If a user rapidly adds item A, then item B, two `callEvaluate()` calls can be in-flight simultaneously, and both call `applyResult()` which calls `/cart/update.js`. The second response may overwrite the first, leaving the cart in an inconsistent state.

`runEvaluate()` has a basic queue (`_pendingCart`, `_pendingActions`) that collapses rapid calls into one, but it only queues the *most recent* pending state — intermediate actions are dropped.

### Foxtale star-utils — Serialized queue
`syncCart()` maintains a strict mutex:

```ts
let isSyncInProgress = false;
let pendingSyncRequest: (() => void) | null = null;
```

Only one sync runs at a time. Any `syncCart()` call while a sync is in progress stores itself as `pendingSyncRequest` and runs immediately after the current sync finishes. No intermediate states are lost — the pending sync always reads `getState()` at execution time so it picks up all accumulated changes.

### Key difference
CartX can produce a split-brain cart state under rapid user interaction (rapid add + remove + add). Star-utils cannot because of the queue mutex + the "re-fetch server state at start of each sync" pattern.

---

## 5. Promotion / Tier Evaluation

### CartX — Server-evaluated per request
On every cart change, the drawer POSTs the full cart state to `/apps/cartmax/evaluate-cart`. The server runs the full evaluation engine: `evaluateOffers()`, `buildBar()`, `resolveAvailableCoupons()`, `resolveClaimGifts()`. The result includes:
- `to_add` — freebies to auto-add to cart
- `to_remove` — stale freebies to remove
- `bar` — full progress bar state with tier data
- `coupons` — visible coupon cards
- `claims` — claimable gift variants
- `total_savings` — computed from original vs current price
- `_config` — cached for client-side recomputation (60s TTL)

**Server logic handles:**
- Page-specific offers (exact path matching overrides global)
- Customer tag targeting (required_any, excluded)
- Product presence triggers
- Volume discount tier matching
- Cross-offer collision strategy (merge)
- Claim gift max_claims enforcement

The client does partial recomputation via `recomputeBar()` for instant progress feedback, but full promotion state always comes from the server.

### Foxtale star-utils — Client-evaluated from Strapi config
Tier state is computed entirely in the browser from `StrapiCart.coupons[]`. `calculateTierState()` runs on every `localCart` change. No server call needed.

**Client logic handles:**
- PRICE vs QUANTITY trigger type
- Eligible line filtering (exclude freebies, mystery box, BXAY products, Combos vs Singles)
- Per-tier progress %
- Visible tier sliding window
- Message template resolution (`${CODE}`, `${PRICE}`, `${QUANTITY}`, `${TITLE}`)

**What's NOT in star-utils:**
- Auto-add freebies to cart (the library identifies unlocked freebies but doesn't add them)
- Removing stale freebies
- Shopify Function integration for actual discounts at checkout
- Page-specific or customer-tag targeting

### Key difference
CartX handles promotions that have real cart side-effects (auto-add/remove lines, Shopify Functions for checkout discounts). Star-utils handles display logic only — showing tiers, progress, freebie imagery. CartX's approach is more powerful but slower (server round-trip per cart change). Star-utils is instant but limited to what Strapi config can express.

---

## 6. Cart Persistence

### CartX — None
The drawer opens fresh on every page. `evaluate.js` does warm up by calling `fetchCart()` on load, and the config cache (`_cachedConfig`) persists for 60s in module memory. But if the page is refreshed or the user navigates, all state is gone.

### Foxtale star-utils — localStorage via Zustand persist
`cart`, `localCart`, `strapiCart`, `discountCode` all survive page navigation. On the next load:
1. Zustand rehydrates from localStorage immediately (synchronous read)
2. `initializeCart()` validates the stored `cart.id` against Shopify
3. If still valid → use it; if expired/invalid → create new

`discountCode` has an explicit expiry timestamp so stale codes are cleared automatically even after days.

### Key difference
A CartX user who adds items and refreshes sees the same cart because Shopify's session cookie maintains the cart. But the drawer's promotion state (which freebies were being shown, what progress bar state was displayed) is lost and rebuilt from scratch on the next cart open. Star-utils preserves the full UI state across navigations.

---

## 7. Quantity Validation

### CartX — None at add time
The drawer sends whatever quantity was requested directly to `/cart/add.js`. Shopify may return an error if inventory is exceeded, but there is no pre-validation. There is gift availability tracking via `markGiftUnavailable()` — if a freebie add fails, the variant is blacklisted for 60s.

### Foxtale star-utils — Pre-validated before optimistic update
Before any `addToCart()` mutates `localCart`:

```
validateQuantityLimit(currentCart, line, maxQuantity)
    → checks: existingQty + newQty > maxQuantity
    → maxQuantity from: product.strapi.maximum_order_quantity OR globalConfig MAX_LINE_ITEM_QUANTITY
    → returns { isValid: false, error: "You can only add up to X of this item." }
```

The `max_quantity` is also stored as a line attribute so the limit persists after page refresh (read back by `validateTotalQuantity()` on update operations).

### Key difference
CartX silently fails when inventory limits are hit (or lets Shopify return a 422). Star-utils gives instant, user-friendly feedback before even touching the cart.

---

## 8. Auto-Coupon Application

### CartX — Manual
Coupons are displayed in the drawer. The user types a code and clicks Apply, which hits `/cart/update.js` or sets the `/discount` cookie. CartX evaluates which coupons to *show* automatically (server decides based on page/customer targeting), but applying them is always a user action.

### Foxtale star-utils — Declarative side effect
`useAutoApplyCoupons` runs inside `StarProvider` and watches two things:

1. **`currentTier` changes** — if `strapiCart.apply_coupon_on_cart = true`, automatically swaps the applied coupon to match the newly unlocked tier's code.
2. **`discountCode` in store** — a code can be stored with an expiry (from URL params, checkout redirect, etc.) and `useAutoApplyCoupons` ensures it's always applied until it expires.

No user action needed.

### Key difference
CartX requires explicit user opt-in for every coupon application. Star-utils can automatically upgrade a user from a 10%-OFF code to a 20%-OFF code when they unlock a higher tier — entirely invisible to the user. This directly increases AOV without friction.

---

## 9. Cross-Domain Cart

### CartX — Single domain only
Cart state is tied to Shopify's session cookie, which is scoped to the storefront domain. No mechanism exists to carry a cart (or campaign cart configuration) to another domain.

### Foxtale star-utils — Cross-domain via iframe
`CartSyncService` + `SyncClient` use an invisible iframe pointing to `__SYNC_SERVICE_URL__` (a trusted domain with its own localStorage). Via `postMessage`, any domain that mounts the same `StarProvider` with the same `syncServiceUrl` can read/write:
- `cart_id` — share a Shopify cart across domains (e.g., landing page → storefront)
- `cart_handle` — share which campaign cart is active
- `cart_expiry` — campaign carts auto-expire (default 2 days)

### Key difference
Not relevant for CartX's current use case (single Shopify storefront). But star-utils's pattern enables headless setups where multiple Next.js apps share a Shopify cart without requiring a user account.

---

## 10. TypeScript & Architecture

### CartX
- Pure JavaScript, no types
- Single 1800+ line class component (`CartDrawer.jsx`)
- All render logic as methods on one class
- No component reuse or composition
- Configuration applied via CSS custom properties at runtime (flexible, but not typed)

### Foxtale star-utils
- TypeScript throughout — all types in `src/types/`, Zod-like schema structures
- Modular hooks — each concern is a separate file
- Clean separation: `services/` (I/O), `stores/` (state), `hooks/` (composition), `utils/` (pure functions)
- `utils/optimistic.ts` and `utils/tiers.ts` are pure functions — fully testable without mocking React

### Key difference
CartX is hard to unit test (class component, DOM events, global window mutations). Star-utils's pure utility functions are trivially testable. Adding a new feature to CartX requires modifying the monolith; star-utils features are additive.

---

## Summary of Differences

| Aspect | CartX | Foxtale star-utils | Winner |
|---|---|---|---|
| Cart API | AJAX `/cart.js` | Storefront GraphQL | Context-dependent |
| Optimistic updates | Synthetic simulated cart | Dual-state, full typed object | star-utils |
| Sync safety | Debounce only | Serialized queue mutex | star-utils |
| Promotion engine | Server-authoritative, rich logic | Client-only, display-focused | CartX |
| Persistence | None | localStorage (Zustand) | star-utils |
| Cross-domain | None | iframe postMessage | star-utils |
| Quantity validation | None | Pre-validated, attribute-backed | star-utils |
| Auto-coupon | Manual only | Declarative, tier-driven | star-utils |
| Bundle size | 132KB Preact IIFE | React peer dep (no extra) | CartX |
| Shopify Functions | Yes (GWP + volume) | No | CartX |
| Complex promotions | Yes (GWP, claims, volume) | No | CartX |
| TypeScript | No | Yes | star-utils |
| Testability | Hard | Easy (pure functions) | star-utils |
| Architecture | Monolith | Modular hooks | star-utils |

---

## Improvements CartX Can Adopt from star-utils

### 1. Serialized sync queue
**Current problem:** Rapid qty changes (multiple fast clicks on +/-) can fire two concurrent `callEvaluate()` + `applyResult()` calls. The second `/cart/update.js` may clobber the first.

**Fix:** Port the `isSyncInProgress` + `pendingSyncRequest` pattern from `services/sync.ts`. Accumulate all pending actions and process them as one batch.

```js
// In evaluate.js
let _syncInProgress = false;
let _pendingSyncCallback = null;

async function guardedSync(fn) {
  if (_syncInProgress) {
    return new Promise(resolve => { _pendingSyncCallback = () => resolve(fn()); });
  }
  _syncInProgress = true;
  try { return await fn(); }
  finally {
    _syncInProgress = false;
    if (_pendingSyncCallback) {
      const next = _pendingSyncCallback;
      _pendingSyncCallback = null;
      next();
    }
  }
}
```

---

### 2. Persist evaluation result to sessionStorage
**Current problem:** The drawer's promotion state (evalResult, bar, freebies) is lost on every page load and rebuilt from a server round-trip, causing visible flicker/delay on first open.

**Fix:** Cache the last `evalResult` in `sessionStorage` keyed by `shopId + themeId`. On drawer open, render from cache first while the fresh server eval runs in the background.

```js
var EVAL_CACHE_KEY = 'cartmax_eval_' + ctx.shopId + '_' + ctx.themeId;

// On fresh result
sessionStorage.setItem(EVAL_CACHE_KEY, JSON.stringify(result));

// On drawer open, before calling server
var cached = JSON.parse(sessionStorage.getItem(EVAL_CACHE_KEY) || 'null');
if (cached) dispatchEvent(new CustomEvent('cartmax:eval-result', { detail: cached }));
```

---

### 3. Quantity validation before add
**Current problem:** CartX sends gift adds to `/cart/add.js` without checking if the variant is already in cart at its max quantity. OOS failures are only detected after the round-trip.

**Fix:** Before adding a gift/claim, check existing cart lines for the same `variant_id` and compare against any `max_quantity` attribute. Return a user-facing error immediately.

```js
function validateAdd(cart, variantId, qty) {
  var existing = (cart.items || []).find(function(i) {
    return String(i.variant_id) === String(variantId);
  });
  var existingQty = existing ? existing.quantity : 0;
  var maxQty = existing && existing.properties && existing.properties.max_quantity
    ? parseInt(existing.properties.max_quantity, 10)
    : null;
  if (maxQty && (existingQty + qty) > maxQty) {
    return 'You can only add up to ' + maxQty + ' of this item.';
  }
  return null;
}
```

---

### 4. Declarative auto-coupon application
**Current problem:** CartX shows coupon chips but requires the user to click Apply. There is no mechanism to automatically swap coupon codes as the cart progresses through tiers.

**Fix:** Add a `auto_apply` flag to `CouponSchema`. In `evaluate.js`, after receiving an eval result, check if any coupons have `auto_apply: true` and the cart doesn't already have their code applied. If so, call `updateDiscountCodes` automatically.

```js
// In evaluate.js, after applyResult()
var autoCoupons = (result.coupons || []).filter(function(c) { return c.auto_apply && !c.is_applied; });
if (autoCoupons.length > 0) {
  var code = autoCoupons[0].code;
  fetch('/discount/' + code).catch(function() {});
}
```

---

### 5. Persist discount code with expiry
**Current problem:** If a user arrives from a UTM campaign with `?discount=SUMMER20`, CartX has no built-in way to apply it to their cart and persist it across page navigations.

**Fix:** Port star-utils's `discountCode: { code, expiry }` pattern to the CartX bundle. On page load, read a `cartmax_discount` value from localStorage. If present and not expired, include it in the checkout URL or apply it via the `/discount/` endpoint.

---

### 6. Split CartDrawer into render modules
**Current problem:** All 1800+ lines in a single class component make it extremely hard to identify which section is responsible for which render output. Adding a new section requires finding the right `render*()` method among dozens.

**Fix:** Extract each render method into a named function module:

```js
// cart-sections/ProgressBar.jsx
export function ProgressBar({ bar, progressBarConfig }) { ... }

// cart-sections/ClaimGifts.jsx  
export function ClaimGifts({ claims, onClaim }) { ... }

// CartDrawer.jsx — orchestration only
import { ProgressBar } from './cart-sections/ProgressBar';
import { ClaimGifts } from './cart-sections/ClaimGifts';
```

This also enables lazy-loading sections that aren't always visible (e.g., claims, upsells).

---

### 7. Port to TypeScript
**Current problem:** No types means no autocomplete, no refactor safety, and no way to catch prop shape mismatches. The `evalResult` object shape is only documented implicitly.

**Fix:** Migrate `app/drawer-src/src/` to TypeScript (`.tsx`/`.ts`). The esbuild config already supports TypeScript — only a `tsconfig.json` needs to be added. Start with the types for `evalResult`, `Cart`, and `DrawerConfig` since these flow everywhere.

---

## Improvements star-utils Can Adopt from CartX

### 1. Server-authoritative promotion evaluation
**Current gap:** star-utils calculates tier state in the browser from Strapi config. Complex promotions — auto-adding freebies, removing stale gifts when a threshold is no longer met, Shopify Function–backed discounts at checkout — are outside its scope.

**Recommendation:** For each cart change, star-utils could optionally POST to a server endpoint (similar to CartX's `/apps/cartmax/evaluate-cart`) that returns `to_add`, `to_remove`, and validated coupon state. The sync engine already has the right hook point: after `getCartDifference()`, a server eval result could supplement the diff.

---

### 2. `recomputeBar()` — mixed-mode progress for complex bars
**Current gap:** star-utils's tier progress is per-tier (each tier is either 0% or 100% complete, with the next tier showing partial progress). CartX's `recomputeBar()` handles bars where some tiers are price-triggered and others are quantity-triggered — computing the partial progress for each type independently.

**Recommendation:** Add a `trigger_type` field to `StrapiCoupon` (in addition to the cart-level `trigger_type`) and update `calculateTierState()` to handle per-tier trigger types.

---

### 3. Gift availability tracking
**Current gap:** If a Shopify variant is OOS, `addLines()` fails with a 422 from Shopify. star-utils propagates this as a thrown error but doesn't blacklist the variant or retry.

**Recommendation:** Port CartX's `markGiftUnavailable()` / `isGiftUnavailable()` pattern. Track failed variant IDs in a module-level Set and skip them on future attempts for a configurable retry interval (e.g., 60s).

---

### 4. Tombstone animations for removed lines
**Current gap:** When `removeFromCart()` is called, the line disappears from `localCart` instantly. There is no fade/slide-out animation.

**Recommendation:** Port CartX's tombstone system — keep the removed line in a `_removingTombstones` map for ~280ms (matching a CSS transition duration) before it disappears from the rendered list.

---

### 5. Focus trap and accessibility
**Current gap:** star-utils is a library — it doesn't render UI. But the calling storefront app likely has a cart drawer. CartX's `trapFocus()` helper in `helpers.js` is a well-tested focus trap implementation.

**Recommendation:** Export `trapFocus` as a utility from star-utils so consuming apps don't have to implement it independently.
