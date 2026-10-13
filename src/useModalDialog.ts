import { useEffect, useRef, type RefObject } from "react";

/** Native modality plus a focus fallback when the opener was removed (e.g. delete). */
export function useModalDialog(
  dialog: RefObject<HTMLDialogElement | null>,
  open: boolean,
  fallback: RefObject<HTMLElement | null>,
) {
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      node.showModal();
      node.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus();
    } else if (!open) {
      if (node.open) node.close();
      if (opener.current) {
        if (opener.current.isConnected) opener.current.focus();
        else fallback.current?.focus();
        opener.current = null;
      }
    }
  }, [dialog, open, fallback]);
}
