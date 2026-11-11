# Kaya cart drawer: cartx setup guide

How to set up the Kaya cart design (Figma "Kaya", frames "Cart" 1–3, 360 px mobile) on the client's store with cartx. It's settings plus one import file, with no code changes. The import is built for the **next cartx release** (branch `feat/drawer-design-options`, in testing, not live yet): it turns on Clear All, the Freebies section and the struck gift price. Test it on the dev preview first (§9). Don't import it on a store until that release is deployed; the previous kit for the current release is in git at commit `7925597`. What cartx can't do yet is listed in `kaya-cart-feasibility.md`.

**Files in `docs/kaya/`**

| File | What it is |
|---|---|
| `kaya-cart-settings.json` | Customize Cart import file: colours, Montserrat and Poppins fonts, texts, cart lines, freebies block, coupon pill, recommendation cards, milestone colours, and the Custom CSS |
| `kaya-cart-custom.css` | The same Custom CSS as a separate file, for review. Its icons are inline SVG, so nothing needs uploading |
| `kaya-cart-feasibility.md` / `.docx` | What ships, what differs, what needs development, client questions |
| `assets/icons/*.svg` | The Figma icons embedded in the Custom CSS (cart, close, line bin, freebies, "+", coupon tag and chevron, checkout chevron, trust icons), for reference. `clear-all-trash.svg` is the Clear All icon reference (the drawer uses its own bin icon) |

**Values marked *(placeholder)*** come from the Figma mock-up. Replace them with the client's real offers, products and copy.

---

## 1. Create a test theme and keep cartx off the live theme

cartx saves its settings **per theme**, and the import replaces all drawer settings of the selected theme.

1. **Online Store → Themes**: on the live theme, **⋯ → Duplicate**, and rename the copy `Kaya – cartx test`.
2. Live theme: **Customize → App embeds**. Make sure **cartx** is **off**.
3. Test theme: **Customize → App embeds** → turn on **cartx Drawer** and **cartx Promotions** → **Save**.
4. In cartx, select **`Kaya – cartx test`** with the theme switcher, and check it's selected before every step below.
5. Test with the test theme's **Preview** link.

## 2. Back up the current drawer settings

cartx → **Customize Cart → Advanced → Backup & restore → Export settings**. Keep the file; importing it restores the old drawer.

## 3. Import the settings

1. **Customize Cart → Advanced → Backup & restore → Import settings** → choose `kaya-cart-settings.json`.
2. The toast says "Settings imported — save to apply". Click **Save**.
3. **Money format:** the design shows `₹1,890`. The drawer follows the store's money format (Shopify **Settings → General → Store currency → Change currency formatting**) and adds the thousands comma itself, so `₹{{amount_no_decimals}}` shows `₹1,890`. If the store format has decimals (`₹{{amount}}`), set **Customize Cart → Design → Cart items → Price decimals → Hide .00** so whole amounts show without `.00`.

**What the import sets**

| Area | Value |
|---|---|
| Fonts | Montserrat (body) and Poppins (titles, coupon and empty text) from Google Fonts |
| Colours | Text `#262626`, secondary `#62636C`, border `#D8D9E0`, teal accent `#00A08C`, red `#D13415`, savings strip `#CCF3EB` / `#044F62`, freebies block `#DCFFFB` |
| Drawer | 420 px on desktop, full width on mobile |
| Header | "My Cart" with "2 Products" below and a cart icon (Custom CSS); "0 Products" on an empty cart; mint "Clear All" pill that asks before clearing |
| Cart items | All lines in one rounded card with dividers, 80 px images, compare-at price, stepper, grey bin; variant hidden |
| Freebies | Gift lines in their own mint "Freebies For you" section: struck original price + teal "Free" pill, "1/3 Unlocked" counter, locked rows "₹X more to Unlock" |
| Milestones | Thin `#D8D9E0` track, `#00A08C` fill and reached dots, white locked dots with a grey ring, amounts above the track, no progress message |
| Coupons | Pill row "View all coupons ›" opening Offers & Coupons; applied code reads "₹200 saved with 'CODE'" with "Remove" |
| Recommendations | "Recommended For you", horizontal 240 px cards, "+" on the image, compare-at price and "52%", also on the empty cart |
| Footer | "You are saving {amount} on this product", "Total:", "View Price Breakup", black "Check out" with payment icons, trust message "Easy 7-Day Returns" |
| Empty cart | "Cart is Empty", "Add products to your cart to avail Offers and Freebies.", black "Shop Products" → `/collections/all` |
| Sections | Progress bar, claim gifts, coupons, recommendations on; offer cards and bottom ribbon off; confetti off |

