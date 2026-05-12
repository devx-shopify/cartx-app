import { useState, useCallback, useRef, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

const MODAL_ID = "confirm-dialog";

export default function useConfirm() {
  const shopify = useAppBridge();
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel, cancelLabel, destructive }) => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({ title, message, confirmLabel, cancelLabel, destructive });
      });
    },
    []
  );

  useEffect(() => {
    if (state) {
      requestAnimationFrame(() => shopify.modal.show(MODAL_ID));
    }
  }, [state, shopify]);

  function handleResult(result) {
    shopify.modal.hide(MODAL_ID);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    // Don't setState(null) — modal is hidden, stale content is invisible.
    // Next confirm() call will overwrite state with fresh content.
  }

  const modal = (
    <s-modal id={MODAL_ID} heading={state?.title || ""} onHide={() => handleResult(false)}>
      <s-box padding="400">
        <s-paragraph>{state?.message || ""}</s-paragraph>
      </s-box>
      <s-button slot="secondary-actions" onClick={() => handleResult(false)}>
        {state?.cancelLabel || "Cancel"}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        {...(state?.destructive ? { tone: "critical" } : {})}
        onClick={() => handleResult(true)}
      >
        {state?.confirmLabel || "Confirm"}
      </s-button>
    </s-modal>
  );

  return [confirm, modal];
}
