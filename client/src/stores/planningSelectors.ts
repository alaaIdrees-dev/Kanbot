import { useShallow } from "zustand/react/shallow";
import { BACKLOG, sumPoints } from "../lib/todoLists";
import type { Sprint, Todo } from "../types/api";
import { usePlanningStore } from "./planningStore";

/**
 * Selector hooks. Zustand v5 re-renders in a loop ("Maximum update depth exceeded") if a selector
 * returns a NEW object/array on every call for the same state, so every selector here returns
 * either a primitive, a reference that already lives in the store, or a flat object wrapped in
 * `useShallow`. Never `.map()`/`.filter()` inside a selector without `useShallow`, and never
 * return nested fresh objects from one.
 */

const NO_IDS: readonly string[] = [];

export const useRowIds = (containerId: string): readonly string[] =>
  usePlanningStore((s) => s.rowIds[containerId] ?? NO_IDS);

export const useTodo = (todoId: string): Todo | undefined =>
  usePlanningStore((s) => s.todosById[todoId]);

export const useIsListLoaded = (containerId: string): boolean =>
  usePlanningStore((s) => s.loaded[containerId] === true);

/** Flat `{ count, points }`, so `useShallow` can compare it. */
export const useListTotals = (containerId: string): { count: number; points: number } =>
  usePlanningStore(
    useShallow((s) => {
      const todos = s.containers[containerId];
      return { count: todos?.length ?? 0, points: todos ? sumPoints(todos) : 0 };
    }),
  );

/** Planned sprints in server order. `useShallow` compares the array item by item. */
export const usePlannedSprints = (): Sprint[] =>
  usePlanningStore(useShallow((s) => s.plannedIds.map((id) => s.sprintsById[id])));

export const useActiveSprint = (): Sprint | undefined =>
  usePlanningStore((s) => (s.activeSprintId ? s.sprintsById[s.activeSprintId] : undefined));

export const useDragMeta = (): { activeId: string | null; origin: string | null } =>
  usePlanningStore(
    useShallow((s) => ({ activeId: s.drag?.activeId ?? null, origin: s.drag?.origin ?? null })),
  );

/** True while a dragged todo is held over `containerId` (a list other than the one it came from). */
export const useIsHeldOver = (containerId: string): boolean =>
  usePlanningStore((s) => {
    const drag = s.drag;
    return (
      !!drag && drag.origin !== containerId && !!s.rowIds[containerId]?.includes(drag.activeId)
    );
  });

export const useIsBacklogLoaded = (): boolean => useIsListLoaded(BACKLOG);
