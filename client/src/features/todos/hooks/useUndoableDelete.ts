import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useUndoToast } from "../../../hooks/useUndoToast";
import { stageDelete } from "../../../lib/pendingDeletes";
import type { Todo } from "../../../types/api";

const MAX_TITLE = 40;
const short = (title: string) =>
  title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1)}…` : title;

/**
 * BL-4 with an undo window: the todo disappears at once, the toast offers "Undo", and the DELETE is
 * only sent when the toast goes away without one (see lib/pendingDeletes.ts). Callers keep their
 * confirmation dialog (NFR-3) and call this on confirm; there is nothing to wait for, so they can
 * close their dialogs immediately.
 */
export function useUndoableDelete(projectId: string) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const showUndoToast = useUndoToast();

  return useCallback(
    (todo: Todo) => {
      const staged = stageDelete(queryClient, projectId, todo);
      showUndoToast({
        message: `${todo.key} “${short(todo.title)}” deleted`,
        onUndo: () => {
          staged.undo();
          enqueueSnackbar(`${todo.key} restored`, { variant: "info" });
        },
        onExpire: () => {
          staged.commit().catch((error: unknown) => {
            const reason = error instanceof Error ? error.message : "Something went wrong.";
            enqueueSnackbar(`Couldn’t delete ${todo.key}. ${reason} It was restored.`, {
              variant: "error",
            });
          });
        },
      });
    },
    [queryClient, projectId, enqueueSnackbar, showUndoToast],
  );
}
