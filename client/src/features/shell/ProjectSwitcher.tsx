import { useId, useState } from "react";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import Check from "@mui/icons-material/Check";
import GridViewOutlined from "@mui/icons-material/GridViewOutlined";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useProject, useProjects } from "../../hooks/useProjects";

interface ProjectSwitcherProps {
  projectId: string | undefined;
  /** Called after a navigation so the mobile sidebar can close. */
  onNavigate?: () => void;
}

const SECTIONS = ["backlog", "board", "sprints"];

/** PRJ-5: lists all projects and opens the selected one, keeping the current section (backlog/board/sprints). */
export function ProjectSwitcher({ projectId, onNavigate }: ProjectSwitcherProps) {
  const menuId = useId();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const projects = useProjects();
  const current = useProject(projectId);

  const section = pathname.split("/")[3];
  const targetSection = SECTIONS.includes(section) ? section : "backlog";

  const currentProject = current.data ?? projects.data?.find((p) => p.id === projectId);
  let label = "Select a project";
  if (projectId)
    label = currentProject ? `${currentProject.key} · ${currentProject.name}` : "Loading…";

  const close = () => setAnchor(null);
  const navigated = () => {
    close();
    onNavigate?.();
  };

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        aria-label={`Switch project. Current: ${label}`}
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<ArrowDropDown />}
        sx={{ justifyContent: "space-between", textAlign: "left", fontWeight: 500 }}
      >
        <Box
          component="span"
          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {label}
        </Box>
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        slotProps={{ paper: { sx: { width: 232, maxHeight: 360 } } }}
      >
        {projects.isPending && (
          <MenuItem disabled>
            <CircularProgress size={16} sx={{ mr: 1.5 }} /> Loading projects…
          </MenuItem>
        )}
        {projects.isError && (
          <MenuItem onClick={() => void projects.refetch()}>
            Couldn’t load projects. Try again
          </MenuItem>
        )}
        {projects.data?.map((project) => (
          <MenuItem
            key={project.id}
            component={RouterLink}
            to={`/projects/${project.id}/${targetSection}`}
            selected={project.id === projectId}
            onClick={navigated}
          >
            <ListItemText
              slotProps={{ primary: { noWrap: true } }}
              primary={project.name}
              secondary={project.key}
            />
            {project.id === projectId && (
              <ListItemIcon sx={{ minWidth: 0, ml: 1 }}>
                <Check fontSize="small" aria-label="Current project" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
        {projects.data?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            No projects yet
          </Typography>
        )}
        <Divider />
        <MenuItem component={RouterLink} to="/projects" onClick={navigated}>
          <ListItemIcon>
            <GridViewOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>All projects</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
