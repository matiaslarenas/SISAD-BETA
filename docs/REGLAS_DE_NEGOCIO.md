# Reglas de Negocio — Sistema Restaurante El Mesón de Los Laureles

> Documento de referencia para las reglas de negocio del restaurante.
> Complementa `ARCHITECTURE.md` con ejemplos concretos y casos de uso.

## 1. Principios Fundamentales

1. **El inventario es la fuente de verdad.** El stock y el costo de cada
   producto se derivan de movimientos, nunca se editan directamente.
2. **Los costos se calculan automáticamente.** Nunca se ingresan manualmente
   en recetas; se derivan del costo vigente de los ingredientes.
3. **Los costos históricos se congelan.** Al momento de un evento (venta,
   merma), el costo se registra en el movimiento/venta y no se recalcula
   retroactivamente.
4. **No se inventan datos no medidos.** Si falta información real, el sistema
   muestra `0` o `pending`, nunca una estimación arbitraria.
5. **Simplicidad operacional.** Se prioriza la usabilidad sobre la
   complejidad técnica.

## 2. Gestión de Inventario

### 2.1 Cálculo de Stock

El stock de un producto se calcula proyectando todos los movimientos:

```
onHand = Σ(movimiento.quantity) para todos los movimientos del producto
```

**Ejemplo:**
- Producto: Harina 0000 (INV001)
- Movimiento 1: Compra +10 kg (quantity: 10000, unit: gr)
- Movimiento 2: Venta -1.5 kg (quantity: -1500, unit: gr)
- Movimiento 3: Merma -0.2 kg (quantity: -200, unit: gr)
- Stock resultante: 10000 - 1500 - 200 = 8300 gr = 8.3 kg

### 2.2 Costo Unitario Vigente

El costo vigente de un producto es el `unitCost` del **último movimiento**
que lo modificó (recepción de compra o ajuste manual).

**Ejemplo:**
- Recepción 1: +10 kg a CLP 3.500/kg → costo vigente: CLP 3.500
- Recepción 2: +5 kg a CLP 3.800/kg → costo vigente: CLP 3.800
- La próxima venta usará CLP 3.800 como costo unitario.

### 2.3 Normalización de Unidades

Todas las cantidades se normalizan a la unidad base del producto antes de
registrarse como movimiento.

| Unidad origen | Unidad base | Factor |
|---|---|---|
| kg | gr | 1000 |
| lt | ml | 1000 |
| un | un | 1 |

**Ejemplo:** Si un producto tiene unidad base `gr` y se registra una venta
de `1.5 kg`, el movimiento se guarda con `quantity: -1500, unit: "gr"`.

## 3. Costeo de Recetas

### 3.1 Cálculo de Costo

El costo de una receta se calcula sumando el costo de cada ingrediente:

```
recipeCost = Σ(ingredient.quantity * ingredient.unitCost)
```

Donde `unitCost` es el costo vigente del producto en el momento del
cálculo.

**Ejemplo ilustrativo de la fórmula** (con ingredientes planos, sin
sub-recetas, y usando ids/costos reales de `src/data/inventoryData.js`
como referencia):

| Ingrediente | Cantidad | Costo unitario | Subtotal |
|---|---|---|---|
| Harina de Trigo (INV001) | 500 gr | CLP 1.100/kg | CLP 550 |
| Agua Purificada (INV095) | 300 ml | CLP 0/lt | CLP 0 |
| Sal Fina (INV024) | 15 gr | CLP 600/kg | CLP 9 |
| Queso Mozzarella (INV002) | 250 gr | CLP 6.800/kg | CLP 1.700 |
| Salsa/Puré de Tomate (INV032) | 100 gr | CLP 1.900/kg | CLP 190 |
| **Total** | | | **CLP 2.449** |

> Nota: la receta real `REC_PIZZA_MARGARITA` del catálogo semilla no
> tiene la masa ni la salsa como ingredientes planos — las referencia
> como sub-recetas (`BASE_PIZZA_DOUGH`, `BASE_PIZZA_SAUCE`). Este
> ejemplo simplifica la fórmula base; ver §3.2 para el escalado real de
> sub-recetas y `docs/ARCHITECTURE.md` §6 para el modelo completo.

### 3.2 Sub-Recetas (Recetas Base)

Las sub-recetas permiten modelar preparaciones reutilizables (masa, salsa).

**Regla de escalado:**
```
nestedMultiplier = (ingredient.quantity / baseRecipe.yieldQuantity) * multiplier
```

**Ejemplo — Masa base (BASE_PIZZA_DOUGH, yield: 4 unidades):**
- Ingredientes: Harina 1000 gr, Agua 600 ml, Sal 20 gr
- Si la pizza usa 1 unidad de masa:
  - nestedMultiplier = (1 / 4) * 1 = 0.25
  - Harina: 1000 * 0.25 = 250 gr
  - Agua: 600 * 0.25 = 150 ml
  - Sal: 20 * 0.25 = 5 gr

