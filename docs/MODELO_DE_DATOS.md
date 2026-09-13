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

Catálogo maestro de productos/insumos. Es la única entidad cuyo stock se
"ve"; el stock real se calcula proyectando movimientos sobre este catálogo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (ej. `INV001`) |
| `name` | string | Nombre descriptivo (ej. "Harina 0000") |
| `category` | string | Categoría del producto (ver `src/data/categories.js`) |
| `unit` | string | Unidad base de medida (`gr`, `kg`, `ml`, `lt`, `un`) |
| `onHand` | number | Stock actual — **derivado**, no editable directamente |
| `costPerUnit` | number | Costo unitario vigente (CLP) — **derivado** de última recepción/ajuste |
| `minStock` | number | Umbral mínimo de stock (dispara alerta crítica) |
| `supplierId` | string | Proveedor preferido (opcional) |
| `active` | boolean | Si está inactivo, no aparece en POS ni sugerencias |
| `createdAt` | string | Fecha de creación (ISO) |
| `updatedAt` | string | Última actualización (ISO) |

### 2.2 InventoryMovement (Movimiento de Inventario)

**Fuente de verdad del stock.** Cada movimiento afecta el `onHand` de un
producto. El snapshot de inventario se reconstruye proyectando todos los
movimientos sobre el catálogo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único del movimiento |
| `productId` | string | Referencia a `Product.id` |
| `quantity` | number | Cantidad con signo (negativo para salidas) |
| `unit` | string | Unidad del movimiento (normalizada a la unidad base del producto) |
| `unitCost` | number | Costo unitario en el momento del movimiento (CLP) |
| `type` | string | Tipo de movimiento: `purchase`, `sale`, `waste`, `adjustment` |
| `source` | string | Origen: `pos_sale`, `purchase_receipt`, `waste_log`, `manual_adjustment` |
| `reference` | string | ID de la entidad origen (ej. `saleId`, `purchaseId`) |
| `movementDate` | string | Fecha del movimiento (ISO, sin zona horaria) |
| `timestamp` | string | Timestamp exacto de creación (ISO UTC) |
| `note` | string | Nota opcional (ej. motivo de merma) |

#### Tipos de movimiento

| Tipo | Signo | Trigger |
|---|---|---|
| `purchase` | + | Recepción de orden de compra |
| `sale` | - | Registro de venta en POS |
| `waste` | - | Registro de merma |
| `adjustment` | +/- | Ajuste manual de inventario |

### 2.3 Recipe (Receta / Ficha Técnica)

Define un producto terminado o semielaborado con sus ingredientes y
rendimiento. El costo se calcula derivado del inventario vigente.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único (ej. `REC001`) |
| `name` | string | Nombre de la receta |
| `type` | string | `"recipe"` (venta) o `"base_recipe"` (sub-receta/base) |
| `status` | string | `"active"` o `"pending_measurement"` |
| `yieldQuantity` | number | Rendimiento total de la receta (ej. 4 unidades) |
| `yieldUnit` | string | Unidad de rendimiento (`un`, `ml`, `gr`) |
| `ingredients` | array | Lista de ingredientes (ver §2.3.1) |
| `createdAt` | string | Fecha de creación (ISO) |
| `updatedAt` | string | Última actualización (ISO) |

#### 2.3.1 Ingrediente de receta

Cada ingrediente referencia **o** un producto **o** una sub-receta base:

```js
// Ingrediente de producto directo
{ productId: "INV001", quantity: 1000, unit: "gr" }

// Ingrediente de sub-receta (base)
{ baseRecipeId: "BASE_PIZZA_DOUGH", quantity: 1, unit: "un" }
```

### 2.4 Supplier (Proveedor)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único |
| `name` | string | Nombre de la empresa |
| `contact` | string | Persona de contacto |
| `phone` | string | Teléfono de contacto |
| `email` | string | Email de contacto |
| `address` | string | Dirección física |
| `createdAt` | string | Fecha de creación (ISO) |
| `updatedAt` | string | Última actualización (ISO) |

### 2.5 PurchaseOrder (Orden de Compra)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único |
| `supplierId` | string | Referencia a `Supplier.id` |
| `items` | array | Lista de ítems (ver §2.5.1) |
| `status` | string | `"pending"`, `"in_transit"`, `"received"`, `"cancelled"` |
| `orderDate` | string | Fecha de creación (ISO) |
| `expectedDate` | string | Fecha estimada de recepción (ISO) |
| `receivedDate` | string | Fecha de recepción (ISO, null si no recibida) |
| `totalAmount` | number | Monto total estimado (CLP) |
| `createdAt` | string | Timestamp de creación (ISO UTC) |
| `updatedAt` | string | Última actualización (ISO UTC) |

