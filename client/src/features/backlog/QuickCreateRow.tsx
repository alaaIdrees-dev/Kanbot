import { forwardRef, useState, type KeyboardEvent } from "react";
import Add from "@mui/icons-material/Add";
import { Box, TextField, Typography } from "@mui/material";

interface QuickCreateRowProps {
  onCreate: (title: string) => void;
}

/**
 * BL-2 (wireframe 04: dashed row, "+ Create todo" then "Type a title and press Enter").
 * Enter creates the todo (defaults: task, medium, no points) and clears the field, keeping focus
 * for the next one (the element is never unmounted, so focus is never lost). Escape clears it.
 * The forwarded ref lets the backlog's empty state focus this input ("Create a todo").
 */
export const QuickCreateRow = forwardRef<HTMLInputElement, QuickCreateRowProps>(function QuickCreateRow(
  { onCreate },
  ref,
) {
  const [value, setValue] = useState("");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const title = value.trim();
      if (!title) return;
      onCreate(title);
      setValue("");
    } else if (event.key === "Escape") {
      setValue("");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderTop: "1px dashed",
        borderColor: "border.interactive",
        pl: { xs: 1.5, sm: 2 },
        pr: 2,
        py: 0.5,
        "&:focus-within": { bgcolor: "action.hover" },
      }}
    >
      {/* Visible label for sighted users; the input itself carries the accessible name. */}
      <Box
        aria-hidden="true"
        sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
      >
        <Add fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          Create todo
        </Typography>
      </Box>
      <TextField
        inputRef={ref}
        fullWidth
        variant="standard"
        placeholder="Add a new task or story . . . "
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        slotProps={{
          input: { disableUnderline: true },
          htmlInput: { maxLength: 200, "aria-label": "New todo title" },
        }}
        sx={{ "& .MuiInputBase-root": { py: 1 } }}
      />
    </Box>
  );
});
