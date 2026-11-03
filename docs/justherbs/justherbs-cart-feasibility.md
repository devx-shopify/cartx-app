# Just Herbs cart design (v2): what cartx can and can't do

This doc compares the new Just Herbs cart design (Figma, three 390 px mobile frames: empty cart, full cart, cart at phone height with the fixed footer) with what cartx can do. It covers:
- what ships with settings and Custom CSS,
- where the result differs a little from the design,
- what needs cartx development,
- what depends on the client.

**Status (3 Nov 2026):** the four development items in §4 are built in the next cartx release (branch `feat/drawer-design-options`) and are **in testing, not live yet**. The import file (`justherbs-cart-settings.json`) now uses them, so it needs that build: test it on the dev preview (setup guide §9). The previous version of the kit, for the released drawer, is commit `12189ab`. It was rendered at 390 px with a sample cart and compared with the Figma frames (§6).

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the Custom CSS |
| 🟡 | Close: works, with a small difference from the design |
| 🔧 | Needs cartx development (S / M / L effort) |
| 🧪 | Built in the next cartx release, in testing (not live yet) |
| ❓ | Client decision or input needed |

The design is mobile only. On desktop the drawer uses the same look at 390 px wide.

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Header: bag icon, "Cart", brown count badge | ✅ | Bag icon is in the Custom CSS |
| Milestone band: white-to-mint background, rounded bottom, grey track, green gradient fill | ✅ | |
| Milestone gift circles and "On ₹X+" labels with the reward below | ✅ | Labels are typed per milestone in cartx Promotions |
| Milestone message with bold amount and reward | 🧪 | `**bold**` in the milestone's Top message (§4 #3) |
| Item rows: 104 px image, name, price, MRP, "42% Off", quantity stepper | ✅ | Divider rows are a setting |
| "REMOVE" as uppercase text | ✅ | Setting |
| Variant line "Color: 03 Honey Dew" | 🧪 | Show option names setting (§4 #2) |
| Free gift row with the green "Free Gift" pill | ✅ | |
| "Special Price" row (small horizontal cards) | 🧪 | Special Offer row, Compact cards (§4 #1) |
| "Recommended For you" cards with pill, price and round "+" | ✅ | Also shown on the empty cart |
| "+" colour: brown on most cards, green on one | 🟡 / ❓ | One colour for all cards (§3) |
| "Coupons ›" single row | ✅ | Opens Offers & Coupons |
| Coupon icon on the cards in Offers & Coupons | 🧪 | Coupon icon setting: Default / None / Custom SVG (§4 #4) |
| Savings strip | ✅ / ❓ | Wording question (§5) |
| "Total: ₹699" and "View Price Breakup" | ✅ | |
| Black Checkout button: "Extra 5% OFF on UPI", payment icons, chevron | ✅ | |
| Trust row: "Easy 7-Day Returns" · "Secure Checkout" | 🟡 | Second item comes from the Custom CSS (§3) |
| Empty cart: "Cart is Empty", subtitle, gradient "Shop Products" button | ✅ | Button link is a setting (❓ where to) |
| Count badge "2" on the empty cart | 🟡 / ❓ | cartx hides the badge when the cart is empty |
| Figtree font | ✅ | Loaded from Google Fonts |

Counts: 13 ✅, 3 🟡, 4 🧪 (the four §4 items, built and in testing). Prices also get the thousands comma (₹1,299) in the new build.

## 2. Ready (✅)

- **Header:** bag icon, "Cart" (Figtree 500 24/32), brown #B57363 count badge, thin divider.
- **Milestone band:**
  - white to #E3F5E8 gradient with a 24 px rounded bottom
  - 6 px grey #D9D9D9 track with a #68C083 → #358C50 fill
  - 32 px gift circles: green #358C58 with a white ring when reached, grey #D9D9D9 when not
  - milestones spaced evenly along the track (any number), "On ₹499+" in semibold above "Extra 10% Off"
- **Item rows:** divider rows, 104 px image, name 500 14/18, variant in grey, ₹203 / ~~₹350~~ / red "42% Off" pill, 98 × 36 quantity stepper, "REMOVE" on the right.
- **Free gift row:** image, name and the green "Free Gift" pill, no price or quantity.
- **Recommended For you:** 146 px cards with a 120 px image, name, red "42% Off" pill, price and MRP, round 32 px brown "+" in the bottom-right corner. Shown on full and empty carts.
- **Coupons:** "Coupons" (green, bold) with "Apply now and save extra!" and a chevron. Tapping it opens Offers & Coupons, where codes are entered and listed.
- **Footer:**
  - pale green savings strip with the discount icon, "You are saving ₹999 on this product"
  - "Total: ₹699" with "View Price Breakup" on the right
  - black Checkout button with "Extra 5% OFF on UPI", the GPay / PhonePe / Paytm icons and a chevron
- **Empty cart:** "Cart is Empty", "Add products to your cart to avail Offers and Freebies.", brown gradient "Shop Products" button, then the recommendation cards.

## 3. Small differences (🟡)

| Item | Design | cartx | Fix if needed |
|---|---|---|---|
| "+" button colour | Brown, one card green | Brown on every card | ❓ (likely a design slip) |
| Trust row | Two items, each with its own icon | cartx has one trust message. "Easy 7-Day Returns" is the setting; "Secure Checkout" and both icons come from the Custom CSS, so changing that text means editing the CSS | None |
| "Total:" label | "Total:" before the amount | Added by the Custom CSS (the drawer has no total label in this footer) | None |
| Count badge on the empty cart | Shows "2" | Hidden when the cart is empty | ❓ (likely a design slip) |
| Milestone spacing | Three equal columns, first milestone a third of the way in | Spaced evenly with the last milestone at the end of the track, for any number of milestones. Chosen for robustness over an exact match | None |
| Track position | Track inset to line up with the three columns | The drawer's standard track, from the left edge with room for the last label on the right. No Custom CSS positions the track, so it works with any number of milestones | None |

## 4. cartx development (🧪 built, in testing)

All four are built in the next cartx release. The import file turns them on.

| # | Feature | Setting (Customize Cart) | Kit value | Client answer still needed |
|---|---|---|---|---|
| 1 | "Special Price" row | Features → **Special Offer**: on, heading, products from a **Collection** or **Hand-picked products**, max products, **Compact** / Same as Upsells cards, show on empty cart. Position: "Special Offer" in the section order | On, "Special Price", Compact, above "Recommended For you", off on the empty cart. **Collection blank**: pick it after import | Which collection or products (§5 #3) |
| 2 | Option name in the variant line | Cart items → **Show option names** | On ("Color: 03 Honey Dew"); products without options show nothing | None |
| 3 | Bold parts in the milestone message | No setting: wrap text in `**…**` in the milestone's Top message (Promotions) | e.g. `Add **[[ price ]] more** & get **an extra 10% off**` | None |
| 4 | Coupon card icon | Coupons → **Coupon icon**: Default / None / Custom SVG | Default: shown when the coupon has no Accent label; a label still shows instead | None |

The Special Offer row only shows products: the price on each card is the product's own price and compare-at price. The discount itself is a cartx promotion or a Shopify discount the store creates. Products already in the cart, or sold out, are skipped, and the row hides when none are left.

## 5. What we need from the client

**Questions**

| # | Question | Why it matters |
|---|---|---|
| 1 | The empty cart shows "2" in the badge. Is that a design slip? | cartx hides the badge on an empty cart |
| 2 | "+" buttons are brown on most cards and green on one. Is green intended for anything? | cartx uses one colour |
| 3 | Which collection (or products) goes in "Special Price", which products in "Recommended For you", and how is the special price given (cartx promotion or Shopify discount)? | §4 #1 and the recommendation setup; the row only shows the products |
| 4 | Where should "Shop Products" link (home, a collection, all products)? | It is a setting; the kit uses `/collections/all` |
| 5 | The savings strip says "on this product". Should it say "on this order"? | The amount is the saving on the whole cart |
| 6 | Is the free gift removable by the shopper? | The design shows no "REMOVE" on the gift; cartx matches that |
| 7 | Are GPay, PhonePe and Paytm the right payment icons? | cartx shows these three on the Checkout button |
| 8 | Is "Extra 5% OFF on UPI" always true? | Shown on every cart (a setting) |

**Content**

- Milestones: real thresholds and rewards for "Extra 10% Off" at ₹499, "Get 1 Freebie" at ₹599 and "Get 2 Freebie" at ₹799, the gift products, and how the 10% off is given.
- Discount codes (created in Shopify) for Offers & Coupons.
- Products for the recommendation rows.

## 6. Render check

The settings and Custom CSS were rendered with the released drawer code at 390 px (sample cart: two items, one free gift, three milestones, two recommendations, and an empty cart) and compared with the Figma frames.

- Matches: header, milestone band and labels, item rows, gift row, recommendation cards, coupons row, footer, trust row and empty state.
- With the new build: the "Special Price" row (Compact cards), "Color: …" variant line, bold milestone message and coupon icon render as in the Figma.
- Still differs: the 🟡 items in §3. The test page had no internet access, so it used a fallback font; on the store Figtree loads from Google Fonts.

## 7. Plan

1. **Now:** test the new build on the dev preview with this kit (setup guide §9).
2. **After the cartx release:** test theme, import, milestones, coupons, Special Price collection, recommendations; QA against Figma (setup guide); share the preview with the client with the questions in §5.
3. **Go live** after sign-off (setup guide).

## 8. Summary

- Nearly all of the new design ships with settings and the Custom CSS: header, milestone band, divider item rows, gift row, "Recommended For you", the coupons row, footer and empty cart.
- The four development items ("Special Price" row, "Color:" variant line, bold milestone message, coupon icon) are built in the next cartx release and in testing.
- Three small differences remain: one "+" colour, the trust row's second item in CSS, and no badge on an empty cart.
- Client input needed on eight questions, including which products feed each row, the "Shop Products" link and the savings wording.
- Next step: import on the client's test theme and QA against Figma.
