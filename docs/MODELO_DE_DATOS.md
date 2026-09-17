# Modelo de Datos — Sistema Restaurante El Mesón de Los Laureles

> Referencia de las entidades, sus atributos y relaciones. El estado de la
> aplicación se persiste como un único objeto JSON versionado en
> `server/data/app-state.json`, en el computador de escritorio que actúa
> como servidor local (cargado por `server/persistence.js`), y cada
> dispositivo lo consulta a través de `AppDataContext` vía la API del
> servidor. El formato del objeto y sus campos no cambiaron con la
> migración a servidor — solo cambió dónde vive físicamente el archivo
> (antes `localStorage` de cada navegador, ahora un solo archivo en el
> desktop).

## 1. Principio rector

**El inventario no es un número editable.** El stock (`onHand`) y el costo
vigente de cada producto se **derivan** de la proyección sobre
`inventoryMovements`. Cada movimiento es inmutable y atómico: registra
`quantity` (con signo), `unitCost`, `timestamp`, `movementDate`, `source`
y `reference`.

## 2. Entidades

### 2.1 Product (Catálogo de Insumos)

Catálogo maestro de productos/insumos (`state.inventoryCatalog`). Es la
única entidad cuyo stock se "ve"; el stock real (`onHand`) **no se
persiste en el producto** — se calcula proyectando `inventoryMovements`
sobre este catálogo vía `buildInventorySnapshot` (ver §4). Campos según
`normalizeInventoryProduct` en `src/state/appState.js`:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (ej. `INV001`) |
| `item` | string | Nombre descriptivo (ej. "Harina de Trigo"). **No `name`.** |
| `type` | string | `"ingredient"` (insumo de cocina), `"resale"` (reventa directa, ej. bebidas embotelladas) o `"supply"` (insumo no alimenticio, ej. desechables/limpieza) |
| `category` | string | Categoría del producto — catálogo cerrado en `src/data/categories.js` (`inventoryCategories`): Proteínas, Pescados y Mariscos, Lácteos, Verduras, Frutas, Abarrotes, Condimentos, Salsas, Cafetería, Congelados, Panadería y Repostería, Bebestibles, Limpieza, Desechables |
| `supplier` | string | **Nombre** del proveedor preferido (texto libre, no FK a `Supplier.id`) — puede venir vacío `""` |
| `location` | string | Ubicación física (ej. "Bodega", "Refrigerador", "Congelador", "Bodega Fría") |
| `purchaseUnit` | string | Unidad de compra/inventario (`kg`, `lt`, `un`) |
| `costPerUnit` | number | Costo unitario vigente (CLP) — se actualiza con cada recepción de compra o ajuste manual, pero el snapshot (`buildInventorySnapshot`) recalcula el vigente desde el último movimiento con `unitCost` |
| `minStock` | number | Umbral mínimo de stock (dispara alerta de stock crítico/quiebre) |
| `avgUnitWeightGr` | number | Opcional. Peso promedio en gramos de una unidad (ej. un pimentón), usado por `normalizeQuantity` para convertir recetas medidas en `gr`/`ml` a un `purchaseUnit` de `un` |

No existe un campo `active`/`supplierId`/`createdAt`/`updatedAt` en el
producto — no hay noción de "producto inactivo" en el modelo actual (ver
también la corrección en `docs/REGLAS_DE_NEGOCIO.md` §7.1).

`onHand` e `inventoryValue` (`onHand * costPerUnit`) solo existen en el
**snapshot derivado** que produce `buildInventorySnapshot(catalog,
movements)`, nunca en `inventoryCatalog` crudo.

### 2.2 InventoryMovement (Movimiento de Inventario)

