import type { ReactNode } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { formatDaysLeft } from "../../../lib/dateOnly";
import { formatDateRange } from "../../../lib/formatDate";
import type { Sprint } from "../../../types/api";

/**
 * SPR-4: sprint name, dates, days left, goal and the progress bar (`donePoints / totalPoints`, plus
 * `doneTodos / totalTodos`). The numbers come from the board cache, so they move with a drag.
 */
export function SprintHeader({ sprint, actions }: { sprint: Sprint; actions: ReactNode }) {
  const { stats } = sprint;
  const percent = stats.totalPoints > 0 ? (stats.donePoints / stats.totalPoints) * 100 : 0;
  const meta = [formatDateRange(sprint.startDate, sprint.endDate), formatDaysLeft(sprint.endDate)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2, mb: 2.5 }}>
      <Box sx={{ flex: 1, minWidth: 260 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 2 }}>
          <Typography variant="h3" component="h2">
            {sprint.name}
          </Typography>
          {meta && <Typography color="text.secondary">{meta}</Typography>}
        </Box>
        {sprint.goal && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            <strong>Goal:</strong> {sprint.goal}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, mt: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={percent}
            aria-label="Sprint progress in story points"
            sx={{ flex: "1 1 200px", maxWidth: 420 }}
          />
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {stats.donePoints} / {stats.totalPoints} pts done · {stats.doneTodos} /{" "}
            {stats.totalTodos} todos
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1.5 }}>{actions}</Box>
    </Box>
  );
}
