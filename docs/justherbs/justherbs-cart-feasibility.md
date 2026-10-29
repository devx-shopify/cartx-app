# Just Herbs cart design: what cartx can and can't do

This doc compares the Just Herbs cart design (Figma "Just Herbs", section "Cart": 5 mobile screens, 409 px) with what the **live** cartx app can do today. It covers:
- what ships with settings and Custom CSS only,
- where the result differs a little from the design,
- what needs cartx development,
- what depends on the client.

**Status (28 Oct 2026):** the import file and Custom CSS are written (`justherbs-cart-settings.json`, `justherbs-cart-custom.css`). They pass the live app's settings validation and were rendered with the live drawer code against a test cart. They haven't been checked on the client's storefront yet, so expect small CSS tweaks during QA.

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the Custom CSS, no code |
| 🟡 | Close: works, with a small difference from the design |
| 🔧 | Needs cartx development |
| ❓ | Client decision or input needed |

The design is mobile only. On desktop the drawer uses the same look at 420 px wide.

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Header "Cart" with red count badge | ✅ | |
| Milestone band: message, rounded track, gift-box icons, labels and thresholds | ✅ / 🟡 | See §3 for spacing and bold words |
| Cart item card: image, name, "Pack of 1 ⌄", price, MRP, "42% Off", quantity | ✅ / 🟡 | "Contains: …" line not available |
| Free gift line: mint card, gift sticker, "Free Gift" | ✅ / 🟡 | No bin on the gift line |
| Coupons row | 🟡 | Code input + "View All" instead of one "Coupons ›" row |
| Applied coupon: ticket card with Remove | ✅ / 🟡 | No "You can save…" or "You saved ₹X" lines |
| "Special price" recommendations (pink, delivery line, price pill, green ADD) | ✅ / 🟡 | No viewers badge, "Concern" line or % off |
| "New Launches" recommendations (blue, second list) | 🔧 | cartx shows one recommendations block |
| Savings strip | ✅ / ❓ | Colours changed for readability |
| Total, "View details", green Checkout with "Extra 5% OFF on UPI" and UPI icons | ✅ | |
| Offers & Coupons view: title, "All Coupons", cards, Apply | ✅ / 🟡 | No code field; coupons the cart can't use yet are hidden |
| Price breakup sheet with the shipping-rules box | ✅ | The rules are fixed text in the Custom CSS |
| Fonts | 🟡 / ❓ | Figtree everywhere; Haskoy (milestones) isn't on Google Fonts |

## 2. Ready with settings and CSS (✅)

- **Header:** "Cart" with a red count badge, close button, soft shadow.
- **Milestone band:**
  - mint background, top message from the next promotion's Top message
  - 10 px rounded track with a green fill
  - colour gift box when a milestone is reached, grey when it isn't (Figma icons, set by the import)
  - small label ("Get 1 Freebie") and larger threshold ("₹599+") under each
- **Cart items:** bordered cards, 60 px image, one-line name, "Pack of 1 ⌄" pill (opens the variant switcher), ₹203 / ~~₹350~~ / "42% Off" in red, bin / quantity / +.
- **Free gift line:** mint card with the gift sticker on the corner and green "Free Gift".
- **Applied coupon:** ticket-shaped green gradient card with notches, code and "Remove".
- **Recommendations:** pink "Special price" block with the truck line "Order now and get it delivered by tomorrow", white cards, pink price pill, struck MRP, green ADD with the hard shadow.
- **Footer:** savings strip, total with underlined "View details", full-width green Checkout with "Extra 5% OFF on UPI" and GPay / PhonePe / Paytm icons.
- **Offers & Coupons view:** centred title, "All Coupons", cards with "20% OFF" text badge, green Apply.
- **Price breakup:** the design's rows and colours, plus the grey shipping-rules box.

## 3. Close, with small differences (🟡)

