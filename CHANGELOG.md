# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Impresión de tickets en impresora térmica** (`server/printer.js`,
  `POST /api/print-ticket`) — genera el ticket en ESC/POS y lo envía a
  la impresora USB ya instalada en Windows a través de un recurso
  compartido local (`copy /b`), sin agregar dependencias externas al
  servidor. Requiere compartir la impresora en Windows una vez (ver
  comentario al inicio de `server/printer.js`). Dos botones separados en
  el ticket actual de `POS.jsx`: "Imprimir comanda (cocina)" —ítem,
  cantidad, nota del pedido (si existe) y hora, sin precios— e "Imprimir
  cuenta (cliente)" —detalle de productos con precio, total y sugerencia
  de propina del 10% más el total incluyéndola—. El botón "Reimprimir"
  del historial de ventas reimprime la cuenta del cliente.
- **Servidor local** (`server/index.js`, `server/persistence.js`) — sin
  dependencias externas (solo módulos nativos de Node). Corre en el
  computador de escritorio del restaurante y es la única fuente de
  verdad del estado; tablet y celulares se conectan por la red WiFi
  local y comparten el mismo inventario/ventas en tiempo casi real
  (polling cada ~2s). Ver `docs/GUIA_DE_DEPLOYMENT.md`.
- `src/state/rootReducer.js` — reducer de acciones compartido entre
  cliente y servidor (antes vivía solo dentro de `AppDataContext.jsx`).
- Test de regresión en `tests/recipeCalculator.test.js` para conversión
  cruzada de unidades masa↔volumen en `normalizeQuantity`.
- `.claude/skills/` — tres skills de proyecto (`meson-arquitectura`,
  `meson-reglas-negocio`, `meson-testing`) que indexan hacia `docs/`
  para agilizar futuras sesiones de desarrollo.
- Scripts de npm: `server`, `server:dev`, `start` (build + servidor en
  un solo comando, uso real en el desktop).
- `scripts/reset-to-empty.js` y `scripts/reset-quantities-and-history.js`
  — utilidades de un solo uso para limpiar datos de demostración antes
  de empezar a operar con datos reales (el segundo mantiene el catálogo
  de productos/recetas/proveedores y solo vacía cantidades e historial).
- `.claude/skills/meson-data-reset/` — quinto skill de proyecto, con el
  alcance exacto de los scripts de reset y la lección aprendida de
  confirmar explícitamente qué se mantiene y qué se borra antes de
  correr cualquier operación destructiva sobre los datos.

### Changed
- `AppDataContext.jsx`: ya no mantiene el estado con `useReducer` +
  `localStorage` local — consulta y despacha acciones contra el
  servidor local (`/api/state`, `/api/dispatch`).
- `vite.config.js`: proxy de `/api` hacia el servidor Node durante
  desarrollo (`npm run dev` + `npm run server:dev`).
- Nombre y ubicación del restaurante corregidos en los 6 documentos
  conceptuales (`docs/*.md`): "El Mesón de Los Laureles", localidad de
  Los Laureles, comuna de Cunco, Región de La Araucanía.
- `docs/ARCHITECTURE.md`, `docs/GUIA_DE_DEPLOYMENT.md`,
  `docs/GUIA_DE_DESARROLLO.md`, `docs/GUIA_DE_USUARIO.md`,
  `docs/MODELO_DE_DATOS.md`, `docs/ESTRATEGIA_DE_PRUEBAS.md`:
  actualizados para reflejar la arquitectura cliente-servidor.
- `src/utils/storage.js`: marcado como no usado en producción (queda
  como referencia histórica de la versión 100% client-side).

### Fixed
- **Costos de recetas gravemente inflados** (Limonada, Café Helado):
  `normalizeQuantity` en `recipeCalculator.js` no convertía entre
  familias de unidades distintas (masa↔volumen) cuando la receta y el
  producto comprado usaban unidades de tipos diferentes (ej. Limón
  Sutil comprado en `kg` pero medido en la receta en `ml`). Se agregó
  una conversión de respaldo con densidad 1:1. Café Helado: de
  $114.320 a $433,5. Limonada: de $152.044 a $196.
