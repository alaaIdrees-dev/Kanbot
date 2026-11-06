import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as boardApi from "../api/boardApi";
import * as sprintsApi from "../../sprints/api/sprintsApi";
import * as todosApi from "../../todos/api/todosApi";
import { applyBoardMove, type BoardMove } from "../../../lib/boardColumns";
import type { CompleteSprintRequest, SprintBoardResponse } from "../../../types/api";
import { boardKey, invalidateTodoData, projectsKey } from "../../../lib/queryKeys";

/** SPR-4, SPR-7. `GET /sprints/:id/todos`: the sprint (live stats) and its todos per column. */
export function useSprintBoard(sprintId: string | undefined) {
  return useQuery({
    queryKey: boardKey(sprintId ?? ""),
    queryFn: () => boardApi.getSprintBoard(sprintId!),
    enabled: !!sprintId,
  });
}

export const MOVE_BOARD_MUTATION_KEY = (sprintId: string) => ["move-board-todo", sprintId] as const;

interface MoveBoardCallbacks {
  /** Runs right after the optimistic update landed in the cache (the drag preview can end). */
  onOptimistic?: () => void;
  /** Runs for every failed move, after the cache was rolled back. */
  onError?: (error: Error, move: BoardMove) => void;
}

/**
 * SPR-5. Optimistic (plan §3.4): `onMutate` cancels the board query, snapshots it and applies the
 * move; `onError` restores the snapshot; `onSettled` refetches the truth. Moves run one at a time
 * in the order the user made them, so the refetch waits for the last one in flight.
 */
export function useMoveBoardTodo(
  projectId: string,
  sprintId: string,
  { onOptimistic, onError }: MoveBoardCallbacks = {},
) {
  const queryClient = useQueryClient();
  const mutationKey = MOVE_BOARD_MUTATION_KEY(sprintId);
  return useMutation({
    mutationKey,
    scope: { id: `move-board-${sprintId}` },
    mutationFn: ({ todoId, status, position }: BoardMove) =>
      todosApi.moveTodo(todoId, { status, position }),
    onMutate: async (move) => {
      await queryClient.cancelQueries({ queryKey: boardKey(sprintId) });
      const snapshot = queryClient.getQueryData<SprintBoardResponse>(boardKey(sprintId));
      if (snapshot) queryClient.setQueryData(boardKey(sprintId), applyBoardMove(snapshot, move));
      onOptimistic?.();
      return { snapshot };
    },
    onError: (error, move, context) => {
      if (context?.snapshot) queryClient.setQueryData(boardKey(sprintId), context.snapshot);
      onError?.(error, move);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return; // a later move is still in flight
      return invalidateTodoData(queryClient, projectId);
    },
  });
}

/**
 * SPR-6. Unfinished todos leave the sprint, so todo lists, project counters, sprint list and
 * the project list (it shows the active sprint) all refresh before the dialog's promise resolves.
 */
export function useCompleteSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, data }: { sprintId: string; data: CompleteSprintRequest }) =>
      sprintsApi.completeSprint(sprintId, data),
    onSuccess: () =>
      Promise.all([
        invalidateTodoData(queryClient, projectId),
        queryClient.invalidateQueries({ queryKey: projectsKey }),
      ]),
  });
}
