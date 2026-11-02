import type { CreateProjectRequest, ProjectWithStats, UpdateProjectRequest } from "../types/api";
import { request } from "./client";

// The contract (types/api.ts) describes the request bodies and the list items; the `{ project }`
// envelopes below are documented in the implementation plan §4.3 and are local to this module.
interface ProjectListResponse {
  projects: ProjectWithStats[];
}
interface ProjectResponse {
  project: ProjectWithStats;
}

export const listProjects = async (): Promise<ProjectWithStats[]> =>
  (await request<ProjectListResponse>("GET", "/projects")).projects;

export const getProject = async (projectId: string): Promise<ProjectWithStats> =>
  (await request<ProjectResponse>("GET", `/projects/${projectId}`)).project;

export const createProject = async (data: CreateProjectRequest): Promise<ProjectWithStats> =>
  (await request<ProjectResponse>("POST", "/projects", data)).project;

export const updateProject = async (
  projectId: string,
  data: UpdateProjectRequest,
): Promise<ProjectWithStats> =>
  (await request<ProjectResponse>("PATCH", `/projects/${projectId}`, data)).project;

export const deleteProject = (projectId: string): Promise<void> =>
  request<void>("DELETE", `/projects/${projectId}`);
