import { useMemo, type RefObject } from "react";
import { Link as RouterLink } from "react-router-dom";
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import Add from "@mui/icons-material/Add";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import DragIndicator from "@mui/icons-material/DragIndicator";
import FormatListBulletedOutlined from "@mui/icons-material/FormatListBulletedOutlined";
import SearchOff from "@mui/icons-material/SearchOff";
import { Alert, Box, Button, Paper, Skeleton, Stack } from "@mui/material";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { useSprints } from "../../hooks/useSprints";
import { useBacklogTodos, useRefetchSprintTodos, useSprintTodos } from "../../hooks/useTodos";
import { usePlanningSync } from "../../hooks/usePlanningSync";
import { formatPoints, plural } from "../../lib/pluralize";
import { BACKLOG, sumPoints } from "../../lib/todoLists";
import { useAiUiStore } from "../../stores/aiUiStore";
import {
  useActiveSprint,
  useDragMeta,
  useIsBacklogLoaded,
  useListTotals,
  usePlannedSprints,
  useRowIds,
  useTodo,
} from "../../stores/planningSelectors";
import type { Sprint, Todo, TodoListQuery } from "../../types/api";
import { BacklogSection } from "./BacklogSection";
import { PlanningList, type RowHandlers } from "./PlanningList";
import { QuickCreateRow } from "./QuickCreateRow";
import { SprintSection } from "./SprintSection";
import { TodoRowCells } from "./TodoRow";
import { useBacklogDnd } from "./useBacklogDnd";

const DRAG_OFF_REASON = "Drag and drop is off while filters are on. Clear the filters to reorder.";

/**
 * Module-level on purpose: an inline `measuring` object is a new value on every render, which makes
 * dnd-kit rebuild its measuring configuration (and re-measure) each time.
 */
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

interface BacklogListsProps {
  projectId: string;
  /** Debounced backlog filters (BL-6); the sprint lists are never filtered. */
  queryFilters: Pick<TodoListQuery, "search" | "priority" | "type">;
  filtersActive: boolean;
  onClearFilters: () => void;
  onOpenTodo: (todo: Todo) => void;
  onDeleteTodo: (todo: Todo) => void;
  onEditSprint: (sprint: Sprint) => void;
  onStartSprint: (sprint: Sprint) => void;
  onQuickCreate: (title: string) => void;
  quickCreateRef: RefObject<HTMLInputElement | null>;
}

/**
 * Planned sprints above the backlog (SPR-1) with drag and drop between and within them (BL-5, BL-7)
 * and the menu alternative ("Move to top", "Move to Sprint 4"…). Layout: wireframe 04.
 *
 * Data flow: TanStack Query fetches (this component only reads load/error state from it); the
 * planning store holds the lists the user sees, the drag preview, the optimistic moves and the
 * rollback (see stores/planningStore.ts).
 */
