import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ApiError, fieldErrors } from "../../api/client";
import { usePlanSprint } from "../../hooks/useAi";
import { useCreateSprint } from "../../hooks/useSprints";
import { useBacklogTodos } from "../../hooks/useTodos";
import { plural } from "../../lib/pluralize";
import type { PlanSprintResponse } from "../../types/api";
import { PointsBadge } from "../todos/PointsBadge";
import { AiDisclaimer } from "./AiDisclaimer";
import { AiErrorAlert } from "./AiErrorAlert";

// Client-side rules mirror the contract in types/api.ts (capacity 1–200, focus ≤ 300, goal ≤ 300).
const schema = z.object({
  capacity: z
    .string()
    .trim()
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 200,
      "Enter a whole number from 1 to 200",
    ),
  focus: z.string().trim().max(300, "The focus must be at most 300 characters"),
});
type FormValues = z.infer<typeof schema>;

const GOAL_MAX = 300;
const FIELDS = ["capacity", "focus"] as const;

interface GenerateState {
  plan: PlanSprintResponse;
  /** The capacity the plan was made for (the form can change afterwards). */
  capacity: number;
}

interface PlanSprintDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

/**
 * AI-3 (wireframe 09): capacity + optional focus → suggested goal (editable), suggested backlog todos
 * with checkboxes, running total vs capacity and the reasoning. "Create sprint with N todos" creates a
 * planned sprint with the checked todos. Nothing changes before that click. Remounted on every open.
 */
