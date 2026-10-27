# FREED cart drawer: cartx setup guide

How to set up the FREED cart design (Figma "FREED / CartX") on FREED's store using cartx. Most of it is settings plus one import file, with no code changes. What the current app can't do yet is listed in `freed-cart-feasibility.md`.

**Files in `docs/freed/`**

| File | What it is |
|---|---|
| `freed-cart-settings.json` | Customize Cart import file: colours, fonts, text, layout, sections, announcement bar, progress bar icons, and the FREED Custom CSS |
| `freed-cart-custom.css` | The same Custom CSS as a separate file, for review and edits |
| `assets/special-offer-sticker.png` | "SPECIAL OFFER" sticker, full size, for reference only. A small copy is already embedded in the Custom CSS. |
| `assets/milestones/gift-icon.svg` | Milestone icon, not yet reached (dark gift, from Figma) |
| `assets/milestones/gift-icon-reached.svg` | Milestone icon, reached (white gift on the pink dot, from Figma) |
| `assets/milestones/tick-badge.svg` | Blue tick on a reached milestone (already inside the Custom CSS) |
| `assets/milestones/truck-icon.svg`, `arm-cuff-icon.svg` | Reward icons from the reward-first design, for reference only. cartx uses the two shared milestone icons above for every milestone. |
| `assets/empty-cart.svg` | Empty-cart illustration for the Empty cart icon upload (29 KB) |

**Values marked *(placeholder)*** come from the Figma mock-up. Replace them with FREED's real offers, products and copy.

---

## 1. Create a test theme and keep cartx off the live theme

cartx saves its settings **per theme**, and the import replaces all drawer settings of the selected theme. All setup happens on a test theme.

1. In Shopify admin → **Online Store → Themes**, open the live theme's **⋯** menu → **Duplicate**. Rename the copy to `FREED – cartx test`.
2. On the **live** theme: **Customize → App embeds**. Make sure the **cartx** embed is **off**. Leave it off until the client signs off.
3. On the **test** theme: **Customize → App embeds** → turn **cartx** **on** → **Save**.
4. In the cartx app, use the theme switcher at the top to select **`FREED – cartx test`**. Check that it's selected before every step below. Settings saved while another theme is selected go to that theme.
5. Test using the test theme's **Preview** link (Themes → ⋯ → Preview). Customers never see it.

## 2. Back up the current drawer settings

In cartx → **Customize Cart → Backup & restore** → **Export**. Keep the downloaded `cartx-drawer-settings.json`. Importing that file restores the previous state.

## 3. Images

Nothing needs uploading to Shopify Files:

- The "SPECIAL OFFER" sticker is embedded in the Custom CSS, so the import brings it in.
- The empty-cart illustration is uploaded in Customize Cart in step 4.

## 4. Prepare and import the settings file

1. In cartx → **Customize Cart → Backup & restore** → **Import** → choose `freed-cart-settings.json`.
2. The toast says "Settings imported — save to apply". Click **Save** in the save bar.
3. Check the milestone icons:
   - Open **Customize Cart → Progress bar**.
   - **Milestone icon** should show the dark gift, and **Completed milestone icon** the white gift. The import already sets both.
   - If either is empty, upload `assets/milestones/gift-icon.svg` and `assets/milestones/gift-icon-reached.svg`.
   - **Save**.
4. Add the empty-cart illustration:
   - Open **Customize Cart → Empty cart → Empty state icon**.
   - Upload `assets/empty-cart.svg`.
   - **Save**.

**What the import sets**

| Area | Value |
|---|---|
| Fonts | Montserrat (base), Anton (headings, buttons), Roboto (cart items), loaded from Google Fonts. This can only be set by import, because Customize Cart has no font URL field. |
| Colours | Text `#18181B`, secondary text `#52525C`, borders `#D4D4D8`, accent pink `#F238A7`, secondary accent lime `#CFF665`, checkout `#000000`, savings strip `#333333` with white text |
| Drawer | 560 px wide on desktop (the app maximum; the Figma frame is 600 px), full width on mobile, square images |
| Text | Title "Cart" with item count "(2)", checkout "Check out", savings "You are saving {amount} on this product", gift heading "Pick one free gift", empty title "Your cart is empty" with no subtitle and no button, no trust message |
| Announcement bar | "Free Shipping on All Orders ₹399 & Above" *(placeholder)*, static |
| Progress bar | Thin track. Milestone icons from Figma: dark gift (not reached), white gift on pink (reached), blue tick badge |
| Sections | Progress bar, claim gifts, offer cards, coupons, upsells on. Bottom ribbon off (not in the design). |
| Upsells | Horizontal cards, heading "You may also like" on the left, button "Add", shown on the empty cart too |
| Payment icons | On (GPay, PhonePe, Paytm, as in the design) |
| Custom CSS | The FREED look: header, gradient milestone card with the "SPECIAL OFFER" sticker, cart items, gift line, recommendations, coupon cards, Offers & Coupons view, lime checkout bar, price breakup, empty state, mobile spacing |

## 5. Set up the milestones (progress bar)

