// cartx Web Pixel — checkout funnel observer.
//
// Runs in Shopify's sandboxed pixel runtime. Subscribes to standard checkout
// events and posts them to the same App Proxy endpoint the drawer uses.
//
// The drawer writes its session id into the `cartx_session_id` cookie when
// the checkout button is clicked. The pixel reads that cookie and includes
// it on every event so checkout/order events join cleanly to drawer sessions.

import { register } from '@shopify/web-pixels-extension';

const PROXY_BASE = '/apps/cartmax';
const ENDPOINT = PROXY_BASE + '/analytics';
const SESSION_COOKIE = 'cartx_session_id';

register(({ analytics, browser }) => {
  // The pixel sandbox exposes `browser.cookie.get(name)` which is async.
  async function readSessionId() {
    try {
      return await browser.cookie.get(SESSION_COOKIE);
    } catch (_) {
      return null;
    }
  }

  async function send(eventName, payload) {
    try {
      const sessionId = await readSessionId();
      const body = JSON.stringify({
        source: 'web_pixel',
        session_id: sessionId || null,
        events: [
          {
            event: eventName,
            occurred_at: new Date().toISOString(),
            ...payload,
          },
        ],
      });
      // Pixel runtime exposes fetch. App Proxy is same-site so no CORS issues.
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    } catch (_) {
      // Never throw out of the pixel.
    }
  }

  function cartTotalCents(checkout) {
    const amount = checkout?.totalPrice?.amount;
    if (typeof amount === 'number') return Math.round(amount * 100);
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
  }

  function checkoutToken(checkout) {
    return checkout?.token || checkout?.order?.id || null;
  }

  analytics.subscribe('checkout_started', (event) => {
    const checkout = event?.data?.checkout;
    send('checkout_started', {
      cart_total: cartTotalCents(checkout),
      metadata: {
        checkout_token: checkoutToken(checkout),
        item_count: checkout?.lineItems?.length ?? null,
      },
    });
  });

  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event?.data?.checkout;
    send('checkout_completed', {
      cart_total: cartTotalCents(checkout),
      metadata: {
        checkout_token: checkoutToken(checkout),
        order_id: checkout?.order?.id || null,
      },
    });
  });
});
