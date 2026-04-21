import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadConfig,
  saveConfig,
  getShopAndTheme,
} from "../lib/config.server.js";
import { generateId } from "../lib/helpers.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);

  // Collect all bar sources for preview
  const barSources = [];
  for (const offer of config.offers) {
    if (offer.enabled && offer.bar?.show) {
      barSources.push({
        source: "Offer",
        name: offer.name,
        threshold:
          offer.trigger.price_threshold || offer.trigger.quantity_threshold,
        type: offer.trigger.price_threshold ? "price" : "quantity",
      });
    }
  }
  for (const coupon of config.coupons) {
    if (coupon.enabled && coupon.bar?.show && coupon.trigger) {
      barSources.push({
        source: "Coupon",
        name: coupon.code,
        threshold: coupon.trigger.threshold,
        type: coupon.trigger.type,
      });
    }
  }
  for (const claim of config.claim_gifts) {
    if (claim.enabled && claim.bar?.show) {
      barSources.push({
        source: "Claim Gift",
        name: claim.name,
        threshold: claim.trigger.threshold,
        type: claim.trigger.type,
      });
    }
  }

  return {
    progressBar: config.progress_bar,
    barSources,
  };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shopId, themeId } = await getShopAndTheme(admin, session);
  const config = await loadConfig(shopId, themeId);
  const body = await request.json();

  if (body._action === "save_settings") {
    config.progress_bar.enabled = body.enabled;
    config.progress_bar.all_complete_message = body.all_complete_message;
  } else if (body._action === "add_milestone") {
    config.progress_bar.visual_milestones.push({
      id: generateId(),
      enabled: true,
      trigger: { type: body.trigger_type, threshold: Number(body.threshold) },
      label: body.label,
      sub_label: body.sub_label || undefined,
      icon_url: body.icon_url || undefined,
      page_handles: body.page_handles
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
      audience: body.audience,
    });
  } else if (body._action === "delete_milestone") {
    config.progress_bar.visual_milestones =
      config.progress_bar.visual_milestones.filter((m) => m.id !== body.id);
  } else if (body._action === "toggle_milestone") {
    const m = config.progress_bar.visual_milestones.find(
      (m) => m.id === body.id
    );
    if (m) m.enabled = !m.enabled;
  }

  await saveConfig(shopId, themeId, config);
  return { ok: true };
};

function MilestoneForm({ onAdd, submitting }) {
  const [label, setLabel] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [triggerType, setTriggerType] = useState("price");
  const [threshold, setThreshold] = useState("");
  const [pageHandles, setPageHandles] = useState("/");
  const [audience, setAudience] = useState("all");

  function handleAdd() {
    if (!label.trim() || !threshold) return;
    onAdd({
      _action: "add_milestone",
      label,
      sub_label: subLabel,
      trigger_type: triggerType,
      threshold,
      page_handles: pageHandles,
      audience,
    });
    setLabel("");
    setSubLabel("");
    setThreshold("");
  }

  return (
    <s-section heading="Add milestone">
      <s-text-field
        label="Label"
        value={label}
        onInput={(e) => setLabel(e.currentTarget.value)}
        placeholder="Free Shipping"
      />
      <s-text-field
        label="Sub label (optional)"
        value={subLabel}
        onInput={(e) => setSubLabel(e.currentTarget.value)}
      />
      <s-select
        label="Trigger type"
        value={triggerType}
        onChange={(e) => setTriggerType(e.currentTarget.value)}
      >
        <s-option value="price">Price</s-option>
        <s-option value="quantity">Quantity</s-option>
      </s-select>
      <s-text-field
        label="Threshold"
        type="number"
        value={String(threshold)}
        onInput={(e) => setThreshold(e.currentTarget.value)}
      />
      <s-text-field
        label="Page handles (comma-separated)"
        value={pageHandles}
        onInput={(e) => setPageHandles(e.currentTarget.value)}
      />
      <s-select
        label="Audience"
        value={audience}
        onChange={(e) => setAudience(e.currentTarget.value)}
      >
        <s-option value="all">Everyone</s-option>
        <s-option value="signed_in">Signed-in customers</s-option>
        <s-option value="guest">Guests only</s-option>
        <s-option value="vip_tag">VIP customers</s-option>
      </s-select>
      <s-button
        onClick={handleAdd}
        {...(submitting ? { loading: true } : {})}
      >
        Add milestone
      </s-button>
    </s-section>
  );
}

