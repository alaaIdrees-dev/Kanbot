import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Close from "@mui/icons-material/Close";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import { ApiError, fieldErrors } from "../../api/client";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from "../../lib/constants";
import { formatShortDate } from "../../lib/formatDate";
import { useSprints } from "../../hooks/useSprints";
import { useDeleteTodo, useUpdateTodo } from "../../hooks/useTodos";
import {
  TODO_PRIORITIES,
  TODO_STATUSES,
  TODO_TYPES,
  type Todo,
  type UpdateTodoRequest,
} from "../../types/api";
import { PointsSelect } from "./PointsSelect";

const BACKLOG_VALUE = "backlog";

// Client-side rules mirror the contract in types/api.ts.
const todoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z.string().max(5000, "Description must be at most 5000 characters"),
  type: z.enum(TODO_TYPES),
  status: z.enum(TODO_STATUSES),
  priority: z.enum(TODO_PRIORITIES),
  storyPoints: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(5), z.literal(8), z.literal(13)])
    .nullable(),
  labels: z.array(z.string().trim().min(1).max(30)).max(10, "At most 10 labels"),
  dueDate: z.string().nullable(),
  sprintId: z.string().nullable(),
});
type TodoFormValues = z.infer<typeof todoSchema>;

// Only these render a <TextField helperText>/<Autocomplete helperText> under the field; a server
// error on any other field (type/status/priority/storyPoints/sprintId — all Select-constrained, so
// unlikely in practice) falls back to the top-level alert instead of being silently dropped.
const FIELDS_WITH_HELPER = ["title", "description", "dueDate", "labels"] as const;

interface TodoDetailsDialogProps {
  open: boolean;
  todo: Todo | null;
  projectId: string;
  onClose: () => void;
  /** Called after a successful delete so the caller can clear its selection. */
  onDeleted?: (todoId: string) => void;
}

/**
 * BL-3, BL-4. Every field editable, saved with one `PATCH /todos/:id`. The parent remounts this
 * component (via `key={todo?.id}`) each time it opens, so the form always starts from the todo's
 * current values (same convention as ProjectFormDialog).
 */
