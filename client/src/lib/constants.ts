import type { SprintStatus, TodoPriority, TodoStatus, TodoType } from "../types/api";

/**
 * User-facing labels for the API enums (NFR-9: English only). Status and priority are never
 * conveyed by colour alone (NFR-5): always render the label and/or the icon from
 * design/todoVisuals.ts next to the colour token.
 */
export const STATUS_LABEL: Record<TodoStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const PRIORITY_LABEL: Record<TodoPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TYPE_LABEL: Record<TodoType, string> = {
  task: "Task",
  story: "Story",
  bug: "Bug",
};

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
};
