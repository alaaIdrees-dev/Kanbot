import { useCallback } from "react";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import * as todosApi from "../../todos/api/todosApi";
import { planMove, type CachedTodoList, type MoveVariables } from "../../../lib/todoLists";
import type { Todo, TodoListQuery } from "../../../types/api";
import {
  invalidateTodoData,
  projectTodosPredicate,
  todosKey,
} from "../../../lib/queryKeys";

/** BL-1, BL-6: the backlog, optionally filtered by search/priority/type. */
export function useBacklogTodos(
  projectId: string | undefined,
  filters: Pick<TodoListQuery, "search" | "priority" | "type"> = {},
) {
  const query: TodoListQuery = { sprintId: "backlog", ...filters };
  return useQuery({
    queryKey: todosKey(projectId ?? "", query),
    queryFn: () => todosApi.listTodos(projectId!, query),
    enabled: !!projectId,
    // Keep the previous rows while a new filter loads instead of flashing a loading state (NFR-6).
    placeholderData: keepPreviousData,
  });
}

/** Load state of one planned sprint's todo list. Plain data only (no functions), see below. */
export interface SprintTodosState {
  sprintId: string;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * SPR-1: one cached list per planned sprint, `['todos', projectId, { sprintId }]`. This hook only
 * DRIVES the fetching and reports load state; the todos themselves reach the planning store
 * through `planningSync`. The result holds plain data only: a closure such as `refetch` would be a
 * new value on every render, defeat TanStack's structural sharing, and hand every consumer a new
 * array each time. Callers must pass a referentially stable `sprintIds` (memoise it).
 */
export function useSprintTodos(
  projectId: string | undefined,
  sprintIds: readonly string[],
): SprintTodosState[] {
  const combine = useCallback(
    (results: UseQueryResult<Todo[], Error>[]): SprintTodosState[] =>
      results.map((result, i) => ({
        sprintId: sprintIds[i],
        isPending: result.isPending,
        isError: result.isError,
        error: result.error,
      })),
    [sprintIds],
  );
  return useQueries({
    queries: sprintIds.map((sprintId) => ({
      queryKey: todosKey(projectId ?? "", { sprintId }),
      queryFn: () => todosApi.listTodos(projectId!, { sprintId }),
      enabled: !!projectId,
    })),
    combine,
  });
}

/** Retry for one sprint list (the combined state above carries no `refetch`). */
export function useRefetchSprintTodos(projectId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    (sprintId: string) =>
      void queryClient.refetchQueries({ queryKey: todosKey(projectId, { sprintId }) }),
    [queryClient, projectId],
  );
}

export const MOVE_TODO_MUTATION_KEY = (projectId: string) => ["move-todo", projectId] as const;

interface MoveTodoCallbacks {
  /** Runs for EVERY failed move (after the cache was rolled back), unlike per-call `mutate` callbacks. */
  onError?: (error: Error, variables: MoveVariables) => void;
}

/**
 * BL-5, BL-7: drag-and-drop and the "Move to…" menu. Optimistic (plan §3.4): `onMutate` updates every
 * cached todo list of the project (see `planMove`), `onError` restores the snapshot, `onSettled`
 * refetches the truth (lists, backlog count and sprint stats).
 *
 * Moves run one at a time, in the order the user made them: each `position` was computed against an
 * optimistic state that already contains the previous move.
 */
export function useMoveTodo(projectId: string, { onError }: MoveTodoCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MOVE_TODO_MUTATION_KEY(projectId),
    scope: { id: `move-todo-${projectId}` },
    mutationFn: ({ todoId, sprintId, status, position }: MoveVariables) =>
      todosApi.moveTodo(todoId, { sprintId, status, position }),
    onMutate: async (variables) => {
      const predicate = projectTodosPredicate(projectId);
      await queryClient.cancelQueries({ predicate });
      const snapshots = queryClient.getQueriesData<Todo[]>({ predicate });

      const lists: (CachedTodoList & { key: readonly unknown[] })[] = [];
      for (const [key, todos] of snapshots) {
        const query = key[2];
        if (todos && typeof query === "object" && query !== null) {
          lists.push({ key, query: query as TodoListQuery, todos });
        }
      }
      planMove(lists, variables).forEach((next, i) => {
        if (next) queryClient.setQueryData(lists[i].key, next);
      });
      return { snapshots };
    },
    onError: (error, variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
      onError?.(error, variables);
    },
    onSettled: () => invalidateTodoData(queryClient, projectId),
  });
}
