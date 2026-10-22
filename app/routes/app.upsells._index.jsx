import { useState, useEffect, useMemo, useRef } from "react";
import { useLoaderData, useFetcher, useOutletContext, useSearchParams, useNavigate, useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ThemeSwitcher } from "./app.jsx";
import useConfirm from "../components/useConfirm.jsx";
import VStack from "../components/VStack.jsx";
import TabNav from "../components/TabNav.jsx";
import { OrderedProducts, Thumb, mergeSelection, productGid } from "../components/UpsellProducts.jsx";
import { loadConfig, saveConfig, getShopAndTheme, getSelectedTheme } from "../lib/config.server.js";
import { markStep } from "../lib/onboarding.server.js";
import { UpsellSettingsSchema, UPSELL_CAP_LIMIT } from "../lib/schemas.js";
import { listRules, deleteRules, setRulesEnabled, fetchDefaultProducts, getShopCurrency, friendlyError } from "../lib/upsells.server.js";
import { planImport, applyImport, undoLastImport, lastImport } from "../lib/upsell-import.server.js";
import { MAX_IMPORT_BYTES } from "../lib/upsell-csv.js";
import { numericId } from "../drawer-src/src/upsell-recs.js";

const PAGE_SIZE = 25;
const SETTINGS_KEYS = ["enabled", "mode", "no_match", "fill_with_default", "sold_out", "max_items", "max_per_trigger"];
const TABS = [
  { id: "settings", label: "Settings" },
  { id: "defaults", label: "Default products" },
  { id: "rules", label: "Product rules" },
  { id: "import", label: "Import / export" },
];

async function context(request) {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  return { admin, session, shopId, themeId };
}

export const loader = async ({ request }) => {
  const { shopId, themeId } = await context(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);

  const [config, currency, list, last] = await Promise.all([
    loadConfig(shopId, themeId),
    getShopCurrency(shopId),
    listRules(shopId, themeId, { query, page, pageSize: PAGE_SIZE }),
    lastImport(shopId, themeId),
  ]);

  return {
    upsells: config.upsells,
    currency,
    query,
    page,
    lastImport: last ? { at: last.createdAt.toISOString(), summary: last.summary } : null,
    ...list,
  };
};

// Settings validation shared by the form (inline field errors) and the action.
function settingsErrors(settings) {
  const errors = {};
  for (const key of ["max_items", "max_per_trigger"]) {
    const n = Number(settings[key]);
    if (!Number.isInteger(n) || n < 1 || n > UPSELL_CAP_LIMIT) errors[key] = `Enter a whole number from 1 to ${UPSELL_CAP_LIMIT}.`;
  }
  return errors;
}

async function saveSettings({ admin, session, shopId, themeId }, body) {
  const config = await loadConfig(shopId, themeId);
  const merged = { ...config.upsells };
  for (const key of SETTINGS_KEYS) {
    if (body.settings?.[key] !== undefined) merged[key] = body.settings[key];
  }
  const fieldErrors = settingsErrors(merged);
  if (Object.keys(fieldErrors).length) return { error: "Fix the highlighted fields.", fieldErrors };
  merged.max_items = Number(merged.max_items);
  merged.max_per_trigger = Number(merged.max_per_trigger);
  if (Array.isArray(body.product_ids)) {
    const current = (config.upsells.products || []).map((p) => numericId(p.product_id));
    const next = body.product_ids.map(numericId);
    if (current.join(",") !== next.join(",")) merged.products = await fetchDefaultProducts(admin, next);
  }
  if (!UpsellSettingsSchema.safeParse(merged).success) return { error: "These settings couldn't be saved. Please check them and try again." };
  config.upsells = merged;
  await saveConfig(shopId, themeId, config);
  await markStep(session.shop, "settings_configured");
  return { ok: true, toast: "Upsell settings saved" };
}

