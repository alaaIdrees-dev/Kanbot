import { createBrowserRouter, Navigate } from "react-router-dom";
import { NotFoundPage } from "./components/NotFoundPage";
import { GuestRoute } from "./features/auth/GuestRoute";
import LoginPage from "./features/auth/LoginPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import RegisterPage from "./features/auth/RegisterPage";
import BacklogPage from "./features/backlog/BacklogPage";
import BoardPage from "./features/board/BoardPage";
import ProjectsPage from "./features/projects/ProjectsPage";
import { ProjectRoute } from "./features/projects/ProjectRoute";
import { AppShell } from "./features/shell/AppShell";
import SprintDetailsPage from "./features/sprints/SprintDetailsPage";
import SprintsPage from "./features/sprints/SprintsPage";
import type { RouteHandle } from "./lib/routeHandle";

const title = (value: string): RouteHandle => ({ title: value });

/** Route table of the implementation plan §3.1. `handle.title` feeds the top bar. */
export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Navigate to="/projects" replace /> },
          { path: "/projects", element: <ProjectsPage />, handle: title("Projects") },
          {
            path: "/projects/:projectId",
            element: <ProjectRoute />,
            children: [
              { index: true, element: <Navigate to="backlog" replace /> },
              { path: "backlog", element: <BacklogPage />, handle: title("Backlog") },
              { path: "board", element: <BoardPage />, handle: title("Active sprint") },
              { path: "sprints", element: <SprintsPage />, handle: title("Sprints") },
              {
                path: "sprints/:sprintId",
                element: <SprintDetailsPage />,
                handle: title("Sprint details"),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
