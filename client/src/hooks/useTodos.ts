import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as todosApi from "../api/todos";
import { planMove, type CachedTodoList, type MoveVariables } from "../lib/todoLists";
import type { CreateTodoRequest, Todo, TodoListQuery, UpdateTodoRequest } from "../types/api";
import { invalidateTodoData, projectTodosPredicate, todosKey } from "./queryKeys";

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

/** BL-2. The caller clears/refocuses its input; the list updates via invalidation. */
export function useCreateTodo(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTodoRequest) => todosApi.createTodo(projectId, data),
    onSuccess: () => invalidateTodoData(queryClient, projectId),
  });
}

/** BL-3, BL-7. Any subset of fields; moving `sprintId`/`status` also changes which list(s) show it. */
export function useUpdateTodo(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ todoId, data }: { todoId: string; data: UpdateTodoRequest }) =>
      todosApi.updateTodo(todoId, data),
    onSuccess: () => invalidateTodoData(queryClient, projectId),
  });
}

/**
 * BL-4. Optimistic: the row disappears immediately from every cached backlog list (any
 * search/priority/type filter); a failed delete restores the snapshots and the caller shows a toast.
 */
export function useDeleteTodo(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (todoId: string) => todosApi.deleteTodo(todoId),
    onMutate: async (todoId: string) => {
      const predicate = projectTodosPredicate(projectId);
      await queryClient.cancelQueries({ predicate });
      const snapshots = queryClient.getQueriesData<Todo[]>({ predicate });
      for (const [key, data] of snapshots) {
        if (data)
          queryClient.setQueryData<Todo[]>(
            key,
            data.filter((t) => t.id !== todoId),
          );
      }
      return { snapshots };
    },
    onError: (_err, _todoId, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => invalidateTodoData(queryClient, projectId),
  });
}

/** What the planning lists need to know about one sprint's todo list. */
export interface SprintTodosState {
  sprintId: string;
  todos: Todo[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * SPR-1: one cached list per planned sprint, `['todos', projectId, { sprintId }]`. The sprint list
 * and the backlog load in parallel; these are the only dependent requests (we need the sprint ids
 * first), and each section renders on its own as soon as its list arrives.
 */
export function useSprintTodos(
  projectId: string | undefined,
  sprintIds: readonly string[],
): SprintTodosState[] {
  return useQueries({
    queries: sprintIds.map((sprintId) => ({
      queryKey: todosKey(projectId ?? "", { sprintId }),
      queryFn: () => todosApi.listTodos(projectId!, { sprintId }),
      enabled: !!projectId,
    })),
    combine: (results) =>
      results.map((result, i) => ({
        sprintId: sprintIds[i],
        todos: result.data,
        isPending: result.isPending,
        isError: result.isError,
        error: result.error,
        refetch: () => void result.refetch(),
      })),
  });
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
