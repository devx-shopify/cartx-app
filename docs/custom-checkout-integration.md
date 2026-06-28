# cartx — Custom Checkout Integration

cartx's checkout button supports two modes, set per store in the app admin
(**Cart Customizer → Checkout → Checkout type**):

- **Native** — the button goes to the standard Shopify checkout (`/checkout`).
- **Custom** — the button hands off to a 1-click / headless provider (e.g. GoKwik).

## Model: provider presets + per-brand config

The checkout-open **logic is provider-specific, not brand-specific** — every store
on GoKwik opens the modal the same way. So cartx ships the open-logic **once per
provider** (a "preset"), and each brand supplies only its own **config**
(credentials like the GoKwik `mid`).

- **Preset (shipped by cartx):** `app/drawer-src/src/checkout-providers.js` —
  `CHECKOUT_PROVIDERS[provider](config, cart) => boolean`.
- **Per-brand config (admin):** Custom mode shows a provider dropdown; selecting a
  provider reveals its fields (e.g. GoKwik mid + environment). Saved into the
  `drawer_config` metafield and read by the drawer.

At checkout, the drawer settles the cart, then calls the selected preset with that
brand's config. If the preset returns false (SDK missing / unconfigured), it
**falls back to native `/checkout`** so a shopper is never stranded.

### Adding a new provider

A contained change — no per-brand code:

1. Add an entry to `CHECKOUT_PROVIDERS` in `checkout-providers.js` (the open-logic).
2. Add the provider to the `provider` enum + a config block in
   `app/lib/schemas.js` and `app/lib/constants.js`.
3. Add the provider option + its config fields in the Checkout section of
   `app/routes/app.cart-customizer.jsx`.
4. Rebuild: `node app/drawer-src/build.js`.

Every brand on that provider then just selects it and fills their config.

### GoKwik preset (the first one)

Config: `mid` (merchant id, from GoKwik onboarding) + `environment`
(`production` | `sandbox`). The preset calls
`gokwikSdk.initCheckout({ environment, type: "merchantInfo", mid, merchantParams: {} })`.
GoKwik reads the **native Shopify cart server-side** via the cart token, so we pass
identity only — never line items.

## Escape hatch: per-store hook (no preset)

For a bespoke provider without a preset, define a per-store handler instead. The
drawer tries the preset first, then this hook:

```js
// Option A — define a function
window.cartxCheckout = function (cart) { /* provider call */ };

// Option B — listen for the event and mark it handled
window.addEventListener("cartx:checkout", function (e) {
  e.detail.handled = true;   // or e.preventDefault()
  /* provider call */
});
```

If neither a preset nor a hook takes over, cartx navigates to native `/checkout`.

## Timing

cartx waits for the cart sync to settle before firing, so the provider sees the
final cart. The cart lives in the native Shopify cart, so server-side providers
resolve line items from the cart token automatically.

Questions: ansh.varshney@devxlabs.ai
