import { create } from "zustand";
import * as todosApi from "../../todos/api/todosApi";
import {
  BACKLOG,
  movePosition,
  planMove,
  sortSprintTodos,
  type CachedTodoList,
  type MoveVariables,
} from "../../../lib/todoLists";
import type { Sprint, Todo } from "../../../types/api";

/**
 * Planning store: the working model of the backlog page (backlog + planned sprints + the active
 * sprint's metadata), including the live drag preview, optimistic moves and rollback.
 *
 * Division of labour:
 *  - TanStack Query fetches and caches server data (loading / error states, invalidation).
 *  - This store holds what the user SEES on the planning screen. `planningSync.ts` copies query
 *    data into it (`hydrate`) whenever the cache changes AND the store is idle.
 *  - Moves are applied here synchronously (optimistic), sent to the API one at a time, and rolled
 *    back to the last server-confirmed state when one fails.
 *
 * Rules that keep this free of render loops:
 *  - Every value in state is either a primitive or a reference that only changes when its content
 *    changes (lists, id arrays). Selectors (planningSelectors.ts) return those references as-is.
 *  - Actions never run during render and never call React setState.
 *  - `hydrate` and `dragOver` bail out (no `set`) when nothing would change.
 */

/** Todos per list, in display order. Key = BACKLOG or a planned sprint id. */
export type Containers = Readonly<Record<string, readonly Todo[]>>;
/** Row ids per list, in display order (includes the live drag preview). */
export type RowIds = Readonly<Record<string, readonly string[]>>;

export interface DragPreview {
  activeId: string;
  /** The list the drag started in. */
  origin: string;
  ids: RowIds;
}

export type MoveFailure = "failed" | "discarded";

export interface MoveHandlers {
  onSuccess?: (saved: Todo) => void;
  /**
   * `failed`: this move was rejected (state is already rolled back).
   * `discarded`: an earlier move failed, so this one, built on top of it, was dropped unsent.
   */
  onError?: (error: Error, reason: MoveFailure) => void;
}

/** What a drop turned into; handed to the caller so it can word its toast. */
export interface PreparedMove {
  todo: Todo;
  variables: MoveVariables;
  destinationId: string;
  destinationName: string;
  changedList: boolean;
}

export interface DropTarget {
  id: string;
  /** True when `id` is a list (container id), false when it is a row (todo id). */
  isList: boolean;
}

export interface DragOverInput extends DropTarget {
  activeId: string;
  /** The dragged row is below the middle of the row it is held over. */
  below: boolean;
}

/** Everything the page needs from the query cache. `undefined` = not loaded yet. */
export interface ServerSnapshot {
  projectId: string;
  sprints: readonly Sprint[] | undefined;
  backlog: readonly Todo[] | undefined;
  sprintTodos: Readonly<Record<string, readonly Todo[] | undefined>>;
}

interface QueuedMove {
  variables: MoveVariables;
  /** Lists right after this move (becomes `confirmed` once the server accepts it). */
  after: Containers;
  handlers: MoveHandlers | undefined;
  settle: (() => void) | null;
  epoch: number;
}

interface PlanningState {
  projectId: string | null;
  /** Bumped by `reset`; lets a request that outlives its page recognise it is stale. */
  epoch: number;

  sprintsSource: readonly Sprint[] | null;
  sprintsById: Readonly<Record<string, Sprint>>;
  plannedIds: readonly string[];
  activeSprintId: string | null;

  /** What the user sees (optimistic). */
  containers: Containers;
  /** Last server-confirmed lists: the rollback target. */
  confirmed: Containers;
  todosById: Readonly<Record<string, Todo | undefined>>;
  rowIds: RowIds;
  loaded: Readonly<Record<string, boolean>>;

  drag: DragPreview | null;
  queue: readonly QueuedMove[];
  /** Server data that arrived while busy; applied when the store goes idle without a move. */
  incoming: ServerSnapshot | null;
  /** Refetches server truth after moves settle (registered by planningSync). */
  settle: (() => void) | null;

  setSettle: (settle: (() => void) | null) => void;
  reset: () => void;
  hydrate: (snapshot: ServerSnapshot) => void;

  beginDrag: (activeId: string) => void;
  /** Returns true when the preview changed (the caller uses it to damp collision flicker). */
  dragOver: (input: DragOverInput) => boolean;
  cancelDrag: () => void;
  dropDrag: (over: DropTarget | null, handlersFor?: (move: PreparedMove) => MoveHandlers) => void;

  enqueueMove: (variables: MoveVariables, handlers?: MoveHandlers) => void;
}

// ───────────────────────── pure helpers ─────────────────────────

const EMPTY_IDS: readonly string[] = [];
const EMPTY_TODOS: readonly Todo[] = [];
const EMPTY_QUEUE: readonly QueuedMove[] = [];

const sameItems = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a === b || (a.length === b.length && a.every((item, i) => item === b[i]));

type Flags = Readonly<Record<string, boolean>>;

