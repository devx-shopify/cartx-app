# Just Herbs cart design (v2): what cartx can and can't do

This doc compares the new Just Herbs cart design (Figma, three 390 px mobile frames: empty cart, full cart, cart at phone height with the fixed footer) with what cartx can do. It covers:
- what ships with settings and Custom CSS,
- where the result differs a little from the design,
- what needs cartx development,
- what depends on the client.

**Status (2 Nov 2026):** the import file (`justherbs-cart-settings.json`) is built for the current released cartx drawer (`main`, PR #40) and passes the drawer settings check. It was rendered at 390 px with the released drawer code and a sample cart, and compared with the Figma frames (§6). It replaces the kit made for the older Just Herbs design, which is in the git history of this folder.

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the Custom CSS |
| 🟡 | Close: works, with a small difference from the design |
| 🔧 | Needs cartx development (S / M / L effort) |
| ❓ | Client decision or input needed |

The design is mobile only. On desktop the drawer uses the same look at 390 px wide.

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Header: bag icon, "Cart", brown count badge | ✅ | Bag icon is in the Custom CSS |
| Milestone band: white-to-mint background, rounded bottom, grey track, green gradient fill | ✅ | |
| Milestone gift circles and "On ₹X+" labels with the reward below | ✅ | Labels are typed per milestone in cartx Promotions |
| Milestone message with bold amount and reward | 🟡 | Whole line in one weight (§3) |
| Item rows: 104 px image, name, price, MRP, "42% Off", quantity stepper | ✅ | Divider rows are a setting |
| "REMOVE" as uppercase text | ✅ | Setting |
| Variant line "Color: 03 Honey Dew" | 🟡 | Shows "03 Honey Dew" (§3) |
| Free gift row with the green "Free Gift" pill | ✅ | |
| "Special Price" row (small horizontal cards) | 🔧 | cartx shows one recommendations block (§4 #1) |
| "Recommended For you" cards with pill, price and round "+" | ✅ | Also shown on the empty cart |
| "+" colour: brown on most cards, green on one | 🟡 / ❓ | One colour for all cards (§3) |
| "Coupons ›" single row | ✅ | Opens Offers & Coupons |
| Savings strip | ✅ / ❓ | Wording question (§5) |
| "Total: ₹699" and "View Price Breakup" | ✅ | |
| Black Checkout button: "Extra 5% OFF on UPI", payment icons, chevron | ✅ | |
| Trust row: "Easy 7-Day Returns" · "Secure Checkout" | 🟡 | Second item comes from the Custom CSS (§3) |
| Empty cart: "Cart is Empty", subtitle, gradient "Shop Products" button | ✅ | Button link is a setting (❓ where to) |
| Count badge "2" on the empty cart | 🟡 / ❓ | cartx hides the badge when the cart is empty |
| Figtree font | ✅ | Loaded from Google Fonts |

Counts: 13 ✅, 5 🟡, 1 area 🔧 (three development items in §4 in total, two of them optional fixes for 🟡 rows).

## 2. Ready (✅)

- **Header:** bag icon, "Cart" (Figtree 500 24/32), brown #B57363 count badge, thin divider.
- **Milestone band:**
  - white to #E3F5E8 gradient with a 24 px rounded bottom
  - 6 px grey #D9D9D9 track with a #68C083 → #358C50 fill
  - 32 px gift circles: green #358C58 with a white ring when reached, grey #D9D9D9 when not
  - three milestones centred in three equal columns, "On ₹499+" in semibold above "Extra 10% Off"
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
| Milestone message | "₹296" and "extra 10% off" in bold | Whole line in regular weight | 🔧 #3 |
| Variant line | "Color: 03 Honey Dew" | "03 Honey Dew" (variant name only, no option name) | 🔧 #2 |
| "+" button colour | Brown, one card green | Brown on every card | ❓ (likely a design slip) |
| Trust row | Two items, each with its own icon | cartx has one trust message. "Easy 7-Day Returns" is the setting; "Secure Checkout" and both icons come from the Custom CSS, so changing that text means editing the CSS | None |
| "Total:" label | "Total:" before the amount | Added by the Custom CSS (the drawer has no total label in this footer) | None |
| Count badge on the empty cart | Shows "2" | Hidden when the cart is empty | ❓ (likely a design slip) |
| Milestone spacing | Three equal columns | Matches for three milestones; the Custom CSS assumes three. With a different count the band still works, with milestones spread edge to edge | None |
| Progress before the first milestone | Fill starts at the left edge | The short track left of the first milestone turns green once that milestone is reached; before that, the message shows the amount needed | None |

## 4. Needs cartx development (🔧)

| # | Feature | What it does | Effort | Blocked on |
|---|---|---|---|---|
| 1 | Second recommendations block | "Special Price": its own product list, shown above "Recommended For you" as small horizontal cards (64 px image, name, price, "42%" pill, "+" on the right) | M | Which products feed each row |
| 2 | Option name in the variant line | Show "Color: 03 Honey Dew" by reading the option name from the cart line | S | None |
| 3 | Bold parts in the milestone message | Make the amount and the reward bold in the progress message | S | None |

Until #1 ships, the drawer shows only "Recommended For you".

## 5. What we need from the client

**Questions**

| # | Question | Why it matters |
|---|---|---|
| 1 | The empty cart shows "2" in the badge. Is that a design slip? | cartx hides the badge on an empty cart |
| 2 | "+" buttons are brown on most cards and green on one. Is green intended for anything? | cartx uses one colour |
| 3 | Which products go in "Special Price" and which in "Recommended For you"? | §4 #1 and the recommendation setup |
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
- Still differs: the 🟡 items in §3 and the missing "Special Price" row (§4 #1). The test page had no internet access, so it used a fallback font; on the store Figtree loads from Google Fonts.

## 7. Plan

1. **Now:** test theme, import, milestones, coupons, recommendations; QA against Figma (setup guide); share the preview with the client with the questions in §5.
2. **On client approval:** the second recommendations block, then the two small fixes (#2, #3).
3. **Go live** after sign-off (setup guide).

## 8. Summary

- Nearly all of the new design ships with settings and the Custom CSS: header, milestone band, divider item rows, gift row, "Recommended For you", the coupons row, footer and empty cart.
- Five small differences remain: plain-weight milestone message, variant without "Color:", one "+" colour, the trust row's second item in CSS, and no badge on an empty cart.
- One area needs development: the "Special Price" row (second recommendations block, M). Two small optional fixes (S) close the variant and message gaps.
- Client input needed on eight questions, including which products feed each row, the "Shop Products" link and the savings wording.
- Next step: import on the client's test theme and QA against Figma.