export default function ProgressBarPage() {
  const { progressBar, barSources } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";

  const [enabled, setEnabled] = useState(progressBar.enabled);
  const [allCompleteMessage, setAllCompleteMessage] = useState(
    progressBar.all_complete_message
  );

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Saved");
    }
  }, [fetcher.data, shopify]);

  function saveSettings() {
    fetcher.submit(
      JSON.stringify({
        _action: "save_settings",
        enabled,
        all_complete_message: allCompleteMessage,
      }),
      { method: "POST", encType: "application/json" }
    );
  }

  function addMilestone(data) {
    fetcher.submit(JSON.stringify(data), {
      method: "POST",
      encType: "application/json",
    });
  }

  function milestoneAction(action, id) {
    fetcher.submit(JSON.stringify({ _action: action, id }), {
      method: "POST",
      encType: "application/json",
    });
  }

  return (
    <s-page heading="Progress Bar">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={saveSettings}
        {...(submitting ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="General">
        <s-checkbox
          label="Enable progress bar"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
        <s-text-field
          label="All tiers complete message"
          value={allCompleteMessage}
          onInput={(e) => setAllCompleteMessage(e.currentTarget.value)}
          placeholder="You unlocked all rewards!"
        />
      </s-section>

      <s-section heading="Bar preview — source breakdown">
        {barSources.length === 0 ? (
          <s-paragraph>
            No bar entries yet. Add offers, coupons, or claim gifts with bar
            visibility enabled, or add visual milestones below.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="tight">
            {barSources.map((s, i) => (
              <s-paragraph key={i}>
                {s.type === "price" ? `Rs.${s.threshold}` : `${s.threshold} items`}
                {" — "}
                {s.source} ({s.name})
              </s-paragraph>
            ))}
          </s-stack>
        )}

        {progressBar.visual_milestones.length > 0 && (
          <s-stack direction="block" gap="tight">
            {progressBar.visual_milestones.map((m) => (
              <s-paragraph key={m.id}>
                {m.trigger.type === "price"
                  ? `Rs.${m.trigger.threshold}`
                  : `${m.trigger.threshold} items`}
                {" — Visual Milestone ("}
                {m.label})
              </s-paragraph>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section heading="Visual milestones">
        <s-banner tone="info">
          Milestones are bar-only markers with no reward. Use for things like
          "Free Shipping" or "VIP Status".
        </s-banner>

        {progressBar.visual_milestones.length > 0 && (
          <s-stack direction="block" gap="base">
            {progressBar.visual_milestones.map((m) => (
              <s-section key={m.id}>
                <s-stack direction="block" gap="tight">
                  <s-stack
                    direction="inline"
                    align="space-between"
                    block-align="center"
                  >
                    <s-stack direction="inline" gap="tight" block-align="center">
                      <s-heading>{m.label}</s-heading>
                      <s-badge tone={m.enabled ? "success" : "warning"}>
                        {m.enabled ? "Active" : "Inactive"}
                      </s-badge>
                    </s-stack>
                  </s-stack>
                  <s-paragraph>
                    {m.trigger.type === "price"
                      ? `Rs.${m.trigger.threshold}`
                      : `${m.trigger.threshold} items`}
                    {m.sub_label ? ` · ${m.sub_label}` : ""}
                  </s-paragraph>
                  <s-stack direction="inline" gap="tight">
                    <s-button
                      onClick={() =>
                        milestoneAction("toggle_milestone", m.id)
                      }
                    >
                      {m.enabled ? "Disable" : "Enable"}
                    </s-button>
                    <s-button
                      tone="critical"
                      onClick={() =>
                        milestoneAction("delete_milestone", m.id)
                      }
                    >
                      Delete
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-section>
            ))}
          </s-stack>
        )}
      </s-section>

      <MilestoneForm onAdd={addMilestone} submitting={submitting} />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
