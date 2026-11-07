# Kanbot Design System

> **Single source of truth for UI decisions.** Read this before creating or styling any component or page, and update it in the same change whenever tokens or shared components change.
> It documents only what exists in the code today (see §14 for known limitations).

Requirements this serves: [REQUIREMENTS](../docs/REQUIREMENTS.en.md) §1.4 (design is our choice), NFR-2/3/4/5/9 · [IMPLEMENTATION-PLAN](../docs/IMPLEMENTATION-PLAN.en.md) §2 (UI library: our choice), §3.2 (`components/` = design-system pieces, `lib/` = constants).

---

## 1. Decisions and why

| Decision | Choice | Reason |
|---|---|---|
| UI library | **MUI v9** (+ Emotion, `@mui/icons-material`) | Already installed and wired in `main.tsx`; accessible dialogs/menus/tabs out of the box (NFR-5). We **theme** it instead of rebuilding components. |
| Toasts | **notistack** (installed), themed in `AppSnackbarProvider` | Queueing/auto-hide for free; satisfies NFR-3. |
| Tailwind v4 | Installed; used for **layout of plain elements only** | Shares the same tokens (see §10). Never restyles MUI components. |
| Brand | Indigo + green from the provided logo (`design/logo`) | The logo is the only given identity; the old placeholder `#6858e8` was replaced by the logo indigo (better contrast). |
| Theme | **Dark first**, complete light theme | Optional enhancement in requirements §9 ("Dark mode with a theme toggle"); dark is the default, choice is remembered. |
| Font | **DM Sans** (already loaded) + system monospace for keys/code | No new font dependency. |
| AI accent | Warm **amber**, used only for AI | Makes "this is the assistant" recognisable without a second brand. |

Product shape this system is designed for (from the requirements, not invented): single user, **no teams/assignees**, fixed four board columns (To Do → In Progress → In Review → Done), backlog is a *list* not a status, sprint status planned/active/completed, todo types task/story/bug, priorities low/medium/high/urgent, story points 1–13.

---

## 2. File map

| File | Role |
|---|---|
| `src/design/tokens.ts` | **All raw values.** Colours per scheme, radius, breakpoints, layout sizes, motion, shadows, typography. |
| `src/design/mui-augmentation.d.ts` | Types for the custom palette keys, `Typography variant="mono"`, `color="ai"`. |
| `src/design/todoVisuals.ts` | Icon per status / priority / type (the "shape" half of colour + shape). |
| `src/lib/theme.ts` | Builds the MUI theme from tokens (both schemes + component overrides). |
| `src/lib/constants.ts` | Human labels for API enums. |
| `src/style.css` | Maps the same tokens to Tailwind utilities. |
| `src/components/` | Shared pieces: `ThemeToggle`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `AppSnackbarProvider` (+ existing `FullPageError`, `FullPageLoader`, `NotFoundPage`). |
| `index.html` | Sets `data-theme` before first paint (no flash). |

Flow: `tokens.ts → createTheme (lib/theme.ts) → CSS variables (--mui-palette-*, --kb-*) → MUI components and Tailwind utilities`.

---

## 3. Colour tokens

Tokens are palette entries, so they exist as MUI palette paths (`sx={{ color: "text.secondary" }}`), CSS variables (`var(--mui-palette-text-secondary)`) and Tailwind utilities (`text-content-secondary`).

| Group | Tokens (palette path) | Use |
|---|---|---|
| Surfaces | `background.default`, `background.paper`, `surface.raised`, `surface.sunken` | App background; cards/sidebar/panels; dialogs/menus; inset areas |
| Text | `text.primary`, `text.secondary`, `text.muted`, `text.disabled` | Body; labels; hints/placeholders/timestamps; disabled (exempt from contrast) |
| Borders | `divider`, `border.strong`, `border.interactive` | Decorative separators; stronger rules and progress track; **boundary of any control** |
| Brand | `primary.*` | Main actions, links, focus ring, selected state |
| AI | `ai.main`, `ai.contrastText`, `ai.text`, `ai.light`, `ai.dark` | Assistant UI only (Ask AI button, AI badge, AI messages). Use `ai.text` when amber is the colour of **text**. |
| Semantic | `success`, `warning`, `error`, `info` (`.main`, `.contrastText`) | Feedback |
| Tints | `tint.primary / ai / success / warning / error / info` | Soft backgrounds for chips and alerts |
| Todo status | `status.todo / in_progress / in_review / done` | Marker colour (dot/icon). Keys equal API values. |
| Priority | `priority.low / medium / high / urgent` | Marker colour |
| Todo type | `todoType.task / story / bug` | Icon colour |
| Sprint status | `sprint.planned / active / completed` | Status chip/marker |
| Actions | `action.hover / selected / focus / disabled` | Interaction overlays |