### 3.3 Costo Congelado en Ventas

Al registrar una venta, el costo de cada receta se calcula y **congela** en
el ítem de venta (`unitCost`). Si los precios de los ingredientes cambian
después, el costo histórico de la venta no se modifica.

### 3.4 Recetas sin Medir

Si una sub-receta tiene `status: "pending_measurement"` (sin
`yieldQuantity`), su costo es `0` y se propaga así a las recetas que la
usan. Esto es una señal explícita de "dato pendiente", no un error.

## 4. Punto de Venta (POS)

### 4.1 Cálculo de Porciones Máximas

El sistema calcula cuántas unidades de una receta se pueden preparar con el
stock actual, identificando el ingrediente "cuello de botella":

```
maxPortions = min(ingredient.onHand / ingredient.quantityPerUnit)
```

**Ejemplo — Pizza Margarita:**
- Harina: 8.3 kg disponible / 500 gr por pizza = 16.6 porciones
- Mozzarella: 1.5 kg disponible / 250 gr por pizza = 6 porciones
- Salsa: 500 gr disponible / 100 gr por pizza = 5 porciones
- **Porciones máximas: 5** (limitado por salsa)

### 4.2 Registro de Venta

Al cobrar una venta:
1. Se calcula el costo de cada receta vendida (con snapshot de inventario).
2. Se generan movimientos de inventario negativos para cada ingrediente.
3. Se registra la venta con `totalAmount`, `totalCost` y `totalMargin`.
4. Los movimientos se vinculan a la venta mediante `reference: saleId`.

### 4.3 Anulación de Venta

Al anular una venta:
1. Se buscan los movimientos originales por `reference: saleId`.
2. Se generan movimientos inversos (misma cantidad, signo contrario).
3. La venta se marca como `status: "voided"` con `voidedAt`.
4. El stock post-anulación es matemáticamente idéntico al pre-venta.

## 5. Compras y Recepciones

### 5.1 Estados de Orden de Compra

`PURCHASE_STATUSES` en `src/state/appState.js` (usar el guion, no guion
bajo — es `"in-transit"`):

| Estado | Descripción |
|---|---|
| `pending` | Creada pero no confirmada |
| `in-transit` | Confirmada, en camino al restaurante |
| `received` | Recibida y registrada en inventario |

No existe un estado `cancelled` en el modelo actual — una orden de
compra no se puede cancelar/eliminar una vez creada, solo avanzar por
`pending → in-transit → received`.

### 5.2 Recepción de Mercancía

Al recibir una orden de compra:
1. Se registra la cantidad real recibida.
2. Se calcula el costo unitario real (totalAmount / quantity).
3. Se generan movimientos de inventario positivos.
4. Se actualiza el stock y costo vigente del producto.
5. La orden pasa a estado `received` con `receivedDate`.

### 5.3 Planificador de Compras

Las sugerencias de compra se calculan así:

```
deficit = max(0, minStock - (onHand + onOrder)) + safetyMargin
```

Donde:
- `onHand`: stock actual
- `onOrder`: cantidad en órdenes `in_transit`
- `safetyMargin`: margen de seguridad (configurable por producto)

**Ejemplo:**
- Harina: minStock = 5 kg, onHand = 2 kg, onOrder = 0 kg, safetyMargin = 1 kg
- Deficit = max(0, 5 - (2 + 0)) + 1 = 4 kg
- Sugerencia: comprar 4 kg de harina

## 6. Mermas

### 6.1 Registro de Merma

Al registrar una merma:
1. Se selecciona el producto y la cantidad perdida.
2. Se selecciona el motivo de la merma.
3. Se congela el `unitCost` y `totalCost` al momento del registro.
4. Se genera un movimiento de inventario negativo.
5. La merma se vincula al registro mediante `reference: wasteId`.

### 6.2 Impacto en Reportes

Las mermas afectan:
- **Alertas**: merma elevada acumulada por producto — dispara si el
  costo acumulado de merma de ese producto es ≥ CLP 10.000 **o** la
  cantidad acumulada es ≥ 3 unidades (lo que ocurra primero; ver
  `getOperationalAlerts` en `appState.js`). No es un porcentaje del
  valor de inventario.
- **Snapshots diarios**: `dailyWaste` del día (ver `DailySnapshot` en
  `docs/MODELO_DE_DATOS.md` §2.8)
- **Margen de utilidad**: reducción indirecta del margen bruto

## 7. Alertas Operacionales

### 7.1 Tipos de Alerta

Fuente real: `getOperationalAlerts(state, referenceDate)` en
`src/state/appState.js`. Los nombres de `severity` usados en el código
son `"danger"`, `"warning"` e `"info"` (no `"critical"`):

