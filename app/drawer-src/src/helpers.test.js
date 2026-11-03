import { describe, test, expect } from 'vitest'
import {
  hasFreebieMarker, showsQuantitySelector, giftChargedAmount,
  normalizeSectionOrder, BODY_SECTIONS, fillTemplate, formatQty, discountPercent,
  couponShortfall, splitCoupons, savingsForCode, milestonePositions, mapProgress,
  boldParts, variantText, giftOriginalPrice, buildFreebieTiers,
  showcaseFromAjax, showcaseFromStorefront, pickSpecialProducts,
} from './helpers.js'

describe('normalizeSectionOrder', () => {
  test('missing or empty order → today\'s order', () => {
    expect(normalizeSectionOrder(undefined)).toEqual(BODY_SECTIONS)
    expect(normalizeSectionOrder([])).toEqual(BODY_SECTIONS)
  })
  test('the stored default (with ribbon) → today\'s body order', () => {
    expect(normalizeSectionOrder(['progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'coupons', 'upsells', 'ribbon']))
      .toEqual(BODY_SECTIONS)
  })
  test('custom order is kept', () => {
    const order = ['progress_bar', 'claim_gifts', 'offer_cards', 'line_items', 'upsells', 'special_offer', 'coupons']
    expect(normalizeSectionOrder(order)).toEqual(order)
  })
  test('unknown and duplicate keys dropped, missing keys appended in default order', () => {
    expect(normalizeSectionOrder(['upsells', 'bogus', 'upsells', 'line_items']))
      .toEqual(['special_offer', 'upsells', 'line_items', 'progress_bar', 'claim_gifts', 'offer_cards', 'coupons'])
  })
  test('an order saved before Special Offer gets it just above the upsells', () => {
    expect(normalizeSectionOrder(['progress_bar', 'upsells', 'claim_gifts', 'offer_cards', 'line_items', 'coupons']))
      .toEqual(['progress_bar', 'special_offer', 'upsells', 'claim_gifts', 'offer_cards', 'line_items', 'coupons'])
  })
})

describe('fillTemplate', () => {
  test('fills known placeholders and leaves unknown ones', () => {
    expect(fillTemplate('Add {amount} more, {x}', { amount: '₹200' })).toBe('Add ₹200 more, {x}')
    expect(fillTemplate('{pct}%', { pct: 50 })).toBe('50%')
    expect(fillTemplate(undefined, {})).toBe('')
  })
})

describe('formatQty', () => {
  test('zero-pads single digits only when on', () => {
    expect(formatQty(1, true)).toBe('01')
    expect(formatQty(9, true)).toBe('09')
    expect(formatQty(10, true)).toBe('10')
    expect(formatQty(1, false)).toBe('1')
  })
})

describe('discountPercent', () => {
  test('rounds the saving against compare-at', () => {
    expect(discountPercent('999.00', '1999.00')).toBe(50)
    expect(discountPercent(10, 0)).toBe(0)
    expect(discountPercent(10, 8)).toBe(0)
  })
})

describe('couponShortfall', () => {
  test('price minimum unmet → amount short in minor units', () => {
    expect(couponShortfall({ trigger_price: 999 }, 50000, 1)).toEqual({ locked: true, by: 'price', amount: 49900, progress: 50000 / 99900 })
  })
  test('quantity minimum unmet → items short', () => {
    expect(couponShortfall({ trigger_qty: 3 }, 500000, 1)).toEqual({ locked: true, by: 'qty', count: 2, progress: 1 / 3 })
  })
  test('price wins when both are unmet', () => {
    expect(couponShortfall({ trigger_price: 100, trigger_qty: 3 }, 0, 0).by).toBe('price')
  })
  test('already eligible / no minimum → not locked', () => {
    expect(couponShortfall({ trigger_price: 100, trigger_qty: 1 }, 10000, 1)).toEqual({ locked: false })
    expect(couponShortfall({}, 0, 0)).toEqual({ locked: false })
  })
})

describe('splitCoupons', () => {
  const coupons = [
    { code: 'EASY', trigger_price: 0 },
    { code: 'FAR', trigger_price: 5000 },
    { code: 'NEAR', trigger_price: 600 },
    { code: 'APPLIED', trigger_price: 0 },
  ]
  const cart = { total_price: 50000, item_count: 1 }
  test('locked coupons hidden unless asked for', () => {
    const r = splitCoupons(coupons, cart, ['applied'], false)
    expect(r.available.map((c) => c.code)).toEqual(['EASY'])
    expect(r.locked).toEqual([])
  })
  test('locked coupons sorted closest-first, applied excluded', () => {
    const r = splitCoupons(coupons, cart, ['APPLIED'], true)
    expect(r.available.map((c) => c.code)).toEqual(['EASY'])
    expect(r.locked.map((c) => c.code)).toEqual(['NEAR', 'FAR'])
    expect(r.locked[0]._shortfall.amount).toBe(10000)
  })
})

describe('savingsForCode', () => {
  test('sums line-level allocations for the code (AJAX shape)', () => {
    const cart = {
      items: [
        { line_level_discount_allocations: [{ amount: 1500, discount_application: { title: 'SAVE20' } }] },
        { line_level_discount_allocations: [{ amount: 500, discount_application: { title: 'save20' } }, { amount: 99, discount_application: { title: 'AUTO' } }] },
      ],
      cart_level_discount_applications: [{ title: 'SAVE20', total_allocated_amount: 2000 }],
    }
    expect(savingsForCode(cart, 'SAVE20')).toBe(2000)
  })
  test('falls back to the cart-level application (GraphQL shape)', () => {
    const cart = {
      items: [{ line_level_discount_allocations: [] }],
      cart_level_discount_applications: [{ title: 'FLAT200', type: 'discount_code', total_allocated_amount: 20000 }],
    }
    expect(savingsForCode(cart, 'flat200')).toBe(20000)
  })
  test('0 for an unknown code or no cart', () => {
    expect(savingsForCode({ items: [] }, 'X')).toBe(0)
    expect(savingsForCode(null, 'X')).toBe(0)
  })
})

describe('hasFreebieMarker', () => {
  test('true for cartx _freebie', () => {
    expect(hasFreebieMarker({ _freebie: 'true' })).toBe(true)
  })
  test('true for a partner marker containing _freebie', () => {
    expect(hasFreebieMarker({ _gokwik_freebie: 'true' })).toBe(true)
  })
  test('false for unrelated props / empty / null', () => {
    expect(hasFreebieMarker({ _unique: '123' })).toBe(false)
    expect(hasFreebieMarker({})).toBe(false)
    expect(hasFreebieMarker(null)).toBe(false)
  })
})

describe('showsQuantitySelector', () => {
  test('paid line with no gift attribute → show', () => {
    expect(showsQuantitySelector({ final_price: 37500, properties: {} })).toBe(true)
  })

  test('freebie line → hide', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: { _freebie: 'true' } })).toBe(false)
  })

  test('partner freebie line → hide', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: { _gokwik_freebie: 'true' } })).toBe(false)
  })

  test('claim line → hide (both markers)', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: { _claimed: 'true' } })).toBe(false)
    expect(showsQuantitySelector({ final_price: 0, properties: { _cartmax_claim: 'true' } })).toBe(false)
  })

  test('NEW: zero-price line with NO attribute → hide', () => {
    expect(showsQuantitySelector({ final_price: 0, properties: {} })).toBe(false)
  })

  test('NEW: line discounted to 0 (base price > 0, no attribute) → hide', () => {
    expect(showsQuantitySelector({ price: 67500, final_price: 0, properties: {} })).toBe(false)
  })

  test('falls back to price when final_price is absent', () => {
    expect(showsQuantitySelector({ price: 500, properties: {} })).toBe(true)
    expect(showsQuantitySelector({ price: 0, properties: {} })).toBe(false)
  })

  test('missing item / no price fields → hide (safe default)', () => {
    expect(showsQuantitySelector(null)).toBe(false)
    expect(showsQuantitySelector({ properties: {} })).toBe(false)
  })
})

