import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import logoIcon from "../../assets/kanbot-icon.svg";

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
}

/** Centered card shared by the Login and Register pages. */
export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper
        component="main"
        variant="outlined"
        sx={{ width: "100%", maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 3 }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
          <Box component="img" src={logoIcon} alt="" width={36} height={36} />
          <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
            Kanbot
          </Typography>
        </Stack>
        <Typography variant="h5" component="h1" align="center" sx={{ mt: 3, mb: 3 }}>
          {title}
        </Typography>
        {children}
      </Paper>
    </Box>
  );
}
