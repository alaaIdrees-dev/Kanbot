import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as todosApi from "../api/todosApi";
import type {
  BulkCreateTodosRequest,
  CreateTodoRequest,
  UpdateTodoRequest,
} from "../../../types/api";
import { invalidateTodoData } from "../../../lib/queryKeys";

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

// BL-4 (delete) lives in useUndoableDelete.ts: a delete is staged for a few seconds so it can be undone.
