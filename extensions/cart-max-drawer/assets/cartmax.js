(() => {
  // app/drawer-src/node_modules/preact/dist/preact.module.js
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

  // app/drawer-src/src/helpers.js
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
  var RADIUS_MAP = { none: "0", small: "6px", medium: "10px", large: "12px", pill: "999px" };
  var HEADING_SIZE_MAP = { small: "16px", medium: "18px", large: "20px" };
  var BODY_SIZE_MAP = { small: "12px", medium: "13px", large: "14px" };
  var IMG_SIZE_MAP = { small: "70px", medium: "90px", large: "110px" };
  var DENSITY_MAP = { compact: "8px", comfortable: "16px", spacious: "20px" };
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
      if (c2.secondary_accent) s2.setProperty("--cartmax-secondary-accent", c2.secondary_accent);
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

  // app/drawer-src/src/confetti.js
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

  // app/drawer-src/src/rules.js
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

  // app/drawer-src/src/storefront-cart.js
  var _sf = {
    shopDomain: "",
    // e.g. "devx-dev.myshopify.com"
    token: "",
    // public Unauthenticated Storefront access token
    apiVersion: "2026-01"
    // pinned by P0
  };
  var _readyResolvers = [];
  function setStorefrontConfig(cfg) {
    if (!cfg) return;
    if (cfg.shopDomain) _sf.shopDomain = cfg.shopDomain;
    if (cfg.token) _sf.token = cfg.token;
    if (cfg.apiVersion) _sf.apiVersion = cfg.apiVersion;
    if (isStorefrontReady() && _readyResolvers.length) {
      var rs = _readyResolvers;
      _readyResolvers = [];
      rs.forEach(function(r2) {
        r2(true);
      });
    }
  }
  function isStorefrontReady() {
    return !!(_sf.shopDomain && _sf.token);
  }
  function whenStorefrontReady(timeoutMs) {
    if (isStorefrontReady()) return Promise.resolve(true);
    return new Promise(function(resolve) {
      _readyResolvers.push(resolve);
      if (timeoutMs) setTimeout(function() {
        resolve(isStorefrontReady());
      }, timeoutMs);
    });
  }
  function isGraphqlCartEnabled() {
    try {
      if (typeof window !== "undefined" && window.__cartxGraphqlCart === true) return true;
      if (typeof localStorage !== "undefined" && localStorage.getItem("cartx:graphqlCart") === "1") return true;
    } catch (_2) {
    }
    return false;
  }
  function endpoint() {
    return "https://" + _sf.shopDomain + "/api/" + _sf.apiVersion + "/graphql.json";
  }
  async function sfFetch(query, variables) {
    if (!isStorefrontReady()) {
      throw new Error("[cartx] storefront cart not configured (token/shop missing)");
    }
    var res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": _sf.token
      },
      body: JSON.stringify({ query, variables: variables || {} })
    });
    var json = await res.json();
    if (json.errors && json.errors.length) {
      throw new Error("[cartx] storefront GraphQL error: " + JSON.stringify(json.errors));
    }
    return json.data;
  }
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
  function unwrap(data, opName) {
    var payload = data && data[opName];
    if (!payload) return { cart: null, userErrors: [] };
    return { cart: payload.cart || null, userErrors: payload.userErrors || [] };
  }
  async function cartCreate(lines, attributes) {
    var data = await sfFetch(M_CART_CREATE, { lines: lines || [], attributes: attributes || [] });
    return unwrap(data, "cartCreate");
  }
  async function getCart(cartId) {
    var data = await sfFetch(Q_GET_CART, { cartId });
    return data && data.cart || null;
  }
  async function cartLinesAdd(cartId, lines) {
    var data = await sfFetch(M_LINES_ADD, { cartId, lines });
    return unwrap(data, "cartLinesAdd");
  }
  async function cartLinesUpdate(cartId, lines) {
    var data = await sfFetch(M_LINES_UPDATE, { cartId, lines });
    return unwrap(data, "cartLinesUpdate");
  }
  async function cartLinesRemove(cartId, lineIds) {
    var data = await sfFetch(M_LINES_REMOVE, { cartId, lineIds });
    return unwrap(data, "cartLinesRemove");
  }
  async function cartDiscountCodesUpdate(cartId, discountCodes) {
    var data = await sfFetch(M_DISCOUNT_CODES, { cartId, discountCodes: discountCodes || [] });
    return unwrap(data, "cartDiscountCodesUpdate");
  }
  function cartIdKey() {
    return "cartx:cartId:" + (_sf.shopDomain || "default");
  }
  function getStoredCartId() {
    try {
      return localStorage.getItem(cartIdKey()) || null;
    } catch (_2) {
      return null;
    }
  }
  function storeCartId(id) {
    try {
      if (id) localStorage.setItem(cartIdKey(), id);
    } catch (_2) {
    }
  }
  function clearStoredCartId() {
    try {
      localStorage.removeItem(cartIdKey());
    } catch (_2) {
    }
  }
  async function getOrCreateCart() {
    var id = getStoredCartId();
    if (id) {
      var existing = await getCart(id);
      if (existing) return existing;
      clearStoredCartId();
    }
    var created = await cartCreate([], []);
    if (created.cart) storeCartId(created.cart.id);
    return created.cart;
  }
  function numericId(gid) {
    if (gid == null) return null;
    var s2 = String(gid);
    var m2 = s2.match(/(\d+)(?:\?|$)/);
    return m2 ? Number(m2[1]) : null;
  }
  function toCents(amount) {
    if (amount == null) return 0;
    return Math.round(parseFloat(amount) * 100);
  }
  function attrsToProperties(attrs) {
    var props = {};
    (attrs || []).forEach(function(a2) {
      if (a2 && a2.key != null) props[a2.key] = a2.value;
    });
    return props;
  }
  function mapLine(node) {
    var m2 = node.merchandise || {};
    var product = m2.product || {};
    var unit = toCents(m2.price && m2.price.amount);
    var qty = node.quantity || 0;
    var lineTotal = node.cost && node.cost.totalAmount ? toCents(node.cost.totalAmount.amount) : unit * qty;
    var compareUnit = m2.compareAtPrice ? toCents(m2.compareAtPrice.amount) : node.cost && node.cost.compareAtAmountPerQuantity ? toCents(node.cost.compareAtAmountPerQuantity.amount) : 0;
    var originalLine = compareUnit ? compareUnit * qty : unit * qty;
    var lineDiscount = Math.max(0, originalLine - lineTotal);
    var img = m2.image && m2.image.url || product.featuredImage && product.featuredImage.url || null;
    return {
      // identity — the drawer keys lines by `key`; we use the GraphQL line id.
      key: node.id,
      id: numericId(m2.id),
      variant_id: numericId(m2.id),
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
      title: product.title ? m2.title && m2.title !== "Default Title" ? product.title + " - " + m2.title : product.title : m2.title || "",
      product_title: product.title || "",
      variant_title: m2.title && m2.title !== "Default Title" ? m2.title : null,
      variant_options: (m2.selectedOptions || []).map(function(o2) {
        return o2.value;
      }),
      options_with_values: (m2.selectedOptions || []).map(function(o2) {
        return { name: o2.name, value: o2.value };
      }),
      sku: m2.sku || null,
      vendor: product.vendor || null,
      product_type: product.productType || "",
      handle: product.handle || "",
      image: img,
      featured_image: img ? { url: img, alt: m2.image && m2.image.altText || null } : null,
      url: product.handle ? "/products/" + product.handle + "?variant=" + numericId(m2.id) : null,
      available: m2.availableForSale !== false,
      // per-line discount allocations → the drawer's expected shape
      line_level_discount_allocations: (node.discountAllocations || []).map(function(d2) {
        return {
          amount: toCents(d2.discountedAmount && d2.discountedAmount.amount),
          discount_application: { title: d2.title || d2.code || "Discount" }
        };
      }),
      line_level_total_discount: lineDiscount,
      _gql_line_id: node.id
      // keep the raw GraphQL line id for mutations
    };
  }
  function mapCart(gqlCart) {
    if (!gqlCart) return null;
    var edges = gqlCart.lines && gqlCart.lines.edges || [];
    var items = edges.map(function(e2) {
      return mapLine(e2.node);
    });
    var subtotal = gqlCart.cost && gqlCart.cost.subtotalAmount ? toCents(gqlCart.cost.subtotalAmount.amount) : 0;
    var total = gqlCart.cost && gqlCart.cost.totalAmount ? toCents(gqlCart.cost.totalAmount.amount) : subtotal;
    var originalTotal = items.reduce(function(s2, it) {
      return s2 + (it.original_line_price || 0);
    }, 0);
    var currency = gqlCart.cost && gqlCart.cost.totalAmount && gqlCart.cost.totalAmount.currencyCode || "";
    var itemCount = gqlCart.totalQuantity != null ? gqlCart.totalQuantity : items.reduce(function(s2, it) {
      return s2 + (it.quantity || 0);
    }, 0);
    return {
      token: gqlCart.id,
      note: gqlCart.note || "",
      attributes: attrsToProperties(gqlCart.attributes),
      item_count: itemCount,
      items,
      total_price: total,
      original_total_price: originalTotal,
      total_discount: Math.max(0, originalTotal - total),
      items_subtotal_price: subtotal,
      currency,
      cart_level_discount_applications: [],
      discount_codes: (gqlCart.discountCodes || []).map(function(d2) {
        return { code: d2.code, applicable: d2.applicable };
      }),
      requires_shipping: true,
      // GraphQL-only extras the drawer/checkout can use
      checkout_url: gqlCart.checkoutUrl || null,
      _gql_cart_id: gqlCart.id
    };
  }

  // app/drawer-src/src/evaluate.js
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
      if (result._config.storefront_token) {
        setStorefrontConfig({
          shopDomain: ctx.shopId,
          token: result._config.storefront_token,
          apiVersion: result._config.storefront_api_version
        });
      }
    }
    return result;
  }
  var _cartxAttrEnsured = false;
  function configHasVolumeOffer(cfg) {
    if (!cfg || !cfg.offers) return false;
    for (var i2 = 0; i2 < cfg.offers.length; i2++) {
      var o2 = cfg.offers[i2];
      if (o2.reward && o2.reward.type === "volume_discount") return true;
    }
    return false;
  }
  async function ensureCartxAttribute(cart) {
    if (_cartxAttrEnsured) return;
    if (!configHasVolumeOffer(_cachedConfig)) return;
    var attrs = cart && cart.attributes || {};
    if (attrs._cartx === "on") {
      _cartxAttrEnsured = true;
      return;
    }
    try {
      await cartUpdateAll({ attributes: { _cartx: "on" } });
      _cartxAttrEnsured = true;
    } catch (e2) {
      console.error("[cartx] failed to set _cartx cart attribute:", e2);
    }
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
    var incoming = Array.isArray(action) ? action.slice() : action ? [action] : [];
    if (_evaluating) {
      _pendingCart = cart;
      for (var qi = 0; qi < incoming.length; qi++) _pendingActions.push(incoming[qi]);
      return;
    }
    var actions = incoming;
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
        await ensureCartxAttribute(updatedCart || cart);
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
        await ensureCartxAttribute(updatedCart || cart);
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
    runEvaluate(detail.cart, detail.actions || detail.action);
  });
  window.addEventListener("cartmax:cart-changed", function(e2) {
    runEvaluate(e2.detail && e2.detail.cart);
  });
  fetchCart().then(function(cart) {
    return runEvaluate(cart);
  }).catch(function() {
  });

  // app/drawer-src/src/cart-optimistic.js
  function propsSignature(properties) {
    var p2 = properties || {};
    var keys = Object.keys(p2).sort();
    var parts = [];
    for (var i2 = 0; i2 < keys.length; i2++) parts.push(keys[i2] + "=" + p2[keys[i2]]);
    return parts.join("&");
  }
  function lineSignature(item) {
    return String(item.variant_id) + "|" + propsSignature(item.properties);
  }
  function variantGid(variantId) {
    var s2 = String(variantId);
    return s2.indexOf("gid://") === 0 ? s2 : "gid://shopify/ProductVariant/" + s2;
  }
  function attributesFromProps(properties) {
    var p2 = properties || {};
    return Object.keys(p2).map(function(k2) {
      return { key: k2, value: String(p2[k2]) };
    });
  }
  function recalcTotals(cart) {
    var items = cart.items || [];
    var total = 0, original = 0, count = 0;
    for (var i2 = 0; i2 < items.length; i2++) {
      var it = items[i2];
      total += it.final_line_price || 0;
      original += it.original_line_price || it.line_price || 0;
      count += it.quantity || 0;
    }
    return Object.assign({}, cart, {
      items,
      item_count: count,
      total_price: total,
      original_total_price: original,
      total_discount: Math.max(0, original - total),
      items_subtotal_price: total
    });
  }
  var _tempSeq = 0;
  function createOptimisticItem(variantId, quantity, properties, meta) {
    meta = meta || {};
    var unit = meta.price || 0;
    var qty = quantity || 1;
    var line = unit * qty;
    _tempSeq += 1;
    return {
      key: "pending_" + variantId + "_" + _tempSeq,
      id: Number(variantId),
      variant_id: Number(variantId),
      product_id: meta.product_id != null ? Number(meta.product_id) : null,
      quantity: qty,
      properties: properties || {},
      price: unit,
      original_price: meta.compare_at || unit,
      final_price: unit,
      line_price: line,
      original_line_price: (meta.compare_at || unit) * qty,
      final_line_price: line,
      total_discount: 0,
      discounts: [],
      title: meta.title || "",
      product_title: meta.product_title || meta.title || "",
      variant_title: meta.variant_title || null,
      image: meta.image || null,
      featured_image: meta.image ? { url: meta.image } : null,
      handle: meta.handle || "",
      url: meta.handle ? "/products/" + meta.handle + "?variant=" + variantId : null,
      available: true,
      line_level_discount_allocations: [],
      _optimistic: true
    };
  }
  function addItemToLocalCart(cart, newItem) {
    var items = (cart.items || []).slice();
    var sig = lineSignature(newItem);
    var idx = -1;
    for (var i2 = 0; i2 < items.length; i2++) {
      if (lineSignature(items[i2]) === sig) {
        idx = i2;
        break;
      }
    }
    if (idx === -1) {
      items.unshift(newItem);
    } else {
      var ex = items[idx];
      var qty = (ex.quantity || 0) + (newItem.quantity || 1);
      items[idx] = Object.assign({}, ex, {
        quantity: qty,
        line_price: (ex.price || 0) * qty,
        final_line_price: (ex.price || 0) * qty,
        original_line_price: (ex.original_price || ex.price || 0) * qty
      });
    }
    return recalcTotals(Object.assign({}, cart, { items }));
  }
  function setLineQuantity(cart, key, quantity) {
    var items = [];
    (cart.items || []).forEach(function(it) {
      if (it.key !== key) {
        items.push(it);
        return;
      }
      if (quantity <= 0) return;
      items.push(Object.assign({}, it, {
        quantity,
        line_price: (it.price || 0) * quantity,
        final_line_price: (it.price || 0) * quantity,
        original_line_price: (it.original_price || it.price || 0) * quantity
      }));
    });
    return recalcTotals(Object.assign({}, cart, { items }));
  }
  function getCartDifference(serverCart, localCart) {
    var serverItems = serverCart && serverCart.items || [];
    var localItems = localCart && localCart.items || [];
    var itemsToAdd = [];
    var itemsToUpdate = [];
    var lineIdsToRemove = [];
    var serverBySig = {};
    serverItems.forEach(function(it) {
      var sig = lineSignature(it);
      (serverBySig[sig] = serverBySig[sig] || []).push(it);
    });
    var localBySig = {};
    localItems.forEach(function(it) {
      var sig = lineSignature(it);
      if (!localBySig[sig]) localBySig[sig] = { qty: 0, sample: it };
      localBySig[sig].qty += it.quantity || 0;
    });
    Object.keys(localBySig).forEach(function(sig) {
      if (serverBySig[sig]) return;
      var entry = localBySig[sig];
      if (entry.qty > 0) {
        itemsToAdd.push({
          merchandiseId: variantGid(entry.sample.variant_id),
          quantity: entry.qty,
          attributes: attributesFromProps(entry.sample.properties)
        });
      }
    });
    Object.keys(serverBySig).forEach(function(sig) {
      var lines = serverBySig[sig];
      var serverQty = lines.reduce(function(s2, l3) {
        return s2 + (l3.quantity || 0);
      }, 0);
      var localQty = localBySig[sig] ? localBySig[sig].qty : 0;
      var diff = localQty - serverQty;
      if (diff === 0) return;
      if (diff > 0) {
        var first = lines[0];
        itemsToUpdate.push({ id: first._gql_line_id || first.key, quantity: (first.quantity || 0) + diff });
      } else {
        var remaining = -diff;
        for (var i2 = 0; i2 < lines.length && remaining > 0; i2++) {
          var l2 = lines[i2];
          var take = Math.min(l2.quantity || 0, remaining);
          remaining -= take;
          var nextQty = (l2.quantity || 0) - take;
          var lineId = l2._gql_line_id || l2.key;
          if (nextQty <= 0) lineIdsToRemove.push(lineId);
          else itemsToUpdate.push({ id: lineId, quantity: nextQty });
        }
      }
    });
    return { itemsToAdd, itemsToUpdate, lineIdsToRemove };
  }
  function getDiscountCodesUpdate(serverCart, localCart) {
    var s2 = (serverCart && serverCart.discount_codes || []).map(function(d2) {
      return d2.code;
    });
    var l2 = (localCart && localCart.discount_codes || []).map(function(d2) {
      return d2.code;
    });
    var add = l2.filter(function(c2) {
      return s2.indexOf(c2) === -1;
    });
    var remove = s2.filter(function(c2) {
      return l2.indexOf(c2) === -1;
    });
    if (!add.length && !remove.length) return null;
    return l2.slice();
  }

  // app/drawer-src/src/cart-store.js
  var _state = {
    cartId: null,
    serverCart: null,
    // canonical (/cart.js shape via mapCart)
    localCart: null,
    // optimistic overlay (/cart.js shape)
    loading: false,
    ready: false
  };
  var _subs = [];
  function subscribe(fn) {
    _subs.push(fn);
    return function unsubscribe() {
      var i2 = _subs.indexOf(fn);
      if (i2 !== -1) _subs.splice(i2, 1);
    };
  }
  function notify() {
    for (var i2 = 0; i2 < _subs.length; i2++) {
      try {
        _subs[i2](_state);
      } catch (e2) {
        console.error("[cartx] store subscriber error:", e2);
      }
    }
  }
  function getOptimisticCart() {
    return _state.localCart || _state.serverCart;
  }
  function snapTo(gqlCart) {
    var mapped = mapCart(gqlCart);
    _state.serverCart = mapped;
    _state.localCart = mapped;
    if (mapped && mapped._gql_cart_id) {
      _state.cartId = mapped._gql_cart_id;
      storeCartId(mapped._gql_cart_id);
    }
    notify();
  }
  function setLocalCart(localCart) {
    _state.localCart = localCart;
    notify();
    scheduleSync();
  }
  async function initStore(seedAjaxCart) {
    if (_state.ready) return _state;
    _state.loading = true;
    notify();
    try {
      var ok = await whenStorefrontReady(8e3);
      if (!ok) {
        _state.ready = true;
        _state.loading = false;
        notify();
        return _state;
      }
      var gqlCart = await getOrCreateCart();
      if (gqlCart && gqlCart.id) {
        _state.cartId = gqlCart.id;
        storeCartId(gqlCart.id);
      }
      var empty = !gqlCart || !(gqlCart.lines && gqlCart.lines.edges || []).length;
      var seedItems = seedAjaxCart && seedAjaxCart.items || [];
      if (empty && seedItems.length && _state.cartId) {
        var lines = seedItems.map(function(it) {
          return {
            merchandiseId: "gid://shopify/ProductVariant/" + it.variant_id,
            quantity: it.quantity,
            attributes: Object.keys(it.properties || {}).map(function(k2) {
              return { key: k2, value: String(it.properties[k2]) };
            })
          };
        });
        var res = await cartLinesAdd(_state.cartId, lines);
        if (res.cart) gqlCart = res.cart;
      }
      if (gqlCart) snapTo(gqlCart);
    } catch (e2) {
      console.error("[cartx] initStore failed:", e2);
    } finally {
      _state.loading = false;
      _state.ready = true;
      notify();
    }
    return _state;
  }
  var _syncing = false;
  var _pendingResolve = null;
  function queueSync() {
    return new Promise(function(resolve) {
      if (!_syncing) {
        resolve();
        return;
      }
      _pendingResolve = resolve;
    });
  }
  function completeAndTriggerNext() {
    _syncing = false;
    if (_pendingResolve) {
      var next = _pendingResolve;
      _pendingResolve = null;
      next();
      return true;
    }
    return false;
  }
  async function scheduleSync() {
    await queueSync();
    await runSync();
  }
  async function runSync() {
    if (!_state.localCart) return;
    _syncing = true;
    _state.loading = true;
    notify();
    try {
      var cartId = _state.cartId;
      if (!cartId) {
        var created = await getOrCreateCart();
        if (!created) throw new Error("no cart");
        cartId = created.id;
        _state.cartId = cartId;
        snapTo(created);
      }
      var serverMapped = _state.serverCart;
      if (!serverMapped) {
        var fetched = await getCart(cartId);
        if (!fetched) {
          var recreated = await getOrCreateCart();
          fetched = recreated;
          cartId = recreated && recreated.id;
          _state.cartId = cartId;
        }
        serverMapped = mapCart(fetched);
      }
      var diff = getCartDifference(serverMapped, _state.localCart);
      var updatedGql = null;
      if (diff.lineIdsToRemove.length) {
        var r2 = await cartLinesRemove(cartId, diff.lineIdsToRemove);
        if (r2.cart) updatedGql = r2.cart;
      }
      if (diff.itemsToUpdate.length) {
        var u2 = await cartLinesUpdate(cartId, diff.itemsToUpdate);
        if (u2.cart) updatedGql = u2.cart;
      }
      if (diff.itemsToAdd.length) {
        var a2 = await cartLinesAdd(cartId, diff.itemsToAdd);
        if (a2.cart) updatedGql = a2.cart;
      }
      var codes = getDiscountCodesUpdate(updatedGql ? mapCart(updatedGql) : serverMapped, _state.localCart);
      if (codes) {
        var d2 = await cartDiscountCodesUpdate(cartId, codes);
        if (d2.cart) updatedGql = d2.cart;
      }
      var hasMore = completeAndTriggerNext();
      if (!hasMore) {
        if (updatedGql) snapTo(updatedGql);
        _state.loading = false;
        notify();
      }
    } catch (err) {
      console.error("[cartx] syncCart failed:", err);
      _state.loading = false;
      completeAndTriggerNext();
      notify();
    }
  }
  function addLine(variantId, quantity, properties, meta) {
    var base = _state.localCart || _state.serverCart || { items: [] };
    setLocalCart(addItemToLocalCart(base, createOptimisticItem(variantId, quantity, properties, meta)));
  }
  function changeQuantity(key, quantity) {
    var base = _state.localCart || _state.serverCart;
    if (!base) return;
    setLocalCart(setLineQuantity(base, key, quantity));
  }
  function removeLine(key) {
    changeQuantity(key, 0);
  }
  function applyDiscountCode(code) {
    var base = _state.localCart || _state.serverCart;
    if (!base) return;
    var codes = (base.discount_codes || []).slice();
    if (codes.some(function(d2) {
      return d2.code === code;
    })) return;
    codes.push({ code, applicable: true });
    setLocalCart(Object.assign({}, base, { discount_codes: codes }));
  }
  function removeDiscountCode(code) {
    var base = _state.localCart || _state.serverCart;
    if (!base) return;
    var codes = (base.discount_codes || []).filter(function(d2) {
      return d2.code !== code;
    });
    setLocalCart(Object.assign({}, base, { discount_codes: codes }));
  }

  // app/drawer-src/src/analytics-events.js
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

  // app/drawer-src/src/tracker.js
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

  // app/drawer-src/src/CartDrawer.jsx
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
  function IconDiscountBadge() {
    return /* @__PURE__ */ k("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ k("path", { d: "M7.99996 14.3334C7.75896 14.3334 7.52935 14.2883 7.31113 14.1982C7.09279 14.1081 6.89935 13.9779 6.73079 13.8077C6.39568 13.4769 6.10829 13.2605 5.86863 13.1584C5.62885 13.0562 5.26924 13.0052 4.78979 13.0052C4.29113 13.0052 3.86729 12.8307 3.51829 12.4817C3.16929 12.1327 2.99479 11.7089 2.99479 11.2102C2.99479 10.7351 2.94357 10.3764 2.84113 10.1342C2.73868 9.89196 2.5224 9.60363 2.19229 9.26919C2.02051 9.09741 1.88996 8.90258 1.80063 8.68469C1.71129 8.4668 1.66663 8.23902 1.66663 8.00135C1.66663 7.76369 1.71129 7.53547 1.80063 7.31669C1.88996 7.09791 2.02051 6.90263 2.19229 6.73085C2.5224 6.39874 2.73868 6.11246 2.84113 5.87202C2.94357 5.63147 2.99479 5.27074 2.99479 4.78985C2.99479 4.29119 3.16929 3.86735 3.51829 3.51835C3.86729 3.16935 4.29113 2.99485 4.78979 2.99485C5.2649 2.99485 5.62357 2.94363 5.86579 2.84119C6.10802 2.73874 6.39635 2.52246 6.73079 2.19235C6.89968 2.02213 7.0934 1.89196 7.31196 1.80185C7.53052 1.71174 7.75902 1.66669 7.99746 1.66669C8.2359 1.66669 8.46452 1.71135 8.68329 1.80069C8.90207 1.89002 9.09735 2.02058 9.26913 2.19235C9.60124 2.52246 9.88752 2.73874 10.128 2.84119C10.3685 2.94363 10.7292 2.99485 11.2101 2.99485C11.7088 2.99485 12.1326 3.16935 12.4816 3.51835C12.8306 3.86735 13.0051 4.29119 13.0051 4.78985C13.0051 5.26497 13.0563 5.62363 13.1588 5.86585C13.2612 6.10808 13.4775 6.39641 13.8076 6.73085C13.9794 6.90263 14.11 7.09746 14.1993 7.31535C14.2886 7.53324 14.3333 7.76102 14.3333 7.99869C14.3333 8.23635 14.2886 8.46458 14.1993 8.68335C14.11 8.90213 13.9794 9.09741 13.8076 9.26919C13.4768 9.6043 13.2604 9.89169 13.1583 10.1314C13.0562 10.3711 13.0051 10.7307 13.0051 11.2102C13.0051 11.7089 12.8306 12.1327 12.4816 12.4817C12.1326 12.8307 11.7088 13.0052 11.2101 13.0052C10.735 13.0052 10.3763 13.0564 10.1341 13.1589C9.8919 13.2613 9.60357 13.4776 9.26913 13.8077C9.10057 13.9779 8.90713 14.1081 8.68879 14.1982C8.47057 14.2883 8.24096 14.3334 7.99996 14.3334ZM8.00079 13.3334C8.10624 13.3334 8.20918 13.3118 8.30963 13.2687C8.41007 13.2255 8.49446 13.1697 8.56279 13.1014C8.98413 12.6757 9.38229 12.3866 9.75729 12.234C10.1322 12.0815 10.6165 12.0052 11.2101 12.0052C11.4353 12.0052 11.6242 11.929 11.7766 11.7767C11.929 11.6242 12.0051 11.4354 12.0051 11.2102C12.0051 10.6129 12.0814 10.1287 12.234 9.75769C12.3865 9.3868 12.6735 8.98852 13.0948 8.56285C13.2538 8.40385 13.3333 8.21624 13.3333 8.00002C13.3333 7.7838 13.256 7.5983 13.1013 7.44352C12.6756 7.01796 12.3865 6.61769 12.234 6.24269C12.0814 5.8678 12.0051 5.38352 12.0051 4.78985C12.0051 4.56463 11.929 4.3758 11.7766 4.22335C11.6242 4.07102 11.4353 3.99485 11.2101 3.99485C10.6066 3.99485 10.1201 3.91963 9.75063 3.76919C9.38118 3.61863 8.98313 3.33063 8.55646 2.90519C8.48802 2.83674 8.40357 2.77991 8.30313 2.73469C8.20268 2.68935 8.10163 2.66669 7.99996 2.66669C7.89829 2.66669 7.79618 2.68985 7.69363 2.73619C7.59096 2.78263 7.50546 2.83896 7.43713 2.90519C7.01579 3.32652 6.61763 3.61347 6.24263 3.76602C5.86774 3.91858 5.38346 3.99485 4.78979 3.99485C4.56457 3.99485 4.37574 4.07102 4.22329 4.22335C4.07096 4.3758 3.99479 4.56463 3.99479 4.78985C3.99479 5.39152 3.91852 5.8778 3.76596 6.24869C3.6134 6.61969 3.32429 7.01796 2.89863 7.44352C2.74396 7.5983 2.66663 7.7838 2.66663 8.00002C2.66663 8.21624 2.74396 8.40385 2.89863 8.56285C3.32429 8.98852 3.6134 9.38747 3.76596 9.75969C3.91852 10.1319 3.99479 10.6154 3.99479 11.2102C3.99479 11.4354 4.07096 11.6242 4.22329 11.7767C4.37574 11.929 4.56457 12.0052 4.78979 12.0052C5.3919 12.0052 5.87724 12.0815 6.24579 12.234C6.61435 12.3866 7.01357 12.6757 7.44346 13.1014C7.5119 13.1697 7.59552 13.2255 7.69429 13.2687C7.79318 13.3118 7.89535 13.3334 8.00079 13.3334ZM9.62296 10.4424C9.85296 10.4424 10.047 10.3633 10.2051 10.2052C10.3632 10.0471 10.4423 9.85302 10.4423 9.62302C10.4423 9.39291 10.3632 9.19735 10.2051 9.03635C10.047 8.87535 9.85296 8.79485 9.62296 8.79485C9.39285 8.79485 9.19729 8.87535 9.03629 9.03635C8.87529 9.19735 8.79479 9.39291 8.79479 9.62302C8.79479 9.85302 8.87529 10.0471 9.03629 10.2052C9.19729 10.3633 9.39285 10.4424 9.62296 10.4424ZM6.34479 10.3514L10.3513 6.35135L9.64863 5.64869L5.64863 9.65519L6.34479 10.3514ZM6.37696 7.20519C6.60707 7.20519 6.80263 7.12469 6.96363 6.96369C7.12463 6.80269 7.20513 6.60713 7.20513 6.37702C7.20513 6.14702 7.12463 5.95297 6.96363 5.79485C6.80263 5.63674 6.60707 5.55769 6.37696 5.55769C6.14696 5.55769 5.9529 5.63674 5.79479 5.79485C5.63668 5.95297 5.55763 6.14702 5.55763 6.37702C5.55763 6.60713 5.63668 6.80269 5.79479 6.96369C5.9529 7.12469 6.14696 7.20519 6.37696 7.20519Z", fill: "#2FC01A" }));
  }
  function IconCheck() {
    return /* @__PURE__ */ k("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("path", { d: "M20 6 9 17l-5-5" }));
  }
  function IconSparkle() {
    return /* @__PURE__ */ k("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "currentColor" }, /* @__PURE__ */ k("path", { d: "M12 2 13.5 8.5 20 10 13.5 11.5 12 18 10.5 11.5 4 10 10.5 8.5z" }), /* @__PURE__ */ k("path", { d: "M18 14 18.75 16.75 21.5 17.5 18.75 18.25 18 21 17.25 18.25 14.5 17.5 17.25 16.75z", opacity: "0.6" }));
  }
  function IconLock() {
    return /* @__PURE__ */ k("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, /* @__PURE__ */ k("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2" }), /* @__PURE__ */ k("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }));
  }
  function IconPaymentMethods() {
    return /* @__PURE__ */ k("svg", { width: "62", height: "24", viewBox: "0 0 62 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ k("rect", { x: "0.5", y: "0.5", width: "23", height: "23", rx: "11.5", fill: "white" }), /* @__PURE__ */ k("rect", { x: "0.5", y: "0.5", width: "23", height: "23", rx: "11.5", stroke: "#D8D9E0" }), /* @__PURE__ */ k("path", { d: "M18.286 7.99168C16.7707 7.11701 14.833 7.63668 13.9577 9.15201L11.75 12.9757C11.1113 14.0797 11.9337 14.4657 12.8503 15.0153L14.9743 16.2413C15.6937 16.6563 16.6123 16.41 17.027 15.6917L19.296 11.762C20.0587 10.4417 19.6063 8.75401 18.286 7.99168Z", fill: "#E64A19" }), /* @__PURE__ */ k("path", { d: "M15.7884 9.57436L13.6644 8.34836C12.492 7.69736 11.828 7.65436 11.3464 8.41969L8.21369 13.8447C7.33902 15.359 7.85969 17.2957 9.37402 18.1684C10.6944 18.9307 12.382 18.4784 13.1444 17.158L16.337 11.628C16.7537 10.909 16.5077 9.98936 15.7884 9.57436Z", fill: "#FBC02D" }), /* @__PURE__ */ k("path", { d: "M16.197 6.78532L14.705 5.92366C13.055 4.97133 10.945 5.53599 9.99265 7.18599L7.15232 12.1057C6.73265 12.8313 6.98199 13.7603 7.70765 14.179L9.37832 15.1437C10.2033 15.6203 11.258 15.3377 11.7347 14.5123L14.9797 8.89232C15.652 7.72832 17.14 7.32932 18.3043 8.00166L16.197 6.78532Z", fill: "#43A047" }), /* @__PURE__ */ k("path", { d: "M10.3963 8.59369L8.78367 7.66469C8.06434 7.25069 7.14567 7.49602 6.73101 8.21336L4.79634 11.5567C3.84401 13.202 4.40867 15.3074 6.05867 16.257L7.28634 16.964L8.77534 17.8217L9.42167 18.1934C8.27434 17.4254 7.91001 15.8867 8.61167 14.675L9.11267 13.8097L10.9473 10.6397C11.361 9.92469 11.1147 9.00769 10.3963 8.59369Z", fill: "#1E88E5" }), /* @__PURE__ */ k("rect", { x: "19.5", y: "0.5", width: "23", height: "23", rx: "11.5", fill: "white" }), /* @__PURE__ */ k("rect", { x: "19.5", y: "0.5", width: "23", height: "23", rx: "11.5", stroke: "#D8D9E0" }), /* @__PURE__ */ k("g", { "clip-path": "url(#cartmax-clip-phonepe)" }, /* @__PURE__ */ k("path", { d: "M37.9467 17.0556C37.9467 18.1297 37.0763 19 36.0022 19H25.8911C24.8174 19 23.9467 18.1297 23.9467 17.0556V6.94444C23.9467 5.87033 24.8174 5 25.8911 5H36.0022C37.0763 5 37.9467 5.87033 37.9467 6.94444V17.0556Z", fill: "#4527A0" }), /* @__PURE__ */ k("path", { d: "M34.1616 10.5109C34.1616 10.2461 33.9345 10.0194 33.67 10.0194H32.7624L30.6818 7.58883C30.4928 7.36171 30.1903 7.28627 29.8873 7.36171L29.1687 7.58883C29.0551 7.62655 29.0174 7.77783 29.0928 7.85366L31.3624 10.0571H27.9203C27.8068 10.0571 27.7313 10.1329 27.7313 10.2461V10.6245C27.7313 10.8893 27.9584 11.2102 28.2229 11.2102H28.9898V12.8843C28.9898 14.2462 29.6163 15.0403 30.8265 15.0403C31.2049 15.0403 31.3624 15.0026 31.7404 14.8513V16.0615C31.7404 16.4018 32.0052 16.6667 32.3455 16.6667H32.6512C32.7647 16.6667 32.8783 16.5531 32.8783 16.4395V11.2102H33.9718C34.0854 11.2102 34.1608 11.1343 34.1608 11.0212V10.5109H34.1616ZM31.7412 13.7162C31.514 13.8297 31.2115 13.8674 30.9848 13.8674C30.3797 13.8674 30.1693 13.5649 30.1693 12.8839V11.2098H31.7415V13.7162H31.7412Z", fill: "white" })), /* @__PURE__ */ k("rect", { x: "38.5", y: "0.5", width: "23", height: "23", rx: "11.5", fill: "white" }), /* @__PURE__ */ k("rect", { x: "38.5", y: "0.5", width: "23", height: "23", rx: "11.5", stroke: "#D8D9E0" }), /* @__PURE__ */ k("path", { d: "M61.0915 10.5647C60.8887 9.98508 60.3363 9.56885 59.6874 9.56885H59.6738C59.2519 9.56885 58.8718 9.74442 58.6012 10.0263C58.3301 9.74442 57.9499 9.56885 57.5285 9.56885H57.515C57.1441 9.56885 56.8052 9.70462 56.5449 9.92936V9.81512C56.536 9.70134 56.4423 9.61193 56.3267 9.61193H55.3313C55.2096 9.61193 55.1113 9.71025 55.1113 9.83244V15.2378C55.1113 15.36 55.2096 15.4583 55.3313 15.4583H56.3267C56.4376 15.4583 56.5289 15.3754 56.5435 15.2682L56.543 11.3878C56.5429 11.3748 56.5435 11.3618 56.5449 11.3489C56.5608 11.1757 56.6877 11.0334 56.8881 11.0156H57.0716C57.1554 11.0231 57.2261 11.0526 57.2818 11.097C57.3684 11.1659 57.4166 11.2717 57.4166 11.3878L57.4204 15.249C57.4204 15.3712 57.5191 15.47 57.6404 15.47H58.6358C58.7533 15.47 58.8488 15.3763 58.8544 15.2598L58.854 11.3826C58.8535 11.2553 58.9125 11.1401 59.016 11.0718C59.067 11.039 59.1283 11.017 59.199 11.0104H59.3826C59.5979 11.0291 59.7281 11.1925 59.7276 11.3826L59.7314 15.2387C59.7314 15.3609 59.8302 15.4592 59.9514 15.4592H60.9468C61.068 15.4592 61.1668 15.3609 61.1668 15.2387V11.0914C61.1668 10.8086 61.135 10.6883 61.0915 10.5647ZM54.353 9.62601H53.7837V8.70085C53.7837 8.58989 53.6938 8.5 53.5828 8.5C53.5697 8.5 53.5571 8.50186 53.5449 8.50421C52.9138 8.67744 53.0402 9.55157 51.888 9.62601H51.776C51.7592 9.62601 51.7433 9.62835 51.7278 9.63162C51.6295 9.65364 51.5555 9.74118 51.5555 9.84607V10.8414C51.5555 10.9627 51.6543 11.0615 51.776 11.0615H52.3767L52.3758 15.2823C52.3758 15.4026 52.4732 15.5 52.5935 15.5H53.5777C53.6975 15.5 53.7949 15.4026 53.7949 15.2823L53.7954 11.0615H54.353C54.4742 11.0615 54.573 10.9627 54.573 10.8414V9.84607C54.573 9.72481 54.4742 9.62601 54.353 9.62601Z", fill: "#00BAF2" }), /* @__PURE__ */ k("path", { d: "M50.7715 9.62646H49.7761C49.6549 9.62646 49.5566 9.72525 49.5566 9.8465V11.9047C49.5542 12.032 49.4512 12.1341 49.3234 12.1341H48.9067C48.7775 12.1341 48.6731 12.0302 48.6731 11.901L48.6693 9.84652C48.6693 9.72525 48.5705 9.62647 48.4493 9.62647H47.4539C47.3322 9.62647 47.2339 9.72525 47.2339 9.84652V12.1023C47.2339 12.9591 47.8449 13.5701 48.7021 13.5701C48.7021 13.5701 49.3454 13.5701 49.3651 13.5738C49.4812 13.5869 49.5715 13.6843 49.5715 13.8042C49.5715 13.9226 49.4831 14.0195 49.3683 14.0341C49.3627 14.035 49.3576 14.0364 49.3515 14.0373L47.8959 14.0425C47.7742 14.0425 47.6758 14.1413 47.6758 14.2625V15.2575C47.6758 15.3792 47.7742 15.4775 47.8959 15.4775H49.5233C50.381 15.4775 50.9916 14.867 50.9916 14.0097V9.84652C50.9916 9.72525 50.8932 9.62646 50.7715 9.62646ZM41.137 11.4503V12.0646C41.137 12.1933 41.0326 12.2982 40.9038 12.2982L40.2722 12.2987V11.0678H40.9038C41.0326 11.0678 41.137 11.1717 41.137 11.301V11.4503ZM41.2245 9.62622H39.0488C38.9295 9.62622 38.833 9.72314 38.833 9.84206V10.8173C38.833 10.8192 38.8335 10.8211 38.8335 10.8229C38.8335 10.8276 38.833 10.8323 38.833 10.8365V15.2507C38.833 15.3705 38.9229 15.4684 39.0343 15.4712H40.0484C40.1697 15.4712 40.2685 15.3729 40.2685 15.2511L40.2722 13.7384H41.2245C42.0214 13.7384 42.5767 13.1855 42.5767 12.3853V10.9812C42.5767 10.181 42.0214 9.62622 41.2245 9.62622ZM45.2669 13.7872V13.9426C45.2669 13.9553 45.2651 13.9674 45.2632 13.9791C45.2609 13.9901 45.2577 14.0009 45.2538 14.0114C45.2229 14.0985 45.1358 14.1617 45.0324 14.1617H44.618C44.4888 14.1617 44.3835 14.0634 44.3835 13.9426V13.7549C44.3835 13.7525 44.383 13.7502 44.383 13.7479L44.3835 13.2483V13.0919L44.3839 13.0905C44.3844 12.9702 44.4888 12.8728 44.618 12.8728H45.0324C45.1621 12.8728 45.2669 12.9706 45.2669 13.0919L45.2669 13.7872ZM45.1087 9.63194H43.7275C43.6053 9.63194 43.5066 9.72464 43.5066 9.83841V10.2256C43.5066 10.2279 43.507 10.2308 43.507 10.2331C43.507 10.2359 43.5065 10.2387 43.5065 10.2415V10.772C43.5065 10.8923 43.6114 10.9906 43.7407 10.9906H45.0558C45.1597 11.007 45.2421 11.0829 45.2538 11.2013V11.3296C45.2421 11.4425 45.1607 11.5248 45.0614 11.5342H44.4102C43.544 11.5342 42.9269 12.1096 42.9269 12.9177V14.0751C42.9269 14.8785 43.4574 15.4502 44.3175 15.4502H46.1223C46.4463 15.4502 46.709 15.2049 46.709 14.9029V11.1259C46.709 10.2102 46.2371 9.63194 45.1087 9.63194Z", fill: "#1F336B" }), /* @__PURE__ */ k("defs", null, /* @__PURE__ */ k("clipPath", { id: "cartmax-clip-phonepe" }, /* @__PURE__ */ k("rect", { x: "23.611", y: "5", width: "14.7778", height: "14", rx: "2", fill: "white" }))));
  }
  function IconChevronLeft() {
    return /* @__PURE__ */ k("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ k("path", { d: "M16.3335 20.1924L10.1411 14L16.3335 7.80762L17.1592 8.63333L11.7925 14L17.1592 19.3667L16.3335 20.1924Z", fill: "currentColor" }));
  }
  function IconChevronRight() {
    return /* @__PURE__ */ k("svg", { width: "28", height: "28", viewBox: "0 0 28 28", fill: "none", xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ k("path", { d: "M11.6665 20.1924L10.8408 19.3667L16.2075 14L10.8408 8.63333L11.6665 7.80762L17.8589 14L11.6665 20.1924Z", fill: "currentColor" }));
  }
  var CartDrawer = class extends C {
    constructor() {
      super();
      this.state = {
        visible: false,
        open: false,
        styled: false,
        // true once merchant styling is applied — gates reveal so the drawer never paints with default styling first
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
        variantLoading: {},
        // item.key -> bool, true while fetching product variants
        priceBreakupOpen: false
      };
      this.close = this.close.bind(this);
      this.handleOverlayClick = this.handleOverlayClick.bind(this);
      this._closeTimer = null;
      this._focusCleanup = null;
      this._triggerElement = null;
      this._drawerRef = null;
      this._debounceTimers = {};
      this._actionBuffer = {};
      this._actionFlushTimer = null;
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
        offer_cards_heading: "Pick your free gift",
        checkout_trust_message: "Guaranteed safe & secure checkout"
      };
      this._layout = { drawer_position: "right", image_style: "rounded", qty_style: "bordered", show_vendor: false, show_variant_switcher: true, show_remove_btn: true, show_payment_icons: true, show_compare_price: true };
      this._variantCache = {};
      this._compareAtCache = {};
      this._upsells = { card_layout: "horizontal", card_size: "medium", heading: "", btn_text: "ADD TO CART", show_compare_price: true };
      this._announcement = { text: "", type: "static" };
      this._progressBar = { track_thickness: "normal", milestone_icon_svg: "", completed_icon_svg: "" };
      this._shape = { button_style: "solid" };
      this._sections = { show_progress_bar: true, show_claim_gifts: true, show_offer_cards: true, show_coupons: true, show_upsells: true, show_ribbon: true };
      this._behavior = { auto_open_on_add: true, animation_style: "slide", close_on_overlay_click: true, close_on_esc: true };
    }
    componentDidMount() {
      this._graphqlCart = isGraphqlCartEnabled();
      var rootEl = document.getElementById("cartmax-root");
      this._lastKnownItemCount = rootEl ? parseInt(rootEl.dataset.initialItemCount || "0", 10) : 0;
      if (rootEl && rootEl.dataset.initialCart) {
        try {
          var initialCart = JSON.parse(rootEl.dataset.initialCart);
          if (initialCart && typeof initialCart.item_count === "number") {
            initialCart = this._stabiliseOrder(initialCart);
            this._currency = initialCart.currency || this._currency;
            this.state.cart = initialCart;
            this.state.loading = false;
            this._lastKnownItemCount = initialCart.item_count;
            this._deferPrefetchCompareAt(initialCart.items || []);
          }
        } catch (_2) {
        }
      }
      if (rootEl && rootEl.dataset.drawerConfig) {
        try {
          var inlineDrawer = JSON.parse(rootEl.dataset.drawerConfig);
          if (inlineDrawer && Object.keys(inlineDrawer).length) {
            this._maybeApplyDrawer(inlineDrawer);
          }
        } catch (_2) {
        }
      }
      this._applyCachedDrawerCfg();
      this._styleFallbackTimer = setTimeout(() => {
        if (!this.state.styled) this.setState({ styled: true });
      }, 5e3);
      this._onCartChanged = (e2) => {
        if (this._graphqlCart) return;
        if (e2.detail && e2.detail.cart) {
          var cart = this._stabiliseOrder(e2.detail.cart);
          this._currency = cart.currency || this._currency;
          this.setState({ cart, loading: false });
          updateCartCount(cart.item_count);
          this._deferPrefetchCompareAt(cart.items || []);
          if (this._behavior.auto_open_on_add && cart.item_count > this._lastKnownItemCount) {
            this.openDrawer();
          }
          this._lastKnownItemCount = cart.item_count;
        } else {
          this.loadCart();
          if (this._behavior.auto_open_on_add) this.openDrawer();
        }
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
        if (this._graphqlCart) return;
        if (e2.detail && e2.detail.cart) {
          var newCart = this._stabiliseOrder(e2.detail.cart);
          if (this._isTransientEmpty(newCart)) return;
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
        if (this._graphqlCart) return;
        if (e2.detail && e2.detail.cart) {
          var optimisticCart = this._stabiliseOrder(e2.detail.cart);
          if (this._isTransientEmpty(optimisticCart)) return;
          this._currency = optimisticCart.currency || this._currency;
          var keepPending = {};
          Object.keys(this._actionBuffer).forEach((k2) => {
            if (this.state.pendingQty.hasOwnProperty(k2)) keepPending[k2] = this.state.pendingQty[k2];
          });
          this.setState({ cart: optimisticCart, pendingQty: keepPending });
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
      if (this._graphqlCart) {
        this._unsubGql = subscribe(() => {
          var c2 = getOptimisticCart();
          if (c2) {
            this.setState({ cart: c2, loading: false });
            this._maybeRunGqlPromo(c2);
          }
        });
        initStore(this.state.cart).catch(() => {
        });
      }
      window.__cartmaxReady = true;
      if (window.__cartmaxQueue && window.__cartmaxQueue.length > 0) {
        var lastQueued = window.__cartmaxQueue[window.__cartmaxQueue.length - 1];
        var queuedCount = lastQueued.detail && lastQueued.detail.cart ? lastQueued.detail.cart.item_count : null;
        this.loadCart();
        if (queuedCount === null || queuedCount > this._lastKnownItemCount) {
          this.openDrawer();
        }
        window.__cartmaxQueue = [];
      } else if (window.__cartmaxOpenIntent) {
        window.__cartmaxOpenIntent = false;
        if (window.__cartmaxTrigger) this._triggerElement = window.__cartmaxTrigger;
        this.loadCart();
        this.openDrawer();
      } else if (this.state.cart) {
        this.loadCart();
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
          if (window.__cartmaxTrigger) self._triggerElement = window.__cartmaxTrigger;
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
      if (this._unsubGql) this._unsubGql();
      if (this._openRevealTimer) clearTimeout(this._openRevealTimer);
      if (this._gqlPromoTimer) clearTimeout(this._gqlPromoTimer);
      window.removeEventListener("cartmax:cart-changed", this._onCartChanged);
      window.removeEventListener("cartmax:eval-result", this._onEvalResult);
      window.removeEventListener("cartmax:internal-reload", this._onInternalReload);
      window.removeEventListener("cartmax:optimistic-update", this._onOptimisticUpdate);
      window.removeEventListener("cartmax:gift-unavailable", this._onGiftUnavailable);
      document.removeEventListener("mouseover", this._onDocMouseover);
      document.removeEventListener("keydown", this._onDocKeydown);
      if (this._horizonObserver) this._horizonObserver.disconnect();
      if (this._scrollLockObserver) this._scrollLockObserver.disconnect();
      if (this._promoObserver) this._promoObserver.disconnect();
      Object.values(this._debounceTimers).forEach(clearTimeout);
      if (this._actionFlushTimer) clearTimeout(this._actionFlushTimer);
      if (this._styleFallbackTimer) clearTimeout(this._styleFallbackTimer);
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
      this._cacheDrawerCfg(drawer);
      if (!this.state.styled) this.setState({ styled: true });
      var beh = drawer.behavior;
      if (beh && beh.confetti_lottie_url) setConfettiLottieUrl(beh.confetti_lottie_url);
    }
    // Cache the drawer config per shop so the next page load can style the drawer
    // on mount (before it opens), making repeat views flash-free without waiting
    // on the server round-trip.
    _drawerCfgKey() {
      var root = document.getElementById("cartmax-root");
      var shop = root && root.dataset.shopId || window.Shopify && window.Shopify.shop || "default";
      return "cartx:drawerCfg:" + shop;
    }
    _cacheDrawerCfg(drawer) {
      try {
        localStorage.setItem(this._drawerCfgKey(), JSON.stringify(drawer));
      } catch (_2) {
      }
    }
    _applyCachedDrawerCfg() {
      try {
        var raw = localStorage.getItem(this._drawerCfgKey());
        if (raw) this._maybeApplyDrawer(JSON.parse(raw));
      } catch (_2) {
      }
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
        show_compare_price: l2.show_compare_price !== false,
        empty_icon_url: l2.empty_icon_url || "",
        empty_icon_size: l2.empty_icon_size || "medium",
        empty_icon_color: l2.empty_icon_color || "",
        show_payment_icons: l2.show_payment_icons !== false
      };
      this._upsells = {
        card_layout: l2.upsells_card_layout || "horizontal",
        card_size: l2.upsells_card_size || "medium",
        heading: l2.upsells_heading || "",
        heading_position: l2.upsells_heading_position || "left",
        show_on_empty: l2.upsells_show_on_empty || "filled",
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
        allow_multiple_coupons: sec.allow_multiple_coupons === true,
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
        this._deferPrefetchCompareAt(cart.items || []);
      } catch (err) {
        this.setState({ loading: false });
      }
    }
    // Run compare-at prefetch off the first-paint path. These /products/{handle}.js
    // requests only feed strike-through prices, which are not needed for the
    // initial render, so we wait for the browser to be idle (or a short timeout)
    // before firing them. Keeps the cart-open critical path free of extra fetches.
    _deferPrefetchCompareAt(items) {
      if (!items || !items.length) return;
      var run = () => this._prefetchCompareAtPrices(items);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 2e3 });
      } else {
        setTimeout(run, 300);
      }
    }
    _prefetchCompareAtPrices(items) {
      var seen = {};
      items.forEach((item) => {
        if (!item.handle || seen[item.handle]) return;
        seen[item.handle] = true;
        var cached = this._variantCache[String(item.product_id)];
        if (cached && cached.length) {
          cached.forEach((v2) => {
            if (v2.compare_at_price) this._compareAtCache[String(v2.id)] = v2.compare_at_price;
          });
          return;
        }
        fetch("/products/" + item.handle + ".js").then((r2) => r2.json()).then((p2) => {
          if (!p2.variants) return;
          p2.variants.forEach((v2) => {
            if (v2.compare_at_price) this._compareAtCache[String(v2.id)] = v2.compare_at_price;
          });
          this.setState({});
        }).catch(() => {
        });
      });
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
      this._clearThemeScrollLock();
      if (!this.state.styled) {
        if (this._openRevealTimer) clearTimeout(this._openRevealTimer);
        this._openRevealTimer = setTimeout(() => {
          if (!this.state.styled) this.setState({ styled: true });
        }, 350);
      }
      this.announce("Cart opened");
      window.dispatchEvent(new CustomEvent("cartmax:drawer-opened"));
      this._openedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      var cart = this.state.cart;
      tracker.track(ANALYTICS_EVENTS.DRAWER_OPENED, {
        cart_total: cart ? cart.total_price : null,
        item_count: cart ? cart.item_count : null
      });
    }
    // Strip common theme scroll-lock classes the host theme may have added to
    // body/html when its (now-suppressed) cart drawer "opened". cartx owns the
    // cart, so when our drawer opens or closes the page must scroll normally.
    _clearThemeScrollLock() {
      var CLASSES = ["overflow-hidden", "no-scroll", "scroll-lock", "cart-drawer-open"];
      [document.body, document.documentElement].forEach(function(el) {
        if (!el) return;
        for (var i2 = 0; i2 < CLASSES.length; i2++) el.classList.remove(CLASSES[i2]);
      });
    }
    // ── GraphQL promo pipeline (Phase D: bar + gift auto-add) ──
    // The evaluate-cart proxy computes the bar/ribbon/coupons/gifts from whatever
    // cart we POST it. For the GraphQL path we feed it the mapped GraphQL cart,
    // render the bar via the existing `eval-result` event, and route its gift
    // to_add/to_remove through the STORE (not AJAX). Triggered only when the cart
    // item signature changes (so gift reconciliation converges, no eval loop) and
    // debounced so rapid edits collapse into one proxy call.
    _cartSignature(cart) {
      var items = cart && cart.items || [];
      return items.map(function(it) {
        return it.variant_id + ":" + (it.quantity || 0) + ":" + (it.properties ? it.properties._offer_id || "" : "");
      }).sort().join("|");
    }
    _maybeRunGqlPromo(cart) {
      var sig = this._cartSignature(cart);
      if (sig === this._lastPromoSig) return;
      this._lastPromoSig = sig;
      if (this._gqlPromoTimer) clearTimeout(this._gqlPromoTimer);
      this._gqlPromoTimer = setTimeout(() => this._runGqlPromo(), 250);
    }
    async _runGqlPromo() {
      var cart = getOptimisticCart();
      if (!cart) return;
      try {
        var result = await callEvaluate(cart);
        if (!result) return;
        window.dispatchEvent(new CustomEvent("cartmax:eval-result", {
          detail: Object.assign({}, result, { _server: true })
        }));
        this._reconcileGqlGifts(result, cart);
      } catch (err) {
        console.error("[cartx] gql promo eval failed:", err);
      }
    }
    // Add/remove automatic gift lines on the GraphQL cart to match the eval result.
    // Idempotent: only adds a gift not already present, only removes listed lines.
    // Each store mutation re-triggers eval; it converges once gifts are settled.
    _reconcileGqlGifts(result, cart) {
      (result.to_remove || []).forEach(function(key) {
        removeLine(key);
      });
      var items = cart && cart.items || [];
      (result.to_add || []).forEach(function(item) {
        var vid = String(normalizeVariantId(item.variant_id));
        var offerId = item.properties && item.properties._offer_id;
        var present = items.some(function(it) {
          return String(it.variant_id) === vid && it.properties && it.properties._offer_id === offerId;
        });
        if (!present) addLine(vid, item.quantity || 1, item.properties || {}, {});
      });
    }
    close() {
      if (this._focusCleanup) {
        this._focusCleanup();
        this._focusCleanup = null;
      }
      this.setState({ open: false });
      document.body.style.overflow = "";
      this._clearThemeScrollLock();
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
    // ── Quantity + remove mutations (debounced & coalesced) ───
    // Every line mutation (qty change or remove) funnels through one short
    // debounce buffer. A burst of clicks — several +'s, or deleting multiple
    // lines in a row — collapses into a SINGLE server reconcile / re-render
    // instead of one heavyweight round-trip per click (the cause of the qty
    // "freeze" and the delete "blink"). The UI reflects each click instantly
    // (pendingQty / tombstone fade), so the buffering is invisible to the
    // shopper; it only coalesces the expensive part.
    queueQuantityChange(key, qty) {
      if (this._graphqlCart) {
        if (qty <= 0) removeLine(key);
        else changeQuantity(key, qty);
        return;
      }
      var pendingQty = Object.assign({}, this.state.pendingQty);
      pendingQty[key] = qty;
      this.setState({ pendingQty });
      this._bufferAction(key, qty);
    }
    // Stage one line mutation and (re)arm the shared flush timer. Last write
    // per key wins (e.g. +,+,+ → final qty; a later remove → qty 0).
    _bufferAction(key, qty) {
      this._actionBuffer[key] = qty;
      if (this._actionFlushTimer) clearTimeout(this._actionFlushTimer);
      this._actionFlushTimer = setTimeout(() => this._flushActions(), DEBOUNCE_DELAY);
    }
    // Dispatch all buffered mutations as ONE cart-action → one server reconcile.
    _flushActions() {
      this._actionFlushTimer = null;
      var buffer = this._actionBuffer;
      this._actionBuffer = {};
      var keys = Object.keys(buffer);
      if (!keys.length) return;
      var actions = keys.map(function(k2) {
        return { key: k2, qty: buffer[k2] };
      });
      var updating = Object.assign({}, this.state.updating);
      keys.forEach(function(k2) {
        updating[k2] = true;
      });
      this.setState({ updating });
      this._startProcessingTimeout();
      window.dispatchEvent(new CustomEvent("cartmax:cart-action", {
        detail: { cart: this.state.cart, actions }
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
      var cart = this.state.cart;
      if (!cart || !cart.items) return;
      if (this._graphqlCart) {
        removeLine(key);
        return;
      }
      var line = cart.items.find(function(i2) {
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
      var stripped = this._stripLine(cart, key);
      this.setState({ removing, cart: stripped });
      updateCartCount(stripped.item_count);
      this._scheduleTombstoneDrop(key);
      this._bufferAction(key, 0);
      this.announce("Removing item...");
    }
    // Optimistic local removal: drop one line and recompute cart totals so the
    // footer stays right until the server reconcile lands. Mirrors the totals
    // math in evaluate.js simulateCart().
    _stripLine(cart, key) {
      var items = [];
      var total = 0, orig = 0, count = 0;
      for (var i2 = 0; i2 < cart.items.length; i2++) {
        var it = cart.items[i2];
        if (it.key === key) continue;
        items.push(it);
        total += it.final_line_price || 0;
        orig += it.original_line_price || it.line_price || 0;
        count += it.quantity || 0;
      }
      return Object.assign({}, cart, {
        items,
        total_price: total,
        original_total_price: orig,
        total_discount: Math.max(0, orig - total),
        item_count: count,
        items_subtotal_price: total
      });
    }
    // True while the shopper has edits that haven't reconciled yet: a debounce
    // window armed, actions buffered, or optimistic quantities on screen. Used to
    // suppress the empty-state and transient-empty carts mid-edit.
    _hasPendingEdits() {
      return this._actionFlushTimer != null || Object.keys(this._actionBuffer).length > 0 || Object.keys(this.state.pendingQty).length > 0;
    }
    // An incoming reconcile/optimistic cart that has 0 items while we still hold
    // a non-empty cart AND more edits are queued is a mid-flight artifact, not a
    // real emptying — applying it would flash the whole body blank.
    _isTransientEmpty(incoming) {
      var incomingEmpty = !incoming || !incoming.items || incoming.items.length === 0;
      if (!incomingEmpty) return false;
      var cur = this.state.cart;
      var haveItems = cur && cur.items && cur.items.length > 0;
      var moreComing = this._actionFlushTimer != null || Object.keys(this._actionBuffer).length > 0;
      return haveItems && moreComing;
    }
    // Hold a tombstoned line in the DOM for its collapse animation, then drop it.
    _scheduleTombstoneDrop(key) {
      if (this._tombstoneTimers[key]) return;
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
          return { id: v2.id, title: v2.title, available: v2.available, price: v2.price || 0, compare_at_price: v2.compare_at_price || 0, featured_image: v2.featured_image || null };
        });
        this._variantCache[productId] = variants;
        variants.forEach((v2) => {
          if (v2.compare_at_price) this._compareAtCache[String(v2.id)] = v2.compare_at_price;
        });
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
      var snapshot = this.state.cart;
      var cachedVariants = this._variantCache[String(item.product_id)] || [];
      var newVariant = cachedVariants.find((v2) => String(v2.id) === String(newVariantId));
      var pendingKey = "pending_varswitch_" + key + "_" + newVariantId;
      if (newVariant && snapshot) {
        var unitPrice = newVariant.price || 0;
        var optimisticItem = Object.assign({}, item, {
          key: pendingKey,
          variant_id: Number(newVariantId),
          variant_title: newVariant.title || item.variant_title,
          price: unitPrice,
          original_price: unitPrice,
          final_price: unitPrice,
          line_price: unitPrice * qty,
          final_line_price: unitPrice * qty,
          original_line_price: unitPrice * qty,
          image: newVariant.featured_image && newVariant.featured_image.src || item.image,
          line_level_discount_allocations: []
        });
        var optimisticItems = (snapshot.items || []).map(
          (it) => it.key === key ? optimisticItem : it
        );
        var totalPrice = 0;
        var itemCount = 0;
        optimisticItems.forEach(function(it) {
          totalPrice += it.final_line_price || 0;
          itemCount += it.quantity || 0;
        });
        var optimisticCart = Object.assign({}, snapshot, {
          items: optimisticItems,
          total_price: totalPrice,
          item_count: itemCount,
          items_subtotal_price: totalPrice
        });
        if (newVariant.compare_at_price) {
          this._compareAtCache[String(newVariantId)] = newVariant.compare_at_price;
        }
        this.setState({
          variantOpen: nextOpen,
          updating: Object.assign({}, this.state.updating, { [pendingKey]: true }),
          cart: optimisticCart,
          pendingQty: {}
        });
        updateCartCount(optimisticCart.item_count);
      } else {
        this.setState({
          variantOpen: nextOpen,
          updating: Object.assign({}, this.state.updating, { [key]: true })
        });
      }
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
        if (snapshot) {
          this.setState({ cart: snapshot, pendingQty: {} });
          updateCartCount(snapshot.item_count);
        }
        var usedKey = newVariant ? pendingKey : key;
        var newUpdating = Object.assign({}, this.state.updating);
        delete newUpdating[usedKey];
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
          disabled: isRemoving,
          "aria-label": "Remove " + item.product_title
        },
        /* @__PURE__ */ k(IconTrash, null)
      ) : null), /* @__PURE__ */ k("div", { class: "cartmax-line-price" }, isFreebie && item.final_line_price === 0 ? /* @__PURE__ */ k("span", { class: "cartmax-gift-badge" }, "FREE") : (() => {
        var compareAtUnit = this._layout.show_compare_price ? this._compareAtCache[String(item.variant_id)] : null;
        var compareAtLine = compareAtUnit ? compareAtUnit * item.quantity : 0;
        var strikethrough = compareAtLine > item.final_line_price ? compareAtLine : item.original_line_price > item.final_line_price ? item.original_line_price : 0;
        var savingsPct = strikethrough > 0 ? Math.round((strikethrough - item.final_line_price) / strikethrough * 100) : 0;
        return [
          /* @__PURE__ */ k("span", { key: "final" }, formatMoney(item.final_line_price, curr)),
          strikethrough > 0 ? /* @__PURE__ */ k("span", { key: "orig", class: "cartmax-line-price-original" }, formatMoney(strikethrough, curr)) : null,
          !isClaimed && savingsPct > 0 ? /* @__PURE__ */ k("span", { key: "savings", class: "cartmax-line-savings-badge" }, /* @__PURE__ */ k(IconDiscountBadge, null), savingsPct, "% off") : null
        ];
      })()), !isClaimed && !isFreebie && item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-line-discounts" }, item.line_level_discount_allocations.map((d2) => /* @__PURE__ */ k("span", { class: "cartmax-line-discount-tag", key: d2.discount_application.title }, d2.discount_application.title))) : null, !isFreebie ? /* @__PURE__ */ k("div", { class: "cartmax-line-actions" }, showVariantSwitcher ? /* @__PURE__ */ k("div", { class: "cartmax-variant-wrap" }, /* @__PURE__ */ k(
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
          disabled: isRemoving,
          "aria-label": displayQty <= 1 ? "Remove " + item.product_title : "Decrease quantity"
        },
        displayQty <= 1 ? /* @__PURE__ */ k(IconTrash, null) : /* @__PURE__ */ k(IconMinus, null)
      ), /* @__PURE__ */ k("span", { class: "cartmax-qty-value" + (isPending ? " cartmax-qty-pending" : "") }, displayQty), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-qty-btn",
          onClick: () => this.queueQuantityChange(item.key, displayQty + 1),
          disabled: isRemoving,
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
      if (this._graphqlCart) {
        this.setState({ claimed: Object.assign({}, this.state.claimed, { [key]: true }) });
        addLine(variantId, 1, { _freebie: "true", _cartmax_claim: "true", _claimed: "true", _offer_id: claimId }, {});
        tracker.track(ANALYTICS_EVENTS.GIFT_CLAIMED, { promotion_id: claimId, promotion_type: "claim-gift", variant_id: String(variantId) });
        return;
      }
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
      if (this._graphqlCart) {
        this.setState({ claimed: Object.assign({}, this.state.claimed, { [key]: true }) });
        addLine(variantId, quantity || 1, { _freebie: "true", _offer_id: offerId, _acquired_on_page: window.location.pathname }, {});
        return;
      }
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
            isClaiming ? "Adding..." : !g2.available ? "Unavailable" : limitReached ? "Limit reached" : "Claim gift"
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
      if (this._graphqlCart) {
        applyDiscountCode(code.trim());
        this.setState({ couponInput: "", couponPanelOpen: false, couponError: null });
        return;
      }
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
      if (this._graphqlCart) {
        removeDiscountCode(codeToRemove);
        return;
      }
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
      var showPanel = this.state.couponPanelOpen;
      var cart = this.state.cart;
      var cartQty = cart ? cart.item_count || 0 : 0;
      var cartTotal = cart ? (cart.total_price || 0) / 100 : 0;
      var evalResult = this.state.evalResult;
      var allowMultiple = this._sections.allow_multiple_coupons;
      var singleCouponApplied = !allowMultiple && appliedDiscounts.length > 0;
      var allCoupons = evalResult && evalResult.available_coupons ? evalResult.available_coupons : [];
      var appliedCodes = appliedDiscounts.map(function(d2) {
        return d2.code;
      });
      var coupons = allCoupons.filter(function(c2) {
        if (appliedCodes.indexOf(c2.code) !== -1) return false;
        var minQty = Number(c2.trigger_qty) || 0;
        var minPrice = Number(c2.trigger_price) || 0;
        if (minQty > 0 && cartQty < minQty) return false;
        if (minPrice > 0 && cartTotal < minPrice) return false;
        return true;
      });
      return /* @__PURE__ */ k("div", { class: "cartmax-coupons" }, appliedDiscounts.map(function(d2) {
        return /* @__PURE__ */ k("div", { class: "cartmax-applied-coupon-banner", key: d2.code }, /* @__PURE__ */ k("div", { class: "cartmax-applied-coupon-card" }, /* @__PURE__ */ k("div", { class: "cartmax-applied-coupon-left" }, /* @__PURE__ */ k("span", { class: "cartmax-applied-label" }, "Applied Coupon"), /* @__PURE__ */ k("span", { class: "cartmax-applied-code" }, d2.code)), /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-applied-remove",
            onClick: function() {
              self.handleCouponRemove(d2.code);
            },
            disabled: isLoading,
            "aria-label": "Remove " + d2.code
          },
          "REMOVE"
        )));
      }), !singleCouponApplied ? /* @__PURE__ */ k("div", { class: "cartmax-discount-block" }, /* @__PURE__ */ k("div", { class: "cartmax-discount-input-row" }, /* @__PURE__ */ k(
        "input",
        {
          class: "cartmax-discount-input",
          type: "text",
          placeholder: "Apply Coupon",
          value: self.state.couponInput || "",
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
          class: "cartmax-discount-submit",
          onClick: function() {
            self.handleCouponApply(self.state.couponInput);
          },
          disabled: isLoading || !(self.state.couponInput || "").trim(),
          "aria-label": "Apply coupon"
        },
        /* @__PURE__ */ k(IconChevronRight, null)
      ), /* @__PURE__ */ k("span", { class: "cartmax-discount-divider" }), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-discount-viewall",
          onClick: function() {
            self.setState({ couponPanelOpen: true });
          }
        },
        "View All"
      )), self.state.couponError ? /* @__PURE__ */ k("div", { class: "cartmax-coupon-error" }, self.state.couponError) : null, coupons.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-discount-cards" }, coupons.map(function(c2) {
        return /* @__PURE__ */ k("div", { class: "cartmax-discount-card", key: c2.code }, /* @__PURE__ */ k("div", { class: "cartmax-discount-card-accent" }, /* @__PURE__ */ k("span", null, c2.accent)), /* @__PURE__ */ k("div", { class: "cartmax-discount-card-info" }, /* @__PURE__ */ k("span", { class: "cartmax-discount-card-code" }, c2.code), /* @__PURE__ */ k("span", { class: "cartmax-discount-card-savings" }, c2.display_message)), /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-discount-card-btn",
            onClick: function() {
              self.handleCouponApply(c2.code);
            },
            disabled: isLoading
          },
          "Apply"
        ));
      })) : null) : null, /* @__PURE__ */ k("div", { class: "cartmax-offers-panel" + (showPanel ? " cartmax-offers-panel--open" : "") }, /* @__PURE__ */ k("div", { class: "cartmax-offers-panel-header" }, /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-offers-back",
          onClick: function() {
            self.setState({ couponPanelOpen: false });
          },
          "aria-label": "Back to cart"
        },
        /* @__PURE__ */ k(IconChevronLeft, null)
      ), /* @__PURE__ */ k("span", { class: "cartmax-offers-title" }, "Offers & Coupons")), /* @__PURE__ */ k("div", { class: "cartmax-offers-body" }, /* @__PURE__ */ k("span", { class: "cartmax-offers-label" }, "Available Coupons"), coupons.length > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-offers-cards" }, coupons.map(function(c2) {
        return /* @__PURE__ */ k("div", { class: "cartmax-offers-card", key: c2.code }, /* @__PURE__ */ k("div", { class: "cartmax-offers-card-accent" }, /* @__PURE__ */ k("span", null, c2.accent)), /* @__PURE__ */ k("div", { class: "cartmax-offers-card-info" }, /* @__PURE__ */ k("span", { class: "cartmax-offers-card-code" }, c2.code), /* @__PURE__ */ k("span", { class: "cartmax-offers-card-savings" }, c2.display_message)), /* @__PURE__ */ k(
          "button",
          {
            class: "cartmax-offers-card-btn",
            onClick: function() {
              self.handleCouponApply(c2.code);
            },
            disabled: isLoading
          },
          "Apply"
        ));
      })) : null)));
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
      if (this._graphqlCart) {
        addLine(variantId, 1, {}, {
          price: Math.round(Number(productMeta && productMeta.price || 0) * 100),
          title: productMeta && productMeta.title,
          product_title: productMeta && productMeta.title,
          variant_title: productMeta && productMeta.variant_title,
          image: productMeta && productMeta.image
        });
        tracker.track(ANALYTICS_EVENTS.UPSELL_ADDED, { promotion_type: "upsell", variant_id: String(variantId) });
        return;
      }
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
      if (isEmpty && this._upsells.show_on_empty !== "always") return null;
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
      var headingText = u2.heading || "YOU MAY ALSO LIKE";
      var btnText = u2.btn_text || "ADD TO CART";
      var imgPx = { small: 130, medium: 180, large: 230 }[u2.card_size] || 180;
      return /* @__PURE__ */ k("div", { class: "cartmax-upsells " + layoutClass }, /* @__PURE__ */ k("div", { class: "cartmax-upsells-heading", style: { justifyContent: u2.heading_position === "center" ? "center" : "flex-start" } }, headingText), this.state.upsellError ? /* @__PURE__ */ k("div", { class: "cartmax-upsell-error" }, this.state.upsellError) : null, /* @__PURE__ */ k("div", { class: "cartmax-upsells-scroll" }, filtered.map(function(p2) {
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
      var savings = Number(this.state.savings) || 0;
      var savingsParts = savings > 0 && this._text.savings_label ? this._text.savings_label.split("{amount}") : null;
      var trustMsg = this._text.checkout_trust_message || "";
      return /* @__PURE__ */ k("div", { class: "cartmax-footer" }, savingsParts ? /* @__PURE__ */ k("div", { class: "cartmax-footer-savings" }, /* @__PURE__ */ k("span", { class: "cartmax-footer-savings-icon" }, /* @__PURE__ */ k(IconSparkle, null)), /* @__PURE__ */ k("span", null, savingsParts[0]), /* @__PURE__ */ k("span", { class: "cartmax-footer-savings-amount" }, formatMoney(savings, curr)), /* @__PURE__ */ k("span", null, savingsParts[1] || ""), /* @__PURE__ */ k("span", { class: "cartmax-footer-savings-icon" }, /* @__PURE__ */ k(IconSparkle, null))) : null, /* @__PURE__ */ k("div", { class: "cartmax-footer-checkout" }, /* @__PURE__ */ k("div", { class: "cartmax-footer-price" }, /* @__PURE__ */ k("span", { class: "cartmax-footer-price-amount" }, formatMoney(cart.total_price, curr)), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-price-breakup-link",
          onClick: () => this.setState({ priceBreakupOpen: true })
        },
        "VIEW PRICE BREAKUP"
      )), /* @__PURE__ */ k(
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
        /* @__PURE__ */ k("span", null, this.state.checkoutWaiting ? "Preparing..." : this._text.checkout_button),
        this._layout.show_payment_icons && !this.state.checkoutWaiting ? /* @__PURE__ */ k("span", { class: "cartmax-payment-methods" }, /* @__PURE__ */ k(IconPaymentMethods, null)) : null
      )), trustMsg ? /* @__PURE__ */ k("div", { class: "cartmax-footer-trust" }, /* @__PURE__ */ k(IconLock, null), /* @__PURE__ */ k("span", null, trustMsg), /* @__PURE__ */ k(IconLock, null)) : null);
    }
    // ── Render: Price Breakup Panel ───────────────────────────
    renderPriceBreakup() {
      var cart = this.state.cart;
      var curr = this._currency;
      var totalMRP = cart.items_subtotal_price;
      var discountTotal = cart.total_discount || 0;
      return /* @__PURE__ */ k("div", { class: "cartmax-pb-backdrop", onClick: () => this.setState({ priceBreakupOpen: false }) }, /* @__PURE__ */ k("div", { class: "cartmax-price-breakup-panel", onClick: (e2) => e2.stopPropagation() }, /* @__PURE__ */ k("div", { class: "cartmax-price-breakup-header" }, /* @__PURE__ */ k("span", null, "Price Break Up"), /* @__PURE__ */ k(
        "button",
        {
          class: "cartmax-price-breakup-close",
          "aria-label": "Close",
          onClick: () => this.setState({ priceBreakupOpen: false })
        },
        /* @__PURE__ */ k(IconClose, null)
      )), /* @__PURE__ */ k("div", { class: "cartmax-pb-divider" }), /* @__PURE__ */ k("div", { class: "cartmax-price-breakup-rows" }, /* @__PURE__ */ k("div", { class: "cartmax-pb-row" }, /* @__PURE__ */ k("span", { class: "cartmax-pb-label" }, "Total"), /* @__PURE__ */ k("span", { class: "cartmax-pb-amount" }, formatMoney(totalMRP, curr))), discountTotal > 0 ? /* @__PURE__ */ k("div", { class: "cartmax-pb-row" }, /* @__PURE__ */ k("span", { class: "cartmax-pb-label" }, "Coupon Discount"), /* @__PURE__ */ k("span", { class: "cartmax-pb-amount cartmax-pb-discount" }, "-", formatMoney(discountTotal, curr))) : null, /* @__PURE__ */ k("div", { class: "cartmax-pb-row" }, /* @__PURE__ */ k("span", { class: "cartmax-pb-label" }, "Delivery Fee"), /* @__PURE__ */ k("span", { class: "cartmax-pb-amount" }, formatMoney(0, curr)))), /* @__PURE__ */ k("div", { class: "cartmax-price-breakup-total" }, /* @__PURE__ */ k("span", null, "Total Amount"), /* @__PURE__ */ k("span", null, formatMoney(cart.total_price, curr)))));
    }
    // ── Main render ───────────────────────────────────────────
    render(props, { visible, open, cart, loading, styled }) {
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
      var displayItems = this._displayItems();
      var hasItems = !loading && displayItems.length > 0;
      var isEmpty = !loading && displayItems.length === 0 && !this._hasPendingEdits();
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
      return /* @__PURE__ */ k("div", { class: "cartmax-wrapper" }, liveRegion, /* @__PURE__ */ k(
        "div",
        {
          class: overlayClass,
          onClick: this.handleOverlayClick,
          style: styled ? void 0 : { visibility: "hidden" }
        },
        /* @__PURE__ */ k(
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
          /* @__PURE__ */ k("div", { class: "cartmax-body" }, hasItems && sec.show_progress_bar ? this.renderProgressBar() : null, hasItems && sec.show_claim_gifts ? this.renderClaimGifts() : null, hasItems && sec.show_offer_cards ? this.renderOfferDisplays() : null, loading ? this.renderLoading() : isEmpty ? this.renderEmpty() : hasItems ? displayItems.map((item) => this.renderLineItem(item)) : null, hasItems && sec.show_coupons ? this.renderCoupons() : null, hasItems && sec.show_upsells ? this.renderUpsells() : null),
          hasItems && sec.show_ribbon ? this.renderRibbon() : null,
          isEmpty && sec.show_upsells ? this.renderUpsells() : null,
          hasItems ? this.renderFooter() : null,
          this.state.priceBreakupOpen ? this.renderPriceBreakup() : null
        )
      ));
    }
  };

  // app/drawer-src/src/index.jsx
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
