/* eslint-disable */
import { h, Component } from 'preact';
import { fetchCart, cartUpdateAll, internalFetch, formatMoney, resizeImage, updateCartCount, trapFocus, applyDrawerSettings, dispatchOptimistic, simulateAdd, simulateCouponRemove } from './helpers';
import { fireConfetti, setConfettiLottieUrl } from './confetti';
import { waitForEvaluate } from './evaluate';
import { tracker } from './tracker';
import { ANALYTICS_EVENTS } from './analytics-events';

// ── Timing constants ────────────────────────────────────────

var CLOSE_DELAY = 250;
var DEBOUNCE_DELAY = 300;
var REMOVE_ANIM_DELAY = 0;
var TOMBSTONE_HOLD_MS = 280;   // matches the cartmax-line-removing CSS transition
var PROCESSING_TIMEOUT = 10000;
var INLINE_ERROR_HOLD_MS = 4000;

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

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" />
      <path d="M18 14 18.75 16.75 21.5 17.5 18.75 18.25 18 21 17.25 18.25 14.5 17.5 17.25 16.75z" opacity="0.6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
      claimed: {},        // key -> true, button-level optimistic state for freebie claims
      claimError: {},     // key -> message, inline error shown on offer/claim card
      upsellError: null,  // brief error message displayed near upsell list on rollback
    };
    this.close = this.close.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this._closeTimer = null;
    this._focusCleanup = null;
    this._triggerElement = null;
    this._drawerRef = null;
    this._debounceTimers = {};
    this._processingTimeout = null;
    this._removingTombstones = {};       // key -> snapshotted item, kept in DOM during fade
    this._tombstoneTimers = {};          // key -> setTimeout handle
    this._pendingGiftRemovals = {};      // key -> { promotion_id, promotion_type, variant_id } for analytics
    this._errorTimers = {};              // key -> setTimeout handle for clearing inline errors
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

        // Detect removed items for animation. Pending optimistic keys
        // that resolved to a real Shopify key in newCart are NOT removed.
        var oldItems = (this.state.cart && this.state.cart.items) || [];
        var removing = this._detectRemovedKeys(oldItems, newCart);

        // Fire deferred gift-removed analytics for any pending removals
        // the server confirmed (line is gone from newCart). Drop pending
        // entries for keys that came back (server kept the line).
        var pendingRemovals = this._pendingGiftRemovals || {};
        var newKeySet = {};
        (newCart.items || []).forEach(function (it) { newKeySet[it.key] = true; });
        Object.keys(pendingRemovals).forEach((k) => {
          if (!newKeySet[k]) {
            tracker.track(ANALYTICS_EVENTS.GIFT_REMOVED, pendingRemovals[k]);
          }
          delete pendingRemovals[k];
        });

        var newSavings = (newEval && typeof newEval.total_savings === 'number')
          ? newEval.total_savings
          : this.state.savings;

        // Tombstones handle the fade; we can apply newCart immediately
        // without a delay. Lines that ought to fade are in the tombstone
        // map and will be merged in by _displayItems() until their
        // setTimeout clears them.
        this.setState({
          cart: newCart,
          evalResult: newEval,
          savings: newSavings,
          loading: false,
          updating: {},
          removing: Object.keys(removing).length > 0 ? removing : this.state.removing,
          pendingQty: {},
        });
        updateCartCount(newCart.item_count);
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

    // ── Analytics tracker ────────────────────────────────────
    var rootEl = document.getElementById('cartmax-root');
    if (rootEl) {
      var analyticsEnabled = rootEl.dataset.analyticsEnabled !== 'false';
      tracker.init({
        shopId: rootEl.dataset.shopId || '',
        customerId: rootEl.dataset.customerId || null,
        proxyBase: rootEl.dataset.proxyBase || '/apps/cartmax',
        enabled: analyticsEnabled,
      });
    }

    // promotion_viewed dedupes per session in the tracker. We attach one
    // IntersectionObserver and observe any node tagged with data-cartmax-promo-id.
    this._promoObserver = (typeof IntersectionObserver !== 'undefined')
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var id = el.getAttribute('data-cartmax-promo-id');
            var type = el.getAttribute('data-cartmax-promo-type');
            if (id) tracker.trackPromotionView(id, type);
            this._promoObserver.unobserve(el);
          });
        }, { threshold: 0.5 })
      : null;

    // ── Public API for third-party apps ──────────────────
    var self = this;
    window.cartx = {
      open: function () { self.loadCart(); self.openDrawer(); },
      close: function () { self.close(); },
      toggle: function () { self.state.open ? self.close() : (self.loadCart(), self.openDrawer()); },
      refresh: function () { self.loadCart(); window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: {} })); },
      isOpen: function () { return self.state.open; },
    };

    // Cart icon selectors — broadened to cover Dawn, Refresh, Sense, Origin,
    // Horizon, and other modern Shopify themes that wrap the icon in a
    // custom element or use newer aria patterns.
    var CART_ICON_SELECTORS = [
      'a[href="/cart"]',
      'a[href="/cart/"]',
      'a[href^="/cart?"]',
      '[data-cart-icon]',
      '[data-cart-trigger]',
      '[data-cart-link]',
      '#cart-icon-bubble',
      '#cart-bubble',
      '#CartBubble',
      'cart-icon-bubble',
      '[aria-controls*="cart-drawer"]',
      '[aria-controls*="CartDrawer"]',
      '[aria-controls*="Cart-drawer"]',
      // Horizon: the icon is a direct-child <button> of <cart-drawer-component>.
      // The <dialog> sibling we strip below, so this selector only ever matches
      // the icon trigger button, never anything inside the drawer body.
      'cart-drawer-component > button',
    ].join(', ');

    // Cart icon click — open drawer. Capture phase + stopImmediatePropagation
    // so a host theme's own listener (e.g. Horizon's cart-drawer-component)
    // never gets a chance to fire.
    this._onDocClick = (e) => {
      var link = e.target.closest(CART_ICON_SELECTORS);
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
        this._triggerElement = link;
        this.loadCart();
        this.openDrawer();
      }
    };
    document.addEventListener('click', this._onDocClick, true);

    // Cart icon hover — prefetch cart data so open is instant
    this._onDocMouseover = (e) => {
      var link = e.target.closest(CART_ICON_SELECTORS);
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

    // ── Host-theme compatibility ─────────────────────────────
    // Themes like Shopify Horizon nest the cart icon BUTTON inside a
    // <cart-drawer-component> wrapper that also contains a native <dialog>
    // for the drawer body. The wrapper must stay in the DOM (the icon
    // depends on it), but we strip the inner <dialog> so Horizon's
    // showModal() call has nothing to show and can't add scroll-lock.
    this._installThemeCompat();
  }

  _installThemeCompat() {
    var DRAWER_BODY_SELECTOR = 'cart-drawer-component > dialog, cart-notification-component > dialog';

    function purgeNativeDrawerBodies(root) {
      try {
        if (root && root.matches && root.matches(DRAWER_BODY_SELECTOR)) {
          root.remove();
          return;
        }
        if (root && root.querySelectorAll) {
          root.querySelectorAll(DRAWER_BODY_SELECTOR).forEach(function (el) {
            el.remove();
          });
        }
      } catch (_) { /* detached node, ignore */ }
    }

    // Initial purge — strip any dialog Horizon already rendered.
    purgeNativeDrawerBodies(document);

    // Watch for re-adds (theme JS may re-mount the dialog on navigation).
    this._horizonObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          purgeNativeDrawerBodies(added[j]);
        }
      }
    });
    this._horizonObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Safety net: only strips classes that are unambiguously cart-related.
    // We deliberately do NOT touch generic classes like 'overflow-hidden'
    // or 'no-scroll' — those are commonly used by non-cart modals
    // (search drawers, login overlays) and stripping them would break the
    // host theme's other components. Inline html style is also left alone
    // for the same reason.
    var SCROLL_LOCK_CLASSES = ['scroll-lock', 'cart-drawer-open'];
    function cleanScrollLock() {
      var html = document.documentElement;
      for (var i = 0; i < SCROLL_LOCK_CLASSES.length; i++) {
        if (html.classList.contains(SCROLL_LOCK_CLASSES[i])) {
          html.classList.remove(SCROLL_LOCK_CLASSES[i]);
        }
      }
    }
    cleanScrollLock();
    this._scrollLockObserver = new MutationObserver(cleanScrollLock);
    this._scrollLockObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
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
    if (this._horizonObserver) this._horizonObserver.disconnect();
    if (this._scrollLockObserver) this._scrollLockObserver.disconnect();
    if (this._promoObserver) this._promoObserver.disconnect();
    Object.values(this._debounceTimers).forEach(clearTimeout);
    Object.values(this._tombstoneTimers || {}).forEach(clearTimeout);
    Object.values(this._errorTimers || {}).forEach(clearTimeout);
    if (this._upsellErrorTimer) clearTimeout(this._upsellErrorTimer);
    this._clearProcessingTimeout();
    tracker.flush({ useBeacon: true });
  }

  // Ref callback for elements that represent a promotion impression target.
  _observePromo(el) {
    if (!el || !this._promoObserver) return;
    this._promoObserver.observe(el);
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
  // Also aliases optimistic `pending_*` keys to the real Shopify key
  // they reconcile to (matched by variant_id + properties signature)
  // so an optimistic-add line keeps its slot when the real cart lands.

  _stabiliseOrder(cart) {
    if (!cart || !cart.items) return cart;
    var oldItems = (this.state.cart && this.state.cart.items) || [];
    if (oldItems.length === 0) return cart;

    var oldOrder = {};
    var pendingOldItems = [];
    oldItems.forEach(function (item, idx) {
      oldOrder[item.key] = idx;
      if (typeof item.key === 'string' && item.key.indexOf('pending_') === 0) {
        pendingOldItems.push(item);
      }
    });

    // Alias each pending key to a same-variant real-key in the new cart,
    // first-match-wins so duplicate pending entries each get a distinct
    // partner.
    var aliasFromReal = {};   // realKey -> oldOrder position to inherit
    var claimed = {};
    for (var p = 0; p < pendingOldItems.length; p++) {
      var pend = pendingOldItems[p];
      for (var q = 0; q < cart.items.length; q++) {
        var n = cart.items[q];
        if (claimed[n.key]) continue;
        if (typeof n.key === 'string' && n.key.indexOf('pending_') === 0) continue;
        if (String(n.variant_id) !== String(pend.variant_id)) continue;
        claimed[n.key] = true;
        aliasFromReal[n.key] = oldOrder[pend.key];
        break;
      }
    }

    var sorted = cart.items.slice().sort(function (a, b) {
      var ia = aliasFromReal.hasOwnProperty(a.key) ? aliasFromReal[a.key]
        : (oldOrder.hasOwnProperty(a.key) ? oldOrder[a.key] : 99999);
      var ib = aliasFromReal.hasOwnProperty(b.key) ? aliasFromReal[b.key]
        : (oldOrder.hasOwnProperty(b.key) ? oldOrder[b.key] : 99999);
      return ia - ib;
    });
    return Object.assign({}, cart, { items: sorted });
  }

  // Compute the set of old keys that have NO matching new key — used to
  // play the remove-fade animation. Pending keys that aliased to a real
  // key are NOT considered removed (their optimistic line is being
  // promoted to the real line, not removed).
  _detectRemovedKeys(oldItems, newCart) {
    var newKeys = {};
    var pendingReals = {};   // real keys claimed by a pending alias
    (newCart.items || []).forEach(function (item) { newKeys[item.key] = true; });

    // Claim a real key for each pending old item (mirrors _stabiliseOrder).
    var claimed = {};
    oldItems.forEach(function (oldItem) {
      if (!(typeof oldItem.key === 'string' && oldItem.key.indexOf('pending_') === 0)) return;
      for (var q = 0; q < (newCart.items || []).length; q++) {
        var n = newCart.items[q];
        if (claimed[n.key]) continue;
        if (typeof n.key === 'string' && n.key.indexOf('pending_') === 0) continue;
        if (String(n.variant_id) !== String(oldItem.variant_id)) continue;
        claimed[n.key] = true;
        pendingReals[oldItem.key] = true;   // this pending was matched
        break;
      }
    });

    var removing = {};
    oldItems.forEach(function (item) {
      if (newKeys[item.key]) return;
      if (pendingReals[item.key]) return;   // optimistic add got reconciled
      removing[item.key] = true;
    });
    return removing;
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

    this._openedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var cart = this.state.cart;
    tracker.track(ANALYTICS_EVENTS.DRAWER_OPENED, {
      cart_total: cart ? cart.total_price : null,
      item_count: cart ? cart.item_count : null,
    });
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

    if (this._openedAt != null) {
      var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      var dwellMs = Math.max(0, Math.round(now - this._openedAt));
      var cart = this.state.cart;
      tracker.track(ANALYTICS_EVENTS.DRAWER_CLOSED, {
        cart_total: cart ? cart.total_price : null,
        item_count: cart ? cart.item_count : null,
        dwell_ms: dwellMs,
      });
      this._openedAt = null;
    }
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

  // ── Remove item (optimistic with tombstone fade) ──────────
  // 1. Snapshot the line as a tombstone so it stays in DOM for the fade.
  // 2. Dispatch cart-action synchronously — totals + bar update immediately
  //    via evaluate.js → cartmax:optimistic-update.
  // 3. After TOMBSTONE_HOLD_MS, drop the tombstone. Analytics fire only when
  //    the server reconcile confirms the removal.

  handleRemove(key) {
    if (this._debounceTimers[key]) {
      clearTimeout(this._debounceTimers[key]);
      delete this._debounceTimers[key];
    }

    var cart = this.state.cart;
    var line = cart && cart.items && cart.items.find(function (i) { return i.key === key; });

    // Defer GIFT_REMOVED analytics until reconcile confirms (see _onInternalReload).
    if (line && line.properties && line.properties._freebie === 'true') {
      this._pendingGiftRemovals[key] = {
        promotion_id: line.properties._offer_id || null,
        promotion_type: line.properties._cartmax_claim === 'true' ? 'claim-gift' : 'offer',
        variant_id: String(line.variant_id),
      };
    }

    // Stash the line as a tombstone so the fade can play while the
    // optimistic update strips the line from state.cart.
    if (line) this._removingTombstones[key] = line;

    var removing = Object.assign({}, this.state.removing);
    removing[key] = true;
    var updating = Object.assign({}, this.state.updating);
    updating[key] = true;
    this.setState({ removing: removing, updating: updating });
    this._startProcessingTimeout();

    window.dispatchEvent(new CustomEvent('cartmax:cart-action', {
      detail: { cart: this.state.cart, action: { key: key, qty: 0 } },
    }));
    this.announce('Removing item...');

    // Drop the tombstone after the fade. The line may already be gone from
    // state.cart by now (optimistic update fired); the tombstone is the
    // only thing keeping it visible.
    if (this._tombstoneTimers[key]) clearTimeout(this._tombstoneTimers[key]);
    this._tombstoneTimers[key] = setTimeout(() => {
      delete this._tombstoneTimers[key];
      delete this._removingTombstones[key];
      var nextRemoving = Object.assign({}, this.state.removing);
      delete nextRemoving[key];
      this.setState({ removing: nextRemoving });
    }, TOMBSTONE_HOLD_MS);
  }

  // Render-time merge: list items currently in cart, plus any tombstoned
  // items not in cart (so the fade can finish before they unmount).
  _displayItems() {
    var cart = this.state.cart;
    var cartItems = (cart && cart.items) || [];
    var inCart = {};
    cartItems.forEach(function (item) { inCart[item.key] = true; });
    var merged = cartItems.slice();
    var tombs = this._removingTombstones || {};
    Object.keys(tombs).forEach(function (key) {
      if (!inCart[key]) merged.push(tombs[key]);
    });
    return merged;
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
        {bar.top_message ? (
          <div class="cartmax-progress-msg-wrap">
            <div class="cartmax-progress-msg">
              <IconSparkle />
              <span>{bar.top_message}</span>
            </div>
          </div>
        ) : null}
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
          {!isClaimed && !isFreebie && item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0
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

  // ── Claim Gifts (button-level optimistic, line pessimistic) ─

  _showClaimError(key, message) {
    if (this._errorTimers[key]) clearTimeout(this._errorTimers[key]);
    var nextError = Object.assign({}, this.state.claimError);
    nextError[key] = message;
    this.setState({ claimError: nextError });
    this._errorTimers[key] = setTimeout(() => {
      delete this._errorTimers[key];
      var clear = Object.assign({}, this.state.claimError);
      delete clear[key];
      this.setState({ claimError: clear });
    }, INLINE_ERROR_HOLD_MS);
  }

  _clearClaimError(key) {
    if (this._errorTimers[key]) {
      clearTimeout(this._errorTimers[key]);
      delete this._errorTimers[key];
    }
    if (this.state.claimError[key]) {
      var clear = Object.assign({}, this.state.claimError);
      delete clear[key];
      this.setState({ claimError: clear });
    }
  }

  async handleClaimAdd(variantId, claimId) {
    var key = 'claim_' + variantId;

    // Button-level optimistic: card flips to "Claimed ✓" immediately.
    // No optimistic line in the cart — the line materialises on reconcile.
    this._clearClaimError(key);
    this.setState({
      claimed: Object.assign({}, this.state.claimed, { [key]: true }),
      updating: Object.assign({}, this.state.updating, { [key]: true }),
    });

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
      tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, {
        promotion_id: claimId,
        promotion_type: 'claim-gift',
        variant_id: String(variantId),
        cart_total: cart.total_price,
        item_count: cart.item_count,
      });
    } catch (err) {
      // Rollback the button — claim state revert + inline error.
      var nextClaimed = Object.assign({}, this.state.claimed);
      delete nextClaimed[key];
      this.setState({ claimed: nextClaimed });
      this._showClaimError(key, 'Out of stock');
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
    // Clear any lingering button-optimistic "Claimed ✓" state so it doesn't
    // flash back on next render when inCart flips false.
    var nextClaimed = Object.assign({}, this.state.claimed);
    delete nextClaimed['claim_' + variantId];
    delete nextClaimed['offer_' + variantId];
    this.setState({ claimed: nextClaimed });
    this.handleRemove(line.key);
  }

  // Display-mode offer: customer manually adds the gift from a card.
  // Button-level optimistic (same pattern as handleClaimAdd) — the cart
  // line itself stays pessimistic to avoid blink-in/blink-out on
  // inventory rejection.
  async handleOfferDisplayAdd(variantId, offerId, quantity) {
    var key = 'offer_' + variantId;

    this._clearClaimError(key);
    this.setState({
      claimed: Object.assign({}, this.state.claimed, { [key]: true }),
      updating: Object.assign({}, this.state.updating, { [key]: true }),
    });

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
      var nextClaimed = Object.assign({}, this.state.claimed);
      delete nextClaimed[key];
      this.setState({ claimed: nextClaimed });
      this._showClaimError(key, 'Out of stock');
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
          {groups.map(function (group) {
            return (
              <div
                class="cartmax-offer-group"
                key={'group:' + group.offer_id}
                data-cartmax-promo-id={group.offer_id}
                data-cartmax-promo-type="offer"
                ref={function (el) { self._observePromo(el); }}
              >
                {(group.gifts || []).map(function (g) {
                  var vid = String(g.variant_id);
                  if (vid.startsWith('gid://')) vid = vid.split('/').pop();
                  var btnKey = 'offer_' + vid;
                  var isAdding = self.state.updating[btnKey];
                  var isClaimedOptimistic = self.state.claimed[btnKey];
                  var claimErr = self.state.claimError[btnKey];
                  var inCart = g.in_cart;
                  var showClaimedBtn = isClaimedOptimistic && !inCart;
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
                          : showClaimedBtn
                            ? <button
                                class="cartmax-claim-btn cartmax-claim-btn--claimed"
                                disabled
                              ><IconCheck /> Claimed</button>
                            : <button
                                class="cartmax-claim-btn cartmax-claim-btn--add"
                                onClick={function () { self.handleOfferDisplayAdd(vid, group.offer_id, group.quantity_per_variant); }}
                                disabled={isAdding || !g.available}
                              >{isAdding ? 'Adding...' : (!g.available ? 'Unavailable' : 'Add')}</button>
                        }
                        {claimErr ? <div class="cartmax-claim-error">{claimErr}</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
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
      <div
        class="cartmax-claims"
        data-cartmax-promo-id={cg._rule_id}
        data-cartmax-promo-type="claim-gift"
        ref={function (el) { self._observePromo(el); }}
      >
        <div class="cartmax-claims-heading">{cg.section_heading}</div>
        <div class="cartmax-claims-scroll">
          {gifts.map(function (g) {
            var vid = String(g.variant_id);
            if (vid.startsWith('gid://')) vid = vid.split('/').pop();
            var btnKey = 'claim_' + vid;
            var isClaiming = self.state.updating[btnKey];
            var isClaimedOptimistic = self.state.claimed[btnKey];
            var claimErr = self.state.claimError[btnKey];
            var inCart = g.in_cart || isInCart(vid);
            var showClaimedBtn = isClaimedOptimistic && !inCart;
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
                    : showClaimedBtn
                      ? <button
                          class="cartmax-claim-btn cartmax-claim-btn--claimed"
                          disabled
                        ><IconCheck /> Claimed</button>
                      : <button
                          class="cartmax-claim-btn cartmax-claim-btn--add"
                          onClick={function () { self.handleClaimAdd(vid, cg._rule_id); }}
                          disabled={isClaiming || !g.available || limitReached}
                        >{isClaiming ? 'Adding...' : (!g.available ? 'Unavailable' : (limitReached ? 'Limit reached' : 'Add'))}</button>
                  }
                  {claimErr ? <div class="cartmax-claim-error">{claimErr}</div> : null}
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

      tracker.track(
        applied ? ANALYTICS_EVENTS.COUPON_APPLIED : ANALYTICS_EVENTS.COUPON_REJECTED,
        {
          promotion_type: 'coupon',
          code: newCode,
          reason: applied ? null : 'not_applicable',
          cart_total: cart.total_price,
          item_count: cart.item_count,
        },
      );
    } catch (err) {
      this.setState({ couponLoading: false, couponError: 'Failed to apply coupon' });
      tracker.track(ANALYTICS_EVENTS.COUPON_REJECTED, {
        promotion_type: 'coupon',
        code: (code || '').trim(),
        reason: 'request_failed',
      });
    }
  }

  async handleCouponRemove(codeToRemove) {
    var snapshot = this.state.cart;
    this.setState({ couponLoading: true });

    // Optimistic: drop the chip from cart_level_discount_applications.
    // Totals stay where they are until reconcile — re-running the merchant's
    // discount engine client-side isn't possible. Acceptable: the chip
    // disappearing is the visible feedback.
    if (snapshot) dispatchOptimistic(simulateCouponRemove(snapshot, codeToRemove));

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
      // Rollback the chip.
      if (snapshot) dispatchOptimistic(snapshot);
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

  _showUpsellError(message) {
    if (this._upsellErrorTimer) clearTimeout(this._upsellErrorTimer);
    this.setState({ upsellError: message });
    this._upsellErrorTimer = setTimeout(() => {
      this._upsellErrorTimer = null;
      this.setState({ upsellError: null });
    }, INLINE_ERROR_HOLD_MS);
  }

  // Line-level optimistic add. Customer explicitly chose a paid item;
  // out-of-stock is an intuitive failure mode worth the line-blink risk.
  async handleUpsellAdd(variantId, productMeta) {
    var key = 'upsell_' + variantId;
    var snapshot = this.state.cart;

    this.setState({ updating: Object.assign({}, this.state.updating, { [key]: true }) });

    if (productMeta && snapshot) {
      var unitPriceCents = Math.round(Number(productMeta.price || 0) * 100);
      var optimisticItem = {
        key: 'pending_upsell_' + variantId + '_' + Date.now(),
        variant_id: Number(variantId),
        quantity: 1,
        price: unitPriceCents,
        line_price: unitPriceCents,
        final_line_price: unitPriceCents,
        original_line_price: unitPriceCents,
        product_title: productMeta.title || '',
        title: productMeta.title || '',
        image: productMeta.image || '',
        variant_title: productMeta.variant_title || '',
        properties: {},
        line_level_discount_allocations: [],
      };
      dispatchOptimistic(simulateAdd(snapshot, optimisticItem));
    }

    try {
      await internalFetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: 1 }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      window.dispatchEvent(new CustomEvent('cartmax:internal-reload', { detail: { cart: cart } }));
      window.dispatchEvent(new CustomEvent('cartmax:cart-changed', { detail: { cart: cart } }));
      tracker.track(ANALYTICS_EVENTS.UPSELL_ADDED, {
        promotion_type: 'upsell',
        variant_id: String(variantId),
        cart_total: cart.total_price,
        item_count: cart.item_count,
      });
    } catch (err) {
      // Roll back optimistic line.
      if (snapshot) dispatchOptimistic(snapshot);
      this._showUpsellError('Could not add — out of stock or unavailable.');
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
        {this.state.upsellError
          ? <div class="cartmax-upsell-error">{this.state.upsellError}</div>
          : null
        }
        <div class="cartmax-upsells-scroll">
          {filtered.map(function (p) {
            var vid = String(p.variant_id);
            if (vid.startsWith('gid://')) vid = vid.split('/').pop();
            var isAdding = self.state.updating['upsell_' + vid];
            var productMeta = {
              title: p.title,
              image: p.image_url,
              price: p.price,
            };
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
                    onClick={function () { self.handleUpsellAdd(vid, productMeta); }}
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
            <span class="cartmax-footer-savings-icon"><IconSparkle /></span>
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
            {discounts.length > 0
              ? discounts.map((d) => {
                  var amt = d.total_allocated_amount || d.amount || 0;
                  return (
                    <div class="cartmax-totals-row cartmax-discount-row" key={d.title}>
                      <span>{d.title || 'Discount'}</span>
                      <span>{'\u2212' + formatMoney(amt, curr)}</span>
                    </div>
                  );
                })
              : (cart.total_discount > 0
                  ? <div class="cartmax-totals-row cartmax-discount-row">
                      <span>Discounts</span>
                      <span>{'\u2212' + formatMoney(cart.total_discount, curr)}</span>
                    </div>
                  : null
                )
            }
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
          >
            <IconLock />
            <span>{this.state.checkoutWaiting ? 'Preparing...' : this._text.checkout_button}</span>
          </a>
        </div>
        <div class="cartmax-footer-trust">
          <IconLock />
          <span>Guaranteed safe &amp; secure checkout</span>
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
                  ? <div class="cartmax-body">{this._displayItems().map((item) => this.renderLineItem(item))}</div>
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
