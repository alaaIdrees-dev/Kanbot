import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useIsMutating } from "@tanstack/react-query";
import Add from "@mui/icons-material/Add";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import DragIndicator from "@mui/icons-material/DragIndicator";
import DriveFileMoveOutlined from "@mui/icons-material/DriveFileMoveOutlined";
import FormatListBulletedOutlined from "@mui/icons-material/FormatListBulletedOutlined";
import SearchOff from "@mui/icons-material/SearchOff";
import VerticalAlignBottom from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignTop from "@mui/icons-material/VerticalAlignTop";
import { Alert, Box, Button, Paper, Skeleton, Stack } from "@mui/material";
import { useSnackbar } from "notistack";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import {
  MOVE_TODO_MUTATION_KEY,
  useBacklogTodos,
  useMoveTodo,
  useSprintTodos,
} from "../../hooks/useTodos";
import { useSprints } from "../../hooks/useSprints";
import { formatPoints, plural } from "../../lib/pluralize";
import {
  BACKLOG,
  containerOf,
  endPosition,
  movePosition,
  sortSprintTodos,
  sumPoints,
  type MoveVariables,
} from "../../lib/todoLists";
import type { Sprint, Todo, TodoListQuery } from "../../types/api";
import { useAssistantDrawer } from "../shell/AssistantDrawerContext";
import { BacklogSection } from "./BacklogSection";
import { QuickCreateRow } from "./QuickCreateRow";
import { containerIdOfDroppable, isListDroppableId } from "./listDroppable";
import { SortableTodoList } from "./SortableTodoList";
import { SortableTodoRow } from "./SortableTodoRow";
import { SprintSection } from "./SprintSection";
import { TodoRowCells, type RowMoveAction } from "./TodoRow";

const DRAG_OFF_REASON = "Drag and drop is off while filters are on. Clear the filters to reorder.";

/**
 * What a drag looks like while it is in progress. It holds ONLY ids, never copies of todos: server
 * data stays in the Query cache (plan §3.4), and rows look their todo up by id. The ids let a todo
 * appear in another list as soon as it is held over it, before anything is saved.
 */
