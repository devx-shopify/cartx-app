# CartX — Codebase Deep Dive

## What It Is

A production Shopify embedded app that replaces the native cart with a fully customizable slide-out drawer. Built with a React Router 7 admin app (Fly.io + PostgreSQL) and a Preact storefront bundle (132KB minified) backed by 4 Shopify extensions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Admin framework | React Router 7 (v7.15.1), ESM-only |
| Runtime | Node.js ≥20.19, Fly.io (region: bom / Mumbai) |
| Database | PostgreSQL via Prisma ORM (v6.16.3) |
| Storefront bundle | Preact 10, esbuild |
| Validation | Zod v4 |
| Shopify API version | 2026-07 |
| App bridge | `@shopify/shopify-app-react-router@1.1.0` |

---

## Project Structure

```
cartx-app/
├── app/
│   ├── routes/          # React Router flat routes (admin UI + API)
│   ├── lib/             # Server-side business logic
│   │   └── evaluate/    # Cart evaluation engine (modular)
│   ├── components/      # Shared admin UI components
│   ├── hooks/           # React hooks (useConfirm, usePromotionForm)
│   ├── drawer-src/      # Preact storefront bundle source
│   │   └── src/         # CartDrawer.jsx, evaluate.js, helpers.js, etc.
│   ├── shopify.server.js
│   └── db.server.js
├── extensions/
│   ├── cart-max-drawer/         # Theme App Extension (Liquid + bundle)
│   ├── cart-max-freebie-discount/ # Shopify Function (GWP discounts)
│   ├── cartx-volume-discount/   # Shopify Function (tiered pricing)
│   └── cartx-pixel/             # Web Pixel (analytics)
├── prisma/
│   └── schema.prisma
├── scripts/
│   ├── rollup.mjs       # Hourly analytics aggregation job
│   └── retention.mjs    # Daily analytics cleanup job
└── fly.toml
```

---

## Database Schema (PostgreSQL via Prisma)

### `Session`
Shopify OAuth sessions (managed by `@shopify/shopify-app-session-storage-prisma`).

### `Store`
One row per merchant. Fields: `storeDomain`, `planTier` (free/basic/max), `billingMethod`, `isLegacy`, `legacyPrice`, `onboarding` (JSON progress blob).

### `ThemeConfig`
Per `(shopId, themeId)` JSON config blob. Contains all offers, coupons, claim gifts, drawer styling, and special keys: `__freebie_discount__`, `__volume_discount__`, `__preference__` (selected theme).

### `AnalyticsEvent`
Raw event stream. Fields: `shopId`, `event`, `source` (drawer/web_pixel/server), `promotionId`, `promotionType`, `customerId`, `sessionId`, `cartTotal`, `itemCount`, `revenue`, `metadata`, `occurredAt`.

### `DailyStats`
Hourly-rolled-up aggregates per `(shopId, date, promotionId)`. Fields: `impressions`, `claims`, `removals`, `upsellAdds`, `couponApplies`, `checkouts`, `orders`, `revenue`.

---

## Config Structure

Every merchant+theme combination has a single JSON config blob (`ThemeConfig.config`) with this shape:

```js
{
  offers: [OfferSchema],         // auto-add gifts, bundles, volume discounts
  coupons: [CouponSchema],       // discount codes to showcase
  claim_gifts: [ClaimGiftSchema],// customer picks from variant list
  progress_bar: {
    enabled, all_complete_message, collision_strategy, visual_milestones, tier_order
  },
  bottom_ribbon: { enabled, oos_message_override },
  cross_page_removal_behavior: 'silent' | 'notice' | 'modal',
  upsells: { enabled, heading, show_on_empty_cart, products: [UpsellProductSchema] },
  drawer: DrawerConfigSchema  // colors, shape, typography, text, layout, sections, behavior, advanced
}
```

