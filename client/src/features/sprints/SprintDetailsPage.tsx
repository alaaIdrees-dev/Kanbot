import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import SearchOff from "@mui/icons-material/SearchOff";
import { Box, Button, Paper, Skeleton, Typography } from "@mui/material";
import { ApiError } from "../../api/client";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { useSprintBoard } from "../../hooks/useBoard";
import { allTodos, completionPercent } from "../../lib/boardColumns";
import { formatDateRange } from "../../lib/formatDate";
import { plural } from "../../lib/pluralize";
import { wantsSummary } from "../../lib/sprintPageState";
import { useBoardUiStore } from "../../stores/boardUiStore";
import { SprintSummaryPanel } from "../ai/SprintSummaryPanel";
import { TodoDetailsDialog } from "../todos/TodoDetailsDialog";
import { PointsBadge } from "../todos/PointsBadge";
import { PriorityBadge } from "../todos/PriorityBadge";
import { StatusBadge } from "../todos/StatusBadge";
import { TypeIcon } from "../todos/TypeIcon";
import { SprintStatusChip } from "./SprintStatusChip";
import type { Todo } from "../../types/api";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "surface.sunken" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h3" component="p" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function TodoLine({ todo, onOpen }: { todo: Todo; onOpen?: (todo: Todo) => void }) {
  const cells = (
    <>
      <Typography variant="mono" sx={{ color: "text.muted", width: 72, flexShrink: 0 }} noWrap>
        {todo.key}
      </Typography>
      <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
        {todo.title}
      </Typography>
      <Box sx={{ display: { xs: "none", sm: "flex" }, flexShrink: 0 }}>
        <StatusBadge status={todo.status} />
      </Box>
      <TypeIcon type={todo.type} />
      <Box sx={{ display: { xs: "none", md: "flex" }, flexShrink: 0 }}>
        <PriorityBadge priority={todo.priority} />
      </Box>
      <PointsBadge points={todo.storyPoints} />
    </>
  );
  const sx = {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    width: "100%",
    px: 2,
    py: 1.25,
    textAlign: "left",
    font: "inherit",
  } as const;
  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      {onOpen ? (
        <Button
          color="inherit"
          onClick={() => onOpen(todo)}
          sx={{ ...sx, textTransform: "none", fontWeight: 400 }}
        >
          {cells}
        </Button>
      ) : (
        <Box sx={sx}>{cells}</Box>
      )}
    </Box>
  );
}

/** SPR-7: stats tiles, the sprint's todos and its saved AI summary (when there is one). Wireframe 10. */
export default function SprintDetailsPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const board = useSprintBoard(sprintId);
  const { state: locationState } = useLocation();
  const detailsTodoId = useBoardUiStore((s) => s.detailsTodoId);
  const detailsKey = useBoardUiStore((s) => s.detailsKey);

  if (board.isPending) {
    return (
      <Skeleton
        variant="rounded"
        height={420}
        role="status"
        aria-label="Loading sprint"
        sx={{ borderRadius: 3 }}
      />
    );
  }
  if (board.isError) {
    return board.error instanceof ApiError && board.error.status === 404 ? (
      <EmptyState
        icon={<SearchOff />}
        title="Sprint not found"
        description="It may have been deleted."
        action={
          <Button variant="contained" component={RouterLink} to={`/projects/${projectId}/sprints`}>
            Back to sprints
          </Button>
        }
      />
    ) : (
      <ErrorState message={board.error.message} onRetry={() => void board.refetch()} />
    );
  }

  const { sprint, columns } = board.data;
  const todos = allTodos(columns);
  // A completed sprint shows its frozen snapshot; the others their live numbers.
  const stats = sprint.completedStats ?? sprint.stats;
  const completed = sprint.status === "completed";
  const carried = sprint.completedStats?.carriedOver;
  const dates = formatDateRange(sprint.startDate, sprint.endDate);
  const detailsTodo = detailsTodoId ? (todos.find((t) => t.id === detailsTodoId) ?? null) : null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
        <Typography variant="h3" component="h2">
          {sprint.name}
        </Typography>
        <SprintStatusChip status={sprint.status} />
        {sprint.status === "active" && (
          <Button
            size="small"
            component={RouterLink}
            to={`/projects/${projectId}/board`}
            sx={{ ml: "auto" }}
          >
            Open board
          </Button>
        )}
      </Box>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
        {[dates, sprint.goal && `Goal: ${sprint.goal}`].filter(Boolean).join(" · ") ||
          "No dates or goal"}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 1.5,
          my: 2.5,
        }}
      >
        <StatTile label="Completed todos" value={`${stats.doneTodos}`} />
        <StatTile label="Points done" value={`${stats.donePoints} / ${stats.totalPoints}`} />
        <StatTile
          label="Carried over"
          value={carried === undefined ? "–" : `${carried} ${plural(carried, "todo", "todos")}`}
        />
        <StatTile label="Completion" value={`${completionPercent(stats)}%`} />
      </Box>

      <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
        Todos ({todos.length})
      </Typography>
      {todos.length === 0 ? (
        <Typography color="text.secondary">
          {completed ? "No todos stayed in this sprint." : "This sprint has no todos yet."}
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box component="ul" aria-label={`${sprint.name} todos`} sx={{ m: 0, p: 0 }}>
            {todos.map((todo) => (
              // History is read-only: only a sprint that is still open lets you edit its todos.
              <TodoLine
                key={todo.id}
                todo={todo}
                onOpen={completed ? undefined : (t) => useBoardUiStore.getState().openDetails(t.id)}
              />
            ))}
          </Box>
        </Paper>
      )}

      {projectId && (
        <SprintSummaryPanel
          projectId={projectId}
          sprint={sprint}
          autoGenerate={wantsSummary(locationState)}
        />
      )}

      {projectId && (
        <TodoDetailsDialog
          key={`sprint-details-${detailsKey}`}
          open={detailsTodoId !== null}
          todo={detailsTodo}
          projectId={projectId}
          onClose={() => useBoardUiStore.getState().closeDetails()}
          onDeleted={() => useBoardUiStore.getState().closeDetails()}
        />
      )}
    </Paper>
  );
}
