import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { sendKeepalive } from "../api/client";
import * as todosApi from "../features/todos/api/todosApi";
import { allTodos, insertIntoBoard, removeFromBoard } from "./boardColumns";
import { invalidateTodoData, projectTodosPredicate } from "./queryKeys";
import type { SprintBoardResponse, Todo } from "../types/api";

/**
 * Undoable deletes. The server has no "restore", so a delete is staged first: the todo vanishes from
 * every cached list and board straight away, while `DELETE /todos/:id` waits until the undo window
 * closes. Undo then only has to put the todo back into the caches (it still exists on the server, with
 * its key, position and history). A later refetch cannot bring a staged todo back, see `guard`.
 */

type Placement =
  { kind: "list"; key: QueryKey; index: number } | { kind: "board"; key: QueryKey; index: number };

interface Staged {
  todo: Todo;
  projectId: string;
  placements: Placement[];
  queryClient: QueryClient;
}

const staged = new Map<string, Staged>();
const guarded = new WeakSet<QueryClient>();

export const isStaged = (todoId: string): boolean => staged.has(todoId);

/** Removes the todo from every cached list/board and remembers where each one had it. */
function removeFromCaches(queryClient: QueryClient, projectId: string, todoId: string) {
  const placements: Placement[] = [];
  for (const [key, data] of queryClient.getQueriesData<Todo[]>({
    predicate: projectTodosPredicate(projectId),
  })) {
    const index = data?.findIndex((t) => t.id === todoId) ?? -1;
    if (data && index >= 0) {
      placements.push({ kind: "list", key, index });
      queryClient.setQueryData<Todo[]>(
        key,
        data.filter((t) => t.id !== todoId),
      );
    }
  }
  for (const [key, board] of queryClient.getQueriesData<SprintBoardResponse>({
    queryKey: ["board"],
  })) {
    if (!board) continue;
    const column = Object.values(board.columns).find((todos) => todos.some((t) => t.id === todoId));
    if (!column) continue;
    placements.push({ kind: "board", key, index: column.findIndex((t) => t.id === todoId) });
    queryClient.setQueryData(key, removeFromBoard(board, todoId));
  }
  return placements;
}

function putBack({ queryClient, todo, placements }: Staged) {
  for (const placement of placements) {
    if (placement.kind === "list") {
      const data = queryClient.getQueryData<Todo[]>(placement.key);
      if (!data || data.some((t) => t.id === todo.id)) continue;
      const at = Math.min(placement.index, data.length);
      queryClient.setQueryData<Todo[]>(placement.key, [
        ...data.slice(0, at),
        todo,
        ...data.slice(at),
      ]);
    } else {
      const board = queryClient.getQueryData<SprintBoardResponse>(placement.key);
      if (board)
        queryClient.setQueryData(placement.key, insertIntoBoard(board, todo, placement.index));
    }
  }
}

/**
 * A refetch that finishes during the undo window still returns the todo (the server has it).
 * This listener strips it again, in the same tick, so it can't flash back into the lists.
 */
function guard(queryClient: QueryClient) {
  if (guarded.has(queryClient)) return;
  guarded.add(queryClient);
  queryClient.getQueryCache().subscribe((event) => {
    if (staged.size === 0) return;
    if (event.type !== "updated" || event.action.type !== "success") return;
    const key = event.query.queryKey;
    if (key[0] === "todos") {
      const data = event.query.state.data as Todo[] | undefined;
      if (data?.some((t) => staged.has(t.id))) {
        queryClient.setQueryData<Todo[]>(
          key,
          data.filter((t) => !staged.has(t.id)),
        );
      }
    } else if (key[0] === "board") {
      let board = event.query.state.data as SprintBoardResponse | undefined;
      if (!board) return;
      const hidden = allTodos(board.columns).filter((t) => staged.has(t.id));
      if (hidden.length === 0) return;
      for (const todo of hidden) board = removeFromBoard(board, todo.id);
      queryClient.setQueryData(key, board);
    }
  });
}

export interface StagedDelete {
  /** Puts the todo back. */
  undo: () => void;
  /** Sends the DELETE. On failure the todo is put back and the error is rethrown. */
  commit: () => Promise<void>;
}

export function stageDelete(queryClient: QueryClient, projectId: string, todo: Todo): StagedDelete {
  guard(queryClient);
  const entry: Staged = { todo, projectId, queryClient, placements: [] };
  // Cancel in-flight refetches first: one that lands after the removal would bring the todo back.
  void queryClient.cancelQueries({ predicate: projectTodosPredicate(projectId) });
  void queryClient.cancelQueries({ queryKey: ["board"] });
  entry.placements = removeFromCaches(queryClient, projectId, todo.id);
  staged.set(todo.id, entry);

  return {
    undo: () => {
      if (!staged.delete(todo.id)) return;
      putBack(entry);
      void invalidateTodoData(queryClient, projectId);
    },
    commit: async () => {
      if (!staged.has(todo.id)) return;
      try {
        await todosApi.deleteTodo(todo.id);
        staged.delete(todo.id);
      } catch (error) {
        staged.delete(todo.id);
        // Already gone on the server (another tab, a retry): nothing to restore.
        if (!(typeof error === "object" && error && "status" in error && error.status === 404)) {
          putBack(entry);
          throw error;
        }
      } finally {
        void invalidateTodoData(queryClient, projectId);
      }
    },
  };
}

/** Commits every staged delete now (logout: the token is about to go). Failures are ignored. */
export async function commitAllStaged(): Promise<void> {
  await Promise.allSettled(
    [...staged.values()].map(async ({ todo, projectId, queryClient }) => {
      await todosApi.deleteTodo(todo.id);
      staged.delete(todo.id);
      void invalidateTodoData(queryClient, projectId);
    }),
  );
}

/** The tab is closing or reloading: send the deletes in a way that outlives the page. */
export function commitStagedOnPageHide(): void {
  for (const { todo } of staged.values()) sendKeepalive("DELETE", `/todos/${todo.id}`);
  staged.clear();
}
