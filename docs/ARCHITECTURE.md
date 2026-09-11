# Arquitectura — Sistema Restaurante Los Laureles

> Documento técnico de referencia para desarrolladores y agentes de código.
> Complementa a `PROMPT_CHATBOT.md` (documentación funcional orientada a IA
> conversacional) con un detalle estructural del código.

## 1. Visión general

SPA de React construida con Vite para la gestión operacional de un
restaurante familiar (Los Laureles, Cunco, Chile). Cubre el ciclo completo:

```
Proveedor
  ↓
Orden de Compra
  ↓
Recepción
  ↓
Inventario (derivado de movimientos)
  ↓
Recetas (y Sub-Recetas)
  ↓
Costeo
  ↓
POS (Venta)
  ↓
Mermas
  ↓
Alertas
  ↓
Reportes / Snapshots
  ↓
Exportación y Restauración (Backup)
```

### Principio arquitectónico central

**El inventario no es un número editable.** Se deriva matemáticamente de
`inventoryMovements` (compras, ventas, mermas, ajustes). Esto habilita
auditoría completa, reconstrucción de stock en cualquier punto del tiempo, y
elimina inconsistencias entre "lo que dice el sistema" y "lo que realmente
pasó".

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 18 (function components + hooks) |
| Build | Vite 5 |
| Ruteo | react-router-dom v7 |
| Estado global | React Context + `useReducer` (sin Redux/Zustand) |
| Persistencia | `localStorage` (versionado, con export/import JSON) |
| Gráficos | Recharts |
| Notificaciones UI | Sonner (toast) |
| Iconografía | lucide-react |
| Testing | `node:test` + `node:assert/strict` (sin Jest/Vitest) |
| Estilos | CSS plano (`src/styles.css`), sin framework de UI |

Comandos:
```
npm run dev      # servidor de desarrollo
npm run build    # build de producción (vite build)
npm run preview  # sirve el build de producción
npm test         # corre toda la suite (node --test)
```

## 3. Estado global

```
localStorage
    ↓ loadAppState()
storage.js
    ↓
AppDataContext.jsx  (React Context, useReducer)
    ↓ dispatch(action) → appDataReducer
appState.js         (núcleo de dominio: reducers puros)
    ↓ usa
recipeCalculator.js (costeo, unidades, sub-recetas)
validation.js       (reglas de validación de formularios y backups)
```

### `src/context/AppDataContext.jsx`
Único React Context de la aplicación. Responsabilidades:
- Inicializa el estado con `loadAppState()` (lazy initializer de `useReducer`).
- Persiste el estado completo en `localStorage` en cada cambio (`useEffect`).
- Expone al árbol de componentes:
  - Datos derivados memoizados: `inventory` (snapshot), `purchases`
    (con montos y metadatos de estado), `recentMovements`, `alerts`,
    `purchaseSuggestions`, `dailySnapshots`.
  - Acciones (`dispatch` wrappers): `saveProduct`, `removeProduct`,
    `addSupplier/updateSupplier/removeSupplier`, `addRecipe`,
    `createPurchase`, `setPurchaseInTransit`, `receivePurchase`,
    `recordSale`, `voidSale`, `recordWaste`, `restoreBackupState`.
- **No contiene lógica de negocio.** Cada acción del reducer delega
  inmediatamente a una función pura de `appState.js`. Esta disciplina
  es la que previene que el Context se convierta en un "God Object": las
  reglas de negocio viven en `appState.js`/`recipeCalculator.js`, el
  Context solo orquesta.

### `src/state/appState.js`
Núcleo de dominio. Todas las funciones son puras: `(state, payload) => newState`.
No hay mutación in-place; cada acción retorna un nuevo objeto de estado
(spread de `state` + campos modificados). Contiene:

- **Normalización**: `normalizeLoadedState`, `normalizeRecipe`,
  `normalizePurchase`, `normalizeSale`, etc. Convierte datos crudos
  (legacy, importados, o de los archivos `data/*.js`) a la forma
  canónica del dominio, con valores por defecto seguros.
