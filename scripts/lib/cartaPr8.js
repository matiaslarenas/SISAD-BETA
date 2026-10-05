/**
 * Cambios de carta del PR #8 (carpetas por categoría), para aplicarlos a
 * un estado que ya existe (el app-state.json del computador B).
 *
 * La semilla (src/data/) solo se usa cuando el estado no trae catálogo,
 * así que una instalación en uso no recibe estos cambios sola. Este
 * módulo calcula qué cambiar sin pisar lo que se editó desde la app:
 *
 *   - Un campo se actualiza solo si todavía tiene el valor viejo de la
 *     semilla ("from"). Si ya tiene el valor nuevo, se informa como
 *     aplicado. Si tiene otro valor, es un conflicto y la receta no se
 *     toca.
 *   - Productos y recetas nuevos se agregan solo si su id no existe y no
 *     hay otro con el mismo nombre.
 *   - No se borra nada. Las dos recetas renombradas (Pizza Con Todo y
 *     Batido con Leche) se actualizan conservando su id, para no romper
 *     el historial de ventas ni los tickets pendientes que las usan.
 *   - Al final se valida que cada receta tocada tenga sus productos y
 *     recetas base, y que las unidades contra una receta base coincidan
 *     con su rendimiento (flattenRecipeIngredients no convierte esas
 *     unidades). Un cambio que no pasa la validación se descarta, junto
 *     con lo que dependa de él.
 *
 * Es una función pura: no lee ni escribe archivos. El script
 * scripts/actualizar-carta-pr8.js se encarga de eso.
 */
import { createDefaultAppState } from "../../src/state/appState.js";

// Valores de la semilla anterior a #8 (main). Los valores nuevos se toman
// de la semilla actual, para no duplicarlos aquí.
const FETUCCINI_UN = { baseRecipeId: "BASE_FETUCCINI", quantity: 1, unit: "un" };

export const RECIPE_UPDATES = [
  { id: "BASE_FETUCCINI", from: { yieldQuantity: 10, yieldUnit: "un" } },
  { id: "REC_EMP_QUESO", from: { salePrice: 3000 } },
  { id: "REC_EMP_QUESO_CAMARON", from: { salePrice: 3800 } },
  { id: "REC_EMP_QUESO_CHAMPINON", from: { salePrice: 3300 } },
  { id: "REC_EMP_NAPOLITANA", from: { salePrice: 3500 } },
  { id: "REC_PAPAS_INDIVIDUAL", from: { category: "Acompañamientos" } },
  { id: "REC_PAPAS_2_PERSONAS", from: { category: "Acompañamientos" } },
  { id: "REC_PAPAS_4_PERSONAS", from: { category: "Acompañamientos" } },
  { id: "REC_PAPAS_CHEDDAR", from: { category: "Acompañamientos" } },
  { id: "REC_PALITOS_MOZZARELLA", from: { category: "Acompañamientos" } },
  { id: "REC_ARITOS_CEBOLLA", from: { category: "Acompañamientos" } },
  {
    id: "REC_ALM_FIDEOS_BOLOÑESA",
    from: {
      ingredients: [
        FETUCCINI_UN,
        { productId: "INV016", quantity: 120, unit: "gr" },
        { productId: "INV032", quantity: 100, unit: "gr" },
      ],
    },
  },
  {
    id: "REC_ALM_FIDEOS_PESTO",
    from: {
      ingredients: [
        FETUCCINI_UN,
        { productId: "INV091", quantity: 40, unit: "gr" },
        { productId: "INV074", quantity: 20, unit: "gr" },
        { productId: "INV004", quantity: 20, unit: "ml" },
      ],
    },
  },
  {
    id: "REC_PIZZA_CON_TODO",
    seedId: "REC_PIZZA_CON_TODO_CARNE",
    from: {
      name: "Pizza Con Todo",
      salePrice: 14000,
      ingredients: [
        { baseRecipeId: "BASE_PIZZA_DOUGH", quantity: 1, unit: "un" },
        { baseRecipeId: "BASE_PIZZA_SAUCE", quantity: 150, unit: "ml" },
        { productId: "INV002", quantity: 200, unit: "gr" },
        { productId: "INV015", quantity: 80, unit: "gr" },
        { productId: "INV064", quantity: 60, unit: "gr" },
        { productId: "INV066", quantity: 60, unit: "gr" },
        { productId: "INV014", quantity: 40, unit: "gr" },
      ],
    },
  },
  {
    id: "REC_BATIDO_LECHE",
    seedId: "REC_BATIDO_FRUTILLA",
    from: { name: "Batido con Leche (480cc)" },
  },
];

