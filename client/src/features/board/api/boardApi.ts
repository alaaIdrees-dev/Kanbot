import type { SprintBoardResponse } from "../../../types/api";
import { request } from "../../../api/client";

/** SPR-4, SPR-7. The sprint plus its todos grouped by status column (works for any sprint status). */
export const getSprintBoard = (sprintId: string): Promise<SprintBoardResponse> =>
  request<SprintBoardResponse>("GET", `/sprints/${sprintId}/todos`);
