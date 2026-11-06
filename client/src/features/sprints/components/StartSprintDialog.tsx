import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { ApiError, fieldErrors } from "../../../api/client";
import { useStartSprint } from "../hooks/useSprints";
import { addDays, todayDateOnly } from "../../../lib/dateOnly";
import { formatPoints, plural } from "../../../lib/pluralize";
import type { Sprint } from "../../../types/api";

const DEFAULT_LENGTH_DAYS = 14;

const startSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "End date must be on or after the start date",
  });
type StartFormValues = z.infer<typeof startSchema>;

interface StartSprintDialogProps {
  open: boolean;
  projectId: string;
  sprint: Sprint;
  onClose: () => void;
  /** Called after the sprint became active; the caller toasts and goes to the board. */
  onStarted: (sprint: Sprint) => void;
}

/**
 * SPR-3: start date (default today) and end date (default +14 days). The parent remounts this
 * component on every open so the defaults are recomputed. Until the user edits the end date by hand,
 * it follows the start date (start + 14 days).
 */
export function StartSprintDialog({
  open,
  projectId,
  sprint,
  onClose,
  onStarted,
}: StartSprintDialogProps) {
  const titleId = useId();
  const startSprint = useStartSprint(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  // Computed once per mount (not on every render) so the defaults can't change under the user.
  const [defaults] = useState(() => {
    const today = todayDateOnly();
    return { startDate: today, endDate: addDays(today, DEFAULT_LENGTH_DAYS) };
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<StartFormValues>({ resolver: zodResolver(startSchema), defaultValues: defaults });

  const startField = register("startDate");

  const onSubmit = async (values: StartFormValues) => {
    setFormError(null);
    try {
      const started = await startSprint.mutateAsync({
        sprintId: sprint.id,
        data: { startDate: values.startDate, endDate: values.endDate },
      });
      onStarted(started);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        const mapped = fieldErrors(error);
        let placed = false;
        for (const field of ["startDate", "endDate"] as const) {
          if (mapped[field]) {
            setError(field, { message: mapped[field] });
            placed = true;
          }
        }
        if (!placed) setFormError(error.message);
        return;
      }
      // 409: another sprint is already active (the list is refreshed by the hook).
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const busy = isSubmitting;
  const { totalTodos, totalPoints } = sprint.stats;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby={titleId}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle id={titleId}>Start {sprint.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <DialogContentText>
              {totalTodos} {plural(totalTodos, "todo", "todos")} · {formatPoints(totalPoints)}. The
              sprint becomes active and opens on the board.
            </DialogContentText>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
            >
              <TextField
                label="Start date"
                type="date"
                required
                autoFocus
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
                {...startField}
                onChange={(event) => {
                  void startField.onChange(event);
                  // Keep the default length until the user picks an end date themselves.
                  const end = addDays(event.target.value, DEFAULT_LENGTH_DAYS);
                  if (!dirtyFields.endDate && end) setValue("endDate", end);
                }}
              />
              <TextField
                label="End date"
                type="date"
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.endDate}
                helperText={errors.endDate?.message}
                {...register("endDate")}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {busy ? "Starting…" : "Start sprint"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
