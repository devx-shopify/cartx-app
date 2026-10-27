# Cart drawer design settings

The Customize Cart settings added for design work (first used for the FREED cart). Each is a general option: its default keeps the drawer as it was before the setting existed, verified pixel-identical with every option at its default.

All keys live under the theme config's `drawer` object. Where a setting is declared:
- **Schema and defaults:** `DrawerConfigSchema` in `app/lib/schemas.js` and `DEFAULT_CONFIG.drawer` in `app/lib/constants.js` (defaults must match).
- **Storefront:** `_applyDrawerConfig` in `app/drawer-src/src/CartDrawer.jsx` (classes and labels), `applyDrawerSettings` in `app/drawer-src/src/helpers.js` (CSS variables), styles in `extensions/cart-max-drawer/assets/cartmax.css`.
- **Admin:** controls in `app/routes/app.cart-customizer.jsx`; the live preview in `app/components/CartPreview.jsx` (views: Filled, Empty, Coupons, Breakup).

**How "default = today" works:** colour and spacing settings default to `""` / `0`. Empty means the CSS variable is not set, and each stylesheet rule falls back to the value it always had (`var(--cartmax-success, #2fc01a)`). Layout options default to the old layout's value. Labels default to the old hard-coded text, and an emptied label falls back to the default (`_t()` in the drawer), so a button can never be blank.

## Colours (`drawer.colors`)

