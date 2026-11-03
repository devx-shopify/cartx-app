# Just Herbs cart drawer (v2): cartx setup guide

How to set up the new Just Herbs cart design (Figma, frames "Cart Freebie" 1–3, 390 px mobile) on the client's store with cartx. It's settings plus one import file, with no code changes. The import is built for the **next cartx release** (branch `feat/drawer-design-options`, in testing, not live yet): it turns on the "Special Price" row, option names in the variant line and the coupon icon. Test it on the dev preview first (§9). Don't import it on a store until that release is deployed; the previous kit for the current release is in git at commit `12189ab`. What cartx can't do yet is listed in `justherbs-cart-feasibility.md`.

**Files in `docs/justherbs/`**

| File | What it is |
|---|---|
| `justherbs-cart-settings.json` | Customize Cart import file: colours, Figtree font, texts, item rows, coupon row and icon, "Special Price" row, recommendation cards, milestone colours and icons, and the Custom CSS |
| `justherbs-cart-custom.css` | The same Custom CSS as a separate file, for review. Its icons are inline SVG, so nothing needs uploading |
| `justherbs-cart-feasibility.md` / `.docx` | What ships, what differs, what needs development, client questions |
| `assets/milestones/milestone-reached.svg`, `milestone-locked.svg` | Gift circle milestone icons (already in the import) |
| `assets/icons/*.svg` | The icons embedded in the Custom CSS (bag, coupon ticket, savings discount, checkout chevron, two trust icons), for reference |

**Values marked *(placeholder)*** come from the Figma mock-up. Replace them with the client's real offers, products and copy.

---

## 1. Create a test theme and keep cartx off the live theme

cartx saves its settings **per theme**, and the import replaces all drawer settings of the selected theme.

1. **Online Store → Themes**: on the live theme, **⋯ → Duplicate**, and rename the copy `Just Herbs – cartx test`.
2. Live theme: **Customize → App embeds**. Make sure **cartx** is **off**.
3. Test theme: **Customize → App embeds** → turn on **cartx Drawer** and **cartx Promotions** → **Save**.
4. In cartx, select **`Just Herbs – cartx test`** with the theme switcher, and check it's selected before every step below.
5. Test with the test theme's **Preview** link.

## 2. Back up the current drawer settings

cartx → **Customize Cart → Advanced → Backup & restore → Export settings**. Keep the file; importing it restores the old drawer.

## 3. Import the settings

1. **Customize Cart → Advanced → Backup & restore → Import settings** → choose `justherbs-cart-settings.json`.
2. The toast says "Settings imported — save to apply". Click **Save**.
3. **Features → Progress bar**: check that **Milestone icon** shows the grey gift circle and **Completed milestone icon** the green one. If either is empty, upload `assets/milestones/milestone-locked.svg` and `milestone-reached.svg`, then **Save**.

**What the import sets**

| Area | Value |
|---|---|
| Font | Figtree from Google Fonts |
| Colours | Text `#1A1A1A`, secondary `#666666`, accent `#358C58`, mint `#E3F5E8`, "+" buttons `#79473B`, savings strip `#DFFFEC` / `#3A7E55`, danger `#CC3434` |
| Drawer | 390 px on desktop, full width on mobile, 16 px side padding |
| Header | "Cart" with the count badge (brown `#B57363` and bag icon from the Custom CSS) |
| Cart items | Divider rows, large rounded images, compare-at price, "{pct}% Off" pill, bordered stepper, "REMOVE" as text, variant as a label with option names ("Color: 03 Honey Dew") |
| Free gift line | "Free Gift" pill, no price |
| Milestones | 6 px `#D9D9D9` track (track thickness Normal), green gradient fill (Custom CSS), label colour `#1C1B17`, Figma gift circle icons |
| Coupons | "Coupons / Apply now and save extra! ›" row opening Offers & Coupons, code field, "All Coupons", locked coupons with "Add ₹X more", applied code as a chip, default coupon icon when a coupon has no Accent label |
| Special Price | Special Offer row on, heading "Special Price", Compact cards, above "Recommended For you", off on the empty cart. **Collection blank**: pick it in §6 |
| Recommendations | "Recommended For you", vertical cards with "+" below, discount %, compare-at price, also on the empty cart |
| Footer | "You are saving {amount} on this product", "Total:", "View Price Breakup", full-width black Checkout with "Extra 5% OFF on UPI" and payment icons, trust message "Easy 7-Day Returns" |
| Empty cart | "Cart is Empty", "Add products to your cart to avail Offers and Freebies.", "Shop Products" → `/collections/all` |
| Price breakup | "Discount On MRP", shipping rules *(placeholder)* |
| Sections | Progress bar, claim gifts, coupons, Special Offer, recommendations on; offer cards and bottom ribbon off |
| Custom CSS | Figtree type scale, header bag icon and badge, milestone band, divider item rows, recommendation cards, coupon row, footer layout, "Total:" label, trust row |

