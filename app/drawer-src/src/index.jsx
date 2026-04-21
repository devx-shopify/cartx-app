import { h, render } from 'preact';
import CartDrawer from './CartDrawer';
import './evaluate';

function mount() {
  var root = document.getElementById('cartmax-root');
  if (root) render(h(CartDrawer), root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
