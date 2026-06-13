# foxtale/star-utils — Cart System Deep Dive

## What It Is

`@foxtale/star-utils` (v1.13.6) is a React + Zustand utility library for Foxtale's Shopify storefront. It manages the complete cart lifecycle: creation, mutations, optimistic UI, background sync to Shopify via Storefront API GraphQL, Strapi-driven tier/coupon configuration, freebies, mystery box, and cross-domain cart ID synchronization via iframe `postMessage`.

**Package:** `@foxtale/star-utils`  
**Peer deps:** React 18/19, Zustand 5  
**Build:** tsup → dual CJS + ESM  

---

## Directory Structure

```
src/
├── clients/
│   └── sync.ts          # SyncClient — iframe postMessage cross-domain storage
├── context/
│   └── Provider.tsx     # StarProvider — root context, boots everything
├── graphql/
│   ├── fragments/       # cart, cart-product, image, product-variant, etc.
│   ├── mutations/       # cart.ts — create, add, remove, update, discounts, attributes
│   └── queries/         # cart.ts — getCart
├── hooks/
│   ├── useCart.ts               # cart init, createCart, ensureCart, discount ops
│   ├── useCartActions.ts        # server-side add/remove/update (no optimistic)
│   ├── useOptimisticCartActions.ts  # instant local mutations + validation
│   ├── useCartValidation.ts     # auto-removes mystery box when ineligible
│   ├── useAutoApplyCoupons.ts   # auto-applies tier coupon codes
│   ├── useTiers.ts              # tier state derived from cart + strapiCart
│   ├── useFreebies.ts           # current/next tier freebie products
│   ├── useStrapiCart.ts         # strapiCart init logic (UTM, sync, expiry)
│   ├── useMysteryBox.ts         # mystery box visibility + cart presence
│   └── useStore.ts              # SSR-safe Zustand selector wrapper
├── services/
│   ├── cart.ts          # GraphQL CRUD wrappers (createCart, addLines, etc.)
│   ├── sync.ts          # syncCart() — diff engine + applies delta to Shopify
│   └── storage.ts       # CartSyncService — wraps SyncClient for cart_id/handle
├── stores/
│   ├── cart.ts          # Zustand persisted store (cart, localCart, strapiCart, etc.)
│   ├── config.ts        # defaultConfig, globalConfigs
│   ├── customer.ts      # customer state
│   └── modal.ts         # modal visibility state
├── types/
│   ├── schemas/cart.ts  # Cart, CartLine, CartLineInput, etc.
│   ├── strapi/cart.ts   # StrapiCart, StrapiCoupon, StrapiFreebies, MysteryBox
│   └── ...
└── utils/
    ├── cart.ts          # calculateTotalLineItems
    ├── optimistic.ts    # all local cart mutation helpers + getCartDifference
    ├── tiers.ts         # calculateTierState, getVisibleTiers, getTierMessages
    └── shopify.ts       # shopifyFetch — base GraphQL fetcher
```

---

## The Two Cart States

The entire cart system is built around the distinction between two parallel cart states:

| State | Where it lives | What it represents |
|---|---|---|
| `cart` | Zustand store, persisted | **Server truth** — last confirmed state from Shopify |
| `localCart` | Zustand store, persisted | **Optimistic UI state** — reflects user actions instantly |

**The rule:**
- User actions always mutate `localCart` immediately (zero latency)
- Every `setLocalCart()` call automatically triggers `syncCart()` in the background
- `syncCart()` diffs `localCart` vs server `cart` and applies the delta via GraphQL
- On sync completion, `setCart(updatedCart)` reconciles the two states

---

## Cart Store (`stores/cart.ts`)

```ts
interface CartState {
  cart: Cart | null;                  // server-confirmed Shopify cart
  localCart: Cart | null;             // optimistic UI cart
  strapiCart: StrapiCart | null;      // Strapi CMS cart config (tiers, coupons, etc.)
  strapiCartExpiry: number | null;    // Unix ms expiry for strapiCart
  discountCode: DiscountCode | null;  // stored discount code { code, expiry }
  loading: boolean;
  _hasHydrated: boolean;
}
```

**Persistence:** Zustand `persist` middleware → localStorage (or custom storage via `__STORAGE__`).  
Persisted fields: `cart`, `localCart`, `strapiCart`, `strapiCartExpiry`, `discountCode`.  
`skipHydration: true` — rehydration is triggered manually after provider mounts.

**Key setter behaviour:**
- `setCart(cart)` → sets both `cart` AND `localCart` (full reconciliation after server confirms)
- `setLocalCart(localCart)` → sets only `localCart`, then immediately calls `syncCart(get())`

