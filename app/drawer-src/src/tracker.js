// cartx storefront analytics tracker.
//
// Owns: event queueing, batched flushing, session identity, dwell timing,
// consent gating. Designed to never throw out to the drawer — every public
// method is wrapped so a tracker bug can't break the cart UX.

import { ANALYTICS_BOUNDS } from './analytics-events';

var SESSION_KEY = 'cartx_session_id';
var DEFAULT_PROXY_BASE = '/apps/cartmax';
var ENDPOINT_PATH = '/analytics';

function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch (_) {
    return null;
  }
}

function newSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Lightweight fallback — collision-resistant enough for per-tab session.
  var rand = function () {
    return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  };
  return rand() + '-' + rand() + '-' + rand() + '-' + rand();
}

function resolveSessionId() {
  var store = safeSessionStorage();
  if (!store) return newSessionId();
  var existing = null;
  try {
    existing = store.getItem(SESSION_KEY);
  } catch (_) { /* sandboxed */ }
  if (existing) return existing;
  var fresh = newSessionId();
  try {
    store.setItem(SESSION_KEY, fresh);
  } catch (_) { /* quota / sandbox */ }
  return fresh;
}

function consentAllowed() {
  try {
    var api = window.Shopify && window.Shopify.customerPrivacy;
    if (api && typeof api.analyticsProcessingAllowed === 'function') {
      return api.analyticsProcessingAllowed();
    }
  } catch (_) { /* defensive */ }
  return true; // default-on when API isn't available
}

var state = {
  initialized: false,
  enabled: false,
  shopId: '',
  customerId: null,
  endpoint: '',
  sessionId: '',
  queue: [],
  seenPromotions: null,
  flushTimer: null,
  flushing: false,
};

function buildEndpoint(proxyBase) {
  var base = proxyBase || DEFAULT_PROXY_BASE;
  // Strip trailing slash to avoid `//analytics`.
  if (base.charAt(base.length - 1) === '/') {
    base = base.slice(0, -1);
  }
  return base + ENDPOINT_PATH;
}

function startFlushTimer() {
  if (state.flushTimer) return;
  state.flushTimer = setInterval(function () {
    if (state.queue.length > 0) {
      flushInternal(false);
    }
  }, ANALYTICS_BOUNDS.FLUSH_INTERVAL_MS);
}

function flushInternal(useBeacon) {
  if (state.flushing) return;
  if (state.queue.length === 0) return;
  if (!state.endpoint) return;

  // Drain — anything tracked during flush stays in the next batch.
  var batch = state.queue;
  state.queue = [];
  state.flushing = true;

  var payload = JSON.stringify({
    source: 'drawer',
    session_id: state.sessionId,
    events: batch,
  });

  var ok = false;
  try {
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      ok = navigator.sendBeacon(state.endpoint, blob);
    }
  } catch (_) {
    ok = false;
  }

  if (ok) {
    state.flushing = false;
    return;
  }

  // Fetch fallback. `keepalive: true` lets the request survive page transitions.
  try {
    fetch(state.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(function () { /* drop */ }).finally(function () {
      state.flushing = false;
    });
  } catch (_) {
    state.flushing = false;
  }
}

export var tracker = {
  init: function (opts) {
    try {
      if (state.initialized) return;
      state.shopId = (opts && opts.shopId) || '';
      state.customerId = (opts && opts.customerId) || null;
      state.endpoint = buildEndpoint(opts && opts.proxyBase);
      state.enabled = !!(opts && opts.enabled !== false) && !!state.shopId;
      state.sessionId = resolveSessionId();
      state.seenPromotions = new Set();
      state.initialized = true;

      if (!state.enabled) return;
      startFlushTimer();

      // Always flush on pagehide / visibilitychange (mobile Safari only fires
      // pagehide reliably). Use beacon — fetch may be cancelled.
      var flushOnExit = function () { flushInternal(true); };
      window.addEventListener('pagehide', flushOnExit);
      window.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushOnExit();
      });

      // Re-check consent when Shopify fires the consent-collected event.
      window.addEventListener('visitorConsentCollected', function () {
        state.enabled = !!state.shopId && consentAllowed();
      });
    } catch (err) {
      console.warn('[cartx][tracker] init failed:', err);
    }
  },

  sessionId: function () {
    return state.sessionId;
  },

  track: function (event, props) {
    try {
      if (!state.initialized || !state.enabled) return;
      if (!consentAllowed()) return;
      if (!event || typeof event !== 'string') return;

      var entry = {
        event: event,
        occurred_at: new Date().toISOString(),
      };
      if (state.customerId) entry.customer_id = state.customerId;
      if (props && typeof props === 'object') {
        // Allow callers to pass standard fields directly; everything else lands
        // in metadata so the server can keep the row schema tight.
        var stdKeys = [
          'promotion_id',
          'promotion_type',
          'cart_total',
          'item_count',
        ];
        var meta = null;
        for (var key in props) {
          if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
          if (props[key] === undefined || props[key] === null) continue;
          if (stdKeys.indexOf(key) !== -1) {
            entry[key] = props[key];
          } else {
            if (!meta) meta = {};
            meta[key] = props[key];
          }
        }
        if (meta) entry.metadata = meta;
      }

      state.queue.push(entry);
      if (state.queue.length >= ANALYTICS_BOUNDS.MAX_QUEUE) {
        // Schedule, don't run inline — keep the call site fast.
        setTimeout(function () { flushInternal(false); }, 0);
      }
    } catch (err) {
      console.warn('[cartx][tracker] track failed:', err);
    }
  },

  // Idempotent per session: a given promotion_id only emits one
  // promotion_viewed event per session. Drawer wires this to an
  // IntersectionObserver on bar tiers / claim sections.
  trackPromotionView: function (promotionId, promotionType) {
    try {
      if (!state.initialized || !state.enabled) return;
      if (!promotionId) return;
      if (state.seenPromotions.has(promotionId)) return;
      state.seenPromotions.add(promotionId);
      this.track('promotion_viewed', {
        promotion_id: promotionId,
        promotion_type: promotionType || null,
      });
    } catch (err) {
      console.warn('[cartx][tracker] trackPromotionView failed:', err);
    }
  },

  flush: function (opts) {
    try {
      flushInternal(!!(opts && opts.useBeacon));
    } catch (_) { /* never throw */ }
  },

  // Persist session id to a cookie so the Web Pixel (sandboxed iframe) can
  // read it on checkout events. Same-origin cookie under the storefront
  // domain — the proxy and pixel share it.
  persistSessionCookie: function (maxAgeSeconds) {
    try {
      if (!state.initialized || !state.sessionId) return;
      var ttl = maxAgeSeconds || 1800; // 30 minutes
      document.cookie =
        'cartx_session_id=' + encodeURIComponent(state.sessionId) +
        '; path=/; max-age=' + ttl + '; SameSite=Lax';
    } catch (_) { /* never throw */ }
  },

  // Test/debug only.
  _state: function () { return state; },
};
