# FREED cart drawer: cartx setup guide

How to set up the FREED cart design (Figma "FREED / CartX") on FREED's store using cartx. It's settings plus one import file, with no code changes. The import uses the drawer design options released on 29 Oct 2026, so the store's cartx must be on that release. What cartx can't do yet is listed in `freed-cart-feasibility.md`.

**Files in `docs/freed/`**

| File | What it is |
|---|---|
| `freed-cart-settings.json` | Customize Cart import file: colours, fonts, text, layout, coupon and milestone options, progress bar icons, and the FREED Custom CSS |
| `freed-cart-custom.css` | The same Custom CSS as a separate file, for review and edits |
| `assets/icons/coupon-starburst.svg`, `coupon-starburst-locked.svg` | Coupon badge starburst from Figma (its outline is already in the Custom CSS) |
| `assets/special-offer-sticker.png` | "SPECIAL OFFER" sticker, full size, for reference only. A small copy is already embedded in the Custom CSS. |
| `assets/milestones/gift-icon.svg` | Milestone icon, not yet reached (dark gift, from Figma) |
| `assets/milestones/gift-icon-reached.svg` | Milestone icon, reached (white gift on the pink dot, from Figma) |
| `assets/milestones/tick-badge.svg` | Blue tick on a reached milestone (already inside the Custom CSS) |
| `assets/milestones/truck-icon.svg`, `arm-cuff-icon.svg` | Reward icons from the reward-first design, for reference only. cartx uses the two shared milestone icons above for every milestone. |
| `assets/empty-cart.svg` | Empty-cart illustration (already in the import file; kept here for reference) |

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

In cartx → **Customize Cart → Advanced → Backup & restore** → **Export settings**. Keep the downloaded `cartx-drawer-settings.json`. Importing that file restores the previous state.

## 3. Images

Nothing needs uploading to Shopify Files:

- The "SPECIAL OFFER" sticker is embedded in the Custom CSS, so the import brings it in.
- The empty-cart illustration is in the import file too.

## 4. Prepare and import the settings file

1. In cartx → **Customize Cart → Advanced → Backup & restore** → **Import settings** → choose `freed-cart-settings.json`.
2. The toast says "Settings imported — save to apply". Click **Save** in the save bar.
That's the whole drawer: the import carries the colours, fonts, text, layout, milestone icons, empty-cart illustration and Custom CSS. To double-check, **Features → Progress bar** shows the dark and white gift icons, and **Content → Empty cart** shows the cart illustration.

**What the import sets**

| Area | Value |
|---|---|
| Fonts | Google Fonts URL with Montserrat (base), Anton (heading font, uppercase, 2 px spacing) and Roboto (product font). Design → Typography. |
| Colours | Text `#18181B`, secondary `#52525C`, borders `#D4D4D8`, pink `#F238A7`, lime `#CFF665` (ADD buttons, checkout bar), checkout `#000000`, savings strip `#333333`; success `#016630`, warning `#E20019`, muted `#52525C` |
| Drawer | 600 px wide on desktop, 32 px side padding (16 px on mobile), full width on mobile |
| Header | Centred "CART (2)" |
| Cart items | Size pill above the name, REMOVE text link, quantity "01", discount "50%" without icon, pink highlighted gift line, gift prices on the gift cards |
| Coupons | "Apply Coupon ›" row, list layout, code field in Offers & Coupons, coupons not yet reachable shown with "Add ₹X more", applied coupon as a card with "You saved ₹X" |
| Upsells | "You may also like" (empty cart: "Recommended for you"), ADD over the image, discount %, shown on the empty cart; placed before the coupons |
| Milestone card | Card style with a white-to-lime gradient and lime border, pink fill and reached dots, track `#FBFBFB`, FREED gift icons |
| Text | Title "Cart", checkout "Check out", "View Price Breakup", savings "You are saving {amount} on this order", gift heading "Pick one free gift", shipping rules *(placeholder)*, empty title with no subtitle or button |
| Announcement bar | "Free Shipping on All Orders ₹399 & Above" *(placeholder)*, black with white text |
| Sections | Progress bar, claim gifts, offer cards, coupons, upsells on; bottom ribbon off |
| Payment icons | On (GPay, PhonePe, Paytm); full-width checkout button on a lime bar |
| Custom CSS | FREED's type scale and spacing, the "SPECIAL OFFER" sticker, blue tick on reached milestones, gift icon on the gift line, starburst coupon badges, card shapes, mobile sizes |

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

Use an **Offer** with "Show offer card only". (A Claim Gift also works now: its button text is set to "Add" by the import.)

The drawer shows these as the "Pick one free gift" cards with "~~₹999~~ Free". The price is stored when the offer is saved, so save the offer once after creating it. The chosen gift appears as a pink gift line with "FREE" and no quantity controls.

## 7. Coupons

Create the discount codes in Shopify first (**Discounts**). Then for each code, go to cartx → **Promotions → Create → Coupon**:

| Field | Value |
|---|---|
| Shopify discount | ENDYEARSALE *(placeholder)* |
| Accent label | 20% OFF |
| Savings text | You can save ₹130 on this order |
| Min. cart total / quantity | As per the code's minimum |

The cart shows the "Apply Coupon ›" row and the coupon cards. Coupons the cart doesn't qualify for yet show greyed out with "Add ₹X more to apply this coupon", closest first. An applied code shows as a pink card with REMOVE and "You saved ₹X with this coupon". Tapping the row opens **Offers & Coupons**, which has the code field.

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
| 3 | Gift picker | "Pick one free gift" cards with "~~₹X~~ Free". Add one: a pink gift line appears with FREE and no quantity buttons. |
| 4 | Coupon | Apply a code: pink card with REMOVE and "You saved ₹X with this coupon". Remove clears it. A coupon with a higher minimum shows "Add ₹X more". |
| 5 | Apply Coupon › | The Offers & Coupons view slides in with the code field. Back returns to the cart. |
| 6 | View Price Breakup | Bottom sheet with Total MRP, Discount on MRP, Coupon Discount, Shipping Fee with info icon and the shipping-rules box, Total |
| 7 | Empty the cart | Cart illustration, "YOUR CART IS EMPTY", "Recommended for you" cards |
| 8 | Checkout | Goes to checkout with discounts applied |
| 9 | Live theme | The live store still shows the theme's own cart (cartx embed off) |

## 10. Go live (after client sign-off)

1. In the cartx app, select the **live** theme. Export its backup, then **Import** the final settings from the test theme. Use Export on the test theme to get that file, so every tweak made during QA comes along.
2. Recreate or check the promotions, coupons and upsells for the live theme. These settings are saved per theme.
3. Turn the cartx embed **on** in the live theme. Then check one real add-to-cart and the checkout.

**To roll back:** turn the cartx embed off in the live theme. The theme's own cart comes back straight away.
