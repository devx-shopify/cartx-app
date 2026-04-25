import { useState, useCallback } from "react";
import ConfirmModal from "./ConfirmModal.jsx";

export default function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, destructive }) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmLabel, cancelLabel, destructive, resolve });
    });
  }, []);

  const modal = state ? (
    <ConfirmModal
      open
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      destructive={state.destructive}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }}
    />
  ) : null;

  return [confirm, modal];
}
