// Simple focus trap for the drawer
// Keeps Tab/Shift+Tab cycling within the drawer when open

var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container) {
  var focusable = container.querySelectorAll(FOCUSABLE);
  if (focusable.length === 0) return null;

  var first = focusable[0];
  var last = focusable[focusable.length - 1];

  function handler(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener('keydown', handler);
  first.focus();

  // Return cleanup function
  return function () {
    container.removeEventListener('keydown', handler);
  };
}
