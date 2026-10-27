# FREED cart design: what cartx can and can't do

This doc compares the FREED cart design (Figma "FREED / CartX", 17 screens, 600 px desktop drawer and 390 px mobile) with what cartx can do today. Use it to see:
- what we can ship with settings only,
- where the result will differ a little from the design,
- what needs cartx development,
- what depends on the client.

**Status (27 Oct 2026):** the import file and Custom CSS are written (`freed-cart-settings.json`, `freed-cart-custom.css`). They pass the app's settings validation, but nobody has looked at them on a live storefront yet. Expect some CSS tweaks during QA on the test theme.

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the FREED Custom CSS, no code |
| 🟡 | Close: works, with a small visual difference from the design |
| 🔧 | Needs cartx development: a general feature (on/off per store), shipped with `shopify app deploy` |
| ⛔ | Not possible with the current setup: needs a third-party data source plus development |
| ❓ | Client decision or input needed |

Effort is rough: **S** = up to 1 day, **M** = 2–4 days, **L** = 1–2 weeks (including QA).

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Announcement bar | ✅ | |
| Header "CART (2)" and close | ✅ | |
| Milestone card: gradient, progress track, tier icons, labels, top message | ✅ | |
| "SPECIAL OFFER" sticker | ✅ | Embedded in the Custom CSS, no upload needed |
| Milestone icons | ✅ | Two shared icons for all milestones: not reached (dark gift) and reached (white gift). One icon per milestone (truck, Arm Cuff) is not planned. |
| "Pick one free gift" cards | ✅ / 🟡 | Card shows title and ADD, not "~~₹999~~ Free" |
| Free gift line (pink, FREE, gift icon, no quantity) | ✅ | |
| Cart items: image, name, price, compare-at, discount %, quantity | ✅ / 🟡 | Small differences, see §3 |
| "You may also like" cards with ADD over the image | ✅ | |
| Star rating and review count on recommendations | ⛔ | Needs Judge.me data, see §5 |
| Discount % on recommendation cards | 🔧 | Not shown today |
| Apply Coupon and suggested coupon cards | ✅ / 🟡 | Keeps a code input, see §3 |
| Applied coupon card with "You saved ₹200 with this coupon" | 🟡 / 🔧 | Pink chip today; the saved-amount line needs code |
| Offers & Coupons view (back, list, APPLY) | ✅ | |
| Coupon code input inside Offers & Coupons | 🔧 | The input is in the cart body today |
| Coupons not yet reachable, with "Add ₹2234 more to apply this coupon" | 🔧 | Hidden today |
| Check Delivery Date (pincode, delivery date, COD) | ⛔ | No data source, see §5 |
| "You are saving ₹999" strip | ✅ | |
| Total, View Price Breakup, CHECK OUT with GPay/PhonePe/Paytm | ✅ | |
| Price breakup rows (MRP, discount, coupon, shipping, total) | ✅ | |
| Shipping-rules box and info icon in the price breakup | 🔧 | Text written by the client |
| Empty cart: illustration, "YOUR CART IS EMPTY", "Recommended for you" | ✅ | |
| Fonts (Anton, Montserrat, Roboto) and colours | ✅ | Set by the import file |
| Mobile vs desktop spacing and sizes | ✅ | |

## 2. Ready with settings and CSS (✅)

These come from `freed-cart-settings.json` plus the Promotions, Coupons and Upsells setup in the guide:

- **Announcement bar** (Roboto caps on black).
- **Header:** "CART (2)" in Anton, close button.
- **Milestone card:**
  - lime gradient card with the "SPECIAL OFFER" sticker
  - thin pink progress track
  - gift-icon dots that turn pink with a blue check when reached
  - "Spend ₹999 / Free Delivery" labels
  - top line taken from the next promotion's Top message
- **"Pick one free gift" cards** (an offer with "Show offer card only"), with lime ADD and REMOVE.
- **The chosen gift** appears as a pink line with FREE, a gift icon, and no quantity controls.
- **Cart items:**
  - 82 × 90 image
  - Roboto name and price
  - struck-through compare-at price
  - green discount %
  - bordered quantity stepper
