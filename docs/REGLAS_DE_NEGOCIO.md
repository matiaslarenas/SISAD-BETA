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

**Ejemplo — Pizza Margarita (REC001):**

| Ingrediente | Cantidad | Unidad base | Costo unitario | Subtotal |
|---|---|---|---|---|
| Harina 0000 (INV001) | 500 gr | gr | CLP 3.800/kg | CLP 1.900 |
| Agua (INV095) | 300 ml | ml | CLP 0 (agua corriente) | CLP 0 |
| Sal (INV003) | 15 gr | gr | CLP 2.500/kg | CLP 37.5 |
| Mozzarella (INV002) | 250 gr | gr | CLP 12.000/kg | CLP 3.000 |
| Salsa tomate (INV004) | 100 gr | gr | CLP 4.500/kg | CLP 450 |
| **Total** | | | | **CLP 5.387.5** |

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

| Estado | Descripción |
|---|---|
| `pending` | Creada pero no confirmada |
| `in_transit` | Confirmada, en camino al restaurante |
| `received` | Recibida y registrada en inventario |
| `cancelled` | Cancelada (no se recibirá) |

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
- **Alertas**: merma elevada acumulada (> 5% del valor de inventario)
- **Snapshots diarios**: `wasteTotal` del día
- **Margen de utilidad**: reducción indirecta del margen bruto

## 7. Alertas Operacionales

### 7.1 Tipos de Alerta

| Tipo | Condición | Severidad |
|---|---|---|
| Stock crítico | `onHand <= 0` | `critical` |
| Stock bajo | `onHand <= minStock` | `warning` |
| Merma elevada | `wasteTotal > 5% * inventoryValue` | `warning` |
| OC atrasada | `in_transit` y `expectedDate < hoy` | `warning` |
| Producto inactivo | `active = false` | `info` |
| Sin rotación | Sin movimientos en > 30 días | `info` |

### 7.2 Resolución de Alertas

Cada alerta incluye una **acción sugerida**:
- Stock crítico/bajo → Ir a Compras (generar sugerencia)
- Merma elevada → Ir a Inventario (revisar registros)
- OC atrasada → Ir a Compras (seguir orden)
- Producto inactivo → Ir a Inventario (activar/desactivar)
- Sin rotación → Ir a Inventario (revisar uso)

## 8. Reportes y Snapshots

### 8.1 Snapshot Diario

Se genera automáticamente al final de cada día con:
- Valor total del inventario
- Ventas totales
- Costo de insumos consumidos (COGS)
- Margen bruto
- Total de mermas
- Compras recibidas

### 8.2 Métricas Clave (KPIs)

| KPI | Fórmula | Umbral de alerta |
|---|---|---|
| Rotación de inventario | `COGS / inventoryValue` | < 1.0 (bajo) |
| Margen bruto | `(salesTotal - COGS) / salesTotal` | < 60% (bajo) |
| Tasa de merma | `wasteTotal / inventoryValue` | > 5% (alto) |
| Ticket promedio | `salesTotal / numVentas` | — |
| Cobertura de stock | `onHand / dailyUsageAvg` | < 3 días (bajo) |

## 9. Backup y Restauración

### 9.1 Formato de Backup

```json
{
  "schemaVersion": 2,
  "backupVersion": 1,
  "createdAt": "2026-09-10T12:00:00Z",
  "data": {
    "products": [...],
    "inventoryMovements": [...],
    "recipes": [...],
    "suppliers": [...],
    "purchaseOrders": [...],
    "sales": [...],
    "wasteRecords": [...]
  }
}
```

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