**Text you may need to change**
- Savings wording ("on this product" vs "on this order", client question): Content → savings label
- "Easy 7-Day Returns": Content → checkout trust message
- **"Freebies For you"**, the counter and the locked-row text are text settings (Customize Cart → Content). **"Secure Checkout"** (the second trust item) and the **"Products"** word in the header are in the Custom CSS; change them there in both the CSS and the JSON
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

**c. Both at ₹999 *(placeholder)*.** One offer with **both** gifts (wipes and gel, quantity 1 each), threshold 999, label `Free Soothing Cleansing Gel + Wipes` / `₹999`.

Under **Settings → Progress bar**, drag the tiers into the order ₹499, ₹699, ₹999.

**d. Highest milestone only.** Under **Settings → Behavior → Gift milestones**, choose **Highest only**. The shopper then gets only the gifts of the highest milestone reached: ₹499 → wipes, ₹699 → gel only (the wipes are removed), ₹999 → one wipe + one gel. If the cart drops back below a milestone, the gifts step back down. With the default **Add up**, every milestone passed keeps its gifts, so ₹999 would give 2 wipes + 2 gel. Claim gifts are not affected. This setting is saved per theme and needs the gift milestones release (§10).

Gifts in the cart appear in their own "Freebies For you" section with the struck original price and the "Free" pill, the "1/3 Unlocked" counter, and a locked row ("₹302 more to Unlock") for every gift not reached yet. The import sets this up (**Customize Cart → Features → Cart items**: Free gift lines **Own section**, Show locked gifts **on**, **All tiers**). The counter counts the gift offers on the milestone bar, so each tier needs its gift offer.

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

Check on a phone (or a 360 px window), and on desktop at the 420 px drawer, against the three Figma screens in `.buildspace/artifacts/kaya-cart/screenshots/`.

| # | Check | Expected |
|---|---|---|
| 1 | Add one product | Cart icon, "My Cart" over "1 Products" (known wording gap), mint "Clear All" pill, milestone bar with amounts above, the cart card, "Recommended For you", coupon pill, savings strip, "Total:", black Check out, trust row |
| 2 | Add a second product | "2 Products"; both lines in one card with a divider |
| 3 | Cross ₹499 | First dot turns teal with a check; the gift appears in the mint "Freebies For you" section as ~~₹440~~ "Free"; the counter reads "1/3 Unlocked" and the ₹699 and ₹999 gifts show as locked rows with "₹X more to Unlock" |
| 3a | Change quantity around a threshold | Counter, locked rows and their amounts update; crossing ₹699 moves that gift from locked to the cart |
| 3b | Gift milestones, Highest only (§4 d) | ₹499: wipes only. ₹699: gel only, wipes gone. ₹999: one wipe + one gel. Lower the cart below ₹999: back to gel only |
| 4 | Quantity and bin | Stepper updates the line; the bin removes it |
| 5 | View all coupons › | Offers & Coupons with the code field and "All Coupons"; apply FLAT200; the pill reads "₹200 saved with 'FLAT200'"; Remove clears it |
| 6 | View Price Breakup | Price breakup sheet |
| 7 | Recommendation "+" | Adds the product |
| 7a | Clear All | Asks to confirm; OK empties the cart, gifts included, and shows the empty cart; Cancel keeps everything |
| 8 | Empty the cart | "0 Products", "Cart is Empty", two-line text, "Shop Products", recommendations |
| 9 | Checkout | Goes to checkout with discounts applied |
| 10 | Live theme | Still shows the theme's own cart (embed off) |

