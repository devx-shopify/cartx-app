import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigate, useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { loadConfig, getShopAndTheme, getSelectedTheme } from "../lib/config.server.js";
import { markStep } from "../lib/onboarding.server.js";
import { editRule, loadCatalog, getRule, friendlyError } from "../lib/upsells.server.js";
import VStack from "../components/VStack.jsx";
import { OrderedProducts, Thumb, mergeSelection, productGid } from "../components/UpsellProducts.jsx";
import { unsellableReason } from "../lib/sellable.js";

const LIST_URL = "/app/upsells?tab=rules";
const SAVE_BAR_ID = "upsell-rule-save-bar";

async function context(request) {
  const { admin, session } = await authenticate.admin(request);
  const preferred = await getSelectedTheme(session.shop);
  const { shopId, themeId } = await getShopAndTheme(admin, session, preferred);
  return { admin, session, shopId, themeId };
}

export const loader = async ({ request, params }) => {
  const { shopId, themeId } = await context(request);
  const config = await loadConfig(shopId, themeId);
  const isNew = params.id === "new";
  // "Duplicate" opens a new rule pre-filled with another rule's recommendations.
  const sourceId = isNew ? new URL(request.url).searchParams.get("from") : params.id;

  const rule = await getRule(shopId, themeId, sourceId);
  if (!rule && !isNew) throw new Response("Rule not found", { status: 404 });
  const catalog = rule ? await loadCatalog(shopId, [rule.triggerProductId, ...rule.recommendedIds]) : {};
  const display = (id) => ({ id, title: catalog[id]?.title || `Product ${id}`, image: catalog[id]?.image_url || "", hidden: catalog[id] ? unsellableReason(catalog[id]) : null });

  return {
    isNew,
    cap: config.upsells.max_per_trigger || 10,
    trigger: rule && !isNew ? display(rule.triggerProductId) : null,
    recs: rule ? rule.recommendedIds.map(display) : [],
    enabled: rule ? rule.enabled : true,
  };
};

export const action = async ({ request, params }) => {
  const { admin, session, shopId, themeId } = await context(request);
  try {
    const config = await loadConfig(shopId, themeId);
    const body = await request.json();
    const result = await editRule(admin, shopId, themeId, params.id === "new" ? null : params.id, body, config.upsells.max_per_trigger || 10);
    if (!result.ok) return { ok: false, error: result.error };
    await markStep(session.shop, "settings_configured");
    return { ok: true };
  } catch (err) {
    console.error("[cartx] upsell rule save failed:", err);
    return { ok: false, error: friendlyError(err) };
  }
};

export default function UpsellRule() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  const [trigger, setTrigger] = useState(data.trigger);
  const [recs, setRecs] = useState(data.recs);
  const [enabled, setEnabled] = useState(data.enabled);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const bar = document.getElementById(SAVE_BAR_ID);
    bar?.show();
    return () => bar?.hide();
  }, []);
  useEffect(() => {
    const btn = document.getElementById("upsell-rule-save");
    if (!btn) return;
    if (submitting) { btn.setAttribute("loading", ""); btn.setAttribute("disabled", ""); }
    else { btn.removeAttribute("loading"); btn.removeAttribute("disabled"); }
  }, [submitting]);
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      document.getElementById(SAVE_BAR_ID)?.hide();
      shopify.toast.show(data.isNew ? "Rule created" : "Rule updated");
      navigate(LIST_URL);
    } else if (fetcher.data.error) {
      setFormError(fetcher.data.error);
    }
  }, [fetcher.state, fetcher.data, data.isNew, navigate, shopify]);

  async function pickTrigger() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",
      selectionIds: trigger ? [{ id: productGid(trigger.id) }] : [],
    });
    if (selection?.[0]) {
      const [t] = mergeSelection([], selection);
      setTrigger(t);
      setRecs((r) => r.filter((x) => x.id !== t.id));
    }
  }
  async function pickRecs() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: data.cap,
      action: "select",
      selectionIds: recs.map((p) => ({ id: productGid(p.id) })),
    });
    if (selection) setRecs(mergeSelection(recs, selection).filter((p) => !trigger || p.id !== trigger.id));
  }

  function handleSave() {
    let problem = null;
    if (!trigger) problem = "Select the product that triggers this rule.";
    else if (recs.length === 0) problem = "Select at least one product to recommend.";
    else if (recs.length > data.cap) problem = `A rule can recommend at most ${data.cap} products. Remove ${recs.length - data.cap}.`;
    setFormError(problem);
    if (problem) return;
    fetcher.submit(
      JSON.stringify({ trigger_product_id: trigger.id, recommended_ids: recs.map((r) => r.id), enabled }),
      { method: "POST", encType: "application/json" },
    );
  }
  function handleDiscard() {
    document.getElementById(SAVE_BAR_ID)?.hide();
    navigate(LIST_URL);
  }

  return (
    <s-page heading={data.isNew ? "New product rule" : "Edit product rule"} backAction={{ url: LIST_URL }}>
      <ui-save-bar id={SAVE_BAR_ID}>
        <button variant="primary" id="upsell-rule-save" onClick={handleSave}></button>
        <button onClick={handleDiscard}></button>
      </ui-save-bar>

      <VStack gap={400}>
        {formError && <s-banner tone="critical" heading="The rule wasn't saved">{formError}</s-banner>}
        <s-section heading="Status">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "#f6f6f7", border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 10 }}>
            <s-text variant="bodySm" color="subdued">{enabled ? "Active" : "Inactive"} on storefront</s-text>
            <s-switch label="Rule active" labelAccessibilityVisibility="exclusive" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          </div>
        </s-section>

        <s-section heading="Trigger product" description="The rule applies when this product is in the cart.">
          {trigger ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid var(--s-color-border, #e3e3e3)", borderRadius: 10 }}>
              <Thumb src={trigger.image} alt={trigger.title} />
              <div style={{ flex: 1, minWidth: 0 }}><s-text fontWeight="medium">{trigger.title}</s-text></div>
              <s-button onClick={pickTrigger}>Change product</s-button>
            </div>
          ) : (
            <OrderedProducts items={[]} onChange={() => {}} emptyText="No trigger product yet" onAdd={pickTrigger} addLabel="Select product" />
          )}
        </s-section>

        <s-section heading="Recommended products" description={`Shown in the drawer in this order. Up to ${data.cap} products per rule.`}>
          <VStack gap={300}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <s-text fontWeight="semibold">{recs.length} of {data.cap} products</s-text>
              {recs.length > 0 && <s-button onClick={pickRecs}>Change products</s-button>}
            </div>
            <OrderedProducts items={recs} onChange={setRecs} emptyText="No recommended products yet" onAdd={pickRecs} />
            {recs.length > data.cap && (
              <s-banner tone="warning">
                This rule has {recs.length} products but the limit is {data.cap}. Remove {recs.length - data.cap}, or raise
                the limit in Upsells → Settings.
              </s-banner>
            )}
          </VStack>
        </s-section>
      </VStack>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
