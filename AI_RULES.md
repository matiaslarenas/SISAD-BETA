# AI Rules

## Tech stack

- React 18 with JSX for the client UI.
- Vite 5 and `@vitejs/plugin-react` for local development and production builds.
- React Router (`react-router-dom`) for client-side navigation; route declarations live in `src/App.jsx`.
- Plain CSS in `src/styles.css` for styling, responsive layouts, and shared design tokens.
- React Context in `src/context/` for shared application state.
- Browser `localStorage`, accessed through `src/utils/storage.js`, for client-side persistence.
- Recharts for dashboard charts and data visualizations.
- Sonner for toast notifications and user feedback.
- Lucide React for interface icons.
- Node's built-in test runner (`node --test`) for automated tests.

## Library and implementation rules

- Keep all application source code under `src/`; place route-level screens in `src/pages/`, reusable UI in `src/components/`, shared state in `src/context/`, and pure business logic in `src/utils/`.
- Always log significant changes in `CHANGELOG.md` after implementing modifications. Include the implementation date in each change entry, and document additions, changes, and fixes with concise bullet points, including the affected files and key behavior.
- Keep all routes in `src/App.jsx` and use React Router components for navigation. Do not implement navigation with manual URL changes or separate HTML pages.
- Use React function components and hooks. Use the existing Context provider for shared domain state instead of adding another state-management library.
- Use plain CSS classes and the existing CSS custom properties in `src/styles.css`. Preserve the current visual language and do not introduce Tailwind, CSS-in-JS, or another styling system unless explicitly requested.
- Use Lucide React for standard interface icons. Do not add emoji, hand-built SVG icons, or a second icon library when Lucide provides a suitable icon.
- Use Recharts for charts and reports. Do not manually draw charts with SVG or canvas unless Recharts cannot support the required behavior.
- Use Sonner for transient success, warning, and error notifications. Keep validation errors near the relevant field when the user must act on them.
- Access persisted data only through `src/utils/storage.js` and the shared application state. Do not read from or write to `localStorage` directly inside page or presentation components.
- Keep inventory movements as the source of truth for stock. Purchasing and sales flows must create movements rather than directly mutating displayed stock totals.
- Keep recipe costs derived from current inventory ingredient costs; never store or accept recipe cost as an independently editable value.
- Prefer existing dependencies and small focused modules. Add a new library only when the current stack cannot reasonably implement the requested behavior.
- Validate user input and external data at system boundaries, keep calculations in pure utility functions, and avoid duplicating business rules across components.