export function TodoDetailsDialog({
  open,
  todo,
  projectId,
  onClose,
  onDeleted,
}: TodoDetailsDialogProps) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();
  const updateTodo = useUpdateTodo(projectId);
  const deleteTodo = useDeleteTodo(projectId);
  const { data: sprints } = useSprints(projectId);

  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The parent clears `todo` to null the instant it closes the dialog; keep the last one around so
  // the Dialog still has content to show while it plays its own closing transition.
  const [lastTodo, setLastTodo] = useState<Todo | null>(todo);
  if (todo && todo !== lastTodo) setLastTodo(todo);
  const current = todo ?? lastTodo;

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: current?.title ?? "",
      description: current?.description ?? "",
      type: current?.type ?? "task",
      status: current?.status ?? "todo",
      priority: current?.priority ?? "medium",
      storyPoints: current?.storyPoints ?? null,
      labels: current?.labels ?? [],
      dueDate: current?.dueDate ?? null,
      sprintId: current?.sprintId ?? null,
    },
  });

  if (!current) return null;

  const busy = isSubmitting || updateTodo.isPending;

  const requestClose = () => {
    if (busy) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const onSubmit = async (values: TodoFormValues) => {
    setFormError(null);
    const data: UpdateTodoRequest = {
      title: values.title.trim(),
      description: values.description.trim(),
      type: values.type,
      status: values.status,
      priority: values.priority,
      storyPoints: values.storyPoints,
      labels: values.labels,
      dueDate: values.dueDate || null,
      sprintId: values.sprintId,
    };
    try {
      await updateTodo.mutateAsync({ todoId: current.id, data });
      enqueueSnackbar("Todo saved", { variant: "success" });
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        const mapped = fieldErrors(error);
        const unplaced: string[] = [];
        for (const [field, message] of Object.entries(mapped)) {
          if ((FIELDS_WITH_HELPER as readonly string[]).includes(field)) {
            setError(field as (typeof FIELDS_WITH_HELPER)[number], { message });
          } else {
            unplaced.push(message);
          }
        }
        if (unplaced.length > 0) setFormError(unplaced.join(" "));
        else if (Object.keys(mapped).length === 0) setFormError(error.message);
        return;
      }
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const confirmDeleteNow = () => {
    deleteTodo.mutate(current.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        enqueueSnackbar(`“${current.title}” deleted`, { variant: "success" });
        onDeleted?.(current.id);
        onClose();
      },
      onError: (err) => {
        setConfirmDelete(false);
        enqueueSnackbar(err.message, { variant: "error" });
      },
    });
  };

  const sprintOptions = (sprints ?? []).filter((s) => s.status !== "completed");

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        aria-labelledby={titleId}
      >
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          {/* Wireframe 06 header: key badge, "Story · created Oct 21", close button. */}
          <DialogTitle
            component="div"
            sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}
          >
            <Chip
              label={current.key}
              size="small"
              color="primary"
              sx={{ fontFamily: "var(--kb-font-mono)", fontWeight: 600 }}
            />
            <Typography
              id={titleId}
              variant="body2"
              component="h2"
              sx={{ flex: 1, minWidth: 0, color: "text.secondary" }}
              noWrap
            >
              {TYPE_LABEL[current.type]}
              {formatShortDate(current.createdAt) && ` · created ${formatShortDate(current.createdAt)}`}
            </Typography>
            <IconButton aria-label="Close todo details" onClick={requestClose} disabled={busy}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.7fr) minmax(0, 1fr)" },
                gap: { xs: 2.5, md: 3 },
                alignItems: "start",
              }}
            >
              {/* Left: the two free-text fields. */}
              <Stack spacing={2.5}>
                <TextField
                  label="Title"
                  required
                  autoFocus
                  fullWidth
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  {...register("title")}
                />
                <TextField
                  label="Description"
                  multiline
                  minRows={16}
                  maxRows={24}
                  fullWidth
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  {...register("description")}
                />
              </Stack>

              {/* Right: metadata, in the order of wireframe 06. */}
              <Stack spacing={2}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id={`${titleId}-status`}>Status</InputLabel>
                      <Select labelId={`${titleId}-status`} label="Status" {...field}>
                        {TODO_STATUSES.map((s) => (
                          <MenuItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id={`${titleId}-priority`}>Priority</InputLabel>
                      <Select labelId={`${titleId}-priority`} label="Priority" {...field}>
                        {TODO_PRIORITIES.map((p) => (
                          <MenuItem key={p} value={p}>
                            {PRIORITY_LABEL[p]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id={`${titleId}-type`}>Type</InputLabel>
                      <Select labelId={`${titleId}-type`} label="Type" {...field}>
                        {TODO_TYPES.map((t) => (
                          <MenuItem key={t} value={t}>
                            {TYPE_LABEL[t]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="storyPoints"
                  control={control}
                  render={({ field }) => (
                    <PointsSelect value={field.value} onChange={field.onChange} />
                  )}
                />

                <Controller
                  name="sprintId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel id={`${titleId}-sprint`}>Sprint</InputLabel>
                      <Select
                        labelId={`${titleId}-sprint`}
                        label="Sprint"
                        value={field.value ?? BACKLOG_VALUE}
                        onChange={(e) =>
                          field.onChange(e.target.value === BACKLOG_VALUE ? null : e.target.value)
                        }
                      >
                        <MenuItem value={BACKLOG_VALUE}>Backlog</MenuItem>
                        {sprintOptions.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name} {s.status === "active" ? "(active)" : "(planned)"}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="labels"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete<string, true, false, true>
                      multiple
                      freeSolo
                      // Commit the typed text when focus leaves the field, not only on Enter.
                      autoSelect
                      options={[]}
                      value={field.value}
                      onChange={(_event, value) => {
                        const labels = value
                          .filter((item): item is string => typeof item === "string")
                          .map((item) => item.trim())
                          .filter(Boolean);

                        // Case-insensitive de-duplication keeps the first spelling.
                        const seen = new Set<string>();
                        field.onChange(
                          labels.filter((label) => {
                            const key = label.toLowerCase();
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          }),
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Labels"
                          placeholder="Add a label . . ."
                          error={!!errors.labels}
                          helperText={errors.labels?.message ?? "Up to 10 labels."}
                        />
                      )}
                    />
                  )}
                />

                <TextField
                  label="Due date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.dueDate}
                  helperText={errors.dueDate?.message}
                  {...register("dueDate")}
                />
              </Stack>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlined fontSize="small" />}
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              Delete
            </Button>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button color="inherit" variant="outlined" onClick={requestClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {busy ? "Saving…" : "Save"}
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard changes?"
        description="Your edits to this todo have not been saved."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onClose={() => setConfirmDiscard(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete todo?"
        description={
          <>
            <strong>
              {current.key} — {current.title}
            </strong>{" "}
            will be permanently deleted. This cannot be undone.
          </>
        }
        confirmLabel="Delete todo"
        destructive
        loading={deleteTodo.isPending}
        onConfirm={confirmDeleteNow}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
