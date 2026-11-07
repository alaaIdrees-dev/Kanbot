import { CreateTodoDialog, TodoDetailsDialog } from "../todos";
import { useShellUiStore } from "./store/shellUiStore";

/**
 * Dialogs that keyboard shortcuts and the command palette open from any project page: create todo
 * and todo details. (Pages keep their own details dialog for row and card clicks.)
 */
export function GlobalDialogs({ projectId }: { projectId: string }) {
  const createTodo = useShellUiStore((s) => s.createTodo);
  const details = useShellUiStore((s) => s.todoDetails);

  return (
    <>
      {createTodo.key > 0 && (
        <CreateTodoDialog
          key={`create-todo-${createTodo.key}`}
          open={createTodo.open}
          projectId={projectId}
          onClose={() => useShellUiStore.getState().closeCreateTodo()}
        />
      )}
      {details.key > 0 && (
        <TodoDetailsDialog
          key={`global-details-${details.key}`}
          open={details.open}
          todo={details.todo}
          projectId={projectId}
          onClose={() => useShellUiStore.getState().closeTodoDetails()}
          onDeleted={() => useShellUiStore.getState().closeTodoDetails()}
        />
      )}
    </>
  );
}
