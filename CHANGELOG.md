# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- 2026-10-10 — `POST /api/dispatch` guarda el estado antes de publicarlo
  (#31). Antes, si fallaba la escritura en disco, `GET /api/state` ya
  mostraba el cambio y este se perdía al reiniciar. Lógica en
  `server/stateStore.js`, con tests en `tests/persistence.test.js`.

### Changed
- 2026-10-10 — Flujo de trabajo v2 formalizado:
  - `CLAUDE.md`, sección "Flujo de trabajo": paquete de aprobación con
    registro en el issue de la tarea, cuatro puertas de Matias, tres capas
    de información (#17 pasa a índice breve), responsable único y revisor
    previsto, riesgo bajo/medio/alto con revisión y validación
    proporcionales, línea de dependencia y mejora ligera. Sale el reparto
    fijo "sin interfaz / con interfaz" y el `npm test` universal.
  - `.github/copilot-instructions.md`: rol de auditor y revisor de Copilot;
    grill-me como herramienta opcional.
  - `.github/pull_request_template.md`: issue de la tarea, riesgo, línea de
    dependencia y evidencia de UI.
  - `docs/GUIA_DE_DESARROLLO.md` §9.1 y `docs/ESTRATEGIA_DE_PRUEBAS.md`
    §6.1: remiten a la validación según el riesgo.
- 2026-10-10 — Documentación y archivos de contexto al día con `main`:
  - `CLAUDE.md` nuevo: entrada única para herramientas de IA (comandos,
    arquitectura, reglas no negociables).
  - `AI_RULES.md`: la persistencia es el servidor local, no `localStorage`.
  - `docs/*.md`: host = servidor local Linux; acciones del API,
    `StateFileError`, flujo de venta por tickets, aviso de stock, compra
    directa, proveedor habitual, tests y guía de usuario según la
    interfaz actual.
  - Skills `meson-backend`, `meson-testing` y `meson-data-reset` al día.
  - `README.md`: sección "Cómo ejecutar".
  - `docs/GUIA_DE_DEPLOYMENT.md` §2.6: pasos para limitar el puerto a los
    equipos autorizados con `ufw` y verificarlo desde un equipo no autorizado.
  - Comentarios de `server/index.js`, `server/persistence.js`,
    `src/main.jsx` y `src/context/AppDataContext.jsx`: el servidor ya no
    es "el computador de escritorio".

### Added
- 2026-10-10 — CI en GitHub Actions (`.github/workflows/ci.yml`): `npm ci`,
  `npm test` y `npm run build` en cada PR y en cada push a `main`.
- 2026-10-10 — `.github/pull_request_template.md` con la lista de
  verificación y `.github/copilot-instructions.md`, que apunta a
  `CLAUDE.md`.
- 2026-10-10 — `CLAUDE.md`: sección "Flujo de trabajo" con las reglas
  comunes de las sesiones de IA (tablero #17, una rama por tarea, autoría
  de commits, aprobación por plan, reparto y cierre con destinatario). La
  regla "no tocar docs" se reemplaza por "cada PR actualiza lo que su
  cambio vuelve incorrecto".

### Fixed
- 2026-10-10 — Textos para el usuario: `src/App.jsx` ya no pide revisar
  "el computador de escritorio" al perder la conexión, y los mensajes de
  `server/persistence.js` y `scripts/reset-quantities-and-history.js`
  nombran el botón real del Panel ("Respaldar JSON").

### Removed
- 2026-10-10 — `PROMPT_CHATBOT.md` (describía la versión previa al
  servidor), `repomix-output.xml` (volcado del código del 2026-09-13),
  `.impeccable/`, `.vscode/gemini-mcp/` y
  `src/restaurant-inventory-dashboard.code-workspace`. Se agregan a
  `.gitignore`.

## 2026-10-07

### Added
- **Id de venta asignado por el servidor** (#25, issue #10):
  `generateSaleId` en `src/state/appState.js` calcula `VTA-n` a partir del
  mayor id existente. El POS envía una `clientRequestId`
  (`createClientRequestId`) y `saveTicket` actualiza el ticket existente
  si la clave se repite, así un reintento no duplica la venta.
- **Protección del script de reset** (#22, issue #11):
  `scripts/reset-quantities-and-history.js` solo muestra el plan sin
  `--confirm`, aborta si hay un servidor escuchando o si falta
  `app-state.json`, y deja un respaldo verificado antes de guardar.
  Tests en `tests/resetQuantities.test.js`.

### Fixed
- **Mesa desactualizada en el POS** (#24, issue #21): si otro equipo cobra
  o anula la mesa abierta, `POS.jsx` la suelta, avisa y conserva lo
  ingresado (`getStaleTicketStatus`).
- **Archivo de estado dañado** (#16): `loadState()` en
  `server/persistence.js` lanza `StateFileError` sin modificar el archivo
  y `server/index.js` no arranca, en vez de partir desde la semilla y
  pisar los datos reales. Tests en `tests/persistence.test.js`.

## 2026-10-06

### Added
- **Aviso al vender sobre el stock** (#23, issue #15, opción 1): el POS
  pregunta "¿Agregar igual?" y deja continuar; el stock puede quedar
  negativo (`getTicketStockWarnings`).
- **Script para cargar la carta del #8 en una instalación en uso** (#14):
  `scripts/actualizar-carta-pr8.js` y `scripts/lib/cartaPr8.js`
  (`--aplicar`, con respaldo previo). Tests en
  `tests/actualizarCarta.test.js`.
- **Vista de carpetas por categoría en el POS** y ajustes del catálogo
  semilla (#8).
- **Registrar compra recibida** (#12): botón en Compras
  (`DirectPurchaseModal.jsx`) y acción `purchase/record-direct`
  (`recordDirectPurchase`), que crea y recibe la orden en un paso.
- Skill `meson-pos-items` y skills `meson-*` al día (#18).

### Fixed
- **Ventas confirmadas antes de que responda el servidor** (#6): el POS
  espera la respuesta de `dispatch` antes de mostrar la venta como hecha.
- **Reutilizar el id de una venta cerrada** (#7): `saveTicket` rechaza con
  `DomainError` el id de una venta cobrada o anulada, y el POS muestra el
  motivo.
- **Proveedor habitual sobrescrito al recibir** (#20, issue #13): recibir
  una compra ya no cambia el `supplier` del producto.
- **`defaultRecipes` indefinido** en `normalizeLoadedState` (#19).

## Antes de 2026-10-06 (sin fecha por entrada)

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
- `.claude/skills/` — tres skills de proyecto iniciales (`meson-arquitectura`,
  `meson-reglas-negocio`, `meson-testing`) que indexan hacia `docs/`
  para agilizar futuras sesiones de desarrollo.
- Scripts de npm: `server`, `server:dev`, `start` (build + servidor en
  un solo comando, uso real en el desktop).
- `scripts/reset-quantities-and-history.js` — utilidad de un solo uso
  para limpiar datos de demostración antes de empezar a operar con datos
  reales (mantiene el catálogo de productos/recetas/proveedores y solo
  vacía cantidades e historial). Se mencionaba también
  `scripts/reset-to-empty.js`, pero ese archivo nunca se versionó.
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