import { Box, Button, Typography } from "@mui/material";

interface FullPageErrorProps {
  message: string;
  onRetry: () => void;
}

export function FullPageError({ message, onRetry }: FullPageErrorProps) {
  return (
    <Box
      role="alert"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      <Box>
        <Typography variant="h5" component="h1" gutterBottom>
          Something went wrong
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        <Button variant="contained" onClick={onRetry}>
          Try again
        </Button>
      </Box>
    </Box>
  );
}