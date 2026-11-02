import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Decorative icon (hidden from assistive tech). */
  icon?: ReactNode;
  /** Call to action, e.g. a <Button> ("Create your first project"). */
  action?: ReactNode;
}

/** NFR-2: every list/view needs an empty state that says what to do next. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1.5,
        px: 3,
        py: 6,
        border: "1px dashed",
        borderColor: "border.strong",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      {icon && (
        <Box aria-hidden="true" sx={{ color: "text.muted", display: "flex", "& svg": { fontSize: 40 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
