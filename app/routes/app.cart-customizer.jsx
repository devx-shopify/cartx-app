import { useState, useCallback, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
  getSelectedTheme,
} from "../lib/config.server.js";
import { syncDrawerMetafield } from "../lib/drawer-metafield.server.js";
import { ensureStorefrontToken } from "../lib/storefront-token.server.js";
import CartPreview from "../components/CartPreview.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
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
        style={{ width: "100%", accentColor: "#5e32e2", cursor: "pointer" }}
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
  { id: "layout", label: "Layout" },
  { id: "behavior", label: "Behavior" },
  { id: "advanced", label: "Advanced" },
];

function TabNav({ value, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 28,
        borderBottom: "1px solid #e3e3e3",
        paddingInline: 4,
      }}
    >
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "12px 0",
              marginBottom: -1,
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              border: "none",
              borderBottom: active ? "2px solid #1a1a1a" : "2px solid transparent",
              borderRadius: 0,
              background: "transparent",
              color: active ? "#1a1a1a" : "#6d7175",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "color 0.12s ease, border-color 0.12s ease",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

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

// ── Main Component ──────────────────────────────────────────

export default function CartCustomizer() {
  const { drawer: initial, promotionCoupons } = useLoaderData();
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
        <div style={{ display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${PREVIEW_VISUAL_WIDTH}px`, gap: 24, alignItems: "start" }}>
          {/* ── Left: Settings ─────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <TabNav value={activeTab} onChange={setActiveTab} />

            {activeTab === "design" && (
              <DesignTab s={s} update={update} />
            )}

            {activeTab === "content" && (
              <ContentTab s={s} update={update} />
            )}

            {activeTab === "layout" && (
              <LayoutTab s={s} update={update} />
            )}

            {activeTab === "behavior" && (
              <BehaviorTab s={s} update={update} onTestConfetti={handleTestConfetti} />
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

// ── Tabs ─────────────────────────────────────────────────────

function DesignTab({ s, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <s-section heading="Colors" description="Customize the cart drawer's color palette.">
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
      </s-section>

      <s-section heading="Shape" description="Corner radius and button style.">
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
      </s-section>

      <s-section heading="Typography" description="Font sizes for headings and body text.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
      </s-section>
    </div>
  );
}

function ContentTab({ s, update }) {
  const ab = s.announcement_bar || {};
  const pb = s.progress_bar || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <s-section heading="Cart copy" description="Customize the headings, button labels, and helper text.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-text-field label="Cart title" value={s.text.cart_title} onInput={(e) => update("text.cart_title", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <s-text-field label="Checkout button" value={s.text.checkout_button} onInput={(e) => update("text.checkout_button", e.target.value)} />
            <s-text-field label="Coupon placeholder" value={s.text.coupon_placeholder} onInput={(e) => update("text.coupon_placeholder", e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <div>
              <s-text>Allow multiple coupons</s-text>
              <div style={{ fontSize: 12, color: "#6d7175", marginTop: 2 }}>When off, the coupon input hides after one code is applied.</div>
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
      </s-section>

      <s-section heading="Empty cart" description="Shown when the cart is empty.">
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
      </s-section>

      <s-section heading="Announcement bar" description="A full-width strip shown above the cart header.">
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
        </div>
      </s-section>

      <s-section heading="Checkout" description="Customize the checkout footer bar and savings ribbon.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <s-text-field
            label="Checkout message"
            details="Shown between two lock icons below the checkout button. Leave empty to hide."
            value={s.text.checkout_trust_message}
            onInput={(e) => update("text.checkout_trust_message", e.target.value)}
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
      </s-section>

      <s-section heading="Progress bar" description="Customize the milestone progress bar appearance.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
      </s-section>

      <s-section heading="Upsells" description="Customize how recommended products are displayed.">
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
          <s-checkbox
            label="Show compare-at (strikethrough) price"
            checked={s.layout.upsells_show_compare_price !== false}
            onChange={(e) => update("layout.upsells_show_compare_price", e.target.checked)}
          />
        </div>
      </s-section>

      <s-section heading="Section visibility" description="Toggle which sections appear in the cart drawer.">
        <SectionToggles
          sections={s.sections}
          onToggle={(key, val) => update("sections." + key, val)}
        />
      </s-section>
    </div>
  );
}

function LayoutTab({ s, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <s-section heading="Drawer" description="Position and size of the cart drawer.">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SliderField
            label="Drawer width"
            value={s.layout.drawer_width}
            min={320}
            max={560}
            step={20}
            onChange={(v) => update("layout.drawer_width", v)}
            suffix="px"
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
      </s-section>

      <s-section heading="Cart items" description="How items in the cart are displayed.">
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
          </div>
        </div>
      </s-section>
    </div>
  );
}

function BehaviorTab({ s, update, onTestConfetti }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <s-section heading="Open & close" description="How the drawer opens, closes, and animates.">
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
      </s-section>

      <s-section heading="Animation" description="How the drawer enters and leaves the screen.">
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
      </s-section>

      <s-section heading="Confetti" description="Celebrate when a customer unlocks a milestone.">
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
      </s-section>

      <s-section heading="Checkout button" description="What happens when the customer taps Checkout. If the snippet throws an error, cartx falls back to /checkout.">
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
                update("behavior.checkout_js", "window.onCheckoutClick(button)");
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
                <s-button onClick={() => update("behavior.checkout_js", "window.onCheckoutClick(button)")}>GoKwik</s-button>
                <s-button onClick={() => update("behavior.checkout_js", "window.RazorpayMagicCheckout && window.RazorpayMagicCheckout.trigger()")}>Razorpay Magic</s-button>
                <s-button onClick={() => update("behavior.checkout_js", "window.ScCheckout && window.ScCheckout.open()")}>Shiprocket</s-button>
              </div>
              <s-text color="subdued">
                The snippet runs as a JS function body. <code>button</code> refers to the checkout button element. If it throws, cartx falls back to /checkout.
              </s-text>
            </>
          ) : null}
        </div>
      </s-section>
    </div>
  );
}

function AdvancedTab({ s, update, onExport, onImport, onReset }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <s-section heading="Custom CSS" description="Applied inside the cart drawer only. Does not affect your theme.">
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
      </s-section>

      <s-section heading="Backup & restore" description="Export your config as JSON or import from another store.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <s-button onClick={onExport}>Export settings</s-button>
          <s-button onClick={onImport}>Import settings</s-button>
        </div>
      </s-section>

      <s-section heading="Danger zone">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <s-text color="subdued">
            Resets every drawer setting back to its default. Your promotions, milestones, and upsells aren't touched.
          </s-text>
          <div>
            <s-button tone="critical" onClick={onReset}>Reset all settings to defaults</s-button>
          </div>
        </div>
      </s-section>
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
