import { useMemo, useState } from "react";
import Add from "@mui/icons-material/Add";
import FolderOpen from "@mui/icons-material/FolderOpen";
import SearchOff from "@mui/icons-material/SearchOff";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  Box,
  Button,
  ButtonBase,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { PageContainer } from "../../../components/PageContainer";
import { useDeleteProject, useProjects } from "../hooks/useProjects";
import type { ProjectWithStats } from "../../../types/api";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectFormDialog } from "../components/ProjectFormDialog";

/** What the form dialog is doing: nothing, creating, or editing a given project. */
type FormTarget = { mode: "create" } | { mode: "edit"; project: ProjectWithStats } | null;

const GRID = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

/** PRJ-1…4: list, empty/loading/error states, create/edit dialog, delete with confirmation. */
export default function ProjectsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isPending, isError, error, refetch } = useProjects();
  const deleteProject = useDeleteProject();

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  // Separate from the target, so the dialog keeps its title and labels while it fades out.
  const [formOpen, setFormOpen] = useState(false);
  // Remounts the dialog on every open so the form starts from fresh values.
  const [formKey, setFormKey] = useState(0);
  const [toDelete, setToDelete] = useState<ProjectWithStats | null>(null);
  const [search, setSearch] = useState("");

  const openForm = (target: Exclude<FormTarget, null>) => {
    setFormKey((k) => k + 1);
    setFormTarget(target);
    setFormOpen(true);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!projects || !q) return projects ?? [];
    return projects.filter((p) =>
      [p.name, p.key, p.description].some((field) => field.toLowerCase().includes(q)),
    );
  }, [projects, search]);

  const handleSaved = (project: ProjectWithStats, mode: "create" | "edit") => {
    setFormOpen(false);
    if (mode === "create") {
      enqueueSnackbar(`Project “${project.name}” created`, { variant: "success" });
      navigate(`/projects/${project.id}/backlog`); // PRJ-2: open the new project's backlog
    } else {
      enqueueSnackbar("Project updated", { variant: "success" });
    }
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const { name } = toDelete;
    deleteProject.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        enqueueSnackbar(`Project “${name}” deleted`, { variant: "success" });
      },
      onError: (err) => {
        setToDelete(null);
        enqueueSnackbar(err.message, { variant: "error" });
      },
    });
  };

  const newProjectButton = (
    <Button variant="contained" startIcon={<Add />} onClick={() => openForm({ mode: "create" })}>
      New project
    </Button>
  );

  let content;
  if (isPending) {
    content = (
      <div className={GRID} role="status" aria-label="Loading projects">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={176} sx={{ borderRadius: 3 }} />
        ))}
      </div>
    );
  } else if (isError) {
    content = <ErrorState message={error.message} onRetry={() => void refetch()} />;
  } else if (projects.length === 0) {
    content = (
      <EmptyState
        icon={<FolderOpen />}
        title="No projects yet"
        description="Create your first project to start planning sprints."
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => openForm({ mode: "create" })}
          >
            Create your first project
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<SearchOff />}
        title="No matching projects"
        description={`Nothing matches “${search.trim()}”.`}
        action={
          <Button color="inherit" variant="outlined" onClick={() => setSearch("")}>
            Clear search
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className={`${GRID} m-0 list-none p-0`} aria-label="Projects">
        {visible.map((project) => (
          <li key={project.id}>
            <ProjectCard
              project={project}
              onEdit={(p) => openForm({ mode: "edit", project: p })}
              onDelete={setToDelete}
            />
          </li>
        ))}
        {/* Wireframe 03: a dashed "+ New project" tile closes the grid. */}
        <li>
          <ButtonBase
            onClick={() => openForm({ mode: "create" })}
            sx={{
              width: "100%",
              height: "100%",
              minHeight: 176,
              gap: 1,
              borderRadius: 3,
              border: "2px dashed",
              borderColor: "border.strong",
              color: "text.secondary",
              font: "inherit",
              "&:hover, &:focus-visible": {
                borderColor: "primary.main",
                color: "text.primary",
                bgcolor: "surface.sunken",
              },
            }}
          >
            <Add fontSize="small" />
            <Typography component="span" sx={{ fontWeight: 600 }}>
              New project
            </Typography>
          </ButtonBase>
        </li>
      </ul>
    );
  }

  const hasProjects = !!projects && projects.length > 0;

  return (
    <PageContainer>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        {hasProjects && (
          <TextField
            type="search"
            size="small"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              htmlInput: {
                "aria-label": "Search projects",
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: "100%", sm: 320 } }}
          />
        )}
        {projects && (
          <Typography color="text.secondary" aria-live="polite">
            {search.trim() && hasProjects
              ? `${visible.length} of ${projects.length} projects`
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
          </Typography>
        )}
        {hasProjects && <Box sx={{ ml: "auto" }}>{newProjectButton}</Box>}
      </Box>

      {content}

      <ProjectFormDialog
        key={formKey}
        open={formOpen}
        project={formTarget?.mode === "edit" ? formTarget.project : undefined}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!toDelete}
        destructive
        loading={deleteProject.isPending}
        title="Delete project?"
        confirmLabel="Delete project"
        description={
          <>
            <strong>{toDelete?.name}</strong> and all of its todos and sprints will be permanently
            deleted. This cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </PageContainer>
  );
}