async function importRules({ admin, session, shopId, themeId }, body) {
  if (typeof body.csv !== "string" || body.csv.length === 0) return { error: "Choose a CSV file first." };
  if (body.csv.length > MAX_IMPORT_BYTES) return { error: "The file is larger than 1 MB." };
  const config = await loadConfig(shopId, themeId);
  const plan = await planImport(admin, body.csv, config.upsells.max_per_trigger || 10);
  if (plan.error) return { error: plan.error };
  if (body._action === "import_preview") return { preview: { counts: plan.counts, report: plan.report } };
  if (plan.rules.length === 0) return { error: "Nothing to import: every row was skipped." };
  const mode = body.mode === "merge" ? "merge" : "replace";
  const { applied } = await applyImport(shopId, themeId, plan, mode);
  await markStep(session.shop, "settings_configured");
  return { ok: true, imported: true, toast: `${applied} ${applied === 1 ? "rule" : "rules"} imported` };
}

async function handleAction(ctx, body) {
  const { shopId, themeId } = ctx;
  switch (body._action) {
    case "save_settings":
      return saveSettings(ctx, body);
    case "set_mode": {
      const config = await loadConfig(shopId, themeId);
      config.upsells = { ...config.upsells, mode: body.mode === "cart_based" ? "cart_based" : "static" };
      if (body.enable) config.upsells.enabled = true;
      await saveConfig(shopId, themeId, config);
      return { ok: true, toast: "Switched to cart-based recommendations" };
    }
    case "import_preview":
    case "import_apply":
      return importRules(ctx, body);
    case "undo_import": {
      const result = await undoLastImport(shopId, themeId);
      if (result.error) return { error: result.error };
      return { ok: true, toast: `Import undone. ${result.restored} ${result.restored === 1 ? "rule" : "rules"} restored` };
    }
    case "delete_rules": {
      const { count } = await deleteRules(shopId, themeId, body.ids || []);
      return { ok: true, toast: count === 1 ? "Rule deleted" : `${count} rules deleted` };
    }
    case "toggle_rules": {
      const { count } = await setRulesEnabled(shopId, themeId, body.ids || [], body.enabled === true);
      const verb = body.enabled ? "activated" : "deactivated";
      return { ok: true, toast: `${count} ${count === 1 ? "rule" : "rules"} ${verb}` };
    }
    default:
      return { error: "Unknown action" };
  }
}

export const action = async ({ request }) => {
  const ctx = await context(request);
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid request." };
  }
  try {
    return await handleAction(ctx, body);
  } catch (err) {
    console.error("[cartx] upsells action failed:", body?._action, err);
    return { error: friendlyError(err) };
  }
};

// ── helpers ─────────────────────────────────────────────────────

function formatMoney(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function useFetcherToast(fetcher, { errorToasts = true } = {}) {
  const shopify = useAppBridge();
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.toast) shopify.toast.show(fetcher.data.toast);
    else if (errorToasts && fetcher.data.error) shopify.toast.show(fetcher.data.error, { isError: true, duration: 6000 });
  }, [fetcher.state, fetcher.data, errorToasts, shopify]);
}

function EnableRow({ enabled, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "#f6f6f7", border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 10 }}>
      <s-text variant="bodySm" color="subdued">{enabled ? "Enabled" : "Disabled"} on storefront</s-text>
      <s-switch label={label} labelAccessibilityVisibility="exclusive" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

// ── Settings tab ────────────────────────────────────────────────

