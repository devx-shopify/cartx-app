// =============================================================
// cartx — Storefront GraphQL Cart service (Phase B)
//
// Self-contained client for the Storefront Cart API. Callable in isolation;
// NOT wired into the live drawer path yet (gated by `graphql_cart_enabled`,
// default off — see constants). Consumed by the optimistic store in Phase C+.
//
// Mirrors the proven op set from devx-commerce/foxtale-star-utils
// (services/cart.ts + graphql/*), adapted to plain JS and to cartx's needs:
//  - token + api version come from the /apps/cartmax proxy `_config` (or an
//    injected dev config), NOT a Hydrogen env.
//  - `mapCart()` converts the GraphQL Cart → the drawer's existing /cart.js
//    shape so CartDrawer.jsx renders it with zero changes.
//
// Functions compatibility: line `attributes` (e.g. _freebie / _offer_id) are
// passed through on cartLinesAdd — P0 proved this fires the discount Functions
// identically to AJAX line properties.
// =============================================================

// ── Config ────────────────────────────────────────────────
// Set once at init from the proxy `_config` (prod) or a dev harness.
var _sf = {
  shopDomain: '',     // e.g. "devx-dev.myshopify.com"
  token: '',          // public Unauthenticated Storefront access token
  apiVersion: '2026-01', // pinned by P0
};

var _readyResolvers = [];

export function setStorefrontConfig(cfg) {
  if (!cfg) return;
  if (cfg.shopDomain) _sf.shopDomain = cfg.shopDomain;
  if (cfg.token) _sf.token = cfg.token;
  if (cfg.apiVersion) _sf.apiVersion = cfg.apiVersion;
  if (isStorefrontReady() && _readyResolvers.length) {
    var rs = _readyResolvers; _readyResolvers = [];
    rs.forEach(function (r) { r(true); });
  }
}

export function isStorefrontReady() {
  return !!(_sf.shopDomain && _sf.token);
}

// Resolve once the token is configured (the token arrives async via the proxy
// `_config`, after mount). Resolves false on timeout so callers don't hang.
export function whenStorefrontReady(timeoutMs) {
  if (isStorefrontReady()) return Promise.resolve(true);
  return new Promise(function (resolve) {
    _readyResolvers.push(resolve);
    if (timeoutMs) setTimeout(function () { resolve(isStorefrontReady()); }, timeoutMs);
  });
}

// Feature flag for the GraphQL cart path (default OFF). Dev can flip it on a
// store via `localStorage.setItem('cartx:graphqlCart','1')` or
// `window.__cartxGraphqlCart = true`; prod can pass `_config.graphql_cart_enabled`.
export function isGraphqlCartEnabled() {
  try {
    if (typeof window !== 'undefined' && window.__cartxGraphqlCart === true) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cartx:graphqlCart') === '1') return true;
  } catch (_) {}
  return false;
}

function endpoint() {
  return 'https://' + _sf.shopDomain + '/api/' + _sf.apiVersion + '/graphql.json';
}

// ── GraphQL fetch ─────────────────────────────────────────
// Returns parsed `data` or throws on transport / GraphQL `errors`.
async function sfFetch(query, variables) {
  if (!isStorefrontReady()) {
    throw new Error('[cartx] storefront cart not configured (token/shop missing)');
  }
  var res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': _sf.token,
    },
    body: JSON.stringify({ query: query, variables: variables || {} }),
  });
  var json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error('[cartx] storefront GraphQL error: ' + JSON.stringify(json.errors));
  }
  return json.data;
}

// ── Cart fragment (enriched: render the drawer without a refetch) ──
var CART_FRAGMENT = `
  fragment Cart on Cart {
    id
    checkoutUrl
    totalQuantity
    note
    attributes { key value }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
    }
    discountCodes { applicable code }
    lines(first: 250) {
      edges {
        node {
          id
          quantity
          attributes { key value }
          cost {
            totalAmount { amount currencyCode }
            amountPerQuantity { amount currencyCode }
            compareAtAmountPerQuantity { amount currencyCode }
          }
          discountAllocations {
            discountedAmount { amount currencyCode }
            ... on CartCodeDiscountAllocation { code }
            ... on CartAutomaticDiscountAllocation { title }
            ... on CartCustomDiscountAllocation { title }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              sku
              availableForSale
              image { url altText width height }
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              selectedOptions { name value }
              product {
                id
                title
                handle
                vendor
                productType
                featuredImage { url altText }
              }
            }
          }
        }
      }
    }
  }
`;

