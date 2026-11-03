// Shopify money-format rendering, shared by the server (milestone messages)
// and the drawer bundle (esbuild follows the relative import). Keep it
// dependency-free: a change here needs both the Fly and the app deploy.
//
// `amount` is in major units (499.5 = ₹499.50). `decimals` is the drawer's
// layout.price_decimals setting:
//   'store'     – follow the store format exactly (default)
//   'hide_zero' – drop ".00" on whole amounts, keep real paise/cents
//   'hide'      – always round to a whole amount

var SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹',
  CAD: 'CA$', AUD: 'A$', JPY: '¥', CNY: '¥',
};

// Shopify placeholder → [thousands separator, decimal separator, decimals]
var FORMATS = {
  amount: [',', '.', 2],
  amount_no_decimals: [',', '.', 0],
  amount_with_comma_separator: ['.', ',', 2],
  amount_no_decimals_with_comma_separator: ['.', ',', 0],
  amount_with_apostrophe_separator: ["'", '.', 2],
  amount_no_decimals_with_space_separator: [' ', ',', 0],
  amount_with_space_separator: [' ', ',', 2],
  amount_with_period_and_space_separator: [' ', '.', 2],
};

var PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/;

function group(amount, places, thousands, decimal) {
  var fixed = Math.abs(amount).toFixed(places);
  var parts = fixed.split('.');
  var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return (amount < 0 ? '-' : '') + whole + (parts[1] ? decimal + parts[1] : '');
}

function placesFor(amount, places, decimals) {
  if (places === 0 || decimals === 'hide') return 0;
  if (decimals === 'hide_zero' && Math.round(amount * 100) % 100 === 0) return 0;
  return places;
}

export function formatAmount(amount, moneyFormat, decimals, currency) {
  var n = Number(amount);
  if (!isFinite(n)) return String(amount == null ? '' : amount);
  var fmt = String(moneyFormat || '').replace(/<[^>]*>/g, '');
  var m = fmt.match(PLACEHOLDER);
  var spec = (m && FORMATS[m[1]]) || null;
  if (!spec) {
    // No usable store format: symbol + plain amount.
    var sym = currency ? (SYMBOLS[currency] || currency + ' ') : (fmt ? '' : '$');
    var p = placesFor(n, 2, decimals);
    return (fmt ? fmt.replace(PLACEHOLDER, '') : '') + sym + group(n, p, ',', '.');
  }
  var places = placesFor(n, spec[2], decimals);
  return fmt.replace(PLACEHOLDER, group(n, places, spec[0], spec[1]));
}
