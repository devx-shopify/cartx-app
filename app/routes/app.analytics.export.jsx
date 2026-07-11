import { authenticate } from '../shopify.server'
import { getDashboardData, presetRange } from '../lib/analytics.server.js'
import { syncShopSettings } from '../lib/billing.server.js'

const TYPE_LABELS = {
  offer: 'Offer',
  coupon: 'Coupon',
  'claim-gift': 'Claim Gift',
  upsell: 'Upsell',
}

const STATUS_LABELS = {
  active: 'Active',
  draft: 'Draft',
  'needs-attention': 'Needs attention',
  deleted: 'Deleted',
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
  const { admin, session } = await authenticate.admin(request)
  const url = new URL(request.url)

  const preset = url.searchParams.get('preset') || '30d'
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  const { ianaTimezone } = await syncShopSettings(admin, session.shop)
  const tz = ianaTimezone || 'UTC'

  let from, to
  if (fromParam && toParam) {
    from = new Date(fromParam)
    to = new Date(toParam)
    to.setUTCHours(23, 59, 59, 999)
  } else {
    ({ from, to } = presetRange(preset, tz))
  }

  const data = await getDashboardData(session.shop, { from, to })
  const currency = data.currency || 'USD'

  let body = csvRow([
    'Promotion',
    'Type',
    'Status',
    'Impressions',
    'Claims',
    'Conversion rate',
    'Orders',
    `Influenced revenue (${currency})`,
    `AOV (${currency})`,
  ])
  for (const p of data.promotions) {
    body += csvRow([
      p.name,
      TYPE_LABELS[p.type] ?? p.type ?? '',
      STATUS_LABELS[p.status] ?? p.status ?? '',
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
