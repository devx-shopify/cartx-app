export const FROZEN_PAGES = ['/cart', '/checkout']
export const FROZEN_PAGE_PREFIXES = ['/checkouts/']

export function isFrozenHandle(handle) {
  if (FROZEN_PAGES.includes(handle)) return true
  return FROZEN_PAGE_PREFIXES.some((p) => handle.startsWith(p))
}

export const LINE_PROPS = {
  FREEBIE: '_freebie',
  CLAIMED: '_claimed',
  CARTMAX_CLAIM: '_cartmax_claim',
  ACQUIRED_ON_PAGE: '_acquired_on_page',
  OFFER_ID: '_offer_id',
}

export const AUDIENCES = ['all', 'signed_in', 'guest', 'vip_tag']

export const DEFAULT_CONFIG = {
  offers: [],
  coupons: [],
  claim_gifts: [],
  progress_bar: {
    enabled: true,
    all_complete_message: 'You unlocked all rewards!',
    collision_strategy: 'merge',
    visual_milestones: [],
    tier_order: [],
  },
  bottom_ribbon: {
    enabled: true,
    oos_message_override: '',
  },
  cross_page_removal_behavior: 'silent',
  upsells: {
    enabled: false,
    heading: 'You may also like',
    show_on_empty_cart: false,
    products: [],
  },
  drawer: {
    colors: {
      primary: '#1a1a1a',
      primary_text: '#ffffff',
      background: '#ffffff',
      text: '#1a1a1a',
      secondary_text: '#6b7280',
      border: '#f0f0f0',
      accent: '#16a34a',
      secondary_accent: '#ff4b7e',
      overlay_opacity: 0.45,
      savings_bg: '#1a1a1a',
      savings_text: '#ffffff',
      savings_amount: '#22c55e',
    },
    shape: {
      border_radius: 'medium',
      button_style: 'solid',
    },
    typography: {
      heading_size: 'medium',
      body_size: 'medium',
      font_source: 'theme',
      custom_font_url: '',
    },
    text: {
      cart_title: 'Your Cart',
      empty_title: 'Your cart is empty',
      empty_subtitle: "Looks like you haven't added anything yet",
      empty_button: 'Continue shopping',
      checkout_button: 'Checkout',
      continue_shopping_url: '',
      coupon_placeholder: 'Discount code',
      total_label: 'Total',
      subtotal_label: 'Subtotal',
      savings_label: 'Congrats! You saved {amount} on this order.',
      offer_cards_heading: 'Pick your free gift',
      checkout_trust_message: 'Guaranteed safe & secure checkout',
    },
    layout: {
      drawer_width: 420,
      drawer_position: 'right',
      image_style: 'rounded',
      image_size: 'medium',
      density: 'comfortable',
      qty_style: 'bordered',
      show_vendor: false,
      show_variant_switcher: true,
      show_remove_btn: true,
      show_payment_icons: true,
    },
    sections: {
      show_coupons: true,
      allow_multiple_coupons: false,
      show_upsells: true,
      show_progress_bar: true,
      show_ribbon: true,
      show_claim_gifts: true,
      show_offer_cards: true,
      order: ['progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'coupons', 'upsells', 'ribbon'],
    },
    behavior: {
      auto_open_on_add: true,
      animation_style: 'slide',
      animation_speed: 'normal',
      close_on_overlay_click: true,
      close_on_esc: true,
      confetti: true,
      confetti_lottie_url: '',
    },
    checkout: {
      // 'native' = Shopify checkout. 'custom' = hand off to a provider preset
      // (cartx-shipped open-logic) using the per-brand config below.
      mode: 'native',
      provider: 'gokwik',   // which preset, when mode === 'custom'
      gokwik: {
        mid: '',                      // GoKwik merchant id (per-brand, from onboarding)
        environment: 'production',    // 'production' | 'sandbox'
      },
    },
    advanced: {
      custom_css: '',
    },
  },
}
