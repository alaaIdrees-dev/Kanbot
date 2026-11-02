import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { layout } from "../design/tokens";

/** Standard page padding and max width inside the app shell's scrolling area. */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: layout.pageMaxWidth, mx: "auto", p: { xs: 2, md: 3 } }}>{children}</Box>
  );
}
