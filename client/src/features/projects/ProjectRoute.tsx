import FolderOff from "@mui/icons-material/FolderOff";
import { Button, CircularProgress } from "@mui/material";
import { Link as RouterLink, Outlet, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { PageContainer } from "../../components/PageContainer";
import { ApiError } from "../../api/client";
import { useProject } from "../../hooks/useProjects";

/**
 * Wraps every `/projects/:projectId/*` page: loads the project once (shared with the sidebar through
 * the `['project', id]` query) and shows loading / not-found / error states instead of a blank page.
 * Another user's or an unknown id is a 404 from the server (plan §4.2).
 */
export function ProjectRoute() {
  const { projectId } = useParams();
  const { isPending, isError, error, refetch } = useProject(projectId);

  if (isPending) {
    return (
      <PageContainer>
        <div role="status" aria-label="Loading project" className="flex justify-center py-16">
          <CircularProgress />
        </div>
      </PageContainer>
    );
  }
  if (isError) {
    return (
      <PageContainer>
        {error instanceof ApiError && error.status === 404 ? (
          <EmptyState
            icon={<FolderOff />}
            title="Project not found"
            description="It may have been deleted, or it doesn’t belong to your account."
            action={
              <Button variant="contained" component={RouterLink} to="/projects">
                Back to projects
              </Button>
            }
          />
        ) : (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        )}
      </PageContainer>
    );
  }
  return <Outlet />;
}
