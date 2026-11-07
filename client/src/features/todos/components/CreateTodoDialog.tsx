import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Close from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import { ApiError, fieldErrors } from "../../../api/client";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { PRIORITY_LABEL, TYPE_LABEL } from "../../../lib/constants";
import { useSprints } from "../../sprints";
import { useCreateTodo } from "../hooks/useTodoMutations";
import { TODO_PRIORITIES, TODO_TYPES, type CreateTodoRequest } from "../../../types/api";
import { PointsSelect } from "./PointsSelect";

const BACKLOG_VALUE = "backlog";

// Same limits as the details dialog and the contract in types/api.ts.
const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z.string().max(5000, "Description must be at most 5000 characters"),
  type: z.enum(TODO_TYPES),
  priority: z.enum(TODO_PRIORITIES),
  storyPoints: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(5), z.literal(8), z.literal(13)])
    .nullable(),
  sprintId: z.string().nullable(),
});
type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  title: "",
  description: "",
  type: "task",
  priority: "medium",
  storyPoints: null,
  sprintId: null,
};

interface CreateTodoDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

/**
 * The `c` shortcut and the palette's "Create todo": the full-form sibling of the backlog's quick
 * create (BL-2). Server validation errors appear under the field, like in the details dialog. The
 * parent remounts it on every open (`key`), so the form always starts empty.
 */
export function CreateTodoDialog({ open, projectId, onClose }: CreateTodoDialogProps) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();
  const createTodo = useCreateTodo(projectId);
  const { data: sprints } = useSprints(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [another, setAnother] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setError,
    setFocus,
    reset,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const busy = isSubmitting || createTodo.isPending;
  // Completed sprints can't take todos (409), so only planned and active ones are offered.
  const sprintOptions = (sprints ?? []).filter((s) => s.status !== "completed");

  const requestClose = () => {
    if (busy) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const data: CreateTodoRequest = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      type: values.type,
      priority: values.priority,
      storyPoints: values.storyPoints,
      sprintId: values.sprintId,
    };
    try {
      const todo = await createTodo.mutateAsync(data);
      const where = sprintOptions.find((s) => s.id === todo.sprintId)?.name ?? "the backlog";
      enqueueSnackbar(`${todo.key} created in ${where}`, { variant: "success" });
      if (another) {
        // Keep type, priority, points and destination: batches of similar todos are the point.
        reset({ ...getValues(), title: "", description: "" });
        setFocus("title");
      } else {
        onClose();
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        const mapped = fieldErrors(error);
        const unplaced: string[] = [];
        for (const [field, message] of Object.entries(mapped)) {
          if (field === "title" || field === "description") setError(field, { message });
          else unplaced.push(message);
        }
        if (unplaced.length > 0) setFormError(unplaced.join(" "));
        else if (Object.keys(mapped).length === 0) setFormError(error.message);
        return;
      }
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        fullScreen={fullScreen}
        maxWidth="sm"
        fullWidth
        aria-labelledby={titleId}
      >
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle id={titleId} sx={{ display: "flex", alignItems: "center", pr: 1 }}>
            <Box component="span" sx={{ flex: 1 }}>
              Create todo
            </Box>
            <IconButton aria-label="Close create todo" onClick={requestClose} disabled={busy}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
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
                minRows={3}
                maxRows={8}
                fullWidth
                error={!!errors.description}
                helperText={errors.description?.message}
                {...register("description")}
              />

              <Box
                sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}
              >
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
                      <InputLabel id={`${titleId}-sprint`}>Add to</InputLabel>
                      <Select
                        labelId={`${titleId}-sprint`}
                        label="Add to"
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
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={another}
                  onChange={(e) => setAnother(e.target.checked)}
                />
              }
              label="Create another"
              slotProps={{ typography: { variant: "body2" } }}
            />
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
                {busy ? "Creating…" : "Create todo"}
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this todo?"
        description="What you typed has not been saved."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
