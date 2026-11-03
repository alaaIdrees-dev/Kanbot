import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Box, List } from "@mui/material";
import { cssVar } from "../../design/tokens";
import { listDroppableId } from "./listDroppable";

interface SortableTodoListProps {
  containerId: string;
  /** Row ids in display order (already includes the live drag preview). */
  ids: string[];
  /** Accessible name of the list, e.g. "Sprint 4 todos". */
  label: string;
  /** True while a todo from ANOTHER list is held over this one. */
  highlighted: boolean;
  /** Shown instead of rows when the list is empty; the area still accepts drops. */
  emptyContent?: ReactNode;
  children: ReactNode;
}

/**
 * One list of todo rows: a sortable context for the rows plus a droppable around it, so an EMPTY
 * list (a new sprint, an emptied backlog) is a valid drop target too.
 */
export function SortableTodoList({
  containerId,
  ids,
  label,
  highlighted,
  emptyContent,
  children,
}: SortableTodoListProps) {
  const { setNodeRef } = useDroppable({ id: listDroppableId(containerId) });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        // Inset ring: visible without shifting the layout, and drawn with a token (no raw colour).
        boxShadow: highlighted ? `inset 0 0 0 2px ${cssVar.primary}` : "none",
        transition: (theme) => theme.transitions.create("box-shadow"),
      }}
    >
      <SortableContext id={containerId} items={ids} strategy={verticalListSortingStrategy}>
        <List disablePadding aria-label={label}>
          {children}
        </List>
      </SortableContext>
      {ids.length === 0 && emptyContent}
    </Box>
  );
}
