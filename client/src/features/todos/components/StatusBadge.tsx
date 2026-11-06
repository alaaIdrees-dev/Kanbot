import { Box, Typography } from "@mui/material";
import { STATUS_ICON } from "../../../design/todoVisuals";
import { STATUS_LABEL } from "../../../lib/constants";
import type { TodoStatus } from "../../../types/api";

/** NFR-5: status is never colour-only; the icon shape and the label both carry it. */
export function StatusBadge({ status }: { status: TodoStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: `status.${status}` }}>
      <Icon fontSize="small" aria-hidden="true" />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {STATUS_LABEL[status]}
      </Typography>
    </Box>
  );
}
