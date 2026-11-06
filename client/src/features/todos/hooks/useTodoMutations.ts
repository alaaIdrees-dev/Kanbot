import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as todosApi from "../api/todosApi";
import { removeFromBoard } from "../../../lib/boardColumns";
import type {
  BulkCreateTodosRequest,
  CreateTodoRequest,
  SprintBoardResponse,
  Todo,
  UpdateTodoRequest,
} from "../../../types/api";
import { invalidateTodoData, projectTodosPredicate } from "../../../lib/queryKeys";

/** BL-2. The caller clears/refocuses its input; the list updates via invalidation. */
export function useCreateTodo(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTodoRequest) => todosApi.createTodo(projectId, data),
    onSuccess: () => invalidateTodoData(queryClient, projectId),
  });
}

/** AI-2. Saves the checked drafts; the backlog list and the counters refresh through invalidation. */
export function useBulkCreateTodos(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkCreateTodosRequest) => todosApi.bulkCreateTodos(projectId, data),
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
      // The sprint boards (SPR-4) hold the same todos grouped by status.
      await queryClient.cancelQueries({ queryKey: ["board"] });
      const boards = queryClient.getQueriesData<SprintBoardResponse>({ queryKey: ["board"] });
      for (const [key, board] of boards) {
        if (board) queryClient.setQueryData(key, removeFromBoard(board, todoId));
      }
      return { snapshots, boards };
    },
    onError: (_err, _todoId, context) => {
      for (const [key, data] of [...(context?.snapshots ?? []), ...(context?.boards ?? [])]) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => invalidateTodoData(queryClient, projectId),
  });
}
