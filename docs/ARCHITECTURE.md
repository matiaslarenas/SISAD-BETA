# Arquitectura — Sistema Restaurante El Mesón de Los Laureles

> Documento técnico de referencia para desarrolladores y agentes de código.
> Complementa a `PROMPT_CHATBOT.md` (documentación funcional orientada a IA
> conversacional) con un detalle estructural del código.

## 1. Visión general

Aplicación cliente-servidor: un frontend React (Vite) que corre en el
navegador de cada dispositivo (desktop, tablet, celulares), y un servidor
Node.js (`server/index.js`, sin dependencias externas) que corre en el
computador de escritorio del restaurante y es la única fuente de verdad
del estado. Los demás dispositivos se conectan a ese servidor por la red
WiFi local — ver `docs/GUIA_DE_DEPLOYMENT.md` para el detalle de
despliegue. Cubre el ciclo completo para
El Mesón de Los Laureles, localidad de Los Laureles, comuna de Cunco,
Región de La Araucanía:

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
| Estado global (cliente) | React Context + `fetch`/polling contra el servidor (sin Redux/Zustand) |
| Servidor | Node.js con módulos nativos (`http`, `fs`) — **sin dependencias externas** (ver §3.1) |
| Persistencia | Archivo JSON en disco del servidor (`server/data/app-state.json`), escritura atómica |
| Gráficos | Recharts |
| Notificaciones UI | Sonner (toast) |
| Iconografía | lucide-react |
| Testing | `node:test` + `node:assert/strict` (sin Jest/Vitest) |
| Estilos | CSS plano (`src/styles.css`), sin framework de UI |

Comandos:
```
npm run dev        # servidor de desarrollo Vite (frontend, puerto 3000)
npm run server:dev # servidor Node en paralelo para desarrollo (puerto 3001)
npm run build      # build de producción (vite build)
npm start          # build + servidor Node sirviendo todo en un solo puerto (uso real)
npm run preview    # sirve el build de producción (solo frontend, sin API)
npm test           # corre toda la suite (node --test)
```

## 3. Estado global

```
server/data/app-state.json (disco del servidor)
    ↓ loadState()
server/persistence.js
    ↓
server/index.js  (HTTP nativo: GET /api/state, POST /api/dispatch)
    ↓ aplica action
src/state/rootReducer.js  (appDataReducer — mismo reducer que antes usaba el Context)
    ↓ delega a
src/state/appState.js         (núcleo de dominio: reducers puros, sin cambios)
    ↓ usa
recipeCalculator.js (costeo, unidades, sub-recetas)
validation.js       (reglas de validación de formularios y backups)

── red WiFi local ──

src/context/AppDataContext.jsx  (React Context, en cada dispositivo)
    ↓ fetch() + polling cada 2s a /api/state
    ↓ dispatch(action) → POST /api/dispatch
```

### 3.1 Por qué servidor sin dependencias externas

`server/index.js` usa solo módulos nativos de Node (`http`, `fs`,
`crypto`) — nada de `express`, `ws`, ni ninguna librería de terceros.
Decisión deliberada: el restaurante no siempre tiene acceso a internet
en el desktop para hacer `npm install` de dependencias nuevas, y esto
elimina el riesgo de que una actualización de una librería externa rompa
el servidor. La sincronización entre dispositivos usa **polling** cada
~2 segundos en vez de WebSockets, por el mismo motivo (implementar un
servidor WebSocket a mano sin la librería `ws` es frágil). Si en el
futuro se dispone de acceso a internet de forma confiable y se quiere
latencia menor a los 2 segundos, se puede agregar `ws` y reemplazar el
polling por push en tiempo real sin tocar la lógica de negocio (todo el
dominio ya vive en funciones puras independientes del transporte).

### `src/state/rootReducer.js`
Extraído de lo que antes era el switch de acciones dentro de
`AppDataContext.jsx`. Es el único punto que traduce `{ type, payload }`
a una llamada a `appState.js`, y lo importan **tanto el servidor como el
cliente** — el servidor lo usa para aplicar acciones y persistir; en el
cliente ya no se usa para mutar estado local (eso ahora lo hace el
servidor), pero se mantiene como referencia de qué acciones existen.

#### Tipos de acción disponibles (API de `POST /api/dispatch`)

Esta es la lista completa y vigente de `action.type` aceptados por
`appDataReducer` (fuente: `src/state/rootReducer.js`). Cualquier cliente
—incluyendo un agente externo que hable directo con la API— solo puede
mutar el estado mandando uno de estos tipos; cualquier otro valor es
ignorado silenciosamente (el reducer retorna el mismo estado, `default:
return state`).