| Item | Design | cartx today | Fix if needed |
|---|---|---|---|
| Coupon entry | One "Coupons / Apply now and save extra! ›" row that opens Offers & Coupons, where the code is typed | "Apply Coupon" code input with "View All". Kept because the live Offers & Coupons view has no code field, so hiding the input would stop shoppers typing codes. | 🔧 (single row + code field in the view) |
| Suggested coupons in the cart | Not shown | Hidden in the cart by the CSS, listed in Offers & Coupons | — |
| Coupons the cart can't use yet | Listed with "Add ₹2234 more to apply this coupon" | Hidden | 🔧 |
| Applied coupon | Also "You can save ₹130…" and "You saved ₹200 with this coupon" | Code and Remove only | 🔧 |
| Free gift line | Bin icon (shopper can remove the gift) | No bin: offer gifts are added and removed by the offer rules | 🔧 |
| Cart item description | "Contains: 8 shades x Pack of 1" | Not available (product data cartx doesn't read) | 🔧 |
| Milestone positions | First milestone at the start of the track | Spaced evenly from a third of the way along | Usually fine |
| Milestone message | Only "₹296" and "an extra 10% off" in bold | Whole line semibold | — |
| Recommendation cards | Viewers badge ("👁 100"), "Concern: Oil & dirt", "42% Off" | Image, name, price pill, MRP, ADD | 🔧 |
| Coupon badges | Three badge styles drawn | One text badge ("20% OFF") | ❓ pick one |
| Savings strip | Near-white text on a pale green (only "₹91" readable) | Dark text, green amount | ❓ |
| Fonts | Figtree, Haskoy for milestones, some Montserrat / Roboto | Figtree everywhere | ❓ |

## 4. Needs cartx development (🔧)

| # | Feature | What it does | Effort |
|---|---|---|---|
| 1 | Second recommendations block | "New Launches": its own product list and a small vertical card (image on top, dark info panel, ADD over the card) | M |
| 2 | Coupon row + code field in Offers & Coupons | One "Coupons ›" row in the cart; code field at the top of the view | S |
| 3 | Coupons not yet reachable | Listed with "Add ₹X more to apply this coupon" | S–M |
| 4 | Applied-coupon details | "You can save…" on the card and "You saved ₹X with this coupon" below | S–M |
| 5 | Discount % on recommendation cards | "42% Off" after the prices | S |
| 6 | "Concern" line on cards and "Contains" line on items | Read from a product metafield the client fills in | M |
| 7 | Viewers badge | "👁 100" on recommendation cards; needs a data source (❓ what the number means) | M–L |
| 8 | Removable free gift | Bin on the gift line | S–M |

Items 2–5 are already built in cartx PR #37 (drawer design options), which isn't released yet. Once it ships they become settings.

## 5. What we need from the client

**Decisions**

| # | Question | Why it matters |
|---|---|---|
| 1 | Is the coupon input + "View All" OK until #2 ships? | §3 |
| 2 | Which coupon badge style is final? | §3 |
| 3 | Savings strip colours (the design's text is unreadable) | §3 |
| 4 | Haskoy for milestones: is there a licence or font file? Montserrat / Roboto in the panel and breakup: intended? | Fonts |
| 5 | Is "Order now and get it delivered by tomorrow" always true? It's fixed text. | Shown on every cart |
| 6 | Is "Extra 5% OFF on UPI" always true? It's fixed text. | Shown on every cart |
| 7 | Do they want "New Launches" (§4 #1)? Which products feed each block? | Scope |
| 8 | Viewers badge: what does the number mean? | §4 #7 |
| 9 | Should shoppers be able to remove a free gift? | §4 #8 |

**Content**

- Milestones: "Extra 10% Off at ₹499", "Get 1 Freebie at ₹599+", "Get 2 Freebies at ₹799+": the real thresholds, gift products, and how the 10% off is given.
- Discount codes (created in Shopify) with minimums, badge text and savings text.
- Recommended products for "Special price".
- Shipping rules for the price breakup. The Figma text is a placeholder, the same as the FREED design.

## 6. Suggested plan

1. **No development (now):** test theme, import, milestones, coupons, recommendations; QA against Figma; share the preview with the client together with this list.
2. **After PR #37 ships:** switch on the coupon row, code field, locked coupons, applied-coupon details and % off.
3. **On client approval:** "New Launches", Concern / Contains lines, viewers badge, removable gift.
4. **Go live** after sign-off (setup guide §9).