### DrawerConfigSchema sections
- **colors** — primary, background, text, accent, secondary_accent, overlay_opacity, savings colors
- **shape** — border_radius (`none/small/medium/large/pill`), button_style (`solid/outline`)
- **typography** — heading_size, body_size, font_source (`theme/custom`), custom_font_url
- **text** — all user-facing strings (cart_title, empty_title, checkout_button, etc.)
- **layout** — drawer_width (320–560px), position, image_style, density, qty_style, variant switcher, compare prices, payment icons, empty cart icon, upsells sub-config
- **sections** — show_progress_bar, show_coupons, allow_multiple_coupons, show_upsells, show_offer_cards, show_claim_gifts, show_ribbon, `order` array (drag-to-reorder)
- **behavior** — auto_open_on_add, animation_style (`slide/fade/none`), animation_speed, close_on_overlay_click, confetti, confetti_lottie_url
- **advanced** — custom_css
- **announcement_bar** — text, type (`static/marquee`) — top-of-drawer strip
- **progress_bar** — track_thickness, milestone_icon_svg, completed_icon_svg, badge colors

---

## Admin Routes

| Route file | Purpose |
|---|---|
| `app._index.jsx` | Dashboard — active promotions, feature toggles, onboarding |
| `app.promotions._index.jsx` | Promotions list — CRUD, toggle, duplicate |
| `app.promotions.new.jsx` | New promotion form |
| `app.promotions.$id.jsx` | Edit promotion |
| `app.cart-customizer.jsx` | Visual drawer editor with live preview |
| `app.analytics.jsx` | Analytics dashboard (7/30/90-day) |
| `app.analytics.$promotionId.jsx` | Per-promotion drill-down |
| `app.analytics.export.jsx` | CSV export |
| `app.billing.jsx` | Plan management (Free / Pro $150/mo / Enterprise) |
| `app.settings.jsx` | General settings |
| `app.internal.jsx` | Internal/debug tools |
| `api.evaluate-cart.jsx` | Server cart evaluation API (rate-limited) |
| `proxy.evaluate-cart.jsx` | Shopify App Proxy for storefront evaluation (HMAC-verified) |
| `proxy.analytics.jsx` | Event ingestion proxy (rate-limited, HMAC-verified) |
| `api.discounts.jsx` | Discount sync endpoint |
| `api.pages.jsx` | Page metadata for targeting UI |
| `webhooks.orders.create.jsx` | Order attribution |
| `webhooks.app.uninstalled.jsx` | Cleanup on uninstall |
| `webhooks.app.scopes_update.jsx` | Scope change handler |
| `webhooks.customers.*.jsx` | GDPR compliance (redact, data request) |

---

## Core Server Libraries (`app/lib/`)

### `config.server.js`
Loads and saves `ThemeConfig`. Deep-merges stored JSON with `DEFAULT_CONFIG` so missing keys always have defaults. In-memory LRU cache (30s TTL, 500 entries max). Key exports: `loadConfig`, `saveConfig`, `patchConfig`, `getShopAndTheme`, `setSelectedTheme`.

### `evaluate/` — Cart Evaluation Engine

| File | Responsibility |
|---|---|
| `triggers.server.js` | `evaluateOffers()` — checks price/qty/product triggers, volume tier matching |
| `bar.server.js` | `buildBar()` — aggregates offers + claims + milestones into progress bar tiers |
| `coupons.server.js` | `resolveAvailableCoupons()` — filters by page, customer tags, applied status |
| `claims.server.js` | `resolveClaimGifts()` — returns claimable variants when threshold met |
| `availability.server.js` | `checkAvailability()` — variant stock check via Admin GraphQL (60s cache) |
| `messages.server.js` | `resolveTemplate()` — resolves `[[PRICE]]`, `[[CODE]]`, `[[QTY]]` placeholders |

### `helpers.server.js`
- `adjustedTotal()` / `adjustedQty()` — sums cart excluding freebies
- `computeTotalSavings()` — original_total_price − total_price
- `pageMatch()` — path matching for page-specific offers
- `customerMatchesTags()` — required_any / excluded tag filtering
- `getActiveEntries()` — page-specific offers take priority over global ones

