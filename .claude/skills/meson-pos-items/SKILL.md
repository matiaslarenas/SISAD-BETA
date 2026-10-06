---
name: meson-pos-items
description: Usar cuando el usuario pida agregar, crear o dar de alta un producto/plato/bebida nuevo para que aparezca en el POS del Sistema Restaurante El Mesón de Los Laureles (ej. "agrega tal producto"). Da los dos caminos posibles (receta vs. reventa directa), los campos obligatorios, cómo enlazar ingredientes existentes o nuevos, y qué no hace falta tocar porque se deriva solo.
---

# Agregar un ítem al POS — El Mesón de Los Laureles

## Antes de nada: ¿código o app en vivo?

Misma distinción que `meson-proveedores`.

- Si piden agregarlo **al código** (este chat, sin la app corriendo delante)
  → editar `src/data/recipesData.js` (Camino 1) o `src/data/inventoryData.js`
  (Camino 2/3).
- Si la app ya está corriendo y quieren que aparezca en su instalación
  actual → decirles que lo agreguen desde **Recetas → Nueva Receta** (o
  **Inventario → Nuevo Producto** tipo reventa) en la app; se guarda vía
  `POST /api/dispatch` en su `app-state.json`, que no está en el repo.
  Editar los archivos de semilla en ese caso no tiene ningún efecto sobre
  su instalación ya inicializada.

Si hay duda de cuál de los dos casos aplica, preguntar.

## Cómo llega un ítem al POS (no existe un archivo "POS" separado)

`src/pages/POS.jsx` arma la carta automáticamente a partir de:

1. `recipes` con `type !== "base_recipe"` (cualquier `category`; el filtro
   de categorías del POS las junta solas, no hay que registrarlas aparte).
2. `inventory` con `type === "resale"`.

Es decir: **agregar la entrada correcta en `recipesData.js` (o
`inventoryData.js`) es suficiente.** No hay un paso adicional de
"registrar en el POS".

## Camino 1 — Plato/bebida preparado (el caso más común)

Agregar un objeto al array `recipesData` en `src/data/recipesData.js`:

```js
{
    "id": "REC_XXX",              // único, prefijo REC_, MAYÚSCULAS_CON_GUION_BAJO
    "name": "Nombre visible en el POS",
    "category": "Pizzas",         // reusa una categoría existente salvo que el usuario pida una nueva
    "type": "recipe",
    "status": "active",           // "pending_measurement" si falta medir la receta
    "salePrice": 13500,
    "yieldQuantity": 1,
    "yieldUnit": "un",
    "ingredients": [
        { "productId": "INVxxx", "quantity": 200, "unit": "gr" },              // ingrediente directo de inventoryData.js
        { "baseRecipeId": "BASE_PIZZA_DOUGH", "quantity": 1, "unit": "un" }    // o una base_recipe reutilizable (masa, salsa)
    ]
}
```

Reglas:

- Cada `productId` debe existir en `src/data/inventoryData.js`. Si el
  ingrediente no existe todavía, créalo primero ahí (Camino 3) — no
  inventes IDs.
- La `unit` de cada ingrediente debe ser convertible por `normalizeQuantity`
  (`recipeCalculator.js`) a la `purchaseUnit` del producto. El mismatch
  masa↔volumen es la causa #1 de márgenes rotos — ver `meson-reglas-negocio`.
- El POS calcula solo las porciones máximas disponibles
  (`calculateRecipeMaxPortions`, el ingrediente "cuello de botella"); no
  hay que precalcular stock a mano.
- `salePrice` se fija a mano, no hay fórmula de margen obligatoria. Si el
  usuario no da un precio, calcula el costo con `calculateRecipeCost` y
  aplica un margen parecido al de platos similares — revisa el umbral de
  alerta de margen >95%/negativo en `meson-reglas-negocio` antes de
  proponer un precio.
- Si el plato reutiliza masa/salsa ya existentes (`BASE_PIZZA_DOUGH`,
  `BASE_PIZZA_SAUCE`, etc.), enlázalas por `baseRecipeId` en vez de
  duplicar sus ingredientes dentro de la receta nueva.

## Camino 2 — Reventa directa (ej. bebida embotellada, sin preparación)

Agregar en `src/data/inventoryData.js` con `type: "resale"`:

```js
{ id: "INVxxx", item: "Nombre visible en el POS", type: "resale", category: "Bebidas", supplier: "", location: "Bodega", purchaseUnit: "un", costPerUnit: 1200, onHand: 0, minStock: 12 }
```

- El precio de venta en el POS **no se guarda a mano**: se calcula siempre
  como `Math.round(costPerUnit * 1.6)` (60% de margen fijo, en
  `POS.jsx`). Si el usuario pide otro margen puntual para este ítem, avisa
  que hoy no existe campo para overridearlo por producto — habría que
  tocar `POS.jsx`.
- `onHand` arranca en `0` porque el stock real se deriva de movimientos,
  nunca se escribe directo (ver `meson-arquitectura`). Para que aparezca
  con stock disponible hay que registrar una compra/recepción o un ajuste
  desde la app, no editar `onHand` en el archivo.

## Camino 3 — El ingrediente que necesita el plato nuevo no existe todavía

Agregarlo en `inventoryData.js` con `type: "ingredient"` (mismos campos
que el Camino 2, salvo que se venda/mida por unidad y haya que convertir
a gramos — ver `INV006` Pimentón Rojo con `avgUnitWeightGr` como ejemplo
de esa conversión). Usar el siguiente `INVxxx` libre en el correlativo
existente.

## IDs

- Recetas: `REC_<descripción en mayúsculas>`, único en el archivo. Si hay
  variantes del mismo plato (ej. distinta proteína), usa un sufijo
  distintivo (`REC_PIZZA_CON_TODO_CARNE`, `_POLLO`, `_CAMARON`) en vez de
  IDs genéricos ambiguos.
- Bases reutilizables (masa, salsa): ya existen como `BASE_*` — reusar si
  aplica en vez de duplicar ingredientes en cada receta.
- Inventario: `INV0xx` siguiendo el correlativo existente — revisa el
  último ID usado en `inventoryData.js` antes de asignar uno nuevo.

## Después de editar

Correr `npm test` (ver `meson-testing`). No valida los datos en sí
(nombres, precios, si el plato "tiene sentido"), pero confirma que no se
rompió nada en `normalizeRecipe`/`calculateRecipeCost`/
`calculateRecipeMaxPortions` al tocar los archivos de semilla.