function SettingsTab({ form, setForm, fieldErrors, totalRules, totalDefaults, goToRules, goToDefaults }) {
  const set = (key) => (value) => setForm({ ...form, [key]: value });
  const cartBased = form.mode === "cart_based";
  return (
    <VStack gap={400}>
      <s-section heading="Upsells" description="Suggest products inside the cart drawer to increase order value.">
        <VStack gap={400}>
          <EnableRow enabled={form.enabled} onChange={set("enabled")} label="Upsells enabled" />
          <s-select
            label="Recommendation mode"
            value={form.mode}
            onChange={(e) => set("mode")(e.target.value)}
            details={cartBased
              ? "Each cart shows the products mapped to what's in it, newest item first."
              : "Every cart shows the default products."}
          >
            <s-option value="static">Same products for every cart</s-option>
            <s-option value="cart_based">Based on cart contents</s-option>
          </s-select>
          {!cartBased && totalDefaults === 0 && (
            <s-banner tone="warning" heading="Nothing to show yet">
              <s-stack direction="block" gap="200">
                <s-text>
                  This mode shows the default products, and there are none. Add default products, or switch the mode to
                  Based on cart contents to use your product rules{totalRules > 0 ? ` (${totalRules})` : ""}.
                </s-text>
                <div><s-button onClick={goToDefaults}>Add default products</s-button></div>
              </s-stack>
            </s-banner>
          )}
          {cartBased && totalRules === 0 && (
            <s-banner tone="warning" heading="No product rules yet">
              <s-stack direction="block" gap="200">
                <s-text>Until you add rules, carts show the default products.</s-text>
                <div><s-button onClick={goToRules}>Add product rules</s-button></div>
              </s-stack>
            </s-banner>
          )}
        </VStack>
      </s-section>

      <s-section heading="Recommendations">
        <VStack gap={400}>
          {cartBased && (
            <s-select label="When no product rule matches" value={form.no_match} onChange={(e) => set("no_match")(e.target.value)}>
              <s-option value="default">Show the default products</s-option>
              <s-option value="none">Show nothing</s-option>
            </s-select>
          )}
          {cartBased && (
            <s-checkbox
              label="Fill remaining slots with the default products"
              details="Used when the rules match fewer products than the maximum shown."
              checked={form.fill_with_default || undefined}
              onChange={(e) => set("fill_with_default")(e.target.checked)}
            />
          )}
          <s-select label="Sold-out products" value={form.sold_out} onChange={(e) => set("sold_out")(e.target.value)}>
            <s-option value="hide">Hide them, the next product takes their place</s-option>
            <s-option value="show">Show them as "Sold out"</s-option>
          </s-select>
          <div style={{ display: "grid", gridTemplateColumns: cartBased ? "1fr 1fr" : "1fr", gap: 16 }}>
            <s-number-field
              label="Maximum products shown"
              min={1}
              max={UPSELL_CAP_LIMIT}
              value={String(form.max_items)}
              onInput={(e) => set("max_items")(e.target.value)}
              details={`1 to ${UPSELL_CAP_LIMIT}`}
              error={fieldErrors.max_items || ""}
            />
            {cartBased && (
              <s-number-field
                label="Maximum recommendations per product"
                min={1}
                max={UPSELL_CAP_LIMIT}
                value={String(form.max_per_trigger)}
                onInput={(e) => set("max_per_trigger")(e.target.value)}
                details={`How many products one rule can recommend, 1 to ${UPSELL_CAP_LIMIT}`}
                error={fieldErrors.max_per_trigger || ""}
              />
            )}
          </div>
        </VStack>
      </s-section>

      <s-section heading="Appearance">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <s-text color="subdued">Card layout, size, heading and button text.</s-text>
          <s-button href="/app/cart-customizer">Customize Cart</s-button>
        </div>
      </s-section>
    </VStack>
  );
}

// ── Default products tab ────────────────────────────────────────

