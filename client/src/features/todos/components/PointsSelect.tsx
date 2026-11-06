import { useId } from "react";
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { STORY_POINTS, type StoryPoints } from "../../../types/api";

const NONE_VALUE = "none";

interface PointsSelectProps {
  value: StoryPoints | null;
  onChange: (value: StoryPoints | null) => void;
  disabled?: boolean;
  size?: "small" | "medium";
}

/** Story points: 1, 2, 3, 5, 8, 13, or not estimated (`null`). */
export function PointsSelect({ value, onChange, disabled, size = "medium" }: PointsSelectProps) {
  const labelId = useId();
  const handleChange = (event: SelectChangeEvent) => {
    const raw = event.target.value;
    onChange(raw === NONE_VALUE ? null : (Number(raw) as StoryPoints));
  };

  return (
    <FormControl fullWidth size={size} disabled={disabled}>
      <InputLabel id={labelId}>Story points</InputLabel>
      <Select
        labelId={labelId}
        label="Story points"
        value={value === null ? NONE_VALUE : String(value)}
        onChange={handleChange}
      >
        <MenuItem value={NONE_VALUE}>Not estimated</MenuItem>
        {STORY_POINTS.map((points) => (
          <MenuItem key={points} value={String(points)}>
            {points}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