---

## Startup / Boot Sequence

```
StarProvider mounts
    ↓
globalThis.__SHOPIFY_CONFIG__, __AWS_CONFIG__, __SYNC_SERVICE_URL__, __STORAGE__ set
    ↓
CartStore.persist.rehydrate()   ← loads persisted state from storage
    ↓
hasHydrated = true
    ↓
initializeCart()
    │
    ├─ cartSyncService.getCartData()  ← check cross-domain storage for saved cart_id
    │
    ├─ if cart_id found → getCart({ cartId }) via Shopify Storefront API
    │       ├─ success → setCart(result.cart) + cartSyncService.setCartData({ cart_id })
    │       └─ not found → fall through to create
    │
    └─ createCart({}) → setCart(result.cart) + cartSyncService.setCartData({ cart_id })
```

---

## GraphQL — What's Fetched

Every cart operation uses the same `cartFragment`. Key fields:

```graphql
fragment cart on Cart {
  id
  attribute(key: "distinct_id")   # analytics tracking ID
  checkoutUrl
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
    checkoutChargeAmount { amount currencyCode }
  }
  lines(first: 250) {
    edges {
      node {
        id
        quantity
        cost {
          totalAmount { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
        discountAllocations {     # CartCode, CartCustom, CartAutomatic variants
          discountedAmount { amount currencyCode }
        }
        estimatedCost {
          amount compareAtAmount totalAmount subtotalAmount
        }
        merchandise {
          ... on ProductVariant {
            id title sku image price selectedOptions
            product { ...product }   # includes productType, handle, variants
          }
        }
        attributes { key value }
      }
    }
  }
  discountCodes { applicable code }
  discountAllocations { discountedAmount }
  totalQuantity
  attributes { key value }
}
```

**GraphQL mutations available:**
- `cartCreate` — create new empty cart
- `cartLinesAdd` — add one or more lines
- `cartLinesRemove` — remove by line IDs
- `cartLinesUpdate` — update quantities/attributes
- `cartAttributesUpdate` — set cart-level attributes
- `cartDiscountCodesUpdate` — apply/remove discount codes

All mutations call `shopifyFetch()` which reads `globalThis.__SHOPIFY_CONFIG__` for domain + access token.

---

## Optimistic Cart Actions (`hooks/useOptimisticCartActions.ts`)

The recommended way to mutate the cart from UI. All operations are **instant** — no loading spinners.

```
User calls addToCart(line, product)
    ↓
validate quantity limit (MAX_LINE_ITEM_QUANTITY from globalConfigs, or product.strapi.maximum_order_quantity)
    ↓
append max_quantity attribute to line
    ↓
createOptimisticLineItem(line, product)  ← builds a CartLine with temp ID
    ↓
addItemToLocalCart(currentCart, optimisticItem)  ← merges into localCart
    ↓
setLocalCart(updatedCart)  ← triggers syncCart() in background
    ↓
return { success: "Added to cart" }  ← UI responds immediately
```

| Hook method | Behavior |
|---|---|
| `addToCart(line, product)` | Validates limits → creates optimistic item → updates localCart |
| `removeFromCart(lineId)` | Filters line out of localCart |
| `updateCart(line)` | Updates qty in localCart; if qty ≤ 0, delegates to remove |
| `incQty(lineId)` | Finds line in localCart → calls updateCart with qty+1 |
| `decQty(lineId)` | Finds line → qty-1; if result would be 0, calls removeFromCart |
| `updateCartDiscountCodes(codes)` | Updates `localCart.discountCodes` optimistically |

---

## Sync Engine (`services/sync.ts`)

`syncCart(state)` is the background reconciliation engine. It runs after every `setLocalCart()` call.

```
syncCart(state)
    ↓
queueSync()  ← serialised: max 1 sync in flight; new calls wait for current to finish
    ↓
getCart({ cartId })  ← re-fetch current server state to avoid stale diffs
    ↓
getCartDifference(serverCart, localCart)
    │
    ├─ itemsToAdd    → lines in localCart but not in serverCart (by merchandiseId)
    ├─ itemsToUpdate → lines in both, qty differs (grouped by merchandiseId, diff distributed)
    └─ itemsToRemove → lines in serverCart but not in localCart (set qty to 0)
    ↓
updateLines({ cartId, lines: [...itemsToRemove, ...itemsToUpdate] })
    ↓
addLines({ cartId, lines: itemsToAdd })
    ↓
getDiscountCodeDifferences(updatedCart, localCart)
    ↓
updateDiscountCodes({ cartId, discountCodes: final })
    ↓
setCart(updatedCart)  ← reconcile: server truth replaces optimistic state
```

