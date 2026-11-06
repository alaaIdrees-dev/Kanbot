import type {
  BulkCreateTodosRequest,
  BulkCreateTodosResponse,
  CreateTodoRequest,
  MoveTodoRequest,
  Todo,
  TodoListQuery,
  TodoListResponse,
  UpdateTodoRequest,
} from "../../../types/api";
import { request } from "../../../api/client";

// The `{ todo }` envelope is documented in the implementation plan §4.3 and is local to this module.
interface TodoResponse {
  todo: Todo;
}

function queryString(query: TodoListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** BL-1, BL-6: `sprintId: "backlog"` for the backlog; add `search`/`priority`/`type` to filter. */
export const listTodos = async (projectId: string, query: TodoListQuery = {}): Promise<Todo[]> =>
  (await request<TodoListResponse>("GET", `/projects/${projectId}/todos${queryString(query)}`))
    .todos;

/** BL-2. New todos are appended to the end of their list by the server. */
export const createTodo = async (projectId: string, data: CreateTodoRequest): Promise<Todo> =>
  (await request<TodoResponse>("POST", `/projects/${projectId}/todos`, data)).todo;

/** BL-3. Any subset of fields; the server appends to the new list if `sprintId`/`status` changes. */
export const updateTodo = async (todoId: string, data: UpdateTodoRequest): Promise<Todo> =>
  (await request<TodoResponse>("PATCH", `/todos/${todoId}`, data)).todo;

/** BL-4. */
export const deleteTodo = (todoId: string): Promise<void> =>
  request<void>("DELETE", `/todos/${todoId}`);

/**
 * BL-5, BL-7, SPR-5. `position` is the index in the target list *after removing the todo*
 * (plan §3.5): never compute `order` on the client, the server renumbers.
 */
export const moveTodo = async (todoId: string, data: MoveTodoRequest): Promise<Todo> =>
  (await request<TodoResponse>("POST", `/todos/${todoId}/move`, data)).todo;

/** AI-2. Saves the drafts the user kept, in one request (1–50 todos, appended to the backlog). */
export const bulkCreateTodos = async (
  projectId: string,
  data: BulkCreateTodosRequest,
): Promise<Todo[]> =>
  (await request<BulkCreateTodosResponse>("POST", `/projects/${projectId}/todos/bulk`, data)).todos;