### `discount.server.js`
Manages the **freebie discount Shopify Function**. Config stored as metafield JSON:
```json
{ "rules": [{ "offer_id": "...", "type": "percentage", "value": 100 }], "claim_rules": [...], "default_rule": {...} }
```
Key exports: `ensureFreebieDiscount`, `syncFreebieDiscountFromConfig`, `buildRulesFromOffers`.

### `volume-discount.server.js`
Manages the **volume discount Shopify Function**. Config is an array of offer tiers pushed to a metafield. Key exports: `ensureVolumeDiscount`, `syncVolumeDiscountConfig`.

### `analytics.server.js`
Two query paths:
- **Fast path:** DailyStats (rolled up) when covering ≥80% of completed days
- **Slow path:** live aggregate from AnalyticsEvent otherwise

Key exports: `recordEvent`, `recordEventBatch`, `queryDailyStats`, `getDashboardData`.

### `billing.server.js`
Plans: Free (no features), Pro ($150/mo or $1440/yr, 7-day trial), Enterprise (custom, stored in `Store.isLegacy + Store.legacyPrice`). Key exports: `getActivePlan`, `createSubscription`, `hasFeature`, `requireFeature`.

### `constants.js`
```js
FROZEN_PAGES = ['/cart', '/checkout']
FROZEN_PAGE_PREFIXES = ['/checkouts/']
LINE_PROPS = { FREEBIE: '_freebie', CLAIMED: '_claimed', CARTMAX_CLAIM: '_cartmax_claim', ACQUIRED_ON_PAGE: '_acquired_on_page', OFFER_ID: '_offer_id' }
AUDIENCES = ['all', 'signed_in', 'guest', 'vip_tag']
DEFAULT_CONFIG = { ... }  // full default drawer + promotion config
```

### `schemas.js`
Zod v4 schemas: `OfferSchema`, `CouponSchema`, `ClaimGiftSchema`, `VisualMilestoneSchema`, `DrawerConfigSchema`, `ConfigSchema`, `EvaluateCartRequestSchema`.

---

## Storefront Bundle (`app/drawer-src/src/`)

### Injection (`extensions/cart-max-drawer/blocks/app-embed.liquid`)
- Mounts `#cartmax-root` with `data-shop-id`, `data-theme-id`, `data-customer-id`, `data-customer-tags`, `data-money-format`
- Patches `window.fetch` and `XMLHttpRequest.prototype.open/send` to intercept all `/cart/add`, `/cart/update`, `/cart/change`, `/cart/clear` calls (both `.js` and non-`.js` forms)
- On any cart API call → fetches `/cart.js` → dispatches `cartmax:cart-changed`
- Queues events in `window.__cartmaxQueue` until Preact mounts (`window.__cartmaxReady`)
- Loads `cartmax.css` and `cartmax.js` (deferred)

### `evaluate.js` — Hybrid Evaluation Engine

**Two parallel paths on every cart change:**

1. **Instant / Optimistic (zero latency)**
   - `simulateCart(cart, actions)` — applies pending qty changes locally
   - `localEvaluate()` from `rules.js` using 60s-cached server config
   - `recomputeBar(serverBar, cart)` — recomputes progress % + tier states client-side against server tier data; handles mixed-mode bars (price + qty tiers coexisting)
   - Dispatches `cartmax:eval-result` immediately

2. **Accurate / Server (background)**
   - POST to `/apps/cartmax/evaluate-cart` with full cart state
   - `applyResult()` — single `/cart/update.js` (qty + removals) + `/cart/add.js` (new gifts)
   - Dispatches `cartmax:internal-reload` after Shopify processes cart mutation

**Queue/batch model:** rapid concurrent actions accumulate in `_pendingCart`/`_pendingActions` and are processed as a batch after the current eval completes.

**Config cache:** 60s TTL, populated from `result._config` in server response.

### `CartDrawer.jsx` — Main Component (~1800+ lines)

