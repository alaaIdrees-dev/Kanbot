import type { CSSProperties } from "react";
import type { SprintStatus, TodoPriority, TodoStatus, TodoType } from "../types/api";

/**
 * Type-only extension of the MUI theme with Kanbot's semantic tokens (values live in tokens.ts).
 * Keys of status / priority / todoType / sprint match the API enums, so UI code can write
 * `sx={{ color: `status.${todo.status}` }}` without a lookup table.
 */
declare module "@mui/material/styles" {
  interface KanbotPaletteExtras {
    /** AI accent. Use `ai.text` (not `ai.main`) when the amber is the colour of body text. */
    ai: { main: string; light: string; dark: string; contrastText: string; text: string };
    surface: { raised: string; sunken: string };
    border: { strong: string; interactive: string };
    tint: {
      primary: string;
      ai: string;
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    status: Record<TodoStatus, string>;
    priority: Record<TodoPriority, string>;
    todoType: Record<TodoType, string>;
    sprint: Record<SprintStatus, string>;
    shadow: { sm: string; md: string; lg: string };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation merges extras into Palette
  interface Palette extends KanbotPaletteExtras {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation merges extras into PaletteOptions
  interface PaletteOptions extends Partial<KanbotPaletteExtras> {}

  interface TypeText {
    muted: string;
  }

  interface TypographyVariants {
    /** Monospace — todo keys (KAN-12), code. */
    mono: CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}

// `color="ai"` is available on the controls that take a palette colour.
declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    ai: true;
  }
}
declare module "@mui/material/IconButton" {
  interface IconButtonPropsColorOverrides {
    ai: true;
  }
}
declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    ai: true;
  }
}
declare module "@mui/material/CircularProgress" {
  interface CircularProgressPropsColorOverrides {
    ai: true;
  }
}
