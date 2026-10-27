import { z } from 'zod'

// Optional display metadata for page_handles entries, so the targeting UI
// can show product/collection names instead of raw paths.
const PageTargetSchema = z.object({
  handle: z.string().min(1), // matches a value in page_handles
  label: z.string().min(1),
  kind: z.enum(['page', 'product', 'collection']).optional(),
})

// Customer-tag-based targeting. Both arrays optional; if neither is set the
// rule applies to all customers (including guests).
//   required_any: customer must have at least one of these tags
//   excluded:     customer must have none of these tags
// Guests (no customer) match when required_any is empty.
const CustomerTagsTargetSchema = z.object({
  required_any: z.array(z.string().min(1)).optional(),
  excluded: z.array(z.string().min(1)).optional(),
}).optional()

const BarSchema = z.object({
  show: z.boolean(),
  label: z.string().min(1),
  sub_label: z.string().optional(),
  icon_url: z.string().optional(),
  top_message: z.string().optional(),
  stage_message: z.string().optional(),
  locked_product_id: z.string().optional(),
  locked_message: z.string().optional(),
  ribbon_message: z.string().optional(),
  unlocked_message: z.string().optional(),
})

export const OfferDiscountSchema = z.object({
  type: z.enum(['percentage', 'fixed_amount', 'fixed_price']),
  value: z.number().min(0),
  message: z.string().min(1).default('Free Gift'),
  max_cap: z.number().min(0).nullable().optional(),
})

export const OfferSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  name: z.string().min(1),
  source: z
    .object({
      type: z.enum(['product', 'collection']),
      product_variant_ids: z.array(z.string()).optional(),
      collection_id: z.string().optional(),
    })
    .optional(),
  trigger: z.object({
    price_threshold: z.number().positive().optional(),
    quantity_threshold: z.number().int().positive().optional(),
  }),
  discount: OfferDiscountSchema.optional(),
  reward: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('auto_add_gift'),
      // No `.min(1)` here — an ENABLED offer requires ≥1 gift (enforced by the
      // superRefine below), but a DRAFT (disabled) offer may be empty so a
      // webhook can park an offer whose gift product was deleted (see
      // product-sync.server.js) instead of failing validation and leaving it live.
      gift_variants: z.array(z.string()),
      gift_variant_data: z.array(z.object({
        variant_id: z.string(),
        product_id: z.string().optional(),
        title: z.string(),
        image: z.string(),
        // Major units as Shopify returns them ("999.00"); shown on gift cards.
        price: z.string().optional(),
        compare_at_price: z.string().optional(),
      })).optional(),
      quantity_per_variant: z.number().int().min(1),
      add_mode: z.enum(['auto', 'display']),
      min_offer_quantity: z.number().int().min(1),
    }),
    z.object({
      type: z.literal('bundle'),
      bundle_variants: z.array(z.string()),
      min_offer_quantity: z.number().int().min(1),
    }),
    z.object({
      type: z.literal('volume_discount'),
      discount_mode: z.enum(['fixed_total', 'percentage']),
      discount_priority: z.enum(['highest', 'lowest']).optional(),
      max_cart_quantity: z.number().int().positive().optional(),
      max_discount_amount: z.number().positive().optional(),
      tiers: z.array(z.object({
        quantity: z.number().int().min(1),
        value: z.number().positive(),
        message: z.string().optional(),
      })).min(1),
    }),
  ]),
  bar: BarSchema.optional(),
  page_handles: z.array(z.string()).min(1),
  page_targets: z.array(PageTargetSchema).optional(),
  customer_tags: CustomerTagsTargetSchema,
}).passthrough().superRefine((offer, ctx) => {
  // Enabled offers must have a complete reward; drafts may be incomplete.
  if (!offer.enabled) return
  if (offer.reward?.type === 'auto_add_gift' && (offer.reward.gift_variants || []).length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reward', 'gift_variants'], message: 'An enabled gift offer needs at least one gift variant' })
  }
  if (offer.reward?.type === 'bundle' && (offer.reward.bundle_variants || []).length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reward', 'bundle_variants'], message: 'An enabled bundle needs at least one variant' })
  }
})

export const CouponSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  shopify_discount_id: z.string().optional(),
  code: z.string().optional(),
  type_label: z.string().min(1),
  title: z.string().min(1),
  is_automatic: z.boolean().optional(),
  display_message: z.string().optional(),
  accent: z.string().optional(),
  trigger_qty: z.number().optional(),
  trigger_price: z.number().optional(),
  page_handles: z.array(z.string()).min(1),
  page_targets: z.array(PageTargetSchema).optional(),
  customer_tags: CustomerTagsTargetSchema,
}).passthrough()