describe('giftChargedAmount', () => {
  test('is 0 when the gift discount landed (line is genuinely free)', () => {
    expect(giftChargedAmount({ final_line_price: 0, line_price: 0 })).toBe(0)
  })

  test('is 0 for an optimistic gift line with no price fields yet', () => {
    expect(giftChargedAmount({ properties: { _freebie: 'true' } })).toBe(0)
    expect(giftChargedAmount(null)).toBe(0)
  })

  test('reports the charge when the gift discount did NOT apply', () => {
    // Real soulflower case: BUY1GET1 code had "combines with product discounts"
    // off, so Shopify dropped our automatic gift discount and charged 262.50.
    expect(giftChargedAmount({ final_line_price: 26250, line_price: 26250 })).toBe(26250)
  })

  test('trusts final_line_price over the pre-discount line_price', () => {
    expect(giftChargedAmount({ final_line_price: 0, line_price: 26250 })).toBe(0)
  })

  test('falls back to line_price when final_line_price is absent', () => {
    expect(giftChargedAmount({ line_price: 5000 })).toBe(5000)
  })
})

describe('milestonePositions / mapProgress', () => {
  test('even spacing is unchanged', () => {
    expect(milestonePositions(3, 'even').map(Math.round)).toEqual([33, 67, 100])
    expect(mapProgress(50, 3, 'even')).toBe(50)
  })
  test('edges spacing puts milestones at both ends', () => {
    expect(milestonePositions(3, 'edges')).toEqual([0, 50, 100])
    expect(milestonePositions(1, 'edges')).toEqual([100])
  })
  test('edges fill lines up with the milestones', () => {
    expect(mapProgress(100 / 3, 3, 'edges')).toBe(0) // first milestone reached
    expect(mapProgress(200 / 3, 3, 'edges')).toBeCloseTo(50) // second reached
    expect(mapProgress(100, 3, 'edges')).toBe(100)
    expect(mapProgress(50, 3, 'edges')).toBeCloseTo(25) // halfway to the second
    expect(mapProgress(10, 3, 'edges')).toBe(0) // before the first: no room on the track
  })
})

