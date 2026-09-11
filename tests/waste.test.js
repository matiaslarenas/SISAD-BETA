import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultAppState,
  recordWaste,
  WASTE_REASONS,
  buildInventorySnapshot,
} from "../src/state/appState.js";
import {
  validateWasteForm,
  hasValidationErrors,
} from "../src/utils/validation.js";

test("validateWasteForm validates inputs and stock bounds properly", () => {
  const availableStock = 5;

  // Missing product
  const noProductErrors = validateWasteForm(
    { productId: "", quantity: 2, reason: WASTE_REASONS[0] },
    availableStock
  );
  assert.equal(hasValidationErrors(noProductErrors), true);
  assert.ok(noProductErrors.productId);

  // Invalid / zero / negative quantity
  const invalidQtyErrors = validateWasteForm(
    { productId: "INV001", quantity: 0, reason: WASTE_REASONS[0] },
    availableStock
  );
  assert.equal(hasValidationErrors(invalidQtyErrors), true);
  assert.ok(invalidQtyErrors.quantity);

  // Exceeding available stock
  const excessQtyErrors = validateWasteForm(
    { productId: "INV001", quantity: 8, reason: WASTE_REASONS[0] },
    availableStock
  );
  assert.equal(hasValidationErrors(excessQtyErrors), true);
  assert.match(excessQtyErrors.quantity, /no puede superar/i);

  // Missing reason
  const noReasonErrors = validateWasteForm(
    { productId: "INV001", quantity: 2, reason: "" },
    availableStock
  );
  assert.equal(hasValidationErrors(noReasonErrors), true);
  assert.ok(noReasonErrors.reason);

  // Valid form
  const validErrors = validateWasteForm(
    { productId: "INV001", quantity: 2, reason: WASTE_REASONS[0], notes: "Merma de prueba" },
    availableStock
  );
  assert.equal(hasValidationErrors(validErrors), false);
  assert.equal(Object.keys(validErrors).length, 0);
});

test("recordWaste creates a waste movement and updates derived stock with frozen cost", () => {
  const state = createDefaultAppState();
  const initialStock = buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements).find((p) => p.id === "INV001").onHand;

  const wastePayload = {
    productId: "INV001",
    quantity: 1.5,
    reason: "Preparación fallida",
    notes: "Masa quemada en horno",
  };

  const nextState = recordWaste(state, wastePayload);

  // Verify a movement of type 'waste' was appended with negative quantity
  const wasteMovement = nextState.inventoryMovements.find((m) => m.type === "waste" && m.source === "inventory_waste");
  assert.ok(wasteMovement);
  assert.equal(wasteMovement.productId, "INV001");
  assert.equal(wasteMovement.quantity, -1.5);
  assert.equal(wasteMovement.source, "inventory_waste");
  assert.equal(wasteMovement.reason, "Preparación fallida");
  assert.equal(wasteMovement.notes, "Preparación fallida - Masa quemada en horno");
  assert.ok(wasteMovement.timestamp);
  assert.ok(wasteMovement.unitCost > 0);
  assert.equal(wasteMovement.totalCost, wasteMovement.unitCost * 1.5);

  // Verify derived stock is discounted
  const updatedStock = buildInventorySnapshot(nextState.inventoryCatalog, nextState.inventoryMovements).find((p) => p.id === "INV001").onHand;
  assert.equal(updatedStock, initialStock - 1.5);
});
