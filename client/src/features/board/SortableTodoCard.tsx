import { useMemo } from "react";
import DragIndicator from "@mui/icons-material/DragIndicator";
import { IconButton } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo } from "../../types/api";
import { TodoCard, type CardMoveAction } from "./TodoCard";

interface SortableTodoCardProps {
  todo: Todo;
  /** The column this card is shown in (reported back by dnd-kit on drag events). */
  containerId: string;
  onOpen: (todo: Todo) => void;
  moveActions: CardMoveAction[];
}

/**
 * A card that can be dragged (SPR-5). With a mouse or a long press the whole card is the grab area;
 * for the keyboard the handle is a real button: Space picks the card up, arrows move it, Space
 * drops, Esc cancels (dnd-kit's KeyboardSensor only reacts on the activator node).
 */
export function SortableTodoCard({
  todo,
  containerId,
  onOpen,
  moveActions,
}: SortableTodoCardProps) {
  const data = useMemo(() => ({ containerId }), [containerId]);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, data });

  return (
    <TodoCard
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      rootProps={listeners}
      dragging={isDragging}
      todo={todo}
      onOpen={onOpen}
      moveActions={moveActions}
      dragHandle={
        <IconButton
          ref={setActivatorNodeRef}
          size="small"
          aria-label={`Drag ${todo.key}`}
          {...attributes}
          sx={{ cursor: "grab", color: "text.muted" }}
        >
          <DragIndicator fontSize="small" />
        </IconButton>
      }
    />
  );
}
