import { Chip } from "@mui/material";
import { useAiStatus } from "../hooks/useAi";

/**
 * AI-5: a small "Mock AI" badge in the assistant header while the backend answers with its built-in
 * fake (`mode: "mock"`). Nothing is shown for a real model, or while the status is loading or failed.
 */
export function AiModeBadge() {
  const { data } = useAiStatus();
  if (data?.mode !== "mock") return null;
  return <Chip label="Mock AI" size="small" color="ai" variant="outlined" />;
}