export function BacklogLists({
  projectId,
  queryFilters,
  filtersActive,
  onClearFilters,
  onOpenTodo,
  onDeleteTodo,
  onEditSprint,
  onStartSprint,
  onQuickCreate,
  quickCreateRef,
}: BacklogListsProps) {
  usePlanningSync(projectId);

  // ───────────── Fetching (Query) ─────────────
  // The filtered backlog doubles as the unfiltered one when no filter is set (one request).
  const backlogQuery = useBacklogTodos(projectId, queryFilters);
  const sprintsQuery = useSprints(projectId);
  const plannedSprintIds = useMemo(
    () => (sprintsQuery.data ?? []).filter((s) => s.status === "planned").map((s) => s.id),
    [sprintsQuery.data],
  );
  const sprintStates = useSprintTodos(projectId, plannedSprintIds);
  const retrySprint = useRefetchSprintTodos(projectId);

  // ───────────── What is shown (store) ─────────────
  const planned = usePlannedSprints();
  const activeSprint = useActiveSprint();
  const backlogLoaded = useIsBacklogLoaded();
  const allBacklogIds = useRowIds(BACKLOG);
  const backlogTotals = useListTotals(BACKLOG);
  const { activeId } = useDragMeta();
  const draggedTodo = useTodo(activeId ?? "");

  // A filtered view is a subsequence of the full order, so it follows optimistic moves too.
  const backlogIds = useMemo(() => {
    if (!filtersActive) return allBacklogIds;
    const matching = new Set((backlogQuery.data ?? []).map((t) => t.id));
    return allBacklogIds.filter((id) => matching.has(id));
  }, [filtersActive, allBacklogIds, backlogQuery.data]);

  // ───────────── Drag and drop ─────────────
  const dnd = useBacklogDnd();
  const dragDisabledReason = filtersActive ? DRAG_OFF_REASON : undefined;
  const rows = useMemo<RowHandlers>(
    () => ({ onOpenTodo, onDeleteTodo, runMove: dnd.runMove, dragDisabledReason }),
    [onOpenTodo, onDeleteTodo, dnd.runMove, dragDisabledReason],
  );

  // ───────────── Backlog body ─────────────
  const shownCount = filtersActive ? backlogIds.length : backlogTotals.count;
  const shownPoints = filtersActive ? sumPoints(backlogQuery.data ?? []) : backlogTotals.points;
  const fullCount = backlogTotals.count;
  const backlogCount = filtersActive
    ? `${shownCount} of ${fullCount} ${plural(fullCount, "todo", "todos")}`
    : `${shownCount} ${plural(shownCount, "todo", "todos")}`;
  const backlogSummary = `${backlogCount} · ${formatPoints(shownPoints)}`;

  let backlogBody;
  if (backlogQuery.isPending || (!backlogLoaded && !backlogQuery.isError)) {
    backlogBody = (
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box role="status" aria-label="Loading backlog" sx={{ p: 2 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={44} sx={{ mb: 1, borderRadius: 2 }} />
          ))}
        </Box>
      </Paper>
    );
  } else if (backlogQuery.isError) {
    backlogBody = (
      <ErrorState
        message={backlogQuery.error.message}
        onRetry={() => void backlogQuery.refetch()}
      />
    );
  } else if (backlogIds.length === 0 && !filtersActive) {
    // Still a drop target: a todo can be sent back from a sprint into an empty backlog.
    backlogBody = (
      <PlanningList
        containerId={BACKLOG}
        label="Backlog todos"
        rows={rows}
        emptyContent={
          <EmptyState
            icon={<FormatListBulletedOutlined />}
            title="Your backlog is empty"
            description="Add todos one at a time, or describe a feature and let the AI assistant draft a batch for you."
            action={
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => quickCreateRef.current?.focus()}
                >
                  Create a todo
                </Button>
                <Button
                  variant="outlined"
                  color="ai"
                  startIcon={<AutoAwesome />}
                  onClick={() => useAiUiStore.getState().openGenerate()}
                >
                  Generate with AI
                </Button>
              </Box>
            }
          />
        }
      />
    );
  } else if (backlogIds.length === 0) {
    backlogBody = (
      <EmptyState
        icon={<SearchOff />}
        title="No matching todos"
        description="Try a different search term, or clear the filters."
        action={
          <Button color="inherit" variant="outlined" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    backlogBody = (
      <BacklogSection title="Backlog" summary={backlogSummary}>
        <PlanningList
          containerId={BACKLOG}
          label="Backlog todos"
          rows={rows}
          visibleIds={backlogIds}
        />
        <QuickCreateRow ref={quickCreateRef} onCreate={onQuickCreate} />
      </BacklogSection>
    );
  }

  // Quick create stays reachable from either empty state (new todos always land in the backlog).
  const showTopQuickCreate =
    backlogIds.length === 0 && !backlogQuery.isPending && !backlogQuery.isError;

  return (
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
      <Stack spacing={2}>
        {filtersActive && (
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          >
            {DRAG_OFF_REASON} You can still use each todo’s actions menu to move it.
          </Alert>
        )}

        {activeSprint && planned.length > 0 && (
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                component={RouterLink}
                to={`/projects/${projectId}/board`}
              >
                Open board
              </Button>
            }
          >
            {activeSprint.name} is active, so a planned sprint can’t be started yet. Complete{" "}
            {activeSprint.name} first.
          </Alert>
        )}

        {sprintsQuery.isError && (
          <ErrorState
            title="Couldn’t load sprints"
            message={sprintsQuery.error.message}
            onRetry={() => void sprintsQuery.refetch()}
          />
        )}
        {sprintsQuery.isPending && (
          <Skeleton
            variant="rounded"
            height={96}
            role="status"
            aria-label="Loading sprints"
            sx={{ borderRadius: 3 }}
          />
        )}

        {planned.map((sprint) => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            state={sprintStates.find((s) => s.sprintId === sprint.id)}
            rows={rows}
            activeSprint={activeSprint}
            onEdit={onEditSprint}
            onStart={onStartSprint}
            onRetry={retrySprint}
          />
        ))}

        {backlogBody}

        {showTopQuickCreate && (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <QuickCreateRow ref={quickCreateRef} onCreate={onQuickCreate} />
          </Paper>
        )}
      </Stack>

      {/* The floating copy that follows the pointer; the row itself stays as a dimmed placeholder.
          No drop animation: the store has already moved the row, and the animation would keep a
          cloned copy of the overlay mounted (with a setState ref) while the lists re-render. */}
      <DragOverlay dropAnimation={null}>
        {draggedTodo ? (
          <div style={{ pointerEvents: "none" }}>
            <Paper
              elevation={4}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 1.25,
                px: 1.5,
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: 2,
                cursor: "grabbing",
                backgroundColor: "background.paper", // لتجنب الشفافية أثناء السحب
              }}
            >
              <DragIndicator fontSize="small" aria-hidden="true" sx={{ color: "text.secondary" }} />
              <TodoRowCells todo={draggedTodo} />
            </Paper>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