- **"You may also like" recommendations:**
  - horizontal scroll
  - lime ADD button over the image
  - price and compare-at price
  - cart-based rules from the Upsells page
- **Coupon cards:** pink starburst badge ("20% OFF"), code, savings text, APPLY. The same look applies in the cart and in the Offers & Coupons view.
- **Order of blocks:** cart items → recommendations → coupons, as in the design.
- **Footer:**
  - savings strip on #333
  - lime bar with the total and "View Price Breakup"
  - black CHECK OUT button with GPay, PhonePe and Paytm icons
- **Price breakup sheet** with the design's colours: green discounts, red "Calculated at checkout".
- **Empty cart:** 3D cart illustration, "YOUR CART IS EMPTY", and "Recommended for you" cards.

## 3. Close, with small differences (🟡)

These work today but don't match the design exactly. Each can become a small 🔧 item if the client insists.

| Item | Design | cartx today | Fix if needed |
|---|---|---|---|
| Drawer width (desktop) | 600 px | 560 px (app maximum) | Raise the limit, S |
| Line discount % | "50%" | "50% off" | Label option, S |
| Size / variant pill | Dashed pill above the name, static | Dashed pill next to the quantity, opens a variant switcher | Layout option, S |
| Remove | "REMOVE" text link on every line | Bin icon (shown when quantity > 1; the minus button becomes a bin at quantity 1) | "Text remove link" option, S |
| Quantity | "01" | "1" | Zero-pad option, S |
| Coupon entry row | One "Apply Coupon ›" row that opens Offers & Coupons | "Apply Coupon" input with a submit arrow and VIEW ALL | Option to show it as a single link row, S |
| Applied coupon | Full pink card, REMOVE, "You saved ₹200 with this coupon" | Pink-framed chip with the code and ✕ | See 🔧 #4 |
| Coupon badge | Starburst artwork | CSS starburst shape (close, not identical) | Badge image upload, S |
| Gift picker card | "~~₹999~~ Free" under the name | Name and ADD only | See 🔧 #6 |
| Milestone positions | Placed by design spacing | Spaced evenly by number of tiers | Usually fine |

## 4. Needs cartx development (🔧)

Each one is built as a general option that other merchants can turn on too. Nothing is FREED-only code. Most of them can go into one drawer release.