export const RECIPE_ADDS = [
  "BASE_PINO_CARNE",
  "REC_PIZZA_CON_TODO_POLLO",
  "REC_PIZZA_CON_TODO_CAMARON",
  "REC_EMP_PINO",
  "REC_BATIDO_FRAMBUESA",
  "REC_BATIDO_ARANDANO",
  "REC_BATIDO_PLATANO",
  "REC_LIMONADA_MENTA_FRAMBUESA",
  "REC_FETTUCCINNI_CASERO",
];

export const PRODUCT_ADDS = ["INV099", "INV100"];

function unitToken(unit) {
  const raw = String(unit ?? "").trim().toLowerCase();
  if (["g", "gr", "gramo", "gramos"].includes(raw)) return "gr";
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(raw)) return "kg";
  if (["l", "lt", "litro", "litros"].includes(raw)) return "lt";
  if (["ml", "cc", "mililitro", "mililitros"].includes(raw)) return "ml";
  if (["u", "un", "unidad", "unidades", "und"].includes(raw)) return "un";
  return raw;
}

function comparable(field, value) {
  if (field === "ingredients") {
    return JSON.stringify(
      (value || []).map((ing) => [
        ing.baseRecipeId ? "base" : "product",
        ing.baseRecipeId || ing.productId || ing.inventoryId,
        Number(ing.quantity),
        unitToken(ing.unit),
      ])
    );
  }
  if (field === "yieldUnit") return unitToken(value);
  if (typeof value === "number") return value;
  if (field === "salePrice" || field === "yieldQuantity") return Number(value);
  return String(value ?? "").trim();
}

const sameValue = (field, a, b) => comparable(field, a) === comparable(field, b);
const sameName = (a, b) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// Clasifica cada cambio contra el estado actual, sin aplicarlo todavía.
function classify(state, seed) {
  const seedRecipe = (id) => seed.recipes.find((r) => r.id === id);
  const seedProduct = (id) => seed.inventoryCatalog.find((p) => p.id === id);
  const changes = [];

  for (const id of PRODUCT_ADDS) {
    const product = seedProduct(id);
    const byId = state.inventoryCatalog.find((p) => p.id === id);
    const byName = state.inventoryCatalog.find((p) => sameName(p.item, product.item));
    if (byId && sameName(byId.item, product.item)) {
      changes.push({ kind: "addProduct", id, status: "ya_aplicado" });
    } else if (byId) {
      changes.push({ kind: "addProduct", id, status: "conflicto",
        reason: `el id ${id} ya existe como "${byId.item}"` });
    } else if (byName) {
      changes.push({ kind: "addProduct", id, status: "conflicto",
        reason: `ya existe "${byName.item}" con otro id (${byName.id})` });
    } else {
      changes.push({ kind: "addProduct", id, status: "pendiente", product });
    }
  }

  for (const update of RECIPE_UPDATES) {
    const current = state.recipes.find((r) => r.id === update.id);
    const target = seedRecipe(update.seedId || update.id);
    const fields = Object.keys(update.from);
    if (!current) {
      changes.push({ kind: "updateRecipe", id: update.id, status: "omitido",
        reason: "la receta no existe en este estado" });
      continue;
    }
    const conflicts = fields.filter(
      (f) => !sameValue(f, current[f], update.from[f]) && !sameValue(f, current[f], target[f])
    );
    const pendingFields = fields.filter((f) => !sameValue(f, current[f], target[f]));
    if (conflicts.length) {
      const detail = conflicts.map((f) =>
        f === "ingredients"
          ? "ingredientes"
          : `${f} es ${JSON.stringify(current[f])} (antes ${JSON.stringify(update.from[f])}, nuevo ${JSON.stringify(target[f])})`
      );
      changes.push({ kind: "updateRecipe", id: update.id, status: "conflicto",
        reason: `editado desde la app: ${detail.join(", ")}` });
    } else if (!pendingFields.length) {
      changes.push({ kind: "updateRecipe", id: update.id, status: "ya_aplicado" });
    } else {
      const patch = Object.fromEntries(pendingFields.map((f) => [f, target[f]]));
      changes.push({ kind: "updateRecipe", id: update.id, status: "pendiente", patch,
        before: Object.fromEntries(pendingFields.map((f) => [f, current[f]])) });
    }
  }

  for (const id of RECIPE_ADDS) {
    const recipe = seedRecipe(id);
    const byId = state.recipes.find((r) => r.id === id);
    const byName = state.recipes.find((r) => sameName(r.name, recipe.name));
    if (byId && sameName(byId.name, recipe.name)) {
      changes.push({ kind: "addRecipe", id, status: "ya_aplicado" });
    } else if (byId) {
      changes.push({ kind: "addRecipe", id, status: "conflicto",
        reason: `el id ${id} ya existe como "${byId.name}"` });
    } else if (byName) {
      changes.push({ kind: "addRecipe", id, status: "conflicto",
        reason: `ya existe "${byName.name}" con otro id (${byName.id})` });
    } else {
      changes.push({ kind: "addRecipe", id, status: "pendiente", recipe });
    }
  }

  return changes;
}

