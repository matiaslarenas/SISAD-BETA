# AI Rules

> Main entry point for AI tools: `CLAUDE.md`. Domain conventions: `.claude/skills/meson-*`.

## Tech stack

- React 18 with JSX (and a few `.tsx` files, e.g. `src/pages/Overview.tsx`) for the client UI.
- Vite 5 and `@vitejs/plugin-react` for local development and production builds.
- React Router (`react-router-dom`) for client-side navigation; route declarations live in `src/App.jsx`.
- Plain CSS in `src/styles.css` for styling, responsive layouts, and shared design tokens.
- React Context in `src/context/` for shared application state.
- Local Node server (`server/index.js`, `server/persistence.js`, `server/printer.js`) as the single source of truth, using only Node built-in modules. State is persisted in `server/data/app-state.json`; the client reads `GET /api/state` and sends actions to `POST /api/dispatch`. `src/utils/storage.js` (localStorage) is legacy and unused.
- Recharts for dashboard charts and data visualizations.
- Sonner for toast notifications and user feedback.
- Lucide React for interface icons.
- Node's built-in test runner (`node --test`) for automated tests.

## Library and implementation rules

- Keep all client source code under `src/` and the local server under `server/`; place route-level screens in `src/pages/`, reusable UI in `src/components/`, shared state in `src/context/`, and pure business logic in `src/utils/`.
- In the same PR, update whatever the change makes inaccurate: `docs/`, `.claude/skills/meson-*`, `CLAUDE.md`. Always log significant changes in `CHANGELOG.md` after implementing modifications. Include the implementation date in each change entry, and document additions, changes, and fixes with concise bullet points, including the affected files and key behavior.
- Keep all routes in `src/App.jsx` and use React Router components for navigation. Do not implement navigation with manual URL changes or separate HTML pages.
- Use React function components and hooks. Use the existing Context provider for shared domain state instead of adding another state-management library.
- Use plain CSS classes and the existing CSS custom properties in `src/styles.css`. Preserve the current visual language and do not introduce Tailwind, CSS-in-JS, or another styling system unless explicitly requested.
- Use Lucide React for standard interface icons. Do not add emoji, hand-built SVG icons, or a second icon library when Lucide provides a suitable icon.
- Use Recharts for charts and reports. Do not manually draw charts with SVG or canvas unless Recharts cannot support the required behavior.
- Use Sonner for transient success, warning, and error notifications. Keep validation errors near the relevant field when the user must act on them.
- Access persisted data only through the shared application state (`AppDataContext`), which talks to the local server. Do not use `localStorage` or `src/utils/storage.js` for domain data. Every new action must be handled in `src/state/rootReducer.js` so the server can apply it.
- Do not add third-party dependencies to `server/` unless explicitly requested.
- Keep inventory movements as the source of truth for stock. Purchasing and sales flows must create movements rather than directly mutating displayed stock totals.
- Keep recipe costs derived from current inventory ingredient costs; never store or accept recipe cost as an independently editable value.
- Prefer existing dependencies and small focused modules. Add a new library only when the current stack cannot reasonably implement the requested behavior.
- Validate user input and external data at system boundaries, keep calculations in pure utility functions, and avoid duplicating business rules across components.
