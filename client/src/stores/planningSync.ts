import type { QueryClient } from "@tanstack/react-query";
import { invalidateTodoData, sprintsKey, todosKey } from "../hooks/queryKeys";
import { BACKLOG } from "../lib/todoLists";
import type { Sprint, Todo } from "../types/api";
import { usePlanningStore, type ServerSnapshot } from "./planningStore";

/**
 * Only the UNFILTERED list queries feed the store: `{ sprintId }` and nothing else.
 * Keys whose value is `undefined` don't count: the backlog query is stored as
 * `{ sprintId: "backlog", search: undefined, priority: undefined, type: undefined }` when no
 * filter is set (TanStack hashes it without them, but `Object.keys` still lists them).
 */
function isUnfilteredList(query: unknown): boolean {
  if (typeof query !== "object" || query === null) return false;
  const keys = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  return keys.length === 1 && keys[0] === "sprintId";
}

function isRelevantKey(projectId: string, key: readonly unknown[]): boolean {
  if (key[0] === "sprints") return key[1] === projectId;
  return key[0] === "todos" && key[1] === projectId && isUnfilteredList(key[2]);
}

function readSnapshot(queryClient: QueryClient, projectId: string): ServerSnapshot {
  const sprints = queryClient.getQueryData<Sprint[]>(sprintsKey(projectId));
  const sprintTodos: Record<string, readonly Todo[] | undefined> = {};
  for (const sprint of sprints ?? []) {
    if (sprint.status === "planned") {
      sprintTodos[sprint.id] = queryClient.getQueryData<Todo[]>(
        todosKey(projectId, { sprintId: sprint.id }),
      );
    }
  }
  return {
    projectId,
    sprints,
    backlog: queryClient.getQueryData<Todo[]>(todosKey(projectId, { sprintId: BACKLOG })),
    sprintTodos,
  };
}

/**
 * Keeps the planning store in step with the query cache, WITHOUT React effects that depend on
 * query results (those are what turn "copy server data into a store" into an update loop).
 * Cache listeners run outside rendering, and `hydrate` ignores identical data, so nothing here
 * can re-trigger itself. Returns the disconnect function.
 */
export function connectPlanningSync(queryClient: QueryClient, projectId: string): () => void {
  const store = usePlanningStore.getState();
  store.reset();
  store.setSettle(() => void invalidateTodoData(queryClient, projectId));

  const sync = () => usePlanningStore.getState().hydrate(readSnapshot(queryClient, projectId));

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (!isRelevantKey(projectId, event.query.queryKey)) return;
    if (event.type === "removed" || (event.type === "updated" && event.action.type === "success")) {
      sync();
    }
  });

  sync(); // data that was already cached
  return () => {
    unsubscribe();
    usePlanningStore.getState().reset();
  };
}