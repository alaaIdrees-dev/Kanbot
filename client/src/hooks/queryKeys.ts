import type { QueryClient } from "@tanstack/react-query";
import type { TodoListQuery } from "../types/api";

// Query keys (implementation plan §3.4). They live in one module so that a hook can invalidate
// another hook's data (e.g. deleting a sprint refreshes the backlog) without the hook files
// importing each other in a circle.
export const projectsKey = ["projects"] as const;
export const projectKey = (projectId: string) => ["project", projectId] as const;
export const sprintsKey = (projectId: string) => ["sprints", projectId] as const;
/** SPR-4, SPR-7: one sprint with its todos grouped by status (`GET /sprints/:id/todos`). */
export const boardKey = (sprintId: string) => ["board", sprintId] as const;
/** AI-5: `GET /ai/status`, fetched once per session. */
export const aiStatusKey = ["ai-status"] as const;
export const todosKey = (projectId: string, query: TodoListQuery) =>
  ["todos", projectId, query] as const;

/** Any cached todo list of this project, whatever the filters — used to invalidate broadly. */
export const projectTodosPredicate = (projectId: string) => (q: { queryKey: readonly unknown[] }) =>
  q.queryKey[0] === "todos" && q.queryKey[1] === projectId;

/**
 * Todo lists AND the aggregates derived from them: `project.stats.backlogCount` (backlog header,
 * "N of total"), each sprint's live `stats`, and the cached sprint boards. Every todo mutation must refresh all three.
 */
export function invalidateTodoData(queryClient: QueryClient, projectId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ predicate: projectTodosPredicate(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: sprintsKey(projectId) }),
    // Boards are keyed by sprint, not project; only the ones on screen actually refetch.
    queryClient.invalidateQueries({ queryKey: ["board"] }),
  ]);
}
