import {
  TODO_STATUSES,
  type SprintBoardResponse,
  type SprintStats,
  type Todo,
  type TodoStatus,
} from "../types/api";

/** The board's four columns, each already sorted by `order` (as the server returns them). */
export type BoardColumns = Record<TodoStatus, Todo[]>;
export type ColumnIds = Record<TodoStatus, readonly string[]>;

export interface BoardMove {
  todoId: string;
  status: TodoStatus;
  /** Index in the target column AFTER removing the todo (plan §3.5). */
  position: number;
}

export const allTodos = (columns: BoardColumns): Todo[] =>
  TODO_STATUSES.flatMap((status) => columns[status]);

export const columnIds = (columns: BoardColumns): ColumnIds => ({
  todo: columns.todo.map((t) => t.id),
  in_progress: columns.in_progress.map((t) => t.id),
  in_review: columns.in_review.map((t) => t.id),
  done: columns.done.map((t) => t.id),
});

/** Same numbers as the server's live `Sprint.stats`: an unestimated todo counts as 0 points. */
export function columnsStats(columns: BoardColumns): SprintStats {
  const todos = allTodos(columns);
  const byStatus = Object.fromEntries(TODO_STATUSES.map((s) => [s, columns[s].length])) as Record<
    TodoStatus,
    number
  >;
  const points = (list: readonly Todo[]) => list.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  return {
    totalTodos: todos.length,
    doneTodos: columns.done.length,
    totalPoints: points(todos),
    donePoints: points(columns.done),
    byStatus,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Gives every todo of a column its index as `order`, keeping untouched objects as they were. */
const renumber = (todos: Todo[]): Todo[] =>
  todos.map((t, i) => (t.order === i ? t : { ...t, order: i }));

function withColumns(board: SprintBoardResponse, columns: BoardColumns): SprintBoardResponse {
  return { ...board, columns, sprint: { ...board.sprint, stats: columnsStats(columns) } };
}

/**
 * Optimistic move (SPR-5), mirroring the server: remove the todo from its column, insert it at
 * `position` in the target column, renumber `order`, and keep `completedAt` and the sprint's live
 * stats consistent so the progress bar moves immediately.
 */
export function applyBoardMove(board: SprintBoardResponse, move: BoardMove): SprintBoardResponse {
  const moved = allTodos(board.columns).find((t) => t.id === move.todoId);
  if (!moved) return board;

  const columns = { ...board.columns };
  for (const status of TODO_STATUSES) {
    if (columns[status].some((t) => t.id === move.todoId)) {
      columns[status] = renumber(columns[status].filter((t) => t.id !== move.todoId));
    }
  }
  const completedAt =
    move.status !== "done" ? null : (moved.completedAt ?? new Date().toISOString());
  const target = columns[move.status];
  const at = clamp(move.position, 0, target.length);
  columns[move.status] = renumber([
    ...target.slice(0, at),
    { ...moved, status: move.status, completedAt },
    ...target.slice(at),
  ]);
  return withColumns(board, columns);
}

/** Optimistic delete: the card disappears and the stats follow. */
export function removeFromBoard(board: SprintBoardResponse, todoId: string): SprintBoardResponse {
  if (!allTodos(board.columns).some((t) => t.id === todoId)) return board;
  const columns = { ...board.columns };
  for (const status of TODO_STATUSES) {
    if (columns[status].some((t) => t.id === todoId)) {
      columns[status] = renumber(columns[status].filter((t) => t.id !== todoId));
    }
  }
  return withColumns(board, columns);
}

/** SPR-7: share of the sprint that is done. Points when it has any, otherwise todos. */
export function completionPercent(stats: SprintStats): number {
  if (stats.totalPoints > 0) return Math.round((stats.donePoints / stats.totalPoints) * 100);
  if (stats.totalTodos > 0) return Math.round((stats.doneTodos / stats.totalTodos) * 100);
  return 0;
}
