---
name: meson-reglas-negocio
description: Usar al implementar o corregir cálculos de stock, costeo de recetas, sugerencias de compra, alertas operacionales, o al ver un margen/costo que parece desproporcionado. Da las fórmulas ya definidas para el Sistema Restaurante El Mesón de Los Laureles, para no reinventarlas ni introducir inconsistencias.
---

# Reglas de negocio — El Mesón de Los Laureles

Documento completo de referencia: `docs/REGLAS_DE_NEGOCIO.md`. Léelo antes
de escribir o modificar una fórmula si no lo tienes en contexto.

> Si `docs/` contradice el código o GitHub, vale el código o GitHub. El
> issue #17 "Estado SISAD" es el índice breve del proyecto.

## Fórmulas ya definidas — no reinventar

- **Stock**: `onHand = Σ(movimiento.quantity)` para todos los movimientos
  del producto.
- **Costo vigente**: `unitCost` del último movimiento que modificó el
  producto (recepción de compra o ajuste manual).
- **Proveedor habitual**: recibir una compra **no** cambia el `supplier`
  del producto; el proveedor de cada compra queda en la compra misma. Solo
  si el producto no tenía proveedor se toma el de la compra (issue #13).
- **Costo de receta**: `Σ(ingredient.quantity_normalizada * ingredient.unitCost)`.
  La normalización de unidades pasa siempre por `normalizeQuantity` en
  `recipeCalculator.js` — nunca multipliques cantidades sin verificar que
  la unidad de receta y la unidad de compra del producto coincidan o se
  hayan convertido.
- **Porciones máximas**: mínimo entre `ingredient.onHand / quantityPerUnit`
  de todos los ingredientes (el "cuello de botella").
- **Vender sobre el stock (issue #15, opción 1)**: el POS **avisa y deja
  continuar** tras confirmar; el stock puede quedar negativo. El servidor
  no rechaza tickets por falta de stock. Así se queda mientras el stock del
  computador B no esté validado; reconsiderar tope en la UI o rechazo en el
  servidor después. Al editar un ticket pendiente, lo que ese ticket ya
  reservó cuenta como disponible (`buildTicketInventory`). El aviso revisa
  cada plato por separado (`getTicketStockWarnings` en `appState.js`): dos
  platos que comparten ingrediente pueden no alcanzar juntos.
- **Déficit de compra**: `max(0, minStock - (onHand + onOrder)) + safetyMargin`.

## Señal de alerta al revisar costos

Si un plato/bebida muestra un margen >95% o negativo, sospecha primero de
un mismatch de unidades (masa vs. volumen) entre la receta y el
`purchaseUnit` del producto en `src/data/inventoryData.js`, antes de asumir
que el precio de venta está mal puesto. Corre una auditoría rápida con
`calculateRecipeCost` sobre todo `recipesData` si tienes dudas — así se
encontró el bug de Limonada/Café Helado.

## Principios que no se negocian

1. Los costos históricos se congelan al momento del evento, nunca se
   recalculan retroactivamente.
2. No se inventan datos no medidos — mostrar `0`/`pending` es la respuesta
   correcta cuando falta información real (ej. sub-receta sin medir).
3. El inventario es siempre la fuente de verdad; nunca se edita
   directamente.