const sameFlags = (a: Flags, b: Flags) => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
};

const idsOf = (todos: readonly Todo[]): readonly string[] => todos.map((t) => t.id);

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const containerHolding = (ids: RowIds, rowId: string): string | undefined =>
  Object.keys(ids).find((key) => ids[key].includes(rowId));

/** Same content → same reference, so selectors and `memo` can rely on `===`. */
function deriveRowIds(prev: RowIds, containers: Containers): RowIds {
  const keys = Object.keys(containers);
  let changed = keys.length !== Object.keys(prev).length;
  const next: Record<string, readonly string[]> = {};
  for (const key of keys) {
    const fresh = idsOf(containers[key]);
    const old: readonly string[] | undefined = prev[key];
    next[key] = old && sameItems(old, fresh) ? old : fresh;
    if (next[key] !== old) changed = true;
  }
  return changed ? next : prev;
}

function indexTodos(containers: Containers): Record<string, Todo> {
  const byId: Record<string, Todo> = {};
  for (const list of Object.values(containers)) for (const todo of list) byId[todo.id] = todo;
  return byId;
}

/** Applies a move to every list in the store, with the same rules the server uses (`planMove`). */
function applyMove(containers: Containers, move: MoveVariables): Containers {
  const keys = Object.keys(containers);
  const lists: CachedTodoList[] = keys.map((key) => ({
    query: { sprintId: key },
    todos: containers[key],
  }));
  const next = planMove(lists, move);
  if (next.every((list) => list === undefined)) return containers;
  const result: Record<string, readonly Todo[]> = {};
  keys.forEach((key, i) => {
    result[key] = next[i] ?? containers[key];
  });
  return result;
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error("Something went wrong.");

const initial = {
  projectId: null,
  sprintsSource: null,
  sprintsById: {},
  plannedIds: EMPTY_IDS,
  activeSprintId: null,
  containers: {},
  confirmed: {},
  todosById: {},
  rowIds: {},
  loaded: {},
  drag: null,
  queue: EMPTY_QUEUE,
  incoming: null,
  settle: null,
} satisfies Partial<PlanningState>;

export const usePlanningStore = create<PlanningState>()((set, get) => {
  /** Lists + the data derived from them, always updated together. */
  const listsPatch = (state: PlanningState, containers: Containers) => ({
    containers,
    todosById: indexTodos(containers),
    rowIds: state.drag ? state.drag.ids : deriveRowIds(state.rowIds, containers),
  });

  let running = false;

  async function runQueue(): Promise<void> {
    if (running) return;
    running = true;
    let settle: (() => void) | null = null;
    try {
      for (;;) {
        const entry = get().queue[0];
        if (!entry) break;
        settle = entry.settle;
        const { variables } = entry;
        try {
          const saved = await todosApi.moveTodo(variables.todoId, {
            sprintId: variables.sprintId,
            status: variables.status,
            position: variables.position,
          });
          if (entry.epoch !== get().epoch) continue; // the page is gone; `reset` cleared the queue
          set((s) => ({ queue: s.queue.slice(1), confirmed: entry.after }));
          entry.handlers?.onSuccess?.(saved);
        } catch (cause) {
          if (entry.epoch !== get().epoch) continue;
          const error = toError(cause);
          const discarded = get().queue.slice(1);
          // Later moves were positioned against a state that contained this one: drop them.
          set((s) => ({ ...listsPatch(s, s.confirmed), queue: [] }));
          entry.handlers?.onError?.(error, "failed");
          for (const later of discarded) later.handlers?.onError?.(error, "discarded");
          break;
        }
      }
    } finally {
      running = false;
      // Whether it worked or not, the server is the truth: refetch lists, counts and stats.
      // Server data that arrived mid-move is older than that refetch, so it is dropped.
      if (get().queue.length === 0) set({ incoming: null });
      settle?.();
    }
  }

  return {
    ...initial,
    epoch: 0,

    setSettle: (settle) => set({ settle }),

    reset: () => set((s) => ({ ...initial, epoch: s.epoch + 1 })),

    hydrate: (snapshot) => {
      const state = get();
      if (state.queue.length > 0 || state.drag) {
        set({ incoming: snapshot });
        return;
      }

      const patch: Partial<PlanningState> = {};
      if (state.projectId !== snapshot.projectId) patch.projectId = snapshot.projectId;

      let plannedIds = state.plannedIds;
      if (snapshot.sprints && snapshot.sprints !== state.sprintsSource) {
        patch.sprintsSource = snapshot.sprints;
        patch.sprintsById = Object.fromEntries(snapshot.sprints.map((s) => [s.id, s]));
        const planned = snapshot.sprints.filter((s) => s.status === "planned").map((s) => s.id);
        if (!sameItems(planned, state.plannedIds)) plannedIds = patch.plannedIds = planned;
        patch.activeSprintId = snapshot.sprints.find((s) => s.status === "active")?.id ?? null;
      }

      // Lists: backlog + every planned sprint. A list that isn't loaded keeps what it had.
      const next: Record<string, readonly Todo[]> = {};
      const loaded: Record<string, boolean> = {};
      const sources: [string, readonly Todo[] | undefined][] = [
        [BACKLOG, snapshot.backlog],
        ...plannedIds.map((id): [string, readonly Todo[] | undefined] => [
          id,
          snapshot.sprintTodos[id] && sortSprintTodos(snapshot.sprintTodos[id]),
        ]),
      ];
      let listsChanged = Object.keys(state.containers).length !== sources.length;
      for (const [id, fresh] of sources) {
        const old: readonly Todo[] | undefined = state.containers[id];
        const value = fresh ?? old ?? EMPTY_TODOS;
        next[id] = old && sameItems(old, value) ? old : value;
        loaded[id] = fresh !== undefined || !!state.loaded[id];
        if (next[id] !== old) listsChanged = true;
      }
      if (!sameFlags(loaded, state.loaded)) patch.loaded = loaded;
      if (listsChanged) {
        Object.assign(patch, listsPatch(state, next), { confirmed: next });
      }
      if (Object.keys(patch).length > 0) set(patch);
    },

    beginDrag: (activeId) => {
      const { containers, drag } = get();
      if (drag) return;
      const origin = Object.keys(containers).find((key) =>
        containers[key].some((t) => t.id === activeId),
      );
      if (!origin) return;
      const ids = Object.fromEntries(Object.keys(containers).map((k) => [k, idsOf(containers[k])]));
      set({ drag: { activeId, origin, ids }, rowIds: ids });
    },

    dragOver: ({ activeId, id, isList, below }) => {
      const { drag } = get();
      if (!drag || drag.activeId !== activeId) return false;
      const from = containerHolding(drag.ids, activeId);
      const to = isList ? id : containerHolding(drag.ids, id);
      if (!from || !to || from === to || !(to in drag.ids)) return false;

      const target = drag.ids[to];
      let index = target.length;
      if (!isList) {
        const overIndex = target.indexOf(id);
        index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length;
      }
      const ids: RowIds = {
        ...drag.ids,
        [from]: drag.ids[from].filter((rowId) => rowId !== activeId),
        [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
      };
      set({ drag: { ...drag, ids }, rowIds: ids });
      return true;
    },

    cancelDrag: () => {
      const state = get();
      if (!state.drag) return;
      set({ drag: null, rowIds: deriveRowIds(state.rowIds, state.containers) });
      const { incoming } = get();
      if (incoming && get().queue.length === 0) {
        set({ incoming: null });
        get().hydrate(incoming);
      }
    },

    dropDrag: (over, handlersFor) => {
      const state = get();
      const { drag, todosById, containers, sprintsById } = state;
      const moved = drag && todosById[drag.activeId];
      const to = drag && containerHolding(drag.ids, drag.activeId);
      if (!drag || !moved || !to) {
        get().cancelDrag();
        return;
      }

      let finalIds = drag.ids[to];
      if (over) {
        const overList = over.isList ? over.id : containerHolding(drag.ids, over.id);
        if (overList === to) {
          const from = finalIds.indexOf(drag.activeId);
          const target = over.isList ? finalIds.length - 1 : finalIds.indexOf(over.id);
          if (target >= 0 && target !== from) finalIds = moveItem(finalIds, from, target);
        }
      }

      const originIds = containers[drag.origin].map((t) => t.id);
      if (
        to === drag.origin &&
        originIds.indexOf(drag.activeId) === finalIds.indexOf(drag.activeId)
      ) {
        get().cancelDrag(); // dropped where it was
        return;
      }

      const others = finalIds.flatMap((id) => (id === drag.activeId ? [] : (todosById[id] ?? [])));
      const position = movePosition(
        others,
        finalIds.indexOf(drag.activeId),
        moved.status,
        to !== BACKLOG,
      );
      const changedList = to !== drag.origin;
      const variables: MoveVariables = changedList
        ? { todoId: moved.id, sprintId: to === BACKLOG ? null : to, position }
        : { todoId: moved.id, position };
      const prepared: PreparedMove = {
        todo: moved,
        variables,
        destinationId: to,
        destinationName: to === BACKLOG ? "Backlog" : (sprintsById[to]?.name ?? "the sprint"),
        changedList,
      };
      get().enqueueMove(variables, handlersFor?.(prepared));
    },

    enqueueMove: (variables, handlers) => {
      const state = get();
      const after = applyMove(state.containers, variables);
      const entry: QueuedMove = {
        variables,
        after,
        handlers,
        settle: state.settle,
        epoch: state.epoch,
      };
      // One synchronous update: the new order and the end of the drag preview land in the same
      // render, so there is no frame that shows the old order.
      set({
        ...listsPatch({ ...state, drag: null }, after),
        drag: null,
        queue: [...state.queue, entry],
      });
      void runQueue();
    },
  };
});
