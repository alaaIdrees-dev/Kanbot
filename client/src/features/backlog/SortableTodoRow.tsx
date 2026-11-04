import DragIndicator from "@mui/icons-material/DragIndicator";
import { useMemo } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo } from "../../types/api";
import { TodoRow, type RowMoveAction } from "./TodoRow";

interface SortableTodoRowProps {
  todo: Todo;
  /** The list this row is shown in (BACKLOG or a sprint id); dnd-kit reports it back on drag events. */
  containerId: string;
  onOpen: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  moveActions: RowMoveAction[];
  /** When set, dragging is off and this text explains why (BL-6: shown in a tooltip). */
  dragDisabledReason?: string;
}

/**
 * A TodoRow that can be dragged by its handle (BL-5, BL-7). Only the handle starts a drag, so the
 * rest of the row keeps working as a button that opens the details. The handle is a real button:
 * Space picks the row up, arrows move it, Space drops, Esc cancels (dnd-kit's KeyboardSensor).
 */
export function SortableTodoRow({
  todo,
  containerId,
  onOpen,
  onDelete,
  moveActions,
  dragDisabledReason,
}: SortableTodoRowProps) {
  const disabled = !!dragDisabledReason;
  // A fresh `data` object on every render makes dnd-kit treat the item as changed each time.
  const data = useMemo(() => ({ containerId }), [containerId]);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, data, disabled });

  const handle = disabled ? (
    // A disabled button gets no pointer events, so the tooltip hangs on a wrapper.
    <Tooltip title={dragDisabledReason}>
      <span>
        <IconButton size="small" disabled aria-label={`Drag ${todo.key} (unavailable)`}>
          <DragIndicator fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <IconButton
      ref={setActivatorNodeRef}
      size="small"
      aria-label={`Drag ${todo.key}`}
      {...attributes}
      {...listeners}
      sx={{ cursor: "grab", touchAction: "none", color: "text.muted" }}
    >
      <DragIndicator fontSize="small" />
    </IconButton>
  );

  return (
    <TodoRow
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      todo={todo}
      onOpen={onOpen}
      onDelete={onDelete}
      moveActions={moveActions}
      dragHandle={handle}
    />
  );
}
