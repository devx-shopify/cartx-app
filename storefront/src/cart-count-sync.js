// Sync the theme's cart count bubble with current cart state
// Queries common selectors used by Dawn and popular themes

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

var BUBBLE_SELECTORS = [
  '.cart-count-bubble',
  '#cart-icon-bubble',
];

export function syncCartCount(itemCount) {
  // Update count text
  COUNT_SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      // Only update leaf text nodes, not containers with children that have their own text
      if (el.children.length === 0 || el.matches('[aria-hidden="true"]')) {
        el.textContent = itemCount;
      }
    });
  });

  // Show/hide bubble based on count
  BUBBLE_SELECTORS.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (itemCount > 0) {
        el.removeAttribute('hidden');
        el.style.display = '';
      } else {
        el.setAttribute('hidden', '');
      }
    });
  });
}
