import type {
  CompleteSprintRequest,
  CreateSprintRequest,
  Sprint,
  SprintListResponse,
  StartSprintRequest,
  UpdateSprintRequest,
} from "../../../types/api";
import { request } from "../../../api/client";

// The `{ sprint }` envelope is documented in the implementation plan §4.3 and is local to this module.
interface SprintResponse {
  sprint: Sprint;
}

/** SPR-7. Active first, then planned (oldest first), then completed (newest first). */
export const listSprints = async (projectId: string): Promise<Sprint[]> =>
  (await request<SprintListResponse>("GET", `/projects/${projectId}/sprints`)).sprints;

/** SPR-1. Creates a *planned* sprint; `todoIds` (AI-3) moves those backlog todos into it. */
export const createSprint = async (projectId: string, data: CreateSprintRequest): Promise<Sprint> =>
  (await request<SprintResponse>("POST", `/projects/${projectId}/sprints`, data)).sprint;

/** SPR-2. Name, goal and dates. */
export const updateSprint = async (sprintId: string, data: UpdateSprintRequest): Promise<Sprint> =>
  (await request<SprintResponse>("PATCH", `/sprints/${sprintId}`, data)).sprint;

/** SPR-2. Planned sprints only (409 otherwise); its todos go back to the backlog. */
export const deleteSprint = (sprintId: string): Promise<void> =>
  request<void>("DELETE", `/sprints/${sprintId}`);

/** SPR-3. Planned → active. 409 when another sprint of the project is already active. */
export const startSprint = async (sprintId: string, data: StartSprintRequest): Promise<Sprint> =>
  (await request<SprintResponse>("POST", `/sprints/${sprintId}/start`, data)).sprint;

/** SPR-6. Active → completed; unfinished todos go to the backlog or a planned sprint. */
export const completeSprint = async (
  sprintId: string,
  data: CompleteSprintRequest,
): Promise<Sprint> =>
  (await request<SprintResponse>("POST", `/sprints/${sprintId}/complete`, data)).sprint;
