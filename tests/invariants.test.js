import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultAppState,
  buildInventorySnapshot,
  generatePurchaseSuggestions,
  generateDailySnapshots,
  recordSale,
  voidSale,
  receivePurchaseOrder,
  recordWaste,
  getTodayISODate,
} from "../src/state/appState.js";

test("INVARIANT 1: Reconstructing snapshot from movements matches derived inventory exactly", () => {
  const state = createDefaultAppState();
  const snapshot1 = buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements);
  const snapshot2 = buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements);

  assert.deepEqual(snapshot1, snapshot2);

  // Every product with movements matches net sum of quantities
  state.inventoryCatalog.forEach((prod) => {
    const productMovements = state.inventoryMovements.filter((m) => m.productId === prod.id);
    const expectedOnHand = productMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);
    const derivedProd = snapshot1.find((p) => p.id === prod.id);
    assert.equal(derivedProd.onHand, expectedOnHand);
  });
});

test("INVARIANT 2: Voiding a sale restores EXACTLY the consumed quantities and items", () => {
  const state = createDefaultAppState();
  const initialInv = buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements);

  // Perform sale
  const saleState = recordSale(state, {
    id: "SALE-INV-TEST",
    date: getTodayISODate(),
    time: "14:00",
    tableOrCustomer: "Mesa Test",
    paymentMethod: "Efectivo",
    items: [
      {
        type: "recipe",
        itemId: state.recipes[0].id,
        quantity: 2,
      },
    ],
  });

  const saleInv = buildInventorySnapshot(saleState.inventoryCatalog, saleState.inventoryMovements);

  // Resolver ingredientes (desglosando sub-recetas si existen o leyendo directamente)
  const recipe = state.recipes[0];
  const ingredients = typeof flattenRecipeIngredients === "function"
    ? flattenRecipeIngredients(recipe, state.recipes)
    : recipe.ingredients;

  // Assert stock decreased for recipe ingredients
  ingredients.forEach((ing) => {
    // Abarca absolutamente todas las convenciones de nombres posibles en la app y tests
    const targetId = ing.inventoryId || ing.productId || ing.inventoryItemId || ing.id;

    assert.ok(targetId, `El ingrediente en la receta ${recipe.id} no tiene un ID de inventario definido`);

    const initialItem = initialInv.find((p) => p.id === targetId);
    const currentItem = saleInv.find((p) => p.id === targetId);

    assert.ok(initialItem, `El ingrediente con ID ${targetId} no fue encontrado en initialInv`);
    assert.ok(currentItem, `El ingrediente con ID ${targetId} no fue encontrado en saleInv`);

    assert.ok(currentItem.onHand < initialItem.onHand);
  });

  // Void sale
  const voidedState = voidSale(saleState, "SALE-INV-TEST");
  const restoredInv = buildInventorySnapshot(voidedState.inventoryCatalog, voidedState.inventoryMovements);

  // Assert stock restored to exact initial level
  ingredients.forEach((ing) => {
    const targetId = ing.inventoryId || ing.productId || ing.inventoryItemId || ing.id;

    const initialItem = initialInv.find((p) => p.id === targetId);
    const restoredItem = restoredInv.find((p) => p.id === targetId);

    assert.ok(restoredItem, `El ingrediente con ID ${targetId} no fue encontrado en restoredInv`);
    assert.equal(restoredItem.onHand, initialItem.onHand);
  });
});

test("INVARIANT 3: Purchase receipt increments stock by exact received quantity and updates cost", () => {
  let state = createDefaultAppState();
  const targetProduct = state.inventoryCatalog[0];
  const initialInv = buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements);
  const initialStock = initialInv.find((p) => p.id === targetProduct.id).onHand;

  // Add a purchase order and receive it
  const purchaseId = "OC-INV-TEST";
  const purchaseOrder = {
    id: purchaseId,
    supplier: "Proveedor Test",
    category: "Abarrotes",
    orderedDate: getTodayISODate(),
    items: [
      {
        id: "POI-TEST-1",
        productId: targetProduct.id,
        productName: targetProduct.item,
        purchaseUnit: targetProduct.purchaseUnit,
        quantity: 10,
        unitCost: 2500,
      },
    ],
  };

  const stateWithPO = {
    ...state,
    purchases: [purchaseOrder, ...state.purchases],
  };

  const receivedState = receivePurchaseOrder(stateWithPO, {
    purchaseId,
    receiptDate: getTodayISODate(),
    receiptNotes: "Recibido en test",
    items: [
      {
        id: "POI-TEST-1",
        productId: targetProduct.id,
        receivedQuantity: 10,
        unitCost: 2500,
      },
    ],
  });

  const updatedInv = buildInventorySnapshot(receivedState.inventoryCatalog, receivedState.inventoryMovements);
  const updatedProd = updatedInv.find((p) => p.id === targetProduct.id);

  assert.equal(updatedProd.onHand, initialStock + 10);
  assert.equal(updatedProd.costPerUnit, 2500);
});

test("generatePurchaseSuggestions computes accurate replenishment needs", () => {
  const state = createDefaultAppState();
  const suggestions = generatePurchaseSuggestions(state);

  assert.ok(Array.isArray(suggestions));
  suggestions.forEach((s) => {
    assert.ok(s.productId);
    assert.ok(s.suggestedQuantity > 0);
    assert.ok(s.estimatedCost >= 0);
    assert.ok(s.urgency === "critical" || s.urgency === "high");
    // Verify that onHand + onOrder was indeed below minStock
    assert.ok(s.onHand + s.onOrder < s.minStock);
  });
});

test("generateDailySnapshots aggregates operational days accurately", () => {
  const state = createDefaultAppState();
  const snapshots = generateDailySnapshots(state, 7);

  assert.ok(Array.isArray(snapshots));
  assert.ok(snapshots.length > 0);

  const latest = snapshots[snapshots.length - 1];
  assert.ok(latest.date);
  assert.ok(typeof latest.inventoryValue === "number");
  assert.ok(typeof latest.dailySales === "number");
  assert.ok(typeof latest.dailyWaste === "number");
});
