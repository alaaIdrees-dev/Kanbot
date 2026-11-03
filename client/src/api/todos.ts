import type {
  CreateTodoRequest,
  Todo,
  TodoListQuery,
  UpdateTodoRequest,
} from "../types/api";
import { request } from "./client";

// `{ todo(s) }` envelopes are documented in the implementation plan §4.3 and are local to this module.
interface TodoListResponse {
  todos: Todo[];
}
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
