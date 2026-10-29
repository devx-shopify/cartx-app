# Just Herbs cart design: what cartx can and can't do

This doc compares the Just Herbs cart design (Figma "Just Herbs", section "Cart": 5 mobile screens, 409 px) with what cartx can do. It covers:
- what ships with settings and Custom CSS,
- where the result differs a little from the design,
- what needs cartx development,
- what depends on the client.

**Status (29 Oct 2026):** the import file (`justherbs-cart-settings.json`) uses the cartx drawer design options **released on 29 Oct** (release PR #38). The coupon row, code field, locked coupons, applied-coupon details, discount % on cards, item cards, block backgrounds and sublines are now settings, so the Custom CSS (`justherbs-cart-custom.css`) holds only the type scale, the milestone band, button shapes, the ticket-shaped applied coupon and the gift sticker. Both pass the released settings validation and were rendered with the released drawer. They haven't been checked on the client's storefront yet.

The previous version of this kit, made for the drawer before the release, is in the `justherbs` branch history (commit `8ba0646`).

**Key**

| | Meaning |
|---|---|
| ✅ | Ready: settings plus the Custom CSS |
| 🟡 | Close: works, with a small difference from the design |
| 🔧 | Needs cartx development |
| ❓ | Client decision or input needed |

The design is mobile only. On desktop the drawer uses the same look at 420 px wide.

---

## 1. At a glance

| Design area | Status | Notes |
|---|---|---|
| Header "Cart" with red count badge | ✅ | |
| Milestone band: message, rounded track, gift-box icons, labels and thresholds, edge-to-edge | ✅ / 🟡 | Spacing and colours are settings; see §3 for bold words |
| Cart item cards: image, name, "Pack of 1 ⌄", price, MRP, "42% Off", quantity | ✅ / 🟡 | Cards are a setting; "Contains: …" line not available |
| Free gift line: mint card, gift sticker, "Free Gift" | ✅ / 🟡 | No bin on the gift line |
| "Coupons / Apply now and save extra! ›" row | ✅ | Setting |
| Applied coupon: ticket card, "You can save…", Remove, "You saved ₹X with this coupon" | ✅ | Setting + CSS ticket shape |
| Offers & Coupons view: code field, "All Coupons", cards, locked coupons with "Add ₹X more" | ✅ | Settings |
| "Special price" block: pink, delivery line, price pill, "42% Off", green ADD | ✅ / 🟡 | Background, subline and % are settings; no viewers badge or "Concern" line |
| "New Launches" block (blue, second list) | 🔧 | cartx shows one recommendations block |
| Savings strip | ✅ / ❓ | Colours changed for readability |
| Total, "View details", green Checkout with "Extra 5% OFF on UPI" and UPI icons | ✅ | Subline and full width are settings |
| Price breakup with info icon and shipping-rules box | ✅ | Shipping rules are a setting (placeholder text) |
| Fonts | 🟡 / ❓ | Figtree everywhere; Haskoy (milestones) isn't on Google Fonts |

## 2. Ready (✅)

- **Header:** "Cart" with a red count badge, soft shadow.
- **Milestone band:**
  - mint background, top message from the next promotion
  - 10 px rounded track with green fill
  - colour gift box when reached, grey when not (Figma icons)
  - edge-to-edge milestones with small label and larger threshold
- **Cart items:** bordered cards, 60 px image, "Pack of 1 ⌄" (variant switcher), ₹203 / ~~₹350~~ / "42% Off".
- **Free gift line:** mint card with the gift sticker and green "Free Gift".
- **Coupons:**
  - "Coupons / Apply now and save extra! ›" row opening Offers & Coupons
  - code field with "Apply" in the view, "All Coupons" list with green Apply
  - coupons not yet reachable with red "Add ₹X more to apply this coupon"
  - applied coupon as a ticket card with "You can save…" and "Remove", then "You saved ₹X with this coupon"
- **"Special price":** pink block, "Order now and get it delivered by tomorrow" with the truck, white cards with pink price pill, MRP, "42% Off", green ADD.
- **Footer:** savings strip, total with "View details", full-width green Checkout with "Extra 5% OFF on UPI" and UPI icons.
- **Price breakup:** the design's rows and colours, info icon, shipping-rules box.

## 3. Small differences (🟡)

| Item | Design | cartx | Fix if needed |
|---|---|---|---|
| Free gift line | Bin icon (shopper can remove the gift) | No bin: offer gifts are added and removed by the offer rules | 🔧 #3 |
| Cart item description | "Contains: 8 shades x Pack of 1" | Not available (product data cartx doesn't read) | 🔧 #2 |
| Milestone message | Only "₹296" and "an extra 10% off" bold | Whole line semibold | — |
| Milestone progress before the first milestone | — | With edge-to-edge spacing the first milestone sits at the start, so the track stays empty until it's reached (the message still shows the amount) | — |
| Recommendation cards | Viewers badge ("👁 100"), "Concern: Oil & dirt" | Image, name, price pill, MRP, %, ADD | 🔧 #2, #4 |
| Coupon badges | Three badge styles drawn | One text badge ("20% OFF") | ❓ pick one |
| Savings strip | Near-white text on pale green (only "₹91" readable) | Dark text, green amount | ❓ |
| Fonts | Figtree, Haskoy for milestones, some Montserrat / Roboto | Figtree everywhere | ❓ |

## 4. Needs cartx development (🔧)

| # | Feature | What it does | Effort | Blocked on |
|---|---|---|---|---|
| 1 | Second recommendations block | "New Launches": its own product list and a small vertical card (image on top, dark info panel, ADD over the card) | M–L | Which products feed it |
| 2 | Product metafield lines | "Contains…" on cart items, "Concern…" on recommendation cards, read from metafields the client fills in | M | Metafield names + content |
| 3 | Removable free gift | Bin on the gift line; cartx remembers not to re-add it | M | Agreed behaviour |
| 4 | Viewers badge | "👁 100" on recommendation cards | M–L | What the number means and its source |

## 5. What we need from the client

**Decisions**

| # | Question | Why it matters |
|---|---|---|
| 1 | Which coupon badge style is final? | §3 |
| 2 | Savings strip colours (the design's text is unreadable) | §3 |
| 3 | Haskoy for milestones: licence or font file? Montserrat / Roboto in the panel and breakup: intended? | Fonts |
| 4 | Is "Order now and get it delivered by tomorrow" always true? | Shown on every cart (a setting) |
| 5 | Is "Extra 5% OFF on UPI" always true? | Shown on every cart (a setting) |
| 6 | Do they want "New Launches"? Which products feed each block? | §4 #1 |
| 7 | Viewers badge: what does the number mean? | §4 #4 |
| 8 | Should shoppers be able to remove a free gift? | §4 #3 |

**Content**

- Milestones: "Extra 10% Off at ₹499", "Get 1 Freebie at ₹599+", "Get 2 Freebies at ₹799+": real thresholds, gift products, and how the 10% off is given.
- Discount codes (created in Shopify) with minimums, badge text and savings text.
- Recommended products for "Special price".
- Shipping rules for the price breakup. The Figma text is a placeholder.

## 6. Plan

1. **Now:** test theme, import, milestones, coupons, recommendations; QA against Figma; share the preview with the client with this list.
2. **On client approval:** "New Launches", Contains / Concern lines, removable gift, viewers badge.
3. **Go live** after sign-off (setup guide §9).

## 7. Summary

- With the 29 Oct release, nearly all of the Just Herbs design is settings, including the coupon row, code field, locked coupons, applied-coupon details and item cards.
- The Custom CSS keeps only the type scale, milestone band, button shapes, ticket coupon and gift sticker.
- Four features need development and client input: "New Launches", product metafield lines, removable gift, viewers badge.
- Open client decisions: coupon badge, savings strip colours, fonts, and the two fixed promises (delivery, UPI offer).
- Next step: QA on the client's test theme.