| `action.type` | `payload` | Función en `appState.js` | Wrapper en `AppDataContext` |
|---|---|---|---|
| `product/save` | `{ productId, values }` (productId ausente = crear) | `addOrUpdateProduct` | `saveProduct(productId, values)` |
| `product/delete` | `{ productId }` | `deleteProduct` | `removeProduct(productId)` |
| `supplier/add` | `values` | `addSupplier` | `addSupplier(values)` |
| `supplier/update` | `{ supplierId, values }` | `updateSupplier` | `updateSupplier(supplierId, values)` |
| `supplier/delete` | `{ supplierId }` | `deleteSupplier` | `removeSupplier(supplierId)` |
| `recipe/add` | `values` | `addRecipe` | `addRecipe(values)` |
| `recipe/update` | `{ recipeId, values }` | `updateRecipe` | `updateRecipe(recipeId, values)` |
| `recipe/delete` | `{ recipeId }` | `deleteRecipe` | `removeRecipe(recipeId)` |
| `purchase/create` | `values` | `createPurchaseOrder` | `createPurchase(values)` |
| `purchase/in-transit` | `{ purchaseId }` | `markPurchaseInTransit` | `setPurchaseInTransit(purchaseId)` |
| `purchase/receive` | `{ purchaseId, receiptDate, receiptNotes, items }` | `receivePurchaseOrder` | `receivePurchase(payload)` |
| `sale/record` | venta completa (ver §2.6 en `MODELO_DE_DATOS.md`) | `recordSale` | `recordSale(payload)` |
| `sale/save-ticket` | ticket pendiente (mesa/comanda abierta) | `saveTicket` | `saveTicket(payload)` |
| `sale/close-ticket` | `{ saleId, paymentMethod, notes }` | `closeTicket` | `closeTicket(payload)` |
| `sale/void` | `{ saleId }` | `voidSale` | `voidSale(saleId)` |
| `waste/record` | `{ productId, quantity, reason, notes, movementDate }` | `recordWaste` | `recordWaste(payload)` |
| `state/restore` | estado completo o envoltorio `{ schemaVersion, data }` | `normalizeLoadedState` | `restoreBackupState(backupState)` |

`Recipes.jsx` permite editar y eliminar recetas desde la UI (botones
"Editar"/"Eliminar" en `RecipesTable.jsx`), reutilizando el mismo modal
que la creación. `AppDataContext.jsx` expone `updateRecipe(recipeId,
values)` y `removeRecipe(recipeId)` siguiendo el mismo patrón que
`updateSupplier`/`removeSupplier`.

### Cómo debe consultar y modificar el estado un sistema o agente externo

El estado vigente y real del restaurante **no es** `src/data/*.js` (eso
es solo el catálogo semilla, ver más abajo) ni debe leerse/editarse nunca
directamente como archivo mientras el servidor está corriendo. La única
forma correcta de leer o mutar datos en vivo es la API HTTP del
servidor:

- **Leer el estado completo**: `GET /api/state` → `{ revision, data }`,
  donde `data` tiene la forma documentada en `docs/MODELO_DE_DATOS.md`
  (`inventoryCatalog`, `inventoryMovements`, `suppliers`, `recipes`,
  `purchases`, `sales`).
- **Mutar el estado**: `POST /api/dispatch` con body
  `{ "type": "<uno de la tabla de arriba>", "payload": { ... } }`. La
  respuesta es `{ revision, data }` con el estado ya actualizado y
  persistido.
- **Nunca editar `server/data/app-state.json` a mano mientras el
  servidor está corriendo.** El servidor mantiene el estado en memoria y
  lo persiste a disco después de cada `dispatch`; un archivo editado por
  fuera se sobrescribe en la próxima mutación (o, peor, una escritura
  concurrente del servidor puede pisar la edición manual). Si hace falta
  inspeccionar el JSON en disco, hacerlo en modo solo lectura y con el
  servidor detenido (ver `docs/GUIA_DE_DESARROLLO.md` §7).
- No hay autenticación en la API (ver `docs/GUIA_DE_DEPLOYMENT.md` §7):
  cualquier dispositivo en la red WiFi local, incluyendo un agente
  externo corriendo en la misma red, puede leer y escribir el estado
  completo sin credenciales.

### `server/index.js`
Servidor HTTP nativo. Responsabilidades:
- Sirve el build de producción (`dist/`) con fallback de SPA (cualquier
  ruta de cliente sirve `index.html`, para que funcione el ruteo de
  `react-router-dom`).
- `GET /api/state` → devuelve `{ revision, data: state }`. `revision` es
  un contador en memoria que se incrementa en cada mutación, para que el
  cliente pueda saber con una comparación barata si el estado cambió sin
  tener que hacer diff profundo del JSON completo.
