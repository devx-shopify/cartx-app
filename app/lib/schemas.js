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

export const ConfigSchema = z.object({
  offers: z.array(OfferSchema),
  coupons: z.array(CouponSchema),
  claim_gifts: z.array(ClaimGiftSchema),
  progress_bar: z.object({
    enabled: z.boolean(),
    all_complete_message: z.string(),
    collision_strategy: z.literal('merge'),
    visual_milestones: z.array(VisualMilestoneSchema),
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
})