export function PlanSprintDialog({ open, projectId, onClose }: PlanSprintDialogProps) {
  const titleId = useId();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const planSprint = usePlanSprint(projectId);
  const createSprint = useCreateSprint(projectId);
  // The unfiltered backlog is usually cached already; the plan only returns ids, the rows come from here.
  const backlog = useBacklogTodos(projectId);

  const [result, setResult] = useState<GenerateState | null>(null);
  const [goal, setGoal] = useState("");
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [planError, setPlanError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { capacity: "", focus: "" },
  });

  const suggesting = planSprint.isPending;
  const creating = createSprint.isPending;
  const busy = suggesting || creating;

  const onSuggest = async (values: FormValues) => {
    setPlanError(null);
    setCreateError(null);
    const capacity = Number(values.capacity);
    try {
      const plan = await planSprint.mutateAsync({
        capacity,
        ...(values.focus ? { focus: values.focus } : {}),
      });
      setResult({ plan, capacity });
      setGoal(plan.goal.slice(0, GOAL_MAX));
      setExcluded(new Set());
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
        if (placed) return;
      }
      setPlanError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const todosById = useMemo(
    () => new Map((backlog.data ?? []).map((todo) => [todo.id, todo])),
    [backlog.data],
  );
  // Suggested todos that are still in the backlog, in the order the assistant suggested.
  const suggested = useMemo(
    () =>
      (result?.plan.todoIds ?? []).flatMap((id) => {
        const todo = todosById.get(id);
        return todo ? [todo] : [];
      }),
    [result, todosById],
  );
  const missing = (result?.plan.todoIds.length ?? 0) - suggested.length;
  const chosen = suggested.filter((todo) => !excluded.has(todo.id));
  const chosenPoints = chosen.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0);
  const capacity = result?.capacity ?? 0;
  const goalTooLong = goal.length > GOAL_MAX;

  const toggle = (id: string, checked: boolean) =>
    setExcluded((current) => {
      const next = new Set(current);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = async () => {
    setCreateError(null);
    try {
      const sprint = await createSprint.mutateAsync({
        goal: goal.trim(),
        todoIds: chosen.map((todo) => todo.id),
      });
      enqueueSnackbar(
        `${sprint.name} created with ${chosen.length} ${plural(chosen.length, "todo", "todos")}`,
        { variant: "success" },
      );
      onClose();
      navigate(`/projects/${projectId}/backlog`); // AI-3: it shows up as a planned sprint
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutoAwesome fontSize="small" sx={{ color: "ai.text" }} aria-hidden />
        Plan sprint with AI
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box
            component="form"
            noValidate
            onSubmit={handleSubmit(onSuggest)}
            sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 }}
          >
            <TextField
              label="Capacity (story points)"
              type="number"
              required
              autoFocus
              size="small"
              disabled={suggesting}
              error={!!errors.capacity}
              helperText={errors.capacity?.message ?? "1–200"}
              slotProps={{ htmlInput: { min: 1, max: 200, inputMode: "numeric" } }}
              sx={{ width: 200 }}
              {...register("capacity")}
            />
            <TextField
              label="Focus (optional)"
              placeholder="e.g. finish user profile"
              size="small"
              disabled={suggesting}
              error={!!errors.focus}
              helperText={errors.focus?.message}
              sx={{ flex: "1 1 220px" }}
              {...register("focus")}
            />
            <Button
              type="submit"
              variant="contained"
              color="ai"
              disabled={busy}
              startIcon={
                suggesting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />
              }
              sx={{ mt: 0.25 }}
            >
              {suggesting ? "Planning…" : result ? "Suggest again" : "Suggest plan"}
            </Button>
          </Box>

          {planError && (
            <AiErrorAlert
              message={planError}
              onRetry={() => void handleSubmit(onSuggest)()}
              disabled={busy}
            />
          )}

          {suggesting && (
            <Box role="status" aria-label="Planning the sprint" sx={{ display: "grid", gap: 1 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={40} />
              ))}
            </Box>
          )}

          {result && !suggesting && (
            <>
              <Divider />
              <TextField
                label="Suggested sprint goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                multiline
                maxRows={4}
                fullWidth
                disabled={creating}
                error={goalTooLong}
                helperText={goalTooLong ? `The goal must be at most ${GOAL_MAX} characters` : undefined}
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" },
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                    Selected backlog todos
                  </Typography>
                  {backlog.isPending ? (
                    <Skeleton variant="rounded" height={160} role="status" aria-label="Loading backlog" />
                  ) : backlog.isError ? (
                    <AiErrorAlert message={backlog.error.message} onRetry={() => void backlog.refetch()} />
                  ) : suggested.length === 0 ? (
                    <Alert severity="info">
                      No backlog todo fits that capacity. Estimate more todos or raise the capacity.
                    </Alert>
                  ) : (
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                      <Box component="ul" aria-label="Suggested todos" sx={{ m: 0, p: 0 }}>
                        {suggested.map((todo) => (
                          <Box
                            component="li"
                            key={todo.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1,
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              listStyle: "none",
                            }}
                          >
                            <Checkbox
                              checked={!excluded.has(todo.id)}
                              disabled={creating}
                              onChange={(event) => toggle(todo.id, event.target.checked)}
                              slotProps={{
                                input: { "aria-label": `Include ${todo.key} ${todo.title}` },
                              }}
                            />
                            <Typography
                              variant="mono"
                              sx={{ color: "text.muted", width: 72, flexShrink: 0 }}
                              noWrap
                            >
                              {todo.key}
                            </Typography>
                            <Typography sx={{ flex: 1, minWidth: 0 }} noWrap title={todo.title}>
                              {todo.title}
                            </Typography>
                            <PointsBadge points={todo.storyPoints} />
                          </Box>
                        ))}
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.25, bgcolor: "surface.sunken" }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Total
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (chosenPoints / Math.max(capacity, 1)) * 100)}
                          color={chosenPoints > capacity ? "error" : "primary"}
                          aria-label="Selected points compared with capacity"
                          sx={{ flex: 1 }}
                        />
                        <Typography variant="body2" aria-live="polite" noWrap>
                          {chosenPoints} / {capacity} pts
                        </Typography>
                      </Box>
                    </Paper>
                  )}
                  {missing > 0 && !backlog.isPending && (
                    <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                      {missing} suggested {plural(missing, "todo is", "todos are")} no longer in the
                      backlog and {plural(missing, "was", "were")} left out.
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                    Why this plan?
                  </Typography>
                  <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: "surface.sunken" }}>
                    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {result.plan.reasoning}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
              {createError && <AiErrorAlert message={createError} onRetry={() => void create()} disabled={busy} />}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <AiDisclaimer />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button color="inherit" variant="outlined" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {result && (
            <Button
              variant="contained"
              onClick={() => void create()}
              disabled={busy || chosen.length === 0 || goalTooLong}
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {creating
                ? "Creating…"
                : `Create sprint with ${chosen.length} ${plural(chosen.length, "todo", "todos")}`}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
