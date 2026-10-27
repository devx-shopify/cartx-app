import { useState, useCallback, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useOutletContext, useRouteError, redirect } from "react-router";
import { ThemeSwitcher } from "./app.jsx";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { getActivePlan, planAllowsDrawer } from "../lib/billing.server.js";
import { syncDrawerMetafield } from "../lib/drawer-metafield.server.js";
import { ensureStorefrontToken } from "../lib/storefront-token.server.js";
import CartPreview from "../components/CartPreview.jsx";
import TabNav from "../components/TabNav.jsx";

// GoKwik "open checkout" snippet used by the customizer's checkout action. Calls
// GoKwik's handler when present, else falls back to native /checkout so a store
// where GoKwik hasn't loaded still checks out. Kept in sync with the value set
// manually on the live store so new stores get the same, updated behavior.
const GOKWIK_CHECKOUT_JS = `if (typeof window.onCheckoutClick === 'function') {
  window.onCheckoutClick(button);
} else {
  window.location.href = '/checkout';
}`;

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  // The cart drawer isn't part of drawer-less plans (Basic) — send them to
  // billing rather than the customizer. Nav also hides the link; this guards a
  // direct visit.
  const planData = await getActivePlan(admin, session.shop);
  if (!planAllowsDrawer(planData)) return redirect("/app/billing");
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  // Backfill the storefront styling metafield for installs that configured the
  // drawer before this metafield existed (best-effort; never blocks the page).
  await syncDrawerMetafield(admin, config.drawer);
  // Mint the app-owned Storefront access token on first admin visit (GraphQL
  // cart migration, Phase A). Best-effort; reused once minted.
  await ensureStorefrontToken(admin, shopId);
  return { drawer: config.drawer, promotionCoupons: config.coupons.filter((c) => c.enabled) };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  if (body._action === "save_drawer") {
    config.drawer = body.drawer;
    await saveConfig(shopId, themeId, config);
    // Mirror styling to the app-data metafield so the storefront drawer can
    // apply it on first paint (see app-embed.liquid data-drawer-config).
    await syncDrawerMetafield(admin, config.drawer);
    return { ok: true };
  }

  if (body._action === "reset_all") {
    config.drawer = {};
    await saveConfig(shopId, themeId, config);
    const fresh = await loadConfig(shopId, themeId);
    await syncDrawerMetafield(admin, fresh.drawer);
    return { ok: true, drawer: fresh.drawer };
  }

  return { ok: false };
};

// ── Preview sizing constants ─────────────────────────────────

const PREVIEW_SCALE = 0.78;
const PREVIEW_NATURAL_WIDTH = 380;
const PREVIEW_VISUAL_WIDTH = Math.round(PREVIEW_NATURAL_WIDTH * PREVIEW_SCALE);
const PREVIEW_EMPTY_MIN_HEIGHT = 720;

// ── Deep nested state update ─────────────────────────────────

function deepSet(obj, path, value) {
  const next = structuredClone(obj);
  const keys = path.split(".");
  let target = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null) target[keys[i]] = {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
  return next;
}

// ── Reusable controls ────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 6, lineHeight: 1.3 }}>{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 4,
          paddingRight: 10,
          border: "1px solid #d4d6d8",
          borderRadius: 10,
          background: "#fff",
        }}
      >
        <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: value,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          />
          <input
            type="color"
            value={value}
            onInput={(e) => onChange(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
          />
        </div>
        <input
          type="text"
          value={value}
          onInput={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "4px 0",
            fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "#1a1a1a",
          }}
        />
      </div>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div
        style={{
          display: "inline-flex",
          padding: 3,
          background: "#f1f1f1",
          borderRadius: 10,
        }}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                borderRadius: 7,
                background: active ? "#fff" : "transparent",
                color: active ? "#1a1a1a" : "#6d7175",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step = 1, onChange, suffix = "" }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
          {value}
          {suffix}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#1a1a1a", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8c9196", marginTop: 4 }}>
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ── Tab navigation ──────────────────────────────────────────

const TABS = [
  { id: "design", label: "Design" },
  { id: "content", label: "Content" },
  { id: "features", label: "Features" },
  { id: "behavior", label: "Behavior" },
  { id: "advanced", label: "Advanced" },
];

// ── Section visibility toggles ───────────────────────────────

function SectionToggles({ sections, onToggle }) {
  const toggles = [
    { key: "show_progress_bar", label: "Progress bar" },
    { key: "show_claim_gifts", label: "Claim gifts" },
    { key: "show_offer_cards", label: "Free gift offer cards" },
    { key: "show_coupons", label: "Discount codes" },
    { key: "show_upsells", label: "Upsell products" },
    { key: "show_ribbon", label: "Announcement ribbon" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {toggles.map(({ key, label }, i) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: i < toggles.length - 1 ? "1px solid #f1f1f1" : "none",
          }}
        >
          <s-text>{label}</s-text>
          <s-switch
            label={label}
            labelAccessibilityVisibility="hidden"
            checked={sections[key] !== false || undefined}
            onChange={() => onToggle(key, !sections[key])}
          />
        </div>
      ))}
    </div>
  );
}

// ── Section order ───────────────────────────────────────────

const SECTION_LABELS = {
  progress_bar: "Progress bar",
  claim_gifts: "Claim gifts",
  offer_cards: "Free gift offer cards",
  line_items: "Cart items",
  coupons: "Discount codes",
  upsells: "Upsell products",
};
const BODY_SECTIONS = Object.keys(SECTION_LABELS);

// The stored order, limited to body sections, with any missing ones appended.
// Mirrors normalizeSectionOrder in the drawer.
function bodyOrder(order) {
  const out = (order || []).filter((k, i, arr) => SECTION_LABELS[k] && arr.indexOf(k) === i);
  BODY_SECTIONS.forEach((k) => { if (!out.includes(k)) out.push(k); });
  return out;
}

