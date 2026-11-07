# Kanbot client

React 19 + TypeScript (strict) + Vite. Backend: `kanbot/server` (not modified). Requirements: [`docs/REQUIREMENTS.en.md`](../docs/REQUIREMENTS.en.md), plan: [`docs/IMPLEMENTATION-PLAN.en.md`](../docs/IMPLEMENTATION-PLAN.en.md).

## Run it

```bash
# 1. backend (separate terminal) — the AI runs in mock mode with the default .env
cd kanbot/server
npm install && cp .env.example .env && npm run seed && npm run dev   # http://localhost:4000/api/health

# 2. client
cd kanbot/client
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:4000/api
npm run dev                   # http://localhost:5173
```

Demo account after `npm run seed`: `demo@kanbot.dev` / `password123`.

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `preview` | Vite dev server / `tsc -b && vite build` / serve the build |
| `npm run lint` | ESLint (typescript-eslint, react-hooks, react-refresh) |
| `npm run format` | Prettier over `src` |
| `npm run check:contrast` | WCAG 2.2 AA audit of the colour tokens (Node ≥ 22.6; 238 pairs, 0 failing) |

## UI library and design direction

| Concern | Choice | Why |
|---|---|---|
| Components | **MUI v9** | Accessible dialogs/menus/tabs/inputs out of the box (NFR-5); we theme it instead of rebuilding it. |
| Toasts | **notistack**, themed | Queue + auto-hide for NFR-3 feedback. |
| Layout utilities | **Tailwind v4**, tokens shared with MUI | One set of tokens for both; used for plain-element layout only. |
| Icons | `@mui/icons-material` | Same family as the components. |
| Colours | Indigo + green from the provided logo; amber reserved for AI | Matches the brand; amber makes AI features recognisable. |
| Theme | Light, dark and **system** (follows the OS), choice remembered | Dark mode is an optional enhancement (requirements §9); see Enhancements below. |
| Font | DM Sans (+ system monospace for todo keys) | Readable at dense sizes, no extra font to load. |

Everything (tokens, themes, components, rules, contrast audit, known limitations) is in **[design-system.md](./design-system.md)**, the single source of truth for UI decisions.

## Architecture (plan §3)

```
src/
├── api/client.ts          axios wrapper: base URL, token, ApiError, 401 handling, NETWORK_ERROR
├── types/api.ts           copied from the server, never edited
├── features/<feature>/    api/ (one module per resource), hooks/ (TanStack Query), components/, pages/, store/
│   auth · projects · shell · backlog · board · sprints · todos · ai
├── components/            design-system pieces (EmptyState, ErrorState, ConfirmDialog, …)
├── design/ + lib/theme.ts tokens → MUI theme → CSS variables → Tailwind
└── lib/                   query keys, date/plural helpers, pure list/board move logic
```

- Server data lives in TanStack Query. Query keys are in `lib/queryKeys.ts`; mutations invalidate through `invalidateTodoData`.
- Optimistic updates with rollback + toast for backlog/sprint moves and board moves; deletes are staged so they can be undone (see Enhancements).
- Pages are code-split per route; the Markdown renderer and the two AI dialogs load on first use.
- Only the JWT is stored client-side (`localStorage` key `kanbot.token`, in-memory fallback). It is never logged. AI Markdown is rendered with `skipHtml` and no `rehype-raw`.

## Requirements status

"Implemented" means the code for the acceptance criteria is in place and was reviewed against them. **It has not been run against the server in an automated way**; see *Known issues* and run the QA checklist (plan §6) before the demo.

| Area | IDs | Status |
|---|---|---|
| Authentication | AUTH-1…6 | Implemented |
| Projects | PRJ-1…5 | Implemented (plus a client-side project search) |
| Backlog and todos | BL-1…7 | Implemented, including drag and drop between backlog and planned sprints |
| Sprints and board | SPR-1…7 | Implemented |
| AI assistant | AI-1…5 | Implemented (mock mode is the tested path) |
| Non-functional | NFR-1…9 | Implemented; NFR-1 (lint/build) still has to be confirmed by running them, see below |

## Deviations from the plan

- **HTTP client:** `axios` instead of `fetch`; same contract (`request<T>`, `ApiError`, 401 handler, `NETWORK_ERROR`).
- **Planning store:** the backlog page keeps a small zustand store (`features/backlog/store`) that *mirrors* the query cache for the live drag preview. It is fed only by cache events (`planningSync.ts`) and never written to by components as a source of truth; moves still go through TanStack mutations. This is a deliberate exception to "no copies of server data in component state".
- **UI state in zustand:** the AI drawer/chat, board drag preview and dialog state use small zustand stores (UI-only state, plan §3.4).

## Enhancements (requirements §9)

### UX & polish

