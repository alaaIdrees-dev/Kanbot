import { Box, Typography } from "@mui/material";
import { PRIORITY_ICON } from "../../design/todoVisuals";
import { PRIORITY_LABEL } from "../../lib/constants";
import type { TodoPriority } from "../../types/api";

/**
 * NFR-5: priority is never colour-only — the icon shape and the label text both carry the meaning.
 * Marker colours are only guaranteed 3:1, so the label uses `text.secondary` (design-system.md §8.3).
 */
export function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: `priority.${priority}` }}>
      <Icon fontSize="small" aria-hidden="true" />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {PRIORITY_LABEL[priority]}
      </Typography>
    </Box>
  );
}
