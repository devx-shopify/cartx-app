import { formatAmount } from '../money-format.js'

/**
 * Resolve template placeholders like [[PRICE]], [[ price ]], [[CODE]], etc.
 * Case-insensitive, whitespace-tolerant inside brackets.
 * PRICE values are auto-formatted using the store's money_format.
 */
export function resolveTemplate(template, values = {}, moneyFormat, decimals) {
  if (!template) return ''

  let result = template
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`\\[\\[\\s*${key}\\s*\\]\\]`, 'gi')
    const formatted = key.toUpperCase() === 'PRICE'
      ? formatPrice(value, moneyFormat, decimals)
      : String(value ?? '')
    result = result.replace(pattern, formatted)
  }
  return result
}

function formatPrice(amount, moneyFormat, decimals) {
  if (amount == null) return ''
  if (isNaN(Number(amount))) return String(amount)
  return formatAmount(Number(amount), moneyFormat, decimals)
}
