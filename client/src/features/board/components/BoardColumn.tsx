import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import VerticalAlignBottom from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignTop from "@mui/icons-material/VerticalAlignTop";
import { Box, Chip, Typography } from "@mui/material";
import { cssVar } from "../../../design/tokens";
import { STATUS_ICON } from "../../../design/todoVisuals";
import type { BoardColumns } from "../../../lib/boardColumns";
import { STATUS_LABEL } from "../../../lib/constants";
import { useColumnPreview, useIsHeldOverColumn as useIsHeldOver } from "../store/boardUiStore";
import { TODO_STATUSES, type Todo, type TodoStatus } from "../../../types/api";
import { listDroppableId } from "../../backlog";
import { SortableTodoCard } from "./SortableTodoCard";
import type { CardMoveAction } from "./TodoCard";

export type RunBoardMove = (
  todo: Todo,
  move: { status: TodoStatus; position: number },
  successMessage?: string,
) => void;

/** "Move to top / bottom" and "Move to <other column>": the non-drag alternative (SPR-5). */
function buildMoveActions(
  todo: Todo,
  columns: BoardColumns,
  runMove: RunBoardMove,
): CardMoveAction[] {
  const column = columns[todo.status];
  const at = column.findIndex((t) => t.id === todo.id);
  const actions: CardMoveAction[] = [
    {
      key: "top",
      label: "Move to top",
      icon: <VerticalAlignTop fontSize="small" />,
      disabled: at <= 0,
      onSelect: () =>
        runMove(todo, { status: todo.status, position: 0 }, `${todo.key} moved to the top`),
    },
    {
      key: "bottom",
      label: "Move to bottom",
      icon: <VerticalAlignBottom fontSize="small" />,
      disabled: at < 0 || at >= column.length - 1,
      onSelect: () =>
        runMove(
          todo,
          { status: todo.status, position: column.length - 1 },
          `${todo.key} moved to the bottom`,
        ),
    },
  ];
  let first = true;
  for (const status of TODO_STATUSES) {
    if (status === todo.status) continue;
    actions.push({
      key: `status-${status}`,
      label: `Move to ${STATUS_LABEL[status]}`,
      statusIcon: status,
      dividerBefore: first,
      // Appended to the end of the other column, like a status change in the details view.
      onSelect: () =>
        runMove(
          todo,
          { status, position: columns[status].length },
          `${todo.key} moved to ${STATUS_LABEL[status]}`,
        ),
    });
    first = false;
  }
  return actions;
}

interface BoardColumnProps {
  status: TodoStatus;
  /** The column as the cache has it (used when nothing is being dragged). */
  todos: readonly Todo[];
  todosById: ReadonlyMap<string, Todo>;
  columns: BoardColumns;
  onOpen: (todo: Todo) => void;
  runMove: RunBoardMove;
}

/** One status column (wireframe 05): header with count, then the sortable cards; empty columns still accept drops. */
export const BoardColumn = memo(function BoardColumn({
  status,
  todos,
  todosById,
  columns,
  onOpen,
  runMove,
}: BoardColumnProps) {
  const preview = useColumnPreview(status);
  const heldOver = useIsHeldOver(status);
  const dataIds = useMemo(() => todos.map((t) => t.id), [todos]);
  const ids = preview ?? dataIds;
  const items = useMemo(() => [...ids], [ids]);
  const { setNodeRef } = useDroppable({ id: listDroppableId(status) });
  const Icon = STATUS_ICON[status];
  const headingId = `board-column-${status}`;

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0",
        minWidth: "var(--kb-layout-board-column-width)",
        borderRadius: 3,
        bgcolor: "surface.sunken",
        boxShadow: heldOver ? `inset 0 0 0 2px ${cssVar.primary}` : "none",
        transition: (theme) => theme.transitions.create("box-shadow"),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1.25 }}>
        <Box sx={{ display: "inline-flex", color: `status.${status}` }}>
          <Icon fontSize="small" aria-hidden="true" />
        </Box>
        <Typography id={headingId} variant="h6" component="h2" sx={{ flex: 1, m: 0 }}>
          {STATUS_LABEL[status]}
        </Typography>
        <Chip
          label={ids.length}
          size="small"
          aria-label={`${ids.length} ${ids.length === 1 ? "todo" : "todos"}`}
        />
      </Box>
      <Box ref={setNodeRef} sx={{ flex: 1, minHeight: 160, px: 1, pb: 1 }}>
        <SortableContext id={status} items={items} strategy={verticalListSortingStrategy}>
          <Box
            component="ul"
            aria-label={`${STATUS_LABEL[status]} todos`}
            sx={{ m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}
          >
            {ids.map((id) => {
              const todo = todosById.get(id);
              return todo ? (
                <SortableTodoCard
                  key={id}
                  todo={todo}
                  containerId={status}
                  onOpen={onOpen}
                  moveActions={buildMoveActions(todo, columns, runMove)}
                />
              ) : null;
            })}
          </Box>
        </SortableContext>
        {ids.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.muted", textAlign: "center", py: 3 }}>
            No todos here. Drag a card in.
          </Typography>
        )}
      </Box>
    </Box>
  );
});
