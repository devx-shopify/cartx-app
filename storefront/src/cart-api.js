// Cart API — thin wrapper around Shopify Ajax API
// Sets __cartmaxInternal flag so the interceptor skips our own calls

function internalFetch(url, opts) {
  window.__cartmaxInternal = true;
  return fetch(url, opts).finally(function () {
    window.__cartmaxInternal = false;
  });
}

export async function fetchCart() {
  var res = await internalFetch('/cart.js');
  return res.json();
}

export async function updateLineQuantity(lineKey, quantity) {
  var res = await internalFetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: lineKey, quantity }),
  });
  return res.json();
}

export async function removeLine(lineKey) {
  return updateLineQuantity(lineKey, 0);
}

// Use Shopify's money_format if available, otherwise fallback to symbol map
export function formatMoney(cents, currency) {
  var amount = (cents / 100).toFixed(2);

  // Shopify exposes the shop's money format on the storefront
  var moneyFormat = window.Shopify && window.Shopify.money_format;
  if (moneyFormat) {
    return moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amount)
                      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100))
                      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','));
  }

  var symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'A$', JPY: '¥', CNY: '¥' };
  var symbol = symbols[currency] || currency + ' ';
  return symbol + amount;
}

export function optimizeImageUrl(url, size) {
  if (!url) return '';
  size = size || 128;
  return url.replace(/(\.\w{3,4})(\?.*)?$/, '_' + size + 'x$1$2');
}
