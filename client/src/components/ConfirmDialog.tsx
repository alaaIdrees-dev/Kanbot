import { useId, type ReactNode } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Name what is affected and warn about consequences (PRJ-4, SPR-2). */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button; focus starts on Cancel so Enter can't delete by accident. */
  destructive?: boolean;
  /** True while the mutation runs: both buttons disabled, spinner on confirm. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** NFR-3: destructive actions need confirmation. MUI Dialog provides the focus trap and Esc to close. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId} component="div">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose} disabled={loading} autoFocus={destructive}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? "error" : "primary"}
          onClick={onConfirm}
          disabled={loading}
          autoFocus={!destructive}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
