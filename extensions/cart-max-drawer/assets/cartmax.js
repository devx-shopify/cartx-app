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

  // src/CartDrawer.jsx
  var CLOSE_DELAY = 300;
  var DEBOUNCE_DELAY = 500;
  var REMOVE_ANIM_DELAY = 300;
  var PROCESSING_TIMEOUT = 1e4;
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
        unavailableGifts: []
      };
      this.close = this.close.bind(this);
      this.handleOverlayClick = this.handleOverlayClick.bind(this);
      this._closeTimer = null;
      this._focusCleanup = null;
      this._triggerElement = null;
      this._drawerRef = null;
      this._debounceTimers = {};
      this._processingTimeout = null;
      this._currency = window.Shopify && window.Shopify.currency && window.Shopify.currency.active || "USD";
    }
    componentDidMount() {
      window.addEventListener("cartmax:cart-changed", (e2) => {
        if (e2.detail && e2.detail.cart) {
          var cart = e2.detail.cart;
          this._currency = cart.currency || this._currency;
          this.setState({ cart, loading: false });
          updateCartCount(cart.item_count);
        } else {
          this.loadCart();
        }
        this.openDrawer();
      });
      window.addEventListener("cartmax:eval-result", (e2) => {
        if (e2.detail) this.setState({ evalResult: e2.detail });
      });
      window.addEventListener("cartmax:internal-reload", (e2) => {
        if (e2.detail && e2.detail.cart) {
          var newCart = e2.detail.cart;
          var newEval = e2.detail.evalResult || this.state.evalResult;
          this._currency = newCart.currency || this._currency;
          var oldItems = this.state.cart && this.state.cart.items || [];
          var newKeys = {};
          (newCart.items || []).forEach(function(item) {
            newKeys[item.key] = true;
          });
          var removing = {};
          oldItems.forEach(function(item) {
            if (!newKeys[item.key]) {
              removing[item.key] = true;
            }
          });
          if (Object.keys(removing).length > 0) {
            this.setState({ removing, updating: {}, pendingQty: {}, loading: false, evalResult: newEval });
            setTimeout(() => {
              this.setState({ cart: newCart, removing: {} });
              updateCartCount(newCart.item_count);
            }, 300);
          } else {
            this.setState({
              cart: newCart,
              evalResult: newEval,
              loading: false,
              updating: {},
              removing: {},
              pendingQty: {}
            });
            updateCartCount(newCart.item_count);
          }
          this.announce("Cart updated");
          this._clearProcessingTimeout();
        }
      });
      window.addEventListener("cartmax:gift-unavailable", (e2) => {
        var variants = e2.detail && e2.detail.variants || [];
        this.setState({ unavailableGifts: variants });
      });
      window.__cartmaxReady = true;
      if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
        this.loadCart();
        this.openDrawer();
        window.__cartmaxQueue = [];
      }
      document.addEventListener("click", (e2) => {
        var link = e2.target.closest('a[href="/cart"], a[href="/cart/"], [data-cart-icon], #cart-icon-bubble');
        if (link) {
          e2.preventDefault();
          e2.stopPropagation();
          this._triggerElement = link;
          this.loadCart();
          this.openDrawer();
        }
      }, true);
      document.addEventListener("keydown", (e2) => {
        if (e2.key === "Escape" && this.state.open) this.close();
      });
    }
    // ── Cart data ─────────────────────────────────────────────
    async loadCart() {
      if (!this.state.cart) {
        this.setState({ loading: true });
      }
      try {
        var cart = await fetchCart();
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
    }
    handleOverlayClick() {
      this.close();
    }
    // ── Processing safety timeout ──────────────────────────────
    _startProcessingTimeout() {
      this._clearProcessingTimeout();
      this._processingTimeout = setTimeout(() => {
        console.warn("[CartMax] Processing timeout \u2014 forcing recovery");
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
    // ── Remove item (with animation delay) ────────────────────
    handleRemove(key) {
      if (this._debounceTimers[key]) {
        clearTimeout(this._debounceTimers[key]);
        delete this._debounceTimers[key];
      }
      var removing = Object.assign({}, this.state.removing);
      removing[key] = true;
      this.setState({ removing });
      setTimeout(() => {
        var updating = Object.assign({}, this.state.updating);
        updating[key] = true;
        this.setState({ updating });
        this._startProcessingTimeout();
        window.dispatchEvent(new CustomEvent("cartmax:cart-action", {
          detail: { cart: this.state.cart, action: { key, qty: 0 } }
        }));
        this.announce("Removing item...");
      }, REMOVE_ANIM_DELAY);
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
      return /* @__PURE__ */ k("div", { id: "cartmax-progress", className: "cartmax-progress" }, /* @__PURE__ */ k("div", { className: "cartmax-progress-track" }, /* @__PURE__ */ k("div", { className: "cartmax-progress-fill", style: { width: pct + "%" } }, /* @__PURE__ */ k("span", { className: "visually-hidden" }, "Progress fill")), tiers.map((tier, i2) => {
        var pos = (i2 + 1) / n2 * 100;
        var cls = "cartmax-milestone";
        if (tier.state === "active") cls += " cartmax-milestone--active";
        else if (tier.state === "next") cls += " cartmax-milestone--next";
        return /* @__PURE__ */ k("div", { class: cls, style: { left: pos + "%" }, key: i2 }, /* @__PURE__ */ k("div", { class: "cartmax-milestone-dot" }), /* @__PURE__ */ k("div", { class: "cartmax-milestone-label" }, (tier.label || "").split("\n+ ")[0]));
      })), bar.top_message ? /* @__PURE__ */ k("div", { class: "cartmax-progress-msg" }, bar.top_message) : null);
    }
    // ── Render: Ribbon ────────────────────────────────────────
    renderRibbon() {
      var result = this.state.evalResult;
      if (!result || !result.ribbon_message) return null;
      return /* @__PURE__ */ k("div", { id: "cartmax-ribbon", class: "cartmax-ribbon" }, result.ribbon_message);
    }
    // ── Render: Line Item ─────────────────────────────────────
    renderLineItem(item) {
      var isUpdating = this.state.updating[item.key];
      var isRemoving = this.state.removing[item.key];
      var displayQty = this.getDisplayQty(item);
      var isPending = this.state.pendingQty.hasOwnProperty(item.key);
      var curr = this._currency;
      var isFreebie = item.properties && item.properties["_freebie"] === "true" && item.properties["_claimed"] !== "true";
      var isClaimed = item.properties && item.properties["_claimed"] === "true";
      var cls = "cartmax-line-item" + (isRemoving ? " cartmax-line-removing" : "") + (isFreebie ? " cartmax-line-freebie" : "");
      return /* @__PURE__ */ k("div", { class: cls, key: item.key }, /* @__PURE__ */ k("div", { class: "cartmax-line-image" }, item.image ? /* @__PURE__ */ k("img", { src: resizeImage(item.image, 128), alt: item.title, width: "64", height: "64", loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-line-image-placeholder" })), /* @__PURE__ */ k("div", { class: "cartmax-line-details" }, /* @__PURE__ */ k("div", { class: "cartmax-line-title" }, item.product_title), item.variant_title ? /* @__PURE__ */ k("div", { class: "cartmax-line-variant" }, item.variant_title) : null, /* @__PURE__ */ k("div", { class: "cartmax-line-price" }, isFreebie ? /* @__PURE__ */ k("span", { class: "cartmax-line-price-free" }, "FREE") : [
        item.original_line_price !== item.final_line_price ? /* @__PURE__ */ k("span", { class: "cartmax-line-price-original" }, formatMoney(item.original_line_price, curr)) : null,
        /* @__PURE__ */ k("span", null, formatMoney(item.final_line_price, curr))
      ]), !isClaimed && item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-line-discounts" }, item.line_level_discount_allocations.map((d2) => /* @__PURE__ */ k("span", { class: "cartmax-line-discount-tag", key: d2.discount_application.title }, d2.discount_application.title))) : null, !isFreebie ? /* @__PURE__ */ k("div", { class: "cartmax-line-actions" }, /* @__PURE__ */ k("div", { class: "cartmax-qty-controls" }, /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-qty-btn",
          onClick: () => this.queueQuantityChange(item.key, displayQty - 1),
          disabled: isUpdating || displayQty <= 1,
          "aria-label": "Decrease quantity"
        },
        "\u2212"
      ), /* @__PURE__ */ k("span", { class: "cartmax-qty-value" + (isPending ? " cartmax-qty-pending" : "") }, displayQty), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-qty-btn",
          onClick: () => this.queueQuantityChange(item.key, displayQty + 1),
          disabled: isUpdating,
          "aria-label": "Increase quantity"
        },
        "+"
      )), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-remove-btn",
          onClick: () => this.handleRemove(item.key),
          disabled: isUpdating || isRemoving,
          "aria-label": "Remove " + item.product_title
        },
        "Remove"
      )) : null));
    }
    // ── Render: Loading skeleton ──────────────────────────────
    renderLoading() {
      return /* @__PURE__ */ k("div", { class: "cartmax-loading" }, /* @__PURE__ */ k("div", { class: "cartmax-skeleton" }), /* @__PURE__ */ k("div", { class: "cartmax-skeleton" }), /* @__PURE__ */ k("div", { class: "cartmax-skeleton" }));
    }
    // ── Render: Empty state ───────────────────────────────────
    renderEmpty() {
      return /* @__PURE__ */ k("div", { class: "cartmax-empty" }, /* @__PURE__ */ k("p", { class: "cartmax-empty-text" }, "Your cart is empty"), /* @__PURE__ */ k("button", { class: "cartmax-continue-btn", onClick: this.close }, "Continue shopping"));
    }
    // ── Claim Gifts ────────────────────────────────────────────
    async handleClaimAdd(variantId, claimId) {
      var key = "claim_" + variantId;
      var updating = Object.assign({}, this.state.updating);
      updating[key] = true;
      this.setState({ updating });
      try {
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: Number(variantId),
            quantity: 1,
            properties: { _freebie: "true", _claimed: "true", _offer_id: claimId }
          })
        });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        this.setState({ cart });
        updateCartCount(cart.item_count);
        window.dispatchEvent(new CustomEvent("cartmax:cart-ready", { detail: { cart } }));
      } catch (err) {
        console.error("[CartMax] Claim add error:", err);
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
      this.handleRemove(line.key);
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
          if (item.properties && item.properties["_claimed"] === "true") {
            cartClaimedCount++;
          }
        });
      }
      var limitReached = cartClaimedCount >= maxClaims;
      return /* @__PURE__ */ k("div", { class: "cartmax-claims" }, /* @__PURE__ */ k("div", { class: "cartmax-claims-heading" }, cg.section_heading), /* @__PURE__ */ k("div", { class: "cartmax-claims-scroll" }, gifts.map(function(g2) {
        var vid = String(g2.variant_id);
        if (vid.startsWith("gid://")) vid = vid.split("/").pop();
        var isClaiming = self.state.updating["claim_" + vid];
        var inCart = g2.in_cart || isInCart(vid);
        return /* @__PURE__ */ k("div", { class: "cartmax-claim-card" + (inCart ? " cartmax-claim-card--in-cart" : ""), key: vid }, g2.image ? /* @__PURE__ */ k("img", { class: "cartmax-claim-img", src: resizeImage(g2.image, 120), alt: g2.title, loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-claim-img-placeholder" }), /* @__PURE__ */ k("div", { class: "cartmax-claim-info" }, g2.title ? /* @__PURE__ */ k("div", { class: "cartmax-claim-title" }, g2.title) : null, inCart ? /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-claim-btn cartmax-claim-btn--remove",
            onClick: function() {
              self.handleClaimRemove(vid);
            }
          },
          "Remove"
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
        )));
      })));
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
      } catch (err) {
        this.setState({ couponLoading: false, couponError: "Failed to apply coupon" });
      }
    }
    async handleCouponRemove(codeToRemove) {
      this.setState({ couponLoading: true });
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
      var curr = this._currency;
      return /* @__PURE__ */ k("div", { class: "cartmax-coupons" }, /* @__PURE__ */ k("div", { class: "cartmax-coupon-input-row" }, /* @__PURE__ */ k(
        "input",
        {
          class: "cartmax-coupon-input",
          type: "text",
          placeholder: "Discount code",
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
          "\u2715"
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
        return /* @__PURE__ */ k("div", { class: "cartmax-coupon-card" + (c2.applied ? " cartmax-coupon-card--applied" : ""), key: c2.id }, /* @__PURE__ */ k("div", { class: "cartmax-coupon-card-header" }, /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-type" }, c2.type_label), !c2.is_automatic ? /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-code" }, c2.code) : /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-auto" }, "Automatic")), /* @__PURE__ */ k("div", { class: "cartmax-coupon-card-title" }, c2.title), c2.display_message ? /* @__PURE__ */ k("div", { class: "cartmax-coupon-card-msg" }, c2.display_message) : null, c2.applied ? /* @__PURE__ */ k("span", { class: "cartmax-coupon-card-applied" }, "Applied") : !c2.is_automatic ? /* @__PURE__ */ k(
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
    async handleUpsellAdd(variantId) {
      var key = "upsell_" + variantId;
      var updating = Object.assign({}, this.state.updating);
      updating[key] = true;
      this.setState({ updating });
      try {
        await internalFetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(variantId), quantity: 1 })
        });
        var cart = await fetchCart();
        this._currency = cart.currency || this._currency;
        this.setState({ cart });
        updateCartCount(cart.item_count);
        window.dispatchEvent(new CustomEvent("cartmax:cart-ready", { detail: { cart } }));
      } catch (err) {
        console.error("[CartMax] Upsell add error:", err);
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
      return /* @__PURE__ */ k("div", { class: "cartmax-upsells" }, /* @__PURE__ */ k("div", { class: "cartmax-upsells-heading" }, upsells.heading || "You may also like"), /* @__PURE__ */ k("div", { class: "cartmax-upsells-scroll" }, filtered.map(function(p2) {
        var vid = String(p2.variant_id);
        if (vid.startsWith("gid://")) vid = vid.split("/").pop();
        var isAdding = self.state.updating["upsell_" + vid];
        return /* @__PURE__ */ k("div", { class: "cartmax-upsell-card", key: p2.product_id }, p2.image_url ? /* @__PURE__ */ k("img", { class: "cartmax-upsell-img", src: resizeImage(p2.image_url, 120), alt: p2.title, loading: "lazy" }) : /* @__PURE__ */ k("div", { class: "cartmax-upsell-img-placeholder" }), /* @__PURE__ */ k("div", { class: "cartmax-upsell-info" }, /* @__PURE__ */ k("div", { class: "cartmax-upsell-title" }, p2.title), /* @__PURE__ */ k("div", { class: "cartmax-upsell-price" }, p2.compare_at_price ? /* @__PURE__ */ k("span", { class: "cartmax-upsell-compare" }, formatMoney(Number(p2.compare_at_price) * 100, curr)) : null, /* @__PURE__ */ k("span", null, formatMoney(Number(p2.price) * 100, curr))), /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-upsell-add",
            onClick: function() {
              self.handleUpsellAdd(vid);
            },
            disabled: isAdding
          },
          isAdding ? "Adding..." : "Add"
        )));
      })));
    }
    // ── Render: Footer (totals + checkout) ────────────────────
    renderFooter() {
      var cart = this.state.cart;
      var curr = this._currency;
      var hasDiscount = cart.total_discount > 0;
      return /* @__PURE__ */ k("div", { class: "cartmax-footer" }, /* @__PURE__ */ k("div", { class: "cartmax-totals" }, /* @__PURE__ */ k("div", { class: "cartmax-totals-row" }, /* @__PURE__ */ k("span", null, "Subtotal"), /* @__PURE__ */ k("span", null, formatMoney(cart.items_subtotal_price, curr))), cart.cart_level_discount_applications && cart.cart_level_discount_applications.length > 0 ? cart.cart_level_discount_applications.map((d2) => {
        var amt = d2.total_allocated_amount || d2.amount || 0;
        return /* @__PURE__ */ k("div", { class: "cartmax-totals-row cartmax-discount-row", key: d2.title }, /* @__PURE__ */ k("span", null, d2.title || "Discount"), /* @__PURE__ */ k("span", null, "\u2212" + formatMoney(amt, curr)));
      }) : null, hasDiscount ? /* @__PURE__ */ k("div", { class: "cartmax-totals-row cartmax-discount-row" }, /* @__PURE__ */ k("span", null, "Total Discount"), /* @__PURE__ */ k("span", null, "\u2212" + formatMoney(cart.total_discount, curr))) : null, /* @__PURE__ */ k("div", { class: "cartmax-totals-row cartmax-total-row" }, /* @__PURE__ */ k("span", null, "Total"), /* @__PURE__ */ k("span", null, formatMoney(cart.total_price, curr)))), /* @__PURE__ */ k("a", { class: "cartmax-checkout-btn", href: "/checkout" }, "Checkout"), /* @__PURE__ */ k("button", { class: "cartmax-continue-btn", onClick: this.close }, "Continue shopping"));
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
      var overlayClass = "cartmax-overlay" + (open ? " cartmax-open" : "");
      var isEmpty = !loading && cart && cart.items && cart.items.length === 0;
      var hasItems = !loading && cart && cart.items && cart.items.length > 0;
      var count = cart ? cart.item_count : 0;
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
        /* @__PURE__ */ k("div", { class: "cartmax-header" }, /* @__PURE__ */ k("span", { class: "cartmax-title" }, "Your Cart", count > 0 ? /* @__PURE__ */ k("span", { class: "cartmax-header-count" }, " (" + count + ")") : null), /* @__PURE__ */ k("button", { class: "cartmax-close", onClick: this.close, "aria-label": "Close cart" }, "\u2715")),
        this.state.unavailableGifts.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-gift-unavailable" }, "A gift product is currently unavailable") : null,
        hasItems ? this.renderProgressBar() : null,
        hasItems ? this.renderClaimGifts() : null,
        loading ? this.renderLoading() : isEmpty ? this.renderEmpty() : hasItems ? /* @__PURE__ */ k("div", { class: "cartmax-body" }, cart.items.map((item) => this.renderLineItem(item))) : null,
        hasItems ? this.renderCoupons() : null,
        this.renderUpsells(),
        hasItems ? this.renderRibbon() : null,
        hasItems ? this.renderFooter() : null
      )));
    }
  };

  // src/evaluate.js
  var PROXY_URL = "/apps/cartmax/evaluate-cart";
  var _cachedConfig = null;
  var _configCacheTime = 0;
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
      console.error("[CartMax] evaluate-cart failed:", res.status, await res.text());
      return null;
    }
    var result = await res.json();
    if (result && result._config) {
      _cachedConfig = result._config;
      _configCacheTime = Date.now();
    }
    return result;
  }
  function normalizeVariantId(id) {
    if (typeof id === "string" && id.startsWith("gid://")) return id.split("/").pop();
    return id;
  }
  function simulateCart(cart, action) {
    if (!action || !cart || !cart.items) return cart;
    var items = [];
    for (var i2 = 0; i2 < cart.items.length; i2++) {
      var item = cart.items[i2];
      if (item.key === action.key) {
        if (action.qty > 0) {
          var unitPrice = item.quantity > 0 ? Math.round(item.price) : 0;
          var linePrice = unitPrice * action.qty;
          items.push(Object.assign({}, item, {
            quantity: action.qty,
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
    var itemCount = 0;
    for (var j2 = 0; j2 < items.length; j2++) {
      totalPrice += items[j2].final_line_price || 0;
      itemCount += items[j2].quantity || 0;
    }
    return Object.assign({}, cart, {
      items,
      total_price: totalPrice,
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
  async function applyResult(result, cart, pendingAction) {
    if (result.frozen) return null;
    var existingItems = cart.items || [];
    var updates = {};
    var hasUpdates = false;
    if (pendingAction) {
      updates[pendingAction.key] = pendingAction.qty;
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
        console.error("[CartMax] cartUpdateAll failed:", e2);
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
        console.error("[CartMax] gift add failed:", e2);
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
              console.warn("[CartMax] Gift variant unavailable:", addedVid);
            }
          }
        }
        clearAvailableGifts(freshCart.items);
        window.dispatchEvent(new CustomEvent("cartmax:gift-unavailable", {
          detail: { variants: _unavailableGifts.slice() }
        }));
        window.dispatchEvent(new CustomEvent("cartmax:internal-reload", {
          detail: { cart: freshCart, evalResult: _lastResult }
        }));
        return freshCart;
      } catch (e2) {
      }
    }
    return null;
  }
  var _lastResult = null;
  var _evaluating = false;
  var _pendingCart = null;
  var _pendingAction = null;
  async function runEvaluate(cart, action) {
    if (!cart) return;
    if (_evaluating) {
      _pendingCart = cart;
      _pendingAction = action || null;
      return;
    }
    var ctx = getContext();
    if (!ctx.shopId || !ctx.themeId) return;
    var evalCart = action ? simulateCart(cart, action) : cart;
    _evaluating = true;
    try {
      var result = await callEvaluate(evalCart);
      if (result) {
        _lastResult = result;
        var updatedCart = await applyResult(result, cart, action || null);
        if (!updatedCart) {
          window.dispatchEvent(new CustomEvent("cartmax:eval-result", { detail: result }));
        }
      }
    } catch (err) {
      console.error("[CartMax] Evaluate error:", err);
    } finally {
      _evaluating = false;
    }
    if (_pendingCart) {
      var nextCart = _pendingCart;
      var nextAction = _pendingAction;
      _pendingCart = null;
      _pendingAction = null;
      runEvaluate(nextCart, nextAction);
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
