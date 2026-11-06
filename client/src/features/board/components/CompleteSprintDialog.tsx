import { useId, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useCompleteSprint } from "../hooks/useBoard";
import { useSprints } from "../../sprints";
import { plural } from "../../../lib/pluralize";
import type { Sprint } from "../../../types/api";

const BACKLOG_VALUE = "backlog";

interface CompleteSprintDialogProps {
  open: boolean;
  projectId: string;
  sprint: Sprint;
  onClose: () => void;
  /**
   * After the sprint is completed; the caller toasts and opens its summary page (SPR-6). When
   * `summarize` is set, that page starts the AI summary (AI-4): the board is already gone by then
   * (the project has no active sprint any more), so the page that stays is the one that shows the progress.
   */
  onCompleted: (sprint: Sprint, options: { summarize: boolean }) => void;
}

/**
 * SPR-6: done / not-done counts and where the unfinished todos go: the backlog (default) or any
 * planned sprint, plus the optional "Generate AI summary" (AI-4: made on the sprint's page once it is completed).
 * Remounted on every open (the parent changes `key`), so the choices start fresh.
 */
export function CompleteSprintDialog({
  open,
  projectId,
  sprint,
  onClose,
  onCompleted,
}: CompleteSprintDialogProps) {
  const titleId = useId();
  const complete = useCompleteSprint(projectId);
  const { data: sprints } = useSprints(projectId);
  const [destination, setDestination] = useState(BACKLOG_VALUE);
  const [withSummary, setWithSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planned = (sprints ?? []).filter((s) => s.status === "planned");
  const { doneTodos, totalTodos, donePoints, totalPoints } = sprint.stats;
  const unfinished = totalTodos - doneTodos;
  const busy = complete.isPending;

  const submit = async () => {
    setError(null);
    try {
      const completed = await complete.mutateAsync({
        sprintId: sprint.id,
        data: { moveUnfinishedTo: destination },
      });
      onCompleted(completed, { summarize: withSummary });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>Complete {sprint.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <div>
            <Typography variant="h6" component="p">
              {doneTodos} {plural(doneTodos, "todo", "todos")} done, {unfinished} not finished
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {donePoints} of {totalPoints} story points completed.
            </Typography>
          </div>

          {unfinished > 0 ? (
            <FormControl disabled={busy}>
              <FormLabel id={`${titleId}-dest`}>Move unfinished to:</FormLabel>
              <RadioGroup
                row
                aria-labelledby={`${titleId}-dest`}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              >
                <FormControlLabel value={BACKLOG_VALUE} control={<Radio />} label="Backlog" />
                {planned.map((s) => (
                  <FormControlLabel key={s.id} value={s.id} control={<Radio />} label={s.name} />
                ))}
              </RadioGroup>
            </FormControl>
          ) : (
            <Typography color="text.secondary">
              Everything is done, so there is nothing to move.
            </Typography>
          )}

          <FormControl disabled={busy}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={withSummary}
                  onChange={(event) => setWithSummary(event.target.checked)}
                />
              }
              label="Generate AI summary"
            />
            <FormHelperText>
              The assistant writes the summary on the sprint page after it is completed. AI can make
              mistakes. Review before relying on it.
            </FormHelperText>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? "Completing…" : "Complete sprint"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
