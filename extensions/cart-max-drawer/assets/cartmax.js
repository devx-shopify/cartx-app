(() => {
  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var s;
  var a;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l2) {
    for (var u2 in l2) n2[u2] = l2[u2];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l2, u2, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u2) "key" == o2 ? i2 = u2[o2] : "ref" == o2 ? r2 = u2[o2] : e2[o2] = u2[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
    return x(l2, e2, i2, r2, null);
  }
  function x(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u : o2, __i: -1, __u: 0 };
    return null == o2 && null != l.vnode && l.vnode(e2), e2;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function $(n2, l2) {
    if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u2; l2 < n2.__k.length; l2++) if (null != (u2 = n2.__k[l2]) && null != u2.__e) return u2.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u2 = n2.__v, t2 = u2.__e, i2 = [], r2 = [], o2 = m({}, u2);
      o2.__v = u2.__v + 1, l.vnode && l.vnode(o2), q(n2.__P, o2, u2, n2.__n, n2.__P.namespaceURI, 32 & u2.__u ? [t2] : null, i2, null == t2 ? $(u2) : t2, !!(32 & u2.__u), r2), o2.__v = u2.__v, o2.__.__k[o2.__i] = o2, D(i2, o2, r2), u2.__e = u2.__ = null, o2.__e != t2 && P(o2);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
      if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l2 = 1; i.length; ) i.length > l2 && i.sort(e), n2 = i.shift(), l2 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l2, u2, t2, i2, r2, o2, e2, f2, c2, s2) {
    var a2, h2, p2, v2, y2, _2, g2, m2 = t2 && t2.__k || w, b2 = l2.length;
    for (f2 = T(u2, l2, m2, f2, b2), a2 = 0; a2 < b2; a2++) null != (p2 = u2.__k[a2]) && (h2 = -1 != p2.__i && m2[p2.__i] || d, p2.__i = a2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f2, c2, s2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), s2.push(p2.ref, p2.__c || v2, p2)), null == y2 && null != v2 && (y2 = v2), (g2 = !!(4 & p2.__u)) || h2.__k === p2.__k ? (f2 = j(p2, f2, n2, g2), g2 && h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f2 = _2 : v2 && (f2 = v2.nextSibling), p2.__u &= -7);
    return u2.__e = y2, f2;
  }
  function T(n2, l2, u2, t2, i2) {
    var r2, o2, e2, f2, c2, s2 = u2.length, a2 = s2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f2 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O(o2, u2, f2, a2)) && (a2--, (e2 = u2[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > s2 ? h2-- : i2 < s2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (a2) for (r2 = 0; r2 < s2; r2++) null != (e2 = u2[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
    return t2;
  }
  function j(n2, l2, u2, t2) {
    var i2, r2;
    if ("function" == typeof n2.type) {
      for (i2 = n2.__k, r2 = 0; i2 && r2 < i2.length; r2++) i2[r2] && (i2[r2].__ = n2, l2 = j(i2[r2], l2, u2, t2));
      return l2;
    }
    n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), u2.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
    do {
      l2 = l2 && l2.nextSibling;
    } while (null != l2 && 8 == l2.nodeType);
    return l2;
  }
  function O(n2, l2, u2, t2) {
    var i2, r2, o2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], s2 = null != c2 && 0 == (2 & c2.__u);
    if (null === c2 && null == e2 || s2 && e2 == c2.key && f2 == c2.type) return u2;
    if (t2 > (s2 ? 1 : 0)) {
      for (i2 = u2 - 1, r2 = u2 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f2 == c2.type) return o2;
    }
    return -1;
  }
  function z(n2, l2, u2) {
    "-" == l2[0] ? n2.setProperty(l2, null == u2 ? "" : u2) : n2[l2] = null == u2 ? "" : "number" != typeof u2 || _.test(l2) ? u2 : u2 + "px";
  }
  function N(n2, l2, u2, t2, i2) {
    var r2, o2;
    n: if ("style" == l2) if ("string" == typeof u2) n2.style.cssText = u2;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u2 && l2 in u2 || z(n2.style, l2, "");
      if (u2) for (l2 in u2) t2 && u2[l2] == t2[l2] || z(n2.style, l2, u2[l2]);
    }
    else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(a, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u2, u2 ? t2 ? u2[s] = t2[s] : (u2[s] = h, n2.addEventListener(l2, r2 ? v : p, r2)) : n2.removeEventListener(l2, r2 ? v : p, r2);
    else {
      if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
        n2[l2] = null == u2 ? "" : u2;
        break n;
      } catch (n3) {
      }
      "function" == typeof u2 || (null == u2 || false === u2 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u2 ? "" : u2));
    }
  }
  function V(n2) {
    return function(u2) {
      if (this.l) {
        var t2 = this.l[u2.type + n2];
        if (null == u2[c]) u2[c] = h++;
        else if (u2[c] < t2[s]) return;
        return t2(l.event ? l.event(u2) : u2);
      }
    };
  }
  function q(n2, u2, t2, i2, r2, o2, e2, f2, c2, s2) {
    var a2, h2, p2, v2, y2, d2, _2, k2, x2, M, $2, I2, P2, A2, H2, T2 = u2.type;
    if (void 0 !== u2.constructor) return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f2 = u2.__e = t2.__e]), (a2 = l.__b) && a2(u2);
    n: if ("function" == typeof T2) try {
      if (k2 = u2.props, x2 = T2.prototype && T2.prototype.render, M = (a2 = T2.contextType) && i2[a2.__c], $2 = a2 ? M ? M.props.value : a2.__ : i2, t2.__c ? _2 = (h2 = u2.__c = t2.__c).__ = h2.__E : (x2 ? u2.__c = h2 = new T2(k2, $2) : (u2.__c = h2 = new C(k2, $2), h2.constructor = T2, h2.render = Q), M && M.sub(h2), h2.state || (h2.state = {}), h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), x2 && null == h2.__s && (h2.__s = h2.state), x2 && null != T2.getDerivedStateFromProps && (h2.__s == h2.state && (h2.__s = m({}, h2.__s)), m(h2.__s, T2.getDerivedStateFromProps(k2, h2.__s))), v2 = h2.props, y2 = h2.state, h2.__v = u2, p2) x2 && null == T2.getDerivedStateFromProps && null != h2.componentWillMount && h2.componentWillMount(), x2 && null != h2.componentDidMount && h2.__h.push(h2.componentDidMount);
      else {
        if (x2 && null == T2.getDerivedStateFromProps && k2 !== v2 && null != h2.componentWillReceiveProps && h2.componentWillReceiveProps(k2, $2), u2.__v == t2.__v || !h2.__e && null != h2.shouldComponentUpdate && false === h2.shouldComponentUpdate(k2, h2.__s, $2)) {
          u2.__v != t2.__v && (h2.props = k2, h2.state = h2.__s, h2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
            n3 && (n3.__ = u2);
          }), w.push.apply(h2.__h, h2._sb), h2._sb = [], h2.__h.length && e2.push(h2);
          break n;
        }
        null != h2.componentWillUpdate && h2.componentWillUpdate(k2, h2.__s, $2), x2 && null != h2.componentDidUpdate && h2.__h.push(function() {
          h2.componentDidUpdate(v2, y2, d2);
        });
      }
      if (h2.context = $2, h2.props = k2, h2.__P = n2, h2.__e = false, I2 = l.__r, P2 = 0, x2) h2.state = h2.__s, h2.__d = false, I2 && I2(u2), a2 = h2.render(h2.props, h2.state, h2.context), w.push.apply(h2.__h, h2._sb), h2._sb = [];
      else do {
        h2.__d = false, I2 && I2(u2), a2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
      } while (h2.__d && ++P2 < 25);
      h2.state = h2.__s, null != h2.getChildContext && (i2 = m(m({}, i2), h2.getChildContext())), x2 && !p2 && null != h2.getSnapshotBeforeUpdate && (d2 = h2.getSnapshotBeforeUpdate(v2, y2)), A2 = null != a2 && a2.type === S && null == a2.key ? E(a2.props.children) : a2, f2 = L(n2, g(A2) ? A2 : [A2], u2, t2, i2, r2, o2, e2, f2, c2, s2), h2.base = u2.__e, u2.__u &= -161, h2.__h.length && e2.push(h2), _2 && (h2.__E = h2.__ = null);
    } catch (n3) {
      if (u2.__v = null, c2 || null != o2) if (n3.then) {
        for (u2.__u |= c2 ? 160 : 128; f2 && 8 == f2.nodeType && f2.nextSibling; ) f2 = f2.nextSibling;
        o2[o2.indexOf(f2)] = null, u2.__e = f2;
      } else {
        for (H2 = o2.length; H2--; ) b(o2[H2]);
        B(u2);
      }
      else u2.__e = t2.__e, u2.__k = t2.__k, n3.then || B(u2);
      l.__e(n3, u2, t2);
    }
    else null == o2 && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = G(t2.__e, u2, t2, i2, r2, o2, e2, c2, s2);
    return (a2 = l.diffed) && a2(u2), 128 & u2.__u ? void 0 : f2;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u2, t2) {
    for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
    l.__c && l.__c(u2, n2), n2.some(function(u3) {
      try {
        n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
          n3.call(u3);
        });
      } catch (n3) {
        l.__e(n3, u3.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : m({}, n2);
  }
  function G(u2, t2, i2, r2, o2, e2, f2, c2, s2) {
    var a2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d, k2 = t2.props, x2 = t2.type;
    if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (a2 = 0; a2 < e2.length; a2++) if ((y2 = e2[a2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : 3 == y2.nodeType)) {
        u2 = y2, e2[a2] = null;
        break;
      }
    }
    if (null == u2) {
      if (null == x2) return document.createTextNode(k2);
      u2 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
    }
    if (null == x2) m2 === k2 || c2 && u2.data == k2 || (u2.data = k2);
    else {
      if (e2 = e2 && n.call(u2.childNodes), !c2 && null != e2) for (m2 = {}, a2 = 0; a2 < u2.attributes.length; a2++) m2[(y2 = u2.attributes[a2]).name] = y2.value;
      for (a2 in m2) y2 = m2[a2], "dangerouslySetInnerHTML" == a2 ? p2 = y2 : "children" == a2 || a2 in k2 || "value" == a2 && "defaultValue" in k2 || "checked" == a2 && "defaultChecked" in k2 || N(u2, a2, null, y2, o2);
      for (a2 in k2) y2 = k2[a2], "children" == a2 ? v2 = y2 : "dangerouslySetInnerHTML" == a2 ? h2 = y2 : "value" == a2 ? w2 = y2 : "checked" == a2 ? _2 = y2 : c2 && "function" != typeof y2 || m2[a2] === y2 || N(u2, a2, y2, m2[a2], o2);
      if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
      else if (p2 && (u2.innerHTML = ""), L("template" == t2.type ? u2.content : u2, g(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f2, e2 ? e2[0] : i2.__k && $(i2, 0), c2, s2), null != e2) for (a2 = e2.length; a2--; ) b(e2[a2]);
      c2 || (a2 = "value", "progress" == x2 && null == w2 ? u2.removeAttribute("value") : null != w2 && (w2 !== u2[a2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[a2]) && N(u2, a2, w2, m2[a2], o2), a2 = "checked", null != _2 && _2 != u2[a2] && N(u2, a2, _2, m2[a2], o2));
    }
    return u2;
  }
  function J(n2, u2, t2) {
    try {
      if ("function" == typeof n2) {
        var i2 = "function" == typeof n2.__u;
        i2 && n2.__u(), i2 && null == u2 || (n2.__u = n2(u2));
      } else n2.current = u2;
    } catch (n3) {
      l.__e(n3, t2);
    }
  }
  function K(n2, u2, t2) {
    var i2, r2;
    if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u2)), null != (i2 = n2.__c)) {
      if (i2.componentWillUnmount) try {
        i2.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u2);
      }
      i2.base = i2.__P = null;
    }
    if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u2, t2 || "function" != typeof n2.type);
    t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l2, u2) {
    return this.constructor(n2, u2);
  }
  function R(u2, t2, i2) {
    var r2, o2, e2, f2;
    t2 == document && (t2 = document.documentElement), l.__ && l.__(u2, t2), o2 = (r2 = "function" == typeof i2) ? null : i2 && i2.__k || t2.__k, e2 = [], f2 = [], q(t2, u2 = (!r2 && i2 || t2).__k = k(S, null, [u2]), o2 || d, d, t2.namespaceURI, !r2 && i2 ? [i2] : o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, !r2 && i2 ? i2 : o2 ? o2.__e : t2.firstChild, r2, f2), D(e2, u2, f2);
  }
  n = w.slice, l = { __e: function(n2, l2, u2, t2) {
    for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
      if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
    } catch (l3) {
      n2 = l3;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l2) {
    var u2;
    u2 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u2), this.props)), n2 && m(u2, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, s = "__a" + f, a = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // src/helpers.js
  var _internalFetchDepth = 0;
  function internalFetch(url, opts) {
    _internalFetchDepth++;
    window.__cartmaxInternal = true;
    return fetch(url, opts).finally(function() {
      _internalFetchDepth--;
      if (_internalFetchDepth === 0) {
        window.__cartmaxInternal = false;
      }
    });
  }
  function fetchCart() {
    return internalFetch("/cart.js").then(function(r2) {
      return r2.json();
    });
  }
  function cartUpdateAll(payload) {
    return internalFetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function(r2) {
      return r2.json();
    });
  }
  function dispatchOptimistic(cart) {
    if (!cart) return;
    window.dispatchEvent(new CustomEvent("cartmax:optimistic-update", {
      detail: { cart }
    }));
  }
  function propertiesSignature(props) {
    if (!props) return "";
    var keys = Object.keys(props).sort();
    var parts = [];
    for (var i2 = 0; i2 < keys.length; i2++) {
      parts.push(keys[i2] + "=" + props[keys[i2]]);
    }
    return parts.join("|");
  }
  function recomputeCartTotals(cart, items) {
    var totalPrice = 0;
    var originalTotal = 0;
    var itemCount = 0;
    for (var i2 = 0; i2 < items.length; i2++) {
      totalPrice += items[i2].final_line_price || 0;
      originalTotal += items[i2].original_line_price || items[i2].line_price || 0;
      itemCount += items[i2].quantity || 0;
    }
    return Object.assign({}, cart, {
      items,
      total_price: totalPrice,
      original_total_price: originalTotal,
      total_discount: Math.max(0, originalTotal - totalPrice),
      item_count: itemCount,
      items_subtotal_price: totalPrice
    });
  }
  function simulateAdd(cart, optimisticItem) {
    if (!cart) return cart;
    var items = (cart.items || []).slice();
    var sig = propertiesSignature(optimisticItem.properties);
    var idx = -1;
    for (var i2 = 0; i2 < items.length; i2++) {
      if (String(items[i2].variant_id) === String(optimisticItem.variant_id) && propertiesSignature(items[i2].properties) === sig) {
        idx = i2;
        break;
      }
    }
    if (idx >= 0) {
      var existing = items[idx];
      var newQty = (existing.quantity || 0) + (optimisticItem.quantity || 1);
      var unitPrice = existing.price || 0;
      var newLine = newQty * unitPrice;
      items[idx] = Object.assign({}, existing, {
        quantity: newQty,
        line_price: newLine,
        final_line_price: newLine,
        original_line_price: newLine
      });
    } else {
      items.push(optimisticItem);
    }
    return recomputeCartTotals(cart, items);
  }
  function simulateCouponRemove(cart, code) {
    if (!cart || !code) return cart;
    var upper = String(code).toUpperCase();
    var apps = (cart.cart_level_discount_applications || []).filter(function(d2) {
      return !(d2.title && d2.title.toUpperCase() === upper);
    });
    return Object.assign({}, cart, { cart_level_discount_applications: apps });
  }
  function formatMoney(cents, currency) {
    var amount = (cents / 100).toFixed(2);
    var fmt = window.Shopify && window.Shopify.money_format;
    if (fmt) {
      return fmt.replace(/\{\{\s*amount\s*\}\}/, amount).replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100)).replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace(".", ","));
    }
    var symbols = {
      USD: "$",
      EUR: "\u20AC",
      GBP: "\xA3",
      INR: "\u20B9",
      CAD: "CA$",
      AUD: "A$",
      JPY: "\xA5",
      CNY: "\xA5"
    };
    return (symbols[currency] || currency + " ") + amount;
  }
  function resizeImage(url, size) {
    if (!url) return "";
    size = size || 128;
    return url.replace(/(\.\w{3,4})(\?.*)?$/, "_" + size + "x$1$2");
  }
  var COUNT_SELECTORS = [
    '.cart-count-bubble span[aria-hidden="true"]',
    ".cart-count-bubble",
    ".cart-count",
    "[data-cart-count]",
    "#CartCount",
    '#cart-icon-bubble span[aria-hidden="true"]',
    "#cart-icon-bubble",
    ".cart-link__bubble-num"
  ];
  var BUBBLE_SELECTORS = [".cart-count-bubble", "#cart-icon-bubble"];
  function updateCartCount(count) {
    COUNT_SELECTORS.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        if (el.children.length === 0 || el.matches('[aria-hidden="true"]')) {
          el.textContent = count;
        }
      });
    });
    BUBBLE_SELECTORS.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        if (count > 0) {
          el.removeAttribute("hidden");
          el.style.display = "";
        } else {
          el.setAttribute("hidden", "");
        }
      });
    });
  }
  function getContext() {
    var el = document.getElementById("cartmax-root");
    if (!el) return { shopId: "", themeId: "", customerId: "", customerTags: [] };
    var tags = [];
    try {
      tags = JSON.parse(decodeURIComponent(el.dataset.customerTags || "[]"));
    } catch (e2) {
      tags = [];
    }
    var themeId = el.dataset.themeId || window.Shopify && window.Shopify.theme && String(window.Shopify.theme.id) || "";
    var moneyFormat = el.dataset.moneyFormat || window.Shopify && window.Shopify.money_format || "";
    return {
      shopId: el.dataset.shopId || "",
      themeId,
      customerId: el.dataset.customerId || "",
      customerTags: Array.isArray(tags) ? tags : [],
      moneyFormat
    };
  }
  var RADIUS_MAP = { none: "0", small: "4px", medium: "10px", large: "12px", pill: "999px" };
  var HEADING_SIZE_MAP = { small: "16px", medium: "18px", large: "20px" };
  var BODY_SIZE_MAP = { small: "12px", medium: "13px", large: "14px" };
  var IMG_SIZE_MAP = { small: "56px", medium: "72px", large: "96px" };
  var DENSITY_MAP = { compact: "8px", comfortable: "14px", spacious: "20px" };
  var ANIM_SPEED_MAP = { fast: "150ms", normal: "250ms", slow: "400ms" };
  function applyDrawerSettings(settings) {
    if (!settings) return;
    var root = document.getElementById("cartmax-root");
    if (!root) return;
    var s2 = root.style;
    var c2 = settings.colors;
    if (c2) {
      if (c2.primary) s2.setProperty("--cartmax-primary", c2.primary);
      if (c2.primary_text) s2.setProperty("--cartmax-primary-text", c2.primary_text);
      if (c2.background) s2.setProperty("--cartmax-bg", c2.background);
      if (c2.text) s2.setProperty("--cartmax-text", c2.text);
      if (c2.secondary_text) s2.setProperty("--cartmax-text-secondary", c2.secondary_text);
      if (c2.border) s2.setProperty("--cartmax-border", c2.border);
      if (c2.accent) s2.setProperty("--cartmax-accent", c2.accent);
      if (c2.overlay_opacity != null) s2.setProperty("--cartmax-overlay-opacity", c2.overlay_opacity);
      if (c2.savings_bg) s2.setProperty("--cartmax-savings-bg", c2.savings_bg);
      if (c2.savings_text) s2.setProperty("--cartmax-savings-text", c2.savings_text);
      if (c2.savings_amount) s2.setProperty("--cartmax-savings-amount", c2.savings_amount);
    }
    var sh = settings.shape;
    if (sh) {
      if (sh.border_radius && RADIUS_MAP[sh.border_radius]) {
        s2.setProperty("--cartmax-radius", RADIUS_MAP[sh.border_radius]);
      }
    }
    var t2 = settings.typography;
    if (t2) {
      if (t2.heading_size && HEADING_SIZE_MAP[t2.heading_size]) {
        s2.setProperty("--cartmax-heading-size", HEADING_SIZE_MAP[t2.heading_size]);
      }
      if (t2.body_size && BODY_SIZE_MAP[t2.body_size]) {
        s2.setProperty("--cartmax-body-size", BODY_SIZE_MAP[t2.body_size]);
      }
    }
    var l2 = settings.layout;
    if (l2) {
      if (l2.drawer_width) s2.setProperty("--cartmax-width", l2.drawer_width + "px");
      if (l2.image_size && IMG_SIZE_MAP[l2.image_size]) {
        s2.setProperty("--cartmax-img-size", IMG_SIZE_MAP[l2.image_size]);
      }
      if (l2.density && DENSITY_MAP[l2.density]) {
        s2.setProperty("--cartmax-density-padding", DENSITY_MAP[l2.density]);
      }
      if (l2.empty_icon_color) s2.setProperty("--cartmax-empty-icon-color", l2.empty_icon_color);
    }
    var b2 = settings.behavior;
    if (b2 && b2.animation_speed && ANIM_SPEED_MAP[b2.animation_speed]) {
      s2.setProperty("--cartmax-anim-speed", ANIM_SPEED_MAP[b2.animation_speed]);
    }
    var TRACK_H_MAP = { thin: "4px", normal: "6px", thick: "8px" };
    var pb = settings.progress_bar;
    if (pb) {
      if (pb.track_thickness && TRACK_H_MAP[pb.track_thickness]) {
        s2.setProperty("--cartmax-track-h", TRACK_H_MAP[pb.track_thickness]);
      }
      if (pb.badge_bg_color) s2.setProperty("--cartmax-badge-bg", pb.badge_bg_color);
      if (pb.badge_text_color) s2.setProperty("--cartmax-badge-text", pb.badge_text_color);
    }
  }
  function normalizeVariantId(id) {
    if (typeof id === "string" && id.startsWith("gid://")) return id.split("/").pop();
    return id;
  }
  function formatMoneyTemplate(moneyFormat, amount) {
    var amountStr = amount.toFixed(2);
    var formatted = moneyFormat ? moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amountStr).replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(amount))).replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amountStr.replace(".", ",")) : "$" + amountStr;
    return formatted;
  }
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container) {
    var focusables = container.querySelectorAll(FOCUSABLE);
    if (focusables.length === 0) return null;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    function handler(e2) {
      if (e2.key === "Tab") {
        if (e2.shiftKey) {
          if (document.activeElement === first) {
            e2.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e2.preventDefault();
            first.focus();
          }
        }
      }
    }
    container.addEventListener("keydown", handler);
    first.focus();
    return function() {
      container.removeEventListener("keydown", handler);
    };
  }

  // src/confetti.js
  var PARTICLE_COUNT = 80;
  var DURATION = 2500;
  var GRAVITY = 0.12;
  var COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff922b", "#cc5de8", "#20c997", "#f06595"];
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }
  function createParticle(canvasW, canvasH) {
    return {
      x: canvasW / 2 + rand(-canvasW * 0.3, canvasW * 0.3),
      y: canvasH * 0.3,
      vx: rand(-6, 6),
      vy: rand(-12, -4),
      size: rand(4, 8),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: rand(0, 360),
      rotationSpeed: rand(-8, 8),
      shape: Math.random() > 0.5 ? "rect" : "circle",
      opacity: 1,
      friction: rand(0.97, 0.99)
    };
  }
  function fireCanvasConfetti() {
    var drawer = document.querySelector(".cartmax-drawer");
    if (!drawer) return;
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999";
    canvas.width = drawer.offsetWidth;
    canvas.height = drawer.offsetHeight;
    drawer.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var particles = [];
    for (var i2 = 0; i2 < PARTICLE_COUNT; i2++) {
      particles.push(createParticle(canvas.width, canvas.height));
    }
    var start = Date.now();
    function animate() {
      var elapsed = Date.now() - start;
      if (elapsed > DURATION) {
        canvas.remove();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var fadeStart = DURATION * 0.6;
      for (var i3 = 0; i3 < particles.length; i3++) {
        var p2 = particles[i3];
        p2.vy += GRAVITY;
        p2.vx *= p2.friction;
        p2.x += p2.vx;
        p2.y += p2.vy;
        p2.rotation += p2.rotationSpeed;
        if (elapsed > fadeStart) {
          p2.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (DURATION - fadeStart));
        }
        if (p2.opacity <= 0) continue;
        ctx.save();
        ctx.globalAlpha = p2.opacity;
        ctx.translate(p2.x, p2.y);
        ctx.rotate(p2.rotation * Math.PI / 180);
        ctx.fillStyle = p2.color;
        if (p2.shape === "rect") {
          ctx.fillRect(-p2.size / 2, -p2.size / 2, p2.size, p2.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p2.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }
  var _lottieLoaded = false;
  var _lottieLoading = false;
  var _lottieCallbacks = [];
  function ensureLottiePlayer(callback) {
    if (_lottieLoaded) {
      callback();
      return;
    }
    if (_lottieLoading) {
      _lottieCallbacks.push(callback);
      return;
    }
    _lottieLoading = true;
    var script = document.createElement("script");
    script.src = "https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs";
    script.type = "module";
    script.onload = function() {
      _lottieLoaded = true;
      _lottieLoading = false;
      callback();
      _lottieCallbacks.forEach(function(cb) {
        cb();
      });
      _lottieCallbacks = [];
    };
    script.onerror = function() {
      _lottieLoading = false;
      callback();
      _lottieCallbacks.forEach(function(cb) {
        cb();
      });
      _lottieCallbacks = [];
    };
    document.head.appendChild(script);
  }
  function fireLottieConfetti(url) {
    var drawer = document.querySelector(".cartmax-drawer");
    if (!drawer) return;
    ensureLottiePlayer(function() {
      if (!customElements.get("dotlottie-player")) {
        fireCanvasConfetti();
        return;
      }
      var player = document.createElement("dotlottie-player");
      player.setAttribute("src", url);
      player.setAttribute("autoplay", "");
      player.setAttribute("speed", "1");
      player.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;background:transparent";
      drawer.appendChild(player);
      player.addEventListener("complete", function() {
        player.remove();
      });
      setTimeout(function() {
        if (player.parentNode) player.remove();
      }, 6e3);
    });
  }
  function preloadLottie(url) {
    if (url && !_lottieLoaded && !_lottieLoading) {
      ensureLottiePlayer(function() {
      });
    }
  }
  var _lottieUrl = "";
  function setConfettiLottieUrl(url) {
    _lottieUrl = url || "";
    if (_lottieUrl) preloadLottie(_lottieUrl);
  }
  function fireConfetti() {
    if (_lottieUrl) {
      fireLottieConfetti(_lottieUrl);
    } else {
      fireCanvasConfetti();
    }
  }

  // src/rules.js
  function isDiscountedItem(item) {
    return item.properties && item.properties["_freebie"] === "true" || item.properties && item.properties["_cartmax_claim"] === "true";
  }
  function adjustedTotal(items) {
    var cents = 0;
    for (var i2 = 0; i2 < items.length; i2++) {
      if (isDiscountedItem(items[i2])) continue;
      cents += items[i2].original_line_price || items[i2].line_price || 0;
    }
    return cents / 100;
  }
  function adjustedQty(items) {
    var qty = 0;
    for (var i2 = 0; i2 < items.length; i2++) {
      if (isDiscountedItem(items[i2])) continue;
      qty += items[i2].quantity || 0;
    }
    return qty;
  }
  function pageMatch(handles, path) {
    if (!handles || handles.length === 0) return false;
    if (handles.indexOf("/") !== -1) return true;
    var clean = path.split("?")[0];
    return handles.indexOf(clean) !== -1;
  }
  function normalizeTag(t2) {
    return String(t2).trim().toLowerCase();
  }
  function customerMatchesTags(rule, customer) {
    var target = rule && rule.customer_tags;
    if (!target) return true;
    var required = (target.required_any || []).map(normalizeTag).filter(Boolean);
    var excluded = (target.excluded || []).map(normalizeTag).filter(Boolean);
    var tags = (customer && customer.tags || []).map(normalizeTag);
    if (excluded.length) {
      for (var i2 = 0; i2 < excluded.length; i2++) {
        if (tags.indexOf(excluded[i2]) !== -1) return false;
      }
    }
    if (required.length) {
      var matched = false;
      for (var j2 = 0; j2 < required.length; j2++) {
        if (tags.indexOf(required[j2]) !== -1) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }
  function evaluateTrigger(offer, adjTotal, adjQty) {
    var t2 = offer.trigger || {};
    var priceMet = t2.price_threshold && adjTotal >= t2.price_threshold;
    var qtyMet = t2.quantity_threshold && adjQty >= t2.quantity_threshold;
    return priceMet || qtyMet;
  }
  function evaluateOffers(offers, cart, adjTotal, adjQty, page, customer) {
    var toAdd = [];
    var toRemove = [];
    var triggeredIds = {};
    for (var i2 = 0; i2 < offers.length; i2++) {
      var offer = offers[i2];
      if (!pageMatch(offer.page_handles, page)) continue;
      if (!customerMatchesTags(offer, customer)) continue;
      var triggered = evaluateTrigger(offer, adjTotal, adjQty);
      if (triggered) {
        triggeredIds[offer.id] = true;
        if (offer.reward && offer.reward.type === "auto_add_gift" && offer.reward.add_mode === "auto") {
          var giftVids = offer.reward.gift_variants || [];
          for (var g2 = 0; g2 < giftVids.length; g2++) {
            var vid = normalizeVariantId(giftVids[g2]);
            var alreadyIn = (cart.items || []).some(function(li) {
              return normalizeVariantId(li.variant_id) === vid && li.properties && li.properties["_offer_id"] === offer.id;
            });
            if (!alreadyIn) {
              toAdd.push({
                variant_id: giftVids[g2],
                quantity: offer.reward.quantity_per_variant || 1,
                properties: { _freebie: "true", _offer_id: offer.id }
              });
            }
          }
        }
      }
    }
    for (var j2 = 0; j2 < (cart.items || []).length; j2++) {
      var item = cart.items[j2];
      if (!item.properties || item.properties["_freebie"] !== "true") continue;
      if (item.properties["_claimed"] === "true") continue;
      var offerId = item.properties["_offer_id"];
      if (!offerId) continue;
      if (!triggeredIds[offerId]) {
        toRemove.push(item.key);
      }
    }
    return { to_add: toAdd, to_remove: toRemove };
  }
  function buildBar(config, adjTotal, adjQty, page, moneyFormat, customer) {
    if (!config.progress_bar || !config.progress_bar.enabled) return null;
    var entries = [];
    for (var i2 = 0; i2 < (config.offers || []).length; i2++) {
      var offer = config.offers[i2];
      if (!offer.bar || !offer.bar.show) continue;
      if (!pageMatch(offer.page_handles, page)) continue;
      if (!customerMatchesTags(offer, customer)) continue;
      entries.push({
        threshold: offer.trigger.price_threshold || offer.trigger.quantity_threshold,
        trigger_type: offer.trigger.price_threshold ? "price" : "quantity",
        label: offer.bar.label || "",
        top_message: offer.bar.top_message || null
      });
    }
    if (entries.length === 0) return null;
    entries.sort(function(a2, b2) {
      return a2.threshold - b2.threshold;
    });
    var mode = entries.some(function(e2) {
      return e2.trigger_type === "price";
    }) ? "price" : "quantity";
    var filtered = entries.filter(function(e2) {
      return e2.trigger_type === mode;
    });
    if (filtered.length === 0) return null;
    var currentValue = mode === "price" ? adjTotal : adjQty;
    var segmentWidth = 100 / filtered.length;
    var progress = 0;
    var topMessage = null;
    var tiers = [];
    var prevThreshold = 0;
    for (var t2 = 0; t2 < filtered.length; t2++) {
      var tier = filtered[t2];
      var state2;
      if (currentValue >= tier.threshold) {
        state2 = "active";
        progress += segmentWidth;
      } else if (!topMessage) {
        state2 = "next";
        var remaining = tier.threshold - currentValue;
        var segmentRange = tier.threshold - prevThreshold;
        var segmentProgress = segmentRange > 0 ? (currentValue - prevThreshold) / segmentRange : 0;
        progress += segmentProgress * segmentWidth;
        if (tier.top_message) {
          var formatted = formatMoneyTemplate(moneyFormat, remaining);
          topMessage = tier.top_message.replace(/\[\[\s*price\s*\]\]/gi, formatted);
        }
      } else {
        state2 = "inactive";
      }
      prevThreshold = tier.threshold;
      tiers.push({
        threshold: tier.threshold,
        label: tier.label,
        state: state2
      });
    }
    if (topMessage === null && currentValue >= filtered[filtered.length - 1].threshold) {
      topMessage = config.progress_bar.all_complete_message || null;
    }
    return {
      enabled: true,
      mode,
      progress_pct: Math.min(progress, 100),
      top_message: topMessage,
      tiers
    };
  }
  function localEvaluate(cachedConfig, cart, customer) {
    if (!cachedConfig || !cart) return null;
    var items = cart.items || [];
    var adjTotal = adjustedTotal(items);
    var adjQty = adjustedQty(items);
    var page = window.location.pathname;
    var offerResult = evaluateOffers(cachedConfig.offers || [], cart, adjTotal, adjQty, page, customer);
    var bar = buildBar(cachedConfig, adjTotal, adjQty, page, cachedConfig.money_format || "", customer);
    var ribbonMessage = null;
    if (bar && bar.tiers) {
      for (var i2 = 0; i2 < bar.tiers.length; i2++) {
        if (bar.tiers[i2].state === "next") {
          ribbonMessage = bar.tiers[i2].ribbon_message || null;
          break;
        }
      }
    }
    return {
      to_add: offerResult.to_add,
      to_remove: offerResult.to_remove,
      bar,
      ribbon_message: ribbonMessage
    };
  }

  // src/evaluate.js
  var PROXY_URL = "/apps/cartmax/evaluate-cart";
  var _cachedConfig = null;
  var _configCacheTime = 0;
  var CONFIG_CACHE_TTL = 6e4;
  function isCacheValid() {
    return _cachedConfig && Date.now() - _configCacheTime < CONFIG_CACHE_TTL;
  }
  async function callEvaluate(cart) {
    var ctx = getContext();
    if (!ctx.shopId || !ctx.themeId) return null;
    var res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cart: {
          items: cart.items || [],
          total_price: cart.total_price || 0,
          original_total_price: cart.original_total_price || 0,
          total_discount: cart.total_discount || 0,
          item_count: cart.item_count || 0,
          currency: cart.currency || "",
          cart_level_discount_applications: cart.cart_level_discount_applications || [],
          discount_codes: cart.discount_codes || []
        },
        page: window.location.pathname,
        customer: ctx.customerId ? { id: ctx.customerId, tags: ctx.customerTags } : { tags: ctx.customerTags },
        shop_id: ctx.shopId,
        theme_id: String(ctx.themeId),
        money_format: ctx.moneyFormat
      })
    });
    if (!res.ok) {
      console.error("[cartx] evaluate-cart failed:", res.status, await res.text());
      return null;
    }
    var result = await res.json();
    if (result && result._config) {
      _cachedConfig = result._config;
      _configCacheTime = Date.now();
    }
    return result;
  }
  function simulateCart(cart, actions) {
    if (!actions || actions.length === 0 || !cart || !cart.items) return cart;
    var actionMap = {};
    for (var a2 = 0; a2 < actions.length; a2++) {
      actionMap[actions[a2].key] = actions[a2].qty;
    }
    var items = [];
    for (var i2 = 0; i2 < cart.items.length; i2++) {
      var item = cart.items[i2];
      if (actionMap.hasOwnProperty(item.key)) {
        var newQty = actionMap[item.key];
        if (newQty > 0) {
          var unitPrice = item.quantity > 0 ? Math.round(item.price) : 0;
          var linePrice = unitPrice * newQty;
          items.push(Object.assign({}, item, {
            quantity: newQty,
            line_price: linePrice,
            final_line_price: linePrice,
            original_line_price: linePrice
          }));
        }
      } else {
        items.push(item);
      }
    }
    var totalPrice = 0;
    var originalTotal = 0;
    var itemCount = 0;
    for (var j2 = 0; j2 < items.length; j2++) {
      totalPrice += items[j2].final_line_price || 0;
      originalTotal += items[j2].original_line_price || items[j2].line_price || 0;
      itemCount += items[j2].quantity || 0;
    }
    return Object.assign({}, cart, {
      items,
      total_price: totalPrice,
      original_total_price: originalTotal,
      total_discount: Math.max(0, originalTotal - totalPrice),
      item_count: itemCount,
      items_subtotal_price: totalPrice
    });
  }
  var _unavailableGifts = [];
  var _unavailableLastAttempt = 0;
  var UNAVAILABLE_RETRY_INTERVAL = 6e4;
  function isGiftUnavailable(vid) {
    return _unavailableGifts.indexOf(vid) !== -1;
  }
  function markGiftUnavailable(vid) {
    if (_unavailableGifts.indexOf(vid) === -1) {
      _unavailableGifts.push(vid);
    }
    _unavailableLastAttempt = Date.now();
  }
  function shouldRetryUnavailable() {
    return Date.now() - _unavailableLastAttempt >= UNAVAILABLE_RETRY_INTERVAL;
  }
  function clearAvailableGifts(cartItems) {
    _unavailableGifts = _unavailableGifts.filter(function(vid) {
      return !(cartItems || []).some(function(item) {
        return String(item.variant_id) === vid;
      });
    });
  }
  async function applyResult(result, cart, pendingActions) {
    if (result.frozen) return null;
    var existingItems = cart.items || [];
    var updates = {};
    var hasUpdates = false;
    for (var pa = 0; pa < pendingActions.length; pa++) {
      updates[pendingActions[pa].key] = pendingActions[pa].qty;
      hasUpdates = true;
    }
    for (var j2 = 0; j2 < (result.to_remove || []).length; j2++) {
      updates[result.to_remove[j2]] = 0;
      hasUpdates = true;
    }
    var canRetry = shouldRetryUnavailable();
    var itemsToAdd = [];
    for (var i2 = 0; i2 < (result.to_add || []).length; i2++) {
      var item = result.to_add[i2];
      var offerId = item.properties && item.properties["_offer_id"];
      var vid = String(normalizeVariantId(item.variant_id));
      var alreadyIn = existingItems.some(function(li) {
        return String(li.variant_id) === vid && li.properties && li.properties["_offer_id"] === offerId;
      });
      if (alreadyIn) continue;
      if (isGiftUnavailable(vid) && !canRetry) continue;
      itemsToAdd.push(item);
    }
    var didChange = false;
    if (hasUpdates) {
      try {
        await cartUpdateAll({ updates });
        didChange = true;
      } catch (e2) {
        console.error("[cartx] cartUpdateAll failed:", e2);
      }
    }
    if (itemsToAdd.length > 0) {
      var addPayload = itemsToAdd.map(function(item2) {
        return {
          id: Number(normalizeVariantId(item2.variant_id)),
          quantity: item2.quantity || 1,
          properties: item2.properties || {}
        };
      });
      try {
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: addPayload })
        });
        didChange = true;
      } catch (e2) {
        console.error("[cartx] gift add failed:", e2);
      }
    }
    if (didChange || hasUpdates) {
      try {
        var freshCart = await fetchCart();
        if (itemsToAdd.length > 0) {
          for (var k2 = 0; k2 < itemsToAdd.length; k2++) {
            var addedVid = String(normalizeVariantId(itemsToAdd[k2].variant_id));
            var inFreshCart = (freshCart.items || []).some(function(li) {
              return String(li.variant_id) === addedVid;
            });
            if (!inFreshCart) {
              markGiftUnavailable(addedVid);
              console.warn("[cartx] Gift variant unavailable:", addedVid);
            }
          }
        }
        clearAvailableGifts(freshCart.items);
        var freshSavings = Math.max(
          0,
          (freshCart.original_total_price || 0) - (freshCart.total_price || 0)
        );
        _lastResult = Object.assign({}, _lastResult, { total_savings: freshSavings });
        window.dispatchEvent(new CustomEvent("cartmax:gift-unavailable", {
          detail: { variants: _unavailableGifts.slice() }
        }));
        window.dispatchEvent(new CustomEvent("cartmax:internal-reload", {
          detail: { cart: freshCart, evalResult: _lastResult }
        }));
        return freshCart;
      } catch (e2) {
        if (_lastResult) {
          window.dispatchEvent(new CustomEvent("cartmax:eval-result", {
            detail: Object.assign({}, _lastResult, { _server: true })
          }));
        }
      }
    }
    return null;
  }
  function recomputeBar(serverBar, cart) {
    if (!serverBar || !serverBar.tiers || serverBar.tiers.length === 0) return serverBar;
    var adjTotal = 0, adjQty = 0;
    var items = cart.items || [];
    for (var i2 = 0; i2 < items.length; i2++) {
      var it = items[i2];
      if (it.properties && (it.properties["_freebie"] === "true" || it.properties["_cartmax_claim"] === "true")) continue;
      adjTotal += it.original_line_price || it.line_price || 0;
      adjQty += it.quantity || 0;
    }
    adjTotal /= 100;
    var tiers = serverBar.tiers;
    var n2 = tiers.length;
    var mode = serverBar.mode;
    function tierType(tier) {
      return tier.trigger_type || (mode === "price" ? "price" : "quantity");
    }
    var stated = tiers.map(function(tier) {
      var ttype = tierType(tier);
      var cv = ttype === "price" ? adjTotal : adjQty;
      return Object.assign({}, tier, {
        state: cv >= tier.threshold ? "active" : "inactive"
      });
    });
    var nextIds = {};
    ["price", "quantity"].forEach(function(ttype) {
      var sameType = stated.filter(function(t2) {
        return tierType(t2) === ttype && t2.state === "inactive";
      });
      if (sameType.length === 0) return;
      sameType.sort(function(a2, b2) {
        return a2.threshold - b2.threshold;
      });
      nextIds[sameType[0].id] = true;
    });
    var newTiers = stated.map(function(t2) {
      return nextIds[t2.id] ? Object.assign({}, t2, { state: "next" }) : t2;
    });
    var segmentWidth = 100 / n2;
    var activeCount = 0;
    for (var ac = 0; ac < newTiers.length; ac++) {
      if (newTiers[ac].state === "active") activeCount++;
    }
    var progress = activeCount * segmentWidth;
    var nextTier = null;
    for (var nx = 0; nx < newTiers.length; nx++) {
      if (newTiers[nx].state === "next") {
        nextTier = newTiers[nx];
        break;
      }
    }
    if (nextTier) {
      var ttypeN = tierType(nextTier);
      var cvN = ttypeN === "price" ? adjTotal : adjQty;
      var sameTypeSorted = newTiers.filter(function(t2) {
        return tierType(t2) === ttypeN;
      }).slice().sort(function(a2, b2) {
        return a2.threshold - b2.threshold;
      });
      var prevThreshold = 0;
      for (var p2 = 0; p2 < sameTypeSorted.length; p2++) {
        if (sameTypeSorted[p2].id === nextTier.id) break;
        prevThreshold = sameTypeSorted[p2].threshold;
      }
      var segmentRange = nextTier.threshold - prevThreshold;
      if (segmentRange > 0) {
        var partial = (cvN - prevThreshold) / segmentRange;
        progress += Math.max(0, Math.min(1, partial)) * segmentWidth;
      }
    }
    var topMessage;
    if (!nextTier) {
      topMessage = _cachedConfig && _cachedConfig.progress_bar && _cachedConfig.progress_bar.all_complete_message || serverBar.top_message;
    } else {
      var ttypeT = tierType(nextTier);
      var cvT = ttypeT === "price" ? adjTotal : adjQty;
      var remaining = nextTier.threshold - cvT;
      var tmpl = findTopMessage(nextTier.id);
      if (tmpl) {
        var moneyFmt = _cachedConfig && _cachedConfig.money_format || "";
        var formatted = formatMoneyTemplate(moneyFmt, remaining);
        topMessage = tmpl.replace(/\[\[\s*price\s*\]\]/gi, formatted);
      } else {
        topMessage = serverBar.top_message;
      }
    }
    return Object.assign({}, serverBar, {
      progress_pct: Math.min(progress, 100),
      top_message: topMessage,
      tiers: newTiers
    });
  }
  function findTopMessage(tierId) {
    if (!_cachedConfig || !_cachedConfig.offers) return null;
    for (var i2 = 0; i2 < _cachedConfig.offers.length; i2++) {
      var o2 = _cachedConfig.offers[i2];
      if (o2.id === tierId && o2.bar && o2.bar.top_message) return o2.bar.top_message;
    }
    return null;
  }
  var _lastResult = null;
  var _evaluating = false;
  var _pendingCart = null;
  var _pendingActions = [];
  var _evaluateResolvers = [];
  function waitForEvaluate() {
    if (!_evaluating && _pendingActions.length === 0 && !_pendingCart) {
      return Promise.resolve();
    }
    return new Promise(function(resolve) {
      _evaluateResolvers.push(resolve);
    });
  }
  function _flushEvaluateResolvers() {
    if (_evaluating || _pendingCart) return;
    var resolvers = _evaluateResolvers;
    _evaluateResolvers = [];
    for (var i2 = 0; i2 < resolvers.length; i2++) resolvers[i2]();
  }
  async function runEvaluate(cart, action) {
    if (!cart) return;
    if (_evaluating) {
      _pendingCart = cart;
      if (action) _pendingActions.push(action);
      return;
    }
    var actions = action ? [action] : [];
    var ctx = getContext();
    if (!ctx.shopId || !ctx.themeId) return;
    var evalCart = actions.length > 0 ? simulateCart(cart, actions) : cart;
    if (actions.length > 0) {
      window.dispatchEvent(new CustomEvent("cartmax:optimistic-update", {
        detail: { cart: evalCart }
      }));
    }
    if (isCacheValid()) {
      var localResult = localEvaluate(_cachedConfig, evalCart, { id: ctx.customerId, tags: ctx.customerTags });
      if (localResult && _lastResult && _lastResult.bar) {
        var serverBar = _lastResult.bar;
        var optimistic = Object.assign({}, _lastResult, {
          ribbon_message: localResult.ribbon_message
        });
        optimistic.bar = recomputeBar(serverBar, evalCart);
        window.dispatchEvent(new CustomEvent("cartmax:eval-result", { detail: optimistic }));
      } else if (localResult && !_lastResult) {
        window.dispatchEvent(new CustomEvent("cartmax:eval-result", { detail: localResult }));
      }
    }
    _evaluating = true;
    try {
      var result = await callEvaluate(evalCart);
      if (result) {
        _lastResult = result;
        var updatedCart = await applyResult(result, cart, actions);
        if (!updatedCart) {
          window.dispatchEvent(new CustomEvent("cartmax:eval-result", {
            detail: Object.assign({}, result, { _server: true })
          }));
        }
      }
    } catch (err) {
      console.error("[cartx] Evaluate error:", err);
    } finally {
      _evaluating = false;
    }
    if (_pendingCart) {
      var nextCart = _pendingCart;
      var nextActions = _pendingActions;
      _pendingCart = null;
      _pendingActions = [];
      runEvaluateBatch(nextCart, nextActions);
    } else {
      _flushEvaluateResolvers();
    }
  }
  async function runEvaluateBatch(cart, actions) {
    if (!cart) return;
    var ctx = getContext();
    if (!ctx.shopId || !ctx.themeId) return;
    var evalCart = actions.length > 0 ? simulateCart(cart, actions) : cart;
    if (actions.length > 0) {
      window.dispatchEvent(new CustomEvent("cartmax:optimistic-update", {
        detail: { cart: evalCart }
      }));
    }
    if (isCacheValid()) {
      var localResult = localEvaluate(_cachedConfig, evalCart, { id: ctx.customerId, tags: ctx.customerTags });
      if (localResult && _lastResult && _lastResult.bar) {
        var optimistic = Object.assign({}, _lastResult, {
          ribbon_message: localResult.ribbon_message
        });
        optimistic.bar = recomputeBar(_lastResult.bar, evalCart);
        window.dispatchEvent(new CustomEvent("cartmax:eval-result", { detail: optimistic }));
      }
    }
    _evaluating = true;
    try {
      var result = await callEvaluate(evalCart);
      if (result) {
        _lastResult = result;
        var updatedCart = await applyResult(result, cart, actions);
        if (!updatedCart) {
          window.dispatchEvent(new CustomEvent("cartmax:eval-result", {
            detail: Object.assign({}, result, { _server: true })
          }));
        }
      }
    } catch (err) {
      console.error("[cartx] Evaluate error:", err);
    } finally {
      _evaluating = false;
    }
    if (_pendingCart) {
      var nextCart = _pendingCart;
      var nextActions = _pendingActions;
      _pendingCart = null;
      _pendingActions = [];
      runEvaluateBatch(nextCart, nextActions);
    } else {
      _flushEvaluateResolvers();
    }
  }
  window.addEventListener("cartmax:drawer-opened", function() {
    if (_lastResult) {
      window.dispatchEvent(new CustomEvent("cartmax:eval-result", { detail: _lastResult }));
    }
  });
  window.addEventListener("cartmax:cart-action", function(e2) {
    var detail = e2.detail || {};
    runEvaluate(detail.cart, detail.action);
  });
  window.addEventListener("cartmax:cart-changed", function(e2) {
    runEvaluate(e2.detail && e2.detail.cart);
  });
  fetchCart().then(function(cart) {
    return runEvaluate(cart);
  }).catch(function() {
  });

  // src/analytics-events.js
  var ANALYTICS_EVENTS = {
    DRAWER_OPENED: "drawer_opened",
    DRAWER_CLOSED: "drawer_closed",
    PROMOTION_VIEWED: "promotion_viewed",
    GIFT_CLAIMED: "gift_claimed",
    GIFT_REMOVED: "gift_removed",
    UPSELL_ADDED: "upsell_added",
    COUPON_APPLIED: "coupon_applied",
    COUPON_REJECTED: "coupon_rejected"
  };
  var ANALYTICS_BOUNDS = {
    MAX_QUEUE: 100,
    FLUSH_INTERVAL_MS: 1e4,
    MAX_CART_CENTS: 1e7,
    MAX_ITEM_COUNT: 1e3
  };

  // src/tracker.js
  var SESSION_KEY = "cartx_session_id";
  var DEFAULT_PROXY_BASE = "/apps/cartmax";
  var ENDPOINT_PATH = "/analytics";
  function safeSessionStorage() {
    try {
      return window.sessionStorage;
    } catch (_2) {
      return null;
    }
  }
  function newSessionId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    var rand2 = function() {
      return Math.floor(Math.random() * 4294967295).toString(16).padStart(8, "0");
    };
    return rand2() + "-" + rand2() + "-" + rand2() + "-" + rand2();
  }
  function resolveSessionId() {
    var store = safeSessionStorage();
    if (!store) return newSessionId();
    var existing = null;
    try {
      existing = store.getItem(SESSION_KEY);
    } catch (_2) {
    }
    if (existing) return existing;
    var fresh = newSessionId();
    try {
      store.setItem(SESSION_KEY, fresh);
    } catch (_2) {
    }
    return fresh;
  }
  function consentAllowed() {
    try {
      var api = window.Shopify && window.Shopify.customerPrivacy;
      if (api && typeof api.analyticsProcessingAllowed === "function") {
        return api.analyticsProcessingAllowed();
      }
    } catch (_2) {
    }
    return true;
  }
  var state = {
    initialized: false,
    enabled: false,
    shopId: "",
    customerId: null,
    endpoint: "",
    sessionId: "",
    queue: [],
    seenPromotions: null,
    flushTimer: null,
    flushing: false
  };
  function buildEndpoint(proxyBase) {
    var base = proxyBase || DEFAULT_PROXY_BASE;
    if (base.charAt(base.length - 1) === "/") {
      base = base.slice(0, -1);
    }
    return base + ENDPOINT_PATH;
  }
  function startFlushTimer() {
    if (state.flushTimer) return;
    state.flushTimer = setInterval(function() {
      if (state.queue.length > 0) {
        flushInternal(false);
      }
    }, ANALYTICS_BOUNDS.FLUSH_INTERVAL_MS);
  }
  function flushInternal(useBeacon) {
    if (state.flushing) return;
    if (state.queue.length === 0) return;
    if (!state.endpoint) return;
    var batch = state.queue;
    state.queue = [];
    state.flushing = true;
    var payload = JSON.stringify({
      source: "drawer",
      session_id: state.sessionId,
      events: batch
    });
    var ok = false;
    try {
      if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        var blob = new Blob([payload], { type: "application/json" });
        ok = navigator.sendBeacon(state.endpoint, blob);
      }
    } catch (_2) {
      ok = false;
    }
    if (ok) {
      state.flushing = false;
      return;
    }
    try {
      fetch(state.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(function() {
      }).finally(function() {
        state.flushing = false;
      });
    } catch (_2) {
      state.flushing = false;
    }
  }
  var tracker = {
    init: function(opts) {
      try {
        if (state.initialized) return;
        state.shopId = opts && opts.shopId || "";
        state.customerId = opts && opts.customerId || null;
        state.endpoint = buildEndpoint(opts && opts.proxyBase);
        state.enabled = !!(opts && opts.enabled !== false) && !!state.shopId;
        state.sessionId = resolveSessionId();
        state.seenPromotions = /* @__PURE__ */ new Set();
        state.initialized = true;
        if (!state.enabled) return;
        startFlushTimer();
        var flushOnExit = function() {
          flushInternal(true);
        };
        window.addEventListener("pagehide", flushOnExit);
        window.addEventListener("visibilitychange", function() {
          if (document.visibilityState === "hidden") flushOnExit();
        });
        window.addEventListener("visitorConsentCollected", function() {
          state.enabled = !!state.shopId && consentAllowed();
        });
      } catch (err) {
        console.warn("[cartx][tracker] init failed:", err);
      }
    },
    sessionId: function() {
      return state.sessionId;
    },
    track: function(event, props) {
      try {
        if (!state.initialized || !state.enabled) return;
        if (!consentAllowed()) return;
        if (!event || typeof event !== "string") return;
        var entry = {
          event,
          occurred_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (state.customerId) entry.customer_id = state.customerId;
        if (props && typeof props === "object") {
          var stdKeys = [
            "promotion_id",
            "promotion_type",
            "cart_total",
            "item_count"
          ];
          var meta = null;
          for (var key in props) {
            if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
            if (props[key] === void 0 || props[key] === null) continue;
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
          setTimeout(function() {
            flushInternal(false);
          }, 0);
        }
      } catch (err) {
        console.warn("[cartx][tracker] track failed:", err);
      }
    },
    // Idempotent per session: a given promotion_id only emits one
    // promotion_viewed event per session. Drawer wires this to an
    // IntersectionObserver on bar tiers / claim sections.
    trackPromotionView: function(promotionId, promotionType) {
      try {
        if (!state.initialized || !state.enabled) return;
        if (!promotionId) return;
        if (state.seenPromotions.has(promotionId)) return;
        state.seenPromotions.add(promotionId);
        this.track("promotion_viewed", {
          promotion_id: promotionId,
          promotion_type: promotionType || null
        });
      } catch (err) {
        console.warn("[cartx][tracker] trackPromotionView failed:", err);
      }
    },
    flush: function(opts) {
      try {
        flushInternal(!!(opts && opts.useBeacon));
      } catch (_2) {
      }
    },
    // Persist session id to a cookie so the Web Pixel (sandboxed iframe) can
    // read it on checkout events. Same-origin cookie under the storefront
    // domain — the proxy and pixel share it.
    persistSessionCookie: function(maxAgeSeconds) {
      try {
        if (!state.initialized || !state.sessionId) return;
        var ttl = maxAgeSeconds || 1800;
        document.cookie = "cartx_session_id=" + encodeURIComponent(state.sessionId) + "; path=/; max-age=" + ttl + "; SameSite=Lax";
      } catch (_2) {
      }
    },
    // Test/debug only.
    _state: function() {
      return state;
    }
  };

  // src/CartDrawer.jsx
  var CLOSE_DELAY = 250;
  var DEBOUNCE_DELAY = 300;
  var TOMBSTONE_HOLD_MS = 280;
  var PROCESSING_TIMEOUT = 1e4;
  var INLINE_ERROR_HOLD_MS = 4e3;
  function IconClose() {
    return /* @__PURE__ */ k("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("path", { d: "M18 6 6 18" }), /* @__PURE__ */ k("path", { d: "m6 6 12 12" }));
  }
  function IconMinus() {
    return /* @__PURE__ */ k("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }, /* @__PURE__ */ k("path", { d: "M5 12h14" }));
  }
  function IconPlus() {
    return /* @__PURE__ */ k("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }, /* @__PURE__ */ k("path", { d: "M12 5v14" }), /* @__PURE__ */ k("path", { d: "M5 12h14" }));
  }
  function IconTrash() {
    return /* @__PURE__ */ k("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ k("path", { d: "M4.87183 13.6667C4.53939 13.6667 4.25539 13.549 4.01983 13.3135C3.78439 13.0779 3.66667 12.794 3.66667 12.4615V4.00001H3V3.00001H6V2.41034H10V3.00001H13V4.00001H12.3333V12.4615C12.3333 12.7983 12.2167 13.0833 11.9833 13.3167C11.75 13.55 11.4649 13.6667 11.1282 13.6667H4.87183ZM11.3333 4.00001H4.66667V12.4615C4.66667 12.5214 4.68589 12.5706 4.72433 12.609C4.76278 12.6474 4.81194 12.6667 4.87183 12.6667H11.1282C11.1795 12.6667 11.2265 12.6453 11.2692 12.6025C11.3119 12.5598 11.3333 12.5128 11.3333 12.4615V4.00001ZM6.26933 11.3333H7.26917V5.33334H6.26933V11.3333ZM8.73083 11.3333H9.73067V5.33334H8.73083V11.3333Z", fill: "currentColor" }));
  }
  function IconBag() {
    return /* @__PURE__ */ k("svg", { width: "48", height: "48", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("path", { d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" }), /* @__PURE__ */ k("path", { d: "M3 6h18" }), /* @__PURE__ */ k("path", { d: "M16 10a4 4 0 0 1-8 0" }));
  }
  function IconGift() {
    return /* @__PURE__ */ k("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "currentColor" }, /* @__PURE__ */ k("path", { d: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }));
  }
  function IconCheck() {
    return /* @__PURE__ */ k("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("path", { d: "M20 6 9 17l-5-5" }));
  }
  function IconRemoveX() {
    return /* @__PURE__ */ k("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("path", { d: "M18 6 6 18" }), /* @__PURE__ */ k("path", { d: "m6 6 12 12" }));
  }
  function IconSparkle() {
    return /* @__PURE__ */ k("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "currentColor" }, /* @__PURE__ */ k("path", { d: "M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" }), /* @__PURE__ */ k("path", { d: "M18 14 18.75 16.75 21.5 17.5 18.75 18.25 18 21 17.25 18.25 14.5 17.5 17.25 16.75z", opacity: "0.6" }));
  }
  function IconLock() {
    return /* @__PURE__ */ k("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2" }), /* @__PURE__ */ k("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }));
  }
  var CartDrawer = class extends C {
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
        claimed: {},
        // key -> true, button-level optimistic state for freebie claims
        claimError: {},
        // key -> message, inline error shown on offer/claim card
        upsellError: null,
        // brief error message displayed near upsell list on rollback
        variantOpen: {},
        // item.key -> bool, controls dropdown visibility
        variantLoading: {}
        // item.key -> bool, true while fetching product variants
      };
      this.close = this.close.bind(this);
      this.handleOverlayClick = this.handleOverlayClick.bind(this);
      this._closeTimer = null;
      this._focusCleanup = null;
      this._triggerElement = null;
      this._drawerRef = null;
      this._debounceTimers = {};
      this._processingTimeout = null;
      this._removingTombstones = {};
      this._tombstoneTimers = {};
      this._pendingGiftRemovals = {};
      this._errorTimers = {};
      this._currency = window.Shopify && window.Shopify.currency && window.Shopify.currency.active || "USD";
      this._prevActiveTiers = {};
      this._confettiInitialized = false;
      this._confettiEnabled = true;
      this._appliedDrawerHash = null;
      this._text = {
        cart_title: "Your Cart",
        empty_title: "Your cart is empty",
        empty_subtitle: "Looks like you haven't added anything yet",
        empty_button: "Continue shopping",
        checkout_button: "Checkout",
        continue_shopping: "Continue shopping",
        continue_shopping_url: "",
        coupon_placeholder: "Discount code",
        total_label: "Total",
        subtotal_label: "Subtotal",
        savings_label: "Congrats! You saved {amount} on this order.",
        offer_cards_heading: "Pick your free gift"
      };
      this._layout = { drawer_position: "right", image_style: "rounded", qty_style: "bordered", show_vendor: false, show_variant_switcher: true, show_remove_btn: true };
      this._variantCache = {};
      this._upsells = { card_layout: "horizontal", card_size: "medium", heading: "", btn_text: "ADD TO CART", show_compare_price: true };
      this._announcement = { text: "", type: "static" };
      this._progressBar = { track_thickness: "normal", milestone_icon_svg: "", completed_icon_svg: "" };
      this._shape = { button_style: "solid" };
      this._sections = { show_progress_bar: true, show_claim_gifts: true, show_offer_cards: true, show_coupons: true, show_upsells: true, show_ribbon: true };
      this._behavior = { auto_open_on_add: true, animation_style: "slide", close_on_overlay_click: true, close_on_esc: true };
    }
    componentDidMount() {
      this._onCartChanged = (e2) => {
        if (e2.detail && e2.detail.cart) {
          var cart = this._stabiliseOrder(e2.detail.cart);
          this._currency = cart.currency || this._currency;
          this.setState({ cart, loading: false });
          updateCartCount(cart.item_count);
        } else {
          this.loadCart();
        }
        if (this._behavior.auto_open_on_add) this.openDrawer();
      };
      this._onEvalResult = (e2) => {
        if (e2.detail) {
          var patch = { evalResult: e2.detail };
          if (typeof e2.detail.total_savings === "number") {
            patch.savings = e2.detail.total_savings;
          }
          this.setState(patch);
          this._maybeApplyDrawer(e2.detail.drawer);
          if (e2.detail._server) this._checkConfetti(e2.detail);
        }
      };
      this._onInternalReload = (e2) => {
        if (e2.detail && e2.detail.cart) {
          var newCart = this._stabiliseOrder(e2.detail.cart);
          var newEval = e2.detail.evalResult || this.state.evalResult;
          this._currency = newCart.currency || this._currency;
          if (e2.detail.evalResult) {
            this._maybeApplyDrawer(e2.detail.evalResult.drawer);
            this._checkConfetti(e2.detail.evalResult);
          }
          var oldItems = this.state.cart && this.state.cart.items || [];
          var removing = this._detectRemovedKeys(oldItems, newCart);
          var pendingRemovals = this._pendingGiftRemovals || {};
          var newKeySet = {};
          (newCart.items || []).forEach(function(it) {
            newKeySet[it.key] = true;
          });
          Object.keys(pendingRemovals).forEach((k2) => {
            if (!newKeySet[k2]) {
              tracker.track(ANALYTICS_EVENTS.GIFT_REMOVED, pendingRemovals[k2]);
            }
            delete pendingRemovals[k2];
          });
          var newSavings = newEval && typeof newEval.total_savings === "number" ? newEval.total_savings : this.state.savings;
          this.setState({
            cart: newCart,
            evalResult: newEval,
            savings: newSavings,
            loading: false,
            updating: {},
            removing: Object.keys(removing).length > 0 ? removing : this.state.removing,
            pendingQty: {}
          });
          updateCartCount(newCart.item_count);
          this.announce("Cart updated");
          this._clearProcessingTimeout();
        }
      };
      this._onOptimisticUpdate = (e2) => {
        if (e2.detail && e2.detail.cart) {
          var optimisticCart = this._stabiliseOrder(e2.detail.cart);
          this._currency = optimisticCart.currency || this._currency;
          this.setState({ cart: optimisticCart, pendingQty: {} });
          updateCartCount(optimisticCart.item_count);
        }
      };
      this._onGiftUnavailable = (e2) => {
        var variants = e2.detail && e2.detail.variants || [];
        this.setState({ unavailableGifts: variants });
      };
      window.addEventListener("cartmax:cart-changed", this._onCartChanged);
      window.addEventListener("cartmax:eval-result", this._onEvalResult);
      window.addEventListener("cartmax:internal-reload", this._onInternalReload);
      window.addEventListener("cartmax:optimistic-update", this._onOptimisticUpdate);
      window.addEventListener("cartmax:gift-unavailable", this._onGiftUnavailable);
      window.__cartmaxReady = true;
      if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
        this.loadCart();
        this.openDrawer();
        window.__cartmaxQueue = [];
      }
      var rootEl = document.getElementById("cartmax-root");
      if (rootEl) {
        var analyticsEnabled = rootEl.dataset.analyticsEnabled !== "false";
        tracker.init({
          shopId: rootEl.dataset.shopId || "",
          customerId: rootEl.dataset.customerId || null,
          proxyBase: rootEl.dataset.proxyBase || "/apps/cartmax",
          enabled: analyticsEnabled
        });
      }
      this._promoObserver = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var id = el.getAttribute("data-cartmax-promo-id");
          var type = el.getAttribute("data-cartmax-promo-type");
          if (id) tracker.trackPromotionView(id, type);
          this._promoObserver.unobserve(el);
        });
      }, { threshold: 0.5 }) : null;
      var self = this;
      window.cartx = {
        open: function() {
          self.loadCart();
          self.openDrawer();
        },
        close: function() {
          self.close();
        },
        toggle: function() {
          self.state.open ? self.close() : (self.loadCart(), self.openDrawer());
        },
        refresh: function() {
          self.loadCart();
          window.dispatchEvent(new CustomEvent("cartmax:cart-changed", { detail: {} }));
        },
        isOpen: function() {
          return self.state.open;
        }
      };
      var CART_ICON_SELECTORS = [
        'a[href="/cart"]',
        'a[href="/cart/"]',
        'a[href^="/cart?"]',
        "[data-cart-icon]",
        "[data-cart-trigger]",
        "[data-cart-link]",
        "#cart-icon-bubble",
        "#cart-bubble",
        "#CartBubble",
        "cart-icon-bubble",
        '[aria-controls*="cart-drawer"]',
        '[aria-controls*="CartDrawer"]',
        '[aria-controls*="Cart-drawer"]',
        // Horizon: the icon is a direct-child <button> of <cart-drawer-component>.
        // The <dialog> sibling we strip below, so this selector only ever matches
        // the icon trigger button, never anything inside the drawer body.
        "cart-drawer-component > button"
      ].join(", ");
      this._onDocClick = (e2) => {
        var link = e2.target.closest(CART_ICON_SELECTORS);
        if (link) {
          e2.preventDefault();
          e2.stopPropagation();
          if (typeof e2.stopImmediatePropagation === "function") {
            e2.stopImmediatePropagation();
          }
          this._triggerElement = link;
          this.loadCart();
          this.openDrawer();
        }
      };
      document.addEventListener("click", this._onDocClick, true);
      this._onDocMouseover = (e2) => {
        var link = e2.target.closest(CART_ICON_SELECTORS);
        if (link && !this._hoverPrefetched) {
          this._hoverPrefetched = true;
          this.loadCart();
          setTimeout(() => {
            this._hoverPrefetched = false;
          }, 1e4);
        }
      };
      document.addEventListener("mouseover", this._onDocMouseover, { passive: true });
      this._onDocKeydown = (e2) => {
        if (e2.key === "Escape" && this.state.open && this._behavior.close_on_esc) this.close();
      };
      document.addEventListener("keydown", this._onDocKeydown);
      this._installThemeCompat();
    }
    _installThemeCompat() {
      var DRAWER_BODY_SELECTOR = "cart-drawer-component > dialog, cart-notification-component > dialog";
      function purgeNativeDrawerBodies(root) {
        try {
          if (root && root.matches && root.matches(DRAWER_BODY_SELECTOR)) {
            root.remove();
            return;
          }
          if (root && root.querySelectorAll) {
            root.querySelectorAll(DRAWER_BODY_SELECTOR).forEach(function(el) {
              el.remove();
            });
          }
        } catch (_2) {
        }
      }
      purgeNativeDrawerBodies(document);
      this._horizonObserver = new MutationObserver(function(mutations) {
        for (var i2 = 0; i2 < mutations.length; i2++) {
          var added = mutations[i2].addedNodes;
          for (var j2 = 0; j2 < added.length; j2++) {
            purgeNativeDrawerBodies(added[j2]);
          }
        }
      });
      this._horizonObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      var SCROLL_LOCK_CLASSES = ["scroll-lock", "cart-drawer-open"];
      function cleanScrollLock() {
        var html = document.documentElement;
        for (var i2 = 0; i2 < SCROLL_LOCK_CLASSES.length; i2++) {
          if (html.classList.contains(SCROLL_LOCK_CLASSES[i2])) {
            html.classList.remove(SCROLL_LOCK_CLASSES[i2]);
          }
        }
      }
      cleanScrollLock();
      this._scrollLockObserver = new MutationObserver(cleanScrollLock);
      this._scrollLockObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }
    componentWillUnmount() {
      window.removeEventListener("cartmax:cart-changed", this._onCartChanged);
      window.removeEventListener("cartmax:eval-result", this._onEvalResult);
      window.removeEventListener("cartmax:internal-reload", this._onInternalReload);
      window.removeEventListener("cartmax:optimistic-update", this._onOptimisticUpdate);
      window.removeEventListener("cartmax:gift-unavailable", this._onGiftUnavailable);
      document.removeEventListener("click", this._onDocClick, true);
      document.removeEventListener("mouseover", this._onDocMouseover);
      document.removeEventListener("keydown", this._onDocKeydown);
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
      try {
        hash = JSON.stringify(drawer);
      } catch (_2) {
        hash = null;
      }
      if (hash !== null && hash === this._appliedDrawerHash) return;
      this._appliedDrawerHash = hash;
      applyDrawerSettings(drawer);
      this._applyDrawerConfig(drawer);
      var beh = drawer.behavior;
      if (beh && beh.confetti_lottie_url) setConfettiLottieUrl(beh.confetti_lottie_url);
    }
    _applyDrawerConfig(drawer) {
      if (!drawer) return;
      var t2 = drawer.text || {};
      this._text = Object.assign({}, this._text, t2);
      var l2 = drawer.layout || {};
      this._layout = {
        drawer_position: l2.drawer_position || "right",
        image_style: l2.image_style || "rounded",
        qty_style: l2.qty_style || "bordered",
        show_vendor: l2.show_vendor === true,
        show_variant_switcher: l2.show_variant_switcher !== false,
        show_remove_btn: l2.show_remove_btn !== false,
        empty_icon_url: l2.empty_icon_url || "",
        empty_icon_size: l2.empty_icon_size || "medium",
        empty_icon_color: l2.empty_icon_color || ""
      };
      this._upsells = {
        card_layout: l2.upsells_card_layout || "horizontal",
        card_size: l2.upsells_card_size || "medium",
        heading: l2.upsells_heading || "",
        btn_text: l2.upsells_btn_text || "ADD TO CART",
        show_compare_price: l2.upsells_show_compare_price !== false
      };
      var ab = drawer.announcement_bar || {};
      this._announcement = {
        text: ab.text || "",
        type: ab.type || "static"
      };
      var pb = drawer.progress_bar || {};
      this._progressBar = {
        track_thickness: pb.track_thickness || "normal",
        milestone_icon_svg: pb.milestone_icon_svg || "",
        completed_icon_svg: pb.completed_icon_svg || ""
      };
      var sh = drawer.shape || {};
      this._shape = { button_style: sh.button_style || "solid" };
      var sec = drawer.sections || {};
      this._sections = {
        show_progress_bar: sec.show_progress_bar !== false,
        show_claim_gifts: sec.show_claim_gifts !== false,
        show_offer_cards: sec.show_offer_cards !== false,
        show_coupons: sec.show_coupons !== false,
        show_upsells: sec.show_upsells !== false,
        show_ribbon: sec.show_ribbon !== false
      };
      var beh = drawer.behavior || {};
      this._behavior = {
        auto_open_on_add: beh.auto_open_on_add !== false,
        animation_style: beh.animation_style || "slide",
        close_on_overlay_click: beh.close_on_overlay_click !== false,
        close_on_esc: beh.close_on_esc !== false
      };
      this._confettiEnabled = beh.confetti !== false;
      this._injectCustomCSS(drawer.advanced && drawer.advanced.custom_css);
      this._loadCustomFont(drawer.typography);
    }
    _injectCustomCSS(css) {
      var existing = document.getElementById("cartmax-custom-css");
      if (existing) existing.remove();
      if (!css) return;
      if (/<\/style|<script|javascript:|expression\(|@import/i.test(css)) return;
      var style = document.createElement("style");
      style.id = "cartmax-custom-css";
      style.textContent = css;
      document.head.appendChild(style);
    }
    _loadCustomFont(typo) {
      if (!typo || typo.font_source !== "custom" || !typo.custom_font_url) return;
      if (document.getElementById("cartmax-custom-font")) return;
      var link = document.createElement("link");
      link.id = "cartmax-custom-font";
      link.rel = "stylesheet";
      link.href = typo.custom_font_url;
      document.head.appendChild(link);
      var match = typo.custom_font_url.match(/family=([^:&]+)/);
      if (match) {
        var family = decodeURIComponent(match[1]).replace(/\+/g, " ");
        var root = document.getElementById("cartmax-root");
        if (root) root.style.setProperty("--cartmax-font-family", '"' + family + '"');
      }
    }
    // ── Confetti on milestone unlock ─────────────────────────
    _checkConfetti(evalResult) {
      var bar = evalResult && evalResult.bar;
      if (!bar || !bar.tiers) return;
      var newActive = {};
      for (var i2 = 0; i2 < bar.tiers.length; i2++) {
        var tier = bar.tiers[i2];
        var key = tier.label || String(i2);
        if (tier.state === "active") newActive[key] = true;
      }
      if (!this._confettiInitialized) {
        this._confettiInitialized = true;
        this._prevActiveTiers = newActive;
        return;
      }
      var prev = this._prevActiveTiers;
      var hasNew = false;
      for (var k2 in newActive) {
        if (newActive.hasOwnProperty(k2) && !prev[k2]) hasNew = true;
      }
      this._prevActiveTiers = newActive;
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
      var oldItems = this.state.cart && this.state.cart.items || [];
      if (oldItems.length === 0) return cart;
      var oldOrder = {};
      var pendingOldItems = [];
      oldItems.forEach(function(item, idx) {
        oldOrder[item.key] = idx;
        if (typeof item.key === "string" && item.key.indexOf("pending_") === 0) {
          pendingOldItems.push(item);
        }
      });
      var aliasFromReal = {};
      var claimed = {};
      for (var p2 = 0; p2 < pendingOldItems.length; p2++) {
        var pend = pendingOldItems[p2];
        for (var q2 = 0; q2 < cart.items.length; q2++) {
          var n2 = cart.items[q2];
          if (claimed[n2.key]) continue;
          if (typeof n2.key === "string" && n2.key.indexOf("pending_") === 0) continue;
          if (String(n2.variant_id) !== String(pend.variant_id)) continue;
          claimed[n2.key] = true;
          aliasFromReal[n2.key] = oldOrder[pend.key];
          break;
        }
      }
      var sorted = cart.items.slice().sort(function(a2, b2) {
        var ia = aliasFromReal.hasOwnProperty(a2.key) ? aliasFromReal[a2.key] : oldOrder.hasOwnProperty(a2.key) ? oldOrder[a2.key] : 99999;
        var ib = aliasFromReal.hasOwnProperty(b2.key) ? aliasFromReal[b2.key] : oldOrder.hasOwnProperty(b2.key) ? oldOrder[b2.key] : 99999;
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
      var pendingReals = {};
      (newCart.items || []).forEach(function(item) {
        newKeys[item.key] = true;
      });
      var claimed = {};
      oldItems.forEach(function(oldItem) {
        if (!(typeof oldItem.key === "string" && oldItem.key.indexOf("pending_") === 0)) return;
        for (var q2 = 0; q2 < (newCart.items || []).length; q2++) {
          var n2 = newCart.items[q2];
          if (claimed[n2.key]) continue;
          if (typeof n2.key === "string" && n2.key.indexOf("pending_") === 0) continue;
          if (String(n2.variant_id) !== String(oldItem.variant_id)) continue;
          claimed[n2.key] = true;
          pendingReals[oldItem.key] = true;
          break;
        }
      });
      var removing = {};
      oldItems.forEach(function(item) {
        if (newKeys[item.key]) return;
        if (pendingReals[item.key]) return;
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
        this.setState({ cart, loading: false });
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
      document.body.style.overflow = "hidden";
      this.announce("Cart opened");
      window.dispatchEvent(new CustomEvent("cartmax:drawer-opened"));
      this._openedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      var cart = this.state.cart;
      tracker.track(ANALYTICS_EVENTS.DRAWER_OPENED, {
        cart_total: cart ? cart.total_price : null,
        item_count: cart ? cart.item_count : null
      });
    }
    close() {
      if (this._focusCleanup) {
        this._focusCleanup();
        this._focusCleanup = null;
      }
      this.setState({ open: false });
      document.body.style.overflow = "";
      this._closeTimer = setTimeout(() => {
        this.setState({ visible: false });
        this._closeTimer = null;
      }, CLOSE_DELAY);
      if (this._triggerElement && this._triggerElement.focus) {
        this._triggerElement.focus();
        this._triggerElement = null;
      }
      this.announce("Cart closed");
      if (this._openedAt != null) {
        var now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        var dwellMs = Math.max(0, Math.round(now - this._openedAt));
        var cart = this.state.cart;
        tracker.track(ANALYTICS_EVENTS.DRAWER_CLOSED, {
          cart_total: cart ? cart.total_price : null,
          item_count: cart ? cart.item_count : null,
          dwell_ms: dwellMs
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
        console.warn("[cartx] Processing timeout \u2014 forcing recovery");
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
      this.setState({ pendingQty });
      if (this._debounceTimers[key]) clearTimeout(this._debounceTimers[key]);
      this._debounceTimers[key] = setTimeout(() => {
        delete this._debounceTimers[key];
        this.flushQuantityChange(key, qty);
      }, DEBOUNCE_DELAY);
    }
    flushQuantityChange(key, qty) {
      var updating = Object.assign({}, this.state.updating);
      updating[key] = true;
      this.setState({ updating });
      this._startProcessingTimeout();
      window.dispatchEvent(new CustomEvent("cartmax:cart-action", {
        detail: { cart: this.state.cart, action: { key, qty } }
      }));
      this.announce("Updating cart...");
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
      var line = cart && cart.items && cart.items.find(function(i2) {
        return i2.key === key;
      });
      if (line && line.properties && line.properties._freebie === "true") {
        this._pendingGiftRemovals[key] = {
          promotion_id: line.properties._offer_id || null,
          promotion_type: line.properties._cartmax_claim === "true" ? "claim-gift" : "offer",
          variant_id: String(line.variant_id)
        };
      }
      if (line) this._removingTombstones[key] = line;
      var removing = Object.assign({}, this.state.removing);
      removing[key] = true;
      var updating = Object.assign({}, this.state.updating);
      updating[key] = true;
      this.setState({ removing, updating });
      this._startProcessingTimeout();
      window.dispatchEvent(new CustomEvent("cartmax:cart-action", {
        detail: { cart: this.state.cart, action: { key, qty: 0 } }
      }));
      this.announce("Removing item...");
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
      var cartItems = cart && cart.items || [];
      var inCart = {};
      cartItems.forEach(function(item) {
        inCart[item.key] = true;
      });
      var merged = cartItems.slice();
      var tombs = this._removingTombstones || {};
      Object.keys(tombs).forEach(function(key) {
        if (!inCart[key]) merged.push(tombs[key]);
      });
      return merged;
    }
    // ── Accessibility ─────────────────────────────────────────
    announce(msg) {
      var el = document.getElementById("cartmax-live-region");
      if (el) el.textContent = msg;
    }
    getDisplayQty(item) {
      if (this.state.pendingQty.hasOwnProperty(item.key)) {
        return this.state.pendingQty[item.key];
      }
      return item.quantity;
    }
    // ── Render: Announcement Bar ─────────────────────────────
    renderAnnouncementBar() {
      var a2 = this._announcement;
      if (!a2.text) return null;
      if (a2.type === "marquee") {
        return /* @__PURE__ */ k("div", { class: "cartmax-announcement cartmax-announcement--marquee" }, /* @__PURE__ */ k("div", { class: "cartmax-announcement-track" }, /* @__PURE__ */ k("span", { class: "cartmax-announcement-item" }, a2.text), /* @__PURE__ */ k("span", { class: "cartmax-announcement-item", "aria-hidden": "true" }, a2.text)));
      }
      return /* @__PURE__ */ k("div", { class: "cartmax-announcement cartmax-announcement--static" }, a2.text);
    }
    // ── Render: Progress Bar ──────────────────────────────────
    renderProgressBar() {
      var result = this.state.evalResult;
      if (!result || !result.bar || !result.bar.tiers || result.bar.tiers.length === 0) {
        return null;
      }
      var bar = result.bar;
      var tiers = bar.tiers;
      var n2 = tiers.length;
      var pct = Math.min(bar.progress_pct || 0, 100);
      var trackPadRight = 30;
      var usableWidth = 100;
      var pb = this._progressBar;
      var milestoneIconSvg = pb.milestone_icon_svg || "";
      var completedIconSvg = pb.completed_icon_svg || milestoneIconSvg;
      return /* @__PURE__ */ k("div", { id: "cartmax-progress", className: "cartmax-progress" }, bar.top_message ? /* @__PURE__ */ k("div", { class: "cartmax-progress-msg-wrap" }, /* @__PURE__ */ k("div", { class: "cartmax-progress-msg" }, /* @__PURE__ */ k("span", null, bar.top_message))) : null, /* @__PURE__ */ k("div", { className: "cartmax-progress-track", style: { marginRight: trackPadRight + "px" } }, /* @__PURE__ */ k("div", { className: "cartmax-progress-fill", style: { width: pct + "%" } }, /* @__PURE__ */ k("span", { className: "visually-hidden" }, "Progress fill")), tiers.map((tier, i2) => {
        var pos = (i2 + 1) / n2 * usableWidth;
        var cls = "cartmax-milestone";
        var isActive = tier.state === "active";
        if (isActive) cls += " cartmax-milestone--active";
        else if (tier.state === "next") cls += " cartmax-milestone--next";
        var self = this;
        var customSvgForState = isActive ? completedIconSvg : milestoneIconSvg;
        if (customSvgForState) cls += " cartmax-milestone--custom";
        var dotContent;
        if (isActive) {
          if (completedIconSvg) {
            dotContent = /* @__PURE__ */ k("span", { class: "cartmax-milestone-custom-icon", dangerouslySetInnerHTML: { __html: completedIconSvg } });
          } else {
            dotContent = /* @__PURE__ */ k("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "#fff", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("path", { d: "M20 6 9 17l-5-5" }));
          }
        } else {
          if (milestoneIconSvg) {
            dotContent = /* @__PURE__ */ k("span", { class: "cartmax-milestone-custom-icon", dangerouslySetInnerHTML: { __html: milestoneIconSvg } });
          } else {
            dotContent = /* @__PURE__ */ k("span", { class: "visually-hidden" }, "Milestone");
          }
        }
        return /* @__PURE__ */ k(
          "div",
          {
            class: cls,
            style: { left: pos + "%" },
            key: tier.id || i2,
            "data-cartmax-promo-id": tier.promotion_id || void 0,
            "data-cartmax-promo-type": tier.promotion_type || void 0,
            ref: tier.promotion_id ? function(el) {
              self._observePromo(el);
            } : void 0
          },
          /* @__PURE__ */ k("div", { class: "cartmax-milestone-dot" }, dotContent),
          /* @__PURE__ */ k("div", { class: "cartmax-milestone-label" }, /* @__PURE__ */ k("div", { class: "cartmax-milestone-label-main" }, (tier.label || "").split("\n+ ")[0]), tier.sub_label ? /* @__PURE__ */ k("div", { class: "cartmax-milestone-sub-label" }, tier.sub_label) : null)
        );
      })));
    }
    // ── Render: Ribbon ────────────────────────────────────────
    renderRibbon() {
      var result = this.state.evalResult;
      if (!result || !result.ribbon_message) return null;
      return /* @__PURE__ */ k("div", { id: "cartmax-ribbon", class: "cartmax-ribbon" }, result.ribbon_message);
    }
    // ── Variant switcher ──────────────────────────────────────
    async _fetchVariantData(item) {
      var productId = String(item.product_id);
      if (this._variantCache[productId]) return this._variantCache[productId];
      var handle = null;
      if (item.url) {
        var parts = item.url.split("/products/");
        if (parts[1]) handle = parts[1].split("?")[0];
      }
      if (!handle) return null;
      try {
        var res = await fetch("/products/" + handle + ".js");
        var data = await res.json();
        var variants = (data.variants || []).map(function(v2) {
          return { id: v2.id, title: v2.title, available: v2.available };
        });
        this._variantCache[productId] = variants;
        return variants;
      } catch (err) {
        console.error("[cartx] Failed to fetch variants:", err);
        return null;
      }
    }
    async handleVariantToggle(key, item) {
      var isOpen = this.state.variantOpen[key];
      var nextOpen = Object.assign({}, this.state.variantOpen);
      if (isOpen) {
        delete nextOpen[key];
        this.setState({ variantOpen: nextOpen });
        return;
      }
      nextOpen[key] = true;
      var productId = String(item.product_id);
      if (!this._variantCache[productId]) {
        var nextLoading = Object.assign({}, this.state.variantLoading, { [key]: true });
        this.setState({ variantOpen: nextOpen, variantLoading: nextLoading });
        await this._fetchVariantData(item);
        var clearLoading = Object.assign({}, this.state.variantLoading);
        delete clearLoading[key];
        this.setState({ variantLoading: clearLoading });
      } else {
        this.setState({ variantOpen: nextOpen });
      }
    }
    async handleVariantSwitch(item, newVariantId) {
      var key = item.key;
      var qty = item.quantity;
      var nextOpen = Object.assign({}, this.state.variantOpen);
      delete nextOpen[key];
      if (String(item.variant_id) === String(newVariantId)) {
        this.setState({ variantOpen: nextOpen });
        return;
      }
      var updating = Object.assign({}, this.state.updating, { [key]: true });
      this.setState({ variantOpen: nextOpen, updating });
      this._startProcessingTimeout();
      try {
        await internalFetch("/cart/change.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: key, quantity: 0 })
        });
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(newVariantId), quantity: qty })
        });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        window.dispatchEvent(new CustomEvent("cartmax:internal-reload", { detail: { cart } }));
      } catch (err) {
        console.error("[cartx] Variant switch error:", err);
        var newUpdating = Object.assign({}, this.state.updating);
        delete newUpdating[key];
        this.setState({ updating: newUpdating });
        this.loadCart();
      }
    }
    // ── Render: Line Item ─────────────────────────────────────
    renderLineItem(item) {
      var isUpdating = this.state.updating[item.key];
      var isRemoving = this.state.removing[item.key];
      var displayQty = this.getDisplayQty(item);
      var isPending = this.state.pendingQty.hasOwnProperty(item.key);
      var curr = this._currency;
      var isFreebie = item.properties && item.properties["_freebie"] === "true" && item.properties["_claimed"] !== "true";
      var isClaimed = item.properties && (item.properties["_claimed"] === "true" || item.properties["_cartmax_claim"] === "true");
      var isVariantOpen = this.state.variantOpen[item.key];
      var isVariantLoading = this.state.variantLoading[item.key];
      var cachedVariants = this._variantCache[String(item.product_id)] || [];
      var showVariantSwitcher = this._layout.show_variant_switcher && item.variant_title && !isFreebie && !isClaimed;
      var showRemoveBtn = this._layout.show_remove_btn && displayQty > 1 && !isFreebie && !isClaimed;
      var cls = "cartmax-line-item" + (isRemoving ? " cartmax-line-removing" : "") + (isFreebie ? " cartmax-line-freebie" : "");
      return /* @__PURE__ */ k("div", { class: cls, key: item.key }, /* @__PURE__ */ k("div", { class: "cartmax-line-image" }, item.image ? /* @__PURE__ */ k("img", { src: resizeImage(item.image, 96), alt: item.title, width: "64", height: "64", loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-line-image-placeholder" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "No image"))), /* @__PURE__ */ k("div", { class: "cartmax-line-details" }, this._layout.show_vendor && item.vendor ? /* @__PURE__ */ k("div", { class: "cartmax-line-vendor" }, item.vendor) : null, /* @__PURE__ */ k("div", { class: "cartmax-line-title-row" }, /* @__PURE__ */ k("div", { class: "cartmax-line-title" }, item.product_title), showRemoveBtn ? /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-line-remove",
          onClick: () => this.handleRemove(item.key),
          disabled: isUpdating || isRemoving,
          "aria-label": "Remove " + item.product_title
        },
        /* @__PURE__ */ k(IconTrash, null)
      ) : null), /* @__PURE__ */ k("div", { class: "cartmax-line-price" }, isFreebie && item.final_line_price === 0 ? /* @__PURE__ */ k("span", { class: "cartmax-gift-badge" }, /* @__PURE__ */ k(IconGift, null), " FREE") : [
        /* @__PURE__ */ k("span", { key: "final" }, formatMoney(item.final_line_price, curr)),
        item.original_line_price !== item.final_line_price ? /* @__PURE__ */ k("span", { key: "orig", class: "cartmax-line-price-original" }, formatMoney(item.original_line_price, curr)) : null
      ]), !isClaimed && !isFreebie && item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-line-discounts" }, item.line_level_discount_allocations.map((d2) => /* @__PURE__ */ k("span", { class: "cartmax-line-discount-tag", key: d2.discount_application.title }, d2.discount_application.title))) : null, !isFreebie ? /* @__PURE__ */ k("div", { class: "cartmax-line-actions" }, showVariantSwitcher ? /* @__PURE__ */ k("div", { class: "cartmax-variant-wrap" }, /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-variant-pill" + (isVariantOpen ? " cartmax-variant-pill--open" : ""),
          onClick: () => this.handleVariantToggle(item.key, item),
          disabled: isUpdating,
          "aria-haspopup": "listbox",
          "aria-expanded": isVariantOpen ? "true" : "false"
        },
        /* @__PURE__ */ k("span", null, item.variant_title),
        isVariantLoading ? /* @__PURE__ */ k("span", { class: "cartmax-variant-loading", "aria-hidden": "true" }) : /* @__PURE__ */ k("svg", { class: "cartmax-variant-chevron", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round" }, /* @__PURE__ */ k("path", { d: "m6 9 6 6 6-6" }))
      ), isVariantOpen && cachedVariants.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-variant-dropdown", role: "listbox" }, cachedVariants.map((v2) => {
        var isCurrent = String(v2.id) === String(item.variant_id);
        return /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-variant-option" + (isCurrent ? " cartmax-variant-option--current" : "") + (!v2.available ? " cartmax-variant-option--oos" : ""),
            key: v2.id,
            role: "option",
            "aria-selected": isCurrent ? "true" : "false",
            disabled: !v2.available || isUpdating,
            onClick: () => this.handleVariantSwitch(item, v2.id)
          },
          /* @__PURE__ */ k("span", null, v2.title),
          isCurrent ? /* @__PURE__ */ k(IconCheck, null) : null,
          !v2.available ? /* @__PURE__ */ k("span", { class: "cartmax-variant-oos-label" }, "Out of stock") : null
        );
      })) : null) : null, /* @__PURE__ */ k("div", { class: "cartmax-qty-controls" }, /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-qty-btn",
          onClick: () => displayQty <= 1 ? this.handleRemove(item.key) : this.queueQuantityChange(item.key, displayQty - 1),
          disabled: isUpdating || isRemoving,
          "aria-label": displayQty <= 1 ? "Remove " + item.product_title : "Decrease quantity"
        },
        displayQty <= 1 ? /* @__PURE__ */ k(IconTrash, null) : /* @__PURE__ */ k(IconMinus, null)
      ), /* @__PURE__ */ k("span", { class: "cartmax-qty-value" + (isPending ? " cartmax-qty-pending" : "") }, displayQty), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-qty-btn",
          onClick: () => this.queueQuantityChange(item.key, displayQty + 1),
          disabled: isUpdating,
          "aria-label": "Increase quantity"
        },
        /* @__PURE__ */ k(IconPlus, null)
      ))) : null));
    }
    // ── Render: Loading skeleton ──────────────────────────────
    renderLoading() {
      return /* @__PURE__ */ k("div", { class: "cartmax-loading" }, [0, 1, 2].map(function(i2) {
        return /* @__PURE__ */ k("div", { class: "cartmax-skeleton-item", key: i2 }, /* @__PURE__ */ k("div", { class: "cartmax-skeleton-img" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "Loading")), /* @__PURE__ */ k("div", { class: "cartmax-skeleton-lines" }, /* @__PURE__ */ k("div", { class: "cartmax-skeleton-line" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "Loading")), /* @__PURE__ */ k("div", { class: "cartmax-skeleton-line" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "Loading")), /* @__PURE__ */ k("div", { class: "cartmax-skeleton-line" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "Loading"))));
      }));
    }
    // ── Render: Empty state ───────────────────────────────────
    renderEmpty() {
      var self = this;
      var iconUrl = this._layout.empty_icon_url;
      var iconSize = this._layout.empty_icon_size || "medium";
      var iconColor = this._layout.empty_icon_color;
      var iconStyle = iconColor ? { color: iconColor } : void 0;
      var sizeClass = "cartmax-empty-icon cartmax-empty-icon--" + iconSize;
      return /* @__PURE__ */ k("div", { class: "cartmax-empty" }, /* @__PURE__ */ k("div", { class: sizeClass, style: iconStyle }, iconUrl ? /* @__PURE__ */ k("img", { src: iconUrl, alt: "", "aria-hidden": "true", style: { width: "100%", height: "100%", objectFit: "contain", display: "block" } }) : /* @__PURE__ */ k(IconBag, null)), /* @__PURE__ */ k("div", { class: "cartmax-empty-text-group" }, /* @__PURE__ */ k("p", { class: "cartmax-empty-text" }, this._text.empty_title), /* @__PURE__ */ k("p", { class: "cartmax-empty-subtitle" }, this._text.empty_subtitle)), this._text.empty_button ? /* @__PURE__ */ k("button", { class: "cartmax-empty-btn", onClick: function() {
        if (self._text.continue_shopping_url) {
          window.location.href = self._text.continue_shopping_url;
        } else {
          self.close();
        }
      } }, this._text.empty_button) : null);
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
      var key = "claim_" + variantId;
      this._clearClaimError(key);
      this.setState({
        claimed: Object.assign({}, this.state.claimed, { [key]: true }),
        updating: Object.assign({}, this.state.updating, { [key]: true })
      });
      try {
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: Number(variantId),
            quantity: 1,
            properties: { _freebie: "true", _cartmax_claim: "true", _claimed: "true", _offer_id: claimId }
          })
        });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        this.setState({ cart });
        updateCartCount(cart.item_count);
        window.dispatchEvent(new CustomEvent("cartmax:cart-changed", { detail: { cart } }));
        tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, {
          promotion_id: claimId,
          promotion_type: "claim-gift",
          variant_id: String(variantId),
          cart_total: cart.total_price,
          item_count: cart.item_count
        });
      } catch (err) {
        var nextClaimed = Object.assign({}, this.state.claimed);
        delete nextClaimed[key];
        this.setState({ claimed: nextClaimed });
        this._showClaimError(key, "Out of stock");
        console.error("[cartx] Claim add error:", err);
      } finally {
        var newUpdating = Object.assign({}, this.state.updating);
        delete newUpdating[key];
        this.setState({ updating: newUpdating });
      }
    }
    async handleClaimRemove(variantId) {
      var cart = this.state.cart;
      if (!cart) return;
      var line = cart.items.find(function(i2) {
        return String(i2.variant_id) === String(variantId);
      });
      if (!line) return;
      var nextClaimed = Object.assign({}, this.state.claimed);
      delete nextClaimed["claim_" + variantId];
      delete nextClaimed["offer_" + variantId];
      this.setState({ claimed: nextClaimed });
      this.handleRemove(line.key);
    }
    // Display-mode offer: customer manually adds the gift from a card.
    // Button-level optimistic (same pattern as handleClaimAdd) — the cart
    // line itself stays pessimistic to avoid blink-in/blink-out on
    // inventory rejection.
    async handleOfferDisplayAdd(variantId, offerId, quantity) {
      var key = "offer_" + variantId;
      this._clearClaimError(key);
      this.setState({
        claimed: Object.assign({}, this.state.claimed, { [key]: true }),
        updating: Object.assign({}, this.state.updating, { [key]: true })
      });
      try {
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: Number(variantId),
            quantity: quantity || 1,
            properties: {
              _freebie: "true",
              _offer_id: offerId,
              _acquired_on_page: window.location.pathname
            }
          })
        });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        this.setState({ cart });
        updateCartCount(cart.item_count);
        window.dispatchEvent(new CustomEvent("cartmax:cart-changed", { detail: { cart } }));
      } catch (err) {
        var nextClaimed = Object.assign({}, this.state.claimed);
        delete nextClaimed[key];
        this.setState({ claimed: nextClaimed });
        this._showClaimError(key, "Out of stock");
        console.error("[cartx] Offer display add error:", err);
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
      var heading = this._text.offer_cards_heading || "Pick your free gift";
      return /* @__PURE__ */ k("div", { class: "cartmax-claims cartmax-offer-cards" }, /* @__PURE__ */ k("div", { class: "cartmax-claims-heading" }, heading), /* @__PURE__ */ k("div", { class: "cartmax-claims-scroll" }, groups.map(function(group) {
        return /* @__PURE__ */ k(
          "div",
          {
            class: "cartmax-offer-group",
            key: "group:" + group.offer_id,
            "data-cartmax-promo-id": group.offer_id,
            "data-cartmax-promo-type": "offer",
            ref: function(el) {
              self._observePromo(el);
            }
          },
          (group.gifts || []).map(function(g2) {
            var vid = String(g2.variant_id);
            if (vid.startsWith("gid://")) vid = vid.split("/").pop();
            var btnKey = "offer_" + vid;
            var isAdding = self.state.updating[btnKey];
            var isClaimedOptimistic = self.state.claimed[btnKey];
            var claimErr = self.state.claimError[btnKey];
            var inCart = g2.in_cart;
            var showClaimedBtn = isClaimedOptimistic && !inCart;
            return /* @__PURE__ */ k("div", { class: "cartmax-claim-card" + (inCart ? " cartmax-claim-card--in-cart" : ""), key: group.offer_id + ":" + vid }, g2.image ? /* @__PURE__ */ k("img", { class: "cartmax-claim-img", src: resizeImage(g2.image, 96), alt: g2.title, loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-claim-img-placeholder" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "No image")), /* @__PURE__ */ k("div", { class: "cartmax-claim-info" }, g2.title ? /* @__PURE__ */ k("div", { class: "cartmax-claim-title" }, g2.title) : null, inCart ? /* @__PURE__ */ k(
              "button",
              {
                class: "cartmax-claim-btn cartmax-claim-btn--remove",
                onClick: function() {
                  self.handleClaimRemove(vid);
                }
              },
              "Remove"
            ) : showClaimedBtn ? /* @__PURE__ */ k(
              "button",
              {
                class: "cartmax-claim-btn cartmax-claim-btn--claimed",
                disabled: true
              },
              /* @__PURE__ */ k(IconCheck, null),
              " Claimed"
            ) : /* @__PURE__ */ k(
              "button",
              {
                class: "cartmax-claim-btn cartmax-claim-btn--add",
                onClick: function() {
                  self.handleOfferDisplayAdd(vid, group.offer_id, group.quantity_per_variant);
                },
                disabled: isAdding || !g2.available
              },
              isAdding ? "Adding..." : !g2.available ? "Unavailable" : "Add"
            ), claimErr ? /* @__PURE__ */ k("div", { class: "cartmax-claim-error" }, claimErr) : null));
          })
        );
      })));
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
        return cart.items.some(function(item) {
          return String(item.variant_id) === String(vid);
        });
      }
      var gifts = allGifts;
      var cartClaimedCount = 0;
      if (cart && cart.items) {
        cart.items.forEach(function(item) {
          if (item.properties && (item.properties["_claimed"] === "true" || item.properties["_cartmax_claim"] === "true")) {
            cartClaimedCount++;
          }
        });
      }
      var limitReached = cartClaimedCount >= maxClaims;
      return /* @__PURE__ */ k(
        "div",
        {
          class: "cartmax-claims",
          "data-cartmax-promo-id": cg._rule_id,
          "data-cartmax-promo-type": "claim-gift",
          ref: function(el) {
            self._observePromo(el);
          }
        },
        /* @__PURE__ */ k("div", { class: "cartmax-claims-heading" }, cg.section_heading),
        /* @__PURE__ */ k("div", { class: "cartmax-claims-scroll" }, gifts.map(function(g2) {
          var vid = String(g2.variant_id);
          if (vid.startsWith("gid://")) vid = vid.split("/").pop();
          var btnKey = "claim_" + vid;
          var isClaiming = self.state.updating[btnKey];
          var isClaimedOptimistic = self.state.claimed[btnKey];
          var claimErr = self.state.claimError[btnKey];
          var inCart = g2.in_cart || isInCart(vid);
          var showClaimedBtn = isClaimedOptimistic && !inCart;
          return /* @__PURE__ */ k("div", { class: "cartmax-claim-card" + (inCart ? " cartmax-claim-card--in-cart" : ""), key: vid }, g2.image ? /* @__PURE__ */ k("img", { class: "cartmax-claim-img", src: resizeImage(g2.image, 96), alt: g2.title, loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-claim-img-placeholder" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "No image")), /* @__PURE__ */ k("div", { class: "cartmax-claim-info" }, g2.title ? /* @__PURE__ */ k("div", { class: "cartmax-claim-title" }, g2.title) : null, inCart ? /* @__PURE__ */ k(
            "button",
            {
              class: "cartmax-claim-btn cartmax-claim-btn--remove",
              onClick: function() {
                self.handleClaimRemove(vid);
              }
            },
            "Remove"
          ) : showClaimedBtn ? /* @__PURE__ */ k(
            "button",
            {
              class: "cartmax-claim-btn cartmax-claim-btn--claimed",
              disabled: true
            },
            /* @__PURE__ */ k(IconCheck, null),
            " Claimed"
          ) : /* @__PURE__ */ k(
            "button",
            {
              class: "cartmax-claim-btn cartmax-claim-btn--add",
              onClick: function() {
                self.handleClaimAdd(vid, cg._rule_id);
              },
              disabled: isClaiming || !g2.available || limitReached
            },
            isClaiming ? "Adding..." : !g2.available ? "Unavailable" : limitReached ? "Limit reached" : "Add"
          ), claimErr ? /* @__PURE__ */ k("div", { class: "cartmax-claim-error" }, claimErr) : null));
        }))
      );
    }
    // ── Coupons ────────────────────────────────────────────────
    getAppliedCodes() {
      var cart = this.state.cart;
      if (!cart) return [];
      var codes = [];
      (cart.cart_level_discount_applications || []).forEach(function(d2) {
        if (d2.title) codes.push(d2.title);
      });
      (cart.items || []).forEach(function(item) {
        (item.line_level_discount_allocations || []).forEach(function(a2) {
          if (a2.discount_application && a2.discount_application.title) {
            codes.push(a2.discount_application.title);
          }
        });
      });
      return codes.filter(function(c2, i2, arr) {
        return arr.indexOf(c2) === i2;
      });
    }
    async handleCouponApply(code) {
      if (!code || !code.trim()) return;
      this.setState({ couponLoading: true, couponError: null });
      try {
        var currentCodes = this.getAppliedCodes();
        var newCode = code.trim();
        if (!currentCodes.some(function(c2) {
          return c2.toUpperCase() === newCode.toUpperCase();
        })) {
          currentCodes.push(newCode);
        }
        var discountPayload = currentCodes.join(",");
        await cartUpdateAll({ discount: discountPayload });
        var cart = await fetchCart();
        var codeUpper = newCode.toUpperCase();
        var applied = (cart.cart_level_discount_applications || []).some(function(d2) {
          return d2.title && d2.title.toUpperCase() === codeUpper;
        });
        if (!applied) {
          applied = (cart.items || []).some(function(item) {
            return (item.line_level_discount_allocations || []).some(function(a2) {
              return a2.discount_application && a2.discount_application.title && a2.discount_application.title.toUpperCase() === codeUpper;
            });
          });
        }
        this._currency = cart.currency || this._currency;
        this.setState({
          cart,
          couponLoading: false,
          couponError: applied ? null : "Invalid or inapplicable code",
          couponInput: applied ? "" : this.state.couponInput,
          couponPanelOpen: applied ? false : this.state.couponPanelOpen
        });
        updateCartCount(cart.item_count);
        if (applied) window.dispatchEvent(new CustomEvent("cartmax:cart-action", { detail: { cart } }));
        tracker.track(
          applied ? ANALYTICS_EVENTS.COUPON_APPLIED : ANALYTICS_EVENTS.COUPON_REJECTED,
          {
            promotion_type: "coupon",
            code: newCode,
            reason: applied ? null : "not_applicable",
            cart_total: cart.total_price,
            item_count: cart.item_count
          }
        );
      } catch (err) {
        this.setState({ couponLoading: false, couponError: "Failed to apply coupon" });
        tracker.track(ANALYTICS_EVENTS.COUPON_REJECTED, {
          promotion_type: "coupon",
          code: (code || "").trim(),
          reason: "request_failed"
        });
      }
    }
    async handleCouponRemove(codeToRemove) {
      var snapshot = this.state.cart;
      this.setState({ couponLoading: true });
      if (snapshot) dispatchOptimistic(simulateCouponRemove(snapshot, codeToRemove));
      try {
        var currentCodes = this.getAppliedCodes();
        var removeUpper = (codeToRemove || "").toUpperCase();
        var remaining = currentCodes.filter(function(c2) {
          return c2.toUpperCase() !== removeUpper;
        });
        var discountPayload = remaining.length > 0 ? remaining.join(",") : "";
        await cartUpdateAll({ discount: discountPayload });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        this.setState({ cart, couponLoading: false });
        updateCartCount(cart.item_count);
        window.dispatchEvent(new CustomEvent("cartmax:cart-action", { detail: { cart } }));
      } catch (err) {
        if (snapshot) dispatchOptimistic(snapshot);
        this.setState({ couponLoading: false });
      }
    }
    getAppliedDiscounts() {
      var cart = this.state.cart;
      if (!cart) return [];
      var codes = [];
      (cart.cart_level_discount_applications || []).forEach(function(d2) {
        if (d2.title && d2.type === "discount_code") {
          codes.push({ code: d2.title, amount: d2.total_allocated_amount || 0 });
        }
      });
      return codes;
    }
    renderCoupons() {
      var self = this;
      var isLoading = this.state.couponLoading;
      var appliedDiscounts = this.getAppliedDiscounts();
      var result = this.state.evalResult;
      var available = result && result.available_coupons || [];
      var showPanel = this.state.couponPanelOpen;
      return /* @__PURE__ */ k("div", { class: "cartmax-coupons" }, /* @__PURE__ */ k("div", { class: "cartmax-coupon-input-row" }, /* @__PURE__ */ k(
        "input",
        {
          class: "cartmax-coupon-input",
          type: "text",
          placeholder: this._text.coupon_placeholder,
          value: this.state.couponInput || "",
          onInput: function(e2) {
            self.setState({ couponInput: e2.target.value, couponError: null });
          },
          onKeyDown: function(e2) {
            if (e2.key === "Enter") self.handleCouponApply(self.state.couponInput);
          },
          disabled: isLoading
        }
      ), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-coupon-apply-btn",
          onClick: function() {
            self.handleCouponApply(self.state.couponInput);
          },
          disabled: isLoading || !(self.state.couponInput || "").trim()
        },
        isLoading ? "..." : "Apply"
      )), this.state.couponError ? /* @__PURE__ */ k("div", { class: "cartmax-coupon-error" }, this.state.couponError) : null, available.length > 0 && /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-coupons-viewall",
          onClick: function() {
            self.setState({ couponPanelOpen: !showPanel });
          }
        },
        showPanel ? "Hide coupons" : "View all coupons (" + available.length + ")"
      ), appliedDiscounts.length > 0 && /* @__PURE__ */ k("div", { class: "cartmax-applied-discounts" }, appliedDiscounts.map(function(d2) {
        return /* @__PURE__ */ k("div", { class: "cartmax-applied-discount", key: d2.code }, /* @__PURE__ */ k("div", { class: "cartmax-applied-discount-info" }, /* @__PURE__ */ k("span", { class: "cartmax-applied-discount-code" }, d2.code)), /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-applied-discount-remove",
            onClick: function() {
              self.handleCouponRemove(d2.code);
            },
            disabled: isLoading,
            "aria-label": "Remove " + d2.code
          },
          /* @__PURE__ */ k(IconRemoveX, null)
        ));
      })), /* @__PURE__ */ k("div", { class: "cartmax-coupon-drawer" + (showPanel ? " cartmax-coupon-drawer--open" : "") }, /* @__PURE__ */ k("div", { class: "cartmax-coupon-drawer-header" }, /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-coupon-drawer-back",
          onClick: function() {
            self.setState({ couponPanelOpen: false });
          },
          "aria-label": "Back to cart"
        },
        "\u2190"
      ), /* @__PURE__ */ k("span", { class: "cartmax-coupon-drawer-title" }, "Available Coupons")), /* @__PURE__ */ k("div", { class: "cartmax-coupon-drawer-body" }, available.map(function(c2) {
        return /* @__PURE__ */ k("div", { class: "cartmax-coupon-card" + (c2.applied ? " cartmax-coupon-card--applied" : ""), key: c2.id }, /* @__PURE__ */ k("div", { class: "cartmax-coupon-card-header" }, /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-type" }, c2.type_label), !c2.is_automatic ? /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-code" }, c2.code) : /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-auto" }, "Automatic")), /* @__PURE__ */ k("div", { class: "cartmax-coupon-card-title" }, c2.title), c2.display_message ? /* @__PURE__ */ k("div", { class: "cartmax-coupon-card-msg" }, c2.display_message) : null, c2.applied ? /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-applied" }, /* @__PURE__ */ k(IconCheck, null), " Applied") : !c2.is_automatic ? /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-coupon-card-btn",
            onClick: function() {
              self.handleCouponApply(c2.code);
            },
            disabled: isLoading
          },
          isLoading ? "Applying..." : "Apply"
        ) : null);
      }))));
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
      var key = "upsell_" + variantId;
      var snapshot = this.state.cart;
      this.setState({ updating: Object.assign({}, this.state.updating, { [key]: true }) });
      if (productMeta && snapshot) {
        var unitPriceCents = Math.round(Number(productMeta.price || 0) * 100);
        var optimisticItem = {
          key: "pending_upsell_" + variantId + "_" + Date.now(),
          variant_id: Number(variantId),
          quantity: 1,
          price: unitPriceCents,
          line_price: unitPriceCents,
          final_line_price: unitPriceCents,
          original_line_price: unitPriceCents,
          product_title: productMeta.title || "",
          title: productMeta.title || "",
          image: productMeta.image || "",
          variant_title: productMeta.variant_title || "",
          properties: {},
          line_level_discount_allocations: []
        };
        dispatchOptimistic(simulateAdd(snapshot, optimisticItem));
      }
      try {
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(variantId), quantity: 1 })
        });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        window.dispatchEvent(new CustomEvent("cartmax:internal-reload", { detail: { cart } }));
        window.dispatchEvent(new CustomEvent("cartmax:cart-changed", { detail: { cart } }));
        tracker.track(ANALYTICS_EVENTS.UPSELL_ADDED, {
          promotion_type: "upsell",
          variant_id: String(variantId),
          cart_total: cart.total_price,
          item_count: cart.item_count
        });
      } catch (err) {
        if (snapshot) dispatchOptimistic(snapshot);
        this._showUpsellError("Could not add \u2014 out of stock or unavailable.");
        console.error("[cartx] Upsell add error:", err);
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
      var isEmpty = !cart || !cart.items || cart.items.length === 0;
      if (isEmpty && upsells.show_on_empty_cart === false) return null;
      var cartVariantIds = (cart && cart.items || []).map(function(i2) {
        return String(i2.variant_id);
      });
      var filtered = products.filter(function(p2) {
        var vid = String(p2.variant_id);
        if (vid.startsWith("gid://")) vid = vid.split("/").pop();
        return cartVariantIds.indexOf(vid) === -1;
      });
      if (filtered.length === 0) return null;
      var curr = this._currency;
      var self = this;
      var u2 = this._upsells;
      var layoutClass = "cartmax-upsells--" + (u2.card_layout || "horizontal");
      var sizeClass = "cartmax-upsell-card--" + (u2.card_size || "medium");
      var headingText = u2.heading || upsells.heading || "YOU MAY ALSO LIKE";
      var btnText = u2.btn_text || "ADD TO CART";
      var imgPx = { small: 130, medium: 180, large: 230 }[u2.card_size] || 180;
      return /* @__PURE__ */ k("div", { class: "cartmax-upsells " + layoutClass }, /* @__PURE__ */ k("div", { class: "cartmax-upsells-heading" }, headingText), this.state.upsellError ? /* @__PURE__ */ k("div", { class: "cartmax-upsell-error" }, this.state.upsellError) : null, /* @__PURE__ */ k("div", { class: "cartmax-upsells-scroll" }, filtered.map(function(p2) {
        var vid = String(p2.variant_id);
        if (vid.startsWith("gid://")) vid = vid.split("/").pop();
        var isAdding = self.state.updating["upsell_" + vid];
        var productMeta = {
          title: p2.title,
          image: p2.image_url,
          price: p2.price
        };
        return /* @__PURE__ */ k("div", { class: "cartmax-upsell-card " + sizeClass, key: p2.product_id }, p2.image_url ? /* @__PURE__ */ k("img", { class: "cartmax-upsell-img", src: resizeImage(p2.image_url, imgPx), alt: p2.title, loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-upsell-img-placeholder" }, /* @__PURE__ */ k("span", { class: "visually-hidden" }, "No image")), /* @__PURE__ */ k("div", { class: "cartmax-upsell-info" }, /* @__PURE__ */ k("div", { class: "cartmax-upsell-title" }, p2.title), /* @__PURE__ */ k("div", { class: "cartmax-upsell-price" }, /* @__PURE__ */ k("span", { class: "cartmax-upsell-sale" }, formatMoney(Number(p2.price) * 100, curr)), u2.show_compare_price && p2.compare_at_price ? /* @__PURE__ */ k("span", { class: "cartmax-upsell-compare" }, formatMoney(Number(p2.compare_at_price) * 100, curr)) : null), /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-upsell-add",
            onClick: function() {
              self.handleUpsellAdd(vid, productMeta);
            },
            disabled: isAdding
          },
          isAdding ? "Adding..." : btnText
        )));
      })));
    }
    // ── Render: Footer (totals + checkout) ────────────────────
    renderFooter() {
      var cart = this.state.cart;
      var curr = this._currency;
      var hasDiscount = cart.total_discount > 0;
      var discounts = cart.cart_level_discount_applications || [];
      var savings = Number(this.state.savings) || 0;
      var savingsParts = savings > 0 && this._text.savings_label ? this._text.savings_label.split("{amount}") : null;
      return /* @__PURE__ */ k("div", { class: "cartmax-footer" }, savingsParts ? /* @__PURE__ */ k("div", { class: "cartmax-footer-savings" }, /* @__PURE__ */ k("span", { class: "cartmax-footer-savings-icon" }, /* @__PURE__ */ k(IconSparkle, null)), /* @__PURE__ */ k("span", null, savingsParts[0]), /* @__PURE__ */ k("span", { class: "cartmax-footer-savings-amount" }, formatMoney(savings, curr)), /* @__PURE__ */ k("span", null, savingsParts[1] || "")) : null, hasDiscount ? /* @__PURE__ */ k("div", { class: "cartmax-totals" }, /* @__PURE__ */ k("div", { class: "cartmax-totals-row" }, /* @__PURE__ */ k("span", null, this._text.subtotal_label), /* @__PURE__ */ k("span", null, formatMoney(cart.items_subtotal_price, curr))), discounts.length > 0 ? discounts.map((d2) => {
        var amt = d2.total_allocated_amount || d2.amount || 0;
        return /* @__PURE__ */ k("div", { class: "cartmax-totals-row cartmax-discount-row", key: d2.title }, /* @__PURE__ */ k("span", null, d2.title || "Discount"), /* @__PURE__ */ k("span", null, "\u2212" + formatMoney(amt, curr)));
      }) : cart.total_discount > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-totals-row cartmax-discount-row" }, /* @__PURE__ */ k("span", null, "Discounts"), /* @__PURE__ */ k("span", null, "\u2212" + formatMoney(cart.total_discount, curr))) : null) : null, /* @__PURE__ */ k("div", { class: "cartmax-footer-checkout" }, /* @__PURE__ */ k("div", { class: "cartmax-footer-total" }, /* @__PURE__ */ k("span", null, this._text.total_label), /* @__PURE__ */ k("span", null, formatMoney(cart.total_price, curr))), /* @__PURE__ */ k(
        "a",
        {
          class: "cartmax-checkout-btn" + (this.state.checkoutWaiting ? " cartmax-checkout-waiting" : ""),
          href: "/checkout",
          onClick: (e2) => {
            tracker.persistSessionCookie();
            var isProcessing = Object.keys(this.state.updating).length > 0;
            if (isProcessing || this.state.checkoutWaiting) {
              e2.preventDefault();
              if (this.state.checkoutWaiting) return;
              this.setState({ checkoutWaiting: true });
              waitForEvaluate().then(() => {
                this.setState({ checkoutWaiting: false });
                window.location.href = "/checkout";
              });
            }
          }
        },
        /* @__PURE__ */ k(IconLock, null),
        /* @__PURE__ */ k("span", null, this.state.checkoutWaiting ? "Preparing..." : this._text.checkout_button)
      )), /* @__PURE__ */ k("div", { class: "cartmax-footer-trust" }, /* @__PURE__ */ k(IconLock, null), /* @__PURE__ */ k("span", null, "Guaranteed safe & secure checkout")));
    }
    // ── Main render ───────────────────────────────────────────
    render(props, { visible, open, cart, loading }) {
      var liveRegion = /* @__PURE__ */ k(
        "div",
        {
          id: "cartmax-live-region",
          "aria-live": "polite",
          "aria-atomic": "true",
          style: { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }
        }
      );
      if (!visible) {
        return /* @__PURE__ */ k("div", { class: "cartmax-wrapper" }, liveRegion);
      }
      var isEmpty = !loading && cart && cart.items && cart.items.length === 0;
      var hasItems = !loading && cart && cart.items && cart.items.length > 0;
      var count = cart ? cart.item_count : 0;
      var overlayClass = "cartmax-overlay";
      if (open) overlayClass += " cartmax-open";
      if (this._layout.drawer_position === "left") overlayClass += " cartmax-pos-left";
      if (this._shape.button_style === "outline") overlayClass += " cartmax-btn-outline";
      if (this._layout.image_style === "square") overlayClass += " cartmax-img-square";
      else if (this._layout.image_style === "circle") overlayClass += " cartmax-img-circle";
      if (this._layout.qty_style === "minimal") overlayClass += " cartmax-qty-minimal";
      if (this._behavior.animation_style === "fade") overlayClass += " cartmax-anim-fade";
      else if (this._behavior.animation_style === "none") overlayClass += " cartmax-anim-none";
      var sec = this._sections;
      return /* @__PURE__ */ k("div", { class: "cartmax-wrapper" }, liveRegion, /* @__PURE__ */ k("div", { class: overlayClass, onClick: this.handleOverlayClick }, /* @__PURE__ */ k(
        "div",
        {
          class: "cartmax-drawer",
          ref: (el) => {
            this._drawerRef = el;
          },
          onClick: (e2) => e2.stopPropagation(),
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "Shopping cart"
        },
        this.renderAnnouncementBar(),
        /* @__PURE__ */ k("div", { class: "cartmax-header" }, /* @__PURE__ */ k("span", { class: "cartmax-title" }, this._text.cart_title, count > 0 ? /* @__PURE__ */ k("span", { class: "cartmax-header-count" }, count) : null), /* @__PURE__ */ k("button", { class: "cartmax-close", onClick: this.close, "aria-label": "Close cart" }, /* @__PURE__ */ k(IconClose, null))),
        this.state.unavailableGifts.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-gift-unavailable" }, "A gift product is currently unavailable") : null,
        hasItems && sec.show_progress_bar ? this.renderProgressBar() : null,
        /* @__PURE__ */ k("div", { class: "cartmax-body" }, hasItems && sec.show_claim_gifts ? this.renderClaimGifts() : null, hasItems && sec.show_offer_cards ? this.renderOfferDisplays() : null, loading ? this.renderLoading() : isEmpty ? this.renderEmpty() : hasItems ? this._displayItems().map((item) => this.renderLineItem(item)) : null, hasItems && sec.show_coupons ? this.renderCoupons() : null, sec.show_upsells ? this.renderUpsells() : null),
        hasItems && sec.show_ribbon ? this.renderRibbon() : null,
        hasItems ? this.renderFooter() : null
      )));
    }
  };

  // src/index.jsx
  function mount() {
    var root = document.getElementById("cartmax-root");
    if (root) R(k(CartDrawer), root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
