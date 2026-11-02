import type { ReactNode } from "react";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlined from "@mui/icons-material/ErrorOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { styled } from "@mui/material/styles";
import { MaterialDesignContent, SnackbarProvider } from "notistack";

/**
 * Themed toasts (NFR-3: feedback for every mutation).
 * Each variant has its own icon and a left accent bar.
 */
const Toast = styled(MaterialDesignContent)(({ theme }) => ({
  "&.notistack-MuiContent": {
    backgroundColor: "var(--mui-palette-surface-raised)",
    color: "var(--mui-palette-text-primary)",
    border: "1px solid var(--mui-palette-divider)",
    borderRadius: theme.shape.borderRadius,
    boxShadow: "var(--mui-palette-shadow-md)",
    fontFamily: "inherit",
    fontSize: "0.875rem",
  },
  "&.notistack-MuiContent-success": {
    borderLeft: "4px solid var(--mui-palette-success-main)",
  },
  "&.notistack-MuiContent-error": {
    borderLeft: "4px solid var(--mui-palette-error-main)",
  },
  "&.notistack-MuiContent-warning": {
    borderLeft: "4px solid var(--mui-palette-warning-main)",
  },
  "&.notistack-MuiContent-info": {
    borderLeft: "4px solid var(--mui-palette-info-main)",
  },
}));

const iconSx = { mr: 1, fontSize: 20 } as const;

export function AppSnackbarProvider({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={5000}
      preventDuplicate
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      Components={{
        default: Toast,
        success: Toast,
        error: Toast,
        warning: Toast,
        info: Toast,
      }}
      iconVariant={{
        success: <CheckCircleOutlined sx={{ ...iconSx, color: "success.main" }} />,
        error: <ErrorOutlined sx={{ ...iconSx, color: "error.main" }} />,
        warning: <WarningAmberOutlined sx={{ ...iconSx, color: "warning.main" }} />,
        info: <InfoOutlined sx={{ ...iconSx, color: "info.main" }} />,
      }}
    >
      {children}
    </SnackbarProvider>
  );
}
