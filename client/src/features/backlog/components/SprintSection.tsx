import type { ReactNode } from "react";
import EditOutlined from "@mui/icons-material/EditOutlined";
import PlayArrow from "@mui/icons-material/PlayArrow";
import { Box, Button, Skeleton, Tooltip, Typography } from "@mui/material";
import { ErrorState } from "../../../components/ErrorState";
import { formatDateRange } from "../../../lib/formatDate";
import { formatPoints, plural } from "../../../lib/pluralize";
import type { SprintTodosState } from "../hooks/useBacklogTodos";
import { useIsListLoaded, useListTotals } from "../hooks/planningSelectors";
import type { Sprint } from "../../../types/api";
import { BacklogSection } from "./BacklogSection";
import { PlanningList, type RowHandlers } from "./PlanningList";

interface SprintSectionProps {
  sprint: Sprint;
  /** Load state of this sprint's todo list. */
  state: SprintTodosState | undefined;
  /** Handlers shared by every row of this sprint's list. */
  rows: RowHandlers;
  /** The currently active sprint, if any: it blocks "Start sprint" (SPR-3). */
  activeSprint: Sprint | undefined;
  onEdit: (sprint: Sprint) => void;
  onStart: (sprint: Sprint) => void;
  onRetry: (sprintId: string) => void;
}

/**
 * SPR-1: a collapsible planned-sprint group above the backlog (wireframe 04):
 * "▾ Sprint 4 (planned)   Nov 3 – Nov 16 · 3 todos · 13 pts   [Edit] [Start sprint]".
 */
export function SprintSection({
  sprint,
  state,
  rows,
  activeSprint,
  onEdit,
  onStart,
  onRetry,
}: SprintSectionProps) {
  const loaded = useIsListLoaded(sprint.id);
  const totals = useListTotals(sprint.id);
  // Counts come from the store's list (so they follow optimistic moves); the sprint's own live
  // stats stand in while the list is still loading.
  const count = loaded ? totals.count : sprint.stats.totalTodos;
  const points = loaded ? totals.points : sprint.stats.totalPoints;
  const dates = formatDateRange(sprint.startDate, sprint.endDate);
  const summary = [dates, `${count} ${plural(count, "todo", "todos")}`, formatPoints(points)]
    .filter(Boolean)
    .join(" · ");

  const startBlockedReason = activeSprint
    ? `${activeSprint.name} is already active. Complete it before starting another sprint.`
    : undefined;

  let body: ReactNode;
  if (!state || state.isPending || (!loaded && !state.isError)) {
    const skeletonRows = Math.min(Math.max(sprint.stats.totalTodos, 1), 5);
    body = (
      <Box role="status" aria-label={`Loading ${sprint.name}`} sx={{ p: 2 }}>
        {Array.from({ length: skeletonRows }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={44} sx={{ mb: 1, borderRadius: 2 }} />
        ))}
      </Box>
    );
  } else if (state.isError) {
    body = (
      <Box sx={{ p: 2 }}>
        <ErrorState
          message={state.error?.message ?? "Could not load this sprint."}
          onRetry={() => onRetry(sprint.id)}
        />
      </Box>
    );
  } else {
    body = (
      <PlanningList
        containerId={sprint.id}
        label={`${sprint.name} todos`}
        rows={rows}
        emptyContent={
          <Typography color="text.secondary" sx={{ px: 2, py: 3, textAlign: "center" }}>
            No todos in this sprint yet. Drag todos here, or use a todo’s actions menu to move it
            in.
          </Typography>
        }
      />
    );
  }

  return (
    <BacklogSection
      title={`${sprint.name} (planned)`}
      summary={summary}
      actions={
        <>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<EditOutlined fontSize="small" />}
            aria-label={`Edit sprint ${sprint.name}`}
            onClick={() => onEdit(sprint)}
          >
            Edit
          </Button>
          {/* A disabled button can't show a tooltip or take focus, so the wrapper carries both. */}
          <Tooltip title={startBlockedReason ?? ""}>
            <Box
              component="span"
              tabIndex={startBlockedReason ? 0 : undefined}
              sx={{ display: "inline-flex", borderRadius: 2 }}
            >
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrow fontSize="small" />}
                aria-label={`Start sprint ${sprint.name}`}
                disabled={!!startBlockedReason}
                onClick={() => onStart(sprint)}
              >
                Start sprint
              </Button>
            </Box>
          </Tooltip>
        </>
      }
    >
      {sprint.goal && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <strong>Goal:</strong> {sprint.goal}
        </Typography>
      )}
      {body}
    </BacklogSection>
  );
}
