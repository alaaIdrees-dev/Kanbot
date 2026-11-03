import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { PRIORITY_LABEL, TYPE_LABEL } from "../../lib/constants";
import { TODO_PRIORITIES, TODO_TYPES, type TodoPriority, type TodoType } from "../../types/api";

const ALL = "all";

export interface BacklogFilterValues {
  search: string;
  priority: TodoPriority | "";
  type: TodoType | "";
}

interface BacklogFiltersProps {
  values: BacklogFilterValues;
  onChange: (values: BacklogFilterValues) => void;
}

/**
 * BL-6: search (key, title, description, labels) and filters for priority and type. The search
 * text is debounced by the caller (NFR-6); this component just reports every keystroke.
 */
export function BacklogFilters({ values, onChange }: BacklogFiltersProps) {
  const hasActiveFilters = !!values.search || !!values.priority || !!values.type;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
      <TextField
        type="search"
        size="small"
        placeholder="Search todos . . ."
        value={values.search}
        onChange={(event) => onChange({ ...values, search: event.target.value })}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { "aria-label": "Search the backlog" },
        }}
        sx={{ width: { xs: "100%", sm: 220 } }}
      />

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="filter-priority-label">Priority</InputLabel>
        <Select
          labelId="filter-priority-label"
          label="Priority"
          value={values.priority || ALL}
          onChange={(event) =>
            onChange({
              ...values,
              priority: event.target.value === ALL ? "" : (event.target.value as TodoPriority),
            })
          }
        >
          <MenuItem value={ALL}>All priorities</MenuItem>
          {TODO_PRIORITIES.map((p) => (
            <MenuItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="filter-type-label">Type</InputLabel>
        <Select
          labelId="filter-type-label"
          label="Type"
          value={values.type || ALL}
          onChange={(event) =>
            onChange({
              ...values,
              type: event.target.value === ALL ? "" : (event.target.value as TodoType),
            })
          }
        >
          <MenuItem value={ALL}>All types</MenuItem>
          {TODO_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {TYPE_LABEL[t]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {hasActiveFilters && (
        <Button
          size="small"
          color="inherit"
          onClick={() => onChange({ search: "", priority: "", type: "" })}
        >
          Clear filters
        </Button>
      )}
    </Box>
  );
}