Values live in `tokens.ts` (`schemes.dark`, `schemes.light`). Do not copy hex values into components.

### Light is not an inversion
- Dark: elevation = lighter surface (`background.default` < `paper` < `surface.raised`); shadows are only a soft hint.
- Light: surfaces are white/near-white; elevation = shadow + border; every semantic colour is darkened to stay AA on white.

---

## 4. Themes and switching

- Attribute: `data-theme="dark" | "light"` on `<html>`.
- Modes: **Light, Dark, System**. With no stored choice (first visit) or "System", the OS `prefers-color-scheme` decides and is followed live; dark is the fallback when it can't be read.
- MUI is created with `cssVariables: { colorSchemeSelector: "data-theme" }`; `ThemeProvider defaultMode="system"` (in `main.tsx`) manages the mode and persists it in `localStorage["mui-mode"]` (`light` | `dark` | `system`).
- `index.html` applies the same rule before React loads, so there is no flash of the wrong theme.
- Toggle with `<ThemeToggle />` (a menu; uses MUI's `useColorScheme`). The command palette offers the same three options.
- **No component branches on the theme.** If you need a different value per theme, add a token; never write `mode === "dark" ? … : …` in a component.

---

## 5. Accessibility: contrast audit (WCAG 2.2 AA)

Computed with the WCAG relative-luminance formula directly from `tokens.ts`: **238 pairs checked, 0 failing** (`npm run check:contrast` → `scripts/check-contrast.mjs`, needs Node ≥ 22.6; re-run it after any colour change).

Rules applied:
- **Text** (1.4.3) ≥ **4.5:1**: text.primary/secondary/muted on all four surfaces; primary and ai.text as text on all surfaces; success/warning/error/info as text; button labels on their fills (incl. `ai.dark` hover); coloured text on its tint; `text.primary` on every tint.
- **Non-text** (1.4.11) ≥ **3:1**: `border.interactive` on `default`/`paper`/`raised`; every status, priority, type and sprint marker on `paper` and `default`; the focus ring (`primary.main`).
- `divider` and `border.strong` are decorative separators and intentionally low contrast (not a control boundary). **Any border that is the only thing marking a control must use `border.interactive`.**
- Disabled controls are exempt (1.4.3), their colours are not audited.

Representative ratios:

| Pair | Dark | Light |
|---|---|---|
| text.primary on paper | 14.7 | 17.8 |
| text.secondary on paper | 8.5 | 7.6 |
| text.muted (worst of 4 surfaces) | 4.7 | 5.2 |
| primary as text/link on paper | 5.9 | 6.3 |
| button label on primary | 5.9 | 6.3 |
| ai.text on paper | 8.7 | 5.2 |
| button label on ai | 9.2 | 5.4 |
| error text on paper | 6.2 | 5.5 |
| border.interactive vs paper (≥3) | 3.3 | 3.7 |
| lowest status/priority/type/sprint marker vs paper (≥3) | 5.2 | 4.0 |

**Not verified by this audit** (needs a running app + manual/axe testing): actual rendered pairings in MUI states (hover, focus, selected), forced-colours mode, screen-reader behaviour, 2.4.11 focus-not-obscured, target sizes (2.5.8).

### Other accessibility rules (NFR-5)
- **Colour is never the only signal.** Status/priority/type = colour token **+ icon from `todoVisuals.ts` + label from `constants.ts`**.
- One visible focus ring everywhere: 2px `primary.main`, 2px offset (`MuiButtonBase` + links; MUI inputs use their 2px focused outline).
- Use MUI's own accessible primitives (`Dialog`, `Menu`, `Tabs`, `Tooltip`): focus trap, Esc, roles are built in. Icon-only buttons need `aria-label`.
- `prefers-reduced-motion` disables animation globally (CssBaseline override).
- Form fields: always a `label` (MUI `TextField label`), error text via `helperText` (links `aria-describedby`).

---

## 6. Typography

Font: **DM Sans** (`typography.fontFamily`). Mono: system monospace stack, exposed as `<Typography variant="mono">` and `--kb-font-mono` / Tailwind `font-mono` — for todo keys (`KAN-12`) and AI code blocks.

| Variant | Size / weight | Use |
|---|---|---|
| h1 | 2rem / 700 | Auth/marketing only |
| h2 | 1.625rem / 700 | — |
| h3 | 1.5rem / 700 | Large empty/404 titles |
| h4 | 1.25rem / 600 | Page title (top bar) |
| h5 | 1.125rem / 600 | Dialog/card titles |
| h6 | 1rem / 600 | Section titles, empty-state titles |
| subtitle1 / 2 | 0.9375 / 0.8125rem | Secondary headings |
| body1 / body2 | 0.875 / 0.8125rem | Default (dense app UI) / rows and meta |
| caption | 0.75rem | Hints, timestamps |
| overline | 0.6875rem, +0.06em | Column/section eyebrows |
| button | 0.875rem / 600, no uppercase | All buttons |
| mono | 0.8125rem / 500 | Keys, code |

Line heights are in the theme. Use the `variant` prop, never raw `fontSize` in components.

---

## 7. Spacing, layout, radius, shadow, motion

- **Spacing:** MUI default 8px unit. Use `sx` numbers (`p: 2` = 16px, `gap: 1.5` = 12px). Half steps (0.5 = 4px) are allowed. Tailwind spacing utilities use its own 4px scale — fine for plain-element layout.
- **Layout sizes** (`layout` in tokens → `--kb-layout-*` → Tailwind `w-sidebar` etc.): sidebar 248 (collapsed 64), top bar 56, board column 288 (gap 12), AI drawer 400, page max width 1200, dialogs 420 / 560 / 760.
- **Radius** (`radius`): sm 4 (chips-small, menu items) · md 6 (**MUI base**; icon buttons, `sx borderRadius: 1`) · lg 10 (buttons, inputs, menus) · xl 14 (dialogs) · pill. Cards/panels use `borderRadius: 3` (= 3 × base = 18) via `sx`, as the existing auth card does.
- **Shadows:** `palette.shadow.sm/md/lg`, switched per scheme; MUI `elevation` 1–3 → sm, 4–11 → md, 12+ → lg. Paper's dark-mode overlay gradient is disabled.
- **Motion:** fast 120ms, base 200ms, slow 320ms; easing `cubic-bezier(0.16,1,0.3,1)` (out). Use MUI `transitions.create(...)` in components; keep motion subtle.
- **Motion catalogue** (keyframes in `style.css`; all collapse to ~0ms under `prefers-reduced-motion` via the CssBaseline rule in `lib/theme.ts`):
  - `kb-dialog-in`: every MUI `Dialog` paper (and the command palette) rises 14px and scales 0.97 → 1 over 320ms while the container fades.
  - `kb-progress-in` + a 700ms `transform` transition on determinate `LinearProgress` (theme override): the bar grows from empty on mount and eases to every new value; the sprint bar turns green at 100%.
  - `kb-lift`: the floating drag preview (backlog and board) lifts (scale 1.025, 1° tilt). The board's drop animation glides the preview into its slot (200ms).
  - `kb-settle`: the todo that just landed (drop or "Move to…" menu) flashes once. Driven by `lib/motionStore.ts`.

---

## 8. Components

### 8.1 MUI components — themed, use directly (do not wrap)
Button, IconButton, TextField/OutlinedInput, Select, Checkbox, Switch, Dialog, Menu/MenuItem, Tabs/Tab, Tooltip, Chip, Alert, LinearProgress, Breadcrumbs, Divider, Paper/Card, Drawer, Skeleton, CircularProgress, Avatar, Badge.

Theme-level behaviour you get for free:

| Component | Variants / sizes | Notes |
|---|---|---|
| Button | `contained` (primary action) · `outlined` · `text`; sizes small 28 / medium 36 / large 44; colours `primary`, `inherit` (neutral), `error`, **`ai`** | `color="ai"` only for AI actions ("Ask AI", "Generate", "Suggest plan"). Neutral outlined = `variant="outlined" color="inherit"` (3:1 border). Loading = `startIcon={<CircularProgress size={18} color="inherit" />}` + `disabled` (see LoginPage). |
| IconButton | sizes small/medium/large | Always `aria-label`; wrap in `Tooltip` if the icon is not self-evident. |
| TextField | outlined only | Control border = `border.interactive`; focus = 2px primary; error = red + helper text. |
| Dialog | `maxWidth` xs/sm/md | Raised surface, radius xl. Titles via `DialogTitle`. Use `ConfirmDialog` for confirmations. |
| Chip | filled/outlined, `size="small"` 22px | Colours include `ai`. |
| Alert | `severity` success/error/warning/info | Tinted background + coloured icon; text stays `text.primary`. |
| LinearProgress | 8px, pill, track `border.strong` | Sprint progress (SPR-4). |
| Tabs | 40px, no uppercase, 2px indicator | |

**Hover/active/disabled/focus** follow MUI defaults tuned by `action.*` tokens; focus ring as in §5.

### 8.2 Shared components (`src/components/`)
| Component | Props | Use |
|---|---|---|
| `ThemeToggle` | none | Dark/light switch. Place in the top bar or user menu (Day 2 `AppShell`). |
| `EmptyState` | `title`, `description?`, `icon?`, `action?` | Every list/board with no data (NFR-2). |
| `ErrorState` | `message`, `title?`, `onRetry?` | Inline section/panel error with "Try again" (AI-5). Whole page → `FullPageError`. |
| `ConfirmDialog` | `open`, `title`, `description`, `confirmLabel?`, `destructive?`, `loading?`, `onConfirm`, `onClose` | Destructive actions (NFR-3). Destructive → focus starts on Cancel. |
| `AppSnackbarProvider` | `children` | Mounted in `main.tsx`. Toast from anywhere: `useSnackbar().enqueueSnackbar("Saved", { variant: "success" })`. Icon + accent bar per variant. |
| `FullPageLoader`, `FullPageError`, `NotFoundPage` | (existing) | Unchanged; they pick up the theme automatically. |
| `PageContainer` | `children` | Standard page padding + max width (`layout.pageMaxWidth`) inside the app shell. |
| `PointsBadge` (`features/todos`) | `points: StoryPoints \| null` | Story points pill: "5 pts", "1 pt", or "–" when not estimated. Rows (Day 3), board cards (Day 5). |
| `BacklogSection` (`features/backlog`) | `title`, `summary`, `actions?`, `children` | Collapsible group of todo rows with a sunken header band (wireframe 04). Day 4 reuses it for planned sprints (`actions` = Edit / Start sprint). |
| `TopBarMeta` (`features/shell`) | `children` | Portals small metadata next to the page title in the top bar (e.g. backlog totals "18 todos · 42 pts"). Needs the `TopBarSlotContext` provided by `AppShell`. |

### 8.3 Domain visuals — contract (built in the feature days)
`PriorityBadge`, `TypeIcon`, `PointsSelect` are built in `features/todos` (plan Day 3), `SprintProgress` in `features/board`, etc. They must follow the contract:

```tsx
import { Box, Typography } from "@mui/material";
import { PRIORITY_ICON } from "../../design/todoVisuals";
import { PRIORITY_LABEL } from "../../lib/constants";

function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: `priority.${priority}` }}>
      <Icon fontSize="small" aria-hidden />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>{PRIORITY_LABEL[priority]}</Typography>
    </Box>
  );
}
```
Rule: marker colour on the icon only; the **label text uses `text.secondary`** (marker colours are only guaranteed 3:1, not 4.5:1).

### 8.4 Guidance the board and AI screens were built from
Board card: `Paper variant="outlined"` on `background.paper`, key in `mono` + `text.muted`, title `body1`, footer row with type icon, priority icon, points chip; hover = border → `border.interactive`; drag state = `shadow.md` + primary outline. Column: `sunken` surface, 288px wide. AI drawer: `Drawer` 400px, header with an `ai` badge ("Mock AI" when `mode === "mock"`), user messages on `tint.primary`, assistant messages on `background.paper` with a small `ai` marker. The board (`features/board`) and assistant (`features/ai`) follow it.

---

### 8.5 Drag and drop and planned sprints (built on Day 4)
Libraries: `@dnd-kit/core` + `@dnd-kit/sortable` (keyboard support built in). Only existing tokens are used; nothing here adds a colour.

| Piece | Rule |
|---|---|
| Drag handle | `IconButton size="small"` with `DragIndicator`, colour `text.muted`, **first** control of a row, `aria-label="Drag KAN-12"`. Only the handle starts a drag; the rest of the row still opens the details. |
| Row while dragged | The row stays in the list as a placeholder at `opacity 0.4`. |
| Floating copy (`DragOverlay`) | `Paper elevation={4}` (shadow `md`), `1px` `primary.main` border, same cells as the row (`TodoRowCells`). |
| Drop target | A list that holds a todo from another list gets an inset 2px `primary.main` ring (`cssVar.primary`), so it needs no layout shift. Empty lists are drop targets too and say how to fill them. |
| Disabled | While backlog filters are active the handle is a disabled `IconButton` (tooltip with the reason) and an `Alert severity="info"` explains why and offers "Clear filters" (BL-6). |
| Non-drag alternative | Every row's actions menu starts with "Move to top / bottom", then "Move to backlog" and "Move to <sprint>" (BL-5, BL-7). Moves are confirmed with a toast. |
| Failed move | The cache is rolled back and an `error` toast names the todo and the server message. |

Planned sprint section = `BacklogSection` with title `"<name> (planned)"`, summary `"Nov 3 – Nov 16 · 3 todos · 13 pts"` and actions `Edit` (outlined, inherit) and `Start sprint` (contained). When another sprint is active, `Start sprint` is disabled, its wrapper is focusable and carries a tooltip, and one `Alert severity="info"` above the sections explains why.

## 9. Responsive behaviour (NFR-4)

Breakpoints (`tokens.breakpoints`): xs 0 · sm 600 · **md 768 (tablet)** · **lg 1024 (desktop)** · xl 1440.
- ≥ lg: sidebar expanded (248), AI drawer docked (400) pushes/overlays content.
- md–lg (768–1023): sidebar collapses to icon rail (64) or a temporary drawer; AI drawer overlays; board scrolls horizontally (columns keep 288px).
- < md: usable but not a target; dialogs go full-width (`fullScreen` via `useMediaQuery(theme.breakpoints.down("sm"))`).
Tailwind breakpoints are set to the same numbers (see §10).

---

## 10. Tailwind v4 integration — rules

- `style.css` maps tokens into `@theme inline`, so utilities point at the same CSS variables: `bg-app`, `bg-surface`, `bg-raised`, `bg-sunken`, `text-content`, `text-content-secondary`, `text-content-muted`, `border-divider`, `border-border-interactive`, `bg-primary`, `text-ai-text`, `bg-tint-*`, `text-status-*`, `text-priority-*`, `text-type-*`, `rounded-lg`, `shadow-md`, `w-sidebar`, `h-topbar`, `w-board-column`, `w-assistant`, `font-mono`, `ease-out`.
- **Use Tailwind** for layout/spacing of plain elements (`div`, `section`): `flex`, `grid`, `gap-*`, `w-board-column`.
- **Use MUI `sx`/props** to style MUI components. Emotion styles are un-layered and beat Tailwind's layered utilities, so `className="p-4"` on a MUI component can silently lose.
- Never hard-code a colour in a Tailwind class (`bg-[#fff]`, `text-red-500`). The default Tailwind palette must not be used.
- `--breakpoint-*` in `style.css` must equal `tokens.breakpoints` (CSS media queries cannot read variables).
- `dark:` follows `[data-theme="dark"]`; because tokens already switch, you should rarely need it.

---

## 11. Naming conventions
- Components: `PascalCase.tsx`, one exported component per file; design-system pieces in `src/components/`, feature-specific in `src/features/<feature>/`.
- Tokens: palette groups are camelCase singular nouns; enum-keyed groups reuse the API value exactly (`status.in_progress`).
- CSS variables: MUI `--mui-palette-<path>`; ours `--kb-<group>-<name>`; Tailwind colours are role names (`content`, `surface`, `raised`), never hues.
- Props: `variant`, `size`, `color` follow MUI; booleans are adjectives (`destructive`, `loading`).
- Labels/text: English, sentence case, from `lib/constants.ts` for enums (NFR-9).

## 12. Composition and reuse
1. Need a control? Use the MUI component with theme defaults. Don't wrap it unless you add behaviour (as `ConfirmDialog` does).
2. Need a variation used ≥ 2 times? Add it as a theme `variants` entry in `lib/theme.ts`, not repeated `sx`.
3. Need a new colour? Add a token (both schemes), re-run the audit, document it here.
4. Compose pages from `Stack`/`Box` (MUI) or flex/grid (Tailwind) + the shared components above.

## 13. Governance — rules for future UI work
Before creating or changing UI: (1) read the relevant requirement IDs, (2) read this file, (3) check `src/components/` and the theme for an existing solution, (4) reuse tokens and variants.
- No raw hex/rgb, px radii or durations outside `tokens.ts`.
- No `mode === "dark"` branches in components.
- No new UI library or component duplicating an MUI/themed one without recording the reason here.
- Every new view ships loading, empty and error states (NFR-2) and works at 1024 / 768 (NFR-4).
- Changing a token or shared component = update code **and** this document in the same commit, and re-run the contrast audit for colour changes.

## 14. Known limitations
- Undoable deletes are *staged*: the `DELETE` is sent when the toast closes without "Undo" (or on logout / tab close, best effort). There is no server-side restore. See `lib/pendingDeletes.ts`.
- Not verified without a browser: `colorSchemeSelector: "data-theme"` generating `[data-theme="light"]` selectors on MUI v9.5 (see README "Verify after pulling"), rendered hover/focus/selected colour pairings, forced-colours mode, screen-reader behaviour, focus-not-obscured (2.4.11) and target sizes (2.5.8). Run axe or Lighthouse on both themes.
- Fonts: DM Sans loads from Google Fonts (existing behaviour); mono uses system fonts.
