import type { Sprint } from "../types/api";
import { request } from "./client";

// `{ sprints }` envelope is documented in the implementation plan §4.3 and is local to this module.
interface SprintListResponse {
  sprints: Sprint[];
}

/**
 * SPR-7. Active first, then planned, then completed.
 * Day 3 only needs this list to populate the "move to sprint" field in the todo details dialog
 * (BL-3); the planned-sprint sections and sprint CRUD arrive on Day 4.
 */
export const listSprints = async (projectId: string): Promise<Sprint[]> =>
  (await request<SprintListResponse>("GET", `/projects/${projectId}/sprints`)).sprints;
