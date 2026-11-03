import { describe, test, expect } from 'vitest';
import { formatAmount } from './money-format.js';

describe('formatAmount', () => {
  test('follows the store format with thousands grouping', () => {
    expect(formatAmount(1111, '₹{{amount}}')).toBe('₹1,111.00');
    expect(formatAmount(1111, '₹{{amount_no_decimals}}')).toBe('₹1,111');
    expect(formatAmount(1234567.5, '€{{amount_with_comma_separator}}')).toBe('€1.234.567,50');
    expect(formatAmount(1134.65, "{{amount_with_apostrophe_separator}} CHF")).toBe("1'134.65 CHF");
    expect(formatAmount(1135, '{{ amount_no_decimals_with_space_separator }} kr')).toBe('1 135 kr');
    expect(formatAmount(99, 'Rs. {{amount}}')).toBe('Rs. 99.00');
  });

  test("'hide_zero' drops .00 only on whole amounts", () => {
    expect(formatAmount(1111, '₹{{amount}}', 'hide_zero')).toBe('₹1,111');
    expect(formatAmount(1111.5, '₹{{amount}}', 'hide_zero')).toBe('₹1,111.50');
  });

  test("'hide' always rounds", () => {
    expect(formatAmount(1111.5, '₹{{amount}}', 'hide')).toBe('₹1,112');
  });

  test('no-decimal store formats stay whole in every mode', () => {
    expect(formatAmount(499.5, '₹{{amount_no_decimals}}', 'store')).toBe('₹500');
  });

  test('falls back to a currency symbol without a store format', () => {
    expect(formatAmount(1500, '', 'store', 'INR')).toBe('₹1,500.00');
    expect(formatAmount(1500, '', 'hide_zero', 'INR')).toBe('₹1,500');
    expect(formatAmount(12, '')).toBe('$12.00');
    expect(formatAmount(-25, '₹{{amount}}', 'hide_zero')).toBe('₹-25');
  });

  test('strips HTML wrappers some stores keep in the format', () => {
    expect(formatAmount(10, '<span class=money>₹{{amount}}</span>')).toBe('₹10.00');
  });
});
