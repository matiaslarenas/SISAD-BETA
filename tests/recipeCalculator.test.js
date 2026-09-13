import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateBaseRecipeUnitCost,
  calculateMargin,
  calculateProfit,
  calculateRecipeCost,
  calculateRecipeMaxPortions,
  flattenRecipeIngredients,
  normalizeQuantity,
} from "../src/utils/recipeCalculator.js";

test("normalizeQuantity converts units correctly", () => {
  assert.equal(normalizeQuantity(500, "gr", "kg"), 0.5);
  assert.equal(normalizeQuantity(250, "ml", "lt"), 0.25);
  assert.equal(normalizeQuantity(3, "un", "un"), 3);
  assert.equal(normalizeQuantity(2, "kg", "kg"), 2);
});

test("normalizeQuantity converts across mass/volume families using a 1:1 density fallback", () => {
  // Regression test: ingredients measured in the recipe with one unit
  // family (mass or volume) but purchased/stocked in the other family
  // must not be left unconverted — that previously caused wildly
  // inflated costs (e.g. Café Helado, Limonada) by multiplying the raw
  // recipe quantity directly against a cost expressed in a different unit.

  // Crema de Leche: recipe measures 30 gr, but product is stocked per "lt".
  assert.equal(normalizeQuantity(30, "gr", "lt"), 0.03);
  // Limón Sutil: recipe measures 80 ml, but product is stocked per "kg".
  assert.equal(normalizeQuantity(80, "ml", "kg"), 0.08);
  // Inverse directions should also resolve to their base unit equivalent.
  assert.equal(normalizeQuantity(0.5, "lt", "gr"), 500);
  assert.equal(normalizeQuantity(0.5, "kg", "ml"), 500);
});

test("normalizeQuantity converts grams to purchase units using avgUnitWeightGr", () => {
  // 50 gr of a product purchased per unit (avg 180 gr/unit) should
  // become a fraction of a unit, not be treated as raw grams.
  assert.equal(normalizeQuantity(50, "gr", "un", 180), 50 / 180);
  assert.equal(normalizeQuantity(180, "gr", "un", 180), 1);
  // Without an avgUnitWeightGr, falls back to legacy behavior (unconverted).
  assert.equal(normalizeQuantity(50, "gr", "un"), 50);
});

test("calculateRecipeCost computes total ingredient costs accurately", () => {
  const inventory = [
    { id: "INV-1", purchaseUnit: "kg", costPerUnit: 10000 },
    { id: "INV-2", purchaseUnit: "lt", costPerUnit: 2000 },
    { id: "INV-3", purchaseUnit: "un", costPerUnit: 500 },
  ];

  const recipe = {
    ingredients: [
      { productId: "INV-1", quantity: 300, unit: "gr" }, // 0.3kg * 10000 = 3000
      { productId: "INV-2", quantity: 50, unit: "ml" },  // 0.05lt * 2000 = 100
      { productId: "INV-3", quantity: 2, unit: "un" },   // 2 * 500 = 1000
    ],
  };

  const cost = calculateRecipeCost(recipe, inventory);
  assert.equal(cost, 4100);
});

test("calculateMargin and calculateProfit compute commercial returns", () => {
  const cost = 3000;
  const salePrice = 10000;

  const profit = calculateProfit(cost, salePrice);
  assert.equal(profit, 7000);

  const margin = calculateMargin(cost, salePrice);
  assert.equal(margin, 70); // (10000 - 3000) / 10000 * 100 = 70%

  assert.equal(calculateMargin(cost, 0), 0);
});

test("calculateRecipeMaxPortions finds the bottleneck ingredient", () => {
  const inventory = [
    { id: "INV-1", onHand: 1, purchaseUnit: "kg" }, // 1000gr / 200gr = 5 portions
    { id: "INV-2", onHand: 10, purchaseUnit: "un" }, // 10 / 1 = 10 portions
  ];

  const recipe = {
    ingredients: [
      { productId: "INV-1", quantity: 200, unit: "gr" },
      { productId: "INV-2", quantity: 1, unit: "un" },
    ],
  };

  const portions = calculateRecipeMaxPortions(recipe, inventory);
  assert.equal(portions, 5);
});