**Fuente de verdad del stock.** Cada movimiento afecta el `onHand` de un
producto. El snapshot de inventario se reconstruye proyectando todos los
movimientos sobre el catálogo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único del movimiento (prefijo `MOV`) |
| `productId` | string | Referencia a `Product.id` |
| `quantity` | number | Cantidad con signo (negativo para salidas), en la unidad base del producto |
| `unitCost` | number \| null | Costo unitario en el momento del movimiento (CLP) |
| `type` | string | Tipo de movimiento (ver `MOVEMENT_TYPES` en `src/data/inventoryMovements.js`): `purchase`, `sale`, `waste`, `adjustment` |
| `source` | string | Origen real usado en el código: `pos_sale`, `pos_pending_ticket`, `purchase_receipt`, `inventory_adjustment`, `product_creation`, `inventory_waste`, `sale_void`, `system` |
| `reference` | string | ID/descripción de la entidad origen (ej. `saleId`, `purchaseId`, o texto libre como `"Ajuste manual"`) |
| `movementDate` | string | Fecha del movimiento (`YYYY-MM-DD`) |
| `timestamp` | string | Timestamp exacto de creación (ISO UTC) |
| `notes` | string | Nota opcional (ej. motivo de merma, detalle del ajuste). **Campo es `notes`, no `note`.** |
| `reason` | string | Solo en movimientos `waste`: motivo de la merma (ver §2.7) |
| `totalCost` | number | Solo en movimientos `waste`: `quantity_perdida * unitCost` |

No existe un campo `unit` separado en el movimiento — `quantity` ya está
normalizada a la unidad base del producto (`purchaseUnit`) antes de
guardarse.

#### Tipos de movimiento (`MOVEMENT_TYPES`)

| Tipo | Signo | Trigger |
|---|---|---|
| `purchase` | + | Recepción de orden de compra (`receivePurchaseOrder`) |
| `sale` | - | Venta en POS o ticket pendiente (`recordSale`, `saveTicket`) |
| `waste` | - | Registro de merma (`recordWaste`) |
| `adjustment` | +/- | Ajuste manual de stock/costo, stock inicial de producto nuevo, o reintegro por anulación de venta (`voidSale`) |

### 2.3 Recipe (Receta / Ficha Técnica)

Define un producto terminado o semielaborado con sus ingredientes y
rendimiento. El costo se calcula derivado del inventario vigente.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (prefijo `REC` para recetas nuevas creadas desde la UI; el catálogo semilla usa ids legibles como `REC_PIZZA_MARGARITA`, `BASE_PIZZA_DOUGH`) |
| `name` | string | Nombre de la receta |
| `category` | string | Categoría — texto libre, sin catálogo cerrado en el modelo. Categorías actualmente en uso en el catálogo semilla (`src/data/recipesData.js`): `Bases`, `Pizzas`, `Empanadas`, `Acompañamientos`, `Cafetería`, `Bebidas`, `Almuerzos`. El selector de categoría de `Recipes.jsx` (`categories`) solo lista `Pizzas`, `Empanadas`, `Acompañamientos`, `Bebidas`, `Bases` — **no incluye `Cafetería` ni `Almuerzos`** aunque existan recetas con esas categorías en los datos; una receta de esas categorías queda fuera del filtro por categoría (aunque sigue apareciendo en "Todas") |
| `type` | string | `"recipe"` (venta, default) o `"base_recipe"` (sub-receta/base, ver §6 de `ARCHITECTURE.md`) |
| `status` | string | `"active"` o `"pending_measurement"` (sub-receta sin ingredientes medidos aún — costo `0`) |
| `salePrice` | number | Precio de venta (CLP). Solo tiene sentido para `type: "recipe"` |
| `servings` | number | Porciones que produce una unidad de la receta vendida (mínimo 1, default 1) |
| `yieldQuantity` | number | Rendimiento total del lote, solo relevante para `type: "base_recipe"` (ej. 4 unidades de masa) |
| `yieldUnit` | string | Unidad de rendimiento (`un`, `ml`, `gr`) |
| `ingredients` | array | Lista de ingredientes (ver §2.3.1) |

No existen `createdAt`/`updatedAt` en la receta — `normalizeRecipe` no
los genera ni los conserva.

**No hay concepto de "variante" en el modelo.** Cuando el mismo producto
existe en varios sabores/presentaciones (ej. los Jugos Naturales de
Frutilla/Frambuesa/Arándano, 480cc a $2.500 cada uno), cada uno es una
`Recipe` independiente y completa (`REC_JUGO_NATURAL`,
`REC_JUGO_FRAMBUESA`, `REC_JUGO_ARANDANO`), no una variante anidada
dentro de una receta "padre". Ver `docs/ARCHITECTURE.md` §6 para el
detalle de esta decisión de diseño.

