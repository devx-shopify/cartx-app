// =============================================================
// Cart Max — Shared Helpers
// =============================================================

// ── Internal fetch (bypasses cart interceptor) ──────────────

var _internalFetchDepth = 0;

export function internalFetch(url, opts) {
  _internalFetchDepth++;
  window.__cartmaxInternal = true;
  return fetch(url, opts).finally(function () {
    _internalFetchDepth--;
    if (_internalFetchDepth === 0) {
      window.__cartmaxInternal = false;
    }
  });
}

export function fetchCart() {
  return internalFetch('/cart.js').then(function (r) { return r.json(); });
}

// Single /cart/update.js call with all changes merged
// payload: { updates: { vid: qty }, discount: "CODE1,CODE2" }
export function cartUpdateAll(payload) {
  return internalFetch('/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function (r) { return r.json(); });
}

// ── Money formatting ────────────────────────────────────────

export function formatMoney(cents, currency) {
  var amount = (cents / 100).toFixed(2);
  var fmt = window.Shopify && window.Shopify.money_format;
  if (fmt) {
    return fmt
      .replace(/\{\{\s*amount\s*\}\}/, amount)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100))
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','));
  }
  var symbols = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9',
    CAD: 'CA$', AUD: 'A$', JPY: '\u00A5', CNY: '\u00A5',
  };
  return (symbols[currency] || currency + ' ') + amount;
}

// ── Image URL resize ────────────────────────────────────────

export function resizeImage(url, size) {
  if (!url) return '';
  size = size || 128;
  return url.replace(/(\.\w{3,4})(\?.*)?$/, '_' + size + 'x$1$2');
}

// ── Theme cart count badge updates ──────────────────────────

var COUNT_SELECTORS = [
  '.cart-count-bubble span[aria-hidden="true"]',
  '.cart-count-bubble',
  '.cart-count',
  '[data-cart-count]',
  '#CartCount',
  '#cart-icon-bubble span[aria-hidden="true"]',
  '#cart-icon-bubble',
  '.cart-link__bubble-num',
];

var BUBBLE_SELECTORS = ['.cart-count-bubble', '#cart-icon-bubble'];

export function updateCartCount(count) {
  COUNT_SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.children.length === 0 || el.matches('[aria-hidden="true"]')) {
        el.textContent = count;
      }
    });
  });
  BUBBLE_SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (count > 0) {
        el.removeAttribute('hidden');
        el.style.display = '';
      } else {
        el.setAttribute('hidden', '');
      }
    });
  });
}

// ── Context (shop/theme/customer from data attributes) ──────

export function getContext() {
  var el = document.getElementById('cartmax-root');
  if (!el) return { shopId: '', themeId: '', customerId: '', customerTags: [] };
  var tags = [];
  try {
    tags = JSON.parse(decodeURIComponent(el.dataset.customerTags || '[]'));
  } catch (e) {
    tags = [];
  }
  var themeId = el.dataset.themeId ||
    (window.Shopify && window.Shopify.theme && String(window.Shopify.theme.id)) || '';
  var moneyFormat = el.dataset.moneyFormat ||
    (window.Shopify && window.Shopify.money_format) || '';
  return {
    shopId: el.dataset.shopId || '',
    themeId: themeId,
    customerId: el.dataset.customerId || '',
    customerTags: Array.isArray(tags) ? tags : [],
    moneyFormat: moneyFormat,
  };
}

// ── Focus trap for accessibility ────────────────────────────

var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container) {
  var focusables = container.querySelectorAll(FOCUSABLE);
  if (focusables.length === 0) return null;
  var first = focusables[0];
  var last = focusables[focusables.length - 1];
  function handler(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }
  container.addEventListener('keydown', handler);
  first.focus();
  return function () { container.removeEventListener('keydown', handler); };
}
