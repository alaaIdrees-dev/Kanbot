import { useQuery } from "@tanstack/react-query";
import * as sprintsApi from "../api/sprints";

/** Query key (implementation plan §3.4): `['sprints', projectId]`. */
export const sprintsKey = (projectId: string) => ["sprints", projectId] as const;

/** Used by TodoDetailsDialog (BL-3) to offer "Backlog or any planned/active sprint". */
export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: sprintsKey(projectId ?? ""),
    queryFn: () => sprintsApi.listSprints(projectId!),
    enabled: !!projectId,
  });
}
