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

  // Wire up save bar button events
  useEffect(() => {
    const saveBtn = document.getElementById("save-action");
    const discardBtn = document.getElementById("discard-action");
    saveBtn?.addEventListener("click", handleSave);
    discardBtn?.addEventListener("click", handleDiscard);
    return () => {
      saveBtn?.removeEventListener("click", handleSave);
      discardBtn?.removeEventListener("click", handleDiscard);
    };
  }, [handleSave, handleDiscard]);

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

  // Success → toast + navigate
  useEffect(() => {
    if (fetcher.data?.ok) {
      document.getElementById(saveBarId)?.hide();
      shopify.toast.show(successLabels[type] || "Saved");
      navigate("/app/promotions");
    }
  }, [fetcher.data, navigate, shopify, type, successLabels, saveBarId]);

  function handleSubmit(data) {
    fetcher.submit(JSON.stringify({ ...data, _type: type }), { method: "POST", encType: "application/json" });
  }

  return { formRef, submitting, handleSubmit };
}
