# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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