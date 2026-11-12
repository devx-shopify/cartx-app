import { describe, test, expect } from 'vitest';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run.js';
import { DiscountClass } from '../generated/api';

// Unit tests for the cartx-active safety gate. These import the real run
// function directly (the fixture-based default.test.js is stale Shopify
// boilerplate and does not exercise cartx logic).

const CONFIG = {
  offers: [
    {
      offer_id: 'vol-1',
      variant_ids: ['111'],
      discount_mode: 'percentage',
      tiers: [{ quantity: 2, value: 20 }], // 20% off at qty >= 2
      message: 'Volume Deal',
    },
  ],
};

function buildInput(cartxValue) {
  return {
    cart: {
      cartxActive: cartxValue == null ? null : { value: cartxValue },
      lines: [
        {
          id: 'gid://shopify/CartLine/0',
          quantity: 2,
          merchandise: {
            __typename: 'ProductVariant',
            id: 'gid://shopify/ProductVariant/111',
          },
          cost: {
            amountPerQuantity: { amount: '100.0' },
            subtotalAmount: { amount: '200.0' },
          },
          freebieAttr: null,
        },
      ],
    },
    discount: {
      discountClasses: [DiscountClass.Product],
      metafield: { value: JSON.stringify(CONFIG) },
    },
  };
}

describe('cartx volume discount — safety gate', () => {
  test('applies the discount when _cartx attribute is "on"', () => {
    const result = cartLinesDiscountsGenerateRun(buildInput('on'));
    expect(result.operations.length).toBe(1);
    const candidates = result.operations[0].productDiscountsAdd.candidates;
    expect(candidates.length).toBe(1);
    expect(candidates[0].value.fixedAmount.amount).toBe('40.00'); // 20% of 200
  });

  test('does NOT apply when _cartx attribute is missing (the leak guard)', () => {
    const result = cartLinesDiscountsGenerateRun(buildInput(null));
    expect(result).toEqual({ operations: [] });
  });

  test('does NOT apply when _cartx attribute has a different value', () => {
    const result = cartLinesDiscountsGenerateRun(buildInput('off'));
    expect(result).toEqual({ operations: [] });
  });
});

describe('cartx volume discount — collection offers (product_ids)', () => {
  function line(n, variant, product, qty) {
    return {
      id: 'gid://shopify/CartLine/' + n,
      quantity: qty,
      merchandise: {
        __typename: 'ProductVariant',
        id: 'gid://shopify/ProductVariant/' + variant,
        product: { id: 'gid://shopify/Product/' + product },
      },
      cost: {
        amountPerQuantity: { amount: '100.0' },
        subtotalAmount: { amount: String(100 * qty) + '.0' },
      },
      freebieAttr: null,
    };
  }
  function input(offer, lines) {
    return {
      cart: { cartxActive: { value: 'on' }, lines },
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: { value: JSON.stringify({ offers: [offer] }) },
      },
    };
  }
  const OFFER = {
    offer_id: 'vol-col',
    variant_ids: [],
    product_ids: ['501'],
    discount_mode: 'percentage',
    tiers: [{ quantity: 2, value: 10 }],
    message: 'Collection Deal',
  };

  test('counts and discounts only products in the collection', () => {
    const result = cartLinesDiscountsGenerateRun(input(OFFER, [line(1, 11, 501, 2), line(2, 22, 999, 3)]));
    const candidates = result.operations[0].productDiscountsAdd.candidates;
    expect(candidates.length).toBe(1);
    expect(candidates[0].targets[0].cartLine.id).toBe('gid://shopify/CartLine/1');
  });

  test('other products do not help reach the tier', () => {
    const result = cartLinesDiscountsGenerateRun(input(OFFER, [line(1, 11, 501, 1), line(2, 22, 999, 3)]));
    expect(result.operations.length === 0 || result.operations[0].productDiscountsAdd.candidates.length === 0).toBe(true);
  });

  test('an offer without product_ids still covers every product (unchanged)', () => {
    const { product_ids, ...open } = OFFER;
    const result = cartLinesDiscountsGenerateRun(input(open, [line(1, 11, 501, 1), line(2, 22, 999, 1)]));
    expect(result.operations[0].productDiscountsAdd.candidates.length).toBe(2);
  });
});
