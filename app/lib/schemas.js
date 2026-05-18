import { z } from 'zod'

const AudienceSchema = z.enum(['all', 'signed_in', 'guest', 'vip_tag'])

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
  reward: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('auto_add_gift'),
      gift_variants: z.array(z.string()).min(1),
      quantity_per_variant: z.number().int().min(1),
      add_mode: z.enum(['auto', 'display']),
      min_offer_quantity: z.number().int().min(1),
    }),
    z.object({
      type: z.literal('bundle'),
      bundle_variants: z.array(z.string()).min(1),
      min_offer_quantity: z.number().int().min(1),
    }),
    z.object({
      type: z.literal('volume_discount'),
      discount_mode: z.enum(['fixed_total', 'percentage']),
      tiers: z.array(z.object({
        quantity: z.number().int().min(1),
        value: z.number().positive(),
        message: z.string().optional(),
      })).min(1),
    }),
  ]),
  bar: BarSchema.optional(),
  audience: AudienceSchema,
  page_handles: z.array(z.string()).min(1),
}).passthrough()

export const CouponSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  shopify_discount_id: z.string().optional(),
  code: z.string().optional(),
  type_label: z.string().min(1),
  title: z.string().min(1),
  is_automatic: z.boolean().optional(),
  display_message: z.string().optional(),
  audience: AudienceSchema,
  page_handles: z.array(z.string()).min(1),
}).passthrough()

export const ClaimGiftSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  name: z.string().min(1),
  trigger: z.object({
    type: z.enum(['price', 'quantity']),
    threshold: z.number().positive(),
  }),
  claimable_variants: z.array(z.string()).min(1),
  claimable_variant_data: z.array(z.object({
    variant_id: z.string(),
    title: z.string(),
    image: z.string(),
  })).optional(),
  max_claims: z.number().int().min(1).optional(),
  section_heading: z.string().min(1),
  audience: AudienceSchema,
  page_handles: z.array(z.string()).min(1),
  bar: BarSchema.optional(),
}).passthrough()

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
  audience: AudienceSchema,
})

export const UpsellProductSchema = z.object({
  product_id: z.string().min(1),
  title: z.string().min(1),
  image_url: z.string(),
  variant_id: z.string().min(1),
  price: z.string().min(1),
  compare_at_price: z.string().optional(),
})

export const EvaluateCartRequestSchema = z.object({
  cart: z.object({
    items: z.array(z.any()),
    total_price: z.number(),
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
    secondary_text: z.string().default('#9ca3af'),
    border: z.string().default('#f0f0f0'),
    accent: z.string().default('#16a34a'),
    overlay_opacity: z.number().min(0).max(1).default(0.45),
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
  }).default({}),
  text: z.object({
    cart_title: z.string().default('Your Cart'),
    empty_title: z.string().default('Your cart is empty'),
    empty_subtitle: z.string().default("Looks like you haven't added anything yet"),
    empty_button: z.string().default('Continue shopping'),
    checkout_button: z.string().default('Checkout'),
    continue_shopping: z.string().default('Continue shopping'),
    continue_shopping_url: z.string().default(''),
    coupon_placeholder: z.string().default('Discount code'),
    total_label: z.string().default('Total'),
    subtotal_label: z.string().default('Subtotal'),
  }).default({}),
  layout: z.object({
    drawer_width: z.number().min(320).max(560).default(420),
    drawer_position: z.enum(['right', 'left']).default('right'),
    image_style: z.enum(['square', 'rounded', 'circle']).default('rounded'),
    image_size: z.enum(['small', 'medium', 'large']).default('medium'),
    density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
    qty_style: z.enum(['bordered', 'minimal']).default('bordered'),
    show_variant_title: z.boolean().default(true),
    show_vendor: z.boolean().default(false),
  }).default({}),
  sections: z.object({
    show_coupons: z.boolean().default(true),
    show_upsells: z.boolean().default(true),
    show_progress_bar: z.boolean().default(true),
    show_ribbon: z.boolean().default(true),
    show_claim_gifts: z.boolean().default(true),
    order: z.array(z.string()).default([
      'progress_bar', 'claim_gifts', 'line_items', 'coupons', 'upsells', 'ribbon',
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
  upsells: z.object({
    enabled: z.boolean(),
    heading: z.string(),
    show_on_empty_cart: z.boolean().optional(),
    products: z.array(UpsellProductSchema),
  }),
  drawer: DrawerConfigSchema,
})
