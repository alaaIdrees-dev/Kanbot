import { useEffect, useId, useRef } from "react";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useSummarizeSprint } from "../hooks/useAi";
import type { Sprint } from "../../../types/api";
import { SprintSummaryView } from "./SprintSummaryView";

interface SprintSummaryDialogProps {
  open: boolean;
  projectId: string;
  sprint: Sprint;
  onClose: () => void;
}

/**
 * AI-4 on the board: "Summarize" opens this dialog. A sprint without a saved summary starts
 * generating right away; one that has a summary shows it (with "Regenerate"). The parent remounts
 * it on every open (`key`), which is also what makes the start-on-open happen once per open.
 */
export function SprintSummaryDialog({ open, projectId, sprint, onClose }: SprintSummaryDialogProps) {
  const titleId = useId();
  const summarize = useSummarizeSprint(projectId);
  const { mutate } = summarize;
  // StrictMode runs effects twice in development; the ref keeps the request to one per open.
  const started = useRef(false);

  const sprintId = sprint.id;
  const hasSummary = sprint.summary !== null;
  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    if (!hasSummary) mutate(sprintId);
  }, [open, hasSummary, mutate, sprintId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby={titleId}>
      <DialogTitle id={titleId} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutoAwesome fontSize="small" sx={{ color: "ai.text" }} aria-hidden />
        {sprint.name} summary
      </DialogTitle>
      <DialogContent>
        <SprintSummaryView
          sprint={sprint}
          generating={summarize.isPending}
          error={summarize.error?.message ?? null}
          onGenerate={() => summarize.mutate(sprintId)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