## 8. Go live (after client sign-off)

1. Select the **live** theme in cartx, export its backup, then import the final settings exported from the test theme (so QA tweaks come along).
2. Recreate or check the milestones, offers, coupons and recommendations for the live theme, and set **Settings → Behavior → Gift milestones: Highest only** (§4 d). These are saved per theme.
3. Turn the cartx embed **on** in the live theme; check one add-to-cart and the checkout. Turn on **both** cartx app embeds: **cartx Drawer** and **cartx Promotions**. Without Promotions the gift and claim-gift discounts never apply: gifts stay at full price and show no struck price.

**Roll back:** turn the cartx embed off on the live theme. The theme's own cart comes back straight away.

## 9. Test the new features (dev preview, before the release)

Clear All, the Freebies section with counter and locked rows, the struck gift price and the price format fix are built on branch `feat/drawer-design-options` and not released yet. Test them on the dev store first:

1. Run the preview from the feature worktree:
   ```
   cd /Users/vishvamjoshi0310/Documents/shopify-projects/cartx-feat
   npm run dev        # shopify app dev → pick devx-dev
   ```
   ⚠️ `automatically_update_urls_on_dev` is on and this is the production app, so while `app dev` runs the app URLs point at the tunnel for every store. Run `shopify app deploy` afterwards to restore them.
2. On `devx-dev`, import `kaya-cart-settings.json` (§3) on a test theme and set up the three gift milestones (§4).
3. Check:

| # | Feature | Setting (Customize Cart) | Expected |
|---|---|---|---|
| 1 | Clear All | Header → Show Clear All **on**, Ask before clearing **on** | Mint pill in the header; confirm, then empty cart with the empty-cart screen. Turn Ask off: clears straight away |
| 2 | Freebies section | Features → Cart items → Free gift lines **Own section** | Gift lines move out of the cart list into "Freebies For you" with the "n/N Unlocked" counter |
| 3 | Locked rows | Show locked gifts **on**, **All tiers** / **Next tier only** | All unreached gifts as "₹X more to Unlock" rows / only the next one; amounts update as the cart changes |
| 4 | Back to inline | Free gift lines **In the cart list** | Gift lines go back into the normal cart list, no counter |
| 5 | Struck gift price | Cart items → Show the original price on free gift lines **on** | ~~₹440~~ before "Free"; off shows only "Free" |
| 6 | Price format | Design → Cart items → Price decimals | Prices with thousands comma (`₹1,890`); Hide .00 drops `.00` on whole amounts |
| 7 | Admin preview | — | The Customize Cart preview follows each setting above |

When the release is deployed, these features are live for every store, and this kit can be imported on the Kaya store.

## 10. Test gift milestones, Highest only (dev preview, before the release)

The **Gift milestones** setting (§4 d) is built on branch `feat/gift-milestones-highest-only` and not released yet. It changes the server and the drawer, so it needs both the Fly release and `shopify app deploy`.

1. Run the preview from the feature worktree, as in §9 (`cd /Users/vishvamjoshi0310/Documents/shopify-projects/cartx-feat`, `npm run dev`, pick devx-dev; run `shopify app deploy` afterwards to restore the app URLs).
2. On `devx-dev`, set up the three offers as in §4 a–c, and set **Settings → Behavior → Gift milestones: Highest only**.
3. Check:

| # | Cart total | Expected gifts in the cart |
|---|---|---|
| 1 | Below ₹499 | None |
| 2 | ₹499–₹698 | Wipes |
| 3 | ₹699–₹998 | Gel only; the wipes line is removed |
| 4 | ₹999 and above | One wipe + one gel (no extra copies) |
| 5 | Back down to ₹699–₹998 | Gel only |
| 6 | Gift milestones: **Add up** | Gifts add up again (₹999 → 2 wipes + 2 gel); this is the default for other stores |
| 7 | Checkout at each step | The gifts in the cart are free; nothing else is |
| 8 | Freebies section | Counter "n/3 Unlocked" and the locked rows still follow the milestones reached |

