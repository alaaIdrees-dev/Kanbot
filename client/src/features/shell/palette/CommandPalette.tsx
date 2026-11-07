import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import DarkMode from "@mui/icons-material/DarkMode";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import FormatListBulleted from "@mui/icons-material/FormatListBulleted";
import History from "@mui/icons-material/History";
import LightMode from "@mui/icons-material/LightMode";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import PostAdd from "@mui/icons-material/PostAdd";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import SettingsBrightness from "@mui/icons-material/SettingsBrightness";
import ViewKanbanOutlined from "@mui/icons-material/ViewKanbanOutlined";
import {
  Box,
  CircularProgress,
  Dialog,
  InputBase,
  Typography,
  type SvgIconProps,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import type { SvgIconComponent } from "@mui/icons-material";
import { TYPE_ICON } from "../../../design/todoVisuals";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { commitAllStaged, isStaged } from "../../../lib/pendingDeletes";
import { STATUS_LABEL } from "../../../lib/constants";
import type { Todo } from "../../../types/api";
import { useAiUiStore } from "../../ai/store/aiUiStore";
import { useAuth } from "../../auth";
import { useProjects } from "../../projects";
import { useSprints } from "../../sprints";
import * as todosApi from "../../todos/api/todosApi";
import { useShellUiStore } from "../store/shellUiStore";

type Group = "Actions" | "Go to" | "Projects" | "Todos" | "Preferences";
const GROUP_ORDER: readonly Group[] = ["Actions", "Go to", "Projects", "Todos", "Preferences"];
const MAX_PER_GROUP: Partial<Record<Group, number>> = { Projects: 6, Todos: 8 };
const SECTIONS = ["backlog", "board", "sprints"];

interface Command {
  id: string;
  group: Group;
  label: string;
  /** Right-hand secondary text (a project key, a todo's status). */
  hint?: string;
  /** Extra words the filter matches besides the label. */
  keywords?: string;
  icon: ReactNode;
  run: () => void;
}

const icon = (Icon: SvgIconComponent, props: SvgIconProps = {}) => (
  <Icon fontSize="small" aria-hidden="true" {...props} />
);

/** Every word of the query must appear in the label or keywords; prefix matches rank first. */
function filterCommands(commands: Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands;
  const scored: { command: Command; score: number }[] = [];
  for (const command of commands) {
    const label = command.label.toLowerCase();
    const haystack = `${label} ${command.hint?.toLowerCase() ?? ""} ${command.keywords ?? ""}`;
    if (!words.every((w) => haystack.includes(w))) continue;
    scored.push({ command, score: label.startsWith(words[0]) ? 0 : 1 });
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.command);
}

/** The chosen command, run after the closing animation so a dialog it opens gets the focus. */
let pendingRun: (() => void) | null = null;

interface PaletteProps {
  /** The project of the current URL; project actions only exist inside one. */
  projectId: string | undefined;
}

/**
 * Ctrl/⌘+K: jump to projects, todos and pages, or run common actions, from the keyboard. Todos are
 * searched on the server (the same search the backlog uses) once you type. Selecting a todo opens
 * its details on the page where it lives. Mounted by the AppShell; the content only mounts while
 * open, so its queries cost nothing while closed.
 */
export function CommandPalette({ projectId }: PaletteProps) {
  const open = useShellUiStore((s) => s.paletteOpen);
  const contentKey = useShellUiStore((s) => s.paletteKey);
  const ran = useShellUiStore((s) => s.paletteRan);

  return (
    <Dialog
      open={open}
      onClose={() => useShellUiStore.getState().closePalette()}
      disableRestoreFocus={ran}
      fullWidth
      maxWidth="sm"
      sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
      slotProps={{
        transition: {
          onExited: () => {
            const next = pendingRun;
            pendingRun = null;
            next?.();
          },
        },
        paper: {
          "aria-label": "Command palette",
          sx: { mt: { xs: 2, sm: "12vh" }, mx: 2, width: "100%", overflow: "hidden" },
        },
      }}
    >
      <PaletteContent key={contentKey} projectId={projectId} />
    </Dialog>
  );
}

function PaletteContent({ projectId }: PaletteProps) {
  const listId = useId();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { mode, setMode } = useColorScheme();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const projects = useProjects();
  const sprints = useSprints(projectId);
  const search = useDebouncedValue(query.trim(), 250);
  const todoSearch = useQuery({
    // Own key: these ad-hoc results must not mix into the lists the backlog and board keep in step.
    queryKey: ["palette-todos", projectId, search],
    queryFn: () => todosApi.listTodos(projectId!, { search }),
    enabled: !!projectId && search.length > 0,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  /** Closes the palette, then runs the command (a dialog it opens must not fight the closing one). */
  const run = (command: Command) => {
    pendingRun = command.run; // runs once the palette has finished closing (see CommandPalette)
    useShellUiStore.getState().closePalette(true);
  };

  const hasQuery = query.trim().length > 0;
  const commands = useMemo<Command[]>(() => {
    const ui = useShellUiStore.getState;
    const base = projectId ? `/projects/${projectId}` : null;
    const section = SECTIONS.includes(pathname.split("/")[3]) ? pathname.split("/")[3] : "backlog";
    const list: Command[] = [];

    if (base) {
      list.push(
        {
          id: "create-todo",
          group: "Actions",
          label: "Create todo",
          keywords: "new add task story bug",
          icon: icon(PostAdd),
          run: () => ui().openCreateTodo(),
        },
        {
          id: "ai-generate",
          group: "Actions",
          label: "Generate todos with AI",
          keywords: "ai assistant draft",
          icon: icon(AutoAwesome),
          run: () => useAiUiStore.getState().openGenerate(),
        },
        {
          id: "ai-plan",
          group: "Actions",
          label: "Plan sprint with AI",
          keywords: "ai assistant capacity",
          icon: icon(AutoAwesome),
          run: () => useAiUiStore.getState().openPlan(),
        },
        {
          id: "ai-chat",
          group: "Actions",
          label: "Ask AI",
          keywords: "assistant chat question",
          icon: icon(AutoAwesome),
          run: () => useAiUiStore.getState().openAssistant(),
        },
        {
          id: "go-backlog",
          group: "Go to",
          label: "Backlog",
          keywords: "planning list",
          icon: icon(FormatListBulleted),
          run: () => navigate(`${base}/backlog`),
        },
        {
          id: "go-board",
          group: "Go to",
          label: "Board",
          keywords: "active sprint kanban",
          icon: icon(ViewKanbanOutlined),
          run: () => navigate(`${base}/board`),
        },
        {
          id: "go-sprints",
          group: "Go to",
          label: "Sprints",
          keywords: "history completed",
          icon: icon(History),
          run: () => navigate(`${base}/sprints`),
        },
      );
    }
    list.push({
      id: "go-projects",
      group: "Go to",
      label: "All projects",
      keywords: "projects list",
      icon: icon(FolderOutlined),
      run: () => navigate("/projects"),
    });

    for (const project of projects.data ?? []) {
      list.push({
        id: `project-${project.id}`,
        group: "Projects",
        label: project.name,
        hint: project.key,
        keywords: `project switch open ${project.description}`,
        icon: icon(FolderOutlined),
        run: () => navigate(`/projects/${project.id}/${section}`),
      });
    }

    // Server results are already filtered by the search; they only show while something is typed
    // (`keepPreviousData` would otherwise keep the last results after the box is cleared).
    for (const todo of hasQuery ? (todoSearch.data ?? []) : []) {
      if (isStaged(todo.id)) continue; // deleted, undo window still open
      const TypeIcon = TYPE_ICON[todo.type];
      list.push({
        id: `todo-${todo.id}`,
        group: "Todos",
        label: todo.title,
        hint: `${todo.key} · ${STATUS_LABEL[todo.status]}`,
        keywords: todo.labels.join(" "),
        icon: <TypeIcon fontSize="small" aria-hidden="true" />,
        run: () => openTodo(todo),
      });
    }

    const schemeOption = (
      value: "light" | "dark" | "system",
      label: string,
      Icon: SvgIconComponent,
    ) => {
      if (mode === value) return;
      list.push({
        id: `theme-${value}`,
        group: "Preferences",
        label,
        keywords: `theme appearance colour color mode ${value}`,
        icon: icon(Icon),
        run: () => setMode(value),
      });
    };
    schemeOption("light", "Switch to light theme", LightMode);
    schemeOption("dark", "Switch to dark theme", DarkMode);
    schemeOption("system", "Use the system theme", SettingsBrightness);
    list.push({
      id: "logout",
      group: "Preferences",
      label: "Log out",
      hint: user?.email,
      keywords: "sign out",
      icon: icon(LogoutOutlined),
      run: () => {
        // Pending (undoable) deletes need the token: send them before the session ends.
        void commitAllStaged().finally(logout);
      },
    });

    /** Takes the user to the page the todo lives on (SPR-4 board, backlog, sprint history), then opens it. */
    function openTodo(todo: Todo) {
      const sprint = (sprints.data ?? []).find((s) => s.id === todo.sprintId);
      let target = `${base}/backlog`;
      if (sprint?.status === "active") target = `${base}/board`;
      else if (sprint?.status === "completed") target = `${base}/sprints/${sprint.id}`;
      if (!pathname.startsWith(target)) navigate(target);
      ui().openTodoDetails(todo);
    }
    return list;
  }, [
    projectId,
    pathname,
    projects.data,
    sprints.data,
    todoSearch.data,
    hasQuery,
    mode,
    setMode,
    navigate,
    user?.email,
    logout,
  ]);

  const visible = useMemo(() => {
    // Todo results come filtered from the server (they may match on the description), the rest locally.
    const filtered = [
      ...filterCommands(
        commands.filter((c) => c.group !== "Todos"),
        query.trim(),
      ),
      ...commands.filter((c) => c.group === "Todos"),
    ];
    const out: Command[] = [];
    for (const group of GROUP_ORDER) {
      // Without a query, todos and the long project list stay out: the palette opens short.
      const inGroup = filtered.filter((c) => c.group === group);
      const limit = MAX_PER_GROUP[group];
      out.push(...(limit ? inGroup.slice(0, limit) : inGroup));
    }
    return out;
  }, [commands, query]);

  const active = Math.min(activeIndex, Math.max(visible.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;
  useEffect(() => {
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, visible, listId]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const count = visible.length;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(count ? (active + 1) % count : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(count ? (active - 1 + count) % count : 0);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(count - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (visible[active]) run(visible[active]);
    }
  };

  const searching = !!projectId && search.length > 0 && todoSearch.isFetching;
  const todoError = todoSearch.isError;
  let lastGroup: Group | null = null;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <SearchOutlined sx={{ color: "text.secondary" }} aria-hidden="true" />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0); // new results: start from the top
          }}
          onKeyDown={onKeyDown}
          placeholder={
            projectId ? "Search todos, projects and actions…" : "Search projects and actions…"
          }
          sx={{ py: 1.75, fontSize: "1rem" }}
          slotProps={{
            input: {
              role: "combobox",
              "aria-label": "Search commands",
              "aria-expanded": true,
              "aria-controls": listId,
              "aria-autocomplete": "list",
              "aria-activedescendant": visible.length ? optionId(active) : undefined,
            },
          }}
        />
        {searching && <CircularProgress size={16} aria-label="Searching todos" />}
      </Box>

      <Box
        id={listId}
        role="listbox"
        aria-label="Results"
        sx={{ maxHeight: "min(50vh, 420px)", overflowY: "auto", py: 1 }}
      >
        {visible.map((command, index) => {
          const header = command.group !== lastGroup;
          lastGroup = command.group;
          return (
            <Box key={command.id} role="presentation">
              {header && (
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: "block", px: 2, pt: 1, pb: 0.5 }}
                >
                  {command.group}
                </Typography>
              )}
              <Box
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => index !== active && setActiveIndex(index)}
                onClick={() => run(command)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mx: 1,
                  px: 1.25,
                  py: 0.875,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  color: "text.primary",
                  bgcolor: index === active ? "action.selected" : "transparent",
                  outline: index === active ? "2px solid" : "none",
                  outlineColor: "primary.main",
                  outlineOffset: -2,
                  transition: (theme) =>
                    theme.transitions.create("background-color", { duration: 80 }),
                }}
              >
                <Box sx={{ display: "inline-flex", color: "text.secondary" }}>{command.icon}</Box>
                <Typography noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {command.label}
                </Typography>
                {command.hint && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ flexShrink: 0, maxWidth: "45%" }}
                  >
                    {command.hint}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}

        {visible.length === 0 && (
          <Typography
            color="text.secondary"
            sx={{ px: 3, py: 4, textAlign: "center" }}
            role="status"
          >
            {searching ? "Searching…" : `Nothing matches “${query.trim()}”.`}
          </Typography>
        )}
        {todoError && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", px: 3, py: 1 }}
            role="status"
          >
            Couldn’t search todos right now. Projects and actions still work.
          </Typography>
        )}
        {!projectId && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", px: 3, py: 1 }}
          >
            Open a project to search its todos and use project actions.
          </Typography>
        )}
      </Box>
    </>
  );
}
