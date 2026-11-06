import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as sprintsApi from "../api/sprintsApi";
import type { CreateSprintRequest, StartSprintRequest, UpdateSprintRequest } from "../../../types/api";
import { invalidateTodoData, projectKey, sprintsKey, todosKey } from "../../../lib/queryKeys";

/** SPR-7. Used by the backlog (planned sprints, SPR-1) and by TodoDetailsDialog (BL-3, BL-7). */
export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: sprintsKey(projectId ?? ""),
    queryFn: () => sprintsApi.listSprints(projectId!),
    enabled: !!projectId,
  });
}

/** SPR-1. With `todoIds` (AI-3) the backlog changes too, so todo lists and counters refresh. */
export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSprintRequest) => sprintsApi.createSprint(projectId, data),
    onSuccess: (_sprint, data) =>
      data.todoIds?.length
        ? invalidateTodoData(queryClient, projectId)
        : queryClient.invalidateQueries({ queryKey: sprintsKey(projectId) }),
  });
}

/** SPR-2. */
export function useUpdateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, data }: { sprintId: string; data: UpdateSprintRequest }) =>
      sprintsApi.updateSprint(sprintId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sprintsKey(projectId) }),
  });
}

/** SPR-2. Its todos return to the backlog, so the backlog list and the counters refresh. */
export function useDeleteSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.deleteSprint(sprintId),
    onSuccess: (_data, sprintId) => {
      queryClient.removeQueries({ queryKey: todosKey(projectId, { sprintId }) });
      return invalidateTodoData(queryClient, projectId);
    },
  });
}

/**
 * SPR-3. Refreshes on failure too: a 409 means the sprint list we showed was stale (another sprint
 * is active), and the "Start sprint" buttons must reflect that.
 */
export function useStartSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, data }: { sprintId: string; data: StartSprintRequest }) =>
      sprintsApi.startSprint(sprintId, data),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sprintsKey(projectId) }),
        // `project.stats.activeSprint` (sidebar / projects page) changes when a sprint starts.
        queryClient.invalidateQueries({ queryKey: projectKey(projectId) }),
      ]),
  });
}