function SectionOrder({ order, onChange }) {
  const list = bodyOrder(order);
  const move = (i, dir) => {
    const next = list.slice();
    const j = i + dir;
    [next[i], next[j]] = [next[j], next[i]];
    // Keep 'ribbon' in the stored list; it renders outside the body.
    onChange((order || []).includes("ribbon") ? next.concat("ribbon") : next);
  };
  const arrowStyle = (disabled) => ({
    width: 28, height: 28, border: "1px solid #d4d6d8", borderRadius: 6, background: "#fff",
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, fontSize: 14, lineHeight: 1,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {list.map((key, i) => (
        <div
          key={key}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0",
            borderBottom: i < list.length - 1 ? "1px solid #f1f1f1" : "none",
          }}
        >
          <s-text>{SECTION_LABELS[key]}</s-text>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" aria-label={`Move ${SECTION_LABELS[key]} up`} disabled={i === 0} onClick={() => move(i, -1)} style={arrowStyle(i === 0)}>↑</button>
            <button type="button" aria-label={`Move ${SECTION_LABELS[key]} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)} style={arrowStyle(i === list.length - 1)}>↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// A colour that can be left empty ("Default" = the drawer's built-in colour).
function OptionalColorField({ label, value, fallback, onChange }) {
  return (
    <div>
      <ColorField label={label} value={value || fallback} onChange={onChange} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8c9196", marginTop: 4 }}>
        <span>{value ? "Custom" : "Default"}</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ border: "none", background: "none", padding: 0, color: "#005bd3", cursor: "pointer", fontSize: 11 }}
          >
            Use default
          </button>
        ) : null}
      </div>
    </div>
  );
}

// A grid of text settings, each with its default shown as the placeholder.
function TextFields({ s, update, fields }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {fields.map(([key, label, def, details]) => (
        <s-text-field
          key={key}
          label={label}
          details={details}
          placeholder={def}
          value={s.text[key] ?? ""}
          onInput={(e) => update("text." + key, e.target.value)}
        />
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function CartCustomizer() {
  const { drawer: initial, promotionCoupons } = useLoaderData();
  const { themes, activeThemeId, mainThemeId } = useOutletContext();
  const [settings, setSettings] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const saving = fetcher.state !== "idle";

  // Stable refs for save bar event handlers
  const settingsRef = useRef(settings);
  const initialRef = useRef(initial);
  settingsRef.current = settings;
  initialRef.current = initial;

  const update = useCallback((path, value) => {
    setSettings((prev) => deepSet(prev, path, value));
    setDirty(true);
  }, []);

  // ── Save bar ────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById("customizer-save-bar");
    if (!el) return;
    if (dirty) el.show();
    else el.hide();
  }, [dirty]);

  const handleSave = useCallback(() => {
    fetcher.submit(
      JSON.stringify({ _action: "save_drawer", drawer: settingsRef.current }),
      { method: "POST", encType: "application/json" },
    );
    setDirty(false);
  }, [fetcher]);

  const handleDiscard = useCallback(() => {
    setSettings(initialRef.current);
    setDirty(false);
  }, []);

  // ── Toast + reset response ──────────────────────
  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Cart drawer settings saved");
      if (fetcher.data.drawer) {
        setSettings(fetcher.data.drawer);
        initialRef.current = fetcher.data.drawer;
      }
    }
  }, [fetcher.data, shopify]);

  function handleReset() {
    // eslint-disable-next-line no-alert
    if (!confirm("Reset all drawer settings to defaults? This cannot be undone.")) return;
    fetcher.submit(
      JSON.stringify({ _action: "reset_all" }),
      { method: "POST", encType: "application/json" },
    );
    setDirty(false);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cartx-drawer-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    shopify.toast.show("Settings exported");
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (imported && typeof imported === "object" && imported.colors) {
            setSettings(imported);
            setDirty(true);
            shopify.toast.show("Settings imported — save to apply");
          } else {
            shopify.toast.show("Invalid settings file", { isError: true });
          }
        } catch {
          shopify.toast.show("Failed to parse file", { isError: true });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleTestConfetti() {
    const previewEl = document.querySelector("[data-preview-confetti]");
    if (!previewEl) return;
    const lottieUrl = settings.behavior.confetti_lottie_url;
    if (lottieUrl) {
      const existing = document.querySelector("script[data-cartmax-lottie-admin]");
      const playLottie = () => {
        const player = document.createElement("dotlottie-player");
        player.setAttribute("src", lottieUrl);
        player.setAttribute("autoplay", "");
        player.setAttribute("speed", "1");
        player.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;background:transparent";
        previewEl.appendChild(player);
        player.addEventListener("complete", () => player.remove());
        setTimeout(() => { if (player.parentNode) player.remove(); }, 6000);
      };
      if (customElements.get("dotlottie-player")) playLottie();
      else if (!existing) {
        const s2 = document.createElement("script");
        s2.src = "https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs";
        s2.type = "module";
        s2.dataset.cartmaxLottieAdmin = "";
        s2.onload = () => setTimeout(playLottie, 100);
        document.head.appendChild(s2);
      } else setTimeout(playLottie, 200);
    } else {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999";
      canvas.width = previewEl.offsetWidth;
      canvas.height = previewEl.offsetHeight;
      previewEl.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff922b", "#cc5de8", "#20c997", "#f06595"];
      const particles = [];
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.6,
          y: canvas.height * 0.3,
          vx: (Math.random() - 0.5) * 12,
          vy: -4 - Math.random() * 8,
          size: 3 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          rs: (Math.random() - 0.5) * 16,
          op: 1,
        });
      }
      const start = Date.now();
      (function animate() {
        const t = Date.now() - start;
        if (t > 2000) { canvas.remove(); return; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p) => {
          p.vy += 0.12; p.vx *= 0.98; p.x += p.vx; p.y += p.vy; p.rot += p.rs;
          if (t > 1200) p.op = Math.max(0, 1 - (t - 1200) / 800);
          if (p.op <= 0) return;
          ctx.save();
          ctx.globalAlpha = p.op;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        });
        requestAnimationFrame(animate);
      })();
    }
  }

  const s = settings;

  return (
    <>
      <ui-save-bar id="customizer-save-bar">
        <button variant="primary" id="customizer-save" onClick={handleSave} {...(saving ? { disabled: true } : {})}></button>
        <button id="customizer-discard" onClick={handleDiscard}></button>
      </ui-save-bar>

      <s-page heading="Customize Cart">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${PREVIEW_VISUAL_WIDTH}px`, gap: 24, alignItems: "start" }}>
          {/* ── Left: Settings ─────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <TabNav tabs={TABS} value={activeTab} onChange={setActiveTab} />

            {activeTab === "design" && (
              <DesignTab s={s} update={update} />
            )}

            {activeTab === "content" && (
              <ContentTab s={s} update={update} />
            )}

            {activeTab === "features" && (
              <FeaturesTab s={s} update={update} onTestConfetti={handleTestConfetti} />
            )}

            {activeTab === "behavior" && (
              <BehaviorTab s={s} update={update} />
            )}

            {activeTab === "advanced" && (
              <AdvancedTab
                s={s}
                update={update}
                onExport={handleExport}
                onImport={handleImport}
                onReset={handleReset}
              />
            )}
          </div>

          {/* ── Right: Preview ─────────────────── */}
          <div style={{ position: "sticky", top: 60, marginLeft: "auto", width: PREVIEW_VISUAL_WIDTH }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6d7175",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Live preview
              </span>
              <div style={{ display: "inline-flex", padding: 3, background: "#f1f1f1", borderRadius: 8 }}>
                {[
                  { id: false, label: "Filled" },
                  { id: true, label: "Empty" },
                ].map((opt) => {
                  const active = showEmpty === opt.id;
                  return (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => setShowEmpty(opt.id)}
                      style={{
                        padding: "4px 12px",
                        fontSize: 11,
                        fontWeight: 500,
                        border: "none",
                        borderRadius: 6,
                        background: active ? "#fff" : "transparent",
                        color: active ? "#1a1a1a" : "#6d7175",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ position: "relative", width: PREVIEW_VISUAL_WIDTH, overflow: "hidden" }}>
              <div
                data-preview-confetti
                style={{
                  position: "relative",
                  width: PREVIEW_NATURAL_WIDTH,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "top left",
                }}
              >
                <CartPreview
                  settings={settings}
                  promotionCoupons={promotionCoupons}
                  showEmpty={showEmpty}
                  minHeight={showEmpty ? PREVIEW_EMPTY_MIN_HEIGHT : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </s-page>
    </>
  );
}

// ── Collapsible section ──────────────────────────────────────
// Wraps a Polaris s-section card with a clickable header + chevron so each
// settings group can collapse. Per tab, the first section is rendered with
// defaultOpen so something is always visible without scrolling a wall of
// controls. State is local, so it resets to the default each time a tab mounts.
function CollapsibleSection({ heading, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <s-section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open ? "true" : "false"}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          width: "100%",
          padding: 0,
          margin: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{heading}</span>
          {description ? (
            <span style={{ fontSize: 13, color: "#6d7175", lineHeight: 1.4 }}>{description}</span>
          ) : null}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6d7175"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            marginTop: 2,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? <div style={{ marginTop: 16 }}>{children}</div> : null}
    </s-section>
  );
}

// ── Tabs ─────────────────────────────────────────────────────

function DesignTab({ s, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CollapsibleSection heading="Colors" description="Customize the cart drawer's color palette." defaultOpen>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <ColorField label="Primary" value={s.colors.primary} onChange={(v) => update("colors.primary", v)} />
            <ColorField label="Primary text" value={s.colors.primary_text} onChange={(v) => update("colors.primary_text", v)} />
            <ColorField label="Background" value={s.colors.background} onChange={(v) => update("colors.background", v)} />
            <ColorField label="Text" value={s.colors.text} onChange={(v) => update("colors.text", v)} />
            <ColorField label="Secondary text" value={s.colors.secondary_text} onChange={(v) => update("colors.secondary_text", v)} />
            <ColorField label="Border" value={s.colors.border} onChange={(v) => update("colors.border", v)} />
            <ColorField label="Accent (gifts, discounts)" value={s.colors.accent} onChange={(v) => update("colors.accent", v)} />
            <ColorField label="Secondary Accent (announcement, buttons)" value={s.colors.secondary_accent} onChange={(v) => update("colors.secondary_accent", v)} />
            <OptionalColorField label="Add buttons (gift cards, upsells)" value={s.colors.add_button_bg} fallback={s.colors.secondary_accent} onChange={(v) => update("colors.add_button_bg", v)} />
            <OptionalColorField label="Add button text" value={s.colors.add_button_text} fallback={s.colors.text} onChange={(v) => update("colors.add_button_text", v)} />
          </div>


          <s-divider />

          <SliderField
            label="Overlay opacity"
            value={s.colors.overlay_opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => update("colors.overlay_opacity", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Typography" description="Fonts, sizes and heading style.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SegmentedControl
            label="Font"
            options={[
              { value: "theme", label: "Theme font" },
              { value: "custom", label: "Google Fonts" },
            ]}
            value={s.typography.font_source || "theme"}
            onChange={(v) => update("typography.font_source", v)}
          />
          {s.typography.font_source === "custom" && (
            <s-text-field
              label="Google Fonts URL"
              value={s.typography.custom_font_url || ""}
              onInput={(e) => update("typography.custom_font_url", e.target.value)}
              placeholder="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Anton&display=swap"
              details="The first family in the URL becomes the drawer's font. Add more families for the heading font or Custom CSS."
            />
          )}
          <s-text-field
            label="Heading font"
            value={s.typography.heading_font || ""}
            onInput={(e) => update("typography.heading_font", e.target.value)}
            placeholder="Same as body"
            details="A font family name, e.g. Anton. Used for titles, buttons and coupon codes. Load it in the Google Fonts URL above."
          />
          <SegmentedControl
            label="Heading case"
            options={[
              { value: "normal", label: "As typed" },
              { value: "uppercase", label: "UPPERCASE" },
            ]}
            value={s.typography.heading_case || "normal"}
            onChange={(v) => update("typography.heading_case", v)}
          />
          <SliderField
            label="Heading letter spacing"
            value={s.typography.heading_letter_spacing || 0}
            min={0}
            max={6}
            step={0.5}
            onChange={(v) => update("typography.heading_letter_spacing", v)}
            suffix="px"
          />
          <SegmentedControl
            label="Heading size"
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            value={s.typography.heading_size}
            onChange={(v) => update("typography.heading_size", v)}
          />
          <SegmentedControl
            label="Body text size"
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            value={s.typography.body_size}
            onChange={(v) => update("typography.body_size", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Shape" description="Corner radius and button style.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SegmentedControl
            label="Corner radius"
            options={[
              { value: "none", label: "None" },
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
              { value: "pill", label: "Pill" },
            ]}
            value={s.shape.border_radius}
            onChange={(v) => update("shape.border_radius", v)}
          />
          <SegmentedControl
            label="Button style"
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
            ]}
            value={s.shape.button_style}
            onChange={(v) => update("shape.button_style", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Drawer" description="Position and size of the cart drawer.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SliderField
            label="Drawer width"
            value={s.layout.drawer_width}
            min={320}
            max={600}
            step={20}
            onChange={(v) => update("layout.drawer_width", v)}
            suffix="px"
          />
          <SegmentedControl
            label="Header title"
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
            ]}
            value={s.layout.header_align || "left"}
            onChange={(v) => update("layout.header_align", v)}
          />
          <SegmentedControl
            label="Item count"
            options={[
              { value: "badge", label: "Badge" },
              { value: "brackets", label: "(2)" },
              { value: "hidden", label: "Hidden" },
            ]}
            value={s.layout.header_count_style || "badge"}
            onChange={(v) => update("layout.header_count_style", v)}
          />
          <SegmentedControl
            label="Position"
            options={[
              { value: "right", label: "Right" },
              { value: "left", label: "Left" },
            ]}
            value={s.layout.drawer_position}
            onChange={(v) => update("layout.drawer_position", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Cart items" description="How items in the cart are displayed.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SegmentedControl
            label="Image style"
            options={[
              { value: "square", label: "Square" },
              { value: "rounded", label: "Rounded" },
              { value: "circle", label: "Circle" },
            ]}
            value={s.layout.image_style}
            onChange={(v) => update("layout.image_style", v)}
          />
          <SegmentedControl
            label="Image size"
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            value={s.layout.image_size}
            onChange={(v) => update("layout.image_size", v)}
          />
          <SegmentedControl
            label="Item density"
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
            value={s.layout.density}
            onChange={(v) => update("layout.density", v)}
          />
          <SegmentedControl
            label="Quantity controls"
            options={[
              { value: "bordered", label: "Bordered" },
              { value: "minimal", label: "Minimal" },
            ]}
            value={s.layout.qty_style}
            onChange={(v) => update("layout.qty_style", v)}
          />
          <SegmentedControl
            label="Remove button"
            options={[
              { value: "icon", label: "Bin icon" },
              { value: "text", label: "\"Remove\" text" },
            ]}
            value={s.layout.remove_style || "icon"}
            onChange={(v) => update("layout.remove_style", v)}
          />
          <SegmentedControl
            label="Variant"
            options={[
              { value: "actions", label: "Next to quantity" },
              { value: "above_title", label: "Above the name" },
            ]}
            value={s.layout.variant_position || "actions"}
            onChange={(v) => update("layout.variant_position", v)}
          />
          <SegmentedControl
            label="Variant style"
            options={[
              { value: "switcher", label: "Switcher" },
              { value: "label", label: "Plain label" },
            ]}
            value={s.layout.variant_style || "switcher"}
            onChange={(v) => update("layout.variant_style", v)}
          />
          <SegmentedControl
            label="Free gift line"
            options={[
              { value: "plain", label: "Plain" },
              { value: "highlight", label: "Highlighted" },
            ]}
            value={s.layout.gift_line_style || "plain"}
            onChange={(v) => update("layout.gift_line_style", v)}
          />
          <s-divider />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <s-checkbox
              label="Show compare at price"
              checked={s.layout.show_compare_price !== false || undefined}
              onChange={(e) => update("layout.show_compare_price", e.target.checked)}
            />
            <s-checkbox
              label="Variant switcher"
              checked={s.layout.show_variant_switcher || undefined}
              onChange={(e) => update("layout.show_variant_switcher", e.target.checked)}
            />
            <s-checkbox
              label="Show vendor name"
              checked={s.layout.show_vendor || undefined}
              onChange={(e) => update("layout.show_vendor", e.target.checked)}
            />
            <s-checkbox
              label="Show remove button"
              checked={s.layout.show_remove_btn || undefined}
              onChange={(e) => update("layout.show_remove_btn", e.target.checked)}
            />
            <s-checkbox
              label="Show quantities as 01, 02…"
              checked={s.layout.qty_zero_pad || undefined}
              onChange={(e) => update("layout.qty_zero_pad", e.target.checked)}
            />
            <s-checkbox
              label="Show the price on free gift cards"
              details='e.g. "~~₹999~~ Free" on the "Pick your free gift" cards.'
              checked={s.layout.gift_show_price || undefined}
              onChange={(e) => update("layout.gift_show_price", e.target.checked)}
            />
            <s-checkbox
              label="Show icon on the discount badge"
              checked={s.layout.line_discount_show_icon !== false || undefined}
              onChange={(e) => update("layout.line_discount_show_icon", e.target.checked)}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function ContentTab({ s, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CollapsibleSection heading="Cart copy" description="Customize the headings, button labels, and helper text." defaultOpen>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-text-field label="Cart title" value={s.text.cart_title} onInput={(e) => update("text.cart_title", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <s-text-field label="Checkout button" value={s.text.checkout_button} onInput={(e) => update("text.checkout_button", e.target.value)} />
            <s-text-field label="Coupon placeholder" value={s.text.coupon_placeholder} onInput={(e) => update("text.coupon_placeholder", e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <div>
              <s-text>Allow multiple coupons (stacking)</s-text>
              <div style={{ fontSize: 12, color: "#6d7175", marginTop: 2 }}>On: shoppers can apply several codes at once. Off: applying a new code replaces the current one (single coupon per order).</div>
            </div>
            <s-switch
              label="Allow multiple coupons"
              labelAccessibilityVisibility="hidden"
              checked={s.sections.allow_multiple_coupons || undefined}
              onChange={() => update("sections.allow_multiple_coupons", !s.sections.allow_multiple_coupons)}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <s-text-field label="Total label" value={s.text.total_label} onInput={(e) => update("text.total_label", e.target.value)} />
            <s-text-field label="Subtotal label" value={s.text.subtotal_label} onInput={(e) => update("text.subtotal_label", e.target.value)} />
          </div>
          <s-text-field
            label="Free gift offer card heading"
            details='Shown above gift cards for offers with reward mode "Show offer card only".'
            value={s.text.offer_cards_heading}
            onInput={(e) => update("text.offer_cards_heading", e.target.value)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Buttons & labels" description="Every other piece of text in the drawer. Leave a field empty to use the default shown.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <FieldLabel>Gift cards</FieldLabel>
          <TextFields s={s} update={update} fields={[
            ["gift_add_button", "Add button", "Add"],
            ["gift_remove_button", "Remove button", "Remove"],
            ["claim_gift_button", "Claim gift button", "Claim gift"],
            ["gift_free_label", "Price label", "Free", "Shown after the struck price, e.g. ₹999 Free."],
            ["gift_adding", "While adding", "Adding..."],
            ["gift_claimed", "After claiming", "Claimed"],
            ["gift_unavailable", "Unavailable", "Unavailable"],
            ["claim_limit_reached", "Claim limit reached", "Limit reached"],
          ]} />
          <s-divider />
          <FieldLabel>Cart items</FieldLabel>
          <TextFields s={s} update={update} fields={[
            ["free_badge", "Free gift badge", "FREE"],
            ["line_remove", "Remove text", "Remove", 'Used when the remove button is set to "Remove" text.'],
            ["line_discount_format", "Discount badge", "{pct}% off", "{pct} is the percentage. Also used on upsell cards."],
          ]} />
          <s-divider />
          <FieldLabel>Coupons</FieldLabel>
          <TextFields s={s} update={update} fields={[
            ["coupon_view_all", "View all", "View All"],
            ["coupon_apply", "Apply button", "Apply"],
            ["coupon_remove", "Remove (applied card)", "Remove"],
            ["coupon_invalid", "Invalid code message", "Invalid or inapplicable code"],
            ["coupon_locked_message", "Not yet reachable (amount)", "Add {amount} more to apply this coupon"],
            ["coupon_locked_qty_message", "Not yet reachable (items)", "Add {count} more items to apply this coupon"],
            ["coupon_saved_message", "Saved message (applied card)", "You saved {amount} with this coupon"],
            ["coupons_panel_title", "Offers panel title", "Offers & Coupons"],
            ["coupons_panel_label", "Offers panel list heading", "Available Coupons"],
            ["coupons_panel_placeholder", "Offers panel code field", "Enter Coupon Code"],
          ]} />
          <s-divider />
          <FieldLabel>Upsells</FieldLabel>
          <TextFields s={s} update={update} fields={[
            ["upsells_empty_heading", "Heading on an empty cart", "Same as the upsell heading"],
            ["upsell_sold_out", "Sold out", "Sold out"],
          ]} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Price breakup" description="The sheet opened from the checkout bar.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TextFields s={s} update={update} fields={[
            ["price_breakup_link", "Link in the checkout bar", "VIEW PRICE BREAKUP"],
            ["price_breakup_title", "Sheet title", "Price Break Up"],
            ["pb_total_mrp", "Total MRP", "Total MRP"],
            ["pb_discount_mrp", "Discount on MRP", "Discount on MRP"],
            ["pb_coupon_discount", "Coupon discount", "Coupon Discount"],
            ["pb_shipping", "Shipping", "Shipping Fee"],
            ["pb_shipping_value", "Shipping value", "Calculated at checkout"],
            ["pb_total", "Total", "Total Amount"],
          ]} />
          <s-text-area
            label="Shipping rules"
            rows={4}
            value={s.text.shipping_note || ""}
            onInput={(e) => update("text.shipping_note", e.target.value)}
            placeholder={"Prepaid: free shipping above ₹399\nCOD: ₹49 fee"}
            details="Shown in a box under Shipping, with an info icon to hide it. Line breaks are kept. Leave empty to hide."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Empty cart" description="Shown when the cart is empty.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Icon upload */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>Empty state icon</div>
            <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 10, lineHeight: 1.4 }}>
              Upload an SVG file to replace the default bag icon. Leave empty to use the default.
            </div>
            {s.layout.empty_icon_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 8, border: "1px solid #d4d6d8",
                  background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  <img src={s.layout.empty_icon_url} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <s-button size="slim" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".svg,image/svg+xml";
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => update("layout.empty_icon_url", ev.target.result);
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}>Replace</s-button>
                  <s-button size="slim" tone="critical" onClick={() => update("layout.empty_icon_url", "")}>Remove</s-button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".svg,image/svg+xml";
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => update("layout.empty_icon_url", ev.target.result);
                    reader.readAsDataURL(file);
                  };
                  input.click();
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "20px 24px", border: "1.5px dashed #d4d6d8", borderRadius: 10,
                  cursor: "pointer", background: "#fafafa",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8c9196" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: 12, color: "#6d7175" }}>Click to upload SVG</span>
              </div>
            )}
          </div>

          {/* Icon color */}
          <ColorField
            label="Icon color"
            value={s.layout.empty_icon_color || "#16a34a"}
            onChange={(v) => update("layout.empty_icon_color", v)}
          />
          <div style={{ fontSize: 12, color: "#6d7175", marginTop: -8, lineHeight: 1.4 }}>
            Applies to the default icon only. Your uploaded SVG uses its own colors.
          </div>

          {/* Icon size */}
          <SegmentedControl
            label="Icon size"
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            value={s.layout.empty_icon_size || "medium"}
            onChange={(v) => update("layout.empty_icon_size", v)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <s-text-field label="Empty state title" value={s.text.empty_title} onInput={(e) => update("text.empty_title", e.target.value)} />
            <s-text-field label="Empty state button" details="Leave empty to hide the button." value={s.text.empty_button} onInput={(e) => update("text.empty_button", e.target.value)} />
          </div>
          <s-text-field label="Empty state subtitle" value={s.text.empty_subtitle} onInput={(e) => update("text.empty_subtitle", e.target.value)} />

          <s-text-field
            label="Empty state button URL"
            value={s.text.continue_shopping_url}
            onInput={(e) => update("text.continue_shopping_url", e.target.value)}
            placeholder="Leave empty to close drawer"
            details="Where the empty cart button takes the customer. Leave empty to close the drawer, or enter a URL to redirect."
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Checkout" description="Customize the checkout footer bar and savings ribbon.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-text-field
            label="Checkout message"
            details="Shown between two lock icons below the checkout button. Leave empty to hide."
            value={s.text.checkout_trust_message}
            onInput={(e) => update("text.checkout_trust_message", e.target.value)}
          />
          <s-checkbox
            label="Show sparkle icons on the savings ribbon"
            checked={s.layout.savings_show_icon !== false || undefined}
            onChange={(e) => update("layout.savings_show_icon", e.target.checked)}
          />
          <s-checkbox
            label="Show payment icons"
            details="Displays Google Pay, PhonePe and Paytm icons inside the checkout button."
            checked={s.layout.show_payment_icons !== false || undefined}
            onChange={(e) => update("layout.show_payment_icons", e.target.checked)}
          />
          <s-text-field
            label="Savings ribbon text"
            details="Use {amount} to show the saved value. Leave empty to hide."
            value={s.text.savings_label}
            onInput={(e) => update("text.savings_label", e.target.value)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <ColorField label="Ribbon background" value={s.colors.savings_bg} onChange={(v) => update("colors.savings_bg", v)} />
            <ColorField label="Ribbon text" value={s.colors.savings_text} onChange={(v) => update("colors.savings_text", v)} />
            <ColorField label="Ribbon amount color" value={s.colors.savings_amount} onChange={(v) => update("colors.savings_amount", v)} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function FeaturesTab({ s, update, onTestConfetti }) {
  const ab = s.announcement_bar || {};
  const pb = s.progress_bar || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CollapsibleSection heading="Section visibility" description="Toggle which sections appear in the cart drawer." defaultOpen>
        <SectionToggles
          sections={s.sections}
          onToggle={(key, val) => update("sections." + key, val)}
        />
      </CollapsibleSection>

      <CollapsibleSection heading="Section order" description="The order of the blocks inside the cart. The checkout bar always stays at the bottom.">
        <SectionOrder order={s.sections.order} onChange={(v) => update("sections.order", v)} />
      </CollapsibleSection>

      <CollapsibleSection heading="Coupons" description="How discount codes are entered, listed and shown once applied.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SegmentedControl
            label="Code entry in the cart"
            options={[
              { value: "input", label: "Input + View All" },
              { value: "link", label: "One \"Apply Coupon ›\" row" },
            ]}
            value={s.layout.coupon_entry || "input"}
            onChange={(v) => update("layout.coupon_entry", v)}
          />
          <SegmentedControl
            label="Coupon cards in the cart"
            options={[
              { value: "scroll", label: "Horizontal scroll" },
              { value: "list", label: "List" },
            ]}
            value={s.layout.coupon_cards_layout || "scroll"}
            onChange={(v) => update("layout.coupon_cards_layout", v)}
          />
          <SegmentedControl
            label="Applied coupon"
            options={[
              { value: "chip", label: "Chip" },
              { value: "card", label: "Card with amount saved" },
            ]}
            value={s.sections.coupon_applied_style || "chip"}
            onChange={(v) => update("sections.coupon_applied_style", v)}
          />
          <s-checkbox
            label="Show coupons the cart doesn't qualify for yet"
            details='Greyed out, with "Add ₹X more to apply this coupon".'
            checked={s.sections.show_locked_coupons || undefined}
            onChange={(e) => update("sections.show_locked_coupons", e.target.checked)}
          />
          <s-checkbox
            label="Code field in the Offers & Coupons panel"
            checked={s.sections.coupon_panel_input || undefined}
            onChange={(e) => update("sections.coupon_panel_input", e.target.checked)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Progress bar" description="Customize the milestone progress bar appearance.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SegmentedControl
            label="Style"
            options={[
              { value: "plain", label: "Plain" },
              { value: "card", label: "Card" },
            ]}
            value={pb.card_style || "plain"}
            onChange={(v) => update("progress_bar.card_style", v)}
          />
          {pb.card_style === "card" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <OptionalColorField label="Card background" value={pb.card_bg} fallback={s.colors.background} onChange={(v) => update("progress_bar.card_bg", v)} />
              <OptionalColorField label="Gradient to" value={pb.card_bg_end} fallback={pb.card_bg || s.colors.background} onChange={(v) => update("progress_bar.card_bg_end", v)} />
              <OptionalColorField label="Card border" value={pb.card_border} fallback={s.colors.border} onChange={(v) => update("progress_bar.card_border", v)} />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <OptionalColorField label="Progress fill" value={pb.fill_color} fallback={s.colors.accent} onChange={(v) => update("progress_bar.fill_color", v)} />
            <OptionalColorField label="Reached milestone" value={pb.reached_dot_color} fallback={s.colors.primary} onChange={(v) => update("progress_bar.reached_dot_color", v)} />
          </div>
          <s-text-field
            label="Corner badge image URL"
            value={pb.badge_image_url || ""}
            onInput={(e) => update("progress_bar.badge_image_url", e.target.value)}
            placeholder="https://cdn.shopify.com/s/files/…/special-offer.png"
            details="A sticker such as SPECIAL OFFER. Upload it to Shopify Files (Content → Files) and paste its link. Leave empty to hide."
          />
          {pb.badge_image_url ? (
            <SegmentedControl
              label="Badge corner"
              options={[
                { value: "top-left", label: "Top left" },
                { value: "top-right", label: "Top right" },
              ]}
              value={pb.badge_corner || "top-left"}
              onChange={(v) => update("progress_bar.badge_corner", v)}
            />
          ) : null}
          <SegmentedControl
            label="Track thickness"
            options={[
              { value: "thin", label: "Thin" },
              { value: "normal", label: "Normal" },
              { value: "thick", label: "Thick" },
            ]}
            value={pb.track_thickness || "normal"}
            onChange={(v) => update("progress_bar.track_thickness", v)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ColorField
              label="Top message background"
              value={pb.badge_bg_color || "#e6f9ee"}
              onChange={(v) => update("progress_bar.badge_bg_color", v)}
            />
            <ColorField
              label="Top message text"
              value={pb.badge_text_color || "#16a34a"}
              onChange={(v) => update("progress_bar.badge_text_color", v)}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>Milestone icon</div>
            <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 10, lineHeight: 1.4 }}>
              Replaces the default empty circle on incomplete milestone nodes.
            </div>
            {pb.milestone_icon_svg ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 8, border: "1px solid #d4d6d8",
                  background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }} dangerouslySetInnerHTML={{ __html: pb.milestone_icon_svg }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <s-button size="slim" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".svg,image/svg+xml";
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => update("progress_bar.milestone_icon_svg", ev.target.result);
                      reader.readAsText(file);
                    };
                    input.click();
                  }}>Replace</s-button>
                  <s-button size="slim" tone="critical" onClick={() => update("progress_bar.milestone_icon_svg", "")}>Remove</s-button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".svg,image/svg+xml";
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => update("progress_bar.milestone_icon_svg", ev.target.result);
                    reader.readAsText(file);
                  };
                  input.click();
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "20px 24px", border: "1.5px dashed #d4d6d8", borderRadius: 10,
                  cursor: "pointer", background: "#fafafa",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8c9196" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: 12, color: "#6d7175" }}>Click to upload SVG</span>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>Completed milestone icon</div>
            <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 10, lineHeight: 1.4 }}>
              Shown on reached milestones. Falls back to the milestone icon, then the default circle with checkmark.
            </div>
            {pb.completed_icon_svg ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 8, border: "1px solid #d4d6d8",
                  background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }} dangerouslySetInnerHTML={{ __html: pb.completed_icon_svg }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <s-button size="slim" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".svg,image/svg+xml";
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => update("progress_bar.completed_icon_svg", ev.target.result);
                      reader.readAsText(file);
                    };
                    input.click();
                  }}>Replace</s-button>
                  <s-button size="slim" tone="critical" onClick={() => update("progress_bar.completed_icon_svg", "")}>Remove</s-button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".svg,image/svg+xml";
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => update("progress_bar.completed_icon_svg", ev.target.result);
                    reader.readAsText(file);
                  };
                  input.click();
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "20px 24px", border: "1.5px dashed #d4d6d8", borderRadius: 10,
                  cursor: "pointer", background: "#fafafa",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8c9196" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: 12, color: "#6d7175" }}>Click to upload SVG</span>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Announcement bar" description="A full-width strip shown above the cart header.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-text-field
            label="Text"
            value={ab.text || ""}
            onInput={(e) => update("announcement_bar.text", e.target.value)}
            placeholder="Free shipping on orders over $50"
            details="Leave empty to hide the announcement bar."
          />
          <SegmentedControl
            label="Animation"
            options={[
              { value: "static", label: "Static" },
              { value: "marquee", label: "Marquee" },
            ]}
            value={ab.type || "static"}
            onChange={(v) => update("announcement_bar.type", v)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <OptionalColorField label="Background" value={ab.bg_color} fallback={s.colors.secondary_accent} onChange={(v) => update("announcement_bar.bg_color", v)} />
            <OptionalColorField label="Text" value={ab.text_color} fallback={s.colors.text} onChange={(v) => update("announcement_bar.text_color", v)} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Upsells" description="Customize how recommended products are displayed.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SegmentedControl
            label="Card layout"
            options={[
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ]}
            value={s.layout.upsells_card_layout || "horizontal"}
            onChange={(v) => update("layout.upsells_card_layout", v)}
          />
          <SegmentedControl
            label="Card size"
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            value={s.layout.upsells_card_size || "medium"}
            onChange={(v) => update("layout.upsells_card_size", v)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <s-text-field
              label="Section heading"
              value={s.layout.upsells_heading}
              onInput={(e) => update("layout.upsells_heading", e.target.value)}
              placeholder="YOU MAY ALSO LIKE"
            />
            <s-text-field
              label="Add to cart button text"
              value={s.layout.upsells_btn_text}
              onInput={(e) => update("layout.upsells_btn_text", e.target.value)}
              placeholder="ADD TO CART"
            />
          </div>
          <SegmentedControl
            label="Heading position"
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
            ]}
            value={s.layout.upsells_heading_position || "left"}
            onChange={(v) => update("layout.upsells_heading_position", v)}
          />
          <SegmentedControl
            label="When to show"
            options={[
              { value: "filled", label: "Only with items" },
              { value: "always", label: "Always" },
            ]}
            value={s.layout.upsells_show_on_empty || "filled"}
            onChange={(v) => update("layout.upsells_show_on_empty", v)}
          />
          <SegmentedControl
            label="Add button"
            options={[
              { value: "below", label: "Below the details" },
              { value: "over_image", label: "Over the image" },
            ]}
            value={s.layout.upsells_btn_position || "below"}
            onChange={(v) => update("layout.upsells_btn_position", v)}
          />
          <s-checkbox
            label="Show compare-at (strikethrough) price"
            checked={s.layout.upsells_show_compare_price !== false}
            onChange={(e) => update("layout.upsells_show_compare_price", e.target.checked)}
          />
          <s-checkbox
            label="Show discount %"
            details="Uses the discount badge text from Content → Buttons & labels."
            checked={s.layout.upsells_show_discount || undefined}
            onChange={(e) => update("layout.upsells_show_discount", e.target.checked)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Confetti" description="Celebrate when a customer unlocks a milestone.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-switch
            label="Burst confetti on milestone unlock"
            checked={s.behavior.confetti || undefined}
            onChange={(e) => update("behavior.confetti", e.target.checked)}
          />
          {s.behavior.confetti && (
            <>
              <s-text-field
                label="Lottie animation URL"
                value={s.behavior.confetti_lottie_url}
                onInput={(e) => update("behavior.confetti_lottie_url", e.target.value)}
                placeholder="https://assets.lottiefiles.com/..."
                details="Paste a .lottie or .json URL from LottieFiles. Leave empty to use the default confetti."
              />
              <div>
                <s-button onClick={onTestConfetti}>Test confetti</s-button>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function BehaviorTab({ s, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CollapsibleSection heading="Open & close" description="How the drawer opens, closes, and animates." defaultOpen>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-switch
            label="Auto-open when item is added to cart"
            checked={s.behavior.auto_open_on_add || undefined}
            onChange={(e) => update("behavior.auto_open_on_add", e.target.checked)}
          />
          <s-switch
            label="Close on overlay click"
            checked={s.behavior.close_on_overlay_click || undefined}
            onChange={(e) => update("behavior.close_on_overlay_click", e.target.checked)}
          />
          <s-switch
            label="Close on ESC key"
            checked={s.behavior.close_on_esc || undefined}
            onChange={(e) => update("behavior.close_on_esc", e.target.checked)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Animation" description="How the drawer enters and leaves the screen.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SegmentedControl
            label="Animation style"
            options={[
              { value: "slide", label: "Slide" },
              { value: "fade", label: "Fade" },
              { value: "none", label: "None" },
            ]}
            value={s.behavior.animation_style}
            onChange={(v) => update("behavior.animation_style", v)}
          />
          <SegmentedControl
            label="Animation speed"
            options={[
              { value: "fast", label: "Fast" },
              { value: "normal", label: "Normal" },
              { value: "slow", label: "Slow" },
            ]}
            value={s.behavior.animation_speed}
            onChange={(v) => update("behavior.animation_speed", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Checkout button" description="What happens when the customer taps Checkout. If the snippet throws an error, cartx falls back to /checkout.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SegmentedControl
            label="Action"
            options={[
              { value: "", label: "Go to /checkout" },
              { value: "custom", label: "Custom JavaScript" },
            ]}
            value={s.behavior.checkout_js ? "custom" : ""}
            onChange={(v) => {
              if (v === "") {
                update("behavior.checkout_js", "");
              } else if (!s.behavior.checkout_js) {
                update("behavior.checkout_js", GOKWIK_CHECKOUT_JS);
              }
            }}
          />
          {s.behavior.checkout_js ? (
            <>
              <textarea
                value={s.behavior.checkout_js}
                onInput={(e) => update("behavior.checkout_js", e.target.value)}
                rows={4}
                placeholder="window.onCheckoutClick(button)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #d4d6d8",
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  resize: "vertical",
                  background: "#fff",
                  color: "#1a1a1a",
                  lineHeight: 1.6,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <s-button onClick={() => update("behavior.checkout_js", GOKWIK_CHECKOUT_JS)}>GoKwik</s-button>
                <s-button onClick={() => update("behavior.checkout_js", "window.RazorpayMagicCheckout && window.RazorpayMagicCheckout.trigger()")}>Razorpay Magic</s-button>
                <s-button onClick={() => update("behavior.checkout_js", "window.ScCheckout && window.ScCheckout.open()")}>Shiprocket</s-button>
              </div>
              <s-text color="subdued">
                The snippet runs as a JS function body. <code>button</code> refers to the checkout button element. If it throws, cartx falls back to /checkout.
              </s-text>
            </>
          ) : null}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function AdvancedTab({ s, update, onExport, onImport, onReset }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CollapsibleSection heading="Custom CSS" description="Applied inside the cart drawer only. Does not affect your theme." defaultOpen>
        <textarea
          value={s.advanced.custom_css}
          onInput={(e) => update("advanced.custom_css", e.target.value)}
          rows={8}
          placeholder={".cartmax-checkout-btn {\n  text-transform: uppercase;\n}"}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            border: "1px solid #d4d6d8",
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            resize: "vertical",
            background: "#fff",
            color: "#1a1a1a",
            lineHeight: 1.6,
            outline: "none",
          }}
        />
      </CollapsibleSection>

      <CollapsibleSection heading="Backup & restore" description="Export your config as JSON or import from another store.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <s-button onClick={onExport}>Export settings</s-button>
          <s-button onClick={onImport}>Import settings</s-button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection heading="Danger zone">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <s-text color="subdued">
            Resets every drawer setting back to its default. Your promotions, milestones, and upsells aren't touched.
          </s-text>
          <div>
            <s-button tone="critical" onClick={onReset}>Reset all settings to defaults</s-button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
