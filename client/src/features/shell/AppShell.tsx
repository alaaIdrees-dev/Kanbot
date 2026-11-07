import { useEffect, useState } from "react";
import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet, useMatch, useMatches } from "react-router-dom";
import { layout } from "../../design/tokens";
import { commitStagedOnPageHide } from "../../lib/pendingDeletes";
import { titleOf } from "../../lib/routeHandle";
import { useAiUiStore } from "../ai/store/aiUiStore";
import { AiDialogs, AssistantDrawer } from "../ai";
import { GlobalDialogs } from "./GlobalDialogs";
import { CommandPalette } from "./palette/CommandPalette";
import { useShellUiStore } from "./store/shellUiStore";
import { useGlobalShortcuts } from "./useGlobalShortcuts";
import { TopBarSlotContext } from "./TopBarSlotContext";
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
  const [metaSlot, setMetaSlot] = useState<HTMLElement | null>(null);

  const projectId = useMatch("/projects/:projectId/*")?.params.projectId;

  // AI-1: the conversation belongs to one project; opening another project starts a new one.
  useEffect(() => {
    const ai = useAiUiStore.getState();
    if (projectId) ai.syncProject(projectId);
    else ai.closeAll(); // the AI UI only exists on project pages; the chat itself is kept
  }, [projectId]);
  // Logging out (the shell unmounts) drops the conversation and any open AI UI.
  useEffect(() => () => useAiUiStore.getState().reset(), []);

  // Keyboard shortcuts (c, /, ?, g b…) and the command palette (Ctrl/⌘+K) work on every private page.
  useGlobalShortcuts(projectId);
  // Project dialogs (create todo, details) belong to one project: leaving it closes them.
  useEffect(() => () => useShellUiStore.getState().reset(), [projectId]);
  // Closing or reloading the tab inside an undo window must not lose the delete.
  useEffect(() => {
    window.addEventListener("pagehide", commitStagedOnPageHide);
    return () => window.removeEventListener("pagehide", commitStagedOnPageHide);
  }, []);

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
          onAskAi={projectId ? () => useAiUiStore.getState().openAssistant() : undefined}
          metaSlotRef={setMetaSlot}
        />
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{ flex: 1, overflow: "auto", outline: "none" }}
        >
          <TopBarSlotContext.Provider value={metaSlot}>
            <Outlet />
          </TopBarSlotContext.Provider>
        </Box>
      </div>

      {projectId && (
        <>
          <AssistantDrawer projectId={projectId} />
          <AiDialogs projectId={projectId} />
          <GlobalDialogs projectId={projectId} />
        </>
      )}
      <CommandPalette projectId={projectId} />
    </div>
  );
}
