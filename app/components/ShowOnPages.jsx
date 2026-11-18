import { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import VStack from "./VStack.jsx";

// "Show on" for a drawer section (Upsells, Special Offer): every page, only the
// listed pages, or every page except them. Value: { mode, page_handles,
// page_targets }. Pages are storefront paths ("/collections/b2g2-new"); the
// drawer ignores the query string, so "?page=2" still matches.

const MODES = [
  { value: "all", label: "All pages" },
  { value: "only", label: "Only on specific pages" },
  { value: "except", label: "All pages except specific pages" },
];

// "https://store.com/collections/x?page=2" or "collections/x/" → "/collections/x"
export function normalizePath(input) {
  let p = String(input || "").trim();
  if (!p) return "";
  p = p.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p === "/" ? "" : p.toLowerCase();
}

export default function ShowOnPages({ value, onChange, label = "Show on" }) {
  const shopify = useAppBridge();
  const mode = value?.mode === "only" || value?.mode === "except" ? value.mode : "all";
  const handles = (value?.page_handles || []).filter((h) => h && h !== "/");
  const targets = value?.page_targets || [];
  const [path, setPath] = useState("");
  const [pathError, setPathError] = useState("");

  const labelOf = (h) => targets.find((t) => t.handle === h)?.label || "";

  function commit(nextMode, nextHandles, nextTargets) {
    onChange({
      mode: nextMode,
      page_handles: nextHandles,
      page_targets: nextTargets.filter((t) => nextHandles.includes(t.handle)),
    });
  }

  function addItems(items) {
    const nextHandles = [...handles];
    const nextTargets = [...targets];
    for (const it of items) {
      if (!it.handle || nextHandles.includes(it.handle)) continue;
      nextHandles.push(it.handle);
      nextTargets.push(it);
    }
    commit(mode, nextHandles, nextTargets);
  }

  async function pick(type) {
    const selection = await shopify.resourcePicker({ type, multiple: true, action: "select" });
    if (!selection) return;
    const prefix = type === "collection" ? "/collections/" : "/products/";
    addItems(selection.map((r) => ({ handle: `${prefix}${r.handle}`, label: r.title || "", kind: type })));
  }

  function addPath() {
    const p = normalizePath(path);
    if (!p) {
      setPathError("Enter a page path, e.g. /pages/sale or /collections/b2g2-new.");
      return;
    }
    setPathError("");
    setPath("");
    addItems([{ handle: p, label: "", kind: "path" }]);
  }

  function remove(h) {
    commit(mode, handles.filter((x) => x !== h), targets);
  }

  return (
    <VStack gap={300}>
      <s-select label={label} value={mode} onChange={(e) => commit(e.target.value, handles, targets)}>
        {MODES.map((m) => (
          <s-option key={m.value} value={m.value}>{m.label}</s-option>
        ))}
      </s-select>

      {mode !== "all" && (
        <VStack gap={300}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <s-button onClick={() => pick("collection")}>Add collections</s-button>
            <s-button onClick={() => pick("product")}>Add products</s-button>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <s-text-field
                label="Or add a page path"
                placeholder="/pages/sale"
                value={path}
                error={pathError || undefined}
                onInput={(e) => setPath(e.target.value)}
              />
            </div>
            <div style={{ paddingTop: 22 }}>
              <s-button onClick={addPath}>Add</s-button>
            </div>
          </div>

          {handles.length > 0 ? (
            <s-box border="base" borderRadius="200" overflow="hidden">
              {handles.map((h, i) => (
                <div
                  key={h}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    ...(i < handles.length - 1
                      ? { borderBottom: "var(--s-border-width-1) solid var(--s-color-border)" }
                      : {}),
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {labelOf(h) ? <s-text type="strong">{labelOf(h)} </s-text> : null}
                    <s-text color="subdued">{h}</s-text>
                  </div>
                  <s-button variant="tertiary" tone="critical" onClick={() => remove(h)} accessibilityLabel={`Remove ${h}`}>
                    Remove
                  </s-button>
                </div>
              ))}
            </s-box>
          ) : (
            <s-text color="subdued">No pages added yet, so it still shows on every page.</s-text>
          )}
          <s-text color="subdued">
            {mode === "only"
              ? "Shows only on these pages. Pagination and filters (?page=2) still match."
              : "Hidden on these pages and shown everywhere else. Pagination and filters (?page=2) still match."}
          </s-text>
        </VStack>
      )}
    </VStack>
  );
}
