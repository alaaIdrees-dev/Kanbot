import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  closestCenter,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useSnackbar } from "notistack";
import { useUndoToast } from "../../../hooks/useUndoToast";
import { useMotionStore } from "../../../lib/motionStore";
import { useMoveBoardTodo } from "./useBoard";
import { columnIds, type BoardColumns, type BoardMove } from "../../../lib/boardColumns";
import { STATUS_LABEL } from "../../../lib/constants";
import { useBoardUiStore } from "../store/boardUiStore";
import { TODO_STATUSES, type Todo, type TodoStatus } from "../../../types/api";
import { containerIdOfDroppable, isListDroppableId } from "../../backlog";

const NO_ROWS: ReadonlySet<string> = new Set();

const statusOf = (id: UniqueIdentifier): TodoStatus | undefined =>
  isListDroppableId(id) ? (containerIdOfDroppable(id) as TodoStatus) : undefined;

/**
 * dnd-kit wiring of the board (SPR-5). It translates dnd-kit events into board-store actions (the
 * live preview) and sends the drop through `useMoveBoardTodo` (optimistic update + rollback).
 * Handlers read the store at call time, so they stay referentially stable while a drag updates.
 */
export function useBoardDnd(projectId: string, sprintId: string, columns: BoardColumns) {
  const { enqueueSnackbar } = useSnackbar();

  // The latest cache data, read when a drag starts (kept in a ref so handlers stay stable).
  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Press and hold on touch screens, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = useMoveBoardTodo(projectId, sprintId, {
    onOptimistic: () => useBoardUiStore.getState().endDrag(),
    onError: (error, { todoId }) => {
      const todo = Object.values(columnsRef.current)
        .flat()
        .find((t) => t.id === todoId);
      enqueueSnackbar(
        `Couldn’t move ${todo?.key ?? "the todo"}. ${error.message} The change was undone.`,
        { variant: "error" },
      );
    },
  });
  const { mutate, mutateAsync } = move;
  const showUndoToast = useUndoToast();

  /**
   * Sends a move and, once the server accepted it, offers "Undo" (SPR-5). `mutateAsync` rather than
   * per-call `mutate` callbacks: those are skipped when a newer move starts or the board unmounts,
   * and the toast must appear for every move. Failures are reported by the hook (rollback + toast).
   */
  const moveWithUndo = useCallback(
    (planned: BoardMove, inverse: BoardMove, message: string) => {
      mutateAsync(planned).then(
        () =>
          showUndoToast({
            message,
            onUndo: () => {
              mutateAsync(inverse).then(
                () => enqueueSnackbar("Move undone", { variant: "info" }),
                () => undefined, // rolled back and reported by the hook's onError
              );
            },
          }),
        () => undefined,
      );
    },
    [mutateAsync, showUndoToast, enqueueSnackbar],
  );

  /** The non-drag path (SPR-5): the card menu's "Move to In Review"… */
  const runMove = useCallback(
    (todo: Todo, to: Omit<BoardMove, "todoId">, successMessage?: string) => {
      useMotionStore.getState().settle(todo.id);
      const column = columnsRef.current[todo.status];
      const inverse: BoardMove = {
        todoId: todo.id,
        status: todo.status,
        position: Math.max(
          column.findIndex((t) => t.id === todo.id),
          0,
        ),
      };
      moveWithUndo({ todoId: todo.id, ...to }, inverse, successMessage ?? `${todo.key} moved`);
    },
    [moveWithUndo],
  );

  // Prefer what the pointer is over; inside a column pick the nearest CARD (cards beat the column's
  // own droppable); don't flicker right after a card jumped to another column.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedColumn = useRef(false);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const byPointer = pointerWithin(args);
    const hits = byPointer.length > 0 ? byPointer : rectIntersection(args);
    let overId = getFirstCollision(hits, "id");
    if (overId != null) {
      const status = statusOf(overId);
      if (status) {
        const ids = useBoardUiStore.getState().drag?.columns[status];
        const cards = ids ? new Set(ids) : NO_ROWS;
        if (cards.size > 0) {
          const hitColumn = overId;
          overId =
            closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (c) => c.id !== hitColumn && cards.has(String(c.id)),
              ),
            })[0]?.id ?? overId;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }
    if (recentlyMovedColumn.current) lastOverId.current = args.active.id;
    return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
  }, []);

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    useBoardUiStore.getState().beginDrag(String(active.id), columnIds(columnsRef.current));
  }, []);

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const translated = active.rect.current.translated;
    const changed = useBoardUiStore.getState().dragOver({
      activeId: String(active.id),
      id: isListDroppableId(over.id) ? containerIdOfDroppable(over.id) : String(over.id),
      isColumn: isListDroppableId(over.id),
      below: !!translated && translated.top > over.rect.top + over.rect.height / 2,
    });
    if (changed) {
      recentlyMovedColumn.current = true;
      requestAnimationFrame(() => {
        recentlyMovedColumn.current = false;
      });
    }
  }, []);

  const onDragEnd = useCallback(
    ({ over }: DragEndEvent) => {
      const store = useBoardUiStore.getState();
      // Where the card came from, read before the drop ends the preview.
      const origin = store.drag;
      const planned = store.dropDrag(
        over
          ? {
              id: isListDroppableId(over.id) ? containerIdOfDroppable(over.id) : String(over.id),
              isColumn: isListDroppableId(over.id),
            }
          : null,
      );
      if (planned) useMotionStore.getState().settle(planned.todoId);
      if (planned && origin) {
        const todo = Object.values(columnsRef.current)
          .flat()
          .find((t) => t.id === planned.todoId);
        const key = todo?.key ?? "Card";
        moveWithUndo(
          planned,
          {
            todoId: planned.todoId,
            status: origin.origin,
            position: origin.initial[origin.origin].indexOf(planned.todoId),
          },
          planned.status === origin.origin
            ? `${key} reordered`
            : `${key} moved to ${STATUS_LABEL[planned.status]}`,
        );
      } else if (planned) {
        mutate(planned);
      }
    },
    [mutate, moveWithUndo],
  );

  const onDragCancel = useCallback(() => useBoardUiStore.getState().endDrag(), []);

  // Screen-reader announcements (NFR-5). They read the store when announced, so the object is stable.
  const accessibility = useMemo(() => {
    const todoOf = (id: UniqueIdentifier) =>
      Object.values(columnsRef.current)
        .flat()
        .find((t) => t.id === String(id));
    const labelOf = (id: UniqueIdentifier) => {
      const todo = todoOf(id);
      return todo ? `${todo.key} ${todo.title}` : "card";
    };
    const where = (id: UniqueIdentifier): string => {
      const preview = useBoardUiStore.getState().drag?.columns;
      const status = preview && TODO_STATUSES.find((s) => preview[s].includes(String(id)));
      if (!preview || !status) return "the board";
      return `${STATUS_LABEL[status]}, position ${preview[status].indexOf(String(id)) + 1} of ${preview[status].length}`;
    };
    const announcements: Announcements = {
      onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over ? `${labelOf(active.id)} is in ${where(active.id)}.` : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? `Dropped ${labelOf(active.id)} in ${where(active.id)}.`
          : `Dropped ${labelOf(active.id)}.`,
      onDragCancel: ({ active }) => `Cancelled. ${labelOf(active.id)} stays where it was.`,
    };
    return { announcements };
  }, []);

  return {
    sensors,
    collisionDetection,
    accessibility,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    runMove,
  };
}
