import { useMemo } from "react";
import DriveFileMoveOutlined from "@mui/icons-material/DriveFileMoveOutlined";
import VerticalAlignBottom from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignTop from "@mui/icons-material/VerticalAlignTop";
import { BACKLOG, containerOf, endPosition, type MoveVariables } from "../../lib/todoLists";
import { usePlanningStore } from "../../stores/planningStore";
import type { Todo } from "../../types/api";
import type { RowMoveAction } from "./TodoRow";

export type RunMove = (
  todo: Todo,
  move: Omit<MoveVariables, "todoId">,
  successMessage?: string,
) => void;

/**
 * The row menu's non-drag alternative to drag and drop (BL-5, BL-7): "Move to top / bottom",
 * "Move to backlog", "Move to Sprint N". Positions come from the store's FULL lists, so they are
 * right even while the backlog is filtered.
 */
export function useMoveActions(todo: Todo | undefined, runMove: RunMove): RowMoveAction[] {
  const containers = usePlanningStore((s) => s.containers);
  const plannedIds = usePlanningStore((s) => s.plannedIds);
  const sprintsById = usePlanningStore((s) => s.sprintsById);
  const activeSprintId = usePlanningStore((s) => s.activeSprintId);

  return useMemo(() => {
    if (!todo) return [];
    const container = containerOf(todo);
    const inSprint = container !== BACKLOG;
    const list = containers[container] as readonly Todo[] | undefined;
    // A sprint's list is one status column; the backlog is one list.
    const column = list && (inSprint ? list.filter((t) => t.status === todo.status) : list);
    const at = column ? column.findIndex((t) => t.id === todo.id) : -1;

    const actions: RowMoveAction[] = [
      {
        key: "top",
        label: "Move to top",
        icon: <VerticalAlignTop fontSize="small" />,
        disabled: at <= 0,
        onSelect: () => runMove(todo, { position: 0 }, `${todo.key} moved to the top`),
      },
      {
        key: "bottom",
        label: "Move to bottom",
        icon: <VerticalAlignBottom fontSize="small" />,
        disabled: !column || at < 0 || at >= column.length - 1,
        onSelect: () =>
          runMove(todo, { position: (column?.length ?? 1) - 1 }, `${todo.key} moved to the bottom`),
      },
    ];

    let first = true;
    const destination = (action: Omit<RowMoveAction, "dividerBefore">) => {
      actions.push({ ...action, dividerBefore: first });
      first = false;
    };
    if (inSprint) {
      destination({
        key: "backlog",
        label: "Move to backlog",
        icon: <DriveFileMoveOutlined fontSize="small" />,
        onSelect: () =>
          runMove(
            todo,
            { sprintId: null, position: 0 },
            `${todo.key} moved to the top of the backlog`,
          ),
      });
    }
    // Planned sprints and the active one; appended to the end of the todo's own status column.
    const targets = [...plannedIds, ...(activeSprintId ? [activeSprintId] : [])];
    for (const id of targets) {
      const sprint = sprintsById[id];
      if (id === container) continue;
      const target = containers[id] as readonly Todo[] | undefined;
      // The active sprint's list isn't part of the planning lists: its stats give the end slot.
      const position = target
        ? endPosition(target, todo.status, true)
        : sprint.stats.byStatus[todo.status];
      destination({
        key: `sprint-${id}`,
        label:
          sprint.status === "active" ? `Move to ${sprint.name} (active)` : `Move to ${sprint.name}`,
        icon: <DriveFileMoveOutlined fontSize="small" />,
        onSelect: () =>
          runMove(todo, { sprintId: id, position }, `${todo.key} moved to ${sprint.name}`),
      });
    }
    return actions;
  }, [todo, containers, plannedIds, sprintsById, activeSprintId, runMove]);
}