Single Preact class component. All UI is render methods.

**State:**
```js
{
  visible, open, cart, loading, updating, removing, pendingQty,
  evalResult, savings, unavailableGifts,
  claimed,           // key → true, optimistic freebie claim state
  claimError,        // key → message, inline error on offer/claim card
  upsellError,       // error near upsell list on rollback
  variantOpen,       // item.key → bool, variant dropdown visibility
  variantLoading,    // item.key → bool, fetching variants
  priceBreakupOpen,  // bool — state exists, render not yet implemented
}
```

**Instance properties (config-driven):**
`_text`, `_layout`, `_shape`, `_sections`, `_behavior`, `_announcement`, `_progressBar`, `_upsells`

**Instance caches:**
- `_variantCache` — `product_id → variants[]` (for variant switcher)
- `_compareAtCache` — `variant_id → compare_at_price` in cents

**Render methods:** `renderProgressBar()`, `renderClaimGifts()`, `renderOfferDisplays()`, `renderCoupons()`, `renderUpsells()`, `renderLineItem()`, `renderFooter()`, `renderEmpty()`, `renderLoading()`

**Note:** `HARDCODED_COUPONS` array (lines 162–166) contains test coupon data (SAVE100, ENDYEARSALE, FLAT200) — not config-driven.

### Other storefront files

| File | Purpose |
|---|---|
| `helpers.js` | Cart API wrappers, `applyDrawerSettings()` (CSS vars), `formatMoney()`, focus trap |
| `rules.js` | `localEvaluate()` — client-side offer/bar evaluation against cached config |
| `tracker.js` | Posts analytics events to `/apps/cartmax/analytics` |
| `confetti.js` | Canvas confetti or custom Lottie URL playback on milestone unlock |
| `analytics-events.js` | `ANALYTICS_EVENTS` enum (mirrors server-side) |
| `index.jsx` | Mounts CartDrawer on `#cartmax-root` |

### Custom Events

| Event | Direction | Purpose |
|---|---|---|
| `cartmax:cart-changed` | theme → drawer | Cart API was called; reload + open drawer |
| `cartmax:cart-action` | drawer → evaluate | User changed qty (key + new qty) |
| `cartmax:optimistic-update` | evaluate → drawer | Simulated cart for instant UI |
| `cartmax:eval-result` | evaluate → drawer | Eval result (local or server) |
| `cartmax:internal-reload` | evaluate → drawer | Full cart + eval result after Shopify write |
| `cartmax:gift-unavailable` | evaluate → drawer | OOS variant list update |
| `cartmax:drawer-opened` | drawer → evaluate | Re-push last eval result on open |

### Global API
```js
window.cartx.open()
window.cartx.close()
window.cartx.toggle()
window.cartx.refresh()
window.cartx.isOpen()
```

---

## 4 Shopify Extensions

### `cart-max-drawer` (Theme App Extension)
- **`blocks/app-embed.liquid`** — injected body-wide; mounts Preact, intercepts fetch/XHR
- **`assets/cartmax.js`** — built Preact bundle (esbuild IIFE, ES2018, minified)
- **`assets/cartmax.css`** — 4000+ lines, CSS custom properties (`--cartmax-*` vars) + BEM-like `.cartmax-*` classes

### `cart-max-freebie-discount` (Shopify Function)
- API: `purchase.product-discount.run`
- Discounts cart lines with `_freebie: "true"` property
- Matches `_offer_id` → claim_rules first, then GWP rules, then default_rule
- Supports `percentage`, `fixed_amount`, `fixed_price` discount types

### `cartx-volume-discount` (Shopify Function)
- API: `cart.lines.discounts.generate` + `delivery.cart_discounts.generate`
- Applies tiered pricing by qualifying item quantity
- Config: array of offers with tiers, discount_mode (`fixed_total`|`percentage`)

### `cartx-pixel` (Web Pixel)
- Subscribes to `checkout_started`, `checkout_completed` events
- Reads `cartx_session_id` cookie
- POSTs events to `/apps/cartmax/analytics`

