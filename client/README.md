# Kanbot client

React 19 + TypeScript (strict) + Vite. Backend: `kanbot/server` (not modified).

> This README currently documents the **UI library and design choices** (implementation plan Day 1). Setup, requirement status, known issues and enhancements are added on Day 7.

## UI library and design direction

| Concern | Choice | Why |
|---|---|---|
| Components | **MUI v9** | Accessible dialogs/menus/tabs/inputs out of the box (NFR-5), already installed; we theme it rather than rebuild it. |
| Toasts | **notistack**, themed | Queue + auto-hide for NFR-3 feedback. |
| Layout utilities | **Tailwind v4**, tokens shared with MUI | One set of tokens for both; used for plain-element layout only. |
| Icons | `@mui/icons-material` | Same family as the components. |
| Colours | Indigo + green from the provided logo; amber reserved for AI | Matches the brand; amber makes AI features recognisable. |
| Theme | **Dark by default**, full light theme, toggle remembered | Dark mode is an optional enhancement (requirements §9). |
| Font | DM Sans (+ system monospace for todo keys) | Readable at dense sizes, no extra font to load. |

Everything (tokens, themes, components, rules, contrast audit, known limitations) is documented in **[design-system.md](./design-system.md)** — the single source of truth for UI decisions.

## Verify after pulling

```bash
npm install
npm run check:contrast   # colour tokens, WCAG 2.2 AA
npm run lint
npm run build
npm run dev              # check both themes: toggle with <ThemeToggle/>, or set localStorage "mui-mode" to "light"/"dark" and reload
```

Check in the browser that `<html>` gets `data-theme="dark"` / `"light"` and that the colours switch; the theme relies on MUI's `colorSchemeSelector: "data-theme"`.