describe('boldParts', () => {
  test('plain text is one plain part', () => {
    expect(boldParts('Add ₹300 more')).toEqual([{ text: 'Add ₹300 more', bold: false }])
  })
  test('**pairs** become bold parts', () => {
    expect(boldParts('Add **₹300 more** to get **1 freebie**')).toEqual([
      { text: 'Add ', bold: false },
      { text: '₹300 more', bold: true },
      { text: ' to get ', bold: false },
      { text: '1 freebie', bold: true },
    ])
  })
  test('an unclosed ** stays as typed', () => {
    expect(boldParts('a **b** c **d')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c ', bold: false },
      { text: '**d', bold: false },
    ])
  })
  test('null and empty are safe', () => {
    expect(boldParts(null)).toEqual([{ text: '', bold: false }])
  })
})

describe('variantText', () => {
  const item = {
    variant_title: 'Red / M',
    options_with_values: [{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'M' }],
  }
  test('off: the plain variant title', () => {
    expect(variantText(item, false)).toBe('Red / M')
  })
  test('on: option names before each value', () => {
    expect(variantText(item, true)).toBe('Color: Red / Size: M')
  })
  test('values follow variant_title after a variant swap', () => {
    expect(variantText({ ...item, variant_title: 'Blue / L' }, true)).toBe('Color: Blue / Size: L')
  })
  test('falls back to the title when options do not line up', () => {
    expect(variantText({ ...item, variant_title: 'Red' }, true)).toBe('Red')
    expect(variantText({ variant_title: 'Red' }, true)).toBe('Red')
  })
  test('skips the placeholder "Title" option name', () => {
    expect(variantText({ variant_title: 'Default', options_with_values: [{ name: 'Title', value: 'Default' }] }, true)).toBe('Default')
  })
  test('no variant title: empty', () => {
    expect(variantText({}, true)).toBe('')
  })
})

describe('giftOriginalPrice', () => {
  test('off: nothing to strike', () => {
    expect(giftOriginalPrice({ original_line_price: 199900 }, false)).toBe(0)
  })
  test('on: the line price before discount', () => {
    expect(giftOriginalPrice({ original_line_price: 199900 }, true)).toBe(199900)
  })
  test('on, but a zero-price gift: nothing to strike', () => {
    expect(giftOriginalPrice({ original_line_price: 0 }, true)).toBe(0)
    expect(giftOriginalPrice(null, true)).toBe(0)
  })
})

