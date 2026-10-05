import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultAppState } from "../src/state/appState.js";
import {
  planCartaPr8,
  PRODUCT_ADDS,
  RECIPE_ADDS,
  RECIPE_UPDATES,
} from "../scripts/lib/cartaPr8.js";

// Estado como el del computador B: catálogo con la carta anterior a #8.
// Se arma revirtiendo los cambios sobre la semilla actual.
function buildPrePr8State() {
  const seed = createDefaultAppState();
  const renamed = new Map(
    RECIPE_UPDATES.filter((u) => u.seedId).map((u) => [u.seedId, u.id])
  );
  const fromById = new Map(RECIPE_UPDATES.map((u) => [u.id, u.from]));
  return {
    ...seed,
    inventoryCatalog: seed.inventoryCatalog.filter((p) => !PRODUCT_ADDS.includes(p.id)),
    recipes: seed.recipes
      .filter((r) => !RECIPE_ADDS.includes(r.id))
      .map((r) => {
        const id = renamed.get(r.id) || r.id;
        return fromById.has(id) ? { ...r, id, ...fromById.get(id) } : r;
      }),
  };
}

const byStatus = (changes, status) =>
  changes.filter((c) => c.status === status).map((c) => c.id);
const recipe = (state, id) => state.recipes.find((r) => r.id === id);
const withRecipe = (state, id, patch) => ({
  ...state,
  recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
});

test("carta #8: sobre la carta anterior aplica todos los cambios", () => {
  const { nextState, changes } = planCartaPr8(buildPrePr8State());

  assert.deepEqual(
    changes.filter((c) => c.status !== "aplicar"),
    []
  );
  assert.equal(recipe(nextState, "REC_EMP_QUESO").salePrice, 2000);
  assert.equal(recipe(nextState, "REC_PAPAS_CHEDDAR").category, "Papas Fritas");
  assert.equal(recipe(nextState, "BASE_FETUCCINI").yieldQuantity, 920);
  assert.equal(recipe(nextState, "BASE_FETUCCINI").yieldUnit, "gr");
  assert.equal(recipe(nextState, "REC_FETTUCCINNI_CASERO").salePrice, 8500);
  assert.ok(nextState.inventoryCatalog.some((p) => p.id === "INV100"));
});

test("carta #8: las recetas renombradas conservan su id", () => {
  const { nextState } = planCartaPr8(buildPrePr8State());

  assert.equal(recipe(nextState, "REC_PIZZA_CON_TODO").name, "Pizza con Todo Carne");
  assert.equal(recipe(nextState, "REC_PIZZA_CON_TODO").salePrice, 13500);
  assert.equal(recipe(nextState, "REC_BATIDO_LECHE").name, "Batido de Frutilla (480cc)");
  assert.equal(recipe(nextState, "REC_PIZZA_CON_TODO_CARNE"), undefined);
});

test("carta #8: correr dos veces no cambia nada la segunda vez", () => {
  const first = planCartaPr8(buildPrePr8State()).nextState;
  const { nextState, changes } = planCartaPr8(first);

  assert.deepEqual(byStatus(changes, "aplicar"), []);
  assert.deepEqual(nextState, first);
});

test("carta #8: no toca ventas, compras ni movimientos", () => {
  const before = buildPrePr8State();
  const { nextState } = planCartaPr8(before);

  assert.equal(nextState.sales, before.sales);
  assert.equal(nextState.purchases, before.purchases);
  assert.equal(nextState.inventoryMovements, before.inventoryMovements);
  assert.equal(nextState.suppliers, before.suppliers);
});

test("carta #8: un precio editado desde la app no se pisa", () => {
  const edited = withRecipe(buildPrePr8State(), "REC_EMP_QUESO", { salePrice: 2200 });
  const { nextState, changes } = planCartaPr8(edited);

  assert.deepEqual(byStatus(changes, "conflicto"), ["REC_EMP_QUESO"]);
  assert.equal(recipe(nextState, "REC_EMP_QUESO").salePrice, 2200);
  assert.equal(recipe(nextState, "REC_EMP_NAPOLITANA").salePrice, 2500);
});

test("carta #8: no cambia el rendimiento del fetuccini si una receta lo sigue usando por unidad", () => {
  // Fideos Boloñesa editado desde la app: queda con BASE_FETUCCINI en "un".
  const edited = withRecipe(buildPrePr8State(), "REC_ALM_FIDEOS_BOLOÑESA", {
    ingredients: [
      { baseRecipeId: "BASE_FETUCCINI", quantity: 1, unit: "un" },
      { productId: "INV016", quantity: 150, unit: "gr" },
    ],
  });
  const { nextState, changes } = planCartaPr8(edited);

  assert.deepEqual(byStatus(changes, "conflicto"), ["REC_ALM_FIDEOS_BOLOÑESA"]);
  assert.deepEqual(byStatus(changes, "descartado"), ["BASE_FETUCCINI", "REC_FETTUCCINNI_CASERO"]);
  assert.equal(recipe(nextState, "BASE_FETUCCINI").yieldUnit, "un");
  assert.equal(recipe(nextState, "REC_FETTUCCINNI_CASERO"), undefined);
});

test("carta #8: si el id de un producto nuevo está ocupado, descarta lo que depende de él", () => {
  const state = buildPrePr8State();
  const taken = {
    ...state,
    inventoryCatalog: [
      ...state.inventoryCatalog,
      { ...state.inventoryCatalog[0], id: "INV099", item: "Servilletas" },
    ],
  };
  const { nextState, changes } = planCartaPr8(taken);

  assert.deepEqual(byStatus(changes, "conflicto"), ["INV099"]);
  // Los fideos usan INV099; sin ellos, el fetuccini sigue usándose por
  // unidad, así que tampoco cambia su rendimiento ni se agrega el casero.
  assert.deepEqual(byStatus(changes, "descartado").sort(), [
    "BASE_FETUCCINI",
    "REC_ALM_FIDEOS_BOLOÑESA",
    "REC_ALM_FIDEOS_PESTO",
    "REC_FETTUCCINNI_CASERO",
  ]);
  assert.equal(
    nextState.inventoryCatalog.find((p) => p.id === "INV099").item,
    "Servilletas"
  );
});

test("carta #8: no duplica una receta creada desde la app con otro id", () => {
  const state = buildPrePr8State();
  const manual = {
    ...state,
    recipes: [...state.recipes, { ...recipe(state, "REC_PIZZA_MARGARITA"), id: "REC-123", name: "Pizza con todo pollo" }],
  };
  const { nextState, changes } = planCartaPr8(manual);

  assert.deepEqual(byStatus(changes, "conflicto"), ["REC_PIZZA_CON_TODO_POLLO"]);
  assert.equal(recipe(nextState, "REC_PIZZA_CON_TODO_POLLO"), undefined);
});
