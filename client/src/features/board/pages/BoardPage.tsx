import { useEffect, useMemo } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import DragIndicator from "@mui/icons-material/DragIndicator";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import { Box, Button, Paper, Skeleton } from "@mui/material";
import { useSnackbar } from "notistack";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { useSprintBoard } from "../hooks/useBoard";
import { useProject } from "../../projects";
import { allTodos } from "../../../lib/boardColumns";
import type { SprintPageState } from "../../../lib/sprintPageState";
import { useAiUiStore } from "../../ai/store/aiUiStore";
import { useBoardUiStore, useDraggedId } from "../store/boardUiStore";
import { TODO_STATUSES } from "../../../types/api";
import { SprintSummaryDialog } from "../../ai";
import { TodoDetailsDialog } from "../../todos";
import { BoardColumn } from "../components/BoardColumn";
import { CompleteSprintDialog } from "../components/CompleteSprintDialog";
import { SprintHeader } from "../components/SprintHeader";
import { TodoCardBody } from "../components/TodoCard";
import { useBoardDnd } from "../hooks/useBoardDnd";

/** The floating card glides into its slot (a module constant: dnd-kit compares it by reference). */
const DROP_ANIMATION = { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };

/** Module-level on purpose: an inline object is new on every render and makes dnd-kit re-measure. */
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

function NoActiveSprint({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      icon={<ViewKanbanOutlined />}
      title="No active sprint"
      description="Plan a sprint in the backlog and start it. It will show up here as a board."
      action={
        <Button variant="contained" component={RouterLink} to={`/projects/${projectId}/backlog`}>
          Go to the backlog
        </Button>
      }
    />
  );
}

/** SPR-4 and SPR-5, SPR-6 entry point. Layout: wireframe 05. */
export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  // The project is already loaded by ProjectRoute, so the board request starts with no waterfall.
  const sprintId = project.data?.stats.activeSprint?.id;

  // Leaving the board (or switching project) drops its drag preview and dialog state.
  useEffect(() => () => useBoardUiStore.getState().reset(), [projectId, sprintId]);

  if (!projectId) return null;
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {project.isError ? (
        <ErrorState message={project.error.message} onRetry={() => void project.refetch()} />
      ) : sprintId ? (
        <ActiveBoard key={sprintId} projectId={projectId} sprintId={sprintId} />
      ) : (
        <NoActiveSprint projectId={projectId} />
      )}
    </Box>
  );
}

function ActiveBoard({ projectId, sprintId }: { projectId: string; sprintId: string }) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const board = useSprintBoard(sprintId);

  const detailsTodoId = useBoardUiStore((s) => s.detailsTodoId);
  const detailsKey = useBoardUiStore((s) => s.detailsKey);
  const completeOpen = useBoardUiStore((s) => s.completeOpen);
  const completeKey = useBoardUiStore((s) => s.completeKey);
  const summaryDialog = useAiUiStore((s) => s.summaryDialog);
  const draggedId = useDraggedId();

  const columns = board.data?.columns;
  const todosById = useMemo(
    () => new Map((columns ? allTodos(columns) : []).map((t) => [t.id, t])),
    [columns],
  );

  // Hooks below need data; use empty columns until the board has loaded.
  const emptyColumns = useMemo(() => ({ todo: [], in_progress: [], in_review: [], done: [] }), []);
  const dnd = useBoardDnd(projectId, sprintId, columns ?? emptyColumns);

  if (board.isPending) {
    return (
      <Box role="status" aria-label="Loading board" sx={{ display: "flex", gap: 1.5 }}>
        {TODO_STATUSES.map((s) => (
          <Skeleton key={s} variant="rounded" height={360} sx={{ flex: 1, borderRadius: 3 }} />
        ))}
      </Box>
    );
  }
  if (board.isError) {
    return <ErrorState message={board.error.message} onRetry={() => void board.refetch()} />;
  }

  const { sprint } = board.data;
  // A stale project cache can still point at a sprint that was completed elsewhere.
  if (sprint.status !== "active") return <NoActiveSprint projectId={projectId} />;

  const draggedTodo = draggedId ? todosById.get(draggedId) : undefined;
  const detailsTodo = detailsTodoId ? (todosById.get(detailsTodoId) ?? null) : null;

  return (
    <>
      <SprintHeader
        sprint={sprint}
        actions={
          <>
            <Button
              variant="outlined"
              color="ai"
              startIcon={<AutoAwesome />}
              onClick={() => useAiUiStore.getState().openSummary()}
            >
              {sprint.summary ? "AI summary" : "Summarize"}
            </Button>
            <Button variant="contained" onClick={() => useBoardUiStore.getState().openComplete()}>
              Complete sprint
            </Button>
          </>
        }
      />

      <DndContext
        sensors={dnd.sensors}
        collisionDetection={dnd.collisionDetection}
        measuring={MEASURING}
        accessibility={dnd.accessibility}
        onDragStart={dnd.onDragStart}
        onDragOver={dnd.onDragOver}
        onDragEnd={dnd.onDragEnd}
        onDragCancel={dnd.onDragCancel}
      >
        {/* NFR-4: below the desktop width the columns keep their size and the board scrolls sideways. */}
        <Box
          role="group"
          aria-label="Sprint board"
          sx={{
            display: "flex",
            gap: "var(--kb-layout-board-column-gap)",
            overflowX: "auto",
            pb: 1,
          }}
        >
          {TODO_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              todos={board.data.columns[status]}
              todosById={todosById}
              columns={board.data.columns}
              onOpen={(todo) => useBoardUiStore.getState().openDetails(todo.id)}
              runMove={dnd.runMove}
            />
          ))}
        </Box>
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {draggedTodo ? (
            <Paper
              elevation={4}
              sx={{
                animation: "kb-lift 160ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
                p: 1.5,
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: 2,
                cursor: "grabbing",
              }}
            >
              <DragIndicator
                fontSize="small"
                aria-hidden="true"
                sx={{ color: "text.muted", float: "right" }}
              />
              <TodoCardBody todo={draggedTodo} />
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TodoDetailsDialog
        key={`details-${detailsKey}`}
        open={detailsTodoId !== null}
        todo={detailsTodo}
        projectId={projectId}
        onClose={() => useBoardUiStore.getState().closeDetails()}
        onDeleted={() => useBoardUiStore.getState().closeDetails()}
      />

      {summaryDialog.key > 0 && (
        <SprintSummaryDialog
          key={`summary-${summaryDialog.key}`}
          open={summaryDialog.open}
          projectId={projectId}
          sprint={sprint}
          onClose={() => useAiUiStore.getState().closeSummary()}
        />
      )}

      <CompleteSprintDialog
        key={`complete-${completeKey}`}
        open={completeOpen}
        projectId={projectId}
        sprint={sprint}
        onClose={() => useBoardUiStore.getState().closeComplete()}
        onCompleted={(completed, { summarize }) => {
          useBoardUiStore.getState().closeComplete();
          enqueueSnackbar(`${completed.name} completed`, { variant: "success" });
          // SPR-6: show the sprint's summary page; AI-4: it makes the AI summary when asked for.
          const state: SprintPageState = { summarize };
          navigate(`/projects/${projectId}/sprints/${completed.id}`, { state });
        }}
      />
    </>
  );
}