- **Snapshot de inventario**: `buildInventorySnapshot(catalog, movements)`
  — proyección pura sobre movimientos. Ver §5.
- **Reducers de dominio**: `addOrUpdateProduct`, `deleteProduct`,
  `addSupplier/updateSupplier/deleteSupplier`, `addRecipe`,
  `createPurchaseOrder`, `markPurchaseInTransit`, `receivePurchaseOrder`,
  `recordSale`, `voidSale`, `recordWaste`.
- **Motor de alertas**: `getOperationalAlerts(state, referenceDate)`.
- **Planificador de compras**: `generatePurchaseSuggestions(state)`.
- **Snapshots operacionales**: `generateDailySnapshots(state, daysLimit)`.
- **Utilidades de fecha/formato**: `getTodayISODate`, `normalizeDate`,
  `formatDisplayDate`.

### `src/utils/recipeCalculator.js`
Motor de costeo y conversión de unidades. Sin dependencias de React ni
del resto del dominio (solo recibe `inventory`/`recipes` como parámetros).
Ver §6 para el detalle de sub-recetas.

### `src/utils/storage.js`
Adaptador de persistencia sobre `localStorage`. Maneja versionado
(`STORAGE_VERSION`), migración desde claves legacy sueltas
(`STORAGE_KEYS`) hacia un único blob de estado (`reserve_app_state`), y
fallback a `createDefaultAppState()` si el storage está corrupto o
ausente (SSR-safe: `getStorage()` retorna `null` si `window` no existe).

### `src/utils/validation.js`
Validadores de formularios (producto, proveedor, receta, ingrediente,
compra, recepción, venta, merma) y de integridad de backups
(`validateBackupData`). Cada validador retorna un objeto de errores por
campo; `hasValidationErrors(errors)` determina si hay algo que bloquee el
submit. No lanza excepciones ni depende de UI.

### `src/utils/exportUtils.js`
Generación de backups JSON (`buildBackupEnvelope`, con
`schemaVersion`/`backupVersion`/`createdAt`) y de CSV con BOM UTF-8 para
Excel en español.

## 4. Estructura de carpetas

```
src/
  components/     Componentes de presentación reutilizables (tablas, modales,
                   tarjetas de métricas, filtros). Sin lógica de negocio.
  context/        AppDataContext.jsx — único Context de la app.
  data/           Datos semilla (catálogo, movimientos, recetas, compras,
                   ventas, proveedores). Se usan solo si no hay estado
                   previo en localStorage (createDefaultAppState).
  pages/          Una página por sección de navegación: Overview, Inventory,
                   Purchases, Recipes, POS, Reports, Suppliers.
  state/          appState.js — dominio puro (ver §3).
  utils/          recipeCalculator.js, validation.js, storage.js,
                   exportUtils.js, format.js.
  App.jsx         Layout raíz + rutas (react-router-dom).
  main.jsx        Bootstrap de React + AppDataProvider.
tests/            Suite node:test, un archivo por área de dominio.
docs/             Este documento.
```

## 5. Flujo: Venta (POS → Inventario → Reportes)

```
Usuario hace clic "Cobrar" en POS.jsx
  ↓
useAppData().recordSale(payload)
  ↓
dispatch({ type: "sale/record", payload })
  ↓
appDataReducer → recordSale(state, payload)   [appState.js]
  ↓
  1. buildInventorySnapshot(catalog, movements)   → snapshot actual
  2. normalizeSaleItem() por cada línea del ticket → congela unitCost
     (costo histórico: si es receta, calculateRecipeCost(recipe, snapshot,
     recipes); si es producto de reventa, snapshot.costPerUnit)
  3. normalizeSale() → registro de venta con costSnapshot congelado
  4. Por cada línea de tipo "recipe":
       flattenRecipeIngredients(recipe, state.recipes, cantidadVendida)
         → resuelve sub-recetas recursivamente a ingredientes crudos
       normalizeQuantity(...) por producto agregado
         → movimiento MOVEMENT_TYPES.SALE con quantity negativa,
           source: "pos_sale", reference: saleId
  ↓
newState = { ...state, sales: [sale, ...state.sales],
             inventoryMovements: [...state.inventoryMovements, ...newMovements] }
  ↓
AppDataContext recalcula (useMemo): inventory, alerts, purchaseSuggestions,
  dailySnapshots — todo derivado, nada se recalcula "a mano" en cada página
  ↓
Reports.jsx / Overview.jsx consumen los datos ya derivados del Context
```

