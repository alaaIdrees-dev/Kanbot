import { useId, useState, type MouseEvent } from "react";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import MoreVert from "@mui/icons-material/MoreVert";
import OpenInFullOutlined from "@mui/icons-material/OpenInFullOutlined";
import {
  Box,
  Chip,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { PointsBadge } from "../todos/PointsBadge";
import { PriorityBadge } from "../todos/PriorityBadge";
import { TypeIcon } from "../todos/TypeIcon";
import type { Todo } from "../../types/api";

const MAX_VISIBLE_LABELS = 3;

interface TodoRowProps {
  todo: Todo;
  onOpen: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

/**
 * BL-1: key, title, type, priority, story points, labels. BL-4: delete from the row menu.
 *
 * Layout (wireframe 04): fixed-width columns so type / priority / points line up row to row.
 * The actions button is a SIBLING of the row button, not a child: nesting one interactive control
 * inside another is invalid ARIA and breaks keyboard / screen-reader use (NFR-5).
 */
export function TodoRow({ todo, onOpen, onDelete }: TodoRowProps) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const closeMenu = () => setAnchor(null);

  const visibleLabels = todo.labels.slice(0, MAX_VISIBLE_LABELS);
  const hiddenLabelCount = todo.labels.length - visibleLabels.length;

  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        listStyle: "none",
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <ListItemButton
        onClick={() => onOpen(todo)}
        sx={{ flex: 1, minWidth: 0, py: 1.25, pl: { xs: 1.5, sm: 2 }, pr: 1, gap: 1.5 }}
      >
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
        <MenuItem
          onClick={() => {
            closeMenu();
            onOpen(todo);
          }}
        >
          <ListItemIcon>
            <OpenInFullOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open details</ListItemText>
        </MenuItem>
        <MenuItem
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
        </MenuItem>
      </Menu>
    </Box>
  );
}
