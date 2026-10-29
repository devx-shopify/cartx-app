# FREED cart design: what cartx can and can't do

This doc compares the FREED cart design (Figma "FREED / CartX", 17 screens, 600 px desktop drawer and 390 px mobile) with what cartx can do. It covers:
- what ships with settings and Custom CSS,
- where the result still differs a little from the design,
- what needs more cartx development,
- what depends on the client.

**Status (29 Oct 2026):** the cartx drawer design options are **released** (release PR #38, deployed 29 Oct). Every design feature planned for FREED is now a Customize Cart setting. The import file (`freed-cart-settings.json`) uses them, and the Custom CSS keeps only FREED's type scale, spacing, artwork and card shapes. Both pass the released settings validation and were rendered with the released drawer. They still need QA on FREED's test theme.

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the FREED Custom CSS |
| 🟡 | Close: works, with a small difference from the design |
| ⛔ | Not possible yet: needs a third-party data source plus development |
| ❓ | Client decision or input needed |

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Announcement bar | ✅ | Colours are settings |
| Header "CART (2)", centred, close | ✅ | Alignment and "(2)" are settings |
| Milestone card: gradient, sticker, track, gift icons, labels, top message | ✅ | Card, gradient and colours are settings; the sticker is embedded in the CSS |
| Milestone icons | ✅ | Two shared icons (not reached / reached), as decided |
| "Pick one free gift" cards with "~~₹999~~ Free" | ✅ | Prices show for offers saved after the release |
| Free gift line (pink, FREE, gift icon) | ✅ | |
| Cart items: size pill above the name, REMOVE link, "01", "50%" | ✅ | All settings |
| "You may also like" with ADD over the image and "50%" | ✅ | Settings |
| Star rating and review count on recommendations | ⛔ | Needs Judge.me data, see §4 |
| "Apply Coupon ›" row, Offers & Coupons view with code field | ✅ | Settings |
| Coupons not yet reachable, "Add ₹2234 more to apply this coupon" | ✅ | Setting |
| Applied coupon card with REMOVE and "You saved ₹200 with this coupon" | ✅ | Setting |
| Coupon badge starburst | ✅ | The real Figma shape (`assets/icons/coupon-starburst.svg`) |
| Check Delivery Date (pincode, delivery date, COD) | ⛔ | No data source, see §4 |
| "You are saving ₹999" strip | ✅ | "on this order" (decided) |
| Total, "View Price Breakup", lime bar, CHECK OUT with UPI icons | ✅ | Bar colour and full-width button are settings |
| Price breakup with info icon and shipping-rules box | ✅ | Shipping rules are a setting (placeholder text) |
| Empty cart: illustration, "YOUR CART IS EMPTY", "Recommended for you" | ✅ | |
| Fonts (Anton, Montserrat, Roboto) and colours | ✅ | Font URL, heading font and product font are settings |
| Drawer width 600 px | ✅ | |

## 2. Ready (✅)

From `freed-cart-settings.json` plus the Promotions, Coupons and Upsells setup in the guide:

- **Header:** "CART (2)" in Anton, centred, close on the right.
- **Milestone card:**
  - lime gradient card with the "SPECIAL OFFER" sticker
  - thin pink track
  - gift-icon dots that turn pink with a blue check
  - "Spend ₹999 / Free Delivery" labels
  - the next promotion's Top message
- **"Pick one free gift" cards:** "~~₹999~~ Free" and lime ADD / REMOVE.
- **Free gift line:** pink, FREE, gift icon, no quantity controls.
- **Cart items:**
  - dashed size pill above the name, REMOVE text link
  - quantity "01"
  - struck compare-at price and green "50%"
  - Roboto names and prices
- **"You may also like":** lime ADD over the image, prices and "50%".
- **Coupons:**
  - "Apply Coupon ›" row opening Offers & Coupons
  - code field and APPLY in the view
  - starburst badges
  - coupons not yet reachable greyed out with "Add ₹X more"
  - applied coupon as a pink card with REMOVE and "You saved ₹X with this coupon"
- **Order of blocks:** cart items → recommendations → coupons.
- **Footer:**
  - savings strip "You are saving ₹X on this order"
  - lime bar with the total and "View Price Breakup"
  - black CHECK OUT with GPay, PhonePe and Paytm
- **Price breakup:** the design's rows, info icon and the shipping-rules box.
- **Empty cart:** 3D cart illustration, "YOUR CART IS EMPTY", "Recommended for you".

## 3. Small differences (🟡)

| Item | Design | cartx | Note |
|---|---|---|---|
| Footer total vs price breakup | ₹1988 in the footer, ₹799 in the breakup | Both show the real cart total after discounts | Mock-up values; not a gap |
| Gift prices on older offers | "~~₹999~~ Free" | Title only, until the offer is saved again or the product is edited in Shopify | Re-save the offer once after setup |
| "SPECIAL OFFER" sticker | Image | Embedded in the Custom CSS | Could move to the corner-badge setting once it's uploaded to FREED's Shopify Files |

## 4. Not possible yet (⛔)

### 4.1 Pincode checker: Check Delivery Date and COD availability

**Why not:** Shopify's cart and storefront APIs give no delivery date or COD serviceability for a pincode. That data lives with FREED's courier or logistics provider.

**What it needs:**
- **From the client:** the provider (e.g. Shiprocket, Delhivery, ClickPost), API access and docs, and the rules (delivery time per zone, COD per pincode, cut-offs).
- **From us:** a cartx server endpoint that calls the provider (keys server-side, caching, rate limits), a drawer section with pincode input and result rows, settings, and remembering the shopper's pincode.

**Effort:** M–L, depending on the provider's API. **Blocked on** the provider details.

### 4.2 Judge.me stars and review count on recommendations

**Why not:** cartx doesn't read review data.

**What it needs:**
- **From the client:** confirm Judge.me, and turn on its **sync to Shopify product metafields** (`reviews.rating`, `reviews.rating_count`).
- **From us:** read those metafields when storing upsell products, show "★ 5.0  345 REVIEWS" on the card, add an on/off setting. No Judge.me API key needed.

**Effort:** M (2–4 days). **Blocked on** confirming Judge.me and the metafield sync.

## 5. What we need from the client

**Decisions**

| # | Question | Why it matters |
|---|---|---|
| 1 | Is the "SPECIAL OFFER" sticker always on, or only during campaigns? | It's in the Custom CSS (or the corner-badge setting) |
| 2 | Pincode checker: which logistics provider? | §4.1 |
| 3 | Judge.me: installed, and metafield sync on? | §4.2 |

**Content**

- Real milestones: the free-delivery threshold, gift tiers, "Buy 3 @1099" products.
- Discount codes (created in Shopify) with minimums, badge text and savings text.
- Gift products for the picker.
- Upsell products: best sellers and any product-to-product recommendations (CSV is fine).
- Shipping rules for the price breakup. The current text is a placeholder.
- Final artwork, if different from Figma: the sticker and the empty-cart illustration.

## 6. Plan

1. **Now:** test theme, import, promotions, coupons, upsells, QA against Figma (setup guide). Share the preview with the client.
2. **After client inputs:** Judge.me reviews (M), then the pincode checker (M–L).
3. **Go live** after sign-off (setup guide §10).

## 7. Summary

- Every FREED design feature except pincode and Judge.me is now built into cartx and set by the import file.
- The Custom CSS holds only FREED's type scale, spacing, artwork and card shapes.
- The coupon badges use the real Figma starburst.
- Remaining work needs client inputs: logistics provider (pincode) and Judge.me metafields (reviews).
- Next step: QA on FREED's test theme.
