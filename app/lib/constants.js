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
      secondary_text: '#9ca3af',
      border: '#f0f0f0',
      accent: '#16a34a',
      overlay_opacity: 0.45,
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
      continue_shopping: 'Continue shopping',
      continue_shopping_url: '',
      coupon_placeholder: 'Discount code',
      total_label: 'Total',
      subtotal_label: 'Subtotal',
    },
    layout: {
      drawer_width: 420,
      drawer_position: 'right',
      image_style: 'rounded',
      image_size: 'medium',
      density: 'comfortable',
      qty_style: 'bordered',
      show_variant_title: true,
      show_vendor: false,
    },
    sections: {
      show_coupons: true,
      show_upsells: true,
      show_progress_bar: true,
      show_ribbon: true,
      show_claim_gifts: true,
      order: ['progress_bar', 'claim_gifts', 'line_items', 'coupons', 'upsells', 'ribbon'],
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
    advanced: {
      custom_css: '',
    },
  },
}
