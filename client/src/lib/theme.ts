import { createTheme, type Shadows } from "@mui/material/styles";
import {
  breakpoints,
  motion,
  radius,
  schemes,
  shadows,
  staticCssVars,
  typography,
  type ColorScheme,
} from "../design/tokens";

/**
 * The Kanbot MUI theme. Everything here is derived from src/design/tokens.ts — do not add raw
 * colours to this file. Overrides reference the generated CSS variables (`--mui-palette-*`) so a
 * single rule serves both colour schemes. Rules for extending: design-system.md §13.
 *
 * Colour schemes use `[data-theme="dark" | "light"]` on <html>. Dark is the default
 * (ThemeProvider `defaultMode="dark"` in main.tsx; index.html sets it before first paint).
 */

/** `var(--mui-palette-…)` helper keeps override rules short and typo-resistant. */
const p = (path: string) => `var(--mui-palette-${path})`;

function buildPalette(mode: ColorScheme) {
  const s = schemes[mode];
  return {
    primary: s.primary,
    secondary: { main: s.text.secondary, contrastText: s.background.default },
    success: s.success,
    warning: s.warning,
    error: s.error,
    info: s.info,
    ai: s.ai,
    background: { default: s.background.default, paper: s.background.paper },
    text: {
      primary: s.text.primary,
      secondary: s.text.secondary,
      muted: s.text.muted,
      disabled: s.action.disabledText,
    },
    divider: s.border.divider,
    action: {
      active: s.text.secondary,
      hover: s.action.hover,
      selected: s.action.selected,
      focus: s.action.focus,
      disabled: s.action.disabled,
      disabledBackground: s.action.disabledBackground,
    },
    surface: { raised: s.background.raised, sunken: s.background.sunken },
    border: { strong: s.border.strong, interactive: s.border.interactive },
    tint: s.tint,
    status: s.status,
    priority: s.priority,
    todoType: s.todoType,
    sprint: s.sprint,
    shadow: shadows[mode],
  };
}

// MUI needs 25 elevation entries. They point at the per-scheme shadow tokens (palette.shadow.*).
const sm = p("shadow-sm");
const md = p("shadow-md");
const lg = p("shadow-lg");
const elevations = ["none", sm, sm, sm, ...Array(8).fill(md), ...Array(13).fill(lg)] as Shadows;

