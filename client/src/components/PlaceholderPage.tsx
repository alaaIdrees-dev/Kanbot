import ConstructionOutlined from "@mui/icons-material/ConstructionOutlined";
import { Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState } from "./EmptyState";
import { PageContainer } from "./PageContainer";

/** Stand-in for a screen that a later day builds; keeps the routes and navigation real today. */
export function PlaceholderPage({
  title,
  projectsLink = false,
}: {
  title: string;
  projectsLink?: boolean;
}) {
  return (
    <PageContainer>
      <EmptyState
        icon={<ConstructionOutlined />}
        title={`${title} is coming soon`}
        description="This screen is not built yet."
        action={
          projectsLink ? (
            <Button variant="outlined" color="inherit" component={RouterLink} to="/projects">
              Back to projects
            </Button>
          ) : undefined
        }
      />
    </PageContainer>
  );
}