| Tipo | Condición | Severidad |
|---|---|---|
| Quiebre de Stock | `onHand <= 0` | `danger` |
| Stock Crítico | `0 < onHand <= minStock` | `warning` |
| Merma Elevada | Por producto: costo acumulado de merma ≥ CLP 10.000 **o** cantidad acumulada ≥ 3 unidades | `warning` |
| Orden pendiente/atrasada | Orden en `pending` o `in-transit` con ≥ 3 días desde `orderedDate` | `warning` si `in-transit`, `info` si `pending` |
| Insumo sin rotación | Producto con `onHand > 0` y sin ningún movimiento registrado, o sin movimientos en los últimos 30 días | `info` |

**No existe** una alerta de "Producto inactivo" — el modelo de `Product`
no tiene un campo `active` (ver `docs/MODELO_DE_DATOS.md` §2.1), así que
esa condición no puede evaluarse ni dispararse.

### 7.2 Resolución de Alertas

Cada alerta incluye `actionLabel`/`actionRoute` con una **acción
sugerida**:
- Quiebre de Stock / Stock Crítico → "Reponer en Compras" / "Crear
  Pedido" (`/purchases`)
- Merma Elevada → "Ver en Reportes" (`/reports`)
- Orden pendiente/atrasada → "Recepcionar Orden" (`/purchases`)
- Insumo sin rotación → "Ver en Inventario" (`/inventory`)

## 8. Reportes y Snapshots

### 8.1 Snapshot Diario

Se genera en memoria (no se persiste) para cada fecha con actividad, con
los campos reales de `DailySnapshot` (ver `docs/MODELO_DE_DATOS.md`
§2.8):
- Valor total del inventario a esa fecha (`inventoryValue`)
- Cantidad de productos en quiebre/stock crítico (`outOfStockCount`,
  `criticalStockCount`)
- Ventas cerradas del día y su costo (`dailySales`, `dailyCost`)
- Margen bruto y utilidad (`grossMargin`, `profit`)
- Total de mermas del día (`dailyWaste`)
- Compras recibidas ese día (`dailyPurchases`)

### 8.2 Métricas Clave (KPIs)

> ⚠️ De esta tabla, **solo "Margen bruto" está efectivamente calculado
> por el sistema** (`grossMargin` en cada `DailySnapshot`,
> `generateDailySnapshots` en `appState.js` — ver
> `docs/MODELO_DE_DATOS.md` §2.8). `Reports.jsx` lo muestra en verde
> ("saludable") desde 50% hacia arriba, no desde 60% como sugiere la
> columna de umbral. Las otras cuatro filas (rotación de inventario,
> tasa de merma como % del inventario, ticket promedio, cobertura de
> stock en días) son **guía conceptual, no funcionalidad implementada**
> — no hay ningún cálculo de `dailyUsageAvg`, `numVentas` agregado, ni
> "tasa de merma" en el código actual. Si se implementan, agregarlas
> como campos reales de `DailySnapshot` y actualizar esta tabla con su
> ubicación real.

| KPI | Fórmula | Umbral de alerta | ¿Implementado? |
|---|---|---|---|
| Margen bruto | `(dailySales - dailyCost) / dailySales` | Se muestra en verde desde 50% (`Reports.jsx`) | Sí — `DailySnapshot.grossMargin` |
| Rotación de inventario | `COGS / inventoryValue` | < 1.0 (bajo) | No |
| Tasa de merma | `wasteTotal / inventoryValue` | > 5% (alto) | No |
| Ticket promedio | `salesTotal / numVentas` | — | No |
| Cobertura de stock | `onHand / dailyUsageAvg` | < 3 días (bajo) | No |

## 9. Backup y Restauración

### 9.1 Formato de Backup

Formato real generado por `buildBackupEnvelope` en
`src/utils/exportUtils.js` (ver el detalle campo a campo en
`docs/MODELO_DE_DATOS.md` §5):

```json
{
  "backupVersion": "1.0.0",
  "schemaVersion": 1,
  "createdAt": "2026-09-10T12:00:00.000Z",
  "system": "Sistema Restaurante Los Laureles",
  "data": {
    "inventoryCatalog": [...],
    "inventoryMovements": [...],
    "suppliers": [...],
    "recipes": [...],
    "purchases": [...],
    "sales": [...]
  }
}
```

No hay un array `wasteRecords` separado — las mermas viven dentro de
`inventoryMovements` como movimientos `type: "waste"` (ver §6.1 y
`docs/MODELO_DE_DATOS.md` §2.7). Las claves son `inventoryCatalog` (no
`products`) y `purchases` (no `purchaseOrders`).

### 9.2 Validación de Backup

Al importar un backup:
1. Se valida la estructura (`validateBackupData`).
2. Se normalizan los datos (`normalizeLoadedState`).
3. Se migran versiones anteriores si es necesario.
4. Se reemplaza el estado actual (con confirmación del usuario).

### 9.3 Exportación CSV

Se exportan con BOM UTF-8 para compatibilidad con Excel en español:
- Inventario actual
- Movimientos de inventario
- Ventas
- Mermas
- Órdenes de compra
