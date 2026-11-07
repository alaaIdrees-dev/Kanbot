import { useCallback, useMemo, useRef } from "react";
import {
  closestCenter,
  getFirstCollision,
  KeyboardSensor,
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useUndoToast } from "../../../hooks/useUndoToast";
import { useMotionStore } from "../../../lib/motionStore";
import { invalidateTodoData } from "../../../lib/queryKeys";
import * as todosApi from "../../todos/api/todosApi";

import { usePlanningStore, type MoveHandlers } from "../store/planningStore";
import { BACKLOG, type MoveVariables } from "../../../lib/todoLists";
import type { Todo } from "../../../types/api";
import { containerIdOfDroppable, isListDroppableId } from "../components/listDroppable";

const NO_ROWS: ReadonlySet<string> = new Set();

/**
 * All dnd-kit wiring of the backlog page. It only translates dnd-kit events into planning-store
 * actions; the store owns the preview, the optimistic update and the rollback.
 *
 * Loop-safety notes (each one was a way to hit "Maximum update depth exceeded"):
 *  - `collisionDetection`, `announcements` and the handlers are referentially stable. They read the
 *    live drag from the store at call time instead of closing over React state, so a drag update
 *    never creates a new function that dnd-kit then re-measures against.
 *  - `onDragOver` is idempotent: the store ignores it when the row is already in that slot, and
 *    the "recently moved" flag is set here, not inside a state updater (updaters must be pure).
 */
export function useBacklogDnd() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const showUndoToast = useUndoToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Prefer what the pointer is over, pick the nearest ROW inside a list (rows beat the list's own
  // droppable), and don't flicker right after a row jumped to another list.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedList = useRef(false);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const byPointer = pointerWithin(args);
    const hits = byPointer.length > 0 ? byPointer : rectIntersection(args);
    let overId = getFirstCollision(hits, "id");
    if (overId != null) {
      if (isListDroppableId(overId)) {
        const rowIds = usePlanningStore.getState().drag?.ids[containerIdOfDroppable(overId)];
        const rows = rowIds ? new Set(rowIds) : NO_ROWS;
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
  }, []);

  /** Puts a todo back where it was ("Undo"). It goes through the planning queue like any move. */
  const undoMove = useCallback(
    (inverse: MoveVariables) => {
      const store = usePlanningStore.getState();
      const feedback = {
        onSuccess: () => enqueueSnackbar("Move undone", { variant: "info" }),
        onError: (error: Error) =>
          enqueueSnackbar(`Couldn’t undo the move. ${error.message}`, { variant: "error" }),
      };
      if (store.todosById[inverse.todoId]) {
        store.enqueueMove(inverse, feedback);
        return;
      }
      // The planning page is gone (the toast outlives it): move on the server and refresh.
      const projectId = store.projectId;
      todosApi
        .moveTodo(inverse.todoId, {
          sprintId: inverse.sprintId,
          status: inverse.status,
          position: inverse.position,
        })
        .then(() => feedback.onSuccess())
        .catch((error: unknown) => feedback.onError(error instanceof Error ? error : new Error("Something went wrong.")))
        .finally(() => {
          if (projectId) void invalidateTodoData(queryClient, projectId);
        });
    },
    [enqueueSnackbar, queryClient],
  );

  /** Error/success feedback shared by drops and the actions menu. Success offers "Undo" (BL-5, BL-7). */
  const handlersFor = useCallback(
    (todo: Pick<Todo, "key">, successMessage?: string): MoveHandlers => ({
      onSuccess: (_saved, inverse) => {
        if (!successMessage) return;
        if (inverse) showUndoToast({ message: successMessage, onUndo: () => undoMove(inverse) });
        else enqueueSnackbar(successMessage, { variant: "success" });
      },
      onError: (error, reason) =>
        enqueueSnackbar(
          reason === "failed"
            ? `Couldn’t move ${todo.key}. ${error.message} The change was undone.`
            : `${todo.key} wasn’t moved because an earlier move failed. The change was undone.`,
          { variant: "error" },
        ),
    }),
    [enqueueSnackbar, showUndoToast, undoMove],
  );

  /** The non-drag path (BL-5, BL-7): "Move to top", "Move to Sprint 4"… */
  const runMove = useCallback(
    (todo: Todo, move: Omit<MoveVariables, "todoId">, successMessage?: string) => {
      usePlanningStore
        .getState()
        .enqueueMove({ todoId: todo.id, ...move }, handlersFor(todo, successMessage));
      useMotionStore.getState().settle(todo.id);
    },
    [handlersFor],
  );

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    usePlanningStore.getState().beginDrag(String(active.id));
  }, []);

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const translated = active.rect.current.translated;
    const changed = usePlanningStore.getState().dragOver({
      activeId: String(active.id),
      id: isListDroppableId(over.id) ? containerIdOfDroppable(over.id) : String(over.id),
      isList: isListDroppableId(over.id),
      below: !!translated && translated.top > over.rect.top + over.rect.height,
    });
    if (changed) {
      recentlyMovedList.current = true;
      requestAnimationFrame(() => {
        recentlyMovedList.current = false;
      });
    }
  }, []);

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      useMotionStore.getState().settle(String(active.id));
      usePlanningStore.getState().dropDrag(
        over
          ? {
              id: isListDroppableId(over.id) ? containerIdOfDroppable(over.id) : String(over.id),
              isList: isListDroppableId(over.id),
            }
          : null,
        (move) =>
          handlersFor(
            move.todo,
            move.changedList
              ? `${move.todo.key} moved to ${move.destinationName}`
              : `${move.todo.key} reordered`,
          ),
      );
    },
    [handlersFor],
  );

  const onDragCancel = useCallback(() => usePlanningStore.getState().cancelDrag(), []);

  // Screen-reader announcements (NFR-5). Read the store when announced, so the object is stable.
  const announcements = useMemo<Announcements>(() => {
    const labelOf = (id: UniqueIdentifier) => {
      const todo = usePlanningStore.getState().todosById[String(id)];
      return todo ? `${todo.key} ${todo.title}` : "todo";
    };
    const where = (id: UniqueIdentifier): string => {
      const { rowIds, sprintsById } = usePlanningStore.getState();
      const rowId = String(id);
      const container = Object.keys(rowIds).find((key) => rowIds[key].includes(rowId));
      if (!container) return "the list";
      const ids = rowIds[container];
      const name = container === BACKLOG ? "Backlog" : (sprintsById[container]?.name ?? "the list");
      return `${name}, position ${ids.indexOf(rowId) + 1} of ${ids.length}`;
    };
    return {
      onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over ? `${labelOf(active.id)} is in ${where(active.id)}.` : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? `Dropped ${labelOf(active.id)} in ${where(active.id)}.`
          : `Dropped ${labelOf(active.id)}.`,
      onDragCancel: ({ active }) => `Cancelled. ${labelOf(active.id)} stays where it was.`,
    };
  }, []);

  const accessibility = useMemo(() => ({ announcements }), [announcements]);

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
