import type { ReactNode } from "react";
import { Box, Button, Tooltip, type ButtonProps } from "@mui/material";

interface PlannedActionButtonProps extends Pick<ButtonProps, "color" | "variant" | "startIcon"> {
  children: ReactNode;
  /** Explains when the action arrives, e.g. "Sprint planning arrives on Day 4". */
  reason: string;
}

/**
 * A toolbar action from wireframe 04 whose feature is built on a later day (plan §5). It is shown
 * so the toolbar already has its final shape, disabled, with the reason in a tooltip. The wrapper
 * is focusable so keyboard users can read the tooltip too (a disabled button can't take focus).
 * Replace it with a normal <Button onClick> when the feature lands.
 */
export function PlannedActionButton({ children, reason, ...buttonProps }: PlannedActionButtonProps) {
  return (
    <Tooltip title={reason}>
      <Box component="span" tabIndex={0} sx={{ display: "inline-flex", borderRadius: 2 }}>
        <Button {...buttonProps} disabled>
          {children}
        </Button>
      </Box>
    </Tooltip>
  );
}