**Serialisation:** `isSyncInProgress` flag + `pendingSyncRequest` queue ensures syncs never run in parallel. If a new sync is triggered while one is in progress, it queues and runs immediately after.

---

## Tiers System

Tiers are driven entirely by `StrapiCart.coupons[]`. Each coupon is a tier with a spend/qty threshold.

### `StrapiCart` shape

```ts
interface StrapiCart {
  handle: string;
  trigger_type: "PRICE" | "QUANTITY";    // how cart value is calculated
  apply_coupon_on_cart?: boolean;         // auto-apply tier coupon to cart
  show_tier?: boolean;                    // whether to show tier UI
  coupons: StrapiCoupon[];               // the tiers, sorted by threshold
  cart_configuration?: {
    trigger_at: number;                   // default 3 — unlock count before scrolling
    tiers_to_add: number;                 // default 2 — tiers to advance by
    transition_themes: StrapiTransitionTheme[];
  };
  mystery_box_configuration?: StrapiMysteryBoxConfiguration;
}

interface StrapiCoupon {
  code?: string;
  type?: "BXGY" | "BXAY" | "FIXED" | "PERCENTAGE";
  applicable_product_type?: "ALL" | "SINGLE" | "COMBO";
  minimum_quantity?: number;             // threshold for QUANTITY trigger
  minimum_price?: number;               // threshold for PRICE trigger
  before_applied_message?: string;       // supports ${CODE}, ${PRICE}, ${QUANTITY}, ${TITLE}
  after_applied_message?: string;
  freebies?: StrapiFreebies;
}
```

### How cart value is calculated (`utils/tiers.ts`)

```
getEligibleCartLines(cart, strapiCart, coupon, excludedProducts)
    │
    ├─ exclude lines where productType === "Freebie"
    ├─ exclude mystery_box_configuration product
    ├─ exclude freebie variant IDs from all tiers
    ├─ exclude BXAY excluded products (from globalConfigs EXCLUDE_PRODUCTS_FROM_BXAY_OFFERS)
    └─ if coupon.applicable_product_type === "COMBO" → only Combos productType
       if "SINGLE" → exclude Combos

getCartValue() — sums eligible lines by trigger_type:
    QUANTITY → sum of quantities
    PRICE    → sum of line totalAmount
```

### `calculateTierState(cart, strapiCart, excludedProducts)` → `TierState`

```ts
interface TierState {
  tiers: TierInfo[];           // all tiers with unlock/progress state
  currentTier: TierInfo | null; // highest unlocked tier
  nextTier: TierInfo | null;   // first locked tier (shows progress bar)
  allTiersUnlocked: boolean;
}

interface TierInfo {
  tierIndex: number;
  isUnlocked: boolean;
  coupon: StrapiCoupon;
  progress: number;             // 0–100 percentage
  remainingAmount?: number;     // for PRICE trigger
  remainingQuantity?: number;   // for QUANTITY trigger
  isNextTier: boolean;
}
```

**Progress calculation:**
- Active (unlocked) tiers: `progress = 100`
- Next tier: `progress = ((currentValue - prevTierThreshold) / (threshold - prevTierThreshold)) * 100`
- All locked tiers after next: `progress = 0`

### `getVisibleTiers(tierState, strapiCart)` — sliding window

Shows max 3 tiers at a time. Scrolls forward as tiers unlock:
- `trigger_at` (default 3) — number of unlocks before window starts moving
- `tiers_to_add` (default 2) — how many tiers to advance window per group

```
unlockedCount < trigger_at → show tiers[0..2]
unlockedCount >= trigger_at → startIndex = floor((unlockedCount - trigger_at) / tiers_to_add + 1) * tiers_to_add
```

---

## Auto-Apply Coupons (`hooks/useAutoApplyCoupons.ts`)

Runs as a side effect inside `StarProvider`. Two responsibilities:

**1. Tier-based auto-apply**  
When `strapiCart.apply_coupon_on_cart = true` and `currentTier` changes:
- If a Strapi coupon is currently applied → replace it with the new tier's coupon code
- If no tier is unlocked anymore → remove the applied code

**2. Stored discount code**  
`discountCode` in CartStore has an expiry (default 24h, configurable via `DISCOUNT_CODE_EXPIRY_SECONDS` global config):
- On mount / cart change → if stored code is expired → clear it (and remove from cart if applied)
- If not yet applied → apply it to the cart