function applyChanges(state, changes) {
  const accepted = changes.filter((c) => c.status === "pendiente");
  const patches = new Map(
    accepted.filter((c) => c.kind === "updateRecipe").map((c) => [c.id, c.patch])
  );
  return {
    ...state,
    inventoryCatalog: [
      ...state.inventoryCatalog,
      ...accepted.filter((c) => c.kind === "addProduct").map((c) => c.product),
    ],
    recipes: [
      ...state.recipes.map((r) => (patches.has(r.id) ? { ...r, ...patches.get(r.id) } : r)),
      ...accepted.filter((c) => c.kind === "addRecipe").map((c) => c.recipe),
    ],
  };
}

// Problemas que dejaría un cambio pendiente en el estado resultante.
// `blocked` son ids que este script debía agregar y no agregó: si el id
// existe es porque otro producto o receta lo ocupa, y usarlo sería
// descontar algo distinto (por ejemplo, servilletas en vez de fideos).
function findProblems(next, change, blocked) {
  const recipesById = new Map(
    next.recipes.filter((r) => !blocked.has(r.id)).map((r) => [r.id, r])
  );
  const productIds = new Set(
    next.inventoryCatalog.map((p) => p.id).filter((id) => !blocked.has(id))
  );
  const problems = [];

  const checkRecipe = (recipe) => {
    for (const ing of recipe.ingredients || []) {
      if (ing.baseRecipeId) {
        const base = recipesById.get(ing.baseRecipeId);
        if (!base) {
          problems.push(`${recipe.id} usa la receta base ${ing.baseRecipeId}, que no existe`);
        } else if (unitToken(ing.unit) !== unitToken(base.yieldUnit)) {
          problems.push(
            `${recipe.id} usa ${ing.baseRecipeId} en "${ing.unit}", pero rinde en "${base.yieldUnit}"`
          );
        }
      } else if (!productIds.has(ing.productId || ing.inventoryId)) {
        problems.push(`${recipe.id} usa el producto ${ing.productId || ing.inventoryId}, que no existe`);
      }
    }
  };

  if (change.kind === "addRecipe" || change.kind === "updateRecipe") {
    checkRecipe(recipesById.get(change.id));
  }
  // Si cambia el rendimiento de una base, toda receta que la use debe
  // seguir en la misma unidad, aunque este script no la toque.
  if (change.kind === "updateRecipe" && change.patch.yieldUnit !== undefined) {
    for (const recipe of next.recipes) {
      if (recipe.id === change.id) continue;
      if ((recipe.ingredients || []).some((ing) => ing.baseRecipeId === change.id)) {
        checkRecipe(recipe);
      }
    }
  }
  return problems;
}

/**
 * Calcula el estado con la carta de #8 aplicada y un informe por cambio.
 * `state` debe venir de normalizeLoadedState. Cada cambio del informe
 * queda como: aplicar, ya_aplicado, conflicto, omitido o descartado.
 */
export function planCartaPr8(state, seed = createDefaultAppState()) {
  const changes = classify(state, seed);

  // Descarta cambios que dejarían el estado inconsistente y repite, porque
  // descartar uno (por ejemplo, el rendimiento del fetuccini) puede dejar
  // sin sustento a otro que dependía de él.
  for (;;) {
    const next = applyChanges(state, changes);
    const blocked = new Set(
      changes
        .filter((c) => c.kind !== "updateRecipe")
        .filter((c) => c.status !== "pendiente" && c.status !== "ya_aplicado")
        .map((c) => c.id)
    );
    let dropped = false;
    for (const change of changes) {
      if (change.status !== "pendiente") continue;
      const problems = findProblems(next, change, blocked);
      if (problems.length) {
        change.status = "descartado";
        change.reason = problems.join("; ");
        dropped = true;
      }
    }
    if (!dropped) {
      for (const change of changes) {
        if (change.status === "pendiente") change.status = "aplicar";
      }
      return { nextState: next, changes };
    }
  }
}
