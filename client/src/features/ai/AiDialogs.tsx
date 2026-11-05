import { lazy, Suspense } from "react";
import { useAiUiStore } from "../../stores/aiUiStore";

// Both dialogs sit in the app shell but only render after the first open (`key > 0`), so they are
// fetched on demand. This keeps their form stack (react-hook-form + zod) out of the entry chunk.
const GenerateTodosDialog = lazy(() =>
  import("./GenerateTodosDialog").then((m) => ({ default: m.GenerateTodosDialog })),
);
const PlanSprintDialog = lazy(() =>
  import("./PlanSprintDialog").then((m) => ({ default: m.PlanSprintDialog })),
);

/**
 * Mounts the AI dialogs that can be opened from several places (the assistant's quick actions, the
 * backlog toolbar and its empty state) once, in the app shell. They are driven by the AI UI store and
 * remounted on every open (`key`) so their form values start fresh. The sprint summary dialog is
 * rendered by the board page instead, because it needs the sprint.
 */
export function AiDialogs({ projectId }: { projectId: string }) {
  const generate = useAiUiStore((s) => s.generateDialog);
  const plan = useAiUiStore((s) => s.planDialog);

  return (
    <Suspense fallback={null}>
      {generate.key > 0 && (
        <GenerateTodosDialog
          key={`generate-${generate.key}`}
          open={generate.open}
          projectId={projectId}
          onClose={() => useAiUiStore.getState().closeGenerate()}
        />
      )}
      {plan.key > 0 && (
        <PlanSprintDialog
          key={`plan-${plan.key}`}
          open={plan.open}
          projectId={projectId}
          onClose={() => useAiUiStore.getState().closePlan()}
        />
      )}
    </Suspense>
  );
}
