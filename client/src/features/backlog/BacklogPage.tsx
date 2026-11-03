import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Add from "@mui/icons-material/Add";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import { Box, Button, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageContainer } from "../../components/PageContainer";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useBacklogTodos, useCreateTodo, useDeleteTodo } from "../../hooks/useTodos";
import { formatPoints, plural } from "../../lib/pluralize";
import { sumPoints } from "../../lib/todoLists";
import type { Sprint, Todo } from "../../types/api";
import { SprintFormDialog } from "../sprints/SprintFormDialog";
import { StartSprintDialog } from "../sprints/StartSprintDialog";
import { TodoDetailsDialog } from "../todos/TodoDetailsDialog";
import { TopBarMeta } from "../shell/TopBarMeta";
import { BacklogFilters, type BacklogFilterValues } from "./BacklogFilters";
import { BacklogLists } from "./BacklogLists";
import { PlannedActionButton } from "./PlannedActionButton";

const EMPTY_FILTERS: BacklogFilterValues = { search: "", priority: "", type: "" };

/**
 * A dialog that stays mounted while it fades out, so its content (and `target`) must outlive the
 * moment the page closes it. `key` remounts it on every open so forms start from fresh values.
 */
interface DialogState<T> {
  key: number;
  open: boolean;
  target?: T;
}

/**
 * BL-1, BL-2, BL-6 and, from Day 4, SPR-1…3 (planned sprints, create / edit / delete / start) plus
 * drag and drop (BL-5, BL-7), which live in BacklogLists. Todo details (BL-3, BL-4) live in
 * TodoDetailsDialog. Layout: wireframe 04.
 */
export default function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

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

  // The unfiltered backlog feeds the top-bar totals. It is the same cached query BacklogLists uses.
  const { data: allTodos } = useBacklogTodos(projectId, {});

  const createTodo = useCreateTodo(projectId ?? "");
  const deleteTodo = useDeleteTodo(projectId ?? "");

  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [toDelete, setToDelete] = useState<Todo | null>(null);
  const [sprintForm, setSprintForm] = useState<DialogState<Sprint>>({ key: 0, open: false });
  const [startDialog, setStartDialog] = useState<DialogState<Sprint>>({ key: 0, open: false });

  if (!projectId) return null;

  const openDetails = (todo: Todo) => {
    setDialogKey((k) => k + 1);
    setSelectedTodo(todo);
  };

  const openSprintForm = (sprint?: Sprint) =>
    setSprintForm((s) => ({ key: s.key + 1, open: true, target: sprint }));
  const openStartDialog = (sprint: Sprint) =>
    setStartDialog((s) => ({ key: s.key + 1, open: true, target: sprint }));

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

  const totalCount = allTodos?.length;
  const totalPoints = allTodos ? sumPoints(allTodos) : undefined;

  return (
    <PageContainer>
      {/* Wireframe 04: totals sit next to the page title in the top bar. */}
      {typeof totalCount === "number" && totalPoints !== undefined && (
        <TopBarMeta>
          <Typography color="text.secondary" noWrap aria-live="polite">
            {totalCount} {plural(totalCount, "todo", "todos")} · {formatPoints(totalPoints)}
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
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, ml: "auto" }}>
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
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Add />}
            onClick={() => openSprintForm()}
          >
            Create sprint
          </Button>
        </Box>
      </Box>

      <BacklogLists
        projectId={projectId}
        queryFilters={queryFilters}
        filtersActive={filtersActive}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
        onOpenTodo={openDetails}
        onDeleteTodo={setToDelete}
        onEditSprint={openSprintForm}
        onStartSprint={openStartDialog}
        onQuickCreate={handleQuickCreate}
        quickCreateRef={quickCreateRef}
      />

      <TodoDetailsDialog
        key={dialogKey}
        open={!!selectedTodo}
        todo={selectedTodo}
        projectId={projectId}
        onClose={() => setSelectedTodo(null)}
        onDeleted={() => setSelectedTodo(null)}
      />

      <SprintFormDialog
        key={`sprint-form-${sprintForm.key}`}
        open={sprintForm.open}
        projectId={projectId}
        sprint={sprintForm.target}
        onClose={() => setSprintForm((s) => ({ ...s, open: false }))}
      />

      {startDialog.target && (
        <StartSprintDialog
          key={`start-sprint-${startDialog.key}`}
          open={startDialog.open}
          projectId={projectId}
          sprint={startDialog.target}
          onClose={() => setStartDialog((s) => ({ ...s, open: false }))}
          onStarted={(sprint) => {
            setStartDialog((s) => ({ ...s, open: false }));
            enqueueSnackbar(`${sprint.name} started`, { variant: "success" });
            navigate(`/projects/${projectId}/board`); // SPR-3: after starting, go to the board
          }}
        />
      )}

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
