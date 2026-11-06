import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { FullPageLoader } from "./components/FullPageLoader";
import { NotFoundPage } from "./components/NotFoundPage";
import { GuestRoute } from "./features/auth/router/GuestRoute";
import { ProtectedRoute } from "./features/auth/router/ProtectedRoute";
import { ProjectRoute } from "./features/projects/router/ProjectRoute";
import { AppShell } from "./features/shell/AppShell";
import type { RouteHandle } from "./lib/routeHandle";

const title = (value: string): RouteHandle => ({ title: value });

/**
 * Route-level code splitting: each page is its own chunk, fetched when the route is first matched.
 * The route guards, the app shell and the project wrapper stay in the entry chunk because every
 * private page renders them. React Router keeps the current page on screen while the next chunk
 * loads, so no Suspense boundary is needed here.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

/** Route table of the implementation plan §3.1. `handle.title` feeds the top bar. */
export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    HydrateFallback: FullPageLoader,
    children: [
      { path: "/login", lazy: page(() => import("./features/auth/pages/LoginPage")) },
      { path: "/register", lazy: page(() => import("./features/auth/pages/RegisterPage")) },
    ],
  },
  {
    element: <ProtectedRoute />,
    HydrateFallback: FullPageLoader,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Navigate to="/projects" replace /> },
          {
            path: "/projects",
            lazy: page(() => import("./features/projects/pages/ProjectsPage")),
            handle: title("Projects"),
          },
          {
            path: "/projects/:projectId",
            element: <ProjectRoute />,
            children: [
              { index: true, element: <Navigate to="backlog" replace /> },
              {
                path: "backlog",
                lazy: page(() => import("./features/backlog/pages/BacklogPage")),
                handle: title("Backlog"),
              },
              {
                path: "board",
                lazy: page(() => import("./features/board/pages/BoardPage")),
                handle: title("Active sprint"),
              },
              {
                // Master-detail (wireframe 10): the list stays, the selected sprint renders beside it.
                path: "sprints",
                lazy: page(() => import("./features/sprints/pages/SprintsPage")),
                handle: title("Sprints"),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import("./features/sprints/pages/SprintsPage")).SprintDetailsHint,
                    }),
                  },
                  {
                    path: ":sprintId",
                    lazy: page(() => import("./features/sprints/pages/SprintDetailsPage")),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
