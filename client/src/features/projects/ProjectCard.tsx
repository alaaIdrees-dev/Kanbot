import { useId, useState, type MouseEvent } from "react";
import MoreVert from "@mui/icons-material/MoreVert";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import {
  Box,
  Card,
  Chip,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { ProjectWithStats } from "../../types/api";

interface ProjectCardProps {
  project: ProjectWithStats;
  onEdit: (project: ProjectWithStats) => void;
  onDelete: (project: ProjectWithStats) => void;
}

/**
 * PRJ-1. The title is the card's link and stretches over the whole card (::after), so the card is
 * clickable without nesting the actions menu button inside a link.
 */
export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { backlogCount, activeSprint } = project.stats;

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const closeMenu = () => setAnchor(null);

  return (
    <Card
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: 2.5,
        borderRadius: 3,
        transition: (theme) => theme.transitions.create("border-color"),
        "&:hover": { borderColor: "border.interactive" },
        "&:focus-within": { borderColor: "border.interactive" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Link
            component={RouterLink}
            to={`/projects/${project.id}/backlog`}
            underline="none"
            color="text.primary"
            sx={{
              display: "block",
              typography: "h6",
              overflowWrap: "anywhere",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
              },
            }}
          >
            {project.name}
          </Link>
          <Chip
            label={project.key}
            size="small"
            sx={{ mt: 0.5, fontFamily: "var(--kb-font-mono)", fontWeight: 600 }}
          />
        </Box>
        <IconButton
          size="small"
          aria-label={`Actions for ${project.name}`}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? "true" : undefined}
          onClick={openMenu}
          sx={{ position: "relative", zIndex: 1, mt: -0.5, mr: -0.5 }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
        <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
          <MenuItem
            onClick={() => {
              closeMenu();
              onEdit(project);
            }}
          >
            <ListItemIcon>
              <EditOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu();
              onDelete(project);
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

      <Typography
        color={project.description ? "text.secondary" : "text.muted"}
        sx={{
          mt: 1.5,
          flex: 1,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          overflowWrap: "anywhere",
        }}
      >
        {project.description || "No description"}
      </Typography>

      <Box
        sx={{
          mt: 2,
          pt: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexWrap: "wrap",
          columnGap: 1,
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">{backlogCount} backlog</Typography>
        <Typography variant="body2" aria-hidden="true">
          ·
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: activeSprint ? "text.primary" : "text.secondary" }}
        >
          {activeSprint ? `${activeSprint.name} active` : "No active sprint"}
        </Typography>
      </Box>
    </Card>
  );
}
