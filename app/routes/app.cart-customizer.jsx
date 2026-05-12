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
import CartPreview from "../components/CartPreview.jsx";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  const config = await loadConfig(shopId, themeId);
  return { drawer: config.drawer };
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
    return { ok: true };
  }

  if (body._action === "reset_all") {
    config.drawer = {};
    await saveConfig(shopId, themeId, config);
    const fresh = await loadConfig(shopId, themeId);
    return { ok: true, drawer: fresh.drawer };
  }

  return { ok: false };
};

// ── Deep nested state update ─────────────────────────────────

function deepSet(obj, path, value) {
  const next = structuredClone(obj);
  const keys = path.split(".");
  let target = next;
  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
  return next;
}

// ── Color picker ─────────────────────────────────────────────

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: value, border: "1px solid var(--s-color-border, #ccc)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }} />
        <input
          type="color"
          value={value}
          onInput={(e) => onChange(e.target.value)}
          style={{
            position: "absolute", inset: 0, opacity: 0, cursor: "pointer",
            width: "100%", height: "100%",
          }}
        />
      </div>
      <input
        type="text"
        value={value}
        onInput={(e) => onChange(e.target.value)}
        style={{
          width: 76, padding: "5px 8px", fontSize: 12,
          fontFamily: "var(--s-font-family-mono, monospace)",
          border: "1px solid var(--s-color-border, #ccc)",
          borderRadius: 8, background: "var(--s-color-bg-surface, #fff)",
          color: "var(--s-color-text, #1a1a1a)",
        }}
      />
      <span style={{ fontSize: 13, color: "var(--s-color-text-secondary, #616161)" }}>{label}</span>
    </div>
  );
}

// ── Segmented button group ───────────────────────────────────

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 6, color: "var(--s-color-text, #1a1a1a)" }}>{label}</div>
      <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--s-color-border, #ccc)", overflow: "hidden" }}>
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              borderLeft: i > 0 ? "1px solid var(--s-color-border, #ccc)" : "none",
              background: value === opt.value ? "var(--s-color-bg-surface-selected, #f1f1f1)" : "var(--s-color-bg-surface, #fff)",
              color: value === opt.value ? "var(--s-color-text, #1a1a1a)" : "var(--s-color-text-secondary, #616161)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section order editor ─────────────────────────────────────

const SECTION_LABELS = {
  progress_bar: "Progress Bar",
  claim_gifts: "Claim Gifts",
  line_items: "Cart Items",
  coupons: "Discount Codes",
  upsells: "Upsell Products",
  ribbon: "Announcement Ribbon",
};