---

## Promotion Types

### Auto-Add Gift (`reward.type: "auto_add_gift"`)
1. Trigger met (price or qty threshold) → eval returns `to_add` array
2. Drawer calls `/cart/add.js` with `_freebie: "true"`, `_offer_id: "<id>"`
3. Freebie discount function applies 100% (or configured) discount at checkout

### Volume Discount (`reward.type: "volume_discount"`)
1. Qualifying qty counted from cart (excluding freebies)
2. Active tier found → shown in progress bar
3. Volume discount function applies tiered pricing at checkout

### Claim Gift (`reward.type: "claim_gift"` in `claim_gifts[]`)
1. Threshold met → drawer shows variant picker
2. Customer picks → `/cart/add.js` with `_cartmax_claim: "true"`
3. Freebie function applies `claim_price` (partial or zero cost)
4. `max_claims` enforced on drawer side

### Coupons
- Display discount codes with type/message
- Applied via Shopify discount cookie or `/cart/update.js`
- Applied status detected from `cart.discount_codes` or `cart_level_discount_applications`
- `allow_multiple_coupons` config flag controls multi-coupon UX

### Upsells
- Fixed list of products from config
- Added via standard `/cart/add.js` — no special line properties

---

## Analytics Pipeline

```
Drawer + Web Pixel  →  POST /proxy.analytics  →  AnalyticsEvent table
                                                         ↓ (hourly cron)
                                                    DailyStats table
                                                         ↓
                                                   Analytics dashboard
                                                   (fast path ≥80% coverage)

webhooks/orders/create  →  attribution.server.js  →  ORDER_ATTRIBUTED event
```

**Analytics events:** `DRAWER_OPENED`, `DRAWER_CLOSED`, `PROMOTION_VIEWED`, `GIFT_CLAIMED`, `GIFT_REMOVED`, `UPSELL_ADDED`, `COUPON_APPLIED`, `COUPON_REJECTED`, `CHECKOUT_STARTED`, `CHECKOUT_COMPLETED`, `ORDER_COMPLETED`, `ORDER_ATTRIBUTED`

**Sources:** `drawer`, `web_pixel`, `server`

---

## Deployment (Fly.io)

- **App:** `cartx`, region `bom` (Mumbai), `shared-cpu-1x`, 512MB RAM
- **Always-on:** `auto_stop_machines = "off"`, `min_machines_running = 1` (avoids cold starts for Shopify embeds)
- **Boot sequence:** `npm run docker-start` → `prisma migrate deploy` → `react-router-serve`
- **No release_command** — migrations run on boot to avoid spare-capacity failures in bom region
- **Scheduled jobs** (via `fly machine run`, not fly.toml):
  - `npm run rollup` — hourly, aggregates AnalyticsEvent → DailyStats
  - `npm run retention` — daily, cleans up old analytics rows

---

## Build Pipeline (Drawer Bundle)

```bash
cd app/drawer-src && npm run build
# esbuild → IIFE, ES2018, minified
# output: extensions/cart-max-drawer/assets/cartmax.js
```

**Always rebuild after any change to `app/drawer-src/src/`.**

---

## Key Architectural Patterns

1. **Hybrid evaluation** — local optimistic (zero latency) + server accurate (background); user never waits
2. **Per-theme multi-tenancy** — each merchant theme gets an independent `ThemeConfig` row
3. **Two Shopify Functions** — freebie discount + volume discount run at Shopify checkout, not in the app
4. **Single cart write** — `applyResult()` batches all updates into one `/cart/update.js` call
5. **Config cache** — 30s server TTL + 60s client TTL; storefront never calls admin DB directly
6. **Rate limiting** — sliding window (120 req/60s per shop) on evaluate + analytics proxies
7. **Page-specific targeting** — offers with exact path handles override global offers; `"/"` = all pages
8. **GDPR compliance** — webhooks for `customers/data_request`, `customers/redact`, `shop/redact`