var Q_GET_CART = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) { ...Cart }
  }
  ${CART_FRAGMENT}
`;

var M_CART_CREATE = `
  mutation CartCreate($lines: [CartLineInput!], $attributes: [AttributeInput!]) {
    cartCreate(input: { lines: $lines, attributes: $attributes }) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

var M_LINES_ADD = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

var M_LINES_UPDATE = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

var M_LINES_REMOVE = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

var M_DISCOUNT_CODES = `
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

var M_ATTRIBUTES = `
  mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

var M_BUYER_IDENTITY = `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ...Cart }
      userErrors { field message }
    }
  }
  ${CART_FRAGMENT}
`;

// Normalize a mutation payload: { cart, userErrors }.
function unwrap(data, opName) {
  var payload = data && data[opName];
  if (!payload) return { cart: null, userErrors: [] };
  return { cart: payload.cart || null, userErrors: payload.userErrors || [] };
}

// ── Operations ────────────────────────────────────────────

export async function cartCreate(lines, attributes) {
  var data = await sfFetch(M_CART_CREATE, { lines: lines || [], attributes: attributes || [] });
  return unwrap(data, 'cartCreate');
}

export async function getCart(cartId) {
  var data = await sfFetch(Q_GET_CART, { cartId: cartId });
  return (data && data.cart) || null;   // null if expired/invalid → caller recreates
}

export async function cartLinesAdd(cartId, lines) {
  var data = await sfFetch(M_LINES_ADD, { cartId: cartId, lines: lines });
  return unwrap(data, 'cartLinesAdd');
}

export async function cartLinesUpdate(cartId, lines) {
  var data = await sfFetch(M_LINES_UPDATE, { cartId: cartId, lines: lines });
  return unwrap(data, 'cartLinesUpdate');
}

export async function cartLinesRemove(cartId, lineIds) {
  var data = await sfFetch(M_LINES_REMOVE, { cartId: cartId, lineIds: lineIds });
  return unwrap(data, 'cartLinesRemove');
}

export async function cartDiscountCodesUpdate(cartId, discountCodes) {
  var data = await sfFetch(M_DISCOUNT_CODES, { cartId: cartId, discountCodes: discountCodes || [] });
  return unwrap(data, 'cartDiscountCodesUpdate');
}

export async function cartAttributesUpdate(cartId, attributes) {
  var data = await sfFetch(M_ATTRIBUTES, { cartId: cartId, attributes: attributes || [] });
  return unwrap(data, 'cartAttributesUpdate');
}

export async function cartBuyerIdentityUpdate(cartId, buyerIdentity) {
  var data = await sfFetch(M_BUYER_IDENTITY, { cartId: cartId, buyerIdentity: buyerIdentity });
  return unwrap(data, 'cartBuyerIdentityUpdate');
}

// ── Cart id persistence ───────────────────────────────────

function cartIdKey() {
  return 'cartx:cartId:' + (_sf.shopDomain || 'default');
}

export function getStoredCartId() {
  try { return localStorage.getItem(cartIdKey()) || null; } catch (_) { return null; }
}

export function storeCartId(id) {
  try { if (id) localStorage.setItem(cartIdKey(), id); } catch (_) {}
}

export function clearStoredCartId() {
  try { localStorage.removeItem(cartIdKey()); } catch (_) {}
}

// Reuse the persisted cart if still valid, else create a fresh one.
export async function getOrCreateCart() {
  var id = getStoredCartId();
  if (id) {
    var existing = await getCart(id);
    if (existing) return existing;
    clearStoredCartId();   // expired/invalid → fall through to create
  }
  var created = await cartCreate([], []);
  if (created.cart) storeCartId(created.cart.id);
  return created.cart;
}

// ── Mapping helpers ───────────────────────────────────────

// "gid://shopify/ProductVariant/51443547046202" → 51443547046202 (number).
export function numericId(gid) {
  if (gid == null) return null;
  var s = String(gid);
  var m = s.match(/(\d+)(?:\?|$)/);
  return m ? Number(m[1]) : null;
}

// Storefront money amount ("699.95") → integer cents (69995).
function toCents(amount) {
  if (amount == null) return 0;
  return Math.round(parseFloat(amount) * 100);
}

// GraphQL line `attributes` [{key,value}] → /cart.js `properties` object.
function attrsToProperties(attrs) {
  var props = {};
  (attrs || []).forEach(function (a) { if (a && a.key != null) props[a.key] = a.value; });
  return props;
}

// Map one GraphQL cart line node → a /cart.js item.
function mapLine(node) {
  var m = node.merchandise || {};
  var product = m.product || {};
  var unit = toCents(m.price && m.price.amount);                 // unit price (cents)
  var qty = node.quantity || 0;
  var lineTotal = node.cost && node.cost.totalAmount ? toCents(node.cost.totalAmount.amount) : unit * qty;
  // compare-at: prefer the variant compareAtPrice, else line compareAtAmountPerQuantity
  var compareUnit = m.compareAtPrice ? toCents(m.compareAtPrice.amount)
    : (node.cost && node.cost.compareAtAmountPerQuantity ? toCents(node.cost.compareAtAmountPerQuantity.amount) : 0);
  var originalLine = compareUnit ? compareUnit * qty : unit * qty;
  var lineDiscount = Math.max(0, originalLine - lineTotal);
  var img = (m.image && m.image.url) || (product.featuredImage && product.featuredImage.url) || null;

  return {
    // identity — the drawer keys lines by `key`; we use the GraphQL line id.
    key: node.id,
    id: numericId(m.id),
    variant_id: numericId(m.id),
    product_id: numericId(product.id),
    quantity: qty,
    properties: attrsToProperties(node.attributes),
    // pricing (cents), matching /cart.js field names the drawer reads
    price: unit,
    original_price: compareUnit || unit,
    final_price: unit,
    line_price: lineTotal,
    original_line_price: originalLine,
    final_line_price: lineTotal,
    total_discount: lineDiscount,
    discounts: [],
    // display
    title: product.title ? (m.title && m.title !== 'Default Title' ? product.title + ' - ' + m.title : product.title) : (m.title || ''),
    product_title: product.title || '',
    variant_title: (m.title && m.title !== 'Default Title') ? m.title : null,
    variant_options: (m.selectedOptions || []).map(function (o) { return o.value; }),
    options_with_values: (m.selectedOptions || []).map(function (o) { return { name: o.name, value: o.value }; }),
    sku: m.sku || null,
    vendor: product.vendor || null,
    product_type: product.productType || '',
    handle: product.handle || '',
    image: img,
    featured_image: img ? { url: img, alt: (m.image && m.image.altText) || null } : null,
    url: product.handle ? ('/products/' + product.handle + '?variant=' + numericId(m.id)) : null,
    available: m.availableForSale !== false,
    // per-line discount allocations → the drawer's expected shape
    line_level_discount_allocations: (node.discountAllocations || []).map(function (d) {
      return {
        amount: toCents(d.discountedAmount && d.discountedAmount.amount),
        discount_application: { title: d.title || d.code || 'Discount' },
      };
    }),
    line_level_total_discount: lineDiscount,
    _gql_line_id: node.id,   // keep the raw GraphQL line id for mutations
  };
}

/**
 * Convert a Storefront GraphQL `Cart` into the drawer's /cart.js shape so the
 * existing CartDrawer render path consumes it unchanged. The single most
 * important adapter in the migration.
 */
export function mapCart(gqlCart) {
  if (!gqlCart) return null;
  var edges = (gqlCart.lines && gqlCart.lines.edges) || [];
  var items = edges.map(function (e) { return mapLine(e.node); });

  var subtotal = gqlCart.cost && gqlCart.cost.subtotalAmount ? toCents(gqlCart.cost.subtotalAmount.amount) : 0;
  var total = gqlCart.cost && gqlCart.cost.totalAmount ? toCents(gqlCart.cost.totalAmount.amount) : subtotal;
  var originalTotal = items.reduce(function (s, it) { return s + (it.original_line_price || 0); }, 0);
  var currency = (gqlCart.cost && gqlCart.cost.totalAmount && gqlCart.cost.totalAmount.currencyCode) || '';
  var itemCount = gqlCart.totalQuantity != null
    ? gqlCart.totalQuantity
    : items.reduce(function (s, it) { return s + (it.quantity || 0); }, 0);

  return {
    token: gqlCart.id,
    note: gqlCart.note || '',
    attributes: attrsToProperties(gqlCart.attributes),
    item_count: itemCount,
    items: items,
    total_price: total,
    original_total_price: originalTotal,
    total_discount: Math.max(0, originalTotal - total),
    items_subtotal_price: subtotal,
    currency: currency,
    cart_level_discount_applications: [],
    discount_codes: (gqlCart.discountCodes || []).map(function (d) {
      return { code: d.code, applicable: d.applicable };
    }),
    requires_shipping: true,
    // GraphQL-only extras the drawer/checkout can use
    checkout_url: gqlCart.checkoutUrl || null,
    _gql_cart_id: gqlCart.id,
  };
}
