import { useState } from "react";
import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet, useMatch, useMatches } from "react-router-dom";
import { layout } from "../../design/tokens";
import { titleOf } from "../../lib/routeHandle";
import { AssistantDrawer } from "./AssistantDrawer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Layout route for every private page (plan §3.1): sidebar + top bar + AI drawer around the page.
 * The current project comes from the URL, so it survives reloads and back/forward (PRJ-5).
 * ≥ 1024px the sidebar is docked; below it collapses into a temporary drawer (NFR-4).
 */
export function AppShell() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [navOpen, setNavOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const projectId = useMatch("/projects/:projectId/*")?.params.projectId;
  const matches = useMatches();
  const title =
    [...matches]
      .reverse()
      .map((m) => titleOf(m.handle))
      .find(Boolean) ?? "Kanbot";

  const sidebarPaperSx = {
    width: layout.sidebarWidth,
    boxSizing: "border-box",
    bgcolor: "background.paper",
  } as const;

  return (
    <div className="flex h-dvh overflow-hidden bg-app text-content">
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          left: 8,
          top: -48,
          zIndex: "tooltip",
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:focus": { top: 8 },
        }}
      >
        Skip to content
      </Box>

      {isDesktop ? (
        <Drawer
          variant="permanent"
          open
          sx={{ width: layout.sidebarWidth, flexShrink: 0 }}
          slotProps={{ paper: { sx: { ...sidebarPaperSx, position: "relative" } } }}
        >
          <Sidebar projectId={projectId} />
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          slotProps={{ paper: { sx: sidebarPaperSx } }}
        >
          <Sidebar projectId={projectId} onNavigate={() => setNavOpen(false)} />
        </Drawer>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          showMenuButton={!isDesktop}
          onOpenMenu={() => setNavOpen(true)}
          onAskAi={projectId ? () => setAssistantOpen(true) : undefined}
        />
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{ flex: 1, overflow: "auto", outline: "none" }}
        >
          <Outlet />
        </Box>
      </div>

      {projectId && (
        <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      )}
    </div>
  );
}