| Feature | What it does | Where |
|---|---|---|
| **Dark mode** | Light / Dark / System menu in the top bar. The first visit follows the OS (`prefers-color-scheme`) and keeps following it live while on "System"; an explicit choice is saved in `localStorage["mui-mode"]`. `index.html` applies it before first paint (no flash). The palette has the same options. | `components/ThemeToggle.tsx`, `index.html`, `main.tsx` |
| **Keyboard shortcuts** | Keyboard only, no on-screen hints and no help dialog. `c` create todo (full dialog, with "Create another") · `/` focus search (from a page without one it goes to the backlog first) · `g b` board (also `g l` backlog, `g s` sprints, `g p` projects) · `Ctrl/⌘+K` command palette · `Ctrl/⌘+Z` undo while a toast shows. Single keys are ignored while typing, with a dialog or menu open, or with Ctrl/Alt/⌘ held. Letters also work on non-Latin layouts (Arabic…) through the physical key. | `features/shell/useGlobalShortcuts.ts`, `features/todos/components/CreateTodoDialog.tsx` |
| **Command palette** | `Ctrl/⌘+K` (keyboard only). Jump to a project (keeps the current section), search todos of the current project (same server search as the backlog; opens the details on the page where the todo lives: board, backlog or sprint history), go to Backlog / Board / Sprints / Projects, and run actions: create todo, generate todos / plan sprint / ask AI, theme, log out. Arrow keys, Enter, Esc; combobox/listbox ARIA. | `features/shell/palette/CommandPalette.tsx` |
| **Undo toast** | After a **delete** ("KAN-8 “…” deleted · Undo") and after a **move** (drag, menu, board; "KAN-3 moved to In Progress · Undo"). Undo restores the todo to its exact old place and status. Works from the toast button or `Ctrl/⌘+Z`. | `hooks/useUndoToast.tsx`, `lib/pendingDeletes.ts`, `features/backlog/hooks/useBacklogDnd.ts`, `features/board/hooks/useBoardDnd.ts` |
| **Animations** | Dialogs and the palette rise and settle on open; the drag preview lifts and the board's glides into its slot; the todo that just landed flashes once; progress bars grow in and ease to each new value (green at 100%). All of it is off under `prefers-reduced-motion`. | `style.css`, `lib/theme.ts`, `lib/motionStore.ts` |

How undo works, because the API has no "restore": a **move** is undone by sending the inverse move (the old list, status and position are recorded when the move is made). A **delete** is *staged*: the todo disappears from every list and board at once, but `DELETE /todos/:id` is only sent when the toast closes without "Undo". So undo is exact (same key, same position) and nothing is re-created. A refetch during the window can't bring the todo back (a cache guard strips it), and logging out or closing/reloading the tab sends the pending delete first (`fetch` with `keepalive` on page hide). The delete confirmation dialog stays (NFR-3).

### Earlier enhancements

Contrast audit script · skip-to-content link · screen-reader announcements for drag and drop · "Move to top / bottom / sprint" menus as the non-drag path · touch drag with press-and-hold · route-level code splitting · project search · "hidden by the current filters" hint after quick-create.

## Deployment

| Part | Host | URL |
|---|---|---|
| **Frontend** (this folder) | **Netlify** | transcendent-centaur-9582ed.netlify.app *(placeholder: replace with your site URL)* |
| **Backend** (`kanbot/server`, unchanged) | **Render** (Web Service) | https://kanbot-e6mb.onrender.com/api *(placeholder: replace with your service URL)* |

**Frontend on Netlify.** `netlify.toml` already holds the build (`npm run build`, publish `dist`, Node 22) and the single-page-app rewrite (`/* → /index.html`, so reloading `/projects/:id/board` works). Connect the repo with base directory `client`, then set one environment variable and deploy:

```
VITE_API_URL=https://kanbot-e6mb.onrender.com/api
```

Vite reads it at build time, so redeploy after changing it.

**Backend on Render.** Create a Web Service from `server/` (build `npm install` plus its build step, start as in `server/package.json`) and copy the variables from `server/.env.example` (JWT secret, AI settings). Make sure the server allows the Netlify origin (CORS). Check `https://<your-service>.onrender.com/api/health`. Notes: on Render's free plan the service sleeps when idle (the first request after a pause is slow), and the JSON database in `server/data/db.json` lives on an ephemeral disk, so it resets on redeploy and you have to run `npm run seed` again for the demo account.

> These two URLs are placeholders: the app has not been deployed from this repository yet. Replace them once the sites exist.

## Known issues

- `npm run lint` and `npm run build` pass. Prettier is not enforced: only the files added with the enhancements are Prettier-formatted.
- The enhancements above were exercised in Chromium (59 scripted checks) against a stand-in for the API built from the documented contract, not against the real `kanbot/server`. Not tested in a browser: 768 px layout, real AI provider (502 / 429 paths), Firefox/Safari.
- `ReactQueryDevtools` is mounted in `main.tsx`; it is stripped from production builds.
- Dates use the viewer's time zone for timestamps and no time zone for date-only values (sprint and due dates).

## Verify after pulling

```bash
npm install
npm run check:contrast
npm run lint
npm run build
npm run dev   # toggle the theme (Light / Dark / System), try Ctrl+K
```

Then run the QA checklist in plan §6 and record the demo: register → create project → generate todos with AI → plan sprint with AI → start sprint → move cards → complete sprint → AI summary.