test("flattenRecipeIngredients resolves a sub-recipe (base_recipe) into raw ingredients scaled by yield", () => {
  const baseRecipe = {
    id: "BASE_DOUGH",
    yieldQuantity: 4,
    yieldUnit: "un",
    ingredients: [
      { productId: "FLOUR", quantity: 1000, unit: "gr" },
      { productId: "WATER", quantity: 600, unit: "ml" },
    ],
  };

  const finalRecipe = {
    id: "PIZZA",
    ingredients: [
      { baseRecipeId: "BASE_DOUGH", quantity: 1, unit: "un" },
      { productId: "CHEESE", quantity: 250, unit: "gr" },
    ],
  };

  // Selling 3 pizzas should consume 3/4 of a dough batch worth of
  // flour and water, plus 3x the cheese.
  const flattened = flattenRecipeIngredients(
    finalRecipe,
    [baseRecipe, finalRecipe],
    3
  );

  const flour = flattened.find((i) => i.productId === "FLOUR");
  const water = flattened.find((i) => i.productId === "WATER");
  const cheese = flattened.find((i) => i.productId === "CHEESE");

  assert.equal(flour.quantity, (1000 / 4) * 3);
  assert.equal(water.quantity, (600 / 4) * 3);
  assert.equal(cheese.quantity, 250 * 3);
});

test("flattenRecipeIngredients ignores an unmeasured sub-recipe (no yieldQuantity) instead of guessing", () => {
  const pendingSauce = {
    id: "BASE_SAUCE",
    status: "pending_measurement",
    ingredients: [],
    // no yieldQuantity yet
  };

  const finalRecipe = {
    id: "PIZZA",
    ingredients: [
      { baseRecipeId: "BASE_SAUCE", quantity: 120, unit: "ml" },
      { productId: "CHEESE", quantity: 250, unit: "gr" },
    ],
  };

  const flattened = flattenRecipeIngredients(finalRecipe, [
    pendingSauce,
    finalRecipe,
  ]);

  assert.equal(flattened.length, 1);
  assert.equal(flattened[0].productId, "CHEESE");
});

test("flattenRecipeIngredients guards against circular sub-recipe references", () => {
  const recipeA = { id: "A", ingredients: [{ baseRecipeId: "B", quantity: 1, unit: "un" }], yieldQuantity: 1 };
  const recipeB = { id: "B", ingredients: [{ baseRecipeId: "A", quantity: 1, unit: "un" }], yieldQuantity: 1 };

  const flattened = flattenRecipeIngredients(recipeA, [recipeA, recipeB]);
  assert.deepEqual(flattened, []);
});

test("calculateRecipeCost and calculateBaseRecipeUnitCost resolve sub-recipe costs end-to-end", () => {
  const inventory = [
    { id: "FLOUR", purchaseUnit: "kg", costPerUnit: 1000 },
    { id: "WATER", purchaseUnit: "lt", costPerUnit: 50 },
    { id: "CHEESE", purchaseUnit: "kg", costPerUnit: 4000 },
  ];

  const baseRecipe = {
    id: "BASE_DOUGH",
    yieldQuantity: 4,
    yieldUnit: "un",
    ingredients: [
      { productId: "FLOUR", quantity: 1000, unit: "gr" }, // 1kg * 1000 = 1000
      { productId: "WATER", quantity: 600, unit: "ml" }, // 0.6lt * 50 = 30
    ],
  };
  // Batch cost = 1030, yields 4 -> 257.5 per dough unit.

  const finalRecipe = {
    id: "PIZZA",
    salePrice: 11000,
    ingredients: [
      { baseRecipeId: "BASE_DOUGH", quantity: 1, unit: "un" },
      { productId: "CHEESE", quantity: 250, unit: "gr" }, // 0.25kg * 4000 = 1000
    ],
  };

  const allRecipes = [baseRecipe, finalRecipe];

  assert.equal(
    calculateBaseRecipeUnitCost(baseRecipe, inventory, allRecipes),
    257.5
  );

  const cost = calculateRecipeCost(finalRecipe, inventory, allRecipes);
  assert.equal(cost, 257.5 + 1000);
});
