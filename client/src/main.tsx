import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { RouterProvider } from "react-router-dom";
import { AppSnackbarProvider } from "./components/AppSnackbarProvider";
import { AuthProvider } from "./features/auth";
import { queryClient } from "./lib/queryClient";
import { theme } from "./lib/theme";
import { router } from "./router";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* First visit follows the OS colour scheme ("system"); an explicit choice is persisted by MUI (design-system.md §4). */}
      <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline />
        <AppSnackbarProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </AppSnackbarProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
