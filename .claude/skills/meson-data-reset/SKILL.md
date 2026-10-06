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
| `reset-quantities-and-history.js` | Catálogo, recetas, proveedores | Movimientos (→ stock en 0), ventas, compras |

`reset-to-empty.js` (vaciar todo) se menciona en `CHANGELOG.md`, pero
**no existe** en el repo. Si hace falta, se escribe nuevo con el patrón
de abajo.

`reset-quantities-and-history.js` está protegido (issue #11):

- Sin `--confirm` solo muestra cuántos movimientos, ventas y compras
  vaciaría, y no escribe nada.
- Con `--confirm`, aborta si hay un servidor escuchando en `PORT` (o
  3000).
- Aborta si `server/data/app-state.json` no existe. No usa `loadState()`,
  porque esa función crea un estado por defecto cuando falta el archivo.
- Antes de guardar, copia el archivo a
  `app-state.backup-<fecha-hora>.json` (en `server/data/` o en
  `BACKUP_DIR`). Verifica que la copia sea idéntica y que el original no
  haya cambiado. Si algo no calza, no guarda.

Si se necesita una combinación distinta, escribir un script nuevo
siguiendo el mismo patrón (ver abajo) en vez de modificar el alcance de
uno existente — así el nombre del archivo sigue describiendo
exactamente lo que hace.

## Patrón para escribir un script de reset nuevo

Copiar la estructura de `reset-quantities-and-history.js` y cambiar
solo `createResetPlan` (qué campos se mantienen y cuáles se vacían):

```js
export function createResetPlan(current) {
  const resetState = normalizeLoadedState({
    // Campos que se mantienen: pasar current.<campo> tal cual
    // Campos que se vacían: pasar []
  });
  return { resetState, counts: { /* cuántos registros se vacían */ } };
}
```

Conservar las protecciones de `runReset`: `--confirm`, comprobar que el
servidor esté detenido, exigir que el archivo exista (nunca usar
`loadState()` en un script destructivo) y hacer un respaldo verificado
antes de `saveState`. `normalizeLoadedState` valida y completa cualquier
campo faltante — no hace falta reconstruir el objeto entero a mano.

## Antes de entregar el script al usuario

1. **Tests con `node:test`** sobre un directorio temporal, como en
   `tests/resetQuantities.test.js`: sin `--confirm` no escribe, aborta si
   falta el archivo o si el servidor responde, y el respaldo existe antes
   de guardar. Inyectar `checkServer` y `persist` para no tocar el
   estado real.
2. **No correr el script en este entorno contra `server/data/`.** Se
   corre a mano en el computador del restaurante, con el servidor
   detenido, primero sin `--confirm`.
3. **Recomendar además un respaldo desde el Panel** ("Respaldar JSON"),
   siempre, incluso cuando el alcance ya está confirmado.
