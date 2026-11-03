import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Add from "@mui/icons-material/Add";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import FormatListBulletedOutlined from "@mui/icons-material/FormatListBulletedOutlined";
import SearchOff from "@mui/icons-material/SearchOff";
import { Box, Button, List, Paper, Skeleton, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { PageContainer } from "../../components/PageContainer";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useProject } from "../../hooks/useProjects";
import { useBacklogTodos, useCreateTodo, useDeleteTodo } from "../../hooks/useTodos";
import type { Todo } from "../../types/api";
import { TodoDetailsDialog } from "../todos/TodoDetailsDialog";
import { useAssistantDrawer } from "../shell/AssistantDrawerContext";
import { TopBarMeta } from "../shell/TopBarMeta";
import { BacklogFilters, type BacklogFilterValues } from "./BacklogFilters";
import { BacklogSection } from "./BacklogSection";
import { PlannedActionButton } from "./PlannedActionButton";
import { QuickCreateRow } from "./QuickCreateRow";
import { TodoRow } from "./TodoRow";

const EMPTY_FILTERS: BacklogFilterValues = { search: "", priority: "", type: "" };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const pts = (n: number) => `${n} ${n === 1 ? "pt" : "pts"}`;
const sumPoints = (todos: Todo[]) => todos.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

/** BL-1, BL-2, BL-6. Todo details (BL-3, BL-4) live in TodoDetailsDialog. Layout: wireframe 04. */
export default function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const assistant = useAssistantDrawer();
  // Already loaded by ProjectRoute (same ['project', id] query); only a fallback for the total.
  const { data: project } = useProject(projectId);

  const quickCreateRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<BacklogFilterValues>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      priority: filters.priority || undefined,
      type: filters.type || undefined,
    }),
    [debouncedSearch, filters.priority, filters.type],
  );
  const filtersActive = !!queryFilters.search || !!queryFilters.priority || !!queryFilters.type;

  const { data: todos, isPending, isError, error, refetch } = useBacklogTodos(
    projectId,
    queryFilters,
  );
  // The unfiltered backlog feeds the top-bar totals. With no filter it is the SAME query as above
  // (one request); with a filter it is one extra, cached request that is not refetched per keystroke.
  const { data: allTodos } = useBacklogTodos(projectId, {});

  const createTodo = useCreateTodo(projectId ?? "");
  const deleteTodo = useDeleteTodo(projectId ?? "");

  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [toDelete, setToDelete] = useState<Todo | null>(null);

  if (!projectId) return null;

  const openDetails = (todo: Todo) => {
    setDialogKey((k) => k + 1);
    setSelectedTodo(todo);
  };

  const handleQuickCreate = (title: string) => {
    createTodo.mutate(
      { title },
      {
        onSuccess: (todo) => {
          // A new todo can fall outside the active filters; say so instead of looking like nothing happened.
          if (filtersActive) {
            enqueueSnackbar(`${todo.key} created — it’s hidden by the current filters`, {
              variant: "info",
            });
          }
        },
        onError: (err) => enqueueSnackbar(err.message, { variant: "error" }),
      },
    );
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const { key, title } = toDelete;
    deleteTodo.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        enqueueSnackbar(`${key} “${title}” deleted`, { variant: "success" });
      },
      onError: (err) => {
        setToDelete(null);
        enqueueSnackbar(err.message, { variant: "error" });
      },
    });
  };

  const list = todos ?? [];
  const totalCount = allTodos?.length ?? project?.stats.backlogCount;
  const totalPoints = allTodos ? sumPoints(allTodos) : undefined;

  const listPoints = sumPoints(list);
  const countText =
    filtersActive && typeof totalCount === "number"
      ? `${list.length} of ${totalCount} ${plural(totalCount, "todo", "todos")}`
      : `${list.length} ${plural(list.length, "todo", "todos")}`;
  const sectionSummary = `${countText} · ${pts(listPoints)}`;

  let body;
  if (isPending) {
    body = (
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box role="status" aria-label="Loading backlog" sx={{ p: 2 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={44} sx={{ mb: 1, borderRadius: 2 }} />
          ))}
        </Box>
      </Paper>
    );
  } else if (isError) {
    body = <ErrorState message={error.message} onRetry={() => void refetch()} />;
  } else if (list.length === 0 && !filtersActive) {
    body = (
      <EmptyState
        icon={<FormatListBulletedOutlined />}
        title="Your backlog is empty"
        description="Add todos one at a time, or describe a feature and let the AI assistant draft a batch for you."
        action={
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => quickCreateRef.current?.focus()}
            >
              Create a todo
            </Button>
            {assistant && (
              <Button
                variant="outlined"
                color="ai"
                startIcon={<AutoAwesome />}
                onClick={assistant.open}
              >
                Generate with AI
              </Button>
            )}
          </Box>
        }
      />
    );
  } else if (list.length === 0 && filtersActive) {
    body = (
      <EmptyState
        icon={<SearchOff />}
        title="No matching todos"
        description="Try a different search term, or clear the filters."
        action={
          <Button color="inherit" variant="outlined" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    body = (
      <BacklogSection title="Backlog" summary={sectionSummary}>
        <List disablePadding aria-label="Backlog todos">
          {list.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onOpen={openDetails} onDelete={setToDelete} />
          ))}
        </List>
        <QuickCreateRow ref={quickCreateRef} onCreate={handleQuickCreate} />
      </BacklogSection>
    );
  }

  const showTopQuickCreate = list.length === 0 && !isPending && !isError;

  return (
    <PageContainer>
      {/* Wireframe 04: totals sit next to the page title in the top bar. */}
      {typeof totalCount === "number" && totalPoints !== undefined && (
        <TopBarMeta>
          <Typography color="text.secondary" noWrap aria-live="polite">
            {totalCount} {plural(totalCount, "todo", "todos")} · {pts(totalPoints)}
          </Typography>
        </TopBarMeta>
      )}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2,
        }}
      >
        <BacklogFilters values={filters} onChange={setFilters} />
        <Box
          sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, ml: "auto" }}
        >
          <PlannedActionButton
            variant="outlined"
            color="ai"
            startIcon={<AutoAwesome />}
            reason="Generating todos with AI arrives with the AI day (Day 6)"
          >
            Generate todos with AI
          </PlannedActionButton>
          <PlannedActionButton
            variant="outlined"
            color="ai"
            startIcon={<AutoAwesome />}
            reason="Planning a sprint with AI arrives with the AI day (Day 6)"
          >
            Plan sprint with AI
          </PlannedActionButton>
          <PlannedActionButton
            variant="outlined"
            color="inherit"
            startIcon={<Add />}
            reason="Creating sprints arrives on Day 4"
          >
            Create sprint
          </PlannedActionButton>
        </Box>
      </Box>

      {body}

      {/* Quick create stays reachable from either empty state (new todos always land in the backlog, filters aside). */}
      {showTopQuickCreate && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", mt: 2 }}>
          <QuickCreateRow ref={quickCreateRef} onCreate={handleQuickCreate} />
        </Paper>
      )}

      <TodoDetailsDialog
        key={dialogKey}
        open={!!selectedTodo}
        todo={selectedTodo}
        projectId={projectId}
        onClose={() => setSelectedTodo(null)}
        onDeleted={() => setSelectedTodo(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        destructive
        loading={deleteTodo.isPending}
        title="Delete todo?"
        confirmLabel="Delete todo"
        description={
          <>
            <strong>
              {toDelete?.key} — {toDelete?.title}
            </strong>{" "}
            will be permanently deleted. This cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </PageContainer>
  );
}
