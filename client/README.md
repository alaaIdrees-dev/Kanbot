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
| Theme | **Dark by default**, full light theme, toggle remembered | Dark mode is an optional enhancement (requirements §9). |
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
- Optimistic updates with rollback + toast for backlog/sprint moves, board moves and todo deletes.
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

Dark/light theme with a remembered toggle · contrast audit script · skip-to-content link · screen-reader announcements for drag and drop · "Move to top / bottom / sprint" menus as the non-drag path · touch drag with press-and-hold · route-level code splitting · project search · "hidden by the current filters" hint after quick-create.

## Known issues

- **Lint and build were not run in the Day 7 environment** (no network, so no `node_modules`). Static checks that *were* run: no unused imports, no unresolved relative imports, no `any`, no `console`, every external import is declared in `package.json`, and the colour audit passes. Run `npm run lint && npm run build` first and fix what they report.
- Not tested in a browser: both themes, 1024 / 768 px layouts, keyboard-only flow, real AI provider (502 / 429 paths).
- Verify that `colorSchemeSelector: "data-theme"` sets `data-theme="dark" | "light"` on `<html>` and switches the colours (see below).
- `ReactQueryDevtools` is mounted in `main.tsx`; it is stripped from production builds.
- Dates use the viewer's time zone for timestamps and no time zone for date-only values (sprint and due dates).

## Verify after pulling

```bash
npm install
npm run check:contrast
npm run lint
npm run build
npm run dev   # toggle the theme, or set localStorage "mui-mode" to "light"/"dark" and reload
```

Then run the QA checklist in plan §6 and record the demo: register → create project → generate todos with AI → plan sprint with AI → start sprint → move cards → complete sprint → AI summary.