function SectionToggles({ sections, onToggle }) {
  var toggles = [
    { key: "show_progress_bar", label: "Progress Bar" },
    { key: "show_claim_gifts", label: "Claim Gifts" },
    { key: "show_coupons", label: "Discount Codes" },
    { key: "show_upsells", label: "Upsell Products" },
    { key: "show_ribbon", label: "Announcement Ribbon" },
  ];
  return (
    <s-stack direction="block" gap="300">
      {toggles.map(({ key, label }) => (
        <s-switch
          key={key}
          label={label}
          checked={sections[key] !== false || undefined}
          onChange={() => onToggle(key, !sections[key])}
        />
      ))}
    </s-stack>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function CartCustomizer() {
  const { drawer: initial } = useLoaderData();
  const [settings, setSettings] = useState(initial);
  const [dirty, setDirty] = useState(false);
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

  useEffect(() => {
    const saveBtn = document.getElementById("customizer-save");
    const discardBtn = document.getElementById("customizer-discard");
    function onSave() {
      fetcher.submit(
        JSON.stringify({ _action: "save_drawer", drawer: settingsRef.current }),
        { method: "POST", encType: "application/json" }
      );
      setDirty(false);
    }
    function onDiscard() {
      setSettings(initialRef.current);
      setDirty(false);
    }
    saveBtn?.addEventListener("click", onSave);
    discardBtn?.addEventListener("click", onDiscard);
    return () => {
      saveBtn?.removeEventListener("click", onSave);
      discardBtn?.removeEventListener("click", onDiscard);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!confirm("Reset all drawer settings to defaults? This cannot be undone.")) return;
    fetcher.submit(
      JSON.stringify({ _action: "reset_all" }),
      { method: "POST", encType: "application/json" }
    );
    setDirty(false);
  }

  const s = settings;

  return (
    <>
      <ui-save-bar id="customizer-save-bar">
        <button variant="primary" id="customizer-save" {...(saving ? { disabled: true } : {})}></button>
        <button id="customizer-discard"></button>
      </ui-save-bar>

      <s-page heading="Customize Cart">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
          {/* ── Left: Settings ─────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Colors */}
            <s-section heading="Colors" description="Customize the cart drawer's color palette">
              <s-stack direction="block" gap="200">
                <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                  <ColorField label="Primary" value={s.colors.primary} onChange={(v) => update("colors.primary", v)} />
                  <ColorField label="Primary text" value={s.colors.primary_text} onChange={(v) => update("colors.primary_text", v)} />
                </s-grid>
                <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                  <ColorField label="Background" value={s.colors.background} onChange={(v) => update("colors.background", v)} />
                  <ColorField label="Text" value={s.colors.text} onChange={(v) => update("colors.text", v)} />
                </s-grid>
                <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                  <ColorField label="Secondary text" value={s.colors.secondary_text} onChange={(v) => update("colors.secondary_text", v)} />
                  <ColorField label="Border" value={s.colors.border} onChange={(v) => update("colors.border", v)} />
                </s-grid>
                <ColorField label="Accent (free gifts, discounts)" value={s.colors.accent} onChange={(v) => update("colors.accent", v)} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 4 }}>
                    Overlay opacity: {s.colors.overlay_opacity}
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={s.colors.overlay_opacity}
                    onInput={(e) => update("colors.overlay_opacity", Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--s-color-icon-brand, #008060)" }}
                  />
                </div>
              </s-stack>
            </s-section>

            {/* Shape */}
            <s-section heading="Shape" description="Corner radius and button style">
              <s-stack direction="block" gap="400">
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
              </s-stack>
            </s-section>

            {/* Typography */}
            <s-section heading="Typography" description="Font sizes for headings and body text">
              <s-stack direction="block" gap="400">
                <SegmentedControl
                  label="Heading size"
                  options={[
                    { value: "small", label: "Small (14px)" },
                    { value: "medium", label: "Medium (16px)" },
                    { value: "large", label: "Large (18px)" },
                  ]}
                  value={s.typography.heading_size}
                  onChange={(v) => update("typography.heading_size", v)}
                />
                <SegmentedControl
                  label="Body text size"
                  options={[
                    { value: "small", label: "Small (12px)" },
                    { value: "medium", label: "Medium (13px)" },
                    { value: "large", label: "Large (14px)" },
                  ]}
                  value={s.typography.body_size}
                  onChange={(v) => update("typography.body_size", v)}
                />
              </s-stack>
            </s-section>

            {/* Text */}
            <s-section heading="Text & Labels" description="Customize all copy in the cart drawer">
              <s-stack direction="block" gap="300">
                <s-text-field label="Cart title" value={s.text.cart_title} onInput={(e) => update("text.cart_title", e.target.value)} />
                <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                  <s-text-field label="Empty state title" value={s.text.empty_title} onInput={(e) => update("text.empty_title", e.target.value)} />
                  <s-text-field label="Empty state button" value={s.text.empty_button} onInput={(e) => update("text.empty_button", e.target.value)} />
                </s-grid>
                <s-text-field label="Empty state subtitle" value={s.text.empty_subtitle} onInput={(e) => update("text.empty_subtitle", e.target.value)} />
                <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                  <s-text-field label="Checkout button" value={s.text.checkout_button} onInput={(e) => update("text.checkout_button", e.target.value)} />
                  <s-text-field label="Coupon placeholder" value={s.text.coupon_placeholder} onInput={(e) => update("text.coupon_placeholder", e.target.value)} />
                </s-grid>
                <s-grid gridTemplateColumns="1fr 1fr" gap="300">
                  <s-text-field label="Total label" value={s.text.total_label} onInput={(e) => update("text.total_label", e.target.value)} />
                  <s-text-field label="Subtotal label" value={s.text.subtotal_label} onInput={(e) => update("text.subtotal_label", e.target.value)} />
                </s-grid>
                <s-text-field label="Continue shopping text" value={s.text.continue_shopping} onInput={(e) => update("text.continue_shopping", e.target.value)} />
                <s-text-field
                  label="Continue shopping URL"
                  value={s.text.continue_shopping_url}
                  onInput={(e) => update("text.continue_shopping_url", e.target.value)}
                  placeholder="Leave empty to just close the drawer"
                />
              </s-stack>
            </s-section>

            {/* Layout */}
            <s-section heading="Layout" description="Drawer dimensions, images, and spacing">
              <s-stack direction="block" gap="400">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 4 }}>
                    Drawer width: {s.layout.drawer_width}px
                  </div>
                  <input
                    type="range" min="320" max="560" step="20"
                    value={s.layout.drawer_width}
                    onInput={(e) => update("layout.drawer_width", Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--s-color-icon-brand, #008060)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--s-color-text-secondary, #616161)" }}>
                    <span>320px</span><span>560px</span>
                  </div>
                </div>
                <SegmentedControl
                  label="Position"
                  options={[{ value: "right", label: "Right" }, { value: "left", label: "Left" }]}
                  value={s.layout.drawer_position}
                  onChange={(v) => update("layout.drawer_position", v)}
                />
                <SegmentedControl
                  label="Image style"
                  options={[{ value: "square", label: "Square" }, { value: "rounded", label: "Rounded" }, { value: "circle", label: "Circle" }]}
                  value={s.layout.image_style}
                  onChange={(v) => update("layout.image_style", v)}
                />
                <SegmentedControl
                  label="Image size"
                  options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]}
                  value={s.layout.image_size}
                  onChange={(v) => update("layout.image_size", v)}
                />
                <SegmentedControl
                  label="Item density"
                  options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }]}
                  value={s.layout.density}
                  onChange={(v) => update("layout.density", v)}
                />
                <SegmentedControl
                  label="Quantity controls"
                  options={[{ value: "bordered", label: "Bordered" }, { value: "minimal", label: "Minimal" }]}
                  value={s.layout.qty_style}
                  onChange={(v) => update("layout.qty_style", v)}
                />
                <s-checkbox
                  label="Show variant title"
                  checked={s.layout.show_variant_title || undefined}
                  onChange={(e) => update("layout.show_variant_title", e.target.checked)}
                />
                <s-checkbox
                  label="Show vendor name"
                  checked={s.layout.show_vendor || undefined}
                  onChange={(e) => update("layout.show_vendor", e.target.checked)}
                />
              </s-stack>
            </s-section>

            {/* Sections */}
            <s-section heading="Sections" description="Toggle visibility of drawer sections">
              <SectionToggles
                sections={s.sections}
                onToggle={(key, val) => update("sections." + key, val)}
              />
            </s-section>

            {/* Behavior */}
            <s-section heading="Behavior" description="Control how the drawer opens, closes, and animates">
              <s-stack direction="block" gap="400">
                <s-switch
                  label="Auto-open when item is added to cart"
                  checked={s.behavior.auto_open_on_add || undefined}
                  onChange={(e) => update("behavior.auto_open_on_add", e.target.checked)}
                />
                <SegmentedControl
                  label="Animation"
                  options={[{ value: "slide", label: "Slide" }, { value: "fade", label: "Fade" }, { value: "none", label: "None" }]}
                  value={s.behavior.animation_style}
                  onChange={(v) => update("behavior.animation_style", v)}
                />
                <SegmentedControl
                  label="Animation speed"
                  options={[{ value: "fast", label: "Fast (150ms)" }, { value: "normal", label: "Normal (250ms)" }, { value: "slow", label: "Slow (400ms)" }]}
                  value={s.behavior.animation_speed}
                  onChange={(v) => update("behavior.animation_speed", v)}
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
                <s-divider />
                <s-switch
                  label="Confetti on milestone unlock"
                  checked={s.behavior.confetti || undefined}
                  onChange={(e) => update("behavior.confetti", e.target.checked)}
                />
                <s-text color="subdued">Burst confetti animation when a customer reaches a progress bar milestone</s-text>
                {s.behavior.confetti && (
                  <s-text-field
                    label="Lottie animation URL"
                    value={s.behavior.confetti_lottie_url}
                    onInput={(e) => update("behavior.confetti_lottie_url", e.target.value)}
                    placeholder="https://assets.lottiefiles.com/..."
                    details="Paste a .lottie or .json URL from LottieFiles. Leave empty to use the default confetti."
                  />
                )}
              </s-stack>
            </s-section>

            {/* Advanced */}
            <s-section heading="Advanced">
              <s-stack direction="block" gap="400">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550, marginBottom: 4 }}>Custom CSS</div>
                  <textarea
                    value={s.advanced.custom_css}
                    onInput={(e) => update("advanced.custom_css", e.target.value)}
                    rows={6}
                    placeholder={".cartmax-checkout-btn {\n  text-transform: uppercase;\n}"}
                    style={{
                      width: "100%", padding: "10px 12px",
                      border: "1px solid var(--s-color-border, #ccc)",
                      borderRadius: 8, fontSize: 12,
                      fontFamily: "var(--s-font-family-mono, monospace)",
                      resize: "vertical",
                      background: "var(--s-color-bg-surface, #fff)",
                      color: "var(--s-color-text, #1a1a1a)",
                      lineHeight: 1.6,
                    }}
                  />
                  <s-text color="subdued" style={{ marginTop: 4, display: "block" }}>
                    Applied inside the cart drawer only. Does not affect your theme.
                  </s-text>
                </div>
                <s-button tone="critical" variant="tertiary" onClick={handleReset}>
                  Reset all settings to defaults
                </s-button>
              </s-stack>
            </s-section>

          </div>

          {/* ── Right: Preview ─────────────────── */}
          <div style={{ position: "sticky", top: 60 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: "var(--s-color-text-secondary, #616161)",
              marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              Preview
            </div>
            <CartPreview settings={settings} />
          </div>
        </div>
      </s-page>
    </>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
