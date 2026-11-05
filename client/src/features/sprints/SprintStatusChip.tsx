import { Chip } from "@mui/material";
import { SPRINT_STATUS_LABEL } from "../../lib/constants";
import type { SprintStatus } from "../../types/api";

/** Status badge (SPR-7). The label always carries the meaning; the outline colour is only a hint. */
export function SprintStatusChip({ status }: { status: SprintStatus }) {
  return (
    <Chip
      label={SPRINT_STATUS_LABEL[status]}
      size="small"
      variant="outlined"
      sx={{ color: "text.secondary", borderColor: `sprint.${status}`, fontWeight: 600 }}
    />
  );
}