export const ClaimGiftSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  name: z.string().min(1),
  trigger: z.object({
    type: z.enum(['price', 'quantity']),
    threshold: z.number().positive(),
  }),
  // No `.min(1)` — enforced only when enabled (superRefine); a draft may be empty
  // so a webhook can park a claim gift whose product was deleted.
  claimable_variants: z.array(z.string()),
  claimable_variant_data: z.array(z.object({
    variant_id: z.string(),
    product_id: z.string().optional(),
    title: z.string(),
    image: z.string(),
  })).optional(),
  max_claims: z.number().int().min(1).optional(),
  section_heading: z.string().min(1),
  page_handles: z.array(z.string()).min(1),
  page_targets: z.array(PageTargetSchema).optional(),
  customer_tags: CustomerTagsTargetSchema,
  bar: BarSchema.optional(),
}).passthrough().superRefine((cg, ctx) => {
  if (cg.enabled && (cg.claimable_variants || []).length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claimable_variants'], message: 'An enabled claim gift needs at least one variant' })
  }
})

export const VisualMilestoneSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  trigger: z.object({
    type: z.enum(['price', 'quantity']),
    threshold: z.number().positive(),
  }),
  label: z.string().min(1),
  sub_label: z.string().optional(),
  icon_url: z.string().optional(),
  page_handles: z.array(z.string()).min(1),
  page_targets: z.array(PageTargetSchema).optional(),
})

export const UpsellProductSchema = z.object({
  product_id: z.string().min(1),
  title: z.string().min(1),
  handle: z.string().optional(),
  image_url: z.string(),
  variant_id: z.string().min(1),
  price: z.string().min(1),
  compare_at_price: z.string().optional(),
})

// Hard ceiling for both caps: bounds the proxy payload and the import sheet width.
export const UPSELL_CAP_LIMIT = 20

// Ranking applied to the candidate products (rules + default list). Every one
// is opt-in: with all off, candidates keep their order (newest cart item first).
// Cart-based product rules replaced the earlier "pairing" strategy.
export const UpsellStrategiesSchema = z.object({
  // Rank by how well a product closes the gap to the next gift milestone.
  gap_filler: z.object({
    enabled: z.boolean().default(false),
    // How much overshoot is tolerable: 1 = a product costing twice the gap
    // scores at the floor. Higher values are more forgiving.
    overshoot_tolerance: z.number().min(0.1).max(10).default(1),
    cta_template: z.string().default('Add to unlock [[reward]]'),
  }).default({}),
  // Top the pool up from Shopify's own recommendations when it runs short.
  shopify_recs: z.object({
    enabled: z.boolean().default(false),
    intent: z.enum(['complementary', 'related']).default('complementary'),
    max_fill: z.number().int().min(1).max(8).default(2),
  }).default({}),
  // Rank by observed add-rate, ignoring products with too little data.
  performance: z.object({
    enabled: z.boolean().default(false),
    min_impressions: z.number().int().min(1).default(50),
  }).default({}),
}).default({})

export const UpsellSettingsSchema = z.object({
  enabled: z.boolean(),
  heading: z.string(),
  show_on_empty_cart: z.boolean().optional(),
  products: z.array(UpsellProductSchema),
  mode: z.enum(['static', 'cart_based']).default('static'),
  no_match: z.enum(['default', 'none']).default('default'),
  fill_with_default: z.boolean().default(false),
  sold_out: z.enum(['hide', 'show']).default('hide'),
  max_visible: z.number().int().min(1).max(UPSELL_CAP_LIMIT).default(4),
  max_per_trigger: z.number().int().min(1).max(UPSELL_CAP_LIMIT).default(10),
  strategies: UpsellStrategiesSchema,
})

// One product → recommended products mapping (admin save + import row).
export const UpsellRuleInputSchema = z.object({
  trigger_product_id: z.string().min(1),
  recommended_ids: z.array(z.string().min(1)).min(1).max(UPSELL_CAP_LIMIT),
  enabled: z.boolean().default(true),
})

