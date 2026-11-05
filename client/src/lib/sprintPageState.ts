/**
 * Router state passed to the sprint details page when a sprint was just completed: the user ticked
 * "Generate AI summary" (SPR-6, AI-4), so the page starts the summary as soon as it opens.
 */
export interface SprintPageState {
  summarize: boolean;
}

/** `location.state` is untyped (and survives reloads), so it is narrowed instead of trusted. */
export function wantsSummary(state: unknown): boolean {
  return typeof state === "object" && state !== null && "summarize" in state && state.summarize === true;
}
