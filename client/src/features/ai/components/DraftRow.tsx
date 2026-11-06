import { Box, Checkbox, MenuItem, TextField } from "@mui/material";
import { PRIORITY_LABEL, TYPE_LABEL } from "../../../lib/constants";
import {
  TODO_PRIORITIES,
  TODO_TYPES,
  type DraftTodo,
  type TodoPriority,
  type TodoType,
} from "../../../types/api";
import { PointsSelect } from "../../todos";

/** A generated draft plus the state the dialog adds: a local id and whether it is checked. */
export interface Draft extends DraftTodo {
  id: number;
  selected: boolean;
}

export const TITLE_MAX = 200;

interface DraftRowProps {
  draft: Draft;
  /** 1-based position, used in the accessible names ("Draft 3"). */
  position: number;
  disabled: boolean;
  onChange: (id: number, patch: Partial<Draft>) => void;
}

/** AI-2: one editable draft: checkbox, title, type, priority and points (wireframe 08). */
export function DraftRow({ draft, position, disabled, onChange }: DraftRowProps) {
  const titleMissing = draft.selected && draft.title.trim() === "";
  return (
    <Box
      role="group"
      aria-label={`Draft ${position}`}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 1.5,
        p: 1.25,
        borderRadius: 2,
        bgcolor: "surface.sunken",
        opacity: draft.selected ? 1 : 0.7,
      }}
    >
      <Checkbox
        checked={draft.selected}
        disabled={disabled}
        onChange={(event) => onChange(draft.id, { selected: event.target.checked })}
        slotProps={{ input: { "aria-label": `Add draft ${position} to the backlog` } }}
        sx={{ mt: 0.25 }}
      />
      <TextField
        label="Title"
        size="small"
        value={draft.title}
        disabled={disabled}
        error={titleMissing}
        helperText={titleMissing ? "A title is required" : undefined}
        onChange={(event) => onChange(draft.id, { title: event.target.value })}
        slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
        sx={{ flex: "1 1 220px", minWidth: 0 }}
      />
      <TextField
        select
        label="Type"
        size="small"
        value={draft.type}
        disabled={disabled}
        onChange={(event) => onChange(draft.id, { type: event.target.value as TodoType })}
        sx={{ flex: "0 0 120px" }}
      >
        {TODO_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {TYPE_LABEL[type]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Priority"
        size="small"
        value={draft.priority}
        disabled={disabled}
        onChange={(event) => onChange(draft.id, { priority: event.target.value as TodoPriority })}
        sx={{ flex: "0 0 130px" }}
      >
        {TODO_PRIORITIES.map((priority) => (
          <MenuItem key={priority} value={priority}>
            {PRIORITY_LABEL[priority]}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ flex: "0 0 150px" }}>
        <PointsSelect
          size="small"
          disabled={disabled}
          value={draft.storyPoints}
          onChange={(storyPoints) => onChange(draft.id, { storyPoints })}
        />
      </Box>
    </Box>
  );
}