**Text you may need to change**
- "Extra 5% OFF on UPI": Content → Buttons & labels → Cart items → Small line in the checkout button
- "Apply now and save extra!": Content → Buttons & labels → Coupons → Second line on the coupon row
- Savings wording ("on this product" vs "on this order", client question): Content → savings label
- "Easy 7-Day Returns": Content → checkout trust message
- **"Secure Checkout"** (the second trust item) is in the Custom CSS (`.cartmax-footer-trust::after`); change it there in both the CSS and the JSON
- "Shop Products" link: Content → continue shopping URL
- Shipping rules: Price breakup → Shipping rules *(placeholder)*

## 4. Milestones

The band shows the progress-bar tiers spaced evenly along the track, so any number of milestones works (the last one sits at the end). Each tier's **sub label** is the "On ₹X+" line above and its **label** the reward below. The message above the band is the next tier's **Top message**.

**a. Extra 10% Off at ₹499 *(placeholder)*.** cartx milestones show the reward; the discount itself comes from Shopify.
- Shopify → **Discounts → Create discount → Amount off order**: 10% off, minimum purchase ₹499, automatic.
- cartx → **Settings → Progress bar** → add a milestone: Price, threshold 499, label `Extra 10% Off`, sub label `On ₹499+`, top message `Add **[[ price ]] more** & get **an extra 10% off**`.

**b. Get 1 Freebie at ₹599 *(placeholder)*.** cartx → **Promotions → Create → Offer**:

| Field | Value |
|---|---|
| Trigger | Cart total (price) ≥ 599 |
| Reward type | Auto-add free gift |
| Gift | The free product *(client to confirm)* |
| Add mode | Auto add to cart |
| Show on progress bar | On |
| Bar label / sub label | `Get 1 Freebie` / `On ₹599+` |
| Top message | `Add **[[ price ]] more** to get **1 freebie**`. `[[ price ]]` becomes the amount still needed, with the ₹ sign already included, so don't type ₹ before it. Text between `**` shows in bold |

**c. Get 2 Freebie at ₹799 *(placeholder)*.** The same as (b), with threshold 799, a second gift, and label `Get 2 Freebie` / `On ₹799+`.

Under **Settings → Progress bar**, drag the tiers into the order ₹499, ₹599, ₹799.

The gift appears as a row with the green "Free Gift" pill and no REMOVE.

## 5. Coupons

Create the codes in Shopify (**Discounts**) first. Then for each code, cartx → **Promotions → Create → Coupon**:

| Field | Value |
|---|---|
| Shopify discount | The client's code *(placeholder)* |
| Accent label | e.g. `20% OFF`, shown in the coupon card strip. Without it the strip shows the coupon icon (Customize Cart → Coupons → Coupon icon: Default / None / Custom SVG) |
| Savings text | e.g. `You can save ₹130 on this order` |
| Min. cart total / quantity | As per the code's minimum |

The cart shows the single "Coupons ›" row; tapping it opens **Offers & Coupons** with the code field and "All Coupons". Coupons the cart doesn't qualify for yet show "Add ₹X more to apply this coupon".

## 6. Recommendations ("Special Price" and "Recommended For you")

cartx → **Upsells**:
1. **Settings:** upsells **on**; mode as the client prefers (default list or cart-based); max visible 4 or more, since the row scrolls sideways.
2. **Default products:** the products for "Recommended For you" *(client to confirm)*.

**"Special Price" row.** cartx → **Customize Cart → Features → Special Offer**:
1. **Products from:** **Collection** → pick the special-offer collection *(client to confirm)*, or **Hand-picked products** → pick the products.
2. Max products as needed (the row scrolls sideways). Heading, Compact cards, position and empty-cart setting come from the import. **Save**.

The row only shows the products with their own price and compare-at price. Set up the special discount itself as a cartx promotion or a Shopify discount. Products already in the cart, or sold out, are skipped.

