# Kaya cart drawer: cartx setup guide

How to set up the Kaya cart design (Figma "Kaya", frames "Cart" 1–3, 360 px mobile) on the client's store with cartx. It's settings plus one import file, with no code changes. The import is built for the current released cartx drawer (`main`, PR #40), so the store's cartx must be on that release. What cartx can't do yet is listed in `kaya-cart-feasibility.md`.

**Files in `docs/kaya/`**

| File | What it is |
|---|---|
| `kaya-cart-settings.json` | Customize Cart import file: colours, Montserrat and Poppins fonts, texts, cart lines, freebies block, coupon pill, recommendation cards, milestone colours, and the Custom CSS |
| `kaya-cart-custom.css` | The same Custom CSS as a separate file, for review. Its icons are inline SVG, so nothing needs uploading |
| `kaya-cart-feasibility.md` / `.docx` | What ships, what differs, what needs development, client questions |
| `assets/icons/*.svg` | The Figma icons embedded in the Custom CSS (cart, close, line bin, freebies, "+", coupon tag and chevron, checkout chevron, trust icons), for reference. `clear-all-trash.svg` is for the future Clear All button |

**Values marked *(placeholder)*** come from the Figma mock-up. Replace them with the client's real offers, products and copy.

---

## 1. Create a test theme and keep cartx off the live theme

cartx saves its settings **per theme**, and the import replaces all drawer settings of the selected theme.

1. **Online Store → Themes**: on the live theme, **⋯ → Duplicate**, and rename the copy `Kaya – cartx test`.
2. Live theme: **Customize → App embeds**. Make sure **cartx** is **off**.
3. Test theme: **Customize → App embeds** → turn **cartx** on → **Save**.
4. In cartx, select **`Kaya – cartx test`** with the theme switcher, and check it's selected before every step below.
5. Test with the test theme's **Preview** link.

## 2. Back up the current drawer settings

cartx → **Customize Cart → Advanced → Backup & restore → Export settings**. Keep the file; importing it restores the old drawer.

## 3. Import the settings

1. **Customize Cart → Advanced → Backup & restore → Import settings** → choose `kaya-cart-settings.json`.
2. The toast says "Settings imported — save to apply". Click **Save**.
3. **Money format:** the design shows `₹1,890`. Prices follow the store's money format (Shopify **Settings → General → Store currency → Change currency formatting**). With `{{amount_no_decimals}}` prices show as `₹1890`; use `{{amount_no_decimals_with_comma_separator}}` only if that matches the rest of the store. Agree this with the client before changing it, since it changes prices across the theme.

**What the import sets**

| Area | Value |
|---|---|
| Fonts | Montserrat (body) and Poppins (titles, coupon and empty text) from Google Fonts |
| Colours | Text `#262626`, secondary `#62636C`, border `#D8D9E0`, teal accent `#00A08C`, red `#D13415`, savings strip `#CCF3EB` / `#044F62`, freebies block `#DCFFFB` |
| Drawer | 360 px on desktop, full width on mobile |
| Header | "My Cart" with "2 Products" below and a cart icon (Custom CSS); "0 Products" on an empty cart |
| Cart items | All lines in one rounded card with dividers, 80 px images, compare-at price, stepper, grey bin; variant hidden |
| Freebies | Gift lines below the cart card in a mint block headed "Freebies For you", with a teal "Free" pill |
| Milestones | Thin `#D8D9E0` track, `#00A08C` fill and reached dots, white locked dots with a grey ring, amounts above the track, no progress message |
| Coupons | Pill row "View all coupons ›" opening Offers & Coupons; applied code reads "₹200 saved with 'CODE'" with "Remove" |
| Recommendations | "Recommended For you", horizontal 240 px cards, "+" on the image, compare-at price and "52%", also on the empty cart |
| Footer | "You are saving {amount} on this product", "Total:", "View Price Breakup", black "Check out" with payment icons, trust message "Easy 7-Day Returns" |
| Empty cart | "Cart is Empty", "Add products to your cart to avail Offers and Freebies.", black "Shop Products" → `/collections/all` |
| Sections | Progress bar, claim gifts, coupons, recommendations on; offer cards and bottom ribbon off; confetti off |

**Text you may need to change**
- Savings wording ("on this product" vs "on this order", client question): Content → savings label
- "Easy 7-Day Returns": Content → checkout trust message
- **"Secure Checkout"** (the second trust item), **"Freebies For you"** and the **"Products"** word in the header are in the Custom CSS; change them there in both the CSS and the JSON
- "Shop Products" link: Content → continue shopping URL

## 4. Milestones

The bar shows the progress-bar tiers. Each tier's **sub label** is the amount shown **above** the track (the Custom CSS lifts it there), and its **label** is the reward below. The design has no progress message, so the Custom CSS hides it; **Top message** can stay empty.

**a. Free Wipes at ₹499 *(placeholder)*.** cartx → **Promotions → Create → Offer**:

| Field | Value |
|---|---|
| Trigger | Cart total (price) ≥ 499 |
| Reward type | Auto-add free gift |
| Gift | Wipes *(client to confirm)* |
| Add mode | Auto add to cart |
| Show on progress bar | On |
| Bar label / sub label | `Free Wipes` / `₹499` |

**b. Free Soothing Cleansing Gel at ₹699 *(placeholder)*.** The same as (a), with threshold 699, the gel as the gift, and label `Free Soothing Cleansing Gel` / `₹699`.

**c. Both at ₹999 *(placeholder)*.** Threshold 999, label `Free Soothing Cleansing Gel + Wipes` / `₹999`. How "both" is given (one offer with two gifts, or the ₹699 offer plus the wipes kept) depends on the client's answer in feasibility §5 #2.

Under **Settings → Progress bar**, drag the tiers into the order ₹499, ₹699, ₹999.

Gifts in the cart appear in the "Freebies For you" block with the "Free" pill. The "1/3 Unlocked" counter and the locked rows ("₹302 more to Unlock") need development (feasibility §4 #2).

## 5. Coupons

Create the codes in Shopify (**Discounts**) first, e.g. FLAT200 *(placeholder)*. Then for each code, cartx → **Promotions → Create → Coupon**:

| Field | Value |
|---|---|
| Shopify discount | FLAT200 *(placeholder)* |
| Accent label | e.g. `₹200 OFF` |
| Savings text | e.g. `You can save ₹200 on this order` |
| Min. cart total / quantity | As per the code's minimum |

The cart shows the "View all coupons ›" pill; tapping it opens **Offers & Coupons** with the code field and "All Coupons". An applied code shows in the pill as "₹200 saved with 'FLAT200'" with "Remove".

## 6. Recommendations ("Recommended For you")

cartx → **Upsells**:
1. **Settings:** upsells **on**; mode as the client prefers (default list or cart-based); max visible 4 or more, since the row scrolls sideways.
2. **Default products:** the products for "Recommended For you" *(client to confirm)*.

## 7. QA on the test theme

Check on a phone (or a 360 px window) against the three Figma screens in `.buildspace/artifacts/kaya-cart/screenshots/`.

| # | Check | Expected |
|---|---|---|
| 1 | Add one product | Cart icon, "My Cart" over "1 Products" (known wording gap), milestone bar with amounts above, the cart card, "Recommended For you", coupon pill, savings strip, "Total:", black Check out, trust row |
| 2 | Add a second product | "2 Products"; both lines in one card with a divider |
| 3 | Cross ₹499 | First dot turns teal with a check; the gift appears in the mint "Freebies For you" block with "Free" |
| 4 | Quantity and bin | Stepper updates the line; the bin removes it |
| 5 | View all coupons › | Offers & Coupons with the code field and "All Coupons"; apply FLAT200; the pill reads "₹200 saved with 'FLAT200'"; Remove clears it |
| 6 | View Price Breakup | Price breakup sheet |
| 7 | Recommendation "+" | Adds the product |
| 8 | Empty the cart | "0 Products", "Cart is Empty", two-line text, "Shop Products", recommendations |
| 9 | Checkout | Goes to checkout with discounts applied |
| 10 | Live theme | Still shows the theme's own cart (embed off) |

## 8. Go live (after client sign-off)

1. Select the **live** theme in cartx, export its backup, then import the final settings exported from the test theme (so QA tweaks come along).
2. Recreate or check the milestones, offers, coupons and recommendations for the live theme. These are saved per theme.
3. Turn the cartx embed **on** in the live theme; check one add-to-cart and the checkout.

**Roll back:** turn the cartx embed off on the live theme. The theme's own cart comes back straight away.
