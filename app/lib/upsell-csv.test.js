import { describe, test, expect } from 'vitest'
import { parseCsv, toCsv, parseIdentifier, readImportRows } from './upsell-csv.js'

describe('parseCsv', () => {
  test('quotes, escaped quotes, commas and newlines inside quotes, CRLF, BOM', () => {
    const text = '﻿trigger,recommendation_1\r\n"a,b","say ""hi"""\r\n"multi\nline",x\n'
    expect(parseCsv(text)).toEqual([
      ['trigger', 'recommendation_1'],
      ['a,b', 'say "hi"'],
      ['multi\nline', 'x'],
    ])
  })
  test('drops blank lines and keeps trailing empty cells', () => {
    expect(parseCsv('a,b,\n\n,,\nc,,\n')).toEqual([['a', 'b', ''], ['c', '', '']])
  })
  test('round-trips through toCsv', () => {
    const rows = [['trigger', 'recommendation_1'], ['x,y', 'he said "no"']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})

describe('parseIdentifier', () => {
  test('handle, id, gid, URL, empty', () => {
    expect(parseIdentifier(' K9-Shampoo ')).toEqual({ kind: 'handle', value: 'k9-shampoo' })
    expect(parseIdentifier('8123456789')).toEqual({ kind: 'id', value: '8123456789' })
    expect(parseIdentifier('gid://shopify/Product/42')).toEqual({ kind: 'id', value: '42' })
    expect(parseIdentifier('https://shop.com/collections/all/products/k9-mask?variant=1')).toEqual({ kind: 'handle', value: 'k9-mask' })
    expect(parseIdentifier('  ')).toBeNull()
  })
})

describe('readImportRows', () => {
  test('reads trigger + recommendation columns in number order, ignores title columns', () => {
    const table = parseCsv('trigger,trigger_title,recommendation_2,recommendation_1,recommendation_1_title\nshampoo,Shampoo,mask,conditioner,Conditioner\n')
    const { rows, error } = readImportRows(table)
    expect(error).toBeUndefined()
    expect(rows).toHaveLength(1)
    expect(rows[0].line).toBe(2)
    expect(rows[0].trigger).toEqual({ kind: 'handle', value: 'shampoo' })
    expect(rows[0].recs.map((r) => r.ident.value)).toEqual(['conditioner', 'mask'])
  })
  test('skips empty recommendation cells', () => {
    const { rows } = readImportRows(parseCsv('trigger,recommendation_1,recommendation_2\na,,b\n'))
    expect(rows[0].recs.map((r) => r.raw)).toEqual(['b'])
  })
  test('header errors', () => {
    expect(readImportRows([]).error).toMatch(/empty/)
    expect(readImportRows(parseCsv('product,recommendation_1\na,b')).error).toMatch(/trigger/)
    expect(readImportRows(parseCsv('trigger,rec\na,b')).error).toMatch(/recommendation_1/)
  })
})