interface DragState {
  activeId: string;
  /** The list the drag started in. */
  origin: string;
  /** Row order per list (BACKLOG or sprint id), including the dragged row's current slot. */
  ids: Record<string, string[]>;
  /** False once dropped: the preview then stays only until the move has been saved or rejected. */
  dragging: boolean;
}

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
  const { enqueueSnackbar } = useSnackbar();
  const assistant = useAssistantDrawer();

  const backlogQuery = useBacklogTodos(projectId, queryFilters);
  // The whole backlog. With no filter it is the same query as above (one request); with a filter it
  // is the reference for "Move to top/bottom", which are positions in the FULL list.
  const fullBacklogQuery = useBacklogTodos(projectId, {});
  const sprintsQuery = useSprints(projectId);
  const planned = (sprintsQuery.data ?? []).filter((s) => s.status === "planned");
  const activeSprint = sprintsQuery.data?.find((s) => s.status === "active");
  const sprintStates = useSprintTodos(
    projectId,
    planned.map((s) => s.id),
  );

  // ───────────── Lists as the cache has them ─────────────
  const backlogTodos = backlogQuery.data ?? [];
  const containers = [
    ...planned.map((sprint, i) => ({
      id: sprint.id,
      name: sprint.name,
      todos: sortSprintTodos(sprintStates[i]?.todos ?? []),
    })),
    { id: BACKLOG, name: "Backlog", todos: backlogTodos },
  ];
  const todosById = new Map<string, Todo>();
  for (const container of containers) {
    for (const todo of container.todos) todosById.set(todo.id, todo);
  }

  // ───────────── Drag preview ─────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const movesInFlight = useIsMutating({ mutationKey: MOVE_TODO_MUTATION_KEY(projectId) });
  // After a drop the preview is kept until every move has been saved (or rejected), because the
  // cache is updated a moment AFTER the drop, and swapping in between would flash the old order.
  const preview = drag && (drag.dragging || movesInFlight > 0) ? drag : null;

  const rowIds = (container: { id: string; todos: Todo[] }): string[] => {
    if (!preview) return container.todos.map((t) => t.id);
    // A todo the preview doesn't know about (created meanwhile) is appended; deleted ones are dropped.
    const known = new Set(Object.values(preview.ids).flat());
    return [
      ...(preview.ids[container.id] ?? []).filter((id) => todosById.has(id)),
      ...container.todos.filter((t) => !known.has(t.id)).map((t) => t.id),
    ];
  };

  const moveTodo = useMoveTodo(projectId, {
    onError: (error, variables) => {
      // Rolled back by the hook. Drop a finished preview now so the rollback is visible at once;
      // never touch a drag that is still in progress.
      setDrag((current) => (current && !current.dragging ? null : current));
      const key = todosById.get(variables.todoId)?.key ?? "the todo";
      enqueueSnackbar(`Couldn’t move ${key}. ${error.message} The change was undone.`, {
        variant: "error",
      });
    },
  });

  const dragDisabledReason = filtersActive ? DRAG_OFF_REASON : undefined;

  // ───────────── dnd-kit ─────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOfId = (
    id: UniqueIdentifier,
    ids: Record<string, string[]>,
  ): string | undefined => {
    if (isListDroppableId(id)) return containerIdOfDroppable(id);
    return Object.keys(ids).find((key) => ids[key].includes(String(id)));
  };

  // Standard multi-list strategy: prefer what the pointer is over, pick the nearest ROW inside a
  // list (so rows win over the list's own droppable), and don't flicker right after a row jumped
  // to another list.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedList = useRef(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      recentlyMovedList.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [drag]);

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const byPointer = pointerWithin(args);
      const hits = byPointer.length > 0 ? byPointer : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");
      if (overId != null) {
        if (isListDroppableId(overId)) {
          const rows = new Set(drag?.ids[containerIdOfDroppable(overId)] ?? []);
          if (rows.size > 0) {
            const hitList = overId;
            overId =
              closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                  (c) => c.id !== hitList && rows.has(String(c.id)),
                ),
              })[0]?.id ?? overId;
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }
      if (recentlyMovedList.current) lastOverId.current = args.active.id;
      return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
    },
    [drag],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    const activeId = String(active.id);
    const origin = containers.find((c) => c.todos.some((t) => t.id === activeId))?.id;
    if (!origin) return;
    setDrag({
      activeId,
      origin,
      dragging: true,
      ids: Object.fromEntries(containers.map((c) => [c.id, c.todos.map((t) => t.id)])),
    });
  };

  /** Live preview: when the row is held over ANOTHER list, show it there (nothing is saved yet). */
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDrag((current) => {
      if (!current?.dragging) return current;
      const activeId = String(active.id);
      const from = containerOfId(activeId, current.ids);
      const to = containerOfId(over.id, current.ids);
      if (!from || !to || from === to) return current;

      const target = current.ids[to];
      let index = target.length;
      if (!isListDroppableId(over.id)) {
        const overIndex = target.indexOf(String(over.id));
        const translated = active.rect.current.translated;
        const below = !!translated && translated.top > over.rect.top + over.rect.height;
        index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length;
      }
      recentlyMovedList.current = true;
      return {
        ...current,
        ids: {
          ...current.ids,
          [from]: current.ids[from].filter((id) => id !== activeId),
          [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
        },
      };
    });
  };

  const run = (todo: Todo, move: Omit<MoveVariables, "todoId">, successMessage?: string) => {
    moveTodo.mutate(
      { todoId: todo.id, ...move },
      {
        onSuccess: () => {
          if (successMessage) enqueueSnackbar(successMessage, { variant: "success" });
        },
      },
    );
  };

  /** Drop: turn the preview into one move request, `position` as in plan §3.5. */
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!drag) return;
    const activeId = String(active.id);
    const ids = { ...drag.ids };
    const to = containerOfId(activeId, ids);
    const moved = todosById.get(activeId);
    if (!to || !moved) {
      setDrag(null);
      return;
    }

    // Reordering inside one list: rows already slid out of the way, apply the final slot.
    if (over && containerOfId(over.id, ids) === to) {
      const items = ids[to];
      const from = items.indexOf(activeId);
      const target = isListDroppableId(over.id) ? items.length - 1 : items.indexOf(String(over.id));
      if (target >= 0 && target !== from) ids[to] = arrayMove(items, from, target);
    }

    const origin = containers.find((c) => c.id === drag.origin);
    const sameSlot =
      to === drag.origin &&
      ids[to].indexOf(activeId) === origin?.todos.findIndex((t) => t.id === activeId);
    if (sameSlot) {
      setDrag(null);
      return;
    }

    const finalIds = ids[to];
    const others = finalIds
      .filter((id) => id !== activeId)
      .flatMap((id) => todosById.get(id) ?? []);
    const position = movePosition(others, finalIds.indexOf(activeId), moved.status, to !== BACKLOG);
    setDrag({ ...drag, ids, dragging: false });

    if (to === drag.origin) {
      run(moved, { position });
    } else {
      const destination = containers.find((c) => c.id === to)?.name ?? "the list";
      run(
        moved,
        { sprintId: to === BACKLOG ? null : to, position },
        `${moved.key} moved to ${destination}`,
      );
    }
  };

  // ───────────── Menu alternative (BL-5, BL-7) ─────────────
  /** The complete, ordered list a todo lives in: the unfiltered cache (undefined while loading). */
  const fullListOf = (container: string): Todo[] | undefined => {
    if (container === BACKLOG) return fullBacklogQuery.data;
    const todos = sprintStates.find((s) => s.sprintId === container)?.todos;
    return todos && sortSprintTodos(todos);
  };

  const buildMoveActions = (todo: Todo): RowMoveAction[] => {
    const container = containerOf(todo);
    const inSprint = container !== BACKLOG;
    const list = fullListOf(container);
    // A sprint's list is one status column; the backlog is one list.
    const column = list && (inSprint ? list.filter((t) => t.status === todo.status) : list);
    const at = column ? column.findIndex((t) => t.id === todo.id) : -1;

    const actions: RowMoveAction[] = [
      {
        key: "top",
        label: "Move to top",
        icon: <VerticalAlignTop fontSize="small" />,
        disabled: at <= 0,
        onSelect: () => run(todo, { position: 0 }, `${todo.key} moved to the top`),
      },
      {
        key: "bottom",
        label: "Move to bottom",
        icon: <VerticalAlignBottom fontSize="small" />,
        disabled: !column || at < 0 || at >= column.length - 1,
        onSelect: () =>
          run(todo, { position: (column?.length ?? 1) - 1 }, `${todo.key} moved to the bottom`),
      },
    ];

    let first = true;
    const destination = (action: Omit<RowMoveAction, "dividerBefore">) => {
      actions.push({ ...action, dividerBefore: first });
      first = false;
    };
    if (inSprint) {
      destination({
        key: "backlog",
        label: "Move to backlog",
        icon: <DriveFileMoveOutlined fontSize="small" />,
        onSelect: () =>
          run(todo, { sprintId: null, position: 0 }, `${todo.key} moved to the top of the backlog`),
      });
    }
    // Planned sprints and the active one; appended to the end of the todo's own status column.
    for (const sprint of [...planned, ...(activeSprint ? [activeSprint] : [])]) {
      if (sprint.id === container) continue;
      const target = fullListOf(sprint.id);
      const position = target
        ? endPosition(target, todo.status, true)
        : sprint.stats.byStatus[todo.status];
      destination({
        key: `sprint-${sprint.id}`,
        label:
          sprint.status === "active" ? `Move to ${sprint.name} (active)` : `Move to ${sprint.name}`,
        icon: <DriveFileMoveOutlined fontSize="small" />,
        onSelect: () =>
          run(todo, { sprintId: sprint.id, position }, `${todo.key} moved to ${sprint.name}`),
      });
    }
    return actions;
  };

  // ───────────── Screen-reader announcements (NFR-5) ─────────────
  const nameOfContainer = (id: UniqueIdentifier): string => {
    const containerId = preview ? containerOfId(id, preview.ids) : undefined;
    return containers.find((c) => c.id === containerId)?.name ?? "the list";
  };
  const labelOf = (id: UniqueIdentifier) => {
    const todo = todosById.get(String(id));
    return todo ? `${todo.key} ${todo.title}` : "todo";
  };
  const positionIn = (id: UniqueIdentifier): string => {
    const containerId = preview ? containerOfId(id, preview.ids) : undefined;
    const ids = containerId ? preview?.ids[containerId] : undefined;
    return ids ? `position ${ids.indexOf(String(id)) + 1} of ${ids.length}` : "";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${labelOf(active.id)} is in ${nameOfContainer(active.id)}, ${positionIn(active.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${labelOf(active.id)} in ${nameOfContainer(active.id)}, ${positionIn(active.id)}.`
        : `Dropped ${labelOf(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled. ${labelOf(active.id)} stays where it was.`,
  };

  // ───────────── Render ─────────────
  const isHeldOver = (containerId: string) =>
    !!preview?.dragging &&
    preview.origin !== containerId &&
    containerOfId(preview.activeId, preview.ids) === containerId;

  const rowsFor = (containerId: string, ids: string[]) =>
    ids.flatMap((id) => {
      const todo = todosById.get(id);
      return todo
        ? [
            <SortableTodoRow
              key={id}
              todo={todo}
              containerId={containerId}
              onOpen={onOpenTodo}
              onDelete={onDeleteTodo}
              moveActions={buildMoveActions(todo)}
              dragDisabledReason={dragDisabledReason}
            />,
          ]
        : [];
    });

  const backlogContainer = containers[containers.length - 1];
  const backlogIds = rowIds(backlogContainer);
  const fullBacklogCount = fullBacklogQuery.data?.length ?? backlogTodos.length;
  const backlogCount = filtersActive
    ? `${backlogTodos.length} of ${fullBacklogCount} ${plural(fullBacklogCount, "todo", "todos")}`
    : `${backlogTodos.length} ${plural(backlogTodos.length, "todo", "todos")}`;
  const backlogSummary = `${backlogCount} · ${formatPoints(sumPoints(backlogTodos))}`;

  let backlogBody;
  if (backlogQuery.isPending) {
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
      <SortableTodoList
        containerId={BACKLOG}
        ids={[]}
        label="Backlog todos"
        highlighted={isHeldOver(BACKLOG)}
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
                {assistant && (
                  <Button
                    variant="outlined"
                    color="ai"
                    startIcon={<AutoAwesome />}
                    onClick={assistant.open}
                  >
                    Generate with AI
                  </Button>
                )}
              </Box>
            }
          />
        }
      >
        {null}
      </SortableTodoList>
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
        <SortableTodoList
          containerId={BACKLOG}
          ids={backlogIds}
          label="Backlog todos"
          highlighted={isHeldOver(BACKLOG)}
        >
          {rowsFor(BACKLOG, backlogIds)}
        </SortableTodoList>
        <QuickCreateRow ref={quickCreateRef} onCreate={onQuickCreate} />
      </BacklogSection>
    );
  }

  // Quick create stays reachable from either empty state (new todos always land in the backlog).
  const showTopQuickCreate =
    backlogIds.length === 0 && !backlogQuery.isPending && !backlogQuery.isError;
  const draggedTodo = preview?.dragging ? todosById.get(preview.activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
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

        {planned.map((sprint, i) => {
          const container = containers[i];
          return (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              state={sprintStates[i]}
              todos={container.todos}
              ids={rowIds(container)}
              highlighted={isHeldOver(sprint.id)}
              activeSprint={activeSprint}
              onEdit={onEditSprint}
              onStart={onStartSprint}
            >
              {rowsFor(sprint.id, rowIds(container))}
            </SprintSection>
          );
        })}

        {backlogBody}

        {showTopQuickCreate && (
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <QuickCreateRow ref={quickCreateRef} onCreate={onQuickCreate} />
          </Paper>
        )}
      </Stack>

      {/* The floating copy that follows the pointer; the row itself stays as a dimmed placeholder. */}
      <DragOverlay>
        {draggedTodo ? (
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
            }}
          >
            <DragIndicator fontSize="small" aria-hidden="true" sx={{ color: "text.muted" }} />
            <TodoRowCells todo={draggedTodo} />
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
