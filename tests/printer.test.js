import test from "node:test";
import assert from "node:assert/strict";

import { buildKitchenComandaTicket, buildCustomerReceiptTicket } from "../server/printer.js";

const SAMPLE_SALE = {
  id: "VTA-1001",
  tableOrCustomer: "Mesa 3",
  date: "2026-09-15",
  time: "20:30",
  paymentMethod: "Efectivo",
  notes: "Sin cebolla",
  items: [
    { name: "Pizza Napolitana", quantity: 2, unitPrice: 8000, totalPrice: 16000 },
    { name: "Bebida", quantity: 1, unitPrice: 1500, totalPrice: 1500 },
  ],
  totalAmount: 17500,
};

test("buildKitchenComandaTicket returns a Buffer that starts with the ESC/POS init command", () => {
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer[0], 0x1b); // ESC
  assert.equal(buffer[1], 0x40); // @
});

test("buildKitchenComandaTicket includes table, items with quantity, the order note and the time — no prices", () => {
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  assert.match(text, /Mesa 3/);
  assert.match(text, /2x Pizza Napolitana/);
  assert.match(text, /1x Bebida/);
  assert.match(text, /20:30/);
  assert.match(text, /Sin cebolla/);
  assert.doesNotMatch(text, /17.500/);
  assert.doesNotMatch(text, /8.000/);
});

test("buildKitchenComandaTicket omits the note line when there is none", () => {
  const buffer = buildKitchenComandaTicket({ ...SAMPLE_SALE, notes: "" });
  const text = buffer.toString("latin1");

  assert.doesNotMatch(text, /Nota:/);
});

test("buildKitchenComandaTicket ends with the paper cut command", () => {
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);
  const tail = buffer.subarray(buffer.length - 3);

  assert.equal(tail[0], 0x1d); // GS
  assert.equal(tail[1], 0x56); // V
  assert.equal(tail[2], 0x00); // corte total
});

test("buildKitchenComandaTicket handles a ticket with no items or notes", () => {
  const buffer = buildKitchenComandaTicket({
    id: "VTA-1002",
    tableOrCustomer: "Mostrador",
    items: [],
    totalAmount: 0,
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString("latin1"), /Mostrador/);
});

test("buildCustomerReceiptTicket includes table, items, total and payment method as readable text", () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  assert.match(text, /Mesa 3/);
  assert.match(text, /Pizza Napolitana/);
  assert.match(text, /Bebida/);
  assert.match(text, /17.500/);
  assert.match(text, /Efectivo/);
  assert.match(text, /Sin cebolla/);
});

test("buildCustomerReceiptTicket suggests a 10% tip and includes the total with tip", () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  // 17500 * 0.10 = 1750; 17500 + 1750 = 19250
  assert.match(text, /Sugerencia propina 10%/);
  assert.match(text, /1.750/);
  assert.match(text, /TOTAL \+ PROPINA/);
  assert.match(text, /19.250/);
});

test("buildCustomerReceiptTicket ends with the paper cut command", () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);
  const tail = buffer.subarray(buffer.length - 3);

  assert.equal(tail[0], 0x1d); // GS
  assert.equal(tail[1], 0x56); // V
  assert.equal(tail[2], 0x00); // corte total
});

test("buildCustomerReceiptTicket handles a ticket with no items or notes", () => {
  const buffer = buildCustomerReceiptTicket({
    id: "VTA-1002",
    tableOrCustomer: "Mostrador",
    items: [],
    totalAmount: 0,
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString("latin1"), /Mostrador/);
});
