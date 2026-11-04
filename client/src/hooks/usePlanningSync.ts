import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectPlanningSync } from "../stores/planningSync";

/** Mount once per planning page: connects the planning store to the query cache of `projectId`. */
export function usePlanningSync(projectId: string): void {
  const queryClient = useQueryClient();
  useEffect(() => connectPlanningSync(queryClient, projectId), [queryClient, projectId]);
}
