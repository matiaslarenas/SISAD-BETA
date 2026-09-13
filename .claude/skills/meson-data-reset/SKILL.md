---
name: meson-data-reset
description: Usar antes de escribir o correr cualquier script que borre, resetee o "deje en cero" datos del Sistema Restaurante El Mesón de Los Laureles (inventario, recetas, proveedores, ventas, compras). También usar cuando el usuario pida limpiar datos de demostración o partir de cero para empezar a operar con datos reales.
---

# Reset de datos — El Mesón de Los Laureles

## Regla no negociable: confirmar el alcance exacto antes de escribir nada

"Dejar en cero", "limpiar", "borrar todo" y "resetear" **no son
sinónimos** — cada uno puede significar cosas muy distintas para el
usuario:

- ¿Se refiere a las **cantidades** (stock) o al **catálogo completo**
  (productos, recetas, proveedores)?
- ¿Se refiere también al **historial** (ventas, compras, movimientos), o
  solo al stock actual?
- ¿"Datos de demostración" significa los proveedores con nombres
  genéricos, o también las recetas/productos — que en este proyecto
  pueden ser el menú real ya cargado, no datos de prueba descartables?

**Error real que ya ocurrió**: se interpretó "dejar la información en
cero" como "borrar todo el catálogo", cuando el usuario en realidad
quería mantener productos/recetas/proveedores intactos y solo resetear
cantidades e historial. Esto se solucionó restaurando un backup y
reescribiendo el script con el alcance correcto — pero pudo evitarse
confirmando el alcance ANTES de tocar datos, con una pregunta explícita
de qué se mantiene y qué se vacía (no una pregunta genérica de "¿cómo
quieres que lo haga?").

## Antes de escribir un script destructivo, confirmar explícitamente

Preguntar por cada categoría, no en bloque:
1. Catálogo: productos (`inventoryCatalog`), recetas (`recipes`),
   proveedores (`suppliers`) — ¿se mantienen o se borran?
2. Historial: movimientos (`inventoryMovements`), ventas (`sales`),
   compras (`purchases`) — ¿se mantienen o se vacían?

Recién con eso confirmado, escribir el script.

## Scripts existentes en `scripts/`

| Script | Mantiene | Vacía |
|---|---|---|
| `reset-to-empty.js` | Nada — estado completamente vacío | Todo: catálogo, recetas, proveedores, movimientos, ventas, compras |
| `reset-quantities-and-history.js` | Catálogo, recetas, proveedores | Movimientos (→ stock en 0), ventas, compras |

Si se necesita una combinación distinta, escribir un script nuevo
siguiendo el mismo patrón (ver abajo) en vez de modificar el alcance de
uno existente — así el nombre del archivo sigue describiendo
exactamente lo que hace.

## Patrón para escribir un script de reset nuevo

```js
import { normalizeLoadedState } from "../src/state/appState.js";
import { loadState, saveState } from "../server/persistence.js";

const current = loadState();

const resetState = normalizeLoadedState({
  // Campos que se mantienen: pasar current.<campo> tal cual
  // Campos que se vacían: pasar []
});

saveState(resetState);
```

`normalizeLoadedState` valida y completa cualquier campo faltante — no
hace falta reconstruir el objeto entero a mano.

## Antes de entregar el script al usuario

1. **Requiere que el servidor esté detenido** mientras corre (evita dos
   procesos escribiendo el mismo archivo).
2. **Probarlo en este entorno primero**, simulando un estado con datos
   (no vacío) — cargar con `loadState()` sobre un `server/data/`
   recién creado (usa el catálogo por defecto de `appState.js` si no
   hay archivo previo), correr el script, y verificar con
   `buildInventorySnapshot` u otra consulta que el resultado sea
   exactamente el esperado (qué quedó, qué se vació, que el stock
   derivado dé 0 si corresponde).
3. **Recomendar backup antes de correr** (Panel → Respaldar Datos) —
   siempre, incluso cuando el alcance ya está confirmado.