**Anulación (`voidSale`)**: busca los movimientos originales por
`reference: saleId`, genera movimientos inversos exactos (misma
cantidad, signo contrario) y marca la venta como `status: "voided"`.
Cubierto por *INVARIANT 2* en `tests/invariants.test.js`: el stock
post-anulación es matemáticamente idéntico al pre-venta.

## 6. Sub-Recetas (Recetas Base)

Modelo para preparaciones de cocina reutilizables (masa, salsa, etc.)
que se producen en lote y se consumen como ingrediente de múltiples
recetas de venta, sin inventar mediciones que no existen en la cocina real.

### Estructura de una receta

```js
{
  id: "BASE_PIZZA_DOUGH",
  name: "Masa Pizza Familiar Base",
  type: "base_recipe",        // "recipe" (default) | "base_recipe"
  status: "active",           // "active" | "pending_measurement"
  yieldQuantity: 4,           // el lote produce 4 unidades
  yieldUnit: "un",
  ingredients: [
    { productId: "INV001", quantity: 1000, unit: "gr" }, // Harina
    { productId: "INV095", quantity: 600,  unit: "ml" },  // Agua
    // ...
  ],
}
```

Una receta de venta puede referenciar una base en vez de un producto:

```js
{
  id: "REC001",
  name: "Pizza Margarita",
  ingredients: [
    { baseRecipeId: "BASE_PIZZA_DOUGH", quantity: 1, unit: "un" },
    { baseRecipeId: "BASE_PIZZA_SAUCE", quantity: 120, unit: "ml" },
    { productId: "INV002", quantity: 250, unit: "gr" }, // Mozzarella
  ],
}
```

### Motor (`recipeCalculator.js`)

```
flattenRecipeIngredients(recipe, allRecipes, multiplier)
  ↓ para cada ingrediente:
    si tiene baseRecipeId:
      busca la base en allRecipes
      si no tiene yieldQuantity → la ignora (no inventa cantidades;
        ej. "Salsa Pizza Base" con status "pending_measurement")
      nestedMultiplier = (quantity / baseRecipe.yieldQuantity) * multiplier
      llamada recursiva sobre baseRecipe con nestedMultiplier
        (con guarda de ciclos vía visitedRecipeIds)
    si tiene productId:
      empuja { productId, quantity: quantity * multiplier, unit }
  ↓
  lista plana de ingredientes reales (productId, quantity, unit)
```

`calculateRecipeCost(recipe, inventory, allRecipes)` y
`calculateRecipeMaxPortions(recipe, inventory, allRecipes)` llaman a
`flattenRecipeIngredients` internamente — el parámetro `allRecipes` es
opcional y retrocompatible (si se omite, una receta sin `baseRecipeId`
se comporta exactamente igual que antes de introducir sub-recetas).

`calculateBaseRecipeUnitCost(baseRecipe, inventory, allRecipes)`
calcula el costo del lote completo y lo divide por `yieldQuantity`
(costo por "masa", por ejemplo).

### Flujo: Sub-receta → Costeo → POS