- `POST /api/dispatch` → recibe una acción, la aplica vía
  `appDataReducer`, persiste con `saveState()`, y devuelve el nuevo
  estado + revisión.
- `POST /api/print-ticket` → recibe `{ kind: "kitchen" | "customer", ...venta }`
  y envía un ticket a la impresora térmica USB del desktop (ver
  `server/printer.js` más abajo). **No es una acción de `dispatch`**: no
  pasa por `appDataReducer` ni muta/persiste el estado — es un efecto
  físico (imprimir) sobre una venta que ya existe.
- Mantiene el estado en memoria (`let state`) para no leer el disco en
  cada request; solo escribe a disco tras cada mutación.

### `server/persistence.js`
Equivalente de `src/utils/storage.js` pero sobre el sistema de archivos
del servidor en vez de `localStorage`. Reutiliza
`createDefaultAppState`/`normalizeLoadedState` de `appState.js` — mismo
formato de estado y mismas migraciones que la versión anterior
100% client-side. Escritura atómica (archivo temporal + rename) para que
un corte de luz a mitad de escritura no corrompa `app-state.json`.

> ⚠️ Al construir rutas de archivo con `import.meta.url`, usar siempre
> `fileURLToPath()` antes de pasarlas a `path.join`/`fs`. Usar
> `new URL(...).pathname` directamente rompe en Windows (produce rutas
> del tipo `C:\C:\Users\...`) — bug real encontrado y corregido durante
> la migración a servidor local.

### `server/printer.js`
Impresión de tickets en la impresora térmica USB (58mm, protocolo
ESC/POS) conectada al desktop, invocado desde `POST /api/print-ticket`.
Sin dependencias externas: arma los bytes ESC/POS a mano
(`buildKitchenComandaTicket`, `buildCustomerReceiptTicket`) y los manda
al driver de Windows ya instalado vía un recurso de impresora compartida
(`copy /b` al share `\\localhost\TICKETS`, configurable con la variable
de entorno `PRINTER_SHARE`). Solo implementado para `process.platform
=== "win32"`. Dos tipos de ticket:
- **Comanda de cocina** (`kind: "kitchen"`): ítem y cantidad en letra
  grande, sin precios — la cocina no cobra.
- **Cuenta del cliente** (`kind: "customer"`): detalle con precios,
  total y sugerencia de propina del 10%.

`POS.jsx` llama a `printTicket({ kind, ...venta })` (wrapper de
`AppDataContext`) al enviar una comanda a cocina o al cerrar/cobrar una
mesa. Ver también `docs/GUIA_DE_USUARIO.md` §6 para el flujo desde la
UI.

### `src/context/AppDataContext.jsx`
Único React Context de la aplicación, ahora en cada dispositivo cliente.
Responsabilidades:
- Al montar, hace `fetch("/api/state")` y luego repite cada 2 segundos
  (`POLL_INTERVAL_MS`), comparando `revision` para evitar
  `setState` innecesarios si nada cambió.
- `dispatch(action)` ya no muta estado local: hace
  `POST /api/dispatch` y aplica al estado local la respuesta del
  servidor (que es la fuente de verdad).
- Expone `isLoading` y `connectionError` para que la UI pueda mostrar un
  estado de carga/reconexión mientras no hay contacto con el servidor
  (ver `AppReady` en `App.jsx`).
- Expone al árbol de componentes los mismos datos derivados memoizados
  de siempre: `inventory` (snapshot), `purchases`, `recentMovements`,
  `alerts`, `purchaseSuggestions`, `dailySnapshots` — se siguen
  calculando en el cliente, a partir del estado que llega del servidor.
- **Sigue sin contener lógica de negocio.** Solo transporta acciones al
  servidor y datos derivados de vuelta a los componentes.

### `src/state/appState.js`
Núcleo de dominio — **sin cambios** por la migración a servidor. Todas
las funciones son puras: `(state, payload) => newState`. No hay mutación
in-place; cada acción retorna un nuevo objeto de estado (spread de
`state` + campos modificados). Contiene:

- **Normalización**: `normalizeLoadedState`, `normalizeRecipe`,
  `normalizePurchase`, `normalizeSale`, etc. Convierte datos crudos
  (legacy, importados, o de los archivos `data/*.js`) a la forma
  canónica del dominio, con valores por defecto seguros.
- **Snapshot de inventario**: `buildInventorySnapshot(catalog, movements)`
  — proyección pura sobre movimientos. Ver §5.
