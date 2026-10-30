import { describe, test, expect } from 'vitest'
import { isSellable, unsellableReason } from './sellable.js'

describe('isSellable', () => {
  test('active and unlisted products on the Online Store are sellable', () => {
    expect(isSellable({ status: 'ACTIVE', online_store: true })).toBe(true)
    expect(isSellable({ status: 'UNLISTED', online_store: true })).toBe(true)
  })

  test('draft, archived and off-Online-Store products are not', () => {
    expect(isSellable({ status: 'DRAFT', online_store: true })).toBe(false)
    expect(isSellable({ status: 'ARCHIVED' })).toBe(false)
    expect(isSellable({ status: 'ACTIVE', online_store: false })).toBe(false)
  })

  test('snapshots saved before status was stored count as sellable', () => {
    expect(isSellable({ title: 'Old gift' })).toBe(true)
    expect(isSellable(null)).toBe(false)
  })
})

describe('unsellableReason', () => {
  test('names why a product is hidden', () => {
    expect(unsellableReason({ status: 'DRAFT' })).toBe('Draft')
    expect(unsellableReason({ status: 'ARCHIVED' })).toBe('Archived')
    expect(unsellableReason({ status: 'ACTIVE', online_store: false })).toBe('Not on Online Store')
    expect(unsellableReason({ status: 'ACTIVE', online_store: true })).toBeNull()
  })
})
