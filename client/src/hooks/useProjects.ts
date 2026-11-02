import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as projectsApi from "../api/projects";
import type { CreateProjectRequest, UpdateProjectRequest } from "../types/api";

// Query keys (implementation plan §3.4).
export const projectsKey = ["projects"] as const;
export const projectKey = (projectId: string) => ["project", projectId] as const;

/** PRJ-1, PRJ-5: all projects of the user, recently updated first. */
export function useProjects() {
  return useQuery({ queryKey: projectsKey, queryFn: projectsApi.listProjects });
}

/** PRJ-5: one project (the URL is the source of truth for "current project"). */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKey(projectId ?? ""),
    queryFn: () => projectsApi.getProject(projectId!),
    enabled: !!projectId,
  });
}

/** PRJ-2. The caller navigates to the new project's backlog. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.createProject(data),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKey(project.id), project);
      return queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });
}

/** PRJ-3. */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateProjectRequest }) =>
      projectsApi.updateProject(projectId, data),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKey(project.id), project);
      return queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });
}

/** PRJ-4. Also drops everything cached for the deleted project. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.removeQueries({ queryKey: projectKey(projectId) });
      // Todos and sprints of that project (keys: ['todos', projectId, …], ['sprints', projectId]).
      queryClient.removeQueries({
        predicate: (q) =>
          ["todos", "sprints"].includes(String(q.queryKey[0])) && q.queryKey[1] === projectId,
      });
      return queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });
}