- **Bug de rutas en Windows** (`server/persistence.js`): construir
  rutas de archivo con `new URL(...).pathname` directamente producía
  rutas corruptas en Windows (`C:\C:\Users\...`). Corregido usando
  `fileURLToPath`.

### Added
- Conceptual documentation in `docs/`:
  - `MODELO_DE_DATOS.md` — entities, attributes, relationships, and derived data model
  - `REGLAS_DE_NEGOCIO.md` — business rules with concrete examples (stock calculation, recipe costing, POS, purchases, waste, alerts, KPIs)
  - `GUIA_DE_USUARIO.md` — practical user manual for restaurant staff (POS, inventory, purchases, recipes, reports, backups)
  - `GUIA_DE_DESARROLLO.md` — developer guide (setup, architecture, coding standards, testing, debugging, PR checklist)
  - `ESTRATEGIA_DE_PRUEBAS.md` — testing strategy (types of tests, coverage, invariants, best practices)
  - `GUIA_DE_DEPLOYMENT.md` — deployment guide (build, hosting, domain, updates, security, disaster recovery)
- TypeScript setup:
  - Added `typescript` as a dev dependency and `tsconfig.json` with lenient settings (`allowJs: true`, `strict: false`)
  - Created `src/types/inventory.ts` with TypeScript interfaces (`Product`, `OperationalAlert`, `PurchaseOrder`, etc.)
- Mobile & Tablet UI:
  - Collapsible sidebar with hamburger menu for screen sizes ≤1024px
  - `sidebar-overlay` and `menu-toggle` controls for overlay behavior

### Changed
- Converted components to TypeScript:
  - `src/components/KpiCard.tsx`, `AlertsPanel.tsx`, `InventoryTable.tsx`, `PendingOrders.tsx`, `src/pages/Overview.tsx`
- Enhanced UI Components:
  - `InventoryTable`: Added search functionality, pagination, restock button, and dynamic column count
  - `KpiCard`: Added status-based styling and trend badges
  - `AlertsPanel`: Added sticky filter header and filter counters
  - `Overview`: Dynamic KPI status calculation and restock action integration
  - `Purchases`: Support for product pre-selection via URL query parameters
- Recipe Costing Engine:
  - Standardized recipe cost calculation using `calculateRecipeCost` from `recipeCalculator.js` to handle full unit conversions (including `gr` ↔ `un` via average weight)

### Fixed
- **Unit Conversion Discrepancy**: Recipe quantities in `gr`/`ml`/`cc` are now properly converted to inventory base units (`kg`/`lt`/`un`) before multiplying by `costPerUnit`, preventing inflated dish costs
- Added `getConvertedQuantity` helper function in `src/state/appState.js` for simplified unit conversion (`gr` → `kg`, `ml` → `lt`)
- Applied unit conversion in `buildSaleStockMovements` for direct product sales to ensure correct purchase unit deductions
- Enhanced `normalizeSaleItem` to preserve and propagate the `unit` field for accurate inventory movement tracking
- Fixed navigation menu layout on mobile/tablet to render items vertically when the sidebar is open

### Fixed

* **Recipe Unit Normalization & Cost Calculation Engine**:
* Robusted unit standardization in `normalizeUnitToken` to correctly map all variations, plurals, and forms of units (e.g., `gramos`, `gr`, `g`, `kilos`, `kg`, `litros`, `lt`, `ml`, `cc`, `unidades`).
* Fixed an critical issue where recipe ingredients in grams (`gr`) or mililiters (`ml`) caused inflated dish costs when inventory items lacked an explicit `purchaseUnit` or default unit.
* Standardized `normalizeQuantity` to apply defensive fallback conversions ($1.000\text{ gr} \to 1\text{ kg}$ and $1.000\text{ ml} \to 1\text{ lt}$) across all calculations.
* Streamlined `calculateRecipeCost` and `calculateRecipeMaxPortions` to delegate all unit conversions consistently to `normalizeQuantity`, resolving edge cases in cost estimation and maximum portion production.

---

## [1.0.0] - Initial Release

### Added
- Basic inventory management dashboard
- KPI cards for metrics display
- Alerts panel for operational notifications
- Inventory table with CRUD operations
- Purchase order management
- Recipe management
- Supplier management
- Reports and analytics
- POS (Point of Sale) system
- Data import/export functionality
- Local storage persistence