#### 2.3.1 Ingrediente de receta

Cada ingrediente referencia **o** un producto **o** una sub-receta base:

```js
// Ingrediente de producto directo
{ productId: "INV001", quantity: 1000, unit: "gr" }

// Ingrediente de sub-receta (base)
{ baseRecipeId: "BASE_PIZZA_DOUGH", quantity: 1, unit: "un" }
```

### 2.4 Supplier (Proveedor)

Campos según `normalizeSupplier` en `src/state/appState.js` — **no
coincide con un modelo genérico de "empresa" (sin contacto/email/dirección),
sino con lo que usa `Suppliers.jsx`/`SuppliersTable.jsx`: cumplimiento y
tiempo de entrega**:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (prefijo `SUP` si no se provee) |
| `name` | string | Nombre de la empresa |
| `category` | string | Rubro/categoría del proveedor (texto libre) |
| `leadTime` | string | Tiempo de entrega estimado (texto libre, ej. "48 horas") |
| `phone` | string | Teléfono de contacto |
| `compliance` | string | Porcentaje de cumplimiento, normalizado a formato `"NN%"` |
| `status` | string | `"Excelente"` (compliance ≥ 95%), `"Aceptable"` (≥ 90%), `"Crítico"` (< 90%) — derivado de `compliance` si no se pasa explícito |
| `statusClass` | string | Clase visual asociada: `"success"`, `"warning"`, `"danger"` |

No existen `contact`/`email`/`address`/`createdAt`/`updatedAt`. Las
compras (`PurchaseOrder`) y ventas no referencian `Supplier.id` — el
campo `supplier` de esas entidades es el **nombre** copiado como texto
libre, no una foreign key.

### 2.5 PurchaseOrder (Orden de Compra)

Campos según `normalizePurchase` en `src/state/appState.js`:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (formato `OC-1001`, `OC-1002`, ... autogenerado) |
| `supplier` | string | **Nombre** del proveedor (texto libre, no FK a `Supplier.id`) |
| `category` | string | Categoría de la compra — si no se especifica, se deriva de la categoría del primer producto del pedido, o `"General"` |
| `items` | array | Lista de ítems (ver §2.5.1) |
| `status` | string | `PURCHASE_STATUSES`: `"pending"`, `"in-transit"` (con guion, no guion bajo), `"received"`. **No existe el estado `"cancelled"`** |
| `orderedDate` | string | Fecha de creación del pedido (`YYYY-MM-DD`) |
| `receiptDate` | string | Fecha de recepción (`YYYY-MM-DD`, vacío si no recibida) |
| `notes` | string | Nota al crear el pedido |
| `receiptNotes` | string | Nota al recibirlo |
| `amount` | number | Monto total, calculado desde `items` (`receivedQuantity ?? quantity` × `unitCost`) |

No existen `supplierId`, `expectedDate`, `receivedDate` (es
`receiptDate`), `totalAmount` (es `amount`), `createdAt`/`updatedAt`.

#### 2.5.1 Ítem de orden de compra

```js
{
  id: "POI-...",
  productId: "INV001",
  productName: "Harina de Trigo",
  purchaseUnit: "kg",
  quantity: 5,
  receivedQuantity: 5,   // = quantity hasta que se recepciona con otro valor
  unitCost: 1100,        // CLP por purchaseUnit
  totalCost: 5500,       // quantity * unitCost
}
```

### 2.6 Sale (Venta / Ticket POS)

Campos según `normalizeSale` en `src/state/appState.js`. Cubre tanto una
venta de mostrador cerrada al instante (`sale/record`) como una
mesa/comanda abierta (`sale/save-ticket`, `sale/close-ticket`) — ambas
son la misma entidad `Sale`, distinguidas por `status`:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (formato `VTA-1001`, ...) |
| `date` | string | Fecha de la venta (`YYYY-MM-DD`) |
| `time` | string | Hora (`HH:MM`) |
| `tableOrCustomer` | string | Mesa o cliente (ej. `"Mesa 4"`, default `"Mostrador"`) |
| `paymentMethod` | string | Texto libre (la UI usa `"Efectivo"`, `"Tarjeta"`, `"Transferencia"` — no es un enum cerrado en el modelo) |
| `items` | array | Ítems vendidos (ver §2.6.1) |
| `totalAmount` | number | Total de la venta (CLP) |
| `totalCost` | number | Costo total de los insumos consumidos (CLP), congelado |
| `status` | string | `SALE_STATUSES`: `"pending"` (mesa/ticket abierto, stock ya descontado pero no cobrado), `"completed"` (cobrada), `"voided"` (anulada, stock reintegrado). `"open"` es alias legado que se normaliza a `"pending"` |
| `closedAt` | string \| null | Timestamp ISO de cuándo se cobró/cerró (null mientras está `pending`) |
| `notes` | string | Nota del pedido/comanda |

No existen `totalMargin` (calcularlo como `totalAmount - totalCost` si
se necesita), `saleDate` (es `date`), `timestamp` genérico a nivel de
venta, ni `voidedAt` (la anulación solo cambia `status` a `"voided"`; el
momento exacto no se registra en la venta, pero sí en el `timestamp` de
los movimientos de reintegro).

#### 2.6.1 Ítem de venta

```js
{
  id: "VTI-...",
  type: "recipe",          // "recipe" o "product" (venta directa de reventa)
  itemId: "REC_PIZZA_MARGARITA",  // recipeId o productId según 'type'
  name: "Pizza Margarita",
  quantity: 2,
  unit: "porción",
  unitPrice: 11000,        // CLP
  totalPrice: 22000,       // quantity * unitPrice
  unitCost: 4200,          // costo congelado al momento de la venta (CLP)
  totalCost: 8400,         // quantity * unitCost
}
```

No existe `recipeId` como campo (es `itemId` + `type: "recipe"`), ni
`costSnapshot` anidado — el costo congelado es directamente `unitCost`/
`totalCost` en el ítem.

### 2.7 Merma (registrada como InventoryMovement, no como entidad propia)

**No existe una entidad `WasteRecord` ni un array `wasteRecords`
separado en el estado.** `recordWaste` (en `appState.js`) agrega un
`InventoryMovement` más con `type: "waste"`, con estos campos
adicionales sobre los de §2.2:

| Campo | Tipo | Descripción |
|---|---|---|
| `reason` | string | Motivo (ver catálogo de razones abajo) |
| `notes` | string | `"{reason} - {notaLibre}"` si hay nota, si no solo `reason` |
| `totalCost` | number | `cantidadPerdida * unitCost` |
| `quantity` | number | Negativa |
| `source` | string | Siempre `"inventory_waste"` |

Para reportarla como "todas las mermas", filtrar
`state.inventoryMovements` por `type === "waste"`.

#### Catálogo de razones de merma (`WASTE_REASONS` en `appState.js`)

Son strings en español, listos para mostrar en UI — **no son códigos**:

```js
["Producto vencido", "Daño físico / golpe", "Preparación fallida",
 "Merma de cocina", "Contaminación cruzada", "Error de producción",
 "Derrame", "Otro"]
```

### 2.8 DailySnapshot (Snapshot Diario)

Valorización de inventario y métricas operacionales por día. Se genera
en memoria (no se persiste) con `generateDailySnapshots(state,
daysLimit)`, uno por cada fecha con al menos un movimiento/venta/recepción:

| Campo | Tipo | Descripción |
|---|---|---|
| `date` | string | Fecha del snapshot (`YYYY-MM-DD`) |
| `dateLabel` | string | Fecha formateada `DD/MM/YYYY` |
| `inventoryValue` | number | Valor total del inventario a esa fecha (CLP) |
| `outOfStockCount` | number | Cantidad de productos con `onHand <= 0` |
| `criticalStockCount` | number | Cantidad de productos con `0 < onHand <= minStock` |
| `dailySales` | number | Ventas **cerradas/pagadas** (`status: "completed"`) de ese día (CLP) |
| `dailyCost` | number | Costo de insumos de esas ventas (CLP) |
| `dailyWaste` | number | Total de mermas registradas ese día (CLP) |
| `dailyPurchases` | number | Compras recibidas (`status: "received"`) ese día (CLP) |
| `grossMargin` | number | `((dailySales - dailyCost) / dailySales) * 100`, redondeado (0 si `dailySales` es 0) |
| `profit` | number | `dailySales - dailyCost` |

No existen `salesTotal`/`costOfGoodsSold`/`wasteTotal`/`purchasesReceived`
como nombres de campo — son `dailySales`/`dailyCost`/`dailyWaste`/
`dailyPurchases`.

## 3. Relaciones

> ⚠️ `Supplier` y `Product`/`PurchaseOrder` **no están relacionados por
> id**: `Product.supplier` y `PurchaseOrder.supplier` son el nombre del
> proveedor como texto libre, no una foreign key a `Supplier.id`. El
> diagrama usa flechas de relación conceptual, no de integridad
> referencial real.

```
Supplier ···(nombre, texto libre)··· PurchaseOrder >─── Product
                                         │
                                         ├──< InventoryMovement
                                         │      (movimientos type: "waste"
                                         │       son la "merma"; no hay
                                         │       entidad WasteRecord aparte)
                                         │
                                         ├──< Recipe.ingredients[] (productId)
                                         │
                                         └──< PurchaseOrder.items[]

Recipe ──< Recipe.ingredients[] (baseRecipeId) >─── Recipe (sub-receta)
   │
   └──< Sale.items[] (itemId, cuando item.type === "recipe")

Sale ──< InventoryMovement (reference: saleId, type: "sale")

PurchaseOrder ──< InventoryMovement (reference: purchaseId, type: "purchase")
```

## 4. Derivados (no persistidos, calculados en memoria)

Estos valores se calculan con `useMemo` en `AppDataContext` a partir de las
entidades anteriores:

| Derivado | Fórmula | Ubicación |
|---|---|---|
| `inventory` (snapshot) | `buildInventorySnapshot(catalog, movements)` | `appState.js` |
| `alerts` | `getOperationalAlerts(state, referenceDate)` | `appState.js` |
| `purchaseSuggestions` | `generatePurchaseSuggestions(state)` | `appState.js` |
| `dailySnapshots` | `generateDailySnapshots(state, daysLimit)` | `appState.js` |
| `recipeCost` | `calculateRecipeCost(recipe, inventory, recipes)` | `recipeCalculator.js` |
| `maxPortions` | `calculateRecipeMaxPortions(recipe, inventory, recipes)` | `recipeCalculator.js` |

## 5. Versionamiento de datos

Un **backup exportado** desde el Panel (`buildBackupEnvelope` en
`src/utils/exportUtils.js`) tiene este envoltorio:

```js
{
  backupVersion: "1.0.0",   // BACKUP_APP_VERSION
  schemaVersion: 1,         // BACKUP_SCHEMA_VERSION
  createdAt: "2026-09-10T12:00:00.000Z",
  system: "Sistema Restaurante Los Laureles",
  data: {
    inventoryCatalog: [...],
    inventoryMovements: [...],
    suppliers: [...],
    recipes: [...],
    purchases: [...],
    sales: [...],
  },
}
```

Estas son las **claves reales** de `data` — no `products`,
`purchaseOrders` ni `wasteRecords` (ver la corrección de estos nombres
también en `docs/REGLAS_DE_NEGOCIO.md` §9.1). `GET /api/state` devuelve
el mismo `data` pero envuelto en `{ revision, data }` (sin
`schemaVersion`/`backupVersion`/`createdAt`/`system`), ya que ese
metadato es específico del formato de backup, no del estado en vivo.

`normalizeLoadedState` vive en `src/state/appState.js` (dominio puro) y
la invoca tanto `server/persistence.js` al cargar el estado desde disco
como `state/restore` al importar un backup. Soporta tanto un estado
plano como un envoltorio `{ ..., data: {...} }` (detecta si
`rawState.data` es un objeto y opera sobre él) — así acepta indistintamente
un backup completo o solo su `data`.
`src/utils/storage.js` la invocaba de la misma forma en la versión
anterior 100% client-side; queda como referencia histórica.
