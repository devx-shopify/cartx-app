/* eslint-disable */
import { h, Component } from 'preact';
import { fetchCart, cartUpdateAll, internalFetch, formatMoney, resizeImage, updateCartCount, trapFocus, applyDrawerSettings } from './helpers';
import { fireConfetti, setConfettiLottieUrl } from './confetti';
import { waitForEvaluate } from './evaluate';

// ── Timing constants ────────────────────────────────────────

var CLOSE_DELAY = 250;
var DEBOUNCE_DELAY = 300;
var REMOVE_ANIM_DELAY = 0;
var PROCESSING_TIMEOUT = 10000;

// ── SVG Icons (inline for zero network cost) ────────────────

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconRemoveX() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

// ── CartDrawer Component ────────────────────────────────────

export default class CartDrawer extends Component {
  constructor() {
    super();
    this.state = {
      visible: false,
      open: false,
      cart: null,
      loading: true,
      updating: {},
      removing: {},
      pendingQty: {},
      evalResult: null,
      savings: 0,
      unavailableGifts: [],
    };
    this.close = this.close.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this._closeTimer = null;
    this._focusCleanup = null;
    this._triggerElement = null;
    this._drawerRef = null;
    this._debounceTimers = {};
    this._processingTimeout = null;
    this._currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    this._prevActiveTiers = {};
    this._confettiInitialized = false;
    this._confettiEnabled = true;
    this._appliedDrawerHash = null;
    this._text = {
      cart_title: 'Your Cart', empty_title: 'Your cart is empty',
      empty_subtitle: "Looks like you haven't added anything yet",
      empty_button: 'Continue shopping', checkout_button: 'Checkout',
      continue_shopping: 'Continue shopping', continue_shopping_url: '',
      coupon_placeholder: 'Discount code', total_label: 'Total', subtotal_label: 'Subtotal',
      savings_label: 'Congrats! You saved {amount} on this order.',
      offer_cards_heading: 'Pick your free gift',
    };
    this._layout = { drawer_position: 'right', image_style: 'rounded', qty_style: 'bordered', show_variant_title: true, show_vendor: false };
    this._shape = { button_style: 'solid' };
    this._sections = { show_progress_bar: true, show_claim_gifts: true, show_offer_cards: true, show_coupons: true, show_upsells: true, show_ribbon: true };
    this._behavior = { auto_open_on_add: true, animation_style: 'slide', close_on_overlay_click: true, close_on_esc: true };
  }

  componentDidMount() {
    this._onCartChanged = (e) => {
      if (e.detail && e.detail.cart) {
        var cart = this._stabiliseOrder(e.detail.cart);
        this._currency = cart.currency || this._currency;
        this.setState({ cart: cart, loading: false });
        updateCartCount(cart.item_count);
      } else {
        this.loadCart();
      }
      if (this._behavior.auto_open_on_add) this.openDrawer();
    };

    this._onEvalResult = (e) => {
      if (e.detail) {
        var patch = { evalResult: e.detail };
        // Only update savings when the result actually carries one (server
        // responses do; optimistic local evals don't). This keeps the ribbon
        // stable between cart change and the next server response.
        if (typeof e.detail.total_savings === 'number') {
          patch.savings = e.detail.total_savings;
        }
        this.setState(patch);
        this._maybeApplyDrawer(e.detail.drawer);
        if (e.detail._server) this._checkConfetti(e.detail);
      }
    };

    this._onInternalReload = (e) => {
      if (e.detail && e.detail.cart) {
        var newCart = this._stabiliseOrder(e.detail.cart);
        var newEval = e.detail.evalResult || this.state.evalResult;
        this._currency = newCart.currency || this._currency;
        if (e.detail.evalResult) {
          this._maybeApplyDrawer(e.detail.evalResult.drawer);
          this._checkConfetti(e.detail.evalResult);
        }

        // Detect removed items for animation
        var oldItems = (this.state.cart && this.state.cart.items) || [];
        var newKeys = {};
        (newCart.items || []).forEach(function (item) { newKeys[item.key] = true; });
        var removing = {};
        oldItems.forEach(function (item) {
          if (!newKeys[item.key]) removing[item.key] = true;
        });

        var newSavings = (newEval && typeof newEval.total_savings === 'number')
          ? newEval.total_savings
          : this.state.savings;

        if (Object.keys(removing).length > 0) {
          // DEFER evalResult until after remove animation completes
          // so progress bar doesn't jump while items are fading out
          this.setState({ removing: removing, updating: {}, pendingQty: {}, loading: false });
          setTimeout(() => {
            this.setState({ cart: newCart, removing: {}, evalResult: newEval, savings: newSavings });
            updateCartCount(newCart.item_count);
          }, REMOVE_ANIM_DELAY);
        } else {
          this.setState({
            cart: newCart,
            evalResult: newEval,
            savings: newSavings,
            loading: false,
            updating: {},
            removing: {},
            pendingQty: {},
          });
          updateCartCount(newCart.item_count);
        }
        this.announce('Cart updated');
        this._clearProcessingTimeout();
      }
    };

    this._onOptimisticUpdate = (e) => {
      if (e.detail && e.detail.cart) {
        var optimisticCart = this._stabiliseOrder(e.detail.cart);
        this._currency = optimisticCart.currency || this._currency;
        this.setState({ cart: optimisticCart, pendingQty: {} });
        updateCartCount(optimisticCart.item_count);
      }
    };

    this._onGiftUnavailable = (e) => {
      var variants = (e.detail && e.detail.variants) || [];
      this.setState({ unavailableGifts: variants });
    };

    window.addEventListener('cartmax:cart-changed', this._onCartChanged);
    window.addEventListener('cartmax:eval-result', this._onEvalResult);
    window.addEventListener('cartmax:internal-reload', this._onInternalReload);
    window.addEventListener('cartmax:optimistic-update', this._onOptimisticUpdate);
    window.addEventListener('cartmax:gift-unavailable', this._onGiftUnavailable);

    window.__cartmaxReady = true;
    if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
      this.loadCart();
      this.openDrawer();
      window.__cartmaxQueue = [];
    }