/** One consistent, visible keyboard-focus ring (NFR-5). Uses the primary colour (≥3:1 in both schemes). */
const focusRing = {
  outline: `2px solid ${p("primary-main")}`,
  outlineOffset: 2,
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-theme" },
  colorSchemes: {
    dark: { palette: buildPalette("dark") },
    light: { palette: buildPalette("light") },
  },
  breakpoints: { values: { ...breakpoints } },
  shape: { borderRadius: radius.md },
  shadows: elevations,
  transitions: {
    duration: {
      shortest: 100,
      shorter: motion.duration.fast,
      short: 160,
      standard: motion.duration.base,
      complex: 260,
      enteringScreen: motion.duration.base,
      leavingScreen: 160,
    },
    easing: { easeInOut: motion.easing.inOut, easeOut: motion.easing.out },
  },
  typography: {
    fontFamily: typography.fontFamily,
    // A dense productivity UI: 14px body instead of MUI's 16px.
    h1: { fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.625rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.015em" },
    h3: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em" },
    h4: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.3 },
    h5: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.35 },
    h6: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontSize: "0.9375rem", fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: "0.875rem", lineHeight: 1.55 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.5 },
    caption: { fontSize: "0.75rem", lineHeight: 1.4 },
    overline: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", lineHeight: 1.4 },
    button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    mono: { fontFamily: typography.fontFamilyMono, fontSize: "0.8125rem", fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Scheme-independent tokens (radius, layout sizes, motion) as --kb-* custom properties,
        // consumed by Tailwind (style.css) and any non-MUI code.
        ":root": staticCssVars(),
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: `${p("border-strong")} transparent`,
        },
        // Links and bare focusable elements; MUI controls get the same ring via MuiButtonBase below.
        "a:focus-visible, summary:focus-visible, [tabindex]:focus-visible": focusRing,
        "::selection": { backgroundColor: p("tint-primary") },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },

    // ── Actions ──
    MuiButtonBase: {
      styleOverrides: { root: { "&.Mui-focusVisible": focusRing } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: radius.lg, fontWeight: 600 },
        sizeSmall: { minHeight: 28, padding: "2px 10px", fontSize: "0.8125rem" },
        sizeMedium: { minHeight: 36 },
        sizeLarge: { minHeight: 44, fontSize: "0.9375rem" },
      },
      variants: [
        // Neutral outlined buttons must show a ≥3:1 boundary (WCAG 1.4.11).
        {
          props: { variant: "outlined", color: "inherit" },
          style: { borderColor: p("border-interactive") },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: radius.md } },
    },

    // ── Surfaces ──
    MuiPaper: {
      styleOverrides: {
        // Dark mode: elevation comes from surface colour, not MUI's white overlay gradient.
        root: { backgroundImage: "none" },
        outlined: { borderColor: p("divider") },
      },
    },
    MuiCard: { defaultProps: { variant: "outlined" } },
    MuiDialog: {
      styleOverrides: {
        // The container is only a focus fallback (tabindex -1), not a control: no focus ring around it.
        container: { outline: "none" },
        paper: {
          borderRadius: radius.xl,
          border: `1px solid ${p("divider")}`,
          backgroundColor: p("surface-raised"),
          // Opening: rise + settle (keyframes in style.css). The container's own fade handles closing.
          animation: `kb-dialog-in ${motion.duration.slow}ms ${motion.easing.out}`,
        },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: "1.125rem", fontWeight: 600 } } },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: p("background-paper"), borderColor: p("divider") },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          border: `1px solid ${p("divider")}`,
          borderRadius: radius.lg,
          backgroundColor: p("surface-raised"),
        },
      },
    },
    MuiMenu: { styleOverrides: { list: { padding: 4 } } },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          minHeight: 36,
          fontSize: "0.875rem",
          "&.Mui-selected": { backgroundColor: p("action-selected") },
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: p("divider") } } },

    // ── Forms ──
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          // Control boundary = interactive border token (≥3:1). MUI's own hover/focus/error rules win.
          "& .MuiOutlinedInput-notchedOutline": { borderColor: p("border-interactive") },
          "& input::placeholder, & textarea::placeholder": {
            color: p("text-muted"),
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: p("text-secondary") } } },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, marginRight: 2 } } },

    // ── Feedback & display ──
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          alignItems: "center",

          "&.MuiAlert-standardSuccess": {
            backgroundColor: p("tint-success"),
            color: p("text-primary"),
            "& .MuiAlert-icon": {
              color: p("success-main"),
            },
          },

          "&.MuiAlert-standardError": {
            backgroundColor: p("tint-error"),
            color: p("text-primary"),
            "& .MuiAlert-icon": {
              color: p("error-main"),
            },
          },

          "&.MuiAlert-standardWarning": {
            backgroundColor: p("tint-warning"),
            color: p("text-primary"),
            "& .MuiAlert-icon": {
              color: p("warning-main"),
            },
          },

          "&.MuiAlert-standardInfo": {
            backgroundColor: p("tint-info"),
            color: p("text-primary"),
            "& .MuiAlert-icon": {
              color: p("info-main"),
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.md, fontWeight: 500 },
        sizeSmall: { height: 22, fontSize: "0.75rem" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: "0.75rem", borderRadius: radius.sm, padding: "4px 8px" },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: p("border-strong"),
          // Determinate bars: grow in on mount, then ease to every new value (a card dropped in
          // Done moves the sprint bar). Nested selector so it beats MUI's own `linear` transition.
          "&.MuiLinearProgress-determinate .MuiLinearProgress-bar": {
            transition: `transform 700ms ${motion.easing.out}, background-color ${motion.duration.slow}ms ${motion.easing.inOut}`,
            animation: `kb-progress-in 900ms ${motion.easing.out}`,
          },
        },
        bar: { borderRadius: radius.pill },
      },
    },
    MuiBreadcrumbs: { styleOverrides: { root: { fontSize: "0.8125rem" } } },

    // ── Navigation ──
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 2, borderRadius: radius.pill },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 40, textTransform: "none", fontWeight: 600, fontSize: "0.875rem" },
      },
    },
  },
});
