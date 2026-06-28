# cartx — Partner App Integration Guide

This guide is for **third-party Shopify app developers** whose app adds items to
the cart (upsell apps, product bundlers, "frequently bought together", quick-add
widgets, etc.) on a store that runs **cartx**.

cartx replaces the theme's cart drawer. So that **your** add-to-cart lands in the
cartx drawer (and in whatever cart engine the merchant has enabled), call the
cartx public API instead of — or with a fallback to — your own `/cart/add`.

You don't need to know which cart engine cartx uses. `addItem` routes the add
into the correct cart internally.

---

## Quick start (recommended)

In your add-to-cart handler, prefer cartx when it's present:

```js
function addToCart(variantId, quantity, properties) {
  // cartx present → let it own the add (it opens its drawer and syncs)
  if (window.cartx && typeof window.cartx.addItem === "function") {
    return window.cartx.addItem({
      id: variantId,            // numeric/string variant id (required)
      quantity: quantity || 1,  // optional, default 1
      properties: properties,   // optional line-item properties object
      source: "your-app-name",  // optional, for attribution
    });
  }

  // cartx not installed → your existing native add
  return fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: variantId, quantity: quantity || 1, properties }),
  });
}
```

> **Call cartx OR your own add — never both.** The `if (window.cartx?.addItem)`
> check is what prevents a double-add. When cartx is present, do not also POST to
> `/cart/add` yourself.

`addItem` returns a **Promise** that resolves once the item is in the cart, so you
can chain UI updates:

```js
window.cartx.addItem({ id: 49123456789, quantity: 2 })
  .then(() => console.log("added"))
  .catch((err) => console.warn("add failed", err));
```

---

## Option B — the event contract (no load-order concerns)

If you'd rather not hold a reference to `window.cartx`, dispatch a `cartx:add`
event. cartx listens for it globally:

```js
window.dispatchEvent(new CustomEvent("cartx:add", {
  detail: { id: variantId, quantity: 1, properties: {}, source: "your-app-name" },
}));
```

Both paths call the same code internally.

---

## Load order is handled for you

cartx installs an early stub at page parse, so `window.cartx.addItem(...)` is
**safe to call before the cartx bundle finishes loading** — calls are buffered
and flushed automatically when the drawer mounts. You do not need to wait for any
"ready" event.

If you want to detect readiness anyway, `window.cartx._stub === true` means the
stub is active (drawer not yet mounted); on the mounted API that property is
absent.

---

## `addItem` payload reference

| Field        | Type     | Required | Notes                                                        |
|--------------|----------|----------|-------------------------------------------------------------|
| `id`         | string/number | yes | Shopify **variant** id. (`variant_id` is also accepted.)     |
| `quantity`   | number   | no       | Defaults to `1`.                                             |
| `properties` | object   | no       | Line-item properties, e.g. `{ "_bundle": "abc" }`.          |
| `source`     | string   | no       | Stored as the `_cartx_source` line property for attribution. |
| `open`       | boolean  | no       | Force the drawer open/closed. Defaults to the merchant's "auto-open on add" setting. |

---

## Notes & limitations

- **Variant id only.** Pass a concrete variant id, not a product id.
- **One add per call.** For multiple items, call `addItem` once per line (await
  each if order matters).
- **Properties are preserved** and flow through cartx's promotions pipeline
  (gifts, bundles, volume discounts), same as a native add.
- **Checkout** is owned by the merchant's cartx settings (native Shopify or a
  custom 1-click provider). Your app does not need to handle checkout.

Questions: ansh.varshney@devxlabs.ai
