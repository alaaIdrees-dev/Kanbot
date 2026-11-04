import ErrorOutlined from "@mui/icons-material/ErrorOutlined";
import { Box, Button, Typography } from "@mui/material";

interface ErrorStateProps {
  /** The server's message (see implementation plan §4.2), shown as-is. */
  message: string;
  title?: string;
  /** Renders a "Try again" button (AI-5: 502 AI_ERROR, 429 RATE_LIMITED). */
  onRetry?: () => void;
}

/** Inline error for a section or panel. For a whole page use FullPageError. */
export function ErrorState({ message, title = "Something went wrong", onRetry }: ErrorStateProps) {
  return (
    <Box
      role="alert"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1,
        px: 3,
        py: 5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "tint.error",
      }}
    >
      <ErrorOutlined aria-hidden="true" color="error" sx={{ fontSize: 36 }} />
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" color="inherit" onClick={onRetry} sx={{ mt: 1 }}>
          Try again
        </Button>
      )}
    </Box>
  );
}
