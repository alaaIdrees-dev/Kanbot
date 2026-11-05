import { Typography } from "@mui/material";

/** AI-5: shown wherever the user can act on an AI answer. */
export function AiDisclaimer({ align = "left" }: { align?: "left" | "center" }) {
  return (
    <Typography variant="caption" color="text.secondary" component="p" sx={{ textAlign: align }}>
      AI can make mistakes. Review before saving.
    </Typography>
  );
}
