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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ApiError, fieldErrors } from "../../../api/client";
import { useGenerateTodos } from "../hooks/useAi";
import { useBulkCreateTodos } from "../../todos";
import { formatPoints, plural } from "../../../lib/pluralize";
import type { CreateTodoRequest, DraftTodo } from "../../../types/api";
import { AiDisclaimer } from "./AiDisclaimer";
import { AiErrorAlert } from "./AiErrorAlert";
import { DraftRow, TITLE_MAX, type Draft } from "./DraftRow";

// Client-side rules mirror the contract in types/api.ts (prompt 3–2000 characters, count 1–10).
// The count is a string in the form because an empty box means "use the server default (5)".
const schema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Describe the feature in at least 3 characters")
    .max(2000, "The description must be at most 2000 characters"),
  count: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10),
      "Enter a whole number from 1 to 10",
    ),
});
type FormValues = z.infer<typeof schema>;

const FIELDS = ["prompt", "count"] as const;

interface GenerateTodosDialogProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

const toDrafts = (todos: DraftTodo[]): Draft[] =>
  todos.map((todo, index) => ({ ...todo, id: index, selected: true }));

/**
 * AI-2 (wireframe 08): describe a feature, get editable **drafts**, keep the checked ones. Nothing is
 * saved before "Add N to backlog" (`POST …/todos/bulk`). The parent remounts the dialog on every open
 * (`key`), so the form and the drafts always start empty.
 */
export function GenerateTodosDialog({ open, projectId, onClose }: GenerateTodosDialogProps) {
  const titleId = useId();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const generate = useGenerateTodos(projectId);
  const bulkCreate = useBulkCreateTodos(projectId);

  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { prompt: "", count: "5" },
  });

  const generating = generate.isPending;
  const saving = bulkCreate.isPending;
  const busy = generating || saving;

  const onGenerate = async (values: FormValues) => {
    setGenerateError(null);
    setSaveError(null);
    try {
      const response = await generate.mutateAsync({
        prompt: values.prompt.trim(),
        ...(values.count ? { count: Number(values.count) } : {}),
      });
      setDrafts(toDrafts(response.todos));
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
      setGenerateError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const updateDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((current) => current?.map((d) => (d.id === id ? { ...d, ...patch } : d)) ?? null);

  const selected = useMemo(() => (drafts ?? []).filter((d) => d.selected), [drafts]);
  const selectedPoints = selected.reduce((sum, d) => sum + (d.storyPoints ?? 0), 0);
  const allSelected = !!drafts && drafts.length > 0 && selected.length === drafts.length;
  const hasInvalidTitle = selected.some((d) => d.title.trim() === "");

  const save = async () => {
    setSaveError(null);
    const todos: CreateTodoRequest[] = selected.map((d) => ({
      title: d.title.trim().slice(0, TITLE_MAX),
      description: d.description,
      type: d.type,
      priority: d.priority,
      storyPoints: d.storyPoints,
    }));
    try {
      await bulkCreate.mutateAsync({ todos });
      enqueueSnackbar(`${todos.length} ${plural(todos.length, "todo", "todos")} added to the backlog`, {
        variant: "success",
      });
      onClose();
      navigate(`/projects/${projectId}/backlog`); // AI-2: show them in the backlog
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Something went wrong.");
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
        Generate todos with AI
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box component="form" noValidate onSubmit={handleSubmit(onGenerate)}>
            <Stack spacing={2}>
              <TextField
                label="Describe the feature"
                placeholder="e.g. User profile page with avatar upload"
                multiline
                minRows={3}
                maxRows={8}
                fullWidth
                autoFocus
                disabled={generating}
                error={!!errors.prompt}
                helperText={errors.prompt?.message}
                {...register("prompt")}
              />
              <Box
                sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 }}
              >
                <TextField
                  label="How many todos"
                  type="number"
                  size="small"
                  disabled={generating}
                  error={!!errors.count}
                  helperText={errors.count?.message ?? "1–10, default 5"}
                  slotProps={{ htmlInput: { min: 1, max: 10, inputMode: "numeric" } }}
                  sx={{ width: 160 }}
                  {...register("count")}
                />
                <Box sx={{ flex: 1, minWidth: 200, alignSelf: "center" }}>
                  <AiDisclaimer />
                  <Typography variant="caption" color="text.secondary" component="p">
                    Drafts are not saved until you add them.
                  </Typography>
                </Box>
                <Button
                  type="submit"
                  variant="contained"
                  color="ai"
                  disabled={busy}
                  startIcon={
                    generating ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <AutoAwesome />
                    )
                  }
                >
                  {generating ? "Generating…" : drafts ? "Regenerate" : "Generate"}
                </Button>
              </Box>
            </Stack>
          </Box>

          {generateError && (
            <AiErrorAlert
              message={generateError}
              onRetry={() => void handleSubmit(onGenerate)()}
              disabled={busy}
            />
          )}

          {generating && (
            <Box role="status" aria-label="Generating todos" sx={{ display: "grid", gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={56} />
              ))}
            </Box>
          )}

          {drafts && !generating && (
            <>
              <Divider />
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="h6" component="h3">
                    Suggested todos ({drafts.length})
                  </Typography>
                  {drafts.length > 0 && (
                    <Button
                      size="small"
                      color="inherit"
                      disabled={saving}
                      onClick={() =>
                        setDrafts(drafts.map((d) => ({ ...d, selected: !allSelected })))
                      }
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </Button>
                  )}
                </Box>
                {drafts.length === 0 ? (
                  <Alert severity="info">
                    The assistant did not suggest any todos. Try describing the feature in more detail.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {drafts.map((draft, index) => (
                      <DraftRow
                        key={draft.id}
                        draft={draft}
                        position={index + 1}
                        disabled={saving}
                        onChange={updateDraft}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
              {saveError && <AiErrorAlert message={saveError} onRetry={() => void save()} disabled={busy} />}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {drafts && drafts.length > 0
            ? `${selected.length} of ${drafts.length} selected · ${formatPoints(selectedPoints)} total`
            : ""}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button color="inherit" variant="outlined" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={busy || selected.length === 0 || hasInvalidTitle}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving
              ? "Adding…"
              : `Add ${selected.length} to backlog`}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
