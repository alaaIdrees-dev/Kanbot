import {
  TODO_STATUSES,
  type MoveTodoRequest,
  type Todo,
  type TodoListQuery,
  type TodoStatus,
} from "../types/api";

/**
 * Pure helpers for the planning lists (backlog + planned sprints): how lists are ordered, how a drop
 * becomes a `position` for `POST /todos/:id/move`, and what every cached list looks like after a
 * move (optimistic update, plan §3.4 / §3.5). No React, no I/O, so it is easy to test.
 *
 * Two kinds of list (plan §4.1): the backlog is ONE list; a sprint's list is ONE STATUS COLUMN, so a
 * sprint shown as a flat list is its columns stacked in board order.
 */

/** Container id of the backlog. A sprint's container id is its sprint id. */
export const BACKLOG = "backlog";

const STATUS_INDEX = Object.fromEntries(TODO_STATUSES.map((s, i) => [s, i])) as Record<
  TodoStatus,
  number
>;

/** The container (list) a todo currently lives in. */
export const containerOf = (todo: Pick<Todo, "sprintId">): string => todo.sprintId ?? BACKLOG;

/** A sprint's todos in board order: status column first, then `order` (same as the server). */
export function sortSprintTodos(todos: readonly Todo[]): Todo[] {
  return [...todos].sort(
    (a, b) => STATUS_INDEX[a.status] - STATUS_INDEX[b.status] || a.order - b.order,
  );
}

/** Sum of story points; an unestimated todo counts as 0 (same rule as `Sprint.stats`). */
export const sumPoints = (todos: readonly Todo[]): number =>
  todos.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * `position` for the move endpoint when a todo is dropped at `index` of the target list.
 *
 * @param targetList the target list as displayed, WITHOUT the dragged todo
 * @param index where the todo is dropped in that list
 * @param inSprint a sprint's list is one status column, so only todos of the dragged todo's own
 *   status count towards the position; the backlog is one list, so every todo counts
 */
export function movePosition(
  targetList: readonly Todo[],
  index: number,
  status: TodoStatus,
  inSprint: boolean,
): number {
  const before = targetList.slice(0, index);
  return inSprint ? before.filter((t) => t.status === status).length : before.length;
}

/** `position` that puts a todo of `status` at the END of `list` (a list without that todo). */
export function endPosition(list: readonly Todo[], status: TodoStatus, inSprint: boolean): number {
  return inSprint ? list.filter((t) => t.status === status).length : list.length;
}

// ───────────────────────── Optimistic move ─────────────────────────

const renumber = (todos: Todo[]): Todo[] =>
  todos.map((t, i) => (t.order === i ? t : { ...t, order: i }));

/** Renumbers `order` per status column (input must be in board order). */
function renumberColumns(todos: Todo[]): Todo[] {
  const next: Partial<Record<TodoStatus, number>> = {};
  return todos.map((t) => {
    const order = next[t.status] ?? 0;
    next[t.status] = order + 1;
    return t.order === order ? t : { ...t, order };
  });
}

const without = (todos: readonly Todo[], id: string): Todo[] => todos.filter((t) => t.id !== id);

/** `todos` must not contain `moved`. Mirrors what the server does with `position`. */
function insertTodo(
  todos: readonly Todo[],
  moved: Todo,
  position: number,
  inSprint: boolean,
): Todo[] {
  if (!inSprint) {
    const at = clamp(position, 0, todos.length);
    return renumber([...todos.slice(0, at), moved, ...todos.slice(at)]);
  }
  const sorted = sortSprintTodos(todos);
  const column = sorted.filter((t) => t.status === moved.status);
  const at = clamp(position, 0, column.length);
  const nextColumn = [...column.slice(0, at), moved, ...column.slice(at)];
  return renumberColumns(
    TODO_STATUSES.flatMap((s) =>
      s === moved.status ? nextColumn : sorted.filter((t) => t.status === s),
    ),
  );
}

/** One cached `['todos', projectId, query]` entry. */
export interface CachedTodoList {
  query: TodoListQuery;
  todos: readonly Todo[];
}

export interface MoveVariables extends MoveTodoRequest {
  todoId: string;
}

const isFiltered = (q: TodoListQuery) => !!(q.search || q.priority || q.type || q.status);

/**
 * What every cached todo list should look like right after the move is applied.
 * Returns one entry per input list: the new array, or `undefined` when that list does not change.
 *
 * - Unfiltered lists (the whole backlog, a whole sprint) are exact: the todo is removed from its
 *   source list and inserted at `position` in the target list, and `order` is renumbered.
 * - A FILTERED backlog view is a subset, so `position` (an index in the full list) doesn't apply to
 *   it. It stays a subsequence of the new full order, and a todo that enters it from a sprint is not
 *   added (we can't tell whether it matches the server-side filter); the refetch after the move does.
 */
export function planMove(
  lists: readonly CachedTodoList[],
  move: MoveVariables,
): (Todo[] | undefined)[] {
  const result: (Todo[] | undefined)[] = lists.map(() => undefined);
  const moved = lists.flatMap((l) => l.todos).find((t) => t.id === move.todoId);
  if (!moved) return result;

  const toSprintId = move.sprintId !== undefined ? move.sprintId : moved.sprintId;
  const toContainer = toSprintId ?? BACKLOG;
  const fromContainer = containerOf(moved);
  const inSprint = toSprintId !== null;
  const movedAfter: Todo = { ...moved, sprintId: toSprintId, status: move.status ?? moved.status };

  // 1. The complete target list.
  const targetIndex = lists.findIndex(
    (l) => l.query.sprintId === toContainer && !isFiltered(l.query),
  );
  let newTarget: Todo[] | undefined;
  if (targetIndex >= 0) {
    newTarget = insertTodo(
      without(lists[targetIndex].todos, moved.id),
      movedAfter,
      move.position,
      inSprint,
    );
    result[targetIndex] = newTarget;
  }

  // 2. Every other list that shows the source or the target.
  lists.forEach((list, i) => {
    const container = list.query.sprintId;
    if (i === targetIndex || container === undefined) return;

    if (container === toContainer) {
      // A filtered view of the target list.
      if (newTarget && list.todos.some((t) => t.id === moved.id)) {
        const ids = new Set(list.todos.map((t) => t.id));
        result[i] = newTarget.filter((t) => ids.has(t.id));
      }
    } else if (container === fromContainer) {
      const rest = without(list.todos, moved.id);
      if (isFiltered(list.query)) result[i] = rest;
      else result[i] = container === BACKLOG ? renumber(rest) : renumberColumns(rest);
    }
  });

  return result;
}