function DefaultsTab({ products, setProducts, currency, maxItems }) {
  const shopify = useAppBridge();
  async function pick() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: products.map((p) => ({ id: productGid(p.id) })),
    });
    if (selection) setProducts(mergeSelection(products, selection));
  }
  return (
    <s-section
      heading="Default products"
      description="Shown when the mode is Same products for every cart, and in cart-based mode when no product rule matches. Shown in this order."
    >
      <VStack gap={300}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <s-text fontWeight="semibold">Products</s-text>
          {products.length > 0 && <s-button onClick={pick}>Change products</s-button>}
        </div>
        <OrderedProducts
          items={products}
          onChange={setProducts}
          emptyText="No default products yet"
          onAdd={pick}
          renderMeta={(p) => (p.price != null ? <s-text color="subdued" variant="bodySm">{formatMoney(p.price, currency)}</s-text> : null)}
        />
        {products.length > Number(maxItems) && (
          <s-banner tone="info">The drawer shows the first {maxItems} (Maximum products shown, in Settings).</s-banner>
        )}
      </VStack>
    </s-section>
  );
}

// ── Product rules tab ───────────────────────────────────────────

function ruleWarnings(rule, catalog, cap) {
  const out = [];
  const trigger = catalog[rule.triggerProductId];
  if (!trigger) out.push({ tone: "critical", text: "Trigger product missing" });
  else if (trigger.status !== "ACTIVE") out.push({ tone: "warning", text: "Trigger product not active" });
  const inactive = rule.recommendedIds.filter((id) => !catalog[id] || catalog[id].status !== "ACTIVE").length;
  if (inactive) out.push({ tone: "warning", text: `${inactive} not active` });
  if (rule.recommendedIds.length > cap) out.push({ tone: "warning", text: `Over the limit of ${cap}` });
  return out;
}

// Rules only drive the drawer in cart-based mode with upsells on. Say so (with a
// one-click fix) instead of letting a merchant wonder why nothing shows.
function RulesInactiveBanner({ upsells }) {
  const fetcher = useFetcher();
  useFetcherToast(fetcher);
  const off = !upsells.enabled;
  const isStatic = upsells.mode !== "cart_based";
  if (!off && !isStatic) return null;
  const message = isStatic
    ? "Recommendation mode is Same products for every cart, so the drawer shows the default products and ignores these rules."
    : "Upsells are turned off, so the drawer doesn't show any recommendations.";
  let buttonLabel = "Switch to cart-based";
  if (off) buttonLabel = isStatic ? "Turn on cart-based upsells" : "Turn on upsells";
  return (
    <s-banner tone="warning" heading="Product rules aren't in use">
      <s-stack direction="block" gap="200">
        <s-text>{message}</s-text>
        <div>
          <s-button
            variant="primary"
            loading={fetcher.state !== "idle" || undefined}
            onClick={() => fetcher.submit(JSON.stringify({ _action: "set_mode", mode: "cart_based", enable: true }), { method: "POST", encType: "application/json" })}
          >
            {buttonLabel}
          </s-button>
        </div>
      </s-stack>
    </s-banner>
  );
}