## 7. QA on the test theme

Check on a phone (or a 390 px window) against the three Figma screens in `.buildspace/artifacts/justherbs-cart-v2/screenshots/`.

| # | Check | Expected |
|---|---|---|
| 1 | Add one product | Bag icon, "Cart" with brown badge, milestone band with the bold parts of the message, divider item row with "Color: …", "Special Price" row, "Recommended For you", "Coupons ›" row, savings strip, "Total:", black Checkout with "Extra 5% OFF on UPI" and payment icons, trust row |
| 2 | Cross ₹599 | Second gift circle turns green; the "Free Gift" row appears |
| 3 | Quantity and REMOVE | Stepper updates the line; REMOVE removes it |
| 4 | Coupons › | Offers & Coupons with the code field and "All Coupons"; apply a code, the savings update; the back arrow returns to the cart |
| 5 | View Price Breakup | Price breakup sheet with "Discount On MRP" and the shipping rules |
| 6 | Recommendation and Special Price "+" | Adds the product; a Special Price card then drops out of the row |
| 7 | Empty the cart | "Cart is Empty", subtitle, "Shop Products" button, recommendations |
| 8 | Checkout | Goes to checkout with discounts applied |
| 9 | Live theme | Still shows the theme's own cart (embed off) |

## 8. Go live (after client sign-off)

1. Select the **live** theme in cartx, export its backup, then import the final settings exported from the test theme (so QA tweaks come along).
2. Recreate or check the milestones, offers, coupons and recommendations for the live theme. These are saved per theme.
3. Turn the cartx embed **on** in the live theme; check one add-to-cart and the checkout. Turn on **both** cartx app embeds: **cartx Drawer** and **cartx Promotions**. Without Promotions the gift and claim-gift discounts never apply: gifts stay at full price and show no struck price.

**Roll back:** turn the cartx embed off on the live theme. The theme's own cart comes back straight away.

## 9. Test the new features (dev preview, before the release)

The "Special Price" row, option names in the variant line, bold milestone text, the coupon icon and the price format fix are built on branch `feat/drawer-design-options` and not released yet. Test them on the dev store first:

1. Run the preview from the feature worktree:
   ```
   cd /Users/vishvamjoshi0310/Documents/shopify-projects/cartx-feat
   npm run dev        # shopify app dev → pick devx-dev
   ```
   ⚠️ `automatically_update_urls_on_dev` is on and this is the production app, so while `app dev` runs the app URLs point at the tunnel for every store. Run `shopify app deploy` afterwards to restore them.
2. On `devx-dev`, import `justherbs-cart-settings.json` (§3) on a test theme, set up a milestone with a bold Top message (§4), a coupon without an Accent label (§5), and pick a Special Price collection (§6).
3. Check:

| # | Feature | Setting (Customize Cart) | Expected |
|---|---|---|---|
| 1 | Option names | Cart items → Show option names **on** | "Color: 03 Honey Dew"; a product with no options shows no variant line; off shows "03 Honey Dew" |
| 2 | Bold milestone text | Top message `Add **[[ price ]] more** to get **1 freebie**` | The amount and the reward show in bold; the `**` are not shown |
| 3 | Coupon icon | Coupons → Coupon icon **Default** / **None** / **Custom SVG** | No Accent label: the icon shows / the strip is blank / your SVG shows. A coupon with an Accent label still shows the label |
| 4 | Special Price row | Features → Special Offer on, **Collection** | Compact cards above "Recommended For you" with price, compare-at price, % pill and "+" |
| 5 | Special Price "+" | — | Adds the first available variant; the card drops out of the row. Products in the cart or sold out are not shown |
| 6 | Hand-picked | Products from **Hand-picked products** | Only the picked products show |
| 7 | Card style | Card style **Same as Upsells** | The cards switch to the "Recommended For you" style |
| 8 | Empty cart | Show on empty cart **on** | The row also shows on the empty cart (off in the kit, per Figma) |
| 9 | Position | Move "Special Offer" in the section order | It moves in the drawer and the preview |
| 10 | Price format | Design → Cart items → Price decimals | Prices with thousands comma (`₹1,299`); Hide .00 drops `.00` on whole amounts |
| 11 | Admin preview | — | The Customize Cart preview follows each setting above |

When the release is deployed, these features are live for every store, and this kit can be imported on the Just Herbs store.
