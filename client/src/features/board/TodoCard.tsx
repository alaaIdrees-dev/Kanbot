import {
  forwardRef,
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import MoreVert from "@mui/icons-material/MoreVert";
import OpenInFullOutlined from "@mui/icons-material/OpenInFullOutlined";
import {
  Box,
  ButtonBase,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import { STATUS_ICON } from "../../design/todoVisuals";
import type { RowMoveAction } from "../backlog/TodoRow";
import { PointsBadge } from "../todos/PointsBadge";
import { PriorityBadge } from "../todos/PriorityBadge";
import { TypeIcon } from "../todos/TypeIcon";
import type { Todo } from "../../types/api";

/** What a card shows (wireframe 05): key, title, type, priority, points. Shared with the drag overlay. */
export function TodoCardBody({ todo }: { todo: Todo }) {
  return (
    <>
      <Typography variant="mono" component="div" sx={{ color: "text.muted" }} noWrap>
        {todo.key}
      </Typography>
      <Typography sx={{ mt: 0.5, mb: 1.25, overflowWrap: "anywhere" }}>{todo.title}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <TypeIcon type={todo.type} withLabel />
        <PriorityBadge priority={todo.priority} />
        <Box sx={{ ml: "auto" }}>
          <PointsBadge points={todo.storyPoints} />
        </Box>
      </Box>
    </>
  );
}

export interface CardMoveAction extends RowMoveAction {
  /** Status icon for "Move to <column>" items. */
  statusIcon?: keyof typeof STATUS_ICON;
}

interface TodoCardProps {
  todo: Todo;
  onOpen: (todo: Todo) => void;
  /** The non-drag alternative to dragging (SPR-5): "Move to top", "Move to In Review"… */
  moveActions: CardMoveAction[];
  /** The drag handle (see SortableTodoCard). */
  dragHandle?: ReactNode;
  style?: CSSProperties;
  /** Extra props for the <li> (dnd-kit pointer/touch listeners). */
  rootProps?: object;
  dragging?: boolean;
}

/**
 * One board card. The drag handle and the actions button are SIBLINGS of the main button (nested
 * interactive controls are invalid ARIA, NFR-5). Clicking the main area opens the details (SPR-4).
 */
export const TodoCard = forwardRef<HTMLLIElement, TodoCardProps>(function TodoCard(
  { todo, onOpen, moveActions, dragHandle, style, rootProps, dragging = false },
  ref,
) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const closeMenu = () => setAnchor(null);

  const items: ReactNode[] = [];
  moveActions.forEach((action) => {
    if (action.dividerBefore) items.push(<Divider key={`${action.key}-divider`} />);
    const StatusIcon = action.statusIcon ? STATUS_ICON[action.statusIcon] : null;
    items.push(
      <MenuItem
        key={action.key}
        disabled={action.disabled}
        onClick={() => {
          closeMenu();
          action.onSelect();
        }}
      >
        {(action.icon || StatusIcon) && (
          <ListItemIcon>
            {action.icon ?? (StatusIcon && <StatusIcon fontSize="small" />)}
          </ListItemIcon>
        )}
        <ListItemText>{action.label}</ListItemText>
      </MenuItem>,
    );
  });
  if (moveActions.length > 0) items.push(<Divider key="end-divider" />);
  items.push(
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
  );

  return (
    <Box
      component="li"
      ref={ref}
      style={style}
      {...rootProps}
      sx={{ listStyle: "none", opacity: dragging ? 0.4 : 1 }}
    >
      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          borderRadius: 2,
          bgcolor: "background.paper",
          borderStyle: dragging ? "dashed" : "solid",
          "&:hover": { borderColor: "border.interactive" },
        }}
      >
        <ButtonBase
          onClick={() => onOpen(todo)}
          aria-label={`Open ${todo.key} ${todo.title}`}
          sx={{
            flex: 1,
            minWidth: 0,
            display: "block",
            textAlign: "left",
            font: "inherit",
            borderRadius: 2,
            py: 1.25,
            pl: 1.5,
            pr: 0.5,
          }}
        >
          <TodoCardBody todo={todo} />
        </ButtonBase>
        <Box sx={{ display: "flex", flexDirection: "column", flexShrink: 0, p: 0.25 }}>
          {dragHandle}
          <IconButton
            size="small"
            aria-label={`Actions for ${todo.key}`}
            aria-haspopup="menu"
            aria-controls={anchor ? menuId : undefined}
            aria-expanded={anchor ? "true" : undefined}
            onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
      <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
        {items}
      </Menu>
    </Box>
  );
});