function RulesTab({ data, cap }) {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const fetcher = useFetcher();
  useFetcherToast(fetcher);
  const [confirmFn, confirmModal] = useConfirm();
  const [selected, setSelected] = useState([]);
  const [searchOpen, setSearchOpen] = useState(!!data.query);
  const [search, setSearch] = useState(data.query);
  const { rules, catalog, total, page } = data;

  useEffect(() => { setSelected([]); }, [rules]);

  useEffect(() => {
    if (search === data.query) return;
    const t = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search) next.set("q", search); else next.delete("q");
        next.delete("page");
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search, data.query, setParams]);

  const display = (id) => ({ id, title: catalog[id]?.title || `Product ${id}`, image: catalog[id]?.image_url || "" });
  const submit = (payload) => fetcher.submit(JSON.stringify(payload), { method: "POST", encType: "application/json" });
  const goToPage = (p) => setParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(p)); return next; });

  async function bulkDelete() {
    const yes = await confirmFn({
      title: "Delete selected",
      message: `Are you sure you want to delete ${selected.length} rule(s)? The products stay in your store. This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (yes) submit({ _action: "delete_rules", ids: selected });
  }

  if (data.totalAll === 0) {
    return (
      <s-section>
        <div style={{ padding: "80px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛍️</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Create your first product rule</div>
          <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 20, maxWidth: 420, marginInline: "auto" }}>
            A rule says: when this product is in the cart, recommend these products. Used when the mode is Based on cart contents.
          </div>
          <s-button variant="primary" onClick={() => navigate("/app/upsells/rules/new")}>Add rule</s-button>
        </div>
      </s-section>
    );
  }

  const allChecked = rules.length > 0 && selected.length === rules.length;
  const someChecked = selected.length > 0 && selected.length < rules.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <VStack gap={400}>
      <RulesInactiveBanner upsells={data.upsells} />
      <s-section padding="none">
        <div style={{ position: "relative", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <s-text fontWeight="semibold">{data.totalAll} {data.totalAll === 1 ? "rule" : "rules"}</s-text>
            <s-button
              variant="tertiary"
              icon="search"
              pressed={searchOpen || undefined}
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearch(""); }}
              accessibilityLabel="Toggle search"
            />
          </div>
          {selected.length > 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", backgroundColor: "var(--s-color-bg-surface, #fff)", zIndex: 1 }}>
              <s-text fontWeight="semibold">{selected.length} selected</s-text>
              {selected.length === 1 && <s-button onClick={() => navigate(`/app/upsells/rules/${selected[0]}`)}>Edit</s-button>}
              <s-button onClick={() => submit({ _action: "toggle_rules", ids: selected, enabled: true })}>Activate</s-button>
              <s-button onClick={() => submit({ _action: "toggle_rules", ids: selected, enabled: false })}>Deactivate</s-button>
              {selected.length === 1 && <s-button onClick={() => navigate(`/app/upsells/rules/new?from=${selected[0]}`)}>Duplicate</s-button>}
              <s-button tone="critical" onClick={bulkDelete}>Delete</s-button>
            </div>
          )}
        </div>

        {searchOpen && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-color-border, #e3e3e3)" }}>
            <s-stack direction="inline" gap="300" alignItems="end">
              <div style={{ flex: 1 }}>
                <s-search-field
                  label="Search rules"
                  labelAccessibilityVisibility="exclusive"
                  placeholder="Search by trigger product..."
                  value={search}
                  onInput={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                />
              </div>
              <s-button variant="tertiary" onClick={() => { setSearchOpen(false); setSearch(""); }}>Cancel</s-button>
            </s-stack>
          </div>
        )}

        {rules.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No rules found</div>
            <div style={{ fontSize: 13, color: "#6d7175" }}>Try a different search term.</div>
          </div>
        ) : (
          <>
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  <s-stack direction="inline" gap="small" alignItems="center">
                    <s-checkbox
                      checked={allChecked || undefined}
                      indeterminate={someChecked || undefined}
                      onChange={() => setSelected(allChecked ? [] : rules.map((r) => r.id))}
                      accessibilityLabel="Select all"
                    />
                    <s-text fontWeight="semibold">When in cart</s-text>
                  </s-stack>
                </s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Recommends</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {rules.map((rule) => {
                  const t = display(rule.triggerProductId);
                  const warnings = ruleWarnings(rule, catalog, cap);
                  const names = rule.recommendedIds.map((id) => display(id).title);
                  return (
                    <s-table-row key={rule.id}>
                      <s-table-cell listSlot="primary">
                        <s-stack direction="inline" gap="small" alignItems="center">
                          <s-checkbox
                            checked={selected.includes(rule.id) || undefined}
                            onChange={() => setSelected((s) => (s.includes(rule.id) ? s.filter((x) => x !== rule.id) : [...s, rule.id]))}
                            accessibilityLabel={`Select ${t.title}`}
                          />
                          <Thumb src={t.image} alt={t.title} />
                          <s-stack direction="block" gap="extra-small">
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={() => navigate(`/app/upsells/rules/${rule.id}`)}
                              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/app/upsells/rules/${rule.id}`); }}
                              style={{ fontWeight: 600, cursor: "pointer" }}
                              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                            >{t.title}</span>
                            {warnings.length > 0 && (
                              <s-stack direction="inline" gap="extra-small">
                                {warnings.map((w) => <s-badge key={w.text} tone={w.tone}>{w.text}</s-badge>)}
                              </s-stack>
                            )}
                          </s-stack>
                        </s-stack>
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge tone={rule.enabled ? "success" : "warning"}>{rule.enabled ? "Active" : "Inactive"}</s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text color="subdued">
                          {names.slice(0, 2).join(", ")}{names.length > 2 ? ` +${names.length - 2} more` : ""}
                        </s-text>
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "14px 20px" }}>
              <s-button variant="tertiary" icon="chevron-left" disabled={page === 0 || undefined} onClick={() => goToPage(page - 1)} accessibilityLabel="Previous page" />
              <s-text color="subdued">
                Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / {total} rules
              </s-text>
              <s-button variant="tertiary" icon="chevron-right" disabled={page + 1 >= pages || undefined} onClick={() => goToPage(page + 1)} accessibilityLabel="Next page" />
            </div>
          </>
        )}
        {confirmModal}
      </s-section>
    </VStack>
  );
}

