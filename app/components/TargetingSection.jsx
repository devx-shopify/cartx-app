import { useState, useEffect, useMemo, useId, useRef, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import VStack from "./VStack.jsx";

function detectMode(handles) {
  if (!Array.isArray(handles) || handles.length === 0) return "all";
  if (handles.length === 1 && handles[0] === "/") return "all";
  if (handles.every((h) => h.startsWith("/products/"))) return "products";
  if (handles.every((h) => h.startsWith("/collections/"))) return "collections";
  if (handles.every((h) => h.startsWith("/pages/"))) return "specific";
  return "specific";
}

function buildLabelMap(targets) {
  const map = {};
  for (const t of targets || []) map[t.handle] = t.label;
  return map;
}

export default function TargetingSection({ pageHandles, pageTargets, onChange, heading = "Targeting" }) {
  const shopify = useAppBridge();
  const modalId = `targeting-pages-${useId().replace(/[:]/g, "")}`;

  const handles = pageHandles ?? [];
  const targets = pageTargets ?? [];
  const initialMode = useMemo(() => detectMode(handles), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState(initialMode);

  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState("");
  const [draftHandles, setDraftHandles] = useState(() => new Set(handles.filter((h) => h.startsWith("/pages/"))));
  const [pageSearch, setPageSearch] = useState("");
  const [inlineSearch, setInlineSearch] = useState("");
  const loadedRef = useRef(false);

  const labelByHandle = useMemo(() => buildLabelMap(targets), [targets]);

  const loadPages = useCallback(async () => {
    setPagesLoading(true);
    setPagesError("");
    try {
      const res = await fetch("/api/pages");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPages(data.pages || []);
      loadedRef.current = true;
    } catch (err) {
      setPagesError(err.message || "Failed to load pages");
    } finally {
      setPagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "specific" && !loadedRef.current && !pagesLoading) loadPages();
  }, [mode, pagesLoading, loadPages]);

  function commit(nextHandles, nextTargets) {
    onChange({ page_handles: nextHandles, page_targets: nextTargets });
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    if (newMode === "all") {
      commit(["/"], undefined);
    } else if (newMode === "specific") {
      const next = handles.filter((h) => h.startsWith("/pages/"));
      const nextTargets = next.length > 0
        ? next.map((h) => ({ handle: h, label: labelByHandle[h] || h.replace("/pages/", ""), kind: "page" }))
        : undefined;
      commit(next, nextTargets);
    } else if (newMode === "products") {
      const next = handles.filter((h) => h.startsWith("/products/"));
      const nextTargets = next.length > 0
        ? next.map((h) => ({ handle: h, label: labelByHandle[h] || h.replace("/products/", ""), kind: "product" }))
        : undefined;
      commit(next, nextTargets);
    } else if (newMode === "collections") {
      const next = handles.filter((h) => h.startsWith("/collections/"));
      const nextTargets = next.length > 0
        ? next.map((h) => ({ handle: h, label: labelByHandle[h] || h.replace("/collections/", ""), kind: "collection" }))
        : undefined;
      commit(next, nextTargets);
    }
  }

  function openPagePicker() {
    setDraftHandles(new Set(handles.filter((h) => h.startsWith("/pages/"))));
    setPageSearch(inlineSearch);
    setInlineSearch("");
    if (!loadedRef.current) loadPages();
    requestAnimationFrame(() => shopify.modal.show(modalId));
  }

  function toggleDraftHandle(h) {
    setDraftHandles((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function confirmPagePicker() {
    const nextHandles = Array.from(draftHandles);
    const nextTargets = nextHandles.map((h) => {
      const pageHandle = h.replace("/pages/", "");
      const page = pages.find((p) => p.handle === pageHandle);
      return { handle: h, label: page?.title || labelByHandle[h] || pageHandle, kind: "page" };
    });
    commit(nextHandles, nextTargets.length > 0 ? nextTargets : undefined);
    shopify.modal.hide(modalId);
  }

  async function pickProducts() {
    const selection = await shopify.resourcePicker({ type: "product", multiple: true, action: "select" });
    if (!selection) return;
    const items = selection.map((p) => ({ handle: `/products/${p.handle}`, label: p.title, kind: "product" }));
    commit(items.map((i) => i.handle), items);
  }

  async function pickCollections() {
    const selection = await shopify.resourcePicker({ type: "collection", multiple: true, action: "select" });
    if (!selection) return;
    const items = selection.map((c) => ({ handle: `/collections/${c.handle}`, label: c.title, kind: "collection" }));
    commit(items.map((i) => i.handle), items);
  }

  function removeHandle(h) {
    const nextHandles = handles.filter((x) => x !== h);
    const nextTargets = targets.filter((t) => t.handle !== h);
    commit(nextHandles, nextTargets.length > 0 ? nextTargets : undefined);
  }

  const filteredPages = pageSearch.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(pageSearch.trim().toLowerCase()) || p.handle.toLowerCase().includes(pageSearch.trim().toLowerCase()))
    : pages;

  const chips = handles
    .filter((h) => h !== "/")
    .map((h) => ({
      handle: h,
      label: labelByHandle[h] ?? h,
    }));

  return (
    <s-section heading={heading}>
      <VStack gap={400}>
        <s-select label="Show on" value={mode} onChange={(e) => handleModeChange(e.target.value)}>
          <s-option value="all">All pages</s-option>
          <s-option value="specific">Specific pages</s-option>
          <s-option value="products">Product pages</s-option>
          <s-option value="collections">Collection pages</s-option>
        </s-select>

        {mode === "specific" && (
          <VStack gap={300}>
            <SearchRow
              placeholder="Search pages"
              value={inlineSearch}
              onInput={setInlineSearch}
              onFocus={openPagePicker}
              onBrowse={openPagePicker}
            />
            {chips.length > 0 && <Chips chips={chips} onRemove={removeHandle} />}
          </VStack>
        )}

        {mode === "products" && (
          <VStack gap={300}>
            <SearchRow
              placeholder="Search products"
              value={inlineSearch}
              onInput={setInlineSearch}
              onFocus={pickProducts}
              onBrowse={pickProducts}
            />
            {chips.length > 0 && <Chips chips={chips} onRemove={removeHandle} />}
          </VStack>
        )}

        {mode === "collections" && (
          <VStack gap={300}>
            <SearchRow
              placeholder="Search collections"
              value={inlineSearch}
              onInput={setInlineSearch}
              onFocus={pickCollections}
              onBrowse={pickCollections}
            />
            {chips.length > 0 && <Chips chips={chips} onRemove={removeHandle} />}
          </VStack>
        )}
      </VStack>

      <s-modal id={modalId} heading="Select pages" onHide={() => shopify.modal.hide(modalId)}>
        <s-box padding="400">
          <VStack gap={300}>
            <s-text-field
              label="Search"
              placeholder="Search pages…"
              value={pageSearch}
              onInput={(e) => setPageSearch(e.target.value)}
            />
            {pagesLoading && <s-text color="subdued">Loading pages…</s-text>}
            {pagesError && (
              <s-banner tone="critical">
                Could not load pages: {pagesError}.{" "}
                <s-button variant="tertiary" onClick={loadPages}>Retry</s-button>
              </s-banner>
            )}
            {!pagesLoading && !pagesError && pages.length === 0 && (
              <s-banner tone="info">
                No pages found. Create pages in Shopify admin → Online Store → Pages.
              </s-banner>
            )}
            {!pagesLoading && filteredPages.length === 0 && pages.length > 0 && (
              <s-text color="subdued">No pages match &ldquo;{pageSearch}&rdquo;.</s-text>
            )}
            {filteredPages.length > 0 && (
              <s-box border="base" borderRadius="200" padding="300" maxHeight="360px" overflow="auto">
                <VStack gap={200}>
                  {filteredPages.map((p) => {
                    const path = `/pages/${p.handle}`;
                    return (
                      <s-checkbox
                        key={p.id}
                        label={`${p.title} (${path})`}
                        checked={draftHandles.has(path)}
                        onChange={() => toggleDraftHandle(path)}
                      />
                    );
                  })}
                </VStack>
              </s-box>
            )}
          </VStack>
        </s-box>
        <s-button slot="secondary-actions" onClick={() => shopify.modal.hide(modalId)}>
          Cancel
        </s-button>
        <s-button slot="primary-action" variant="primary" onClick={confirmPagePicker}>
          {draftHandles.size > 0 ? `Select ${draftHandles.size}` : "Select"}
        </s-button>
      </s-modal>
    </s-section>
  );
}

function SearchRow({ placeholder, value, onInput, onFocus, onBrowse }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <s-text-field
          type="search"
          label=""
          placeholder={placeholder}
          value={value}
          onInput={(e) => onInput(e.target.value)}
          onFocus={onFocus}
        />
      </div>
      <s-button onClick={onBrowse}>Browse</s-button>
    </div>
  );
}

function Chips({ chips, onRemove }) {
  return (
    <s-box border="base" borderRadius="200" overflow="hidden">
      {chips.map((c, i) => (
        <div
          key={c.handle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 12px",
            ...(i < chips.length - 1
              ? { borderBottom: "var(--s-border-width-1) solid var(--s-color-border)" }
              : {}),
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <s-text type="strong">{c.label}</s-text>
            <s-text color="subdued"> · {c.handle}</s-text>
          </div>
          <s-button
            variant="tertiary"
            tone="critical"
            onClick={() => onRemove(c.handle)}
            accessibilityLabel="Remove"
          >
            <svg slot="icon" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </s-button>
        </div>
      ))}
    </s-box>
  );
}
