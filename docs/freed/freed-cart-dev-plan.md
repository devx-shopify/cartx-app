# FREED cart: development plan

This plans the cartx changes the FREED design needs beyond settings and CSS: the 🔧 and ⛔ items in `freed-cart-feasibility.md`. It also plans settings for what FREED does today through Custom CSS, where other stores would want the same thing (§3b). Every change is a **general drawer option**:
- Its default keeps today's behaviour, so other merchants see no change until they switch it on.
- FREED turns the options on through its settings file.

**Phases**

| Phase | Scope | Effort | Blocked on |
|---|---|---|---|
| A1 | FREED design features #1–#11, except #5 (dropped) | ~1.5–2 weeks | Client approval of which items to build |
| A2 | Customization settings #12–#22: FREED needs these today through Custom CSS, and other stores would use them too | ~2–2.5 weeks | Nothing (our call) |
| B | Judge.me stars on recommendations | M (2–4 days) | Client confirms Judge.me and turns on metafield sync |
| C | Pincode / delivery date / COD check | M–L (1–2 weeks) | Client's logistics provider and API access |

**Decisions (27 Oct 2026)**
- **Build everything in A1 and A2**, in one release. Each item is a general option that's off by default, so building it doesn't depend on client approval. The client's answers only set FREED's values.
- **FREED's values follow Figma.** Every 🟡 difference in the feasibility doc gets closed:
  - locked coupons on (#1), shipping box (#3), applied card (#4)
  - "Apply Coupon ›" link row, text REMOVE, "01" quantities (#8)
  - 600 px width (#10)
  - variant pill above the name (#22)
- **Exceptions to Figma:**
  - two shared milestone icons, not per-milestone icons (#5 dropped)
  - the savings strip says "on this order", because the amount is the whole cart's saving
  - the footer and the price breakup both show the real total after discounts (the Figma ₹1988 / ₹799 mismatch is a mock-up error)
- **No option needed for milestone spacing:** Figma spaces milestones evenly (equal segments with fixed ends), as cartx does.
- **Coupon starburst:** export the real starburst SVG from Figma into the FREED Custom CSS. It's FREED-only, so it doesn't need a setting.

**Build order:**
1. #12, #13
2. #9, #14
3. #1, #2, #4, #8
4. the rest

---

## 1. Ground rules

- **Branching:** branch `feat/drawer-design-options` from `development`, PR to `development`, then release `development` → `main`, the same way as the upsells release.
- **Defaults never change current behaviour.** Every new key has a default equal to today's output, and the drawer reads it with a fallback. Customize Cart import/export then round-trips automatically.
- **New settings are declared in three places:**
  - `DrawerConfigSchema` in `app/lib/schemas.js`
  - `DEFAULT_CONFIG.drawer` in `app/lib/constants.js`
  - the drawer's `_applyDrawerConfig` in `app/drawer-src/src/CartDrawer.jsx`
- **Customize Cart UI:** each new setting gets a control in `app/routes/app.cart-customizer.jsx`, and the admin preview (`app/components/CartPreview.jsx`) reflects it.
- **Pure logic goes in `app/drawer-src/src/helpers.js` with unit tests** in `helpers.test.js`. This covers locked-coupon amounts, per-code savings, label templates and zero-padding.
- **Rebuild the drawer bundle** after every drawer change, from the repo root: `node app/drawer-src/build.js`.
- **Deploys:** this release touches the server (schemas, admin, evaluate) **and** the drawer. Ship the server to Fly first, then `shopify app deploy`. The drawer tolerates missing fields, so the order isn't critical, but server first means new payload fields exist when the drawer arrives.
- **Quality gates:** `npm test`, `npm run lint` and the drawer helper tests must pass.

## 2. New settings at a glance

All under `drawer` (Customize Cart), unless noted.

| Key | Type | Default (today's behaviour) | FREED value | Item |
|---|---|---|---|---|
| `sections.show_locked_coupons` | boolean | `false` | `true` | #1 |
| `text.coupon_locked_message` | string | `Add {amount} more to apply this coupon` | same | #1 |
| `sections.coupon_panel_input` | boolean | `false` | `true` | #2 |
| `text.shipping_note` | string (multi-line) | `""` (hidden) | FREED's shipping rules | #3 |
| `sections.coupon_applied_style` | `chip` \| `card` | `chip` | `card` | #4 |
| `text.coupon_saved_message` | string | `You saved {amount} with this coupon` | same | #4 |
| *(server)* gift `price` / `compare_at_price` on offer cards | data | not sent | sent | #6 |
| `layout.upsells_show_discount` | boolean | `false` | `true` | #7 |
| `layout.remove_style` | `icon` \| `text` | `icon` | `text` | #8 |
| `layout.qty_zero_pad` | boolean | `false` | `true` | #8 |
| `layout.coupon_entry` | `input` \| `link` | `input` | `link` | #8 |
| `text.upsells_empty_heading` | string | `""` (uses the normal heading) | `Recommended for you` | #8 |
| `text.line_discount_format` | string | `{pct}% off` | `{pct}%` | #8 |
| *(typography)* font URL field in the UI | UI only | key exists, no UI | — | #9 |
| `layout.drawer_width` max | schema | 560 | 600 | #10 |
| `text.claim_gift_button` | string | `Claim gift` | `Add` | #11 → #12 |
| `text.*` (the hard-coded strings listed in #12) | string | today's text | FREED copy, e.g. `View Price Breakup` | #12 |
| `sections.order` | string[] | key exists, not used; today's order | progress, claims, offers, items, upsells, coupons | #13 |
| `typography.heading_font` | string (family name) | `""` (same as body) | `Anton` | #14 |
| `typography.heading_case` | `normal` \| `uppercase` | `normal` | `uppercase` | #14 |
| `typography.heading_letter_spacing` | number (px) | `0` | `2` | #14 |
| `layout.header_align` | `left` \| `center` | `left` | `center` | #15 |
| `layout.header_count_style` | `badge` \| `brackets` \| `hidden` | `badge` | `brackets` | #15 |
| `announcement_bar.bg_color` / `text_color` | colour | `""` (today: secondary accent / text) | `#18181B` / `#FFFFFF` | #16 |
| `progress_bar.card_style` | `plain` \| `card` | `plain` | `card` | #17 |
| `progress_bar.card_bg` / `card_bg_end` / `card_border` | colour | `""` | `#FFFFFF` / `#CFF665` / `#CFF665` | #17 |
| `progress_bar.fill_color` / `reached_dot_color` | colour | `""` (today: accent) | `#F238A7` | #17 |
| `progress_bar.badge_image_url` / `badge_corner` | URL / `top-left` \| `top-right` | `""` / `top-left` | sticker URL / `top-left` | #17 |
| `colors.add_button_bg` / `add_button_text` | colour | `""` (today's button colours) | `#CFF665` / `#000000` | #18 |
| `layout.upsells_btn_position` | `below` \| `over_image` | `below` | `over_image` | #18 |
| `layout.coupon_cards_layout` | `scroll` \| `list` | `scroll` | `list` | #19 |
| `layout.gift_line_style` | `plain` \| `highlight` | `plain` | `highlight` | #20 |
| `layout.savings_show_icon` / `line_discount_show_icon` | boolean | `true` | `false` | #21 |
| `layout.variant_position` | `actions` \| `above_title` | `actions` | `above_title` | #22 |
| `layout.variant_style` | `switcher` \| `label` | `switcher` | `switcher` | #22 |

## 3. Work items

### #1 Locked coupons with "Add ₹X more" — S–M
- **Today:** `_availableCoupons()` (CartDrawer.jsx) drops coupons whose `trigger_price` / `trigger_qty` the cart doesn't meet. The server already sends both fields from `resolveAvailableCoupons`.
- **Change:** when `show_locked_coupons` is on, return locked coupons too, flagged `locked: true` with the shortfall:
  - by price: `trigger_price − cart total`
  - by quantity: `trigger_qty − item count`
- **Render** (cart body and Offers & Coupons panel):
  - grey badge (`--locked` modifier class), no APPLY button
  - message from `coupon_locked_message`, with `{amount}` in shop currency, or "{n} more items" for quantity triggers
- **Order:** eligible coupons first, then locked ones by smallest shortfall.
- **Helper + tests:** `couponShortfall(coupon, cart)`.

### #2 Code input in the Offers & Coupons panel — S
- **Change:** in `renderCouponsPanel()`, when `coupon_panel_input` is on, render an input and APPLY button at the top. They reuse the existing `couponInput` state, `handleCouponApply` and `couponError`.
- **Existing bug to fix alongside:** the body input's placeholder is hard-coded to "Apply Coupon", so `text.coupon_placeholder` is ignored. Use the setting in both places.

### #3 Shipping info in the price breakup — S–M
- **Change:** when `text.shipping_note` is set:
  - an info icon button sits next to "Shipping Fee" in `renderPriceBreakup()`
  - the note renders in a grey box below the rows, shown by default
  - the icon toggles the box
- **Formatting:** plain text with line breaks preserved (`white-space: pre-line`). No HTML, so nothing to sanitise.
- **Admin:** a multi-line text field in a new "Price breakup" collapsible in Customize Cart.

### #4 Applied-coupon card — S–M
- **Change:** when `coupon_applied_style = card`, render each applied code as a full card instead of a chip:
  - the code's accent badge and code
  - a REMOVE text button
  - below the card, a line with a check icon and `coupon_saved_message`
- **Saved amount per code:** add up the line-level allocations whose title matches the code, plus the matching `cart_level_discount_applications[].total_allocated_amount`.
  - **AJAX cart:** both fields exist.
  - **GraphQL cart:** `mapCart` in `storefront-cart.js` sends `cart_level_discount_applications: []`. Map Storefront `discountAllocations` into it so the amount works on both cart backends.
- **Helper + tests:** `savingsForCode(cart, code)`.

### #5 Per-milestone icons — dropped
- **Decision (27 Oct 2026):** not building this. The progress bar keeps the two shared icons in Customize Cart → Progress bar: **Milestone icon** (not reached) and **Completed milestone icon** (reached). Every milestone uses them.
- **For FREED:** the dark gift and white gift icons from Figma, already set by the import file. The card stays spend-first ("Spend ₹999 / Free Delivery"). The truck and Arm Cuff icons in `assets/milestones/` are reference only.

### #6 Price on gift-picker cards — S
- **Today:** display-mode offers send `{ variant_id, title, image }` per gift (`triggers.server.js`). `gift_variant_data` has no price.
- **Change:**
  - save `price` and `compare_at_price` into `gift_variant_data` when the offer is saved (the resource picker already returns them)
  - pass both through in `to_display`
- **Render:** the card shows the struck price (compare-at, or price if there's no compare-at) followed by "Free".
- **Old offers:** offers saved before this have no price, so the card shows only the title, as today.
- **Keeping prices current:** extend the product-update webhook sync (`product-sync.server.js`, already used for upsells) to refresh these prices.

### #7 Discount % on recommendations — S
- **Change:** when `upsells_show_discount` is on and `compare_at_price > price`, show `{pct}%` in green after the prices in `renderUpsells()`. The data is already in the payload.

### #8 Small layout options — S each
| Option | Change |
|---|---|
| `remove_style = text` | Every line shows a "REMOVE" text button in the title row, at any quantity, and the minus button never turns into a bin |
| `qty_zero_pad` | Quantities under 10 show as "01". Display only; `aria-label`s keep the real number. |
| `coupon_entry = link` | The cart body shows one "Apply Coupon ›" row (label from `coupon_placeholder`) that opens the Offers & Coupons panel, in place of the input row. Best paired with #2. |
| `upsells_empty_heading` | Heading used for upsells on the empty cart. Replaces the FREED CSS trick. |
| `line_discount_format` | Template for the line discount badge, `{pct}` placeholder |

### #9 Font URL in Customize Cart — S
- **Change:** in the Typography section, add a "Font source" select (Theme / Custom) and a "Google Fonts URL" field. The keys already exist.
- **Note:** only the **first** `family=` in the URL becomes the drawer's base font (`_loadCustomFont`). The others load and can be used in Custom CSS. Say so in the help text.

### #10 Drawer width up to 600 px — S
- **Change:** raise the max to 600 in `DrawerConfigSchema` and on the Customize Cart slider (currently `max={560}`). Mobile stays full width.

### #11 Claim Gift button text — S
- **Change:** use `text.claim_gift_button` in `renderClaimGifts()` instead of the hard-coded "Claim gift", with a field in Customize Cart → Cart copy.
- **Note:** if A2 is built, this is part of #12.

## 3b. Customization settings (A2)

**The rule for this list:** the FREED Custom CSS can stay as long as it needs to. A change becomes a setting only when other stores are likely to want it too: hard-coded text, layout choices, colours tied to the wrong setting. Purely FREED styling stays in CSS (see the end of this section).

Every item follows the §1 ground rules: the default keeps today's output, there's a control in Customize Cart, and the admin preview reflects it.

### #12 Editable drawer text — S–M, **priority**
- **Today:** these strings are hard-coded in `CartDrawer.jsx`, so no store can translate or reword them:
  - Gift cards: "Add", "Remove", "Adding...", "Unavailable", "Claim gift", "Limit reached"
  - Gift line: "FREE"
  - Coupons: "View All", "Apply", "Offers & Coupons"
  - Upsells: "Sold out"
  - Footer: "VIEW PRICE BREAKUP"
  - Price breakup: "Total MRP", "Discount on MRP", "Coupon Discount", "Shipping Fee"
- **Change:**
  - add a `text.*` key for each one, with today's string as the default
  - group them in Customize Cart → Cart copy (gifts, coupons, footer, price breakup)
  - absorbs #11, and fixes the ignored `coupon_placeholder` (the hard-coded "Apply Coupon" placeholder)
- **Why general:** non-English stores and brand voice. Today the only way around it is a CSS text swap, like FREED's "View Price Breakup".

### #13 Section order — S–M, **priority**
- **Today:** `sections.order` is already in the schema and the defaults, but nothing reads it. The body order is fixed in the render. FREED reorders with CSS `order`.
- **Drawer:** render the body sections in the `sections.order` order. Unknown or missing keys fall back to today's order.
- **Admin:** a drag list in Customize Cart → Sections. The preview follows it.
- **Note:** upsells on an empty cart still render below the empty state.

### #14 Heading font and style — S–M, **priority**
- **Today:** one font for everything (the first family in the font URL). FREED sets Anton, uppercase and letter-spacing on about 20 selectors in CSS.
- **Change:**
  - `typography.heading_font`: a family loaded by the font URL (#9), or "same as body"
  - `typography.heading_case` and `heading_letter_spacing`
  - applied through new CSS variables to the drawer title, section headings, buttons, coupon codes and the checkout label
- **Depends on** #9 (font URL field).

### #15 Header layout — S
- `layout.header_align` (left / center) and `layout.header_count_style` (badge / brackets "(2)" / hidden).

### #16 Announcement bar colours — S
- **Today:** the bar's background is tied to the secondary accent, so a store can't change one without the other.
- **Change:** its own `bg_color` and `text_color`. Empty means today's colours.

### #17 Milestone card — M, **priority**
- **Change:**
  - `card_style: card` wraps the progress bar in a bordered, rounded card, with a solid or two-colour gradient background and a border colour
  - `fill_color` and `reached_dot_color`. Empty means today's accent.
  - a corner badge image (campaign stickers such as "SPECIAL OFFER"), top-left or top-right
- **Badge image is a URL field** (a Shopify Files link), not a data-URL upload. Raster stickers are big, and the drawer settings are copied into a metafield and inlined on every page.
- **For FREED:** this removes the 12.5 KB sticker embedded in the Custom CSS.

### #18 Add-button colours and position — S
- `colors.add_button_bg` / `add_button_text` for the ADD buttons on gift cards and recommendations. Today they borrow other colours.
- `layout.upsells_btn_position`: below the details (today) or over the image (FREED).

### #19 Coupon list layout — S
- `layout.coupon_cards_layout`: horizontal scroll (today) or a vertical list (FREED).

### #20 Gift line highlight — S
- `layout.gift_line_style: highlight` gives the free-gift line an accent border and a light accent background, so the gift stands out.

### #21 Small display fixes — S
- Don't render the empty-cart subtitle when it's blank. Today an empty `<p>` still takes up space.
- `layout.savings_show_icon` and `layout.line_discount_show_icon`, to hide the icons on the savings strip and the line discount badge.

### #22 Variant pill position and style — S
- **Today:** the variant pill sits next to the quantity and always opens the variant switcher. Turning off `show_variant_switcher` hides the pill completely, so the variant name disappears.
- **Change:**
  - `layout.variant_position`: next to the quantity (today) or above the product name (Figma)
  - `layout.variant_style`: `switcher` (tappable, opens the variant list; today) or `label` (plain text, not tappable)
  - `show_variant_switcher` keeps its meaning: off hides the pill
- **For FREED:** above the name, and still tappable, so shoppers can change size in the cart. Either value can be changed in Customize Cart.

### Stays in the FREED Custom CSS
These are FREED's own styling, and a setting for them wouldn't help other stores:
- the per-element type scale (sizes, weights, line heights) and Roboto as a third font
- spacing (32 px / 16 px sides) and image sizes (82 × 90)
- the coupon badge starburst and its colours
- the blue tick on reached milestones, the gift icon on the gift line, and price-breakup row colours
- mobile tweaks and shadows

## 4. Testing

- **Unit tests** (`helpers.test.js`):
  - `couponShortfall` (price, quantity, already eligible)
  - `savingsForCode` (line-level, cart-level, AJAX and GraphQL shapes)
  - zero-pad
  - discount template
  - section-order fallback (unknown, missing and duplicate keys)
- **Server:** `npm test` (Function suites) plus the existing analytics and upsell tests. Add a test for `to_display` gift prices.
- **Manual QA on the dev store** (`devx-dev.myshopify.com`):
  - every option **off** → the drawer looks and behaves exactly as before (regression)
  - every option **on** → matches the FREED Figma screens
  - check AJAX and GraphQL carts for #4
  - admin preview matches the storefront for each A2 setting
- **FREED test theme:** import the updated FREED settings and repeat the FREED QA checklist in the setup guide.

## 5. After the release: update the FREED kit

- **Settings file:** in `freed-cart-settings.json`, switch on the new options with the FREED values from §2 and set `drawer_width` to 600.
- **Custom CSS:** remove the workarounds the options replace:
  - the "View Price Breakup" text swap (keep only its styling)
  - the empty-cart heading trick
  - with A2: the section `order` rules, the header brackets, the Anton/uppercase rules (#14), the milestone card background and the embedded sticker (#17), the ADD button colours and position, the coupon list layout, the gift-line highlight, and the hidden icons
  - what's left is the FREED type scale and spacing (end of §3b)
- **Docs:** move the built items from 🔧 to ✅ in `freed-cart-feasibility.md`, and refresh the setup guide.

## 6. Phase B: Judge.me stars on recommendations

- **Needs from the client:** Judge.me installed, with its "sync reviews to Shopify product metafields" setting on. The ratings then live in `reviews.rating` (rating JSON) and `reviews.rating_count`.
- **Server:**
  - add both metafields to the product query used for upsell snapshots (`upsells.server.js`) and the default-list refresh
  - store `rating` and `rating_count` on `UpsellProduct`, which needs a Prisma migration
  - pass them through `buildUpsellsPayload`
- **Drawer:** the "★ 5.0  345 REVIEWS" row on the card, behind `layout.upsells_show_rating` (default off).
- **Freshness:** check whether Judge.me metafield writes trigger `products/update` webhooks. If they don't, refresh ratings when the snapshot is older than about 24 h.
- **No Judge.me API key** is needed.

## 7. Phase C: pincode / delivery date / COD

- **Needs from the client:** the provider (Shiprocket, Delhivery, ClickPost, …), API credentials, and the serviceability, COD and cut-off rules. If their product pages already have a pincode check, use the same provider.
- **Server:**
  - a new app-proxy route (e.g. `/apps/cartmax/pincode`) that calls the provider through an adapter
  - credentials kept in the shop's server-side settings, never sent to the storefront
  - a short cache per pincode and rate limiting (the existing `rate-limit.server.js`)
- **Admin:** a "Delivery check" section with provider, credentials, on/off and copy (heading, success, COD lines).
- **Drawer:** the black "Check Delivery Date" card.
  - pincode input and arrow button
  - result rows: delivery date, COD yes/no
  - the last pincode kept in `localStorage`
- **Estimate:** firm up once the provider's API docs are in hand.

## 8. Risks

| Risk | Mitigation |
|---|---|
| A new option changes the drawer for existing merchants | Defaults equal today's output, plus the options-off regression QA |
| Applied-coupon savings differ between AJAX and GraphQL carts | Map `discountAllocations` in `mapCart`, and test both |
| Customize Cart gets crowded with the new A2 settings | Group them under the existing sections; put the rarely used ones (badge corner, letter spacing) in an "Advanced" fold |
| Old offers lack gift prices | Show the title only; prices appear once the offer is saved again or the product-update webhook runs |
| Judge.me metafields don't trigger webhooks | Refresh ratings when the snapshot is older than a set age |
