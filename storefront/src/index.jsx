import { h, render, Component } from 'preact';
import { fetchCart, updateLineQuantity, removeLine, formatMoney, optimizeImageUrl } from './cart-api.js';
import { syncCartCount } from './cart-count-sync.js';
import { trapFocus } from './focus-trap.js';

var ANIM_DURATION = 300;
var DEBOUNCE_MS = 500;
var REMOVE_ANIM_MS = 300;

class CartxDrawer extends Component {
  constructor() {
    super();
    this.state = {
      visible: false,
      open: false,
      cart: null,
      loading: true,
      updating: {},      // lineKey -> true while API call in flight
      removing: {},      // lineKey -> true during removal animation
      pendingQty: {},    // lineKey -> target qty (debounce buffer)
    };
    this.close = this.close.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this._closeTimer = null;
    this._focusCleanup = null;
    this._triggerElement = null;
    this._drawerRef = null;
    this._debounceTimers = {}; // lineKey -> timer id
    this._currency = window.Shopify && window.Shopify.currency && window.Shopify.currency.active || 'USD';
  }

  componentDidMount() {
    window.addEventListener('cartmax:cart-changed', () => {
      this.loadCart();
      this.openDrawer();
    });

    window.__cartmaxReady = true;
    if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
      this.loadCart();
      this.openDrawer();
      window.__cartmaxQueue = [];
    }

