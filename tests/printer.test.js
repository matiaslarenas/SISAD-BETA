import test from "node:test";
import assert from "node:assert/strict";

import { buildEscPosTicket } from "../server/printer.js";

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

test("buildEscPosTicket returns a Buffer that starts with the ESC/POS init command", () => {
  const buffer = buildEscPosTicket(SAMPLE_SALE);
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer[0], 0x1b); // ESC
  assert.equal(buffer[1], 0x40); // @
});

test("buildEscPosTicket includes table, items, total and payment method as readable text", () => {
  const buffer = buildEscPosTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  assert.match(text, /Mesa 3/);
  assert.match(text, /Pizza Napolitana/);
  assert.match(text, /Bebida/);
  assert.match(text, /17.500/);
  assert.match(text, /Efectivo/);
  assert.match(text, /Sin cebolla/);
});

test("buildEscPosTicket ends with the paper cut command", () => {
  const buffer = buildEscPosTicket(SAMPLE_SALE);
  const tail = buffer.subarray(buffer.length - 3);

  assert.equal(tail[0], 0x1d); // GS
  assert.equal(tail[1], 0x56); // V
  assert.equal(tail[2], 0x00); // corte total
});

test("buildEscPosTicket handles a ticket with no items or notes", () => {
  const buffer = buildEscPosTicket({
    id: "VTA-1002",
    tableOrCustomer: "Mostrador",
    items: [],
    totalAmount: 0,
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString("latin1"), /Mostrador/);
});
