/* eslint-disable */
import { h, Component } from 'preact';
import { fetchCart, cartUpdateAll, internalFetch, formatMoney, resizeImage, updateCartCount, trapFocus } from './helpers';

// ── Timing constants ────────────────────────────────────────

var CLOSE_DELAY = 300;
var DEBOUNCE_DELAY = 500;
var REMOVE_ANIM_DELAY = 300;
var PROCESSING_TIMEOUT = 10000;

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
  }

  componentDidMount() {
    // External ATC intercepted → use cart from event (no extra fetch) and open drawer
    window.addEventListener('cartmax:cart-changed', (e) => {
      if (e.detail && e.detail.cart) {
        var cart = e.detail.cart;
        this._currency = cart.currency || this._currency;
        this.setState({ cart: cart, loading: false });
        updateCartCount(cart.item_count);
      } else {
        this.loadCart();
      }
      this.openDrawer();
    });

    // Evaluate result → update bar/ribbon state
    window.addEventListener('cartmax:eval-result', (e) => {
      if (e.detail) this.setState({ evalResult: e.detail });
    });

    // Cart updated (single /cart/update.js completed) → sync drawer
    // Batches cart data + eval result in one setState to avoid multiple re-renders
    window.addEventListener('cartmax:internal-reload', (e) => {
      if (e.detail && e.detail.cart) {
        var newCart = e.detail.cart;
        var newEval = e.detail.evalResult || this.state.evalResult;
        this._currency = newCart.currency || this._currency;

        // Detect removed items for animation
        var oldItems = (this.state.cart && this.state.cart.items) || [];
        var newKeys = {};
        (newCart.items || []).forEach(function (item) { newKeys[item.key] = true; });

        var removing = {};
        oldItems.forEach(function (item) {
          if (!newKeys[item.key]) {
            removing[item.key] = true;
          }
        });

        if (Object.keys(removing).length > 0) {
          this.setState({ removing: removing, updating: {}, pendingQty: {}, loading: false, evalResult: newEval });
          setTimeout(() => {
            this.setState({ cart: newCart, removing: {} });
            updateCartCount(newCart.item_count);
          }, 300);
        } else {
          // Single setState: cart + eval + clear all pending states
          this.setState({
            cart: newCart,
            evalResult: newEval,
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
    });

    // Gift unavailable notification
    window.addEventListener('cartmax:gift-unavailable', (e) => {
      var variants = (e.detail && e.detail.variants) || [];
      this.setState({ unavailableGifts: variants });
    });

    // Mark ready and flush any queued events from before mount
    window.__cartmaxReady = true;
    if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
      this.loadCart();
      this.openDrawer();
      window.__cartmaxQueue = [];
    }

    // Intercept clicks on cart icon/link
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

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.open) this.close();
    });
  }

  // ── Cart data ─────────────────────────────────────────────

  async loadCart() {
    // Only show skeleton if we have no cart data yet (first load)
    if (!this.state.cart) {
      this.setState({ loading: true });
    }
    try {
      var cart = await fetchCart();
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
    this.close();
  }

  // ── Processing safety timeout ──────────────────────────────

  _startProcessingTimeout() {
    this._clearProcessingTimeout();
    this._processingTimeout = setTimeout(() => {
      console.warn('[CartMax] Processing timeout — forcing recovery');
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

    return (
      <div id="cartmax-progress" className="cartmax-progress">
        <div className="cartmax-progress-track">
          <div className="cartmax-progress-fill" style={{ width: pct + '%' }} ><span className='visually-hidden'>Progress fill</span></div>
          {tiers.map((tier, i) => {
            var pos = ((i + 1) / n) * 100;
            var cls = 'cartmax-milestone';
            if (tier.state === 'active') cls += ' cartmax-milestone--active';
            else if (tier.state === 'next') cls += ' cartmax-milestone--next';
            return (
              <div class={cls} style={{ left: pos + '%' }} key={i}>
                <div class="cartmax-milestone-dot" />
                <div class="cartmax-milestone-label">
                  {(tier.label || '').split('\n+ ')[0]}
                </div>
              </div>
            );
          })}
        </div>
        {bar.top_message ? <div class="cartmax-progress-msg">{bar.top_message}</div> : null}
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
    var isClaimed = item.properties && item.properties['_claimed'] === 'true';
    var cls = 'cartmax-line-item'
      + (isRemoving ? ' cartmax-line-removing' : '')
      + (isFreebie ? ' cartmax-line-freebie' : '');

    return (
      <div class={cls} key={item.key}>
        <div class="cartmax-line-image">
          {item.image
            ? <img src={resizeImage(item.image, 128)} alt={item.title} width="64" height="64" loading="lazy" />
            : <div class="cartmax-line-image-placeholder" />
          }
        </div>
        <div class="cartmax-line-details">
          <div class="cartmax-line-title">{item.product_title}</div>
          {item.variant_title ? <div class="cartmax-line-variant">{item.variant_title}</div> : null}
          <div class="cartmax-line-price">
            {isFreebie
              ? <span class="cartmax-line-price-free">FREE</span>
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
                  >&#8722;</button>
                  <span class={'cartmax-qty-value' + (isPending ? ' cartmax-qty-pending' : '')}>
                    {displayQty}
                  </span>
                  <button
                    class="cartmax-qty-btn"
                    onClick={() => this.queueQuantityChange(item.key, displayQty + 1)}
                    disabled={isUpdating}
                    aria-label="Increase quantity"
                  >+</button>
                </div>
                <button
                  class="cartmax-remove-btn"
                  onClick={() => this.handleRemove(item.key)}
                  disabled={isUpdating || isRemoving}
                  aria-label={'Remove ' + item.product_title}
                >Remove</button>
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
        <div class="cartmax-skeleton" />
        <div class="cartmax-skeleton" />
        <div class="cartmax-skeleton" />
      </div>
    );
  }

  // ── Render: Empty state ───────────────────────────────────

  renderEmpty() {
    return (
      <div class="cartmax-empty">
        <p class="cartmax-empty-text">Your cart is empty</p>
        <button class="cartmax-continue-btn" onClick={this.close}>Continue shopping</button>
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
          properties: { _freebie: 'true', _claimed: 'true', _offer_id: claimId },
        }),
      });
      var cart = await fetchCart();
      this._currency = cart.currency || this._currency;
      this.setState({ cart: cart });
      updateCartCount(cart.item_count);
      window.dispatchEvent(new CustomEvent('cartmax:cart-ready', { detail: { cart: cart } }));
    } catch (err) {
      console.error('[CartMax] Claim add error:', err);
    } finally {
      var newUpdating = Object.assign({}, this.state.updating);
      delete newUpdating[key];
      this.setState({ updating: newUpdating });
    }
  }

  async handleClaimRemove(variantId) {
    var cart = this.state.cart;
    if (!cart) return;
    // Find the line item by variant_id (any source — claimed, normal add, etc.)
    var line = cart.items.find(function (i) {
      return String(i.variant_id) === String(variantId);
    });
    if (!line) return;
    this.handleRemove(line.key);
  }

  renderClaimGifts() {
    var result = this.state.evalResult;
    if (!result || !result.claim_gifts) return null;
    var cg = result.claim_gifts;
    if (!cg.applicable_to_current_page) return null;

    // Threshold not yet met — progress bar handles the milestone messaging
    if (cg.threshold_remaining) return null;

    var allGifts = cg.gifts || [];
    if (allGifts.length === 0) return null;

    var self = this;
    var cart = this.state.cart;
    var maxClaims = cg.max_claims || allGifts.length;

    // Check if variant is anywhere in cart
    function isInCart(vid) {
      if (!cart || !cart.items) return false;
      return cart.items.some(function (item) {
        return String(item.variant_id) === String(vid);
      });
    }

    var gifts = allGifts;

    // Count claimed items from actual cart state
    var cartClaimedCount = 0;
    if (cart && cart.items) {
      cart.items.forEach(function (item) {
        if (item.properties && item.properties['_claimed'] === 'true') {
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
                  ? <img class="cartmax-claim-img" src={resizeImage(g.image, 120)} alt={g.title} loading="lazy" />
                  : <div class="cartmax-claim-img-placeholder" />
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
    // Deduplicate
    return codes.filter(function (c, i, arr) { return arr.indexOf(c) === i; });
  }

  async handleCouponApply(code) {
    if (!code || !code.trim()) return;
    this.setState({ couponLoading: true, couponError: null });
    try {
      // Build comma-separated discount list: existing + new code
      var currentCodes = this.getAppliedCodes();
      var newCode = code.trim();
      if (!currentCodes.some(function (c) { return c.toUpperCase() === newCode.toUpperCase(); })) {
        currentCodes.push(newCode);
      }
      var discountPayload = currentCodes.join(',');

      // Apply via /cart/update.js with discount parameter
      await cartUpdateAll({ discount: discountPayload });
      var cart = await fetchCart();

      // Verify it was applied
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
      // Build list without the removed code
      var currentCodes = this.getAppliedCodes();
      var removeUpper = (codeToRemove || '').toUpperCase();
      var remaining = currentCodes.filter(function (c) { return c.toUpperCase() !== removeUpper; });
      var discountPayload = remaining.length > 0 ? remaining.join(',') : '';

      // Send via /cart/update.js
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
    var curr = this._currency;

    return (
      <div class="cartmax-coupons">
        {/* Discount code input */}
        <div class="cartmax-coupon-input-row">
          <input
            class="cartmax-coupon-input"
            type="text"
            placeholder="Discount code"
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

        {/* View all coupons toggle */}
        {available.length > 0 && (
          <button
            class="cartmax-coupons-viewall"
            onClick={function () { self.setState({ couponPanelOpen: !showPanel }); }}
          >{showPanel ? 'Hide coupons' : 'View all coupons (' + available.length + ')'}</button>
        )}

        {/* Applied discount codes */}
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
                  >&#10005;</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Coupon drawer — slides in from right */}
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
                    ? <span class="cartmax-coupon-card-applied">Applied</span>
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
      window.dispatchEvent(new CustomEvent('cartmax:cart-ready', { detail: { cart: cart } }));
    } catch (err) {
      console.error('[CartMax] Upsell add error:', err);
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

    // Filter out products already in cart
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
                  ? <img class="cartmax-upsell-img" src={resizeImage(p.image_url, 120)} alt={p.title} loading="lazy" />
                  : <div class="cartmax-upsell-img-placeholder" />
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

    return (
      <div class="cartmax-footer">
        <div class="cartmax-totals">
          <div class="cartmax-totals-row">
            <span>Subtotal</span>
            <span>{formatMoney(cart.items_subtotal_price, curr)}</span>
          </div>
          {cart.cart_level_discount_applications && cart.cart_level_discount_applications.length > 0
            ? cart.cart_level_discount_applications.map((d) => {
                var amt = d.total_allocated_amount || d.amount || 0;
                return (
                  <div class="cartmax-totals-row cartmax-discount-row" key={d.title}>
                    <span>{d.title || 'Discount'}</span>
                    <span>{'\u2212' + formatMoney(amt, curr)}</span>
                  </div>
                );
              })
            : null
          }
          {hasDiscount
            ? <div class="cartmax-totals-row cartmax-discount-row">
                <span>Total Discount</span>
                <span>{'\u2212' + formatMoney(cart.total_discount, curr)}</span>
              </div>
            : null
          }
          <div class="cartmax-totals-row cartmax-total-row">
            <span>Total</span>
            <span>{formatMoney(cart.total_price, curr)}</span>
          </div>
        </div>
        <a class="cartmax-checkout-btn" href="/checkout">Checkout</a>
        <button class="cartmax-continue-btn" onClick={this.close}>Continue shopping</button>
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

    var overlayClass = 'cartmax-overlay' + (open ? ' cartmax-open' : '');
    var isEmpty = !loading && cart && cart.items && cart.items.length === 0;
    var hasItems = !loading && cart && cart.items && cart.items.length > 0;
    var count = cart ? cart.item_count : 0;

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
                Your Cart
                {count > 0 ? <span class="cartmax-header-count">{' (' + count + ')'}</span> : null}
              </span>
              <button class="cartmax-close" onClick={this.close} aria-label="Close cart">
                &#10005;
              </button>
            </div>

            {/* Gift unavailable notice */}
            {this.state.unavailableGifts.length > 0
              ? <div class="cartmax-gift-unavailable">A gift product is currently unavailable</div>
              : null
            }

            {/* Progress bar — only when cart has items */}
            {hasItems ? this.renderProgressBar() : null}

            {/* Claim gifts — above cart items */}
            {hasItems ? this.renderClaimGifts() : null}

            {/* Body */}
            {loading
              ? this.renderLoading()
              : isEmpty
                ? this.renderEmpty()
                : hasItems
                  ? <div class="cartmax-body">{cart.items.map((item) => this.renderLineItem(item))}</div>
                  : null
            }

            {/* Coupons — below cart items */}
            {hasItems ? this.renderCoupons() : null}

            {/* Upsells — below coupons */}
            {this.renderUpsells()}

            {/* Ribbon — between body and footer */}
            {hasItems ? this.renderRibbon() : null}

            {/* Footer */}
            {hasItems ? this.renderFooter() : null}
          </div>
        </div>
      </div>
    );
  }
}