    document.addEventListener('click', (e) => {
      var link = e.target.closest('a[href="/cart"], a[href="/cart/"], [data-cart-icon], #cart-icon-bubble');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        this._triggerElement = link;
        this.loadCart();
        this.openDrawer();
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.open) this.close();
    });
  }

  async loadCart() {
    this.setState({ loading: true });
    try {
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, loading: false });
      syncCartCount(cart.item_count);
    } catch (e) {
      this.setState({ loading: false });
    }
  }

  openDrawer() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    if (!this._triggerElement) {
      this._triggerElement = document.activeElement;
    }
    this.setState({ visible: true, open: false }, () => {
      requestAnimationFrame(() => {
        this.setState({ open: true });
        requestAnimationFrame(() => {
          if (this._drawerRef) {
            this._focusCleanup = trapFocus(this._drawerRef);
          }
        });
      });
    });
    document.body.style.overflow = 'hidden';
    this.announce('Cart opened');
  }

  close() {
    if (this._focusCleanup) {
      this._focusCleanup();
      this._focusCleanup = null;
    }
    this.setState({ open: false });
    document.body.style.overflow = '';
    this._closeTimer = setTimeout(() => {
      this.setState({ visible: false });
      this._closeTimer = null;
    }, ANIM_DURATION);
    if (this._triggerElement && this._triggerElement.focus) {
      this._triggerElement.focus();
      this._triggerElement = null;
    }
    this.announce('Cart closed');
  }

  handleOverlayClick() {
    this.close();
  }

  // Debounced quantity change — batches rapid +/- clicks
  queueQuantityChange(lineKey, newQty) {
    // Update optimistic qty immediately
    var pending = Object.assign({}, this.state.pendingQty);
    pending[lineKey] = newQty;
    this.setState({ pendingQty: pending });

    // Clear existing debounce for this line
    if (this._debounceTimers[lineKey]) {
      clearTimeout(this._debounceTimers[lineKey]);
    }

    // Set new debounce
    this._debounceTimers[lineKey] = setTimeout(() => {
      delete this._debounceTimers[lineKey];
      this.flushQuantityChange(lineKey, newQty);
    }, DEBOUNCE_MS);
  }

  async flushQuantityChange(lineKey, qty) {
    var updating = Object.assign({}, this.state.updating);
    updating[lineKey] = true;
    this.setState({ updating: updating });

    try {
      var cart = await updateLineQuantity(lineKey, qty);
      var done = Object.assign({}, this.state.updating);
      delete done[lineKey];
      var pending = Object.assign({}, this.state.pendingQty);
      delete pending[lineKey];
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, updating: done, pendingQty: pending });
      syncCartCount(cart.item_count);
      this.announce('Cart updated');
    } catch (e) {
      await this.loadCart();
      done = Object.assign({}, this.state.updating);
      delete done[lineKey];
      pending = Object.assign({}, this.state.pendingQty);
      delete pending[lineKey];
      this.setState({ updating: done, pendingQty: pending });
    }
  }

  // Remove with fade + collapse animation
  handleRemove(lineKey) {
    // Cancel any pending debounce for this item
    if (this._debounceTimers[lineKey]) {
      clearTimeout(this._debounceTimers[lineKey]);
      delete this._debounceTimers[lineKey];
    }

    // Start removal animation
    var removing = Object.assign({}, this.state.removing);
    removing[lineKey] = true;
    this.setState({ removing: removing });

    // After animation completes, fire the API call
    setTimeout(async () => {
      var updating = Object.assign({}, this.state.updating);
      updating[lineKey] = true;
      this.setState({ updating: updating });

      try {
        var cart = await removeLine(lineKey);
        var done = Object.assign({}, this.state.updating);
        delete done[lineKey];
        var rem = Object.assign({}, this.state.removing);
        delete rem[lineKey];
        var pending = Object.assign({}, this.state.pendingQty);
        delete pending[lineKey];
        this._currency = cart.currency || this._currency;
        this.setState({ cart: cart, updating: done, removing: rem, pendingQty: pending });
        syncCartCount(cart.item_count);
        this.announce('Item removed from cart');
      } catch (e) {
        await this.loadCart();
        done = Object.assign({}, this.state.updating);
        delete done[lineKey];
        rem = Object.assign({}, this.state.removing);
        delete rem[lineKey];
        this.setState({ updating: done, removing: rem });
      }
    }, REMOVE_ANIM_MS);
  }

  announce(message) {
    var el = document.getElementById('cartmax-live-region');
    if (el) el.textContent = message;
  }

  getDisplayQty(item) {
    // Show pending (debounced) qty if exists, otherwise actual
    if (Object.prototype.hasOwnProperty.call(this.state.pendingQty, item.key)) {
      return this.state.pendingQty[item.key];
    }
    return item.quantity;
  }

  renderLineItem(item) {
    var isUpdating = this.state.updating[item.key];
    var isRemoving = this.state.removing[item.key];
    var displayQty = this.getDisplayQty(item);
    var hasPending = Object.prototype.hasOwnProperty.call(this.state.pendingQty, item.key);
    var currency = this._currency;
    var lineItemClass = 'cartmax-line-item' + (isRemoving ? ' cartmax-line-removing' : '');

    return h('div', { class: lineItemClass, key: item.key },
      h('div', { class: 'cartmax-line-image' },
        item.image
          ? h('img', { src: optimizeImageUrl(item.image, 128), alt: item.title, width: 64, height: 64, loading: 'lazy' })
          : h('div', { class: 'cartmax-line-image-placeholder' })
      ),
      h('div', { class: 'cartmax-line-details' },
        h('div', { class: 'cartmax-line-title' }, item.product_title),
        item.variant_title
          ? h('div', { class: 'cartmax-line-variant' }, item.variant_title)
          : null,
        h('div', { class: 'cartmax-line-price' },
          item.original_line_price !== item.final_line_price
            ? h('span', { class: 'cartmax-line-price-original' }, formatMoney(item.original_line_price, currency))
            : null,
          h('span', { class: item.original_line_price !== item.final_line_price ? 'cartmax-line-price-final' : '' },
            formatMoney(item.final_line_price, currency)
          )
        ),
        // Line-level discount labels (product discounts)
        item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0
          ? h('div', { class: 'cartmax-line-discounts' },
              item.line_level_discount_allocations.map(function (disc) {
                return h('span', { class: 'cartmax-line-discount-tag', key: disc.discount_application.title },
                  disc.discount_application.title
                );
              })
            )
          : null,
        h('div', { class: 'cartmax-line-actions' },
          h('div', { class: 'cartmax-qty-controls' },
            h('button', {
              class: 'cartmax-qty-btn',
              onClick: () => this.queueQuantityChange(item.key, displayQty - 1),
              disabled: isUpdating || displayQty <= 1,
              'aria-label': 'Decrease quantity'
            }, '−'),
            h('span', { class: 'cartmax-qty-value' + (hasPending ? ' cartmax-qty-pending' : '') }, displayQty),
            h('button', {
              class: 'cartmax-qty-btn',
              onClick: () => this.queueQuantityChange(item.key, displayQty + 1),
              disabled: isUpdating,
              'aria-label': 'Increase quantity'
            }, '+')
          ),
          h('button', {
            class: 'cartmax-remove-btn',
            onClick: () => this.handleRemove(item.key),
            disabled: isUpdating || isRemoving,
            'aria-label': 'Remove ' + item.product_title
          }, 'Remove')
        )
      )
    );
  }

  renderLoading() {
    return h('div', { class: 'cartmax-loading' },
      h('div', { class: 'cartmax-skeleton' }),
      h('div', { class: 'cartmax-skeleton' }),
      h('div', { class: 'cartmax-skeleton' })
    );
  }

  renderEmpty() {
    return h('div', { class: 'cartmax-empty' },
      h('p', { class: 'cartmax-empty-text' }, 'Your cart is empty'),
      h('button', { class: 'cartmax-continue-btn', onClick: this.close }, 'Continue shopping')
    );
  }

  renderCartContents() {
    var cart = this.state.cart;
    var currency = this._currency;
    var hasDiscount = cart.total_discount > 0;

    return [
      h('div', { class: 'cartmax-body' },
        cart.items.map((item) => this.renderLineItem(item))
      ),
      h('div', { class: 'cartmax-footer' },
        h('div', { class: 'cartmax-totals' },
          h('div', { class: 'cartmax-totals-row' },
            h('span', null, 'Subtotal'),
            h('span', null, formatMoney(cart.items_subtotal_price, currency))
          ),
          // Individual discount labels
          cart.cart_level_discount_applications && cart.cart_level_discount_applications.length > 0
            ? cart.cart_level_discount_applications.map(function (disc) {
                var amount = disc.total_allocated_amount || disc.amount || 0;
                return h('div', { class: 'cartmax-totals-row cartmax-discount-row', key: disc.title },
                  h('span', null, disc.title || 'Discount'),
                  h('span', null, '−' + formatMoney(amount, currency))
                );
              })
            : null,
          // Total discount — always show if there's any discount
          hasDiscount
            ? h('div', { class: 'cartmax-totals-row cartmax-discount-row' },
                h('span', null, 'Total Discount'),
                h('span', null, '−' + formatMoney(cart.total_discount, currency))
              )
            : null,
          h('div', { class: 'cartmax-totals-row cartmax-total-row' },
            h('span', null, 'Total'),
            h('span', null, formatMoney(cart.total_price, currency))
          )
        ),
        h('a', { class: 'cartmax-checkout-btn', href: '/checkout' }, 'Checkout'),
        h('button', { class: 'cartmax-continue-btn', onClick: this.close }, 'Continue shopping')
      )
    ];
  }

  render(_, { visible, open, cart, loading }) {
    var liveRegion = h('div', {
      id: 'cartmax-live-region',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      style: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }
    });

    if (!visible) {
      return h('div', { class: 'cartmax-wrapper' }, liveRegion);
    }

    var overlayClass = 'cartmax-overlay' + (open ? ' cartmax-open' : '');
    var isEmpty = !loading && cart && cart.items && cart.items.length === 0;
    var hasItems = !loading && cart && cart.items && cart.items.length > 0;
    var itemCount = cart ? cart.item_count : 0;

    return h('div', { class: 'cartmax-wrapper' },
      liveRegion,
      h('div', { class: overlayClass, onClick: this.handleOverlayClick },
        h('div', {
          class: 'cartmax-drawer',
          ref: (el) => { this._drawerRef = el; },
          onClick: function (e) { e.stopPropagation(); },
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'Shopping cart'
        },
          h('div', { class: 'cartmax-header' },
            h('span', { class: 'cartmax-title' }, 'Your Cart',
              itemCount > 0
                ? h('span', { class: 'cartmax-header-count' }, ' (' + itemCount + ')')
                : null
            ),
            h('button', { class: 'cartmax-close', onClick: this.close, 'aria-label': 'Close cart' }, '\u2715')
          ),
          loading
            ? this.renderLoading()
            : isEmpty
              ? this.renderEmpty()
              : hasItems
                ? this.renderCartContents()
                : null
        )
      )
    );
  }
}

function mount() {
  var root = document.getElementById('cartmax-root');
  if (root) {
    render(h(CartxDrawer), root);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
