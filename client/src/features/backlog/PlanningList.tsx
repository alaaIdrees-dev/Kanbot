import { memo, type ReactNode } from "react";
import { useIsHeldOver, useRowIds, useTodo } from "../../stores/planningSelectors";
import type { Todo } from "../../types/api";
import { SortableTodoList } from "./SortableTodoList";
import { SortableTodoRow } from "./SortableTodoRow";
import { useMoveActions, type RunMove } from "./useMoveActions";

/** What every row needs from the page; the same stable callbacks are shared by all lists. */
export interface RowHandlers {
  onOpenTodo: (todo: Todo) => void;
  onDeleteTodo: (todo: Todo) => void;
  runMove: RunMove;
  dragDisabledReason: string | undefined;
}

interface PlanningRowProps extends RowHandlers {
  todoId: string;
  containerId: string;
}

/** One row. It reads its own todo, so a drop only re-renders the rows whose todo changed. */
const PlanningRow = memo(function PlanningRow({
  todoId,
  containerId,
  onOpenTodo,
  onDeleteTodo,
  runMove,
  dragDisabledReason,
}: PlanningRowProps) {
  const todo = useTodo(todoId);
  const moveActions = useMoveActions(todo, runMove);
  if (!todo) return null;
  return (
    <SortableTodoRow
      todo={todo}
      containerId={containerId}
      onOpen={onOpenTodo}
      onDelete={onDeleteTodo}
      moveActions={moveActions}
      dragDisabledReason={dragDisabledReason}
    />
  );
});

interface PlanningListProps {
  containerId: string;
  label: string;
  rows: RowHandlers;
  /** Show only these rows (a filtered backlog); default: every row of the list. */
  visibleIds?: readonly string[];
  emptyContent?: ReactNode;
}

/** A sortable list (backlog or planned sprint) fed by the planning store. */
export function PlanningList({
  containerId,
  label,
  rows,
  visibleIds,
  emptyContent,
}: PlanningListProps) {
  const storeIds = useRowIds(containerId);
  const ids = visibleIds ?? storeIds;
  const highlighted = useIsHeldOver(containerId);
  return (
    <SortableTodoList
      containerId={containerId}
      ids={ids}
      label={label}
      highlighted={highlighted}
      emptyContent={emptyContent}
    >
      {ids.map((id) => (
        <PlanningRow key={id} todoId={id} containerId={containerId} {...rows} />
      ))}
    </SortableTodoList>
  );
}