---

## Freebies (`hooks/useFreebies.ts`)

```ts
interface UseFreebiesReturn {
  unlockedFreebies: Product[];         // current tier's freebie products
  nextTierFreebies: StrapiFreebies | null;  // next tier's freebies (excluding already-unlocked)
}
```

- `currentTier.coupon.freebies.products` → `unlockedFreebies`
- `nextTier.coupon.freebies.products` filtered to exclude products already in `unlockedFreebies` → `nextTierFreebies`

Detection in `getEligibleCartLines`: items with freebie variant IDs (from all tiers' `freebies.products`) are excluded from cart value calculation.

In `updateCartLineWithQuantity`: a cart line is treated as freebie if `totalAmount === 0` — its total stays `0.0` even when quantity changes.

---

## Mystery Box (`hooks/useMysteryBox.ts`)

A conditional product shown/hidden based on cart state:

```ts
interface StrapiMysteryBoxConfiguration {
  trigger_type: "TIER_UNLOCK" | "NO_OF_PRODUCTS";
  show_at_tier?: number;     // tier index required to show (1-based)
  show_at_products?: number; // min number of (non-mystery-box) products required
  product?: Product;
}
```

**Logic:**
- `shouldShow = (triggerType === "NO_OF_PRODUCTS" && totalLineItems >= showAtProducts) || (triggerType === "TIER_UNLOCK" && currentTierIndex >= showAtTier)`
- `totalLineItems` excludes the mystery box itself when calculating

**`useCartValidation`** runs automatically in `StarProvider`:
- Watches `localCart` changes
- If mystery box `isInCart && !shouldShow` → calls `removeFromCart(cartItem.id)` (optimistic)

---

## StrapiCart Initialization (`hooks/useStrapiCart.ts`)

Priority order when `initializeStrapiCart({ pageCart, syncCart, url })` is called:

```
1. UTM parameters in URL (utm_campaign + utm_source + utm_medium all present)?
       YES → use pageCart (current page's campaign cart)

2. Cross-domain sync service has a saved cart_handle that matches syncCart?
       YES → use syncCart (carry campaign across domains)

3. Current strapiCart is already the default cart?
       YES → refresh default (reset expiry)

4. No UTM, strapiCart exists, not expired?
       YES → keep current strapiCart as-is

5. Otherwise → fall back to defaultStrapiCart
```

**Expiry:** Default 2 days (`STRAPI_CART_EXPIRY_SECONDS` from globalConfigs). When a non-default cart is set, its handle + expiry are synced to cross-domain storage so other domains can pick it up.

---

## Cross-Domain Sync (`clients/sync.ts` + `services/storage.ts`)

### How it works

```
CartSyncService.setCartData({ cart_id, cart_handle, cart_expiry })
    ↓
createSyncClient(globalThis.__SYNC_SERVICE_URL__)
    ↓
SyncClient creates invisible iframe pointing to syncServiceUrl
    ↓
iframe loads → posts "SYNC_SERVICE_READY" message
    ↓
SyncClient.store(data) → postMessage("STORE_DATA", data) to iframe
    ↓
Iframe stores data in its own localStorage (different domain)
    ↓
iframe responds → "DATA_STORED"

Same process in reverse for .get() / .clear() / .merge()
```

**Stored data shape:**
```ts
{
  cart_id?: string;        // Shopify cart GID
  cart_handle?: string;    // StrapiCart handle (campaign identifier)
  cart_expiry?: number;    // Unix ms expiry for the campaign cart
}
```

**Timeout:** 5s for both `waitForReady()` (3s) and individual message round-trips (5s). If the sync service is unavailable, `CartSyncService` returns `null` gracefully — the local cart_id from Zustand persisted store is used instead.

---

## `StarProvider` — What It Wires Up

```tsx
<StarProvider
  config={{ domain, accessToken, apiVersion }}
  awsConfig={{ apiUrl, apiToken }}
  syncServiceUrl="https://sync.example.com"
  defaultConfig={strapiDefaultConfig}
  globalConfigs={strapiGlobalConfigs}
  storage={customStorage}   // optional, defaults to localStorage
>
  <App />
</StarProvider>
```

On mount:
1. Sets all globals: `__SHOPIFY_CONFIG__`, `__AWS_CONFIG__`, `__SYNC_SERVICE_URL__`, `__STORAGE__`
2. Manually rehydrates all three persisted Zustand stores
3. Runs `useCartValidation()` — auto-removes ineligible mystery box
4. Runs `useAutoApplyCoupons()` — auto-applies/removes tier coupons
5. Once `hasHydrated = true` → calls `initializeCart()`
6. Sets `defaultConfig` and `globalConfigs` in ConfigStore whenever they change

---

## Quantity Validation

Two validation functions in `utils/optimistic.ts`:

### `validateQuantityLimit(cart, line, maxQuantity)` — for add operations
Checks: `existingQuantity + line.quantity > maxQuantity`

### `validateTotalQuantity(cart, line, maxLineItemQuantity)` — for update operations
Priority for max quantity:
1. `attributes.find(a => a.key === "max_quantity")?.value` on the existing line
2. `maxLineItemQuantity` from globalConfigs `MAX_LINE_ITEM_QUANTITY`

Checks: total quantity of all lines with same `merchandiseId` after update > maxQuantity

**`max_quantity` attribute** is automatically added to line items in `useOptimisticCartActions.addToCart` when a product has `strapi.maximum_order_quantity` or when `MAX_LINE_ITEM_QUANTITY` is set globally.

---

## Global Config Keys (from Strapi)

| Key | Type | Default | Used by |
|---|---|---|---|
| `DISCOUNT_CODE_EXPIRY_SECONDS` | number | 86400 (24h) | `useCart.storeDiscountCode` |
| `STRAPI_CART_EXPIRY_SECONDS` | number | 172800 (2d) | `useStrapiCart` |
| `MAX_LINE_ITEM_QUANTITY` | number | unlimited | `useOptimisticCartActions` |
| `EXCLUDE_PRODUCTS_FROM_BXAY_OFFERS` | products[] | [] | `useTiers` / `tiers.ts` |

---

## Hooks Quick Reference

| Hook | Returns | Use when |
|---|---|---|
| `useCart()` | cart, localCart, cartCount, initializeCart, ensureCart, updateCartAttributes, updateCartDiscountCodes, storeDiscountCode | Reading cart state or doing discount/attribute operations |
| `useCartActions()` | addToCart, removeFromCart, updateCart, incQty, decQty | Direct server mutations (no optimistic UI) |
| `useOptimisticCartActions()` | addToCart, removeFromCart, updateCart, incQty, decQty, updateCartDiscountCodes | All UI-driven cart mutations (use this by default) |
| `useTiers()` | tiers, currentTier, nextTier, visibleTiers, allTiersUnlocked, showTiers, messages | Progress bar, tier display |
| `useFreebies()` | unlockedFreebies, nextTierFreebies | Freebie product display |
| `useStrapiCart()` | strapiCart, defaultStrapiCart, initializeStrapiCart, getSyncedCartHandle | Campaign cart switching |
| `useMysteryBox({ mysteryBox })` | shouldShow, isInCart, cartItem, variantId, quantity | Mystery box UI |
| `useAutoApplyCoupons()` | null (side effects only) | Already in StarProvider, don't add again |
| `useCartValidation()` | null (side effects only) | Already in StarProvider, don't add again |

---

## Data Flow Summary

```
User action (add to cart)
    ↓
useOptimisticCartActions.addToCart(line, product)
    ↓
validateQuantityLimit()  →  error returned if exceeded
    ↓
createOptimisticLineItem()  →  temp CartLine with generated ID
    ↓
addItemToLocalCart()  →  merge into localCart, recalculate totals
    ↓
setLocalCart(updatedCart)
    │                    \
    │                     syncCart() triggered automatically
    │                         ↓
    ↓                     getCart() → fetch current server state
UI updates instantly      getCartDifference(server, local)
(zero latency)                ↓
                          updateLines() + addLines() + updateDiscountCodes()
                              ↓
                          setCart(updatedCart)  ← server state confirmed
                          (localCart also updated via setCart)
```

---

## Key Design Decisions

1. **Dual-state (cart + localCart)** — UI always reads `localCart` for instant feedback; background sync keeps `cart` in sync with Shopify
2. **setLocalCart triggers sync** — coupling in the store means callers never have to manually trigger sync
3. **Single sync in flight** — queue serialisation prevents race conditions from rapid user actions
4. **Freebie detection by price = 0** — a line with `totalAmount === 0` is treated as freebie in cost calculations
5. **max_quantity as line attribute** — stored on the line itself so validation persists even after a page reload pulls the cart from Shopify
6. **Cross-domain via iframe** — localStorage is origin-bound; using an iframe on the sync service domain allows sharing `cart_id` across Foxtale's multi-domain setup
7. **StrapiCart vs Shopify cart** — completely separate concerns; StrapiCart is the CMS configuration layer (tiers, campaigns), Shopify cart is the actual commerce cart
