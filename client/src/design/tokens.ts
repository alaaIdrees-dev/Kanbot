/**
 * Kanbot design tokens — the ONE place raw values live.
 *
 * Flow: tokens.ts → MUI theme (src/lib/theme.ts) → CSS variables (`--mui-palette-*`,
 * `--kb-*`) → Tailwind utilities (src/style.css). Nothing else may hard-code a colour,
 * radius, duration or layout size. See design-system.md.
 *
 * Brand colours come from the provided logo (design/logo): indigo #4F46E5 and green #22C55E.
 * Every value below was checked against WCAG 2.2 AA — the ratios are listed in
 * design-system.md §5. Re-run that check when you change a colour here.
 */

export type ColorScheme = "dark" | "light";

// ─────────────────────────────── Colours (per scheme) ───────────────────────────────

export interface SchemeTokens {
  background: { default: string; paper: string; raised: string; sunken: string };
  text: { primary: string; secondary: string; muted: string };
  /** `divider` = decorative separators (exempt from 1.4.11). `interactive` = any control boundary (≥3:1). */
  border: { divider: string; strong: string; interactive: string };
  primary: { main: string; contrastText: string };
  /** AI is the only place the warm amber accent is used. `text` is the AA-safe variant for body text. */
  ai: { main: string; light: string; dark: string; contrastText: string; text: string };
  success: { main: string; contrastText: string };
  warning: { main: string; contrastText: string };
  error: { main: string; contrastText: string };
  info: { main: string; contrastText: string };
  /** Soft tinted backgrounds for chips / alerts. Text on them uses the matching `main` (checked ≥4.5:1). */
  tint: {
    primary: string;
    ai: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  /** Keys match the API enums so UI code can index with `todo.status` directly. */
  status: { todo: string; in_progress: string; in_review: string; done: string };
  priority: { low: string; medium: string; high: string; urgent: string };
  todoType: { task: string; story: string; bug: string };
  sprint: { planned: string; active: string; completed: string };
  /** Interaction overlays (hover / selected / focus) — translucent text colour so they work on any surface. */
  action: {
    hover: string;
    selected: string;
    focus: string;
    disabled: string;
    disabledBackground: string;
    disabledText: string;
  };
}

export const schemes: Record<ColorScheme, SchemeTokens> = {
  // Dark is the default experience. Elevation = lighter surface (no heavy shadows).
  dark: {
    background: { default: "#0D0F16", paper: "#141824", raised: "#1C212F", sunken: "#0A0C12" },
    text: { primary: "#E8EAF0", secondary: "#AEB4C4", muted: "#838BA0" },
    border: { divider: "#242B3A", strong: "#2E3647", interactive: "#626B80" },
    primary: { main: "#818CF8", contrastText: "#14153A" },
    ai: {
      main: "#F5A623",
      light: "#FFC766",
      dark: "#FFB640",
      contrastText: "#1A1203",
      text: "#F5A623",
    },
    success: { main: "#4ADE80", contrastText: "#06210F" },
    warning: { main: "#FB923C", contrastText: "#2A1203" },
    error: { main: "#F2707F", contrastText: "#2A0A10" },
    info: { main: "#4FA3D1", contrastText: "#06202E" },
    tint: {
      primary: "#1E2150",
      ai: "#3A2E16",
      success: "#13291D",
      warning: "#3A2410",
      error: "#3A1820",
      info: "#15293A",
    },
    status: { todo: "#8B93A5", in_progress: "#4FA3D1", in_review: "#B794F4", done: "#4ADE80" },
    priority: { low: "#838BA0", medium: "#AEB4C4", high: "#FB923C", urgent: "#F2707F" },
    todoType: { task: "#2BB7A6", story: "#F472B6", bug: "#F2707F" },
    sprint: { planned: "#8B93A5", active: "#818CF8", completed: "#4ADE80" },
    action: {
      hover: "rgba(232, 234, 240, 0.06)",
      selected: "rgba(129, 140, 248, 0.16)",
      focus: "rgba(232, 234, 240, 0.12)",
      disabled: "rgba(232, 234, 240, 0.32)",
      disabledBackground: "rgba(232, 234, 240, 0.1)",
      disabledText: "#5A6175",
    },
  },
  // Light is a designed sibling, not an inversion: elevation comes from shadow, colours are darkened for AA.
  light: {
    background: { default: "#F6F7FB", paper: "#FFFFFF", raised: "#FFFFFF", sunken: "#EEF0F6" },
    text: { primary: "#15181F", secondary: "#4B5468", muted: "#5B6475" },
    border: { divider: "#E1E4EA", strong: "#CBD0DB", interactive: "#7C8599" },
    primary: { main: "#4F46E5", contrastText: "#FFFFFF" },
    ai: {
      main: "#C8780E",
      light: "#E09A3A",
      dark: "#D98A1F",
      contrastText: "#1A1203",
      text: "#9C5E00",
    },
    success: { main: "#166534", contrastText: "#FFFFFF" },
    warning: { main: "#9A4207", contrastText: "#FFFFFF" },
    error: { main: "#C22F49", contrastText: "#FFFFFF" },
    info: { main: "#1F74A3", contrastText: "#FFFFFF" },
    tint: {
      primary: "#E9E8FD",
      ai: "#FDF0DA",
      success: "#E4F6ED",
      warning: "#FDEBD9",
      error: "#FBE6EA",
      info: "#E5F2F9",
    },
    status: { todo: "#6B7488", in_progress: "#2D7FAB", in_review: "#7A5BC4", done: "#15803D" },
    priority: { low: "#6D7488", medium: "#4B5468", high: "#C2410C", urgent: "#C22F49" },
    todoType: { task: "#1A8F82", story: "#BE185D", bug: "#C22F49" },
    sprint: { planned: "#6B7488", active: "#4F46E5", completed: "#15803D" },
    action: {
      hover: "rgba(21, 24, 31, 0.05)",
      selected: "rgba(79, 70, 229, 0.1)",
      focus: "rgba(21, 24, 31, 0.1)",
      disabled: "rgba(21, 24, 31, 0.32)",
      disabledBackground: "rgba(21, 24, 31, 0.08)",
      disabledText: "#9AA1B1",
    },
  },
};

// ─────────────────────────────── Non-colour tokens ───────────────────────────────

export const typography = {
  fontFamily: '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  /** Todo keys (KAN-12), dates in dense rows, AI code blocks. No extra web font is loaded. */
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
} as const;

/** Border radius in px. MUI's `shape.borderRadius` is `radius.md`; `sx={{ borderRadius: 2 }}` = 2 × md. */
export const radius = { sm: 4, md: 6, lg: 10, xl: 14, pill: 999 } as const;

/** Breakpoints follow NFR-4: 768 = tablet, 1024 = desktop (sidebar collapses below `lg`). */
export const breakpoints = { xs: 0, sm: 600, md: 768, lg: 1024, xl: 1440 } as const;

/** Fixed layout dimensions (px) for the app shell, board and AI drawer. */
export const layout = {
  sidebarWidth: 248,
  sidebarCollapsedWidth: 64,
  topbarHeight: 56,
  boardColumnWidth: 288,
  boardColumnGap: 12,
  assistantWidth: 400,
  pageMaxWidth: 1200,
  dialogWidthSm: 420,
  dialogWidthMd: 560,
  dialogWidthLg: 760,
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 320 },
  easing: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

/** Elevation per scheme (dark relies on surface colour, so its shadows are only a soft hint). */
export const shadows = {
  dark: {
    sm: "0 1px 2px rgba(5, 6, 10, 0.4)",
    md: "0 4px 12px rgba(5, 6, 10, 0.45)",
    lg: "0 12px 32px rgba(5, 6, 10, 0.55)",
  },
  light: {
    sm: "0 1px 2px rgba(21, 24, 31, 0.06)",
    md: "0 4px 12px rgba(21, 24, 31, 0.1)",
    lg: "0 16px 32px rgba(21, 24, 31, 0.14)",
  },
} as const;

// ─────────────────────────── CSS variable access (non-MUI code) ───────────────────────────

/**
 * Typed `var(--…)` strings for places that are not MUI `sx`/palette lookups
 * (inline styles, styled-components, canvas). Inside MUI prefer palette paths like "text.secondary".
 * The names are generated by MUI from the theme palette (prefix `mui`).
 */
export const cssVar = {
  bg: "var(--mui-palette-background-default)",
  surface: "var(--mui-palette-background-paper)",
  raised: "var(--mui-palette-surface-raised)",
  sunken: "var(--mui-palette-surface-sunken)",
  text: "var(--mui-palette-text-primary)",
  textSecondary: "var(--mui-palette-text-secondary)",
  textMuted: "var(--mui-palette-text-muted)",
  divider: "var(--mui-palette-divider)",
  borderInteractive: "var(--mui-palette-border-interactive)",
  primary: "var(--mui-palette-primary-main)",
  ai: "var(--mui-palette-ai-main)",
} as const;

/** Static (scheme-independent) tokens exposed as `--kb-*` custom properties on :root. */
export function staticCssVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(radius)) vars[`--kb-radius-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(layout)) {
    vars[`--kb-layout-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = `${v}px`;
  }
  for (const [k, v] of Object.entries(motion.duration)) vars[`--kb-duration-${k}`] = `${v}ms`;
  for (const [k, v] of Object.entries(motion.easing)) {
    vars[`--kb-ease-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = v;
  }
  vars["--kb-font-sans"] = typography.fontFamily;
  vars["--kb-font-mono"] = typography.fontFamilyMono;
  return vars;
}
