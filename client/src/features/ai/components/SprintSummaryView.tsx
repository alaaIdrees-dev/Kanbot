import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Refresh from "@mui/icons-material/Refresh";
import { Box, Button, CircularProgress, Skeleton, Typography } from "@mui/material";
import { formatDateTime } from "../../../lib/formatDate";
import type { Sprint } from "../../../types/api";
import { AiDisclaimer } from "./AiDisclaimer";
import { AiErrorAlert } from "./AiErrorAlert";
import { AiMarkdown } from "./AiMarkdown";

interface SprintSummaryViewProps {
  sprint: Sprint;
  /** The summary request is running. */
  generating: boolean;
  /** Message of the last failed request, if any. */
  error: string | null;
  onGenerate: () => void;
}

/**
 * AI-4 / AI-5: the content of a sprint summary in all its states: generating (skeleton), failed
 * (server message + "Try again"), saved (Markdown, generation time, "Regenerate") and none yet
 * ("Summarize"). The summary is saved by the server (`sprint.summary`), so a saved one is shown first.
 */
export function SprintSummaryView({ sprint, generating, error, onGenerate }: SprintSummaryViewProps) {
  const { summary } = sprint;

  if (generating) {
    return (
      <Box role="status" aria-label="Generating summary" sx={{ display: "grid", gap: 1 }}>
        <Typography color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={16} color="inherit" aria-hidden /> Summarizing {sprint.name}…
        </Typography>
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="75%" />
        <Skeleton variant="text" width="82%" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {error && <AiErrorAlert message={error} onRetry={onGenerate} />}

      {summary ? (
        <>
          <AiMarkdown>{summary.content}</AiMarkdown>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" component="p">
                Generated {formatDateTime(summary.generatedAt)}
                {summary.source === "mock" ? " by the mock AI" : ""}
              </Typography>
              <AiDisclaimer />
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="ai"
              startIcon={<Refresh />}
              onClick={onGenerate}
            >
              Regenerate
            </Button>
          </Box>
        </>
      ) : (
        !error && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
            <Typography color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
              No summary yet. The assistant can write one from this sprint’s todos and numbers.
            </Typography>
            <Button variant="outlined" color="ai" startIcon={<AutoAwesome />} onClick={onGenerate}>
              Summarize
            </Button>
          </Box>
        )
      )}
    </Box>
  );
}
