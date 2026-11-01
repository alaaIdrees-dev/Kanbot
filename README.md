<p align="center"><img src="design/logo/kanbot-logo.png" alt="Kanbot" width="360"></p>

# Kanbot

> **Your sprint board with an AI teammate.** A personal todo app built around agile sprints (backlog → sprint → board) with a simple AI assistant that writes todos, plans sprints and summarises them.

A **1-week frontend project**. The backend is done. You build the React app.

| Folder | Status | What it is |
|---|---|---|
| [`server/`](server/) | ✅ Complete | Express 5 + TypeScript API: auth (JWT), projects, backlog, sprints, board, AI assistant (mock or real LLM) |
| `client/` | 🛠 To build | React + TypeScript + Vite. **UI and design are your choice** |
| [`docs/`](docs/) | 📄 | Requirements and implementation plan, in English and Arabic |
| [`design/`](design/) | 🎨 | Low-fidelity wireframes (no visual design) + logo |

## Documents

| | English | العربية |
|---|---|---|
| Requirements | [REQUIREMENTS.en.md](docs/REQUIREMENTS.en.md) | [REQUIREMENTS.ar.md](docs/REQUIREMENTS.ar.md) |
| Implementation plan + API design | [IMPLEMENTATION-PLAN.en.md](docs/IMPLEMENTATION-PLAN.en.md) | [IMPLEMENTATION-PLAN.ar.md](docs/IMPLEMENTATION-PLAN.ar.md) |

API contract (all request and response types): [`server/src/types/api.ts`](server/src/types/api.ts)

## Quick start

```bash
cd server
npm install
cp .env.example .env   # AI runs in free mock mode until you add AI_API_KEY
npm run seed           # demo@kanbot.dev / password123
npm run dev            # → http://localhost:4000/api/health
```

Start the React + TypeScript client in a second terminal:

```bash
cd client
npm install
npm run dev            # → Vite development server
```

Then follow the [implementation plan](docs/IMPLEMENTATION-PLAN.en.md#5-day-by-day-plan) day by day.

## Design

- `design/wireframes/*.png`: 12 greyscale wireframes (flow + 11 screens). They show **content and layout only**. Colours, typography and components are up to you.
- `design/logo/`: icon and logo (SVG + PNG, light and dark). Use them, recolour them, or make your own.
- `design/kanbot.figcraft` (source) and `design/kanbot.fig` (experimental Figma export).
