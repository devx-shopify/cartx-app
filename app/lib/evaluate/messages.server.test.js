import { describe, test, expect } from 'vitest'
import { resolveTemplate } from './messages.server.js'

describe('resolveTemplate price formatting', () => {
  test('uses the store format with grouping', () => {
    expect(resolveTemplate('Add [[ price ]] more', { PRICE: 1500 }, '₹{{amount}}')).toBe('Add ₹1,500.00 more')
    expect(resolveTemplate('Add [[PRICE]] more', { PRICE: 1500 }, '₹{{amount_no_decimals}}')).toBe('Add ₹1,500 more')
  })

  test('applies the drawer price_decimals mode', () => {
    expect(resolveTemplate('Add [[ price ]] more', { PRICE: 296 }, '₹{{amount}}', 'hide_zero')).toBe('Add ₹296 more')
    expect(resolveTemplate('Add [[ price ]] more', { PRICE: 296.5 }, '₹{{amount}}', 'hide')).toBe('Add ₹297 more')
  })
})
