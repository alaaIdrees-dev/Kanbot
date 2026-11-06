import { Alert, Button } from "@mui/material";

interface AiErrorAlertProps {
  /** The server's message (502 `AI_ERROR`, 429 `RATE_LIMITED`, network failure…), shown as-is. */
  message: string;
  onRetry?: () => void;
  disabled?: boolean;
}

/** AI-5: the error state of every AI action: the server message and a "Try again" button. */
export function AiErrorAlert({ message, onRetry, disabled }: AiErrorAlertProps) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry} disabled={disabled}>
            Try again
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}