describe('buildFreebieTiers', () => {
  const offers = [
    { id: 'o1', reward: { type: 'auto_add_gift', gift_variant_data: [{ title: 'Lip Balm', image: 'https://cdn/a.jpg' }] } },
    { id: 'o2', reward: { type: 'auto_add_gift', gift_variant_data: [{ title: 'Pouch', image: 'https://cdn/b.jpg' }] } },
    { id: 'o3', reward: { type: 'auto_add_gift', gift_variant_data: [{ title: 'Mist' }] } },
    { id: 'v1', reward: { type: 'volume_discount' } },
  ];
  const bar = {
    tiers: [
      { id: 'o3', threshold: 1999, trigger_type: 'price', state: 'inactive' },
      { id: 'o1', threshold: 499, trigger_type: 'price', state: 'active' },
      { id: 'o2', threshold: 999, trigger_type: 'price', state: 'next' },
      { id: 'v1', threshold: 3, trigger_type: 'quantity', state: 'inactive' },
    ],
  };

  test('counts gift tiers only and lists locked gifts by threshold', () => {
    const r = buildFreebieTiers(bar, offers, 697, 2, 'all');
    expect(r.total).toBe(3);
    expect(r.unlocked).toBe(1);
    expect(r.locked.map((g) => g.title)).toEqual(['Pouch', 'Mist']);
    expect(r.locked[0]).toMatchObject({ image: 'https://cdn/b.jpg', by: 'price', remaining: 302 });
  });

  test('finds a gift offer merged behind another offer at the same threshold', () => {
    const r = buildFreebieTiers(
      { tiers: [{ id: 'v1', promotion_id: 'v1', threshold: 999, trigger_type: 'price', state: 'next',
        sources: [{ id: 'v1', promotion_id: 'v1' }, { id: 'o2', promotion_id: 'o2' }] }] },
      offers, 697, 2, 'all');
    expect(r.total).toBe(1);
    expect(r.locked[0]).toMatchObject({ title: 'Pouch', remaining: 302 });
  });

  test("'next' keeps only the closest locked gift", () => {
    expect(buildFreebieTiers(bar, offers, 697, 2, 'next').locked.map((g) => g.title)).toEqual(['Pouch']);
  });

  test('matches merged tiers by promotion_id and counts quantity tiers in items', () => {
    const r = buildFreebieTiers(
      { tiers: [{ id: 'm1', promotion_id: 'o1', threshold: 3, trigger_type: 'quantity', state: 'next', label: 'Gift' }] },
      offers, 0, 1, 'all',
    );
    expect(r.locked[0]).toMatchObject({ title: 'Lip Balm', by: 'quantity', remaining: 2 });
  });

  test('is empty without a bar', () => {
    expect(buildFreebieTiers(null, offers, 0, 0, 'all')).toEqual({ total: 0, unlocked: 0, locked: [] });
  });
});

describe('Special Offer showcase', () => {
  test('AJAX product: first available variant, cents to major units, compare only when higher', () => {
    const c = showcaseFromAjax({ id: 7, handle: 'balm', title: 'Balm', available: true, featured_image: '//cdn/b.jpg',
      variants: [{ id: 1, available: false, price: 20000, compare_at_price: 35000 }, { id: 2, available: true, price: 20300, compare_at_price: 35000 }] })
    expect(c).toEqual({ product_id: '7', handle: 'balm', title: 'Balm', image_url: '//cdn/b.jpg', price: 203, compare_at_price: 350, variant_id: '2', available: true })
    expect(showcaseFromAjax({ id: 8, available: true, variants: [{ id: 3, available: true, price: 500, compare_at_price: 500 }] }).compare_at_price).toBe(null)
  })
  test('Storefront node: gids stripped, sold-out product marked unavailable', () => {
    const c = showcaseFromStorefront({ id: 'gid://shopify/Product/9', handle: 'mist', title: 'Mist', availableForSale: false, featuredImage: { url: 'u' },
      variants: { nodes: [{ id: 'gid://shopify/ProductVariant/4', availableForSale: false, price: { amount: '299.0' }, compareAtPrice: { amount: '499.0' } }] } })
    expect(c).toMatchObject({ product_id: '9', variant_id: '4', price: 299, compare_at_price: 499, available: false })
  })
  test('pick skips sold-out, in-cart and duplicate products and caps the count', () => {
    const p = (id, available = true) => ({ product_id: id, variant_id: 'v' + id, available })
    const picked = pickSpecialProducts([p('1'), p('2', false), p('3'), p('1'), p('4'), p('5')], [{ product_id: 3 }], 3)
    expect(picked.map((x) => x.product_id)).toEqual(['1', '4', '5'])
  })
})
