// =============================================================
// cartx — Custom checkout provider presets
//
// Each preset is the SHARED open-logic for a 1-click / headless checkout
// provider, shipped by cartx once and reused by every store on that provider.
// Per-brand config (credentials like GoKwik's `mid`) is NOT here — it comes from
// the drawer's checkout settings. The open-logic is provider-specific; the only
// brand-specific part is the config object passed in.
//
// Adding a provider = one entry here + matching admin fields in
// app/routes/app.cart-customizer.jsx + the schema/defaults in
// app/lib/schemas.js & app/lib/constants.js.
//
// Signature: (config, cart) => boolean
//   config — this brand's settings for the provider (e.g. { mid, environment })
//   cart   — current cart (/cart.js shape)
//   returns true if it took over checkout; false to fall back to native /checkout.
// =============================================================

export var CHECKOUT_PROVIDERS = {
  // GoKwik 1-click. Reads the native Shopify cart server-side (via the cart
  // token), so we pass identity only — never line items.
  gokwik: function (config, cart) {
    var sdk = window.gokwikSdk;
    if (!sdk || typeof sdk.initCheckout !== 'function') {
      console.warn('[cartx] GoKwik SDK (window.gokwikSdk) unavailable — falling back to native checkout.');
      return false;
    }
    if (!config || !config.mid) {
      console.warn('[cartx] GoKwik merchant id (mid) not configured — falling back to native checkout.');
      return false;
    }
    try {
      sdk.initCheckout({
        environment: config.environment || 'production',
        type: 'merchantInfo',
        mid: config.mid,
        merchantParams: {},   // GoKwik resolves the cart server-side via the Shopify cart token
      });
      return true;
    } catch (err) {
      console.error('[cartx] GoKwik initCheckout failed:', err);
      return false;
    }
  },
};
