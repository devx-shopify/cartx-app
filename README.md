# cartx — Shopify Cart Drawer App

A Shopify embedded app that replaces the native cart with a fully customizable, high-performance cart drawer. Built for merchants who want complete control over how their cart looks, feels, and behaves.

## What it does

- Replaces the default Shopify cart page/drawer with a slide-out cart drawer
- Intercepts all cart API calls (add, update, change) and shows the drawer automatically
- Supports offers, free gifts, claim gifts, coupons, upsells, volume discounts, and a visual progress bar
- Fully customizable via an admin UI — colors, typography, layout, animations, and more
- Per-theme configuration — different drawer styles for different themes
- Lightweight Preact storefront bundle with optimistic updates for instant UI feedback

## Features

### Cart Drawer
- Slide-out drawer with smooth animations (slide, fade, or instant)
- Real-time cart updates without page reload
- Quantity controls with debounced updates
- Remove items with instant feedback
- Loading skeleton while fetching cart data
- Empty cart state with customizable text
- Accessibility: focus trap, ARIA labels, keyboard navigation, live region announcements

### Promotions
- **Auto-add free gifts** — automatically add gift products when cart meets a threshold
- **Bundles** — bundle products together with special pricing
- **Volume discounts** — "Buy 3 @ ₹999, Buy 4 @ ₹1299" tiered pricing via Shopify Functions
- **Claim gifts** — let customers pick their own free gift from a selection
- **Coupons** — showcase available discount codes, apply/remove directly in the drawer
- **Upsells** — recommend products in the cart drawer

### Progress Bar
- Visual progress bar with milestones from offers, claim gifts, and visual milestones
- Auto-generated milestones for volume discount tiers
- Mixed mode — supports both price-based and quantity-based milestones together
- Page-specific offers take priority over global ones
- Confetti animation on milestone unlock (built-in canvas or custom Lottie)

### Cart Customizer (`/app/cart-customizer`)
Full visual customization of the cart drawer from the admin:

| Category | Settings |
|----------|----------|
| **Colors** | Primary, primary text, background, text, secondary text, border, accent, overlay opacity |
| **Shape** | Border radius (none/small/medium/large/pill), button style (solid/outline) |
| **Typography** | Heading size, body size, custom Google Fonts |
| **Text & Labels** | Cart title, empty state text, checkout button, coupon placeholder, total/subtotal labels, continue shopping |
| **Layout** | Drawer width (320–560px), position (left/right), image style/size, density, qty style, vendor, variant |
| **Sections** | Toggle visibility of progress bar, claim gifts, coupons, upsells, ribbon |
| **Behavior** | Auto-open on add, animation style/speed, close on overlay/ESC, confetti toggle + Lottie URL |
| **Advanced** | Custom CSS injection, export/import settings as JSON, reset to defaults |

Live preview panel updates in real-time as you change settings. Supports filled cart and empty cart preview modes.

### Volume Discounts
- New offer type: "Buy X @ Y" or "Buy X get Y% off"
- Multiple tiers per offer (e.g., Buy 3 @ ₹999, Buy 4 @ ₹1299)
- Powered by a Shopify Function (`cartx-volume-discount`) that applies line item discounts at checkout
- Distributes discount proportionally across qualifying line items
- Excludes freebie items from qualifying count
- Auto-generates progress bar milestones from tiers
- Config synced to Shopify Function metafield on every offer save

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Shopify Admin (Embedded App)                           │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────────┐  │
│  │Dashboard │ │Promotions│ │Cart Customizer         │  │
│  │          │ │(offers,  │ │(colors, layout, text,  │  │
│  │          │ │coupons,  │ │ sections, behavior)    │  │
│  │          │ │claims)   │ │                        │  │
│  └──────────┘ └──────────┘ └────────────────────────┘  │
│                      │                                   │
│              ThemeConfig DB (per shop + theme)            │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Storefront (Theme App Extension)                       │
│                                                          │
│  app-embed.liquid                                        │
│  ├── Fetch + XHR interception (detects cart changes)     │
│  ├── #cartmax-root (Preact mount point)                  │
│  └── cartmax.js (Preact bundle)                          │
│       ├── CartDrawer.jsx (main component)                │
│       ├── evaluate.js (server eval + optimistic local)   │
│       ├── rules.js (client-side rule evaluation)         │
│       ├── helpers.js (CSS variables, cart API, a11y)     │
│       └── confetti.js (canvas + Lottie)                  │
│                                                          │
│  cartmax.css (CSS variable system, 100+ tokens)          │
│                                                          │
│  evaluate-cart API ◄──── called on every cart change     │
│  └── Returns: offers, bar, coupons, claims, upsells,    │
│       volume_discounts, drawer settings                   │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Shopify Functions (run at checkout)                     │
│  ├── cart-max-freebie-discount (free gift pricing)       │
│  └── cartx-volume-discount (volume tier pricing)         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. Customer adds product → fetch interception detects `/cart/add.js`
2. `cartmax:cart-changed` event fires → drawer opens
3. `evaluate.js` runs: optimistic local eval (instant) → server eval (accurate)
4. Server returns offers, bar, gifts to add/remove, drawer settings
5. `CartDrawer.jsx` renders with updated cart + eval result
6. `applyDrawerSettings()` sets CSS custom properties on `#cartmax-root`
7. At checkout → Shopify Functions apply gift discounts + volume discounts

