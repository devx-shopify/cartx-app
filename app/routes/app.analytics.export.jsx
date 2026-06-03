import { authenticate } from '../shopify.server'
import { getDashboardData } from '../lib/analytics.server.js'

const PRESETS = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
}

function rangeFromPreset(preset) {
  const days = PRESETS[preset] ?? 30
  const to = new Date()
  to.setUTCHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - (days - 1))
  from.setUTCHours(0, 0, 0, 0)
  return { from, to }
}

const TYPE_LABELS = {
  offer: 'Offer',
  coupon: 'Coupon',
  'claim-gift': 'Claim Gift',
  upsell: 'Upsell',
}

// CSV field escaper. Wraps any value containing comma, quote, or newline in
// double quotes and doubles internal quotes per RFC 4180.
function csvCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(cells) {
  return cells.map(csvCell).join(',') + '\n'
}

function formatCents(cents) {
  if (!Number.isFinite(cents)) return ''
  return (cents / 100).toFixed(2)
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const url = new URL(request.url)

  const preset = url.searchParams.get('preset') || '30d'
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')
  let from, to
  if (fromParam && toParam) {
    from = new Date(fromParam)
    to = new Date(toParam)
    to.setUTCHours(23, 59, 59, 999)
  } else {
    ({ from, to } = rangeFromPreset(preset))
  }

  const data = await getDashboardData(session.shop, { from, to })

  let body = csvRow([
    'Promotion',
    'Type',
    'Impressions',
    'Claims',
    'Conversion rate',
    'Orders',
    'Revenue',
    'AOV',
  ])
  for (const p of data.promotions) {
    body += csvRow([
      p.name,
      TYPE_LABELS[p.type] ?? p.type ?? '',
      p.impressions,
      p.claims,
      p.conversionRate.toFixed(4),
      p.orders,
      formatCents(p.revenue),
      formatCents(p.aov),
    ])
  }

  const safeShop = session.shop.replace(/[^a-z0-9.-]/gi, '_')
  const fromStr = new Date(data.range.from || from).toISOString().slice(0, 10)
  const toStr = new Date(data.range.to || to).toISOString().slice(0, 10)
  const filename = `cartx-analytics-${safeShop}-${fromStr}-${toStr}.csv`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