The milestone card shows the progress-bar tiers, and its top line is the next tier's **Top message**.

**a. Free delivery at ₹999 (visual milestone).** Go to cartx → **Settings → Progress bar** and add a milestone:

| Field | Value |
|---|---|
| Trigger type | Price |
| Threshold | 999 *(placeholder)* |
| Label | Spend ₹999 |
| Sub label | Free Delivery |

This milestone is only a visual. The real free shipping must be set in Shopify → **Settings → Shipping and delivery**, with the same threshold. Keep the two in sync.

**b. Arm Cuff at ₹1999 (gift offer).** Go to cartx → **Promotions → Create → Offer**:

| Field | Value |
|---|---|
| Trigger | Cart total (price) ≥ 1999 *(placeholder)* |
| Reward type | Auto-add free gift |
| Gift | Arm Cuff variant *(placeholder product)* |
| Add mode | Auto add to cart |
| Show on progress bar | On |
| Bar label | Spend ₹1999 |
| Bar sub label | Arm Cuff |
| Top message | Add more products to get a free Arm Cuff *(placeholder)* |

**c. Buy 3 @ ₹1099 (volume offer).** Go to **Promotions → Create → Offer**:

| Field | Value |
|---|---|
| Reward type | Volume discount |
| Discount mode | Fixed total |
| Tier | Quantity 3 → 1099 *(placeholder)* |
| Products | Collection or products *(client to confirm)* |
| Show on progress bar | On |
| Top message | Add more products to avail Buy 3 @1099 |

Under **Settings → Progress bar**, drag the tiers into the order the client wants on the bar.

## 6. "Pick one free gift" cards

Go to **Promotions → Create → Offer**:

| Field | Value |
|---|---|
| Reward type | Auto-add free gift |
| Add mode | **Show offer card only** (the shopper picks from cards) |
| Gift variants | The free-gift options, e.g. Fine Like Wine *(placeholder)* |
| Quantity per variant | 1 |
| Trigger | The cart rule that unlocks the pick *(client to confirm)* |

Use an **Offer**, not a **Claim Gift**. The Claim Gift button always reads "Claim gift", and the text can't be changed today. The Offer card button reads "Add", as in Figma.

The drawer shows these as the "Pick one free gift" cards. The chosen gift appears as a pink gift line with "FREE" and no quantity controls.

## 7. Coupons

Create the discount codes in Shopify first (**Discounts**). Then for each code, go to cartx → **Promotions → Create → Coupon**:

| Field | Value |
|---|---|
| Shopify discount | ENDYEARSALE *(placeholder)* |
| Accent label | 20% OFF |
| Savings text | You can save ₹130 on this order |
| Min. cart total / quantity | As per the code's minimum |

Coupons appear as cards under "Apply Coupon" in the cart and in the **Offers & Coupons** view (View All). The cart only shows coupons it already qualifies for. See the feasibility doc for the "Add ₹X more" version.

## 8. Upsells ("You may also like" / "Recommended for you")

Go to cartx → **Upsells**:

1. **Settings**: turn upsells **on**. Set Mode to *Cart-based*, with fallback to the default list. Set Max visible to 4.
2. **Default products**: add the best sellers, e.g. Black Kat Energy (20 ML) *(placeholder)*. These show on an empty cart and when no rule matches.
3. **Product rules** *(optional)*: map each product to its recommendations, or bulk-load them from **Import / export** with the sample CSV.

## 9. QA on the test theme

Open the test theme preview and check each Figma screen at desktop width and on a phone (390 px). Reference screenshots are in `.buildspace/artifacts/freed-cart/screenshots/`.

| # | Check | Expected |
|---|---|---|
| 1 | Add one product | Drawer opens. "CART (1)", announcement bar, milestone card with sticker, cart item, "You may also like", coupons, lime checkout bar. |
| 2 | Cross ₹999 | First milestone turns pink with a blue check, and confetti plays |
| 3 | Gift picker | "Pick one free gift" cards. Add one: a pink gift line appears with FREE and no quantity buttons. |
| 4 | Coupon | Tap Apply on a card: the pink applied chip shows. Remove clears it. |
| 5 | View All | The Offers & Coupons view slides in. Back returns to the cart. |
| 6 | View Price Breakup | Bottom sheet with Total MRP, Discount on MRP, Coupon Discount, Shipping Fee, Total |
| 7 | Empty the cart | Cart illustration, "YOUR CART IS EMPTY", "Recommended for you" cards |
| 8 | Checkout | Goes to checkout with discounts applied |
| 9 | Live theme | The live store still shows the theme's own cart (cartx embed off) |

## 10. Go live (after client sign-off)

1. In the cartx app, select the **live** theme. Export its backup, then **Import** the final settings from the test theme. Use Export on the test theme to get that file, so every tweak made during QA comes along.
2. Recreate or check the promotions, coupons and upsells for the live theme. These settings are saved per theme.
3. Turn the cartx embed **on** in the live theme. Then check one real add-to-cart and the checkout.

**To roll back:** turn the cartx embed off in the live theme. The theme's own cart comes back straight away.
