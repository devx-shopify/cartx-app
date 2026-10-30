# cartx: known bugs

Bugs found during store setups (FREED, devx-dev QA), with root cause and the planned fix. Each was reproduced with a headless browser against the storefront and checked against the released code (release PR #38, 29 Oct 2026). None are fixed yet.

| # | Bug | Severity | Area | Ships with |
|---|---|---|---|---|
| 1 | Draft and archived products can be picked as gifts and upsells | High | Admin | Fly |
| 2 | Claim gift that Shopify rejects shows "Claimed" with no line | High | Drawer | `shopify app deploy` |
| 3 | Upsell that Shopify rejects is added, then silently removed | Medium | Drawer | `shopify app deploy` |
| 4 | Gifts are always reported as available | Medium | Server | Fly |
| 5 | "You are saving ₹X" is one change behind | Medium | Drawer | `shopify app deploy` |

---

## 1. Draft and archived products can be picked as gifts and upsells

**Seen on:** FREED. The six Arm Cuff claim gifts were draft products. Also reproduced for upsells: a draft product can be added to the upsell list and shows in the cart.

**Root cause:** none of the admin product pickers filter by product status. `shopify.resourcePicker({ type: "product", … })` is called with no `filter`, so draft and archived products are offered:
- `app/components/ClaimGiftForm.jsx` (claimable gifts)
- `app/components/OfferForm.jsx` (gift variants, bundle and volume products)
- `app/components/TargetingSection.jsx` (targeting products)
- `app/routes/app.upsells._index.jsx` (default upsell list)
- `app/routes/app.upsells.rules.$id.jsx` (rule trigger and recommendations)

A draft product isn't on the Online Store, so `/cart/add.js` rejects it with **422 "Cannot find variant"** (bugs 2 and 3).

**Fix:**
- Pass `filter: { draft: false, archived: false }` to every product picker. Only **active** products (including unlisted ones, which are active but hidden from search and collections) can then be selected.
- Validate on save as well (the picker filter is only a UI guard): when an offer, claim gift or upsell is saved, check the selected products' status with the Admin API and reject draft or archived ones with a clear message.
- Existing configs: the `products/update` webhook already auto-drafts a promotion when its gift product is drafted (`product-sync.server.js`), but only when the product *changes* to draft. A product that was already draft when it was picked is never caught. Add a check when the promotions and upsells pages load: flag any promotion or upsell whose product isn't active ("needs attention"), and skip it in the evaluate.

## 2. Claim gift that Shopify rejects shows "Claimed" with no line

**Seen on:** FREED preview theme. Cart ₹2222 (claim gift unlocks above ₹1999). Click ADD on an Arm Cuff: the gift line shows as FREE for a moment and then disappears; the button stays on **CLAIMED**, and the other gifts still say ADD.

**Repro trace:**

| Time after click | What happened |
|---|---|
| +0.06 s | `POST /cart/add.js` for the gift variant with `_freebie` / `_claimed` |
| +0.3 s | Instant (optimistic) gift line shown as FREE |
| +0.8 s | Line gone; `/cart/add.js` returned 422 "Cannot find variant" |
| +1.5 s onward | Button "CLAIMED", no gift line; Shopify's `/cart.js` has no gift |

**Root cause:** in the default AJAX cart store path, `handleClaimAdd` (`CartDrawer.jsx`) sets the button's `claimed` state and adds the line optimistically. When the sync's `/cart/add.js` is rejected, `ajax-cart-store.js` drops the line ("rejected add" branch) but nothing tells the drawer: `claimed` is never cleared and no error is shown. The older cart path does revert the button and show "Out of stock". It also records `GIFT_CLAIMED` **before** the add succeeds, so failed claims count as claims in analytics.

**Fix:**
- Have the store report rejected variant ids (an event or a callback from the "rejected add" branch).
- In the drawer, clear `claimed` for that card and show the inline error (`text.gift_unavailable` / `out_of_stock`) for the usual hold time.
- Record `GIFT_CLAIMED` only once the line exists in Shopify's cart.
- The same applies to "Pick your free gift" offer cards (`handleOfferDisplayAdd`).

## 3. Upsell that Shopify rejects is added, then silently removed

**Seen on:** FREED (draft product in the upsell list). Click ADD on the recommendation: the line appears, then disappears, with no message.

**Root cause:** the same as bug 2, on the upsell path (`handleUpsellAdd` → `ajaxAddLine`). The store drops the rejected line, and `upsellError` is never set. The live availability check (`_ensureUpsellAvailability`) can't see a draft product, so it leaves the card addable instead of marking it unavailable.

**Fix:**
- Show the existing upsell error ("Unavailable") when the store rejects the add, and record the upsell add only on success.
- When the availability check can't find a product (404 / missing from the response), treat it as unavailable: hide the card, or show it as sold out, per the `sold_out` setting.

## 4. Gifts are always reported as available

**Root cause:** the evaluate marks every claim gift and display-offer gift `available: true` without checking (`app/lib/evaluate/claims.server.js:82`, `app/lib/evaluate/triggers.server.js:152`). The drawer then offers gifts that can't be added.

**Fix:** bug 1's status check covers new saves. For safety, store each gift's product status in its snapshot (`gift_variant_data` / `claimable_variant_data`, kept fresh by the product webhook) and report `available: false` when it isn't active. The drawer already disables a card with `available: false` and shows "Unavailable".

## 5. "You are saving ₹X" is one change behind

**Seen on:** devx-dev, live theme. Headband ₹399 × 3 at "Buy 3" ₹1099 (₹98 off), plus a free moisturizer (₹479). With the gift in the cart the ribbon said ₹98; after removing it, it said ₹577. Shopify's `/cart.js` showed the opposite each time.

**Repro trace:**

| Step | Drawer | Shopify `/cart.js` saving |
|---|---|---|
| 3 headbands | no saving line | ₹98 |
| Claim moisturizer (+7.5 s) | no saving line | ₹577 |
| Remove gift (+7.5 s) | ₹577 | ₹98 |

**Root cause:** in the AJAX cart store path the drawer evaluates its **instant guess** of the cart 250 ms after a change (`_maybeRunAjaxPromo` → `_runAjaxPromo`), not Shopify's cart:
- **Remove:** with discounts present, `preserveMoney` keeps the *old* money, so the saving reflects the cart before the change.
- **Add:** the gift goes in at ₹0 with no original price (`recalcTotals`), so its value isn't counted.

When Shopify's real cart arrives, `_cartSignature` (product + quantity + offer only) hasn't changed, so the drawer doesn't evaluate again and the stale saving stays. The footer total can be briefly stale the same way, and the progress bar and coupons are evaluated from the same instant cart.

**Fix:**
- Include the cart's money (`total_price`, `original_total_price`) in `_cartSignature`, so the real cart triggers a fresh evaluate.
- When Shopify's cart arrives, set the saving directly from it (`original_total_price − total_price`), the same formula as the server.
- Unit tests for add-gift and remove-gift; re-run the live repro script.

---

## Fix order

1. **Bug 1** (stops new bad configs) together with **bug 4** (stops existing ones reaching shoppers). Server and admin, ships to Fly.
2. **Bugs 2, 3 and 5** in one drawer release (all in the AJAX cart store path), ships with `shopify app deploy`.

Immediate workaround for stores: make sure every gift and upsell product is **Active** with the **Online Store** sales channel on.
