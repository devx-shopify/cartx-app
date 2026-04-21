export const FROZEN_PAGES = ['/cart', '/checkout']
export const FROZEN_PAGE_PREFIXES = ['/checkouts/']

export const LINE_PROPS = {
  FREEBIE: '_freebie',
  CLAIMED: '_claimed',
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
}