export const EvaluateCartRequestSchema = z.object({
  cart: z.object({
    items: z.array(z.any()),
    total_price: z.number(),
    original_total_price: z.number().optional(),
    total_discount: z.number().optional(),
    item_count: z.number(),
    currency: z.string().optional(),
    cart_level_discount_applications: z.array(z.any()).optional(),
    discount_codes: z.array(z.any()).optional(),
  }),
  page: z.string(),
  customer: z
    .object({
      id: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  shop_id: z.string().min(1),
  theme_id: z.string().min(1),
  money_format: z.string().optional(),
})

export const DrawerConfigSchema = z.object({
  colors: z.object({
    primary: z.string().default('#1a1a1a'),
    primary_text: z.string().default('#ffffff'),
    background: z.string().default('#ffffff'),
    text: z.string().default('#1a1a1a'),
    secondary_text: z.string().default('#6b7280'),
    border: z.string().default('#f0f0f0'),
    accent: z.string().default('#16a34a'),
    secondary_accent: z.string().default('#ff4b7e'),
    overlay_opacity: z.number().min(0).max(1).default(0.45),
    savings_bg: z.string().default('#1a1a1a'),
    savings_text: z.string().default('#ffffff'),
    savings_amount: z.string().default('#22c55e'),
    // ADD buttons on gift cards and recommendations. Empty keeps today's colours.
    add_button_bg: z.string().default(''),
    add_button_text: z.string().default(''),
  }).default({}),
  shape: z.object({
    border_radius: z.enum(['none', 'small', 'medium', 'large', 'pill']).default('medium'),
    button_style: z.enum(['solid', 'outline']).default('solid'),
  }).default({}),
  typography: z.object({
    heading_size: z.enum(['small', 'medium', 'large']).default('medium'),
    body_size: z.enum(['small', 'medium', 'large']).default('medium'),
    font_source: z.enum(['theme', 'custom']).default('theme'),
    custom_font_url: z.string().default(''),
    // Headings, buttons and coupon codes. heading_font is a family name loaded
    // by custom_font_url; empty = same font as the body.
    heading_font: z.string().default(''),
    heading_case: z.enum(['normal', 'uppercase']).default('normal'),
    heading_letter_spacing: z.number().min(0).max(10).default(0),
  }).default({}),
  text: z.object({
    cart_title: z.string().default('Your Cart'),
    empty_title: z.string().default('Your cart is empty'),
    empty_subtitle: z.string().default("Looks like you haven't added anything yet"),
    empty_button: z.string().default('Continue shopping'),
    checkout_button: z.string().default('Checkout'),
    continue_shopping_url: z.string().default(''),
    coupon_placeholder: z.string().default('Apply Coupon'),
    total_label: z.string().default('Total'),
    subtotal_label: z.string().default('Subtotal'),
    savings_label: z.string().default('Congrats! You saved {amount} on this order.'),
    offer_cards_heading: z.string().default('Pick your free gift'),
    checkout_trust_message: z.string().default('Guaranteed safe & secure checkout'),
    // Strings that used to be hard-coded in the drawer. Defaults are the old text.
    gift_add_button: z.string().default('Add'),
    gift_remove_button: z.string().default('Remove'),
    gift_adding: z.string().default('Adding...'),
    gift_unavailable: z.string().default('Unavailable'),
    gift_claimed: z.string().default('Claimed'),
    gift_free_label: z.string().default('Free'),
    claim_gift_button: z.string().default('Claim gift'),
    claim_limit_reached: z.string().default('Limit reached'),
    free_badge: z.string().default('FREE'),
    line_remove: z.string().default('Remove'),
    line_discount_format: z.string().default('{pct}% off'),
    coupon_view_all: z.string().default('View All'),
    coupon_apply: z.string().default('Apply'),
    coupon_remove: z.string().default('Remove'),
    coupon_invalid: z.string().default('Invalid or inapplicable code'),
    coupon_locked_message: z.string().default('Add {amount} more to apply this coupon'),
    coupon_locked_qty_message: z.string().default('Add {count} more items to apply this coupon'),
    coupon_saved_message: z.string().default('You saved {amount} with this coupon'),
    coupons_panel_title: z.string().default('Offers & Coupons'),
    coupons_panel_label: z.string().default('Available Coupons'),
    coupons_panel_placeholder: z.string().default('Enter Coupon Code'),
    upsells_empty_heading: z.string().default(''),
    upsell_sold_out: z.string().default('Sold out'),
    price_breakup_link: z.string().default('VIEW PRICE BREAKUP'),
    price_breakup_title: z.string().default('Price Break Up'),
    pb_total_mrp: z.string().default('Total MRP'),
    pb_discount_mrp: z.string().default('Discount on MRP'),
    pb_coupon_discount: z.string().default('Coupon Discount'),
    pb_shipping: z.string().default('Shipping Fee'),
    pb_shipping_value: z.string().default('Calculated at checkout'),
    pb_total: z.string().default('Total Amount'),
    shipping_note: z.string().default(''),
  }).default({}),
  layout: z.object({
    drawer_width: z.number().min(320).max(600).default(420),
    drawer_position: z.enum(['right', 'left']).default('right'),
    image_style: z.enum(['square', 'rounded', 'circle']).default('rounded'),
    image_size: z.enum(['small', 'medium', 'large']).default('medium'),
    density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
    qty_style: z.enum(['bordered', 'minimal']).default('bordered'),
    show_compare_price: z.boolean().default(true),
    show_vendor: z.boolean().default(false),
    show_variant_switcher: z.boolean().default(true),
    show_remove_btn: z.boolean().default(true),
    empty_icon_url: z.string().default(''),
    empty_icon_size: z.enum(['small', 'medium', 'large']).default('medium'),
    empty_icon_color: z.string().default(''),
    upsells_card_layout: z.enum(['horizontal', 'vertical']).default('horizontal'),
    upsells_card_size: z.enum(['small', 'medium', 'large']).default('medium'),
    upsells_heading: z.string().default('YOU MAY ALSO LIKE'),
    upsells_heading_position: z.enum(['left', 'center']).default('left'),
    upsells_show_on_empty: z.enum(['filled', 'always']).default('filled'),
    upsells_btn_text: z.string().default('ADD TO CART'),
    upsells_show_compare_price: z.boolean().default(true),
    show_payment_icons: z.boolean().default(true),
    header_align: z.enum(['left', 'center']).default('left'),
    header_count_style: z.enum(['badge', 'brackets', 'hidden']).default('badge'),
    remove_style: z.enum(['icon', 'text']).default('icon'),
    qty_zero_pad: z.boolean().default(false),
    variant_position: z.enum(['actions', 'above_title']).default('actions'),
    variant_style: z.enum(['switcher', 'label']).default('switcher'),
    line_discount_show_icon: z.boolean().default(true),
    gift_line_style: z.enum(['plain', 'highlight']).default('plain'),
    gift_show_price: z.boolean().default(false),
    coupon_entry: z.enum(['input', 'link']).default('input'),
    coupon_cards_layout: z.enum(['scroll', 'list']).default('scroll'),
    upsells_show_discount: z.boolean().default(false),
    upsells_btn_position: z.enum(['below', 'over_image']).default('below'),
    savings_show_icon: z.boolean().default(true),
  }).default({}),
  sections: z.object({
    show_coupons: z.boolean().default(true),
    allow_multiple_coupons: z.boolean().default(false),
    show_upsells: z.boolean().default(true),
    show_progress_bar: z.boolean().default(true),
    show_ribbon: z.boolean().default(true),
    show_claim_gifts: z.boolean().default(true),
    show_offer_cards: z.boolean().default(true),
    show_locked_coupons: z.boolean().default(false),
    coupon_panel_input: z.boolean().default(false),
    coupon_applied_style: z.enum(['chip', 'card']).default('chip'),
    order: z.array(z.string()).default([
      'progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'coupons', 'upsells', 'ribbon',
    ]),
  }).default({}),
  behavior: z.object({
    auto_open_on_add: z.boolean().default(true),
    animation_style: z.enum(['slide', 'fade', 'none']).default('slide'),
    animation_speed: z.enum(['fast', 'normal', 'slow']).default('normal'),
    close_on_overlay_click: z.boolean().default(true),
    close_on_esc: z.boolean().default(true),
    confetti: z.boolean().default(true),
    confetti_lottie_url: z.string().default(''),
  }).default({}),
  advanced: z.object({
    custom_css: z.string().default(''),
  }).default({}),
  announcement_bar: z.object({
    text: z.string().default(''),
    type: z.enum(['static', 'marquee']).default('static'),
    // Empty = today's colours (secondary accent / text).
    bg_color: z.string().default(''),
    text_color: z.string().default(''),
  }).default({}),
  progress_bar: z.object({
    track_thickness: z.enum(['thin', 'normal', 'thick']).default('normal'),
    milestone_icon_svg: z.string().default(''),
    completed_icon_svg: z.string().default(''),
    badge_bg_color: z.string().default(''),
    badge_text_color: z.string().default(''),
    // 'card' wraps the bar in a bordered card; card_bg_end makes it a gradient.
    card_style: z.enum(['plain', 'card']).default('plain'),
    card_bg: z.string().default(''),
    card_bg_end: z.string().default(''),
    card_border: z.string().default(''),
    fill_color: z.string().default(''),
    reached_dot_color: z.string().default(''),
    // Corner sticker (e.g. "SPECIAL OFFER"). A URL, not a data URL: the drawer
    // config is inlined on every storefront page.
    badge_image_url: z.string().default(''),
    badge_corner: z.enum(['top-left', 'top-right']).default('top-left'),
  }).default({}),
}).default({})

export const ConfigSchema = z.object({
  offers: z.array(OfferSchema),
  coupons: z.array(CouponSchema),
  claim_gifts: z.array(ClaimGiftSchema),
  progress_bar: z.object({
    enabled: z.boolean(),
    all_complete_message: z.string(),
    collision_strategy: z.literal('merge'),
    visual_milestones: z.array(VisualMilestoneSchema),
    tier_order: z.array(z.string()).default([]),
  }),
  bottom_ribbon: z.object({
    enabled: z.boolean(),
    oos_message_override: z.string().optional(),
  }),
  cross_page_removal_behavior: z.enum(['silent', 'notice', 'modal']),
  upsells: UpsellSettingsSchema,
  drawer: DrawerConfigSchema,
})
