import type { ReactNode } from "react";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import FormatListBulleted from "@mui/icons-material/FormatListBulleted";
import History from "@mui/icons-material/History";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import {
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import logoIcon from "../../assets/kanbot-icon.svg";
import { useAuth } from "../auth/useAuth";
import { ProjectSwitcher } from "./ProjectSwitcher";

interface NavItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  selected: boolean;
  onNavigate?: () => void;
}

function NavItem({ to, label, icon, selected, onNavigate }: NavItemProps) {
  return (
    <ListItemButton
      component={RouterLink}
      to={to}
      selected={selected}
      aria-current={selected ? "page" : undefined}
      onClick={onNavigate}
      sx={{ borderRadius: 2, mb: 0.25, "&.Mui-selected": { color: "primary.main" } }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontWeight: selected ? 600 : 500 } } }}
      />
    </ListItemButton>
  );
}

interface SidebarProps {
  projectId: string | undefined;
  /** Closes the temporary sidebar (tablet/mobile) after navigating. */
  onNavigate?: () => void;
}

/** Logo, project switcher, project navigation, "Projects", and the signed-in user with logout (AUTH-4). */
export function Sidebar({ projectId, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const base = projectId ? `/projects/${projectId}` : null;

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{ display: "flex", flexDirection: "column", height: "100%", p: 1.5, gap: 1.5 }}
    >
      <Box
        component={RouterLink}
        to="/projects"
        onClick={onNavigate}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1,
          py: 0.5,
          color: "text.primary",
          textDecoration: "none",
          borderRadius: 2,
        }}
      >
        <Box component="img" src={logoIcon} alt="" width={28} height={28} />
        <Typography variant="h5" component="span" sx={{ fontWeight: 700 }}>
          Kanbot
        </Typography>
      </Box>

      <ProjectSwitcher projectId={projectId} onNavigate={onNavigate} />

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {base && (
          <List
            dense
            disablePadding
            subheader={
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: "transparent",
                  typography: "overline",
                  color: "text.muted",
                  lineHeight: 2.5,
                }}
              >
                Project
              </ListSubheader>
            }
          >
            <NavItem
              to={`${base}/backlog`}
              label="Backlog"
              icon={<FormatListBulleted fontSize="small" />}
              selected={pathname.startsWith(`${base}/backlog`)}
              onNavigate={onNavigate}
            />
            <NavItem
              to={`${base}/board`}
              label="Active Sprint"
              icon={<ViewKanbanOutlined fontSize="small" />}
              selected={pathname.startsWith(`${base}/board`)}
              onNavigate={onNavigate}
            />
            <NavItem
              to={`${base}/sprints`}
              label="Sprints"
              icon={<History fontSize="small" />}
              selected={pathname.startsWith(`${base}/sprints`)}
              onNavigate={onNavigate}
            />
          </List>
        )}
        {base && <Divider sx={{ my: 1.5 }} />}
        <List dense disablePadding>
          <NavItem
            to="/projects"
            label="Projects"
            icon={<FolderOutlined fontSize="small" />}
            selected={pathname === "/projects"}
            onNavigate={onNavigate}
          />
        </List>
      </Box>

      <Divider />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 0.5, minWidth: 0 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: "tint.primary",
            color: "primary.main",
            fontSize: 14,
          }}
        >
          {(user?.name ?? "?").trim().charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {user?.email}
          </Typography>
        </Box>
        <Button
          size="small"
          color="inherit"
          onClick={logout}
          startIcon={<LogoutOutlined fontSize="small" />}
        >
          Log out
        </Button>
      </Box>
    </Box>
  );
}