- **Reducers de dominio**: `addOrUpdateProduct`, `deleteProduct`,
  `addSupplier/updateSupplier/deleteSupplier`,
  `addRecipe/updateRecipe/deleteRecipe`,
  `createPurchaseOrder`, `markPurchaseInTransit`, `receivePurchaseOrder`,
  `recordSale`, `saveTicket`, `closeTicket`, `voidSale`, `recordWaste`.
  Ver la tabla completa de acciones (`action.type` ↔ función) más arriba,
  en §3, bajo `src/state/rootReducer.js`.
- **Motor de alertas**: `getOperationalAlerts(state, referenceDate)`.
- **Planificador de compras**: `generatePurchaseSuggestions(state)`.
- **Snapshots operacionales**: `generateDailySnapshots(state, daysLimit)`.
- **Utilidades de fecha/formato**: `getTodayISODate`, `normalizeDate`,
  `formatDisplayDate`.

### `src/utils/recipeCalculator.js`
Motor de costeo y conversión de unidades. Sin dependencias de React ni
del resto del dominio (solo recibe `inventory`/`recipes` como parámetros).
Ver §6 para el detalle de sub-recetas. `normalizeQuantity` soporta
conversión cruzada masa↔volumen con fallback de densidad 1:1 (ver el
caso de regresión de Limonada/Café Helado en
`tests/recipeCalculator.test.js`) — no reintroducir ese bug si se toca
esta función.

### `src/utils/storage.js`
**Ya no lo usa la aplicación en producción** (ver nota en el propio
archivo). Reemplazado por `server/persistence.js`. Se mantiene como
referencia histórica de la versión 100% client-side y por si hace falta
migrar un backup muy antiguo.

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
server/
  index.js        Servidor HTTP nativo (sin dependencias externas):
                   sirve dist/ + API (/api/state, /api/dispatch,
                   /api/print-ticket).
  persistence.js  Persistencia en disco (server/data/app-state.json).
  printer.js      Impresión ESC/POS de comandas y cuentas (ver §3).
  data/           Estado en vivo del servidor. No se versiona (.gitignore).
src/
  components/     Componentes de presentación reutilizables (tablas, modales,
                   tarjetas de métricas, filtros). Sin lógica de negocio.
  context/        AppDataContext.jsx — único Context de la app. Consulta
                   al servidor vía fetch/polling (ver §3).
  data/           **Solo catálogo semilla** (inventario, movimientos,
                   recetas, compras, ventas, proveedores, categorías). Usado
                   por createDefaultAppState() únicamente la primera vez que
                   el servidor arranca sin `app-state.json` previo (una
                   instalación nueva). Una vez que existe
                   `server/data/app-state.json`, estos archivos ya NO se
                   leen — el estado real y vigente vive exclusivamente en
                   ese JSON y se consulta/modifica vía la API (ver "Cómo
                   debe consultar y modificar el estado un sistema o agente
                   externo" en §3). Editar `src/data/recipesData.js` o
                   `src/data/inventoryData.js` después de la primera
                   instalación no tiene ningún efecto sobre los datos reales
                   del restaurante.
  pages/          Una página por sección de navegación: Overview, Inventory,
                   Purchases, Recipes, POS, Reports, Suppliers.
  state/          appState.js (dominio puro, ver §3) y rootReducer.js
                   (compartido entre cliente y servidor).
  utils/          recipeCalculator.js, validation.js, storage.js (legacy,
                   no usado en producción), exportUtils.js, format.js.
  App.jsx         Layout raíz + rutas (react-router-dom) + AppReady
                   (pantalla de carga mientras conecta con el servidor).
  main.jsx        Bootstrap de React + AppDataProvider.
tests/            Suite node:test, un archivo por área de dominio.
docs/             Este documento y los demás documentos conceptuales.
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
- **El modelo no tiene concepto de "variante" de una receta.** Cuando un
  mismo producto existe en varios sabores/versiones (ej. los tres Jugos
  Naturales — Frutilla `REC_JUGO_NATURAL`, Frambuesa
  `REC_JUGO_FRAMBUESA`, Arándano `REC_JUGO_ARANDANO`, todos 480cc a
  $2.500), cada sabor es una `Recipe` independiente y completa, con su
  propio `id`, `name` e `ingredients` — no hay un campo tipo `variantOf`
  ni un array de variantes anidado. Es una decisión de diseño deliberada
  para no agregar una capa de modelado nueva mientras cada sabor tenga
  costeo, stock y venta idénticos en estructura a cualquier otra receta.

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
7. **Toda acción nueva (`{ type, payload }`) se registra en
   `src/state/rootReducer.js`**, no solo en el cliente. Si se agrega un
   caso al switch sin agregarlo ahí, el servidor no sabrá aplicarlo y la
   acción fallará silenciosamente para todos los dispositivos.