#### 2.5.1 Ítem de orden de compra

```js
{
  productId: "INV001",
  quantity: 5,
  unit: "kg",
  unitCost: 3500,     // CLP por unidad base
  expectedDate: "2026-09-15"
}
```

### 2.6 Sale (Venta / Ticket POS)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único |
| `items` | array | Ítems vendidos (ver §2.6.1) |
| `totalAmount` | number | Total de la venta (CLP) |
| `totalCost` | number | Costo total de los insumos consumidos (CLP) |
| `totalMargin` | number | Margen bruto (totalAmount - totalCost) |
| `paymentMethod` | string | `"cash"`, `"card"`, `"transfer"` |
| `status` | string | `"completed"` o `"voided"` |
| `saleDate` | string | Fecha de la venta (ISO) |
| `timestamp` | string | Timestamp exacto (ISO UTC) |
| `voidedAt` | string | Fecha de anulación (ISO UTC, null si activa) |

#### 2.6.1 Ítem de venta

```js
{
  recipeId: "REC001",     // Receta vendida
  quantity: 2,            // Unidades vendidas
  unitPrice: 12500,       // Precio de venta por unidad (CLP)
  unitCost: 8500,         // Costo congelado al momento de la venta (CLP)
  totalAmount: 25000,     // quantity * unitPrice
  totalCost: 17000,       // quantity * unitCost
  costSnapshot: { ... }   // Snapshot del inventario al momento de la venta
}
```

### 2.7 WasteRecord (Registro de Merma)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único |
| `productId` | string | Producto afectado |
| `quantity` | number | Cantidad perdida (negativa) |
| `unit` | string | Unidad de medida |
| `unitCost` | number | Costo unitario congelado (CLP) |
| `totalCost` | number | Costo total de la merma (CLP) |
| `reason` | string | Motivo (ver catálogo de razones) |
| `note` | string | Nota adicional (opcional) |
| `wasteDate` | string | Fecha de la merma (ISO) |
| `timestamp` | string | Timestamp exacto (ISO UTC) |

#### Catálogo de razones de merma

| Código | Descripción |
|---|---|
| `expired` | Producto vencido |
| `damaged` | Daño físico durante transporte/almacenamiento |
| `failed_prep` | Preparación fallida (receta mal hecha) |
| `kitchen_waste` | Merma de cocina (sobras, cáscaras, etc.) |
| `theft` | Sospecha de hurto |
| `other` | Otro (especificar en `note`) |

### 2.8 DailySnapshot (Snapshot Diario)

Valorización de inventario y métricas operacionales por día. Se genera
automáticamente con `generateDailySnapshots`.

| Campo | Tipo | Descripción |
|---|---|---|
| `date` | string | Fecha del snapshot (ISO) |
| `inventoryValue` | number | Valor total del inventario al final del día (CLP) |
| `salesTotal` | number | Ventas totales del día (CLP) |
| `costOfGoodsSold` | number | Costo de los insumos consumidos (CLP) |
| `grossMargin` | number | Margen bruto (salesTotal - costOfGoodsSold) |
| `wasteTotal` | number | Total de mermas del día (CLP) |
| `purchasesReceived` | number | Compras recibidas del día (CLP) |

## 3. Relaciones

```
Supplier ──< PurchaseOrder >─── Product
                                   │
                                   ├──< InventoryMovement
                                   │
                                   ├──< Recipe.ingredients[]
                                   │
                                   ├──< WasteRecord
                                   │
                                   └──< PurchaseOrder.items[]

Recipe ──< Recipe.ingredients[] (baseRecipeId) >─── Recipe (sub-receta)
   │
   └──< Sale.items[] (recipeId)

Sale ──< InventoryMovement (reference: saleId)

PurchaseOrder ──< InventoryMovement (reference: purchaseId)
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

El estado persistido incluye:

```js
{
  schemaVersion: 2,     // Versión del modelo de datos
  backupVersion: 1,     // Versión del formato de backup
  createdAt: "2026-09-10T...",
  data: { ...estado... }
}
```

`normalizeLoadedState` vive en `src/state/appState.js` (dominio puro) y
la invoca `server/persistence.js` al cargar el estado desde disco —
detecta versiones anteriores y aplica las transformaciones necesarias.
`src/utils/storage.js` la invocaba de la misma forma en la versión
anterior 100% client-side; queda como referencia histórica.