| # | Feature | What it does | Where | Effort |
|---|---|---|---|---|
| 1 | Coupons not yet reachable | List coupons the cart doesn't qualify for yet: grey badge, red "Add ₹X more to apply this coupon", no APPLY. The data (minimum cart total) already exists. | Drawer | S–M |
| 2 | Code input in Offers & Coupons | "Enter Coupon Code" field with an APPLY button at the top of the view | Drawer | S |
| 3 | Shipping info in the price breakup | Info icon next to Shipping Fee, plus a grey box with the merchant's shipping-rules text (e.g. prepaid and COD tiers) | Admin setting + drawer | S–M |
| 4 | Applied-coupon card | Full applied card with REMOVE and "You saved ₹X with this coupon" (amount read from the cart's discount allocations) | Drawer | S–M |
| 5 | ~~Milestone reward icons~~ | **Dropped.** The two shared icons (not reached / reached) stay for all milestones, so the card uses the spend-first style. | | |
| 6 | Price on gift picker cards | "~~₹999~~ Free" on the "Pick one free gift" cards | Server + drawer | S |
| 7 | Discount % on recommendations | "50%" next to the price on recommendation cards | Drawer | S |
| 8 | Small layout options | Text REMOVE link, zero-padded quantity, single "Apply Coupon" row, empty-cart recommendations heading | Admin + drawer | S each |
| 9 | Font picker | Customize Cart field for the font URL. Today fonts can only be set through the import file. | Admin | S |
| 10 | Wider drawer | Allow up to 600 px | Admin + schema | S |
| 11 | Claim Gift button text | The Claim Gift button always reads "Claim gift". Make the text a setting so it can say "Add". Not needed if "Pick one free gift" is set up as an Offer with "Show offer card only", whose button already reads "Add". | Admin + drawer | S |

**Rough total for #1–#11 (without #5):** about 1.5–2 weeks, in one PR and one `shopify app deploy`.

## 5. Not possible with the current setup (⛔)

### 5.1 Pincode checker: Check Delivery Date and COD availability

**Why not today:** Shopify's cart and storefront APIs give no delivery date or COD serviceability for a pincode. That data lives with FREED's courier or logistics provider. cartx has nothing to ask.

**What it needs:**
- **From the client:**
  - the provider (e.g. Shiprocket, Delhivery, ClickPost, Pickrr, or the app behind their product-page pincode check, if they have one)
  - API access and documentation
  - the rules: delivery time per zone, COD per pincode, cut-off times
- **From us:**
  - a cartx server endpoint that calls the provider and keeps the API keys server-side, with caching and rate limits
  - a new drawer section: pincode input, arrow button, result rows
  - settings to turn it on and set the text
  - saving the shopper's pincode between visits

**Effort:** M–L, depending on the provider's API. **Blocked on** the client's provider details.

### 5.2 Judge.me stars and review count on recommendations

**Why not today:** cartx doesn't read review data. Recommendation cards only carry title, image, price and compare-at price.

**What it needs:**
- **From the client:**
  - confirm Judge.me is installed
  - turn on Judge.me's **sync to Shopify product metafields**, so rating and review count are stored on each product (`reviews.rating`, `reviews.rating_count`)
- **From us:**
  - read those metafields when cartx stores product details for upsells
  - show "★ 5.0  345 REVIEWS" on the card
  - add an on/off setting
  - note: no Judge.me API key is needed if the metafields are on

**Effort:** M. **Blocked on** confirming Judge.me and the metafield sync.

## 6. What we need from the client

**Decisions**

| # | Question | Why it matters |
|---|---|---|
| 1 | Milestone card: we use the spend-first style ("Spend ₹999 / Free Delivery") with the shared gift icons. OK with the client? | The reward-first style with a picture per milestone is not planned |
| 2 | Which total does the footer show? (Figma shows ₹1988 in the footer and ₹799 in the price breakup) | cartx shows the cart total after discounts |
| 3 | Is the "Pick one free gift" row always visible, or only after a threshold? Which gifts? | Offer trigger setup |
| 4 | Should coupons the cart can't use yet be listed with "Add ₹X more"? | Needs 🔧 #1 |
| 5 | Savings strip text: "on this product" or "on this order"? | It shows the saving for the whole cart |
| 6 | Is the "SPECIAL OFFER" sticker always on, or only during campaigns? | Custom CSS on/off |
| 7 | Are the 🟡 differences acceptable, or should any of them be built (§3)? | Scope of the 🔧 release |

**Content and access**

- Real milestone values and rewards: free-delivery threshold, gift tiers, the "Buy 3 @1099" offer and which products it covers.
- Discount codes (created in Shopify) with minimums, accent labels and savings text.
- Gift products for the picker.
- Upsell products: default best sellers and any product-to-product recommendations (CSV is fine).
- Shipping-rules text for the price breakup (prepaid and COD tiers), only if 🔧 #3 is wanted.
- Pincode checker: the logistics provider, API access and rules (§5.1).
- Judge.me: confirm the app, and turn on metafield sync (§5.2).
- Final artwork, if different from Figma: the sticker and the empty-cart illustration.

## 7. Suggested plan

1. **Phase 1, no development (this week):** test theme, import, promotions, coupons, upsells, QA against Figma. Share the test-theme preview with the client, along with this list of differences.
2. **Phase 2, one cartx release (about 1.5–2 weeks):** the 🔧 items the client approves (§4), shipped together with one `shopify app deploy`.
3. **Phase 3, after client inputs:** Judge.me reviews (M), then the pincode checker (M–L) once the provider is known.
4. **Go live:** once the client signs off on the test theme, apply the settings to the live theme and turn on the embed (setup guide §10).