// ── Import / export tab ─────────────────────────────────────────

const STATUS_BADGE = {
  ok: { tone: "success", label: "Ready" },
  warning: { tone: "warning", label: "Imports with changes" },
  skipped: { tone: "critical", label: "Skipped" },
};

function ImportExportTab({ data }) {
  const fetcher = useFetcher();
  useFetcherToast(fetcher);
  const shopify = useAppBridge();
  const [confirmFn, confirmModal] = useConfirm();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null); // { name, text }
  const [mode, setMode] = useState("replace");
  const [preview, setPreview] = useState(null);
  const busy = fetcher.state !== "idle";
  const pendingAction = busy ? fetcher.json?._action : null;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.preview) setPreview(fetcher.data.preview);
    if (fetcher.data.imported) { setPreview(null); setFile(null); }
  }, [fetcher.state, fetcher.data]);

  const submit = (payload) => fetcher.submit(JSON.stringify(payload), { method: "POST", encType: "application/json" });

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { shopify.toast.show("The file is larger than 1 MB.", { isError: true }); return; }
    const text = await f.text();
    setFile({ name: f.name, text });
    setPreview(null);
    submit({ _action: "import_preview", csv: text });
  }

  async function apply() {
    if (mode === "replace" && data.totalAll > 0) {
      const yes = await confirmFn({
        title: "Replace all rules",
        message: `This deletes the ${data.totalAll} existing ${data.totalAll === 1 ? "rule" : "rules"} on this theme and imports the file. You can undo it afterwards.`,
        confirmLabel: "Replace and import",
        destructive: true,
      });
      if (!yes) return;
    }
    submit({ _action: "import_apply", csv: file.text, mode });
  }

  async function undo() {
    const yes = await confirmFn({
      title: "Undo last import",
      message: "Restores the product rules exactly as they were before the last import. Changes made since then are lost.",
      confirmLabel: "Undo import",
      destructive: true,
    });
    if (yes) submit({ _action: "undo_import" });
  }

  const issues = preview ? preview.report.filter((r) => r.status !== "ok") : [];
  const importable = preview ? preview.counts.ok + preview.counts.warning : 0;
  // Authenticated fetch (App Bridge adds the session token) + save as a file,
  // instead of window.open, which isn't iframe-safe.
  const [downloading, setDownloading] = useState(null);
  async function download(url, fallbackName) {
    setDownloading(url);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || fallbackName;
      const href = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error("[cartx] upsell CSV download failed:", err);
      shopify.toast.show("Couldn't download the file. Please try again.", { isError: true });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <VStack gap={400}>
      <s-section heading="Export" description="Download your product rules, or a sample sheet to fill in.">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <s-text color="subdued">
            One row per rule: a trigger product, then its recommendations in order. Products are identified by handle.
          </s-text>
          <s-stack direction="inline" gap="small">
            <s-button onClick={() => download("/app/upsells/sample", "cartx-upsell-rules-sample.csv")}
              loading={downloading === "/app/upsells/sample" || undefined}>Download sample</s-button>
            <s-button onClick={() => download("/app/upsells/export", "cartx-upsell-rules.csv")}
              disabled={data.totalAll === 0 || undefined} loading={downloading === "/app/upsells/export" || undefined}>Export rules</s-button>
          </s-stack>
        </div>
      </s-section>

      <s-section heading="Import" description="Upload a CSV in the same format as the sample. You'll see a preview before anything changes.">
        <VStack gap={400}>
          <s-select label="Import mode" value={mode} onChange={(e) => setMode(e.target.value)}
            details={mode === "replace"
              ? "Every existing rule on this theme is replaced by the rules in the file."
              : "Rules for the trigger products in the file are replaced; all other rules are kept."}>
            <s-option value="replace">Replace all rules</s-option>
            <s-option value="merge">Merge with existing rules</s-option>
          </s-select>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
            <s-button onClick={() => inputRef.current?.click()} loading={(busy && pendingAction === "import_preview") || undefined}>
              {file ? "Choose another file" : "Choose CSV file"}
            </s-button>
            {file && <s-text color="subdued">{file.name}</s-text>}
          </div>

          {preview && (
            <VStack gap={300}>
              <s-stack direction="inline" gap="small">
                <s-badge tone="success">{preview.counts.ok} ready</s-badge>
                {preview.counts.warning > 0 && <s-badge tone="warning">{preview.counts.warning} with changes</s-badge>}
                {preview.counts.skipped > 0 && <s-badge tone="critical">{preview.counts.skipped} skipped</s-badge>}
              </s-stack>
              {issues.length > 0 && (
                <div style={{ border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 10, maxHeight: 360, overflowY: "auto" }}>
                  {issues.map((r, i) => (
                    <div key={r.line} style={{ padding: "10px 14px", borderBottom: i < issues.length - 1 ? "1px solid var(--s-color-border, #e3e3e3)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <s-text color="subdued" variant="bodySm">Row {r.line}</s-text>
                        <s-text fontWeight="medium">{r.triggerTitle || r.trigger || "(empty)"}</s-text>
                        <s-badge tone={STATUS_BADGE[r.status].tone}>{STATUS_BADGE[r.status].label}</s-badge>
                      </div>
                      {r.messages.map((m) => <div key={m}><s-text color="subdued" variant="bodySm">{m}</s-text></div>)}
                    </div>
                  ))}
                </div>
              )}
              <s-stack direction="inline" gap="small">
                <s-button variant="primary" onClick={apply} disabled={importable === 0 || undefined}
                  loading={(busy && pendingAction === "import_apply") || undefined}>
                  Import {importable} {importable === 1 ? "rule" : "rules"}
                </s-button>
                <s-button variant="tertiary" onClick={() => { setPreview(null); setFile(null); }}>Cancel</s-button>
              </s-stack>
            </VStack>
          )}
        </VStack>
      </s-section>

      {data.lastImport && (
        <s-section heading="Last import">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <s-text color="subdued">
              {new Date(data.lastImport.at).toLocaleString()} · {data.lastImport.summary?.mode === "merge" ? "Merged" : "Replaced all rules"}
              {" · "}{(data.lastImport.summary?.ok || 0) + (data.lastImport.summary?.warning || 0)} imported
            </s-text>
            <s-button tone="critical" onClick={undo} loading={(busy && pendingAction === "undo_import") || undefined}>Undo last import</s-button>
          </div>
        </s-section>
      )}
      {confirmModal}
    </VStack>
  );
}

// ── Page ────────────────────────────────────────────────────────

function settingsFrom(upsells) {
  const out = {};
  for (const key of SETTINGS_KEYS) out[key] = upsells[key];
  return out;
}
function defaultsFrom(upsells) {
  return (upsells.products || []).map((p) => ({ id: numericId(p.product_id), title: p.title, image: p.image_url, price: p.price }));
}

export default function Upsells() {
  const data = useLoaderData();
  const navigate = useNavigate();
  const { themes, activeThemeId, mainThemeId } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "settings";
  const settingsFetcher = useFetcher();
  useFetcherToast(settingsFetcher, { errorToasts: false }); // shown in a banner above the tabs

  // Settings + default products share one save bar. Re-sync only when the
  // saved values change (not on rule searches / paging, which also reload).
  const savedKey = JSON.stringify(data.upsells);
  const [form, setForm] = useState(() => settingsFrom(data.upsells));
  const [products, setProducts] = useState(() => defaultsFrom(data.upsells));
  useEffect(() => {
    setForm(settingsFrom(data.upsells));
    setProducts(defaultsFrom(data.upsells));
  }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    const saved = settingsFrom(data.upsells);
    const formChanged = SETTINGS_KEYS.some((k) => String(form[k]) !== String(saved[k]));
    const productsChanged = products.map((p) => p.id).join(",") !== defaultsFrom(data.upsells).map((p) => p.id).join(",");
    return formChanged || productsChanged;
  }, [form, products, data.upsells]);

  useEffect(() => {
    const el = document.getElementById("upsells-save-bar");
    if (!el) return;
    if (dirty) el.show(); else el.hide();
  }, [dirty]);

  const fieldErrors = settingsErrors(form);
  const saveError = settingsFetcher.state === "idle" ? settingsFetcher.data?.error : null;

  function handleSave() {
    if (Object.keys(fieldErrors).length) {
      setTab("settings");
      return;
    }
    settingsFetcher.submit(
      JSON.stringify({ _action: "save_settings", settings: form, product_ids: products.map((p) => p.id) }),
      { method: "POST", encType: "application/json" },
    );
  }
  function handleDiscard() {
    setForm(settingsFrom(data.upsells));
    setProducts(defaultsFrom(data.upsells));
  }
  const setTab = (id) => setParams((prev) => {
    const next = new URLSearchParams();
    next.set("tab", id);
    if (id === "rules") { if (prev.get("q")) next.set("q", prev.get("q")); if (prev.get("page")) next.set("page", prev.get("page")); }
    return next;
  });

  return (
    <>
      <ui-save-bar id="upsells-save-bar">
        <button variant="primary" onClick={handleSave} {...(settingsFetcher.state !== "idle" ? { disabled: true } : {})}></button>
        <button onClick={handleDiscard}></button>
      </ui-save-bar>

      <s-page heading="Upsells">
        <s-button slot="primary-action" variant="primary" onClick={() => navigate("/app/upsells/rules/new")}>
          Add rule
        </s-button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <ThemeSwitcher themes={themes} activeThemeId={activeThemeId} mainThemeId={mainThemeId} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {saveError && <s-banner tone="critical" heading="Settings weren't saved">{saveError}</s-banner>}
          <TabNav tabs={TABS} value={tab} onChange={setTab} />
          {tab === "settings" && (
            <SettingsTab
              form={form}
              setForm={setForm}
              fieldErrors={fieldErrors}
              totalRules={data.totalAll}
              totalDefaults={products.length}
              goToRules={() => setTab("rules")}
              goToDefaults={() => setTab("defaults")}
            />
          )}
          {tab === "defaults" && <DefaultsTab products={products} setProducts={setProducts} currency={data.currency} maxItems={form.max_items} />}
          {tab === "rules" && <RulesTab data={data} cap={Number(data.upsells.max_per_trigger) || 10} />}
          {tab === "import" && <ImportExportTab data={data} />}
        </div>
      </s-page>
    </>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
