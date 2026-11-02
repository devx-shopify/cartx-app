# Kaya cart design: what cartx can and can't do

This doc compares the Kaya cart design (Figma, three 360 px mobile frames: empty cart, full cart, cart at phone height with the fixed footer) with what cartx can do. It covers:
- what ships with settings and Custom CSS,
- where the result differs a little from the design,
- what needs cartx development,
- what depends on the client.

**Status (2 Nov 2026):** the import file (`kaya-cart-settings.json`) is built for the current released cartx drawer (`main`) and passes the drawer settings check. It was rendered at 360 px with the released drawer code and a sample cart, and compared with the Figma frames (§6).

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the Custom CSS |
| 🟡 | Close: works, with a small difference from the design |
| 🔧 | Needs cartx development (S / M / L effort) |
| ❓ | Client decision or input needed |

The design is mobile only. On desktop the drawer uses the same look at 360 px wide.

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Header: cart icon, "My Cart" over "2 Products", close X | ✅ | Icon and the "Products" line are in the Custom CSS |
| Header: mint "Clear All" pill | 🔧 | cartx has no Clear All button (§4 #1) |
| Milestones: amounts above a thin teal track, reward labels below | ✅ | Amounts and rewards are typed per milestone in cartx (setup guide §4) |
| Milestone dots: teal check when reached, white with grey ring when locked | ✅ | |
| Cart items: all lines in one rounded, shadowed card with dividers | ✅ | Custom CSS |
| Item row: 80 px image, one-line name, price with struck compare-at, stepper, grey bin | ✅ | |
| "Freebies For you" mint block with heading and icon, free gift rows with "Free" pill | ✅ | Shows gifts that are in the cart |
| Free gift row: struck original price (~~₹440~~ Free) | 🔧 | cartx shows only "Free" on a free gift line (§4 #3) |
| Freebies: "1/3 Unlocked" counter and locked rows ("₹302 more to Unlock") | 🔧 | §4 #2 |
| "Recommended For you": 240 px side-scrolling cards, "+" on the image, ~~₹440~~ ₹200 52% | ✅ | Also shown on the empty cart |
| Coupon pill: tag, "₹200 saved with 'FLAT200'", "View all coupons ›", Remove | ✅ | Custom CSS on the applied coupon card |
| Savings strip "You are saving ₹999 on this product" | ✅ | Wording ❓ (§5 #4) |
| "Total: ₹799" and "View Price Breakup" | ✅ | |
| Black "Check out" with GPay / PhonePe / Paytm and chevron | ✅ | Icons ❓ (§5 #6) |
| Trust row "Easy 7-Day Returns" and "Secure Checkout" | 🟡 | Second item is in the Custom CSS |
| Empty cart: "0 Products", "Cart is Empty", two-line text, black "Shop Products", recommendations | ✅ | |
| Fonts: Montserrat, Poppins for titles, coupon and empty text | ✅ | Both from Google Fonts |

## 2. Ready (✅)

These work with the import file alone:

- **Header.** Cart icon, "My Cart" (Montserrat 700 16 px) with "2 Products" below (12 px), 44 px close button.
- **Milestones.** ₹499 / ₹699 / ₹999 above a 3 px `#D8D9E0` track with a `#00A08C` fill; 24 px dots; reward labels in 10 px below. The amount is each milestone's sub label, lifted above the track by the Custom CSS.
- **Cart card.** One white card, 16 px corners, `#F3F3F5` border and soft shadow, `#E9E9E9` divider between lines. Names on one line with "…", price 600 14 px, compare-at struck in `#BDB3B3`, 76×32 stepper, grey bin on the right.
- **Freebies block.** Gift lines move below the cart card into a mint gradient block (`#DCFFFB` to white) with the "Freebies For you" heading, icon and divider; 64 px images; teal "Free" pill.
- **Recommended For you.** Poppins 600 16 px heading, 240×84 cards, 84 px image with a white "+" box on its corner, two-line name, struck price, price and red `#D13415` percentage.
- **Coupon.** Pill with a 999 px radius and a `#D8D9E0` border. Before a code is applied it reads "View all coupons ›" and opens Offers & Coupons. After, it reads "₹200 saved with 'FLAT200'" with "View all coupons ›" and a black-outlined "Remove".
- **Footer.** `#CCF3EB` savings strip with `#044F62` text, "Total:" with the amount in 700 18 px, underlined "View Price Breakup", 48 px black Check out with payment icons and chevron.
- **Empty cart.** "0 Products", no illustration, Poppins texts, black "Shop Products", recommendations at the bottom.

## 3. Small differences (🟡)

| Item | Design | cartx | Fix |
|---|---|---|---|
| Count wording | "2 Products" | One item reads "1 Products": the word is added by CSS, which can't switch to singular | Optional: a "Products" text setting with singular/plural (S) |
| Trust row | Two items with icons | The second item, "Secure Checkout", is written in the Custom CSS | Edit the CSS to change it |
| Milestone positions | Dots at 84 / 180 / 276 px | Even spacing puts the first dot a few px right of the design | None needed |
| Milestone amounts | Part of the bar design | Typed as each milestone's sub label in cartx | Setup guide §4 |
| Stepper border | Not set in the Figma layer; grey in the screenshot | Grey `#8B8B8B`, taken from the screenshot | Confirm with the designer |
| Price format | ₹1,890 | Follows the store's money format; with `{{amount_no_decimals}}` it shows ₹1890 | Store setting (setup guide §3) |

## 4. Needs cartx development (🔧)

| # | Feature | What it does | Effort | Blocked on |
|---|---|---|---|---|
| 1 | Clear All button | Mint pill with a bin icon in the header; empties the cart after a confirm, with a setting for whether gifts go too | S | Client answer on confirm and gifts (§5 #1) |
| 2 | Freebies tier list | Lists every gift milestone in the Freebies block: an "n/3 Unlocked" counter, unlocked gifts as now, locked gifts as rows with the product image, name and "₹302 more to Unlock" | M | Client answer on all tiers vs next tier and auto-add vs claim (§5 #2) |
| 3 | Struck price on free gift lines | Show ~~₹440~~ before the "Free" pill on an auto-added gift line (cartx already does this on gift cards) | S | None |

Until #2 ships, the Freebies block shows only the gifts already in the cart, with no counter and no locked rows.

## 5. What we need from the client

**Questions**

| # | Question | Why it matters |
|---|---|---|
| 1 | Clear All: should it ask for confirmation first? Does it also remove free gifts? | §4 #1 |
| 2 | Freebies: list all gift tiers or only the next one? Are gifts added automatically, or claimed by the shopper? The design has no claim button. | §4 #2 and the offer setup |
| 3 | Which products feed "Recommended For you"? | Recommendation setup |
| 4 | The savings strip says "on this product". Should it say "on this order"? | The amount is the saving on the whole cart |
| 5 | Where should "Shop Products" link (home, a collection, all products)? | It is a setting; the kit uses `/collections/all` |
| 6 | Are GPay, PhonePe and Paytm the right payment icons? | cartx shows these three on the Check out button |
| 7 | Should the variant (e.g. size) ever show on a cart line? | The design shows none; the kit hides it |
| 8 | Is a desktop design coming? | Today desktop uses the same 360 px drawer |

**Content**

- Milestones: real thresholds, rewards and gift products for ₹499, ₹699 and ₹999 *(the mock-up shows Free Wipes, Free Soothing Cleansing Gel, and both)*.
- Discount codes (created in Shopify), e.g. FLAT200.
- Products for "Recommended For you".

## 6. Render check

The settings and Custom CSS were rendered with the released drawer code at 360 px (sample cart: two items, one free gift, three milestones, an applied code, two recommendations; plus an empty cart and the phone-height view) and compared with the Figma frames.

- Matches: header, milestone bar, cart card, freebies block heading and gift row, recommendation cards, coupon pill, savings strip, total row, Check out button, trust row and empty state.
- Still differs: no Clear All pill, no "1/3 Unlocked" counter or locked gift row, no struck price on the free gift (§4), and the 🟡 items in §3. The test page used the `{{amount_no_decimals}}` money format, so prices showed without the thousands comma.

## 7. Plan

1. **Now:** test theme, import, milestones and gifts, coupons, recommendations; QA against Figma (setup guide); share the preview with the client with the questions in §5.
2. **On client approval:** the Freebies tier list (#2), Clear All (#1) and the struck gift price (#3).
3. **Go live** after sign-off (setup guide).

## 8. Summary

- Most of the Kaya design ships with settings and the Custom CSS: header, milestone bar, the one-card cart, freebies block, "Recommended For you", the coupon pill, footer and empty cart.
- Three items need development: the Freebies tier list with counter and locked rows (M), the Clear All button (S) and the struck price on free gift lines (S).
- Small differences: "1 Products" for a single item, the second trust item in CSS, milestone amounts typed in cartx, and the stepper border colour taken from the screenshot.
- Client input needed on eight questions, mainly how freebies work, Clear All, the recommendation products and the savings wording.
