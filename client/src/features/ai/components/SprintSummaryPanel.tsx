import { useEffect, useRef } from "react";
import { Paper, Typography } from "@mui/material";
import { useSummarizeSprint } from "../hooks/useAi";
import type { Sprint } from "../../../types/api";
import { SprintSummaryView } from "./SprintSummaryView";

interface SprintSummaryPanelProps {
  projectId: string;
  sprint: Sprint;
  /** Start the summary when the panel opens (the user asked for it while completing the sprint). */
  autoGenerate?: boolean;
}

/**
 * AI-4 on the sprint details page: the saved AI summary of an active or completed sprint, with
 * "Summarize" / "Regenerate". A planned sprint has nothing to summarize (the server answers 409),
 * so nothing is offered for it.
 */
export function SprintSummaryPanel({
  projectId,
  sprint,
  autoGenerate = false,
}: SprintSummaryPanelProps) {
  const summarize = useSummarizeSprint(projectId);
  const { mutate } = summarize;
  // StrictMode runs effects twice in development; the ref keeps the request to one per visit.
  const started = useRef(false);

  const sprintId = sprint.id;
  const canSummarize = sprint.status !== "planned" && sprint.summary === null;
  useEffect(() => {
    if (!autoGenerate || !canSummarize || started.current) return;
    started.current = true;
    mutate(sprintId);
  }, [autoGenerate, canSummarize, mutate, sprintId]);

  if (sprint.status === "planned") return null;

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="sprint-summary-title"
      sx={{ borderRadius: 2, mt: 2.5, overflow: "hidden", borderColor: "ai.main" }}
    >
      <Typography
        id="sprint-summary-title"
        variant="h6"
        component="h3"
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: "1px solid",
          borderColor: "divider",
          color: "ai.text",
        }}
      >
        AI summary
      </Typography>
      <div className="p-4">
        <SprintSummaryView
          sprint={sprint}
          generating={summarize.isPending}
          error={summarize.error?.message ?? null}
          onGenerate={() => summarize.mutate(sprint.id)}
        />
      </div>
    </Paper>
  );
}
