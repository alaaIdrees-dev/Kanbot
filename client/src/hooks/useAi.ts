import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as aiApi from "../api/ai";
import { useAiUiStore, type ChatRequestPayload } from "../stores/aiUiStore";
import type { GenerateTodosRequest, PlanSprintRequest, SprintBoardResponse } from "../types/api";
import { aiStatusKey, boardKey, sprintsKey } from "./queryKeys";

/**
 * AI-5. Called once per session: the answer never changes while the server runs, so it is never
 * refetched (`staleTime: Infinity`). A failure is not worth an error state: the badge just stays hidden.
 */
export function useAiStatus() {
  return useQuery({
    queryKey: aiStatusKey,
    queryFn: aiApi.getAiStatus,
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * AI-1. The conversation lives in the AI UI store. The callbacks are set on the hook (not on each
 * `mutate` call) so a reply that arrives after the panel unmounted still lands in the store; a reply
 * from before "New chat" or a project switch is dropped by the store (epoch check).
 */
export function useAssistantChat(projectId: string) {
  const mutation = useMutation({
    mutationFn: ({ messages }: ChatRequestPayload) => aiApi.chat(projectId, { messages }),
    onSuccess: (response, { epoch }) =>
      useAiUiStore.getState().receiveReply(epoch, response.message.content),
    onError: (error, { epoch }) => useAiUiStore.getState().receiveError(epoch, error.message),
  });
  const { mutate } = mutation;

  const send = (content: string): boolean => {
    const payload = useAiUiStore.getState().beginSend(content);
    if (payload) mutate(payload);
    return payload !== null;
  };
  const retry = () => {
    const payload = useAiUiStore.getState().beginRetry();
    if (payload) mutate(payload);
  };
  return { send, retry };
}

/** AI-2. Drafts only: nothing is saved by this call. */
export function useGenerateTodos(projectId: string) {
  return useMutation({
    mutationFn: (data: GenerateTodosRequest) => aiApi.generateTodos(projectId, data),
  });
}

/** AI-3. A suggestion only: the sprint is created later with `useCreateSprint`. */
export function usePlanSprint(projectId: string) {
  return useMutation({
    mutationFn: (data: PlanSprintRequest) => aiApi.planSprint(projectId, data),
  });
}

/**
 * AI-4. The server saves the summary on the sprint, so the board cache (which the board and the
 * sprint details page read) is updated in place and the sprint list is refreshed. Done in the hook's
 * `onSuccess` so it also runs when the dialog that started it has already closed.
 */
export function useSummarizeSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => aiApi.summarizeSprint(sprintId),
    onSuccess: ({ sprint }, sprintId) => {
      queryClient.setQueryData<SprintBoardResponse>(boardKey(sprintId), (board) =>
        board ? { ...board, sprint } : board,
      );
      return queryClient.invalidateQueries({ queryKey: sprintsKey(projectId) });
    },
  });
}
