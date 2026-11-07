import {
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import OpenInFullOutlined from "@mui/icons-material/OpenInFullOutlined";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { SETTLE_ANIMATION, useIsSettling } from "../../../lib/motionStore";
import { PointsBadge, PriorityBadge, TypeIcon } from "../../todos";
import type { Todo } from "../../../types/api";

const MAX_VISIBLE_LABELS = 3;

/** One entry of the row menu's "move" group: the non-drag alternative to drag and drop (BL-5, BL-7). */
export interface RowMoveAction {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Draws a divider above this item (separates "reorder" from "move to…"). */
  dividerBefore?: boolean;
  onSelect: () => void;
}

interface TodoRowProps {
  todo: Todo;
  onOpen: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  /** "Move to top", "Move to Sprint 4"… shown above "Open details" in the row menu. */
  moveActions?: RowMoveAction[];
  /** The drag handle (see SortableTodoRow), shown before the row as in wireframe 04. */
  dragHandle?: ReactNode;
  /** dnd-kit wiring for the <li>; omit when the row is not sortable. */
  ref?: Ref<HTMLLIElement>;
  style?: CSSProperties;
  /** The row is being dragged: its slot stays in the list as a dimmed placeholder. */
  dragging?: boolean;
}

/**
 * The cells of a row (key, title, labels, type, priority, points) without any behaviour, so the
 * list row and the floating drag preview look identical.
 */
export function TodoRowCells({ todo }: { todo: Todo }) {
  const visibleLabels = todo.labels.slice(0, MAX_VISIBLE_LABELS);
  const hiddenLabelCount = todo.labels.length - visibleLabels.length;

  return (
    <>
      <Typography variant="mono" sx={{ color: "text.muted", flexShrink: 0, width: 72 }} noWrap>
        {todo.key}
      </Typography>

      <Typography
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {todo.title}
      </Typography>

      {todo.labels.length > 0 && (
        <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 0.5, flexShrink: 0 }}>
          {visibleLabels.map((label) => (
            <Chip key={label} label={label} size="small" variant="outlined" />
          ))}
          {hiddenLabelCount > 0 && (
            <Chip label={`+${hiddenLabelCount}`} size="small" variant="outlined" />
          )}
        </Box>
      )}

      {/* Narrow screens: icon only (label stays in the tooltip). md+: icon + text, fixed column. */}
      <Box sx={{ display: { xs: "inline-flex", md: "none" }, flexShrink: 0 }}>
        <TypeIcon type={todo.type} />
      </Box>
      <Box sx={{ display: { xs: "none", md: "flex" }, width: 76, flexShrink: 0 }}>
        <TypeIcon type={todo.type} withLabel />
      </Box>

      <Box sx={{ display: { xs: "none", sm: "flex" }, width: 92, flexShrink: 0 }}>
        <PriorityBadge priority={todo.priority} />
      </Box>

      <Box sx={{ display: "flex", width: 52, flexShrink: 0, justifyContent: "flex-end" }}>
        <PointsBadge points={todo.storyPoints} />
      </Box>
    </>
  );
}

/**
 * BL-1: key, title, type, priority, story points, labels. BL-4: delete from the row menu.
 * BL-5 / BL-7: the row menu also moves the todo (top, bottom, backlog, any sprint) without dragging.
 *
 * Layout (wireframe 04): fixed-width columns so type / priority / points line up row to row.
 * The drag handle and the actions button are SIBLINGS of the row button, not children: nesting one
 * interactive control inside another is invalid ARIA and breaks keyboard / screen-reader use (NFR-5).
 */
export function TodoRow({
  todo,
  onOpen,
  onDelete,
  moveActions = [],
  dragHandle,
  ref,
  style,
  dragging = false,
}: TodoRowProps) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const settling = useIsSettling(todo.id);

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const closeMenu = () => setAnchor(null);

  // MUI's Menu does not accept a Fragment as a child, so the items are one flat array.
  const menuItems: ReactNode[] = [];
  moveActions.forEach((action) => {
    if (action.dividerBefore) menuItems.push(<Divider key={`${action.key}-divider`} />);
    menuItems.push(
      <MenuItem
        key={action.key}
        disabled={action.disabled}
        onClick={() => {
          closeMenu();
          action.onSelect();
        }}
      >
        {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
        <ListItemText>{action.label}</ListItemText>
      </MenuItem>,
    );
  });
  if (moveActions.length > 0) menuItems.push(<Divider key="move-end-divider" />);
  menuItems.push(
    <MenuItem
      key="open"
      onClick={() => {
        closeMenu();
        onOpen(todo);
      }}
    >
      <ListItemIcon>
        <OpenInFullOutlined fontSize="small" />
      </ListItemIcon>
      <ListItemText>Open details</ListItemText>
    </MenuItem>,
    <MenuItem
      key="delete"
      onClick={() => {
        closeMenu();
        onDelete(todo);
      }}
      sx={{ color: "error.main" }}
    >
      <ListItemIcon sx={{ color: "inherit" }}>
        <DeleteOutlined fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete</ListItemText>
    </MenuItem>,
  );

  return (
    <Box
      component="li"
      ref={ref}
      style={style}
      sx={{
        display: "flex",
        alignItems: "center",
        listStyle: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        opacity: dragging ? 0.4 : 1,
        transition: (theme) => theme.transitions.create("opacity", { duration: 120 }),
        animation: settling ? SETTLE_ANIMATION : "none",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      {dragHandle && (
        <Box sx={{ display: "flex", flexShrink: 0, pl: { xs: 0.5, sm: 1 } }}>{dragHandle}</Box>
      )}

      <ListItemButton
        onClick={() => onOpen(todo)}
        sx={{
          flex: 1,
          minWidth: 0,
          py: 1.25,
          pl: dragHandle ? 0.5 : { xs: 1.5, sm: 2 },
          pr: 1,
          gap: 1.5,
        }}
      >
        <TodoRowCells todo={todo} />
      </ListItemButton>

      <IconButton
        size="small"
        aria-label={`Actions for ${todo.key}`}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        onClick={openMenu}
        sx={{ flexShrink: 0, mr: { xs: 0.5, sm: 1.5 } }}
      >
        <MoreVert fontSize="small" />
      </IconButton>

      <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
        {menuItems}
      </Menu>
    </Box>
  );
}
