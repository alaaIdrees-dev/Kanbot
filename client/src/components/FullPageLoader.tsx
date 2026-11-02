import { Box, CircularProgress } from "@mui/material";

export function FullPageLoader() {
  return (
    <Box
      role="status"
      aria-label="Loading"
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
    >
      <CircularProgress />
    </Box>
  );
}