import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

/**
 * Shared hook for promotion create/edit routes.
 * Handles save bar wiring, loading state, success toast, and form submission.
 */
export function usePromotionForm({ type, successLabels, saveBarId = "promotion-save-bar" }) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const submitting = fetcher.state !== "idle";
  const formRef = useRef(null);

  const handleSave = useCallback(() => {
    formRef.current?.submit();
  }, []);

  const handleDiscard = useCallback(() => {
    document.getElementById(saveBarId)?.hide();
    navigate("/app/promotions");
  }, [navigate, saveBarId]);

  // Show/hide save bar
  useEffect(() => {
    const saveBar = document.getElementById(saveBarId);
    saveBar?.show();
    return () => saveBar?.hide();
  }, [saveBarId]);

  // Sync loading state to save button
  useEffect(() => {
    const saveBtn = document.getElementById("save-action");
    if (!saveBtn) return;
    if (submitting) {
      saveBtn.setAttribute("loading", "");
      saveBtn.setAttribute("disabled", "");
    } else {
      saveBtn.removeAttribute("loading");
      saveBtn.removeAttribute("disabled");
    }
  }, [submitting]);

  // Success → toast + navigate. If a discount sync warned, surface that instead
  // (the promotion was still saved).
  useEffect(() => {
    if (fetcher.data?.ok) {
      document.getElementById(saveBarId)?.hide();
      const warnings = fetcher.data.warnings;
      if (warnings && warnings.length > 0) {
        shopify.toast.show(warnings[0], { isError: true, duration: 6000 });
      } else {
        shopify.toast.show(successLabels[type] || "Saved");
      }
      navigate("/app/promotions");
    }
  }, [fetcher.data, navigate, shopify, type, successLabels, saveBarId]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify({ ...data, _type: type }), { method: "POST", encType: "application/json" });
  }

  return { formRef, submitting, handleSubmit, handleSave, handleDiscard };
}
