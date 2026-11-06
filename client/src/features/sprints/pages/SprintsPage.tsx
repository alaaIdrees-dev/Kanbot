import { Link as RouterLink, Outlet, useMatch, useParams } from "react-router-dom";
import History from "@mui/icons-material/History";
import { Box, Button, ListItemButton, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { PageContainer } from "../../../components/PageContainer";
import { useSprints } from "../hooks/useSprints";
import { formatDateRange } from "../../../lib/formatDate";
import { plural } from "../../../lib/pluralize";
import type { Sprint } from "../../../types/api";
import { TopBarMeta } from "../../shell/TopBarMeta";
import { SprintStatusChip } from "../components/SprintStatusChip";

/** Completed sprints show the frozen numbers; the others the live ones (plan §4.1). */
const pointsOf = (sprint: Sprint) => sprint.completedStats ?? sprint.stats;

function SprintListItem({ sprint, selected }: { sprint: Sprint; selected: boolean }) {
  const { projectId } = useParams();
  const { donePoints, totalPoints } = pointsOf(sprint);
  const dates = formatDateRange(sprint.startDate, sprint.endDate);
  return (
    <ListItemButton
      component={RouterLink}
      to={`/projects/${projectId}/sprints/${sprint.id}`}
      selected={selected}
      aria-current={selected ? "page" : undefined}
      sx={{
        display: "block",
        border: "1px solid",
        borderColor: selected ? "primary.main" : "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        mb: 1,
        py: 1.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {sprint.name}
        </Typography>
        <SprintStatusChip status={sprint.status} />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 0.5 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {dates || "No dates"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
          {donePoints}/{totalPoints} pts
        </Typography>
      </Box>
    </ListItemButton>
  );
}

/**
 * SPR-7, wireframe 10: every sprint on the left, the selected one's details on the right
 * (`/sprints/:sprintId` renders into the <Outlet />). Below 768px they stack.
 */
export default function SprintsPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const hasSelection = !!useMatch("/projects/:projectId/sprints/:sprintId");
  const sprints = useSprints(projectId);

  let list;
  if (sprints.isPending) {
    list = (
      <Stack spacing={1} role="status" aria-label="Loading sprints">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={68} sx={{ borderRadius: 2 }} />
        ))}
      </Stack>
    );
  } else if (sprints.isError) {
    list = <ErrorState message={sprints.error.message} onRetry={() => void sprints.refetch()} />;
  } else if (sprints.data.length === 0) {
    list = (
      <EmptyState
        icon={<History />}
        title="No sprints yet"
        description="Create a sprint in the backlog. Started and completed sprints show up here."
        action={
          <Button variant="contained" component={RouterLink} to={`/projects/${projectId}/backlog`}>
            Go to the backlog
          </Button>
        }
      />
    );
  } else {
    list = (
      <Box component="ul" aria-label="All sprints" sx={{ m: 0, p: 0, listStyle: "none" }}>
        {sprints.data.map((sprint) => (
          <li key={sprint.id}>
            <SprintListItem sprint={sprint} selected={sprint.id === sprintId} />
          </li>
        ))}
      </Box>
    );
  }

  const count = sprints.data?.length;
  return (
    <PageContainer>
      {count !== undefined && (
        <TopBarMeta>
          <Typography color="text.secondary" noWrap>
            {count} {plural(count, "sprint", "sprints")}
          </Typography>
        </TopBarMeta>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(240px, 320px) minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Box sx={{ display: { xs: hasSelection ? "none" : "block", md: "block" } }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            All sprints
          </Typography>
          {list}
        </Box>
        <Box sx={{ display: { xs: hasSelection ? "block" : "none", md: "block" } }}>
          {hasSelection && (
            <Button
              component={RouterLink}
              to={`/projects/${projectId}/sprints`}
              color="inherit"
              size="small"
              sx={{ display: { md: "none" }, mb: 1 }}
            >
              ← All sprints
            </Button>
          )}
          <Outlet />
        </Box>
      </Box>
    </PageContainer>
  );
}

/** `/sprints` without a selection: a hint beside the list (hidden when the list is alone on screen). */
export function SprintDetailsHint() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
      <Typography color="text.secondary">Select a sprint to see its stats and todos.</Typography>
    </Paper>
  );
}
