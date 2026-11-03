import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ApiError, fieldErrors } from "../../api/client";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useCreateSprint, useDeleteSprint, useUpdateSprint } from "../../hooks/useSprints";
import { plural } from "../../lib/pluralize";
import type { Sprint } from "../../types/api";

// Client-side rules mirror the contract in types/api.ts (goal ≤ 300, end ≥ start). The server
// documents no limit for the name, so none is invented here; a server error shows under the field.
const sprintSchema = (isEdit: boolean) =>
  z
    .object({
      // Create: empty means "let the server name it Sprint N". Edit: the name can't be blanked.
      name: isEdit ? z.string().trim().min(1, "Name is required") : z.string().trim(),
      goal: z.string().max(300, "Goal must be at most 300 characters"),
      startDate: z.string(),
      endDate: z.string(),
    })
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      path: ["endDate"],
      message: "End date must be on or after the start date",
    });
type SprintFormValues = z.infer<ReturnType<typeof sprintSchema>>;

const FIELDS = ["name", "goal", "startDate", "endDate"] as const;

interface SprintFormDialogProps {
  open: boolean;
  projectId: string;
  /** Present → edit (SPR-2); absent → create (SPR-1). Only planned sprints are edited here. */
  sprint?: Sprint;
  onClose: () => void;
}

/**
 * SPR-1 (create) and SPR-2 (edit, delete). The parent remounts this component (via `key`) each time
 * it opens, so the form starts from the sprint's current values. Deleting is offered only in edit
 * mode, and the backlog page only ever edits planned sprints (active/completed can't be deleted).
 */
export function SprintFormDialog({ open, projectId, sprint, onClose }: SprintFormDialogProps) {
  const titleId = useId();
  const isEdit = !!sprint;
  const { enqueueSnackbar } = useSnackbar();
  const createSprint = useCreateSprint(projectId);
  const updateSprint = useUpdateSprint(projectId);
  const deleteSprint = useDeleteSprint(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const schema = useMemo(() => sprintSchema(isEdit), [isEdit]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SprintFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: sprint?.name ?? "",
      goal: sprint?.goal ?? "",
      startDate: sprint?.startDate ?? "",
      endDate: sprint?.endDate ?? "",
    },
  });

  const busy = isSubmitting || deleteSprint.isPending;

  const onSubmit = async (values: SprintFormValues) => {
    setFormError(null);
    const name = values.name.trim();
    try {
      if (sprint) {
        // Full set of fields: an emptied date or goal clears it (null / "").
        await updateSprint.mutateAsync({
          sprintId: sprint.id,
          data: {
            name,
            goal: values.goal.trim(),
            startDate: values.startDate || null,
            endDate: values.endDate || null,
          },
        });
        enqueueSnackbar("Sprint updated", { variant: "success" });
      } else {
        const created = await createSprint.mutateAsync({
          // Omitted fields take the server defaults ("Sprint <n>", no dates).
          ...(name ? { name } : {}),
          goal: values.goal.trim(),
          ...(values.startDate ? { startDate: values.startDate } : {}),
          ...(values.endDate ? { endDate: values.endDate } : {}),
        });
        enqueueSnackbar(`${created.name} created`, { variant: "success" });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        const mapped = fieldErrors(error);
        let placed = false;
        for (const field of FIELDS) {
          if (mapped[field]) {
            setError(field, { message: mapped[field] });
            placed = true;
          }
        }
        if (!placed) setFormError(error.message);
        return;
      }
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const confirmDeleteNow = () => {
    if (!sprint) return;
    deleteSprint.mutate(sprint.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        enqueueSnackbar(`${sprint.name} deleted`, { variant: "success" });
        onClose();
      },
      onError: (err) => {
        setConfirmDelete(false);
        setFormError(err.message);
      },
    });
  };

  const todoCount = sprint?.stats.totalTodos ?? 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby={titleId}
      >
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle id={titleId}>{isEdit ? "Edit sprint" : "Create sprint"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                autoFocus
                fullWidth
                required={isEdit}
                error={!!errors.name}
                helperText={
                  errors.name?.message ??
                  (isEdit
                    ? undefined
                    : "Optional. Leave empty for the default (Sprint 1, Sprint 2…).")
                }
                {...register("name")}
              />
              <TextField
                label="Goal"
                multiline
                minRows={2}
                maxRows={5}
                fullWidth
                error={!!errors.goal}
                helperText={errors.goal?.message ?? "Optional. What should this sprint achieve?"}
                {...register("goal")}
              />
              <Box
                sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
              >
                <TextField
                  label="Start date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.startDate}
                  helperText={errors.startDate?.message ?? "Optional."}
                  {...register("startDate")}
                />
                <TextField
                  label="End date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.endDate}
                  helperText={errors.endDate?.message ?? "Optional."}
                  {...register("endDate")}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{ px: 3, pb: 2, justifyContent: isEdit ? "space-between" : "flex-end" }}
          >
            {isEdit && (
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlined fontSize="small" />}
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                Delete sprint
              </Button>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button color="inherit" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={busy}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {busy ? "Saving…" : isEdit ? "Save changes" : "Create sprint"}
              </Button>
            </Box>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        loading={deleteSprint.isPending}
        title="Delete sprint?"
        confirmLabel="Delete sprint"
        description={
          <>
            <strong>{sprint?.name}</strong> will be deleted.{" "}
            {todoCount > 0
              ? `Its ${todoCount} ${plural(todoCount, "todo", "todos")} will move back to the backlog.`
              : "It has no todos."}
          </>
        }
        onConfirm={confirmDeleteNow}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
