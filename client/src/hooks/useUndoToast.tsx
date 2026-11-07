import { useCallback } from "react";
import { Button } from "@mui/material";
import { useSnackbar } from "notistack";
import { clearUndo, registerUndo } from "../lib/undoRegistry";

/** How long the "Undo" toast stays (also how long a delete waits before it is sent). */
export const UNDO_TOAST_MS = 6000;

export interface UndoToastOptions {
  message: string;
  /** Runs when the user clicks "Undo" (or presses Ctrl/⌘+Z while the toast is showing). */
  onUndo: () => void;
  /** Runs when the toast goes away WITHOUT an undo (timeout, dismissed, pushed out by newer toasts). */
  onExpire?: () => void;
}

let counter = 0;

/**
 * "Todo deleted · Undo" toasts. The toast is the single owner of the undo window: whatever closes
 * it without an undo ends the window (`onExpire`), so nothing can be undone after its button is gone.
 */
export function useUndoToast() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  return useCallback(
    ({ message, onUndo, onExpire }: UndoToastOptions) => {
      const id = `undo-${++counter}`;
      let undone = false;
      const undo = () => {
        if (undone) return;
        undone = true;
        clearUndo(id);
        closeSnackbar(id);
        onUndo();
      };
      registerUndo({ id, run: undo });
      enqueueSnackbar(message, {
        key: id,
        variant: "success",
        preventDuplicate: false,
        autoHideDuration: UNDO_TOAST_MS,
        action: (
          <Button size="small" color="primary" onClick={undo} sx={{ fontWeight: 700 }}>
            Undo
          </Button>
        ),
        onClose: () => {
          clearUndo(id);
          if (!undone) onExpire?.();
        },
      });
    },
    [enqueueSnackbar, closeSnackbar],
  );
}
