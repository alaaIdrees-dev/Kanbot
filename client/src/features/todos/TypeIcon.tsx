import { Box, Tooltip, Typography } from "@mui/material";
import { TYPE_ICON } from "../../design/todoVisuals";
import { TYPE_LABEL } from "../../lib/constants";
import type { TodoType } from "../../types/api";

interface TypeIconProps {
  type: TodoType;
  /** Dense rows (TodoRow, board cards) show the icon only, with the label in a tooltip. */
  withLabel?: boolean;
}

/** NFR-5: type is conveyed by icon shape (+ optional label), never by colour alone. */
export function TypeIcon({ type, withLabel = false }: TypeIconProps) {
  const Icon = TYPE_ICON[type];
  const label = TYPE_LABEL[type];

  if (!withLabel) {
    return (
      <Tooltip title={label}>
        <Box sx={{ display: "inline-flex", color: `todoType.${type}` }}>
          <Icon fontSize="small" aria-label={label} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: `todoType.${type}` }}>
      <Icon fontSize="small" aria-hidden="true" />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </Box>
  );
}
