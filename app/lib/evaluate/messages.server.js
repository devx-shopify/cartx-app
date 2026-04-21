/**
 * Resolve template placeholders like [[PRICE]], [[ price ]], [[CODE]], etc.
 * Case-insensitive, whitespace-tolerant inside brackets.
 * PRICE values are auto-formatted using the store's money_format.
 */
export function resolveTemplate(template, values = {}, moneyFormat) {
  if (!template) return ''

  let result = template
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`\\[\\[\\s*${key}\\s*\\]\\]`, 'gi')
    const formatted = key.toUpperCase() === 'PRICE'
      ? formatPrice(value, moneyFormat)
      : String(value ?? '')
    result = result.replace(pattern, formatted)
  }
  return result
}

function formatPrice(amount, moneyFormat) {
  if (amount == null) return ''
  const num = Number(amount)
  if (isNaN(num)) return String(amount)

  const amountStr = num.toFixed(2)
  const amountNoDec = String(Math.round(num))
  const amountComma = amountStr.replace('.', ',')

  if (moneyFormat) {
    return moneyFormat
      .replace(/\{\{\s*amount\s*\}\}/, amountStr)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, amountNoDec)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amountComma)
  }

  // Fallback if no money_format provided
  return '$' + amountStr
}
