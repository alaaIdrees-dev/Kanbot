import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import * as todosApi from "../api/todos";
import { projectKey } from "./useProjects";
import { sprintsKey } from "./useSprints";
import type { CreateTodoRequest, Todo, TodoListQuery, UpdateTodoRequest } from "../types/api";

/** Query key (implementation plan §3.4): `['todos', projectId, filters]`. */
export const todosKey = (projectId: string, query: TodoListQuery) =>
  ["todos", projectId, query] as const;

/** Any cached todo list of this project, whatever the filters — used to invalidate broadly. */
const projectTodosPredicate = (projectId: string) => (q: { queryKey: readonly unknown[] }) =>
  q.queryKey[0] === "todos" && q.queryKey[1] === projectId;

/**
 * Todo lists AND the aggregates derived from them: `project.stats.backlogCount` (backlog header,
 * "N of total") and each sprint's live `stats`. Every todo mutation must refresh all three.
 */
function invalidateTodoData(queryClient: QueryClient, projectId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ predicate: projectTodosPredicate(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: sprintsKey(projectId) }),
  ]);
}

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
        if (data) queryClient.setQueryData<Todo[]>(key, data.filter((t) => t.id !== todoId));
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
