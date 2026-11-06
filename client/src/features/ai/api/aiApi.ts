import type {
  AiStatusResponse,
  ChatRequest,
  ChatResponse,
  GenerateTodosRequest,
  GenerateTodosResponse,
  PlanSprintRequest,
  PlanSprintResponse,
  SprintSummaryResponse,
} from "../../../types/api";
import { request } from "../../../api/client";

/** AI-5. `mode: "mock"` means the backend has no AI key and answers with a rule-based fake. */
export const getAiStatus = (): Promise<AiStatusResponse> =>
  request<AiStatusResponse>("GET", "/ai/status");

/** AI-1. Stateless: the caller sends the whole conversation every time (1–30 messages, last from the user). */
export const chat = (projectId: string, data: ChatRequest): Promise<ChatResponse> =>
  request<ChatResponse>("POST", `/projects/${projectId}/ai/chat`, data);

/** AI-2. Returns drafts only; nothing is saved until `bulkCreateTodos`. */
export const generateTodos = (
  projectId: string,
  data: GenerateTodosRequest,
): Promise<GenerateTodosResponse> =>
  request<GenerateTodosResponse>("POST", `/projects/${projectId}/ai/generate-todos`, data);

/** AI-3. Suggests backlog todo ids that fit the capacity; nothing is created. */
export const planSprint = (
  projectId: string,
  data: PlanSprintRequest,
): Promise<PlanSprintResponse> =>
  request<PlanSprintResponse>("POST", `/projects/${projectId}/ai/plan-sprint`, data);

/** AI-4. Active or completed sprints only (a planned one is a 409). The summary is saved on the sprint. */
export const summarizeSprint = (sprintId: string): Promise<SprintSummaryResponse> =>
  request<SprintSummaryResponse>("POST", `/sprints/${sprintId}/ai/summary`);