```
Sub-receta (BASE_PIZZA_DOUGH, yieldQuantity: 4)
  ↓
flattenRecipeIngredients(pizzaRecipe, allRecipes, unidadesVendidas)
  ↓ resuelve recursivamente a: harina, agua, sal, azúcar, levadura, orégano
    (escalados por unidadesVendidas / 4)
  ↓
calculateRecipeCost()          → costo real de la pizza (masa + salsa + queso)
calculateRecipeMaxPortions()   → porciones vendibles según stock de insumos crudos
recordSale()                   → movimientos de inventario SIEMPRE contra
                                  productId reales (nunca contra el id de
                                  la sub-receta); ver test
                                  "recordSale flattens a sub-recipe..."
                                  en tests/appState.test.js
```

### Reglas de diseño

- Una sub-receta (`type: "base_recipe"`) **nunca aparece como ítem
  vendible** en POS (`POS.jsx` filtra `recipe.type !== "base_recipe"`)
  ni se cuenta en las métricas de "Recetas Activas" de `Recipes.jsx`.
- `RecipesTable.jsx` distingue visualmente "Venta" vs "Base" y muestra
  el costo de una base como costo-por-unidad-de-rendimiento
  (`$/un`, `$/ml`, etc.) en vez de costo/margen (no aplica: una base no
  se vende directamente).
- Si una sub-receta no tiene ingredientes medidos aún
  (`status: "pending_measurement"`, `yieldQuantity` ausente), su costo
  es `0` y se propaga así a las recetas que la usan — es una señal
  explícita de "dato pendiente", no un error silencioso.

## 7. Otros módulos de dominio (referencia rápida)

| Módulo | Función principal | Ubicación |
|---|---|---|
| Alertas operacionales | `getOperationalAlerts` — stock crítico/agotado, merma elevada, productos inactivos, OC atrasadas | `appState.js` |
| Planificador de compras | `generatePurchaseSuggestions` — déficit = minStock − (onHand + onOrder) + margen de seguridad | `appState.js` |
| Snapshots diarios | `generateDailySnapshots` — valorización de inventario, ventas, margen, compras y mermas por día | `appState.js` |
| Backup/Restauración | `buildBackupEnvelope` (export), `validateBackupData` + `normalizeLoadedState` (import, soporta envelope o estado legacy plano) | `exportUtils.js`, `validation.js`, `appState.js` |

## 8. Testing

`tests/` usa `node:test` (sin frameworks externos). Un archivo por área:

- `tests/appState.test.js` — reducers de dominio (productos, proveedores,
  compras, ventas incl. sub-recetas, mermas).
- `tests/recipeCalculator.test.js` — normalización de unidades, costeo,
  porciones máximas, y todo el motor de sub-recetas
  (`flattenRecipeIngredients`, ciclos, costeo end-to-end).
- `tests/invariants.test.js` — invariantes matemáticas: idempotencia del
  snapshot, reversibilidad exacta de anulación de venta, sincronización
  de stock/costo en recepción de compra, planificador y snapshots.
- `tests/alerts.test.js` — motor de alertas y validación de backups.
- `tests/waste.test.js` — registro de mermas y validación de stock.

Correr: `npm test`. Ningún test depende del DOM ni de React — todo se
prueba contra las funciones puras de `appState.js`/`recipeCalculator.js`.

## 9. Convenciones para nuevas funcionalidades

1. **Reglas de negocio → `appState.js`**. Nunca en componentes ni en el
   Context.
2. **Cálculos reutilizables → `utils/`** (costeo, formato, validación).
3. **React → solo presentación**. Los componentes leen del Context y
   despachan acciones; no calculan ni mutan estado de dominio.
4. **Todo cambio de stock pasa por un movimiento** (`inventoryMovements`),
   nunca por edición directa de `onHand`.
5. **Costos que afectan reportes históricos se congelan** en el momento
   del evento (`unitCost` en el movimiento, `costSnapshot` en la venta),
   no se recalculan retroactivamente.
6. **No inventar datos no medidos.** Si falta información real (ej. una
   receta sin medir), el sistema debe reflejar `0`/`pending` en vez de
   una estimación arbitraria.
