import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultAppState,
  getOperationalAlerts,
  recordWaste,
  recordSale,
} from "../src/state/appState.js";
import { validateBackupData } from "../src/utils/validation.js";

test("getOperationalAlerts detects stock outages and critical thresholds", () => {
  const state = createDefaultAppState();
  const alerts = getOperationalAlerts(state, "2026-09-08");

  assert.ok(Array.isArray(alerts));
  const stockAlerts = alerts.filter((a) => a.category === "stock");
  assert.ok(stockAlerts.length > 0);

  // Check if any has danger or warning severity
  const hasDangerOrWarning = stockAlerts.some(
    (a) => a.severity === "danger" || a.severity === "warning"
  );
  assert.equal(hasDangerOrWarning, true);
});

test("getOperationalAlerts detects elevated waste", () => {
  let state = createDefaultAppState();
  // Record high waste for INV001
  state = recordWaste(state, {
    productId: "INV001",
    quantity: 15, // high quantity and cost
    reason: "Producto vencido",
    movementDate: "2026-09-08",
  });

  const alerts = getOperationalAlerts(state, "2026-09-08");
  const wasteAlert = alerts.find((a) => a.category === "waste" && a.entityId === "INV001");
  assert.ok(wasteAlert);
  assert.equal(wasteAlert.severity, "warning");
  assert.match(wasteAlert.title, /merma/i);
});

test("validateBackupData validates JSON backup structures correctly", () => {
  // Invalid data types
  assert.equal(validateBackupData(null).isValid, false);
  assert.equal(validateBackupData("").isValid, false);
  assert.equal(validateBackupData([]).isValid, false);
  assert.equal(validateBackupData({ foo: "bar" }).isValid, false);

  // Valid backup with inventoryCatalog and movements
  const valid = validateBackupData({
    inventoryCatalog: [{ id: "INV001", item: "Harina" }],
    inventoryMovements: [],
    purchases: [],
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.error, null);

  // Valid backup with legacy inventory key
  const validLegacy = validateBackupData({
    inventory: [{ id: "INV001", item: "Harina" }],
  });
  assert.equal(validLegacy.isValid, true);
  assert.equal(validLegacy.error, null);
});