### Config Storage

All configuration is stored in the `ThemeConfig` table (SQLite via Prisma), keyed by `shopId + themeId`. This enables per-theme customization. Special keys:

| Key | Purpose |
|-----|---------|
| `shopId + themeId` | Offers, coupons, claims, progress bar, upsells, drawer settings |
| `shopId + "__freebie_discount__"` | Freebie discount function state |
| `shopId + "__volume_discount__"` | Volume discount function state |
| `shopId + "__preference__"` | Selected theme preference |

## Third-Party Integration API

cartx exposes a global `window.cartx` object for third-party apps to interact with the cart drawer.

### API Reference

```js
// Open the cart drawer (fetches latest cart data first)
window.cartx.open()

// Close the drawer
window.cartx.close()

// Toggle open/close
window.cartx.toggle()

// Refresh cart data and re-evaluate offers (without opening)
window.cartx.refresh()

// Check if the drawer is currently open
window.cartx.isOpen()  // returns true/false
```

### Integration Examples

**Reels/video app that adds to cart:**
```js
// Option 1: Just add via Shopify API — cartx auto-detects and opens
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: variantId, quantity: 1 })
})

// Option 2: Add product then explicitly open cartx
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: variantId, quantity: 1 })
}).then(() => window.cartx.open())
```

**Custom "View Cart" button:**
```html
<button onclick="window.cartx.open()">View Cart</button>
```

**After a custom form submission:**
```js
myForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  await addItemToCart(formData)
  window.cartx.refresh()
})
```

### Auto-detection

cartx automatically intercepts `fetch()` and `XMLHttpRequest` calls to Shopify cart endpoints:
- `/cart/add.js`, `/cart/update.js`, `/cart/change.js`, `/cart/clear.js`
- Also intercepts non-`.js` variants (`/cart/add`, `/cart/update`, etc.)

When any of these are detected, the drawer auto-opens with the updated cart. Most third-party apps don't need to call `window.cartx` at all — it just works.

## Development

### Prerequisites

- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- Node.js 18+
- npm

### Local Development

```bash
shopify app dev
```

### Building the Preact Bundle

After modifying files in `app/drawer-src/`:

```bash
cd app/drawer-src && node build.js
```

This outputs `extensions/cart-max-drawer/assets/cartmax.js`.

### Deploying

```bash
shopify app deploy
```

This deploys the app, theme extension, and Shopify Functions.

## Project Structure

```
cart-max/
├── app/
│   ├── routes/
│   │   ├── app.jsx                    # App shell, nav, theme switcher
│   │   ├── app._index.jsx            # Dashboard
│   │   ├── app.cart-customizer.jsx   # Cart customizer (all settings + preview)
│   │   ├── app.promotions._index.jsx # Promotions list
│   │   ├── app.promotions.new.jsx    # Create promotion
│   │   ├── app.promotions.$id.jsx    # Edit promotion
│   │   ├── app.settings.jsx          # App settings
│   │   ├── proxy.evaluate-cart.jsx   # Evaluate cart API (proxy)
│   │   └── api.evaluate-cart.jsx     # Evaluate cart API (direct)
│   ├── components/
│   │   ├── CartPreview.jsx           # Live preview for customizer
│   │   ├── OfferForm.jsx             # Offer creation/edit form
│   │   ├── CouponForm.jsx            # Coupon form
│   │   ├── ClaimGiftForm.jsx         # Claim gift form
│   │   └── VariantList.jsx           # Product variant picker/list
│   ├── lib/
│   │   ├── schemas.js                # Zod schemas (offers, drawer, etc.)
│   │   ├── constants.js              # DEFAULT_CONFIG, line properties
│   │   ├── config.server.js          # loadConfig, saveConfig, cache
│   │   ├── discount.server.js        # Freebie discount management
│   │   ├── volume-discount.server.js # Volume discount management
│   │   ├── helpers.server.js         # adjustedTotal, pageMatch, etc.
│   │   └── evaluate/
│   │       ├── triggers.server.js    # Offer evaluation + volume discount
│   │       ├── bar.server.js         # Progress bar builder
│   │       ├── coupons.server.js     # Coupon resolution
│   │       ├── claims.server.js      # Claim gift resolution
│   │       └── messages.server.js    # Template resolution
│   └── drawer-src/                   # Preact storefront bundle source
│       ├── src/
│       │   ├── index.jsx             # Entry point, mounts CartDrawer
│       │   ├── CartDrawer.jsx        # Main drawer component
│       │   ├── evaluate.js           # Eval pipeline + optimistic updates
│       │   ├── rules.js              # Client-side rule evaluation
│       │   ├── helpers.js            # Shared utilities
│       │   └── confetti.js           # Confetti animation
│       └── build.js                  # esbuild config
├── extensions/
│   ├── cart-max-drawer/              # Theme App Extension
│   │   ├── blocks/app-embed.liquid   # App embed with fetch interception
│   │   └── assets/
│   │       ├── cartmax.js            # Built Preact bundle
│   │       └── cartmax.css           # All drawer styles (CSS variables)
│   ├── cart-max-freebie-discount/    # Shopify Function (free gifts)
│   │   └── src/run.js
│   └── cartx-volume-discount/        # Shopify Function (volume discounts)
│       └── src/cart_lines_discounts_generate_run.js
└── prisma/
    └── schema.prisma                 # Database schema
```
