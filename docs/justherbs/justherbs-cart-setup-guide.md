# Just Herbs cart drawer: cartx setup guide

How to set up the Just Herbs cart design (Figma "Just Herbs", section "Cart") on the client's store with the **live** cartx app. It's settings plus one import file, with no code changes. What the app can't do yet is listed in `justherbs-cart-feasibility.md`.

**Files in `docs/justherbs/`**

| File | What it is |
|---|---|
| `justherbs-cart-settings.json` | Customize Cart import file: colours, Figtree font, text, layout, sections, milestone icons and the Custom CSS |
| `justherbs-cart-custom.css` | The same Custom CSS as a separate file, for review. Icons appear as `GIFT_BADGE`, `COUPON_TICKET` and `DELIVERY_TRUCK` placeholders; the JSON has them embedded. |
| `assets/milestones/milestone-reached.svg`, `milestone-locked.svg` | Gift-box milestone icons (already in the import) |
| `assets/icons/gift-line-badge.svg`, `coupon-ticket.svg`, `delivery-truck.svg` | Icons embedded in the Custom CSS |
| `assets/icons/check.svg` | "You saved" check from the design (for later; see feasibility §4 #4) |

**Values marked *(placeholder)*** come from the Figma mock-up. Replace them with the client's real offers, products and copy.

---

## 1. Create a test theme and keep cartx off the live theme

cartx saves its settings **per theme**, and the import replaces all drawer settings of the selected theme.

1. **Online Store → Themes**: on the live theme, **⋯ → Duplicate**, and rename the copy `Just Herbs – cartx test`.
2. Live theme: **Customize → App embeds**. Make sure **cartx** is **off**.
3. Test theme: **Customize → App embeds** → turn **cartx** on → **Save**.
4. In cartx, select **`Just Herbs – cartx test`** with the theme switcher, and check it's selected before every step below.
5. Test with the test theme's **Preview** link.

## 2. Back up the current drawer settings

cartx → **Customize Cart → Advanced → Backup & restore → Export settings**. Keep the file; importing it restores the old drawer.

## 3. Import the settings

1. **Customize Cart → Advanced → Backup & restore → Import settings** → choose `justherbs-cart-settings.json`.
2. The toast says "Settings imported — save to apply". Click **Save**.
3. **Features → Progress bar**: check that **Milestone icon** shows the grey gift box and **Completed milestone icon** the colour one. If either is empty, upload `assets/milestones/milestone-locked.svg` and `milestone-reached.svg`, then **Save**.

**What the import sets**

| Area | Value |
|---|---|
| Font | Figtree from Google Fonts (the milestones use Haskoy in Figma; it isn't on Google Fonts) |
| Colours | Checkout `#286E44`, buttons and fill `#358C58`, mint `#EBF3EE`, text `#1A1A1A`, secondary `#666666` |
| Drawer | 420 px on desktop, full width on mobile |
| Text | "Cart", "Checkout", savings "You are saving {amount} on this order", no trust message |
| Milestones | Thin track restyled to the design; Figma gift-box icons |
| Recommendations | Heading "Special price" (centred), button "Add", horizontal cards, also on the empty cart |
| Sections | Progress bar, coupons, recommendations on; bottom ribbon off |
| Payment icons | On (GPay, PhonePe, Paytm) |
| Custom CSS | Header badge, milestone band, item cards, free-gift line, coupon row and ticket card, pink "Special price" block with the delivery line, savings strip, green checkout with "Extra 5% OFF on UPI", Offers & Coupons view, price breakup with the shipping-rules box |

**Fixed text in the Custom CSS.** These lines are part of the CSS, so edit `justherbs-cart-custom.css` (or Customize Cart → Advanced → Custom CSS) to change them:
- "Order now and get it delivered by tomorrow"
- "Extra 5% OFF on UPI"
- "View details", "Free Gift", "All Coupons", "Remove"
- the shipping rules in the price breakup *(placeholder)*

## 4. Milestones

The band shows the progress-bar tiers. Each tier's **label** is the small line and its **sub label** the threshold. Its top line is the next tier's **Top message**.

**a. Extra 10% off at ₹499 *(placeholder)*.** cartx milestones show the reward; the discount itself comes from Shopify.
- Shopify → **Discounts → Create discount → Amount off order**: 10% off, minimum purchase ₹499, automatic.
- cartx → **Settings → Progress bar** → add a milestone: Price, threshold 499, label `Extra 10% Off`, sub label `₹499`.

**b. Get 1 Freebie at ₹599 *(placeholder)*.** cartx → **Promotions → Create → Offer**:

| Field | Value |
|---|---|
| Trigger | Cart total (price) ≥ 599 |
| Reward type | Auto-add free gift |
| Gift | The free product *(client to confirm)* |
| Add mode | Auto add to cart |
| Show on progress bar | On |
| Bar label / sub label | `Get 1 Freebie` / `₹599+` |
| Top message | e.g. `Add items worth ₹96 more & get a free gift` |

**c. Get 2 Freebies at ₹799 *(placeholder)*.** The same as (b), with threshold 799, a second gift, and label `Get 2 Freebies` / `₹799+`.

Under **Settings → Progress bar**, drag the tiers into the order ₹499, ₹599, ₹799.

The gift appears as the mint "Free Gift" line with the gift sticker.

## 5. Coupons

Create the codes in Shopify (**Discounts**) first. Then for each code, cartx → **Promotions → Create → Coupon**:

| Field | Value |
|---|---|
| Shopify discount | ENDYEARSALE *(placeholder)* |
| Accent label | `20% OFF` |
| Savings text | `You can save ₹130 on this order` |
| Min. cart total / quantity | As per the code's minimum |

The cart shows the code input with "View All". Suggested coupons appear in **Offers & Coupons**; coupons the cart doesn't qualify for yet stay hidden there (feasibility §4 #3).

## 6. Recommendations ("Special price")

cartx → **Upsells**:
1. **Settings:** upsells **on**; mode as the client prefers (default list or cart-based); max visible 4 or more, since the block scrolls sideways.
2. **Default products:** the products for "Special price", e.g. Plant Salicylic Acid Foaming Face Wash *(placeholder)*.

## 7. QA on the test theme

Check on a phone (or a 390–409 px window) against the five Figma screens in `.buildspace/artifacts/justherbs-cart/screenshots/`.

| # | Check | Expected |
|---|---|---|
| 1 | Add one product | "Cart" with red badge, milestone band, item card, coupon row, pink "Special price" block, savings strip, green Checkout |
| 2 | Cross ₹599 | Second gift box turns colour; the mint "Free Gift" line appears with the sticker |
| 3 | Apply a code | Ticket card with the code and "Remove"; Remove clears it |
| 4 | View All | Offers & Coupons with "All Coupons"; the back arrow returns to the cart |
| 5 | View details | Price breakup sheet with the shipping-rules box |
| 6 | Recommendation ADD | Adds the product |
| 7 | Checkout | Goes to checkout with discounts applied |
| 8 | Live theme | Still shows the theme's own cart (embed off) |

## 8. Fonts

Figtree is loaded from Google Fonts by the import. If the client provides Haskoy (licence + `.woff2`), it can be added later in the Custom CSS for the milestone band.

## 9. Go live (after client sign-off)

1. Select the **live** theme in cartx, export its backup, then import the final settings exported from the test theme (so QA tweaks come along).
2. Recreate or check the milestones, offers, coupons and recommendations for the live theme. These are saved per theme.
3. Turn the cartx embed **on** in the live theme; check one add-to-cart and the checkout.

**Roll back:** turn the cartx embed off on the live theme. The theme's own cart comes back straight away.