| Key | Customize Cart | Used for | Default |
|---|---|---|---|
| `add_button_bg`, `add_button_text` | Design → Colors | ADD buttons on gift cards and recommendations, panel APPLY | `""` (built-in colours) |
| `success` | Design → Colors | Line discount %, "Free", amount saved, price-breakup discounts | `""` (#2fc01a / accent) |
| `danger` | Design → Colors | "Add ₹X more", coupon errors, shipping value | `""` (#dc2626 / black) |
| `muted` | Design → Colors | Struck-through prices, price-breakup labels | `""` (#80828d / #5c6770) |
| `footer_bg` | Design → Colors | Checkout bar background | `""` (transparent) |

## Typography (`drawer.typography`)

| Key | Customize Cart | Default |
|---|---|---|
| `font_source`, `custom_font_url` | Design → Typography → Font | `theme`, `""`. The first `family=` in the URL becomes the drawer font. |
| `heading_font` | Design → Typography | `""` (body font). Titles, buttons, coupon codes. Needs loading in the font URL. |
| `heading_case` | Design → Typography | `normal` (`uppercase` available) |
| `heading_letter_spacing` | Typography → More options | `0` (px) |
| `item_font` | Typography → More options | `""`. Product names and prices. |

Both font settings fall back to `sans-serif` if the font fails to load.

## Layout (`drawer.layout`)

| Key | Customize Cart | Values (default first) |
|---|---|---|
| `drawer_width` | Design → Drawer | 320–600 (420) |
| `content_padding`, `content_padding_mobile` | Drawer → More options | 0–48 px (0 = each block's own padding; mobile 0 = desktop value) |
| `header_align` | Design → Drawer | `left`, `center` |
| `header_count_style` | Design → Drawer | `badge`, `brackets` "(2)", `hidden` |
| `image_ratio` | Design → Cart items | `square`, `portrait` (10:11) |
| `remove_style` | Design → Cart items | `icon` (bin), `text` ("REMOVE" on every line; minus stops at 1) |
| `variant_position` | Design → Cart items | `actions` (next to quantity), `above_title` |
| `variant_style` | Cart items → More options | `switcher`, `label` (plain, not tappable) |
| `gift_line_style` | Design → Cart items | `plain`, `highlight` |
| `qty_zero_pad` | Cart items → More options | `false` ("01" when on; screen readers get the real number) |
| `gift_show_price` | Cart items → More options | `false` ("~~₹999~~ Free" on gift cards) |
| `line_discount_show_icon` | Cart items → More options | `true` |
| `checkout_full_width` | Content → Checkout | `false` |
| `savings_show_icon` | Content → Checkout | `true` |
| `coupon_entry` | Features → Coupons | `input` (input + View All), `link` ("Apply Coupon ›" row) |
| `coupon_cards_layout` | Features → Coupons | `scroll`, `list` |
| `upsells_btn_position` | Features → Upsells | `below`, `over_image` |
| `upsells_show_discount` | Features → Upsells | `false` |

## Sections (`drawer.sections`)

| Key | Customize Cart | Default |
|---|---|---|
| `order` | Features → Section order | progress bar, claim gifts, offer cards, cart items, coupons, upsells. Unknown keys are ignored and missing ones appended (`normalizeSectionOrder`). `ribbon` is stored but renders outside the body. |
| `show_locked_coupons` | Features → Coupons | `false`. Coupons below their minimum show greyed out with "Add ₹X more" / "Add N more items", closest first. |
| `coupon_panel_input` | Features → Coupons | `false`. Code field at the top of Offers & Coupons. |
| `coupon_applied_style` | Features → Coupons | `chip`, `card` (REMOVE and "You saved ₹X") |

## Announcement bar and progress bar

| Key | Customize Cart | Default |
|---|---|---|
| `announcement_bar.bg_color`, `.text_color` | Features → Announcement bar | `""` (secondary accent / text) |
| `progress_bar.card_style` | Features → Progress bar | `plain`, `card` |
| `progress_bar.card_bg`, `.card_bg_end`, `.card_border` | Features → Progress bar | `""`. Two colours make a gradient. |
| `progress_bar.fill_color`, `.reached_dot_color` | Features → Progress bar | `""` (accent / primary) |
| `progress_bar.badge_image_url`, `.badge_corner` | Features → Progress bar | `""`, `top-left`. A URL (Shopify Files link), not an upload, because the drawer config is inlined on every page. |

`progress_bar.track_thickness` is deliberately not in `DEFAULT_CONFIG`: stores that never saved it get the stylesheet's 8px track.

## Text (`drawer.text`)

Every visible drawer string has a key. Content → Buttons & labels and Content → Price breakup show each default as the field's placeholder. Templates: `{amount}` (shop currency), `{count}`, `{pct}`.

Gift cards: `gift_add_button`, `gift_remove_button`, `claim_gift_button`, `gift_free_label`, `gift_adding`, `gift_claimed`, `gift_unavailable`, `claim_limit_reached`, `gift_paid_badge`, `gift_unavailable_notice`.
Cart items: `free_badge`, `line_remove`, `line_discount_format`, `out_of_stock`, `checkout_preparing`.
Coupons: `coupon_placeholder`, `coupon_view_all`, `coupon_apply`, `coupon_remove`, `coupon_invalid`, `coupon_failed`, `coupon_locked_message`, `coupon_locked_qty_message`, `coupon_saved_message`, `coupons_panel_title`, `coupons_panel_label`, `coupons_panel_placeholder`.
Upsells: `upsells_empty_heading`, `upsell_sold_out`, `upsell_adding`.
Price breakup: `price_breakup_link`, `price_breakup_title`, `pb_total_mrp`, `pb_discount_mrp`, `pb_coupon_discount`, `pb_shipping`, `pb_shipping_value`, `pb_total`, `shipping_note` (multi-line; shows a box and an info toggle).

`coupon_placeholder`: older configs saved `"Discount code"` while the input ignored the setting and showed "Apply Coupon". That exact value is treated as unset so those stores keep "Apply Coupon".

## Data the server now sends

- **Gift prices:** `gift_variant_data[].price` / `.compare_at_price` (major units, as Shopify returns them) are stored when an offer is saved (`fetchVariantData`), passed to the drawer in `offer_displays[].gifts[]`, and refreshed or backfilled by the `products/update` webhook (`reconcileConfig`, offer gifts only).
- **GraphQL cart:** `mapCart` fills `cart_level_discount_applications` from the Storefront `Cart.discountAllocations` field, so per-code savings work on both cart backends. That field is deprecated in 2026-01; its replacement (`lines.discountAllocations(lineLevelOnly: false)`) exists only from 2026-10, so switch when `apiVersion` is bumped.

## Cost

- The drawer config inlined on every storefront page (`data-drawer-config`) grows from about 1.7 KB to 3.9 KB with all defaults, mostly label text.
- `cartmax.js` grows by about 7 KB gzipped and `cartmax.css` by about 2 KB gzipped.

## Testing a change to these settings

- Unit tests: `app/drawer-src/src/helpers.test.js` (section order, templates, coupon shortfall, per-code savings), `app/lib/evaluate/triggers.server.test.js` and `app/lib/product-sync.server.test.js` (gift prices).
- Default look: render the drawer with every option at its default and compare against the base branch; it must be identical.