    // ── Public API for third-party apps ──────────────────
    var self = this;
    window.cartx = {
      open: function () { self.loadCart(); self.openDrawer(); },
      close: function () { self.close(); },
      toggle: function () { self.state.open ? self.close() : (self.loadCart(), self.openDrawer()); },
      refresh: function () { self.loadCart(); window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: {} })); },
      isOpen: function () { return self.state.open; },
    };

    // Cart icon click — open drawer
    this._onDocClick = (e) => {
      var link = e.target.closest('a[href="/cart"], a[href="/cart/"], [data-cart-icon], #cart-icon-bubble');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        this._triggerElement = link;
        this.loadCart();
        this.openDrawer();
      }
    };
    document.addEventListener('click', this._onDocClick, true);

    // Cart icon hover — prefetch cart data so open is instant
    this._onDocMouseover = (e) => {
      var link = e.target.closest('a[href="/cart"], a[href="/cart/"], [data-cart-icon], #cart-icon-bubble');
      if (link && !this._hoverPrefetched) {
        this._hoverPrefetched = true;
        this.loadCart();
        // Reset after 10s so next hover prefetches again
        setTimeout(() => { this._hoverPrefetched = false; }, 10000);
      }
    };
    document.addEventListener('mouseover', this._onDocMouseover, { passive: true });

    this._onDocKeydown = (e) => {
      if (e.key === 'Escape' && this.state.open && this._behavior.close_on_esc) this.close();
    };
    document.addEventListener('keydown', this._onDocKeydown);
  }

  componentWillUnmount() {
    window.removeEventListener('cartmax:cart-changed', this._onCartChanged);
    window.removeEventListener('cartmax:eval-result', this._onEvalResult);
    window.removeEventListener('cartmax:internal-reload', this._onInternalReload);
    window.removeEventListener('cartmax:optimistic-update', this._onOptimisticUpdate);
    window.removeEventListener('cartmax:gift-unavailable', this._onGiftUnavailable);
    document.removeEventListener('click', this._onDocClick, true);
    document.removeEventListener('mouseover', this._onDocMouseover);
    document.removeEventListener('keydown', this._onDocKeydown);
    Object.values(this._debounceTimers).forEach(clearTimeout);
    this._clearProcessingTimeout();
  }

  // ── Apply drawer config to instance properties ──────────

  // Gates the heavier drawer-config side effects (CSS vars, custom-CSS injection,
  // font loading, lottie preload) so they only run when the config actually
  // changes. Without this, every cart operation re-applies them and interrupts
  // the .cartmax-progress-fill width transition, causing the bar to flicker.
  _maybeApplyDrawer(drawer) {
    if (!drawer) return;
    var hash;
    try { hash = JSON.stringify(drawer); } catch (_) { hash = null; }
    if (hash !== null && hash === this._appliedDrawerHash) return;
    this._appliedDrawerHash = hash;
    applyDrawerSettings(drawer);
    this._applyDrawerConfig(drawer);
    var beh = drawer.behavior;
    if (beh && beh.confetti_lottie_url) setConfettiLottieUrl(beh.confetti_lottie_url);
  }

  _applyDrawerConfig(drawer) {
    if (!drawer) return;
    var t = drawer.text || {};
    this._text = Object.assign({}, this._text, t);
    var l = drawer.layout || {};
    this._layout = {
      drawer_position: l.drawer_position || 'right',
      image_style: l.image_style || 'rounded',
      qty_style: l.qty_style || 'bordered',
      show_variant_title: l.show_variant_title !== false,
      show_vendor: l.show_vendor === true,
    };
    var sh = drawer.shape || {};
    this._shape = { button_style: sh.button_style || 'solid' };
    var sec = drawer.sections || {};
    this._sections = {
      show_progress_bar: sec.show_progress_bar !== false,
      show_claim_gifts: sec.show_claim_gifts !== false,
      show_offer_cards: sec.show_offer_cards !== false,
      show_coupons: sec.show_coupons !== false,
      show_upsells: sec.show_upsells !== false,
      show_ribbon: sec.show_ribbon !== false,
    };
    var beh = drawer.behavior || {};
    this._behavior = {
      auto_open_on_add: beh.auto_open_on_add !== false,
      animation_style: beh.animation_style || 'slide',
      close_on_overlay_click: beh.close_on_overlay_click !== false,
      close_on_esc: beh.close_on_esc !== false,
    };
    this._confettiEnabled = beh.confetti !== false;
    this._injectCustomCSS(drawer.advanced && drawer.advanced.custom_css);
    this._loadCustomFont(drawer.typography);
  }

  _injectCustomCSS(css) {
    var existing = document.getElementById('cartmax-custom-css');
    if (existing) existing.remove();
    if (!css) return;
    if (/<\/style|<script|javascript:|expression\(|@import/i.test(css)) return;
    var style = document.createElement('style');
    style.id = 'cartmax-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  _loadCustomFont(typo) {
    if (!typo || typo.font_source !== 'custom' || !typo.custom_font_url) return;
    if (document.getElementById('cartmax-custom-font')) return;
    var link = document.createElement('link');
    link.id = 'cartmax-custom-font';
    link.rel = 'stylesheet';
    link.href = typo.custom_font_url;
    document.head.appendChild(link);
    // Extract font family name from Google Fonts URL
    var match = typo.custom_font_url.match(/family=([^:&]+)/);
    if (match) {
      var family = decodeURIComponent(match[1]).replace(/\+/g, ' ');
      var root = document.getElementById('cartmax-root');
      if (root) root.style.setProperty('--cartmax-font-family', '"' + family + '"');
    }
  }

  // ── Confetti on milestone unlock ─────────────────────────

  _checkConfetti(evalResult) {
    var bar = evalResult && evalResult.bar;
    if (!bar || !bar.tiers) return;

    var newActive = {};
    for (var i = 0; i < bar.tiers.length; i++) {
      var tier = bar.tiers[i];
      var key = tier.label || String(i);
      if (tier.state === 'active') newActive[key] = true;
    }

    // First eval — just record initial state, never fire
    if (!this._confettiInitialized) {
      this._confettiInitialized = true;
      this._prevActiveTiers = newActive;
      return;
    }

    // Detect newly activated tiers
    var prev = this._prevActiveTiers;
    var hasNew = false;
    for (var k in newActive) {
      if (newActive.hasOwnProperty(k) && !prev[k]) hasNew = true;
    }

    this._prevActiveTiers = newActive;

    // Fire only if drawer is open and confetti is enabled
    if (hasNew && this._confettiEnabled && this.state.open) {
      fireConfetti();
    }
  }

  // ── Stable item ordering ─────────────────────────────────
  // Shopify's cart API can return items in different order.
  // This preserves the order the user last saw to prevent jitter.

  _stabiliseOrder(cart) {
    if (!cart || !cart.items) return cart;
    var oldItems = (this.state.cart && this.state.cart.items) || [];
    if (oldItems.length === 0) return cart;
    var oldOrder = {};
    oldItems.forEach(function (item, idx) { oldOrder[item.key] = idx; });
    var sorted = cart.items.slice().sort(function (a, b) {
      var ia = oldOrder.hasOwnProperty(a.key) ? oldOrder[a.key] : 99999;
      var ib = oldOrder.hasOwnProperty(b.key) ? oldOrder[b.key] : 99999;
      return ia - ib;
    });
    return Object.assign({}, cart, { items: sorted });
  }

  // ── Cart data ─────────────────────────────────────────────

  async loadCart() {
    if (!this.state.cart) {
      this.setState({ loading: true });
    }
    try {
      var cart = this._stabiliseOrder(await fetchCart());
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, loading: false });
      updateCartCount(cart.item_count);
    } catch (err) {
      this.setState({ loading: false });
    }
  }

  // ── Open / Close ──────────────────────────────────────────

  openDrawer() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    // Already fully open — skip re-animation to prevent flicker
    if (this.state.visible && this.state.open) return;
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
    window.dispatchEvent(new CustomEvent('cartmax:drawer-opened'));
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
    }, CLOSE_DELAY);
    if (this._triggerElement && this._triggerElement.focus) {
      this._triggerElement.focus();
      this._triggerElement = null;
    }
    this.announce('Cart closed');
  }

  handleOverlayClick() {
    if (this._behavior.close_on_overlay_click) this.close();
  }

  // ── Processing safety timeout ──────────────────────────────

  _startProcessingTimeout() {
    this._clearProcessingTimeout();
    this._processingTimeout = setTimeout(() => {
      console.warn('[cartx] Processing timeout — forcing recovery');
      this.setState({ updating: {}, removing: {}, pendingQty: {} });
      this.loadCart();
    }, PROCESSING_TIMEOUT);
  }

  _clearProcessingTimeout() {
    if (this._processingTimeout) {
      clearTimeout(this._processingTimeout);
      this._processingTimeout = null;
    }
  }

  // ── Quantity changes (debounced) ──────────────────────────

  queueQuantityChange(key, qty) {
    var pendingQty = Object.assign({}, this.state.pendingQty);
    pendingQty[key] = qty;
    this.setState({ pendingQty: pendingQty });
    if (this._debounceTimers[key]) clearTimeout(this._debounceTimers[key]);
    this._debounceTimers[key] = setTimeout(() => {
      delete this._debounceTimers[key];
      this.flushQuantityChange(key, qty);
    }, DEBOUNCE_DELAY);
  }

  flushQuantityChange(key, qty) {
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ updating: updating });
    this._startProcessingTimeout();
    window.dispatchEvent(new CustomEvent('cartmax:cart-action', {
      detail: { cart: this.state.cart, action: { key: key, qty: qty } },
    }));
    this.announce('Updating cart...');
  }

  // ── Remove item (with animation delay) ────────────────────

  handleRemove(key) {
    if (this._debounceTimers[key]) {
      clearTimeout(this._debounceTimers[key]);
      delete this._debounceTimers[key];
    }
    var removing = Object.assign({}, this.state.removing);
    removing[key] = true;
    this.setState({ removing: removing });
    setTimeout(() => {
      var updating = Object.assign({}, this.state.updating);
      updating[key] = true;
      this.setState({ updating: updating });
      this._startProcessingTimeout();
      window.dispatchEvent(new CustomEvent('cartmax:cart-action', {
        detail: { cart: this.state.cart, action: { key: key, qty: 0 } },
      }));
      this.announce('Removing item...');
    }, REMOVE_ANIM_DELAY);
  }

  // ── Accessibility ─────────────────────────────────────────

  announce(msg) {
    var el = document.getElementById('cartmax-live-region');
    if (el) el.textContent = msg;
  }

  getDisplayQty(item) {
    if (this.state.pendingQty.hasOwnProperty(item.key)) {
      return this.state.pendingQty[item.key];
    }
    return item.quantity;
  }

  // ── Render: Progress Bar ──────────────────────────────────

  renderProgressBar() {
    var result = this.state.evalResult;
    if (!result || !result.bar || !result.bar.tiers || result.bar.tiers.length === 0) {
      return null;
    }
    var bar = result.bar;
    var tiers = bar.tiers;
    var n = tiers.length;
    var pct = Math.min(bar.progress_pct || 0, 100);
    // Leave room so last milestone label doesn't clip at the right edge
    var trackPadRight = 30;
    var usableWidth = 100;

    return (
      <div id="cartmax-progress" className="cartmax-progress">
        {bar.top_message ? <div class="cartmax-progress-msg">{bar.top_message}</div> : null}
        <div className="cartmax-progress-track" style={{ marginRight: trackPadRight + 'px' }}>
          <div className="cartmax-progress-fill" style={{ width: pct + '%' }} ><span className='visually-hidden'>Progress fill</span></div>
          {tiers.map((tier, i) => {
            var pos = ((i + 1) / n) * usableWidth;
            var cls = 'cartmax-milestone';
            var isActive = tier.state === 'active';
            if (isActive) cls += ' cartmax-milestone--active';
            else if (tier.state === 'next') cls += ' cartmax-milestone--next';
            return (
              <div class={cls} style={{ left: pos + '%' }} key={i}>
                <div class="cartmax-milestone-dot">
                  {isActive
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    : <span class="visually-hidden">Milestone</span>
                  }
                </div>
                <div class="cartmax-milestone-label">
                  <div class="cartmax-milestone-label-main">
                    {(tier.label || '').split('\n+ ')[0]}
                  </div>
                  {tier.sub_label
                    ? <div class="cartmax-milestone-sub-label">{tier.sub_label}</div>
                    : null
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render: Ribbon ────────────────────────────────────────

  renderRibbon() {
    var result = this.state.evalResult;
    if (!result || !result.ribbon_message) return null;
    return (
      <div id="cartmax-ribbon" class="cartmax-ribbon">
        {result.ribbon_message}
      </div>
    );
  }

  // ── Render: Line Item ─────────────────────────────────────

  renderLineItem(item) {
    var isUpdating = this.state.updating[item.key];
    var isRemoving = this.state.removing[item.key];
    var displayQty = this.getDisplayQty(item);
    var isPending = this.state.pendingQty.hasOwnProperty(item.key);
    var curr = this._currency;
    var isFreebie = item.properties && item.properties['_freebie'] === 'true' && item.properties['_claimed'] !== 'true';
    var isClaimed = item.properties && (item.properties['_claimed'] === 'true' || item.properties['_cartmax_claim'] === 'true');
    var cls = 'cartmax-line-item'
      + (isRemoving ? ' cartmax-line-removing' : '')
      + (isFreebie ? ' cartmax-line-freebie' : '');

    return (
      <div class={cls} key={item.key}>
        <div class="cartmax-line-image">
          {item.image
            ? <img src={resizeImage(item.image, 96)} alt={item.title} width="64" height="64" loading="lazy" />
            : <div class="cartmax-line-image-placeholder"><span class="visually-hidden">No image</span></div>
          }
        </div>
        <div class="cartmax-line-details">
          {this._layout.show_vendor && item.vendor ? <div class="cartmax-line-vendor">{item.vendor}</div> : null}
          <div class="cartmax-line-title">{item.product_title}</div>
          {this._layout.show_variant_title && item.variant_title ? <div class="cartmax-line-variant">{item.variant_title}</div> : null}
          <div class="cartmax-line-price">
            {isFreebie && item.final_line_price === 0
              ? <span class="cartmax-line-price-free">
                  <span class="cartmax-gift-badge"><IconGift /> FREE</span>
                </span>
              : [
                  item.original_line_price !== item.final_line_price
                    ? <span class="cartmax-line-price-original">{formatMoney(item.original_line_price, curr)}</span>
                    : null,
                  <span>{formatMoney(item.final_line_price, curr)}</span>,
                ]
            }
          </div>
          {!isClaimed && item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0
            ? <div class="cartmax-line-discounts">
                {item.line_level_discount_allocations.map((d) => (
                  <span class="cartmax-line-discount-tag" key={d.discount_application.title}>
                    {d.discount_application.title}
                  </span>
                ))}
              </div>
            : null
          }
          {!isFreebie
            ? <div class="cartmax-line-actions">
                <div class="cartmax-qty-controls">
                  <button
                    class="cartmax-qty-btn"
                    onClick={() => this.queueQuantityChange(item.key, displayQty - 1)}
                    disabled={isUpdating || displayQty <= 1}
                    aria-label="Decrease quantity"
                  ><IconMinus /></button>
                  <span class={'cartmax-qty-value' + (isPending ? ' cartmax-qty-pending' : '')}>
                    {displayQty}
                  </span>
                  <button
                    class="cartmax-qty-btn"
                    onClick={() => this.queueQuantityChange(item.key, displayQty + 1)}
                    disabled={isUpdating}
                    aria-label="Increase quantity"
                  ><IconPlus /></button>
                </div>
                <button
                  class="cartmax-remove-btn"
                  onClick={() => this.handleRemove(item.key)}
                  disabled={isUpdating || isRemoving}
                  aria-label={'Remove ' + item.product_title}
                ><IconTrash /></button>
              </div>
            : null
          }
        </div>
      </div>
    );
  }

  // ── Render: Loading skeleton ──────────────────────────────

  renderLoading() {
    return (
      <div class="cartmax-loading">
        {[0, 1, 2].map(function (i) {
          return (
            <div class="cartmax-skeleton-item" key={i}>
              <div class="cartmax-skeleton-img"><span class="visually-hidden">Loading</span></div>
              <div class="cartmax-skeleton-lines">
                <div class="cartmax-skeleton-line"><span class="visually-hidden">Loading</span></div>
                <div class="cartmax-skeleton-line"><span class="visually-hidden">Loading</span></div>
                <div class="cartmax-skeleton-line"><span class="visually-hidden">Loading</span></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render: Empty state ───────────────────────────────────

  renderEmpty() {
    var self = this;
    return (
      <div class="cartmax-empty">
        <div class="cartmax-empty-icon"><IconBag /></div>
        <p class="cartmax-empty-text">{this._text.empty_title}</p>
        <p class="cartmax-empty-subtitle">{this._text.empty_subtitle}</p>
        <button class="cartmax-empty-btn" onClick={function () {
          if (self._text.continue_shopping_url) { window.location.href = self._text.continue_shopping_url; }
          else { self.close(); }
        }}>{this._text.empty_button}</button>
      </div>
    );
  }

  // ── Claim Gifts ────────────────────────────────────────────

  async handleClaimAdd(variantId, claimId) {
    var key = 'claim_' + variantId;
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ updating: updating });
    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: 1,
          properties: { _freebie: 'true', _cartmax_claim: 'true', _claimed: 'true', _offer_id: claimId },
        }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
    } catch (err) {
      console.error('[cartx] Claim add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  async handleClaimRemove(variantId) {
    var cart = this.state.cart;
    if (!cart) return;
    var line = cart.items.find(function (i) {
      return String(i.variant_id) === String(variantId);
    });
    if (!line) return;
    this.handleRemove(line.key);
  }

  // Display-mode offer: customer manually adds the gift from a card.
  async handleOfferDisplayAdd(variantId, offerId, quantity) {
    var key = 'offer_' + variantId;
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ updating: updating });
    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(variantId),
          quantity: quantity || 1,
          properties: {
            _freebie: 'true',
            _offer_id: offerId,
            _acquired_on_page: window.location.pathname,
          },
        }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
    } catch (err) {
      console.error('[cartx] Offer display add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  renderOfferDisplays() {
    var result = this.state.evalResult;
    if (!result) return null;
    var groups = result.offer_displays || [];
    if (groups.length === 0) return null;

    var self = this;
    var heading = this._text.offer_cards_heading || 'Pick your free gift';

    return (
      <div class="cartmax-claims cartmax-offer-cards">
        <div class="cartmax-claims-heading">{heading}</div>
        <div class="cartmax-claims-scroll">
          {groups.flatMap(function (group) {
            return (group.gifts || []).map(function (g) {
              var vid = String(g.variant_id);
              if (vid.startsWith('gid://')) vid = vid.split('/').pop();
              var isAdding = self.state.updating['offer_' + vid];
              var inCart = g.in_cart;
              return (
                <div class={'cartmax-claim-card' + (inCart ? ' cartmax-claim-card--in-cart' : '')} key={group.offer_id + ':' + vid}>
                  {g.image
                    ? <img class="cartmax-claim-img" src={resizeImage(g.image, 96)} alt={g.title} loading="lazy" />
                    : <div class="cartmax-claim-img-placeholder"><span class="visually-hidden">No image</span></div>
                  }
                  <div class="cartmax-claim-info">
                    {g.title ? <div class="cartmax-claim-title">{g.title}</div> : null}
                    {inCart
                      ? <button
                          class="cartmax-claim-btn cartmax-claim-btn--remove"
                          onClick={function () { self.handleClaimRemove(vid); }}
                        >Remove</button>
                      : <button
                          class="cartmax-claim-btn cartmax-claim-btn--add"
                          onClick={function () { self.handleOfferDisplayAdd(vid, group.offer_id, group.quantity_per_variant); }}
                          disabled={isAdding || !g.available}
                        >{isAdding ? 'Adding...' : (!g.available ? 'Unavailable' : 'Add')}</button>
                    }
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  }

  renderClaimGifts() {
    var result = this.state.evalResult;
    if (!result || !result.claim_gifts) return null;
    var cg = result.claim_gifts;
    if (!cg.applicable_to_current_page) return null;
    if (cg.threshold_remaining) return null;

    var allGifts = cg.gifts || [];
    if (allGifts.length === 0) return null;

    var self = this;
    var cart = this.state.cart;
    var maxClaims = cg.max_claims || allGifts.length;

    function isInCart(vid) {
      if (!cart || !cart.items) return false;
      return cart.items.some(function (item) {
        return String(item.variant_id) === String(vid);
      });
    }

    var gifts = allGifts;

    var cartClaimedCount = 0;
    if (cart && cart.items) {
      cart.items.forEach(function (item) {
        if (item.properties && (item.properties['_claimed'] === 'true' || item.properties['_cartmax_claim'] === 'true')) {
          cartClaimedCount++;
        }
      });
    }
    var limitReached = cartClaimedCount >= maxClaims;

    return (
      <div class="cartmax-claims">
        <div class="cartmax-claims-heading">{cg.section_heading}</div>
        <div class="cartmax-claims-scroll">
          {gifts.map(function (g) {
            var vid = String(g.variant_id);
            if (vid.startsWith('gid://')) vid = vid.split('/').pop();
            var isClaiming = self.state.updating['claim_' + vid];
            var inCart = g.in_cart || isInCart(vid);
            return (
              <div class={'cartmax-claim-card' + (inCart ? ' cartmax-claim-card--in-cart' : '')} key={vid}>
                {g.image
                  ? <img class="cartmax-claim-img" src={resizeImage(g.image, 96)} alt={g.title} loading="lazy" />
                  : <div class="cartmax-claim-img-placeholder"><span class="visually-hidden">No image</span></div>
                }
                <div class="cartmax-claim-info">
                  {g.title ? <div class="cartmax-claim-title">{g.title}</div> : null}
                  {inCart
                    ? <button
                        class="cartmax-claim-btn cartmax-claim-btn--remove"
                        onClick={function () { self.handleClaimRemove(vid); }}
                      >Remove</button>
                    : <button
                        class="cartmax-claim-btn cartmax-claim-btn--add"
                        onClick={function () { self.handleClaimAdd(vid, cg._rule_id); }}
                        disabled={isClaiming || !g.available || limitReached}
                      >{isClaiming ? 'Adding...' : (!g.available ? 'Unavailable' : (limitReached ? 'Limit reached' : 'Add'))}</button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Coupons ────────────────────────────────────────────────

  getAppliedCodes() {
    var cart = this.state.cart;
    if (!cart) return [];
    var codes = [];
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title) codes.push(d.title);
    });
    (cart.items || []).forEach(function (item) {
      (item.line_level_discount_allocations || []).forEach(function (a) {
        if (a.discount_application && a.discount_application.title) {
          codes.push(a.discount_application.title);
        }
      });
    });
    return codes.filter(function (c, i, arr) { return arr.indexOf(c) === i; });
  }

  async handleCouponApply(code) {
    if (!code || !code.trim()) return;
    this.setState({ couponLoading: true, couponError: null });
    try {
      var currentCodes = this.getAppliedCodes();
      var newCode = code.trim();
      if (!currentCodes.some(function (c) { return c.toUpperCase() === newCode.toUpperCase(); })) {
        currentCodes.push(newCode);
      }
      var discountPayload = currentCodes.join(',');

      await cartUpdateAll({ discount: discountPayload });
      var cart = await fetchCart();

      var codeUpper = newCode.toUpperCase();
      var applied = (cart.cart_level_discount_applications || []).some(function (d) {
        return d.title && d.title.toUpperCase() === codeUpper;
      });
      if (!applied) {
        applied = (cart.items || []).some(function (item) {
          return (item.line_level_discount_allocations || []).some(function (a) {
            return a.discount_application && a.discount_application.title &&
              a.discount_application.title.toUpperCase() === codeUpper;
          });
        });
      }

      this._currency = cart.currency || this._currency;
      this.setState({
        cart: cart,
        couponLoading: false,
        couponError: applied ? null : 'Invalid or inapplicable code',
        couponInput: applied ? '' : this.state.couponInput,
        couponPanelOpen: applied ? false : this.state.couponPanelOpen,
      });
      updateCartCount(cart.item_count);
      if (applied) window.dispatchEvent(new CustomEvent('cartmax:cart-action', { detail: { cart: cart } }));
    } catch (err) {
      this.setState({ couponLoading: false, couponError: 'Failed to apply coupon' });
    }
  }

  async handleCouponRemove(codeToRemove) {
    this.setState({ couponLoading: true });
    try {
      var currentCodes = this.getAppliedCodes();
      var removeUpper = (codeToRemove || '').toUpperCase();
      var remaining = currentCodes.filter(function (c) { return c.toUpperCase() !== removeUpper; });
      var discountPayload = remaining.length > 0 ? remaining.join(',') : '';

      await cartUpdateAll({ discount: discountPayload });
      var cart = await fetchCart();

      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart, couponLoading: false });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-action', { detail: { cart: cart } }));
    } catch (err) {
      this.setState({ couponLoading: false });
    }
  }

  getAppliedDiscounts() {
    var cart = this.state.cart;
    if (!cart) return [];
    var codes = [];
    (cart.cart_level_discount_applications || []).forEach(function (d) {
      if (d.title && d.type === 'discount_code') {
        codes.push({ code: d.title, amount: d.total_allocated_amount || 0 });
      }
    });
    return codes;
  }

  renderCoupons() {
    var self = this;
    var isLoading = this.state.couponLoading;
    var appliedDiscounts = this.getAppliedDiscounts();
    var result = this.state.evalResult;
    var available = (result && result.available_coupons) || [];
    var showPanel = this.state.couponPanelOpen;

    return (
      <div class="cartmax-coupons">
        <div class="cartmax-coupon-input-row">
          <input
            class="cartmax-coupon-input"
            type="text"
            placeholder={this._text.coupon_placeholder}
            value={this.state.couponInput || ''}
            onInput={function (e) { self.setState({ couponInput: e.target.value, couponError: null }); }}
            onKeyDown={function (e) { if (e.key === 'Enter') self.handleCouponApply(self.state.couponInput); }}
            disabled={isLoading}
          />
          <button
            class="cartmax-coupon-apply-btn"
            onClick={function () { self.handleCouponApply(self.state.couponInput); }}
            disabled={isLoading || !(self.state.couponInput || '').trim()}
          >{isLoading ? '...' : 'Apply'}</button>
        </div>
        {this.state.couponError
          ? <div class="cartmax-coupon-error">{this.state.couponError}</div>
          : null
        }

        {available.length > 0 && (
          <button
            class="cartmax-coupons-viewall"
            onClick={function () { self.setState({ couponPanelOpen: !showPanel }); }}
          >{showPanel ? 'Hide coupons' : 'View all coupons (' + available.length + ')'}</button>
        )}

        {appliedDiscounts.length > 0 && (
          <div class="cartmax-applied-discounts">
            {appliedDiscounts.map(function (d) {
              return (
                <div class="cartmax-applied-discount" key={d.code}>
                  <div class="cartmax-applied-discount-info">
                    <span class="cartmax-applied-discount-code">{d.code}</span>
                  </div>
                  <button
                    class="cartmax-applied-discount-remove"
                    onClick={function () { self.handleCouponRemove(d.code); }}
                    disabled={isLoading}
                    aria-label={'Remove ' + d.code}
                  ><IconRemoveX /></button>
                </div>
              );
            })}
          </div>
        )}

        <div class={'cartmax-coupon-drawer' + (showPanel ? ' cartmax-coupon-drawer--open' : '')}>
          <div class="cartmax-coupon-drawer-header">
            <button
              class="cartmax-coupon-drawer-back"
              onClick={function () { self.setState({ couponPanelOpen: false }); }}
              aria-label="Back to cart"
            >&#8592;</button>
            <span class="cartmax-coupon-drawer-title">Available Coupons</span>
          </div>
          <div class="cartmax-coupon-drawer-body">
            {available.map(function (c) {
              return (
                <div class={'cartmax-coupon-card' + (c.applied ? ' cartmax-coupon-card--applied' : '')} key={c.id}>
                  <div class="cartmax-coupon-card-header">
                    <span class="cartmax-coupon-card-type">{c.type_label}</span>
                    {!c.is_automatic
                      ? <span class="cartmax-coupon-card-code">{c.code}</span>
                      : <span class="cartmax-coupon-card-auto">Automatic</span>
                    }
                  </div>
                  <div class="cartmax-coupon-card-title">{c.title}</div>
                  {c.display_message ? <div class="cartmax-coupon-card-msg">{c.display_message}</div> : null}
                  {c.applied
                    ? <span class="cartmax-coupon-card-applied"><IconCheck /> Applied</span>
                    : !c.is_automatic
                      ? <button
                          class="cartmax-coupon-card-btn"
                          onClick={function () { self.handleCouponApply(c.code); }}
                          disabled={isLoading}
                        >{isLoading ? 'Applying...' : 'Apply'}</button>
                      : null
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Upsells ────────────────────────────────────────

  async handleUpsellAdd(variantId) {
    var key = 'upsell_' + variantId;
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ updating: updating });
    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: 1 }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
    } catch (err) {
      console.error('[cartx] Upsell add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  renderUpsells() {
    var result = this.state.evalResult;
    if (!result || !result.upsells || !result.upsells.enabled) return null;
    var upsells = result.upsells;
    var products = upsells.products || [];
    if (products.length === 0) return null;

    var cart = this.state.cart;
    var cartVariantIds = (cart && cart.items || []).map(function (i) { return String(i.variant_id); });
    var filtered = products.filter(function (p) {
      var vid = String(p.variant_id);
      if (vid.startsWith('gid://')) vid = vid.split('/').pop();
      return cartVariantIds.indexOf(vid) === -1;
    });
    if (filtered.length === 0) return null;

    var curr = this._currency;
    var self = this;

    return (
      <div class="cartmax-upsells">
        <div class="cartmax-upsells-heading">{upsells.heading || 'You may also like'}</div>
        <div class="cartmax-upsells-scroll">
          {filtered.map(function (p) {
            var vid = String(p.variant_id);
            if (vid.startsWith('gid://')) vid = vid.split('/').pop();
            var isAdding = self.state.updating['upsell_' + vid];
            return (
              <div class="cartmax-upsell-card" key={p.product_id}>
                {p.image_url
                  ? <img class="cartmax-upsell-img" src={resizeImage(p.image_url, 96)} alt={p.title} loading="lazy" />
                  : <div class="cartmax-upsell-img-placeholder"><span class="visually-hidden">No image</span></div>
                }
                <div class="cartmax-upsell-info">
                  <div class="cartmax-upsell-title">{p.title}</div>
                  <div class="cartmax-upsell-price">
                    {p.compare_at_price
                      ? <span class="cartmax-upsell-compare">{formatMoney(Number(p.compare_at_price) * 100, curr)}</span>
                      : null
                    }
                    <span>{formatMoney(Number(p.price) * 100, curr)}</span>
                  </div>
                  <button
                    class="cartmax-upsell-add"
                    onClick={function () { self.handleUpsellAdd(vid); }}
                    disabled={isAdding}
                  >{isAdding ? 'Adding...' : 'Add'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render: Footer (totals + checkout) ────────────────────

  renderFooter() {
    var cart = this.state.cart;
    var curr = this._currency;
    var hasDiscount = cart.total_discount > 0;
    var discounts = cart.cart_level_discount_applications || [];
    var savings = Number(this.state.savings) || 0;
    var savingsParts = (savings > 0 && this._text.savings_label)
      ? this._text.savings_label.split('{amount}')
      : null;

    return (
      <div class="cartmax-footer">
        {savingsParts ? (
          <div class="cartmax-footer-savings">
            <span>{savingsParts[0]}</span>
            <span class="cartmax-footer-savings-amount">{formatMoney(savings, curr)}</span>
            <span>{savingsParts[1] || ''}</span>
          </div>
        ) : null}
        {/* Only show subtotal + discount rows when there's a discount, otherwise just total */}
        {hasDiscount ? (
          <div class="cartmax-totals">
            <div class="cartmax-totals-row">
              <span>{this._text.subtotal_label}</span>
              <span>{formatMoney(cart.items_subtotal_price, curr)}</span>
            </div>
            {discounts.map((d) => {
              var amt = d.total_allocated_amount || d.amount || 0;
              return (
                <div class="cartmax-totals-row cartmax-discount-row" key={d.title}>
                  <span>{d.title || 'Discount'}</span>
                  <span>{'\u2212' + formatMoney(amt, curr)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
        <div class="cartmax-footer-checkout">
          <div class="cartmax-footer-total">
            <span>{this._text.total_label}</span>
            <span>{formatMoney(cart.total_price, curr)}</span>
          </div>
          <a
            class={'cartmax-checkout-btn' + (this.state.checkoutWaiting ? ' cartmax-checkout-waiting' : '')}
            href="/checkout"
            onClick={(e) => {
              // If evaluate is in-flight, wait for it before navigating
              // so gifts/discounts are applied before checkout
              var isProcessing = Object.keys(this.state.updating).length > 0;
              if (isProcessing || this.state.checkoutWaiting) {
                e.preventDefault();
                if (this.state.checkoutWaiting) return;
                this.setState({ checkoutWaiting: true });
                waitForEvaluate().then(() => {
                  this.setState({ checkoutWaiting: false });
                  window.location.href = '/checkout';
                });
              }
            }}
          >{this.state.checkoutWaiting ? 'Preparing...' : this._text.checkout_button}</a>
        </div>
        {this._text.continue_shopping && (
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <button
              class="cartmax-coupons-viewall"
              onClick={() => {
                if (this._text.continue_shopping_url) { window.location.href = this._text.continue_shopping_url; }
                else { this.close(); }
              }}
            >{this._text.continue_shopping}</button>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────

  render(props, { visible, open, cart, loading }) {
    var liveRegion = (
      <div
        id="cartmax-live-region"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      />
    );

    if (!visible) {
      return <div class="cartmax-wrapper">{liveRegion}</div>;
    }

    var isEmpty = !loading && cart && cart.items && cart.items.length === 0;
    var hasItems = !loading && cart && cart.items && cart.items.length > 0;
    var count = cart ? cart.item_count : 0;

    // Build overlay classes from settings
    var overlayClass = 'cartmax-overlay';
    if (open) overlayClass += ' cartmax-open';
    if (this._layout.drawer_position === 'left') overlayClass += ' cartmax-pos-left';
    if (this._shape.button_style === 'outline') overlayClass += ' cartmax-btn-outline';
    if (this._layout.image_style === 'square') overlayClass += ' cartmax-img-square';
    else if (this._layout.image_style === 'circle') overlayClass += ' cartmax-img-circle';
    if (this._layout.qty_style === 'minimal') overlayClass += ' cartmax-qty-minimal';
    if (this._behavior.animation_style === 'fade') overlayClass += ' cartmax-anim-fade';
    else if (this._behavior.animation_style === 'none') overlayClass += ' cartmax-anim-none';

    var sec = this._sections;

    return (
      <div class="cartmax-wrapper">
        {liveRegion}
        <div class={overlayClass} onClick={this.handleOverlayClick}>
          <div
            class="cartmax-drawer"
            ref={(el) => { this._drawerRef = el; }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div class="cartmax-header">
              <span class="cartmax-title">
                {this._text.cart_title}
                {count > 0 ? <span class="cartmax-header-count">{count}</span> : null}
              </span>
              <button class="cartmax-close" onClick={this.close} aria-label="Close cart">
                <IconClose />
              </button>
            </div>

            {/* Gift unavailable notice */}
            {this.state.unavailableGifts.length > 0
              ? <div class="cartmax-gift-unavailable">A gift product is currently unavailable</div>
              : null
            }

            {/* Progress bar */}
            {hasItems && sec.show_progress_bar ? this.renderProgressBar() : null}

            {/* Claim gifts */}
            {hasItems && sec.show_claim_gifts ? this.renderClaimGifts() : null}

            {/* Display-mode offer cards */}
            {hasItems && sec.show_offer_cards ? this.renderOfferDisplays() : null}

            {/* Body */}
            {loading
              ? this.renderLoading()
              : isEmpty
                ? this.renderEmpty()
                : hasItems
                  ? <div class="cartmax-body">{cart.items.map((item) => this.renderLineItem(item))}</div>
                  : null
            }

            {/* Coupons */}
            {hasItems && sec.show_coupons ? this.renderCoupons() : null}

            {/* Upsells */}
            {sec.show_upsells ? this.renderUpsells() : null}

            {/* Ribbon */}
            {hasItems && sec.show_ribbon ? this.renderRibbon() : null}

            {/* Footer */}
            {hasItems ? this.renderFooter() : null}
          </div>
        </div>
      </div>
    );
  }
}
