import { createContext, useContext } from "react";

export interface AssistantDrawerContextValue {
  open: () => void;
}

/**
 * Lets any project page open the "Ask AI" drawer (e.g. the backlog empty state's
 * "Generate with AI" button, BL-1) without AppShell having to know about every caller.
 * `null` outside the project layout.
 */
export const AssistantDrawerContext = createContext<AssistantDrawerContextValue | null>(null);

export function useAssistantDrawer(): AssistantDrawerContextValue | null {
  return useContext(AssistantDrawerContext);
}
