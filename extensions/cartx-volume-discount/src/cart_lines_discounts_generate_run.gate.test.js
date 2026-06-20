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
