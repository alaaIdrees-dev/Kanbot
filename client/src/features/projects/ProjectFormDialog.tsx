import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { ApiError, fieldErrors } from "../../api/client";
import { useCreateProject, useUpdateProject } from "../../hooks/useProjects";
import type { ProjectWithStats } from "../../types/api";

// Client-side rules mirror the contract in types/api.ts (name 1–80, key 2–6 letters, description ≤ 500).
const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name must be at most 80 characters"),
  key: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z]{2,6}$/.test(v), "Key must be 2–6 letters (A–Z)"),
  description: z.string().max(500, "Description must be at most 500 characters"),
});
type ProjectFormValues = z.infer<typeof projectSchema>;

const FIELDS = ["name", "key", "description"] as const;

interface ProjectFormDialogProps {
  open: boolean;
  /** Present → edit mode (PRJ-3); absent → create mode (PRJ-2). */
  project?: ProjectWithStats;
  onClose: () => void;
  /** Called with the saved project after a successful create/update. */
  onSaved: (project: ProjectWithStats, mode: "create" | "edit") => void;
}

/**
 * PRJ-2 / PRJ-3. The parent remounts this component (via `key`) each time it opens, so the form
 * always starts from the project's current values.
 */
export function ProjectFormDialog({ open, project, onClose, onSaved }: ProjectFormDialogProps) {
  const titleId = useId();
  const isEdit = !!project;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      key: project?.key ?? "",
      description: project?.description ?? "",
    },
  });

  const keyField = register("key");

  const onSubmit = async (values: ProjectFormValues) => {
    setFormError(null);
    const name = values.name.trim();
    const key = values.key.trim().toUpperCase();
    const description = values.description.trim();
    try {
      if (project) {
        const saved = await updateProject.mutateAsync({
          projectId: project.id,
          // An empty key on edit means "leave it as it is".
          data: { name, description, ...(key ? { key } : {}) },
        });
        onSaved(saved, "edit");
      } else {
        const saved = await createProject.mutateAsync({
          name,
          description,
          // Empty key → the server generates one.
          ...(key ? { key } : {}),
        });
        onSaved(saved, "create");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // PRJ-2: the only unique field is the key.
        setError("key", { message: "This key is already used" });
        return;
      }
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        const mapped = fieldErrors(error);
        let placed = false;
        for (const field of FIELDS) {
          if (mapped[field]) {
            setError(field, { message: mapped[field] });
            placed = true;
          }
        }
        if (!placed) setFormError(error.message);
        return;
      }
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const busy = isSubmitting;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle id={titleId}>{isEdit ? "Edit project" : "New project"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Name"
              required
              autoFocus
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register("name")}
            />
            <TextField
              label="Key"
              fullWidth
              placeholder={isEdit ? undefined : "Generated from the name"}
              error={!!errors.key}
              helperText={
                errors.key?.message ??
                (isEdit
                  ? "Changing the key does not change the keys of existing todos."
                  : "Optional. 2–6 letters, used in todo keys like KAN-12.")
              }
              slotProps={{ htmlInput: { maxLength: 6, style: { textTransform: "uppercase" } } }}
              {...keyField}
              onChange={(event) => {
                event.target.value = event.target.value.toUpperCase();
                return keyField.onChange(event);
              }}
            />
            <TextField
              label="Description"
              multiline
              minRows={3}
              maxRows={6}
              fullWidth
              error={!!errors.description}
              helperText={errors.description?.message ?? "Optional."}
              {...register("description")}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create project"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
