import test from "node:test";
import assert from "node:assert/strict";

import {
  hasValidationErrors,
  validateDirectPurchaseForm,
  validateProductForm,
  validatePurchaseForm,
  validateReceiptForm,
  validateSaleForm,
} from "../src/utils/validation.js";

test(
  "product validation requires key inventory fields",
  () => {
    const errors = validateProductForm({
      item: "",
      category: "",
      location: "",
      costPerUnit: 0,
      onHand: -1,
      minStock: "",
    });

    assert.equal(
      hasValidationErrors(errors),
      true
    );
    assert.ok(errors.item);
    assert.ok(errors.category);
    assert.ok(errors.location);
    assert.ok(errors.costPerUnit);
    assert.ok(errors.onHand);
    assert.ok(errors.minStock);
  }
);

test(
  "purchase validation requires supplier, date, and items",
  () => {
    const errors = validatePurchaseForm({
      supplier: "",
      category: "",
      orderedDate: "",
      items: [],
    });

    assert.ok(errors.supplier);
    assert.ok(errors.category);
    assert.ok(errors.orderedDate);
    assert.ok(errors.items);
  }
);

test(
  "receipt validation rejects empty or invalid received quantities",
  () => {
    const emptyErrors = validateReceiptForm({
      receiptDate: "",
      items: [],
    });

    assert.ok(emptyErrors.receiptDate);
    assert.ok(emptyErrors.items);

    const invalidErrors =
      validateReceiptForm({
        receiptDate: "2026-09-08",
        items: [
          {
            receivedQuantity: 0,
            unitCost: 1200,
          },
        ],
      });

    assert.ok(invalidErrors.items);
  }
);

test(
  "sale validation requires items, customer/table, and payment method",
  () => {
    const emptyErrors = validateSaleForm({
      tableOrCustomer: "",
      paymentMethod: "",
      items: [],
    });

    assert.ok(emptyErrors.tableOrCustomer);
    assert.ok(emptyErrors.paymentMethod);
    assert.ok(emptyErrors.items);

    const validErrors = validateSaleForm({
      tableOrCustomer: "Mesa 1",
      paymentMethod: "Efectivo",
      items: [{ itemId: "REC-1", quantity: 2 }],
    });

    assert.equal(hasValidationErrors(validErrors), false);
  }
);


const VALID_DIRECT_PURCHASE = {
  supplier: "Feria Cunco",
  purchaseDate: "2026-10-05",
  items: [
    { productId: "INV-1", quantity: "3", unitCost: "1500" },
    { productId: "INV-2", quantity: "0.5", unitCost: "8000" },
  ],
};

test("direct purchase validation accepts a complete purchase", () => {
  assert.equal(
    hasValidationErrors(validateDirectPurchaseForm(VALID_DIRECT_PURCHASE)),
    false
  );
});

test("direct purchase validation requires supplier, date and at least one line", () => {
  const errors = validateDirectPurchaseForm({ supplier: " ", purchaseDate: "", items: [] });

  assert.equal(errors.supplier, "Ingresa el proveedor.");
  assert.equal(errors.purchaseDate, "Selecciona la fecha de la compra.");
  assert.equal(errors.items, "Agrega al menos un producto a la compra.");
});

test("direct purchase validation marks each invalid line with the purchase item rules", () => {
  const errors = validateDirectPurchaseForm({
    ...VALID_DIRECT_PURCHASE,
    items: [
      { productId: "INV-1", quantity: "3", unitCost: "1500" },
      { productId: "", quantity: "0", unitCost: "" },
    ],
  });

  assert.equal(errors.lines[0], undefined);
  assert.equal(errors.lines[1].productId, "Selecciona un producto.");
  assert.equal(errors.lines[1].quantity, "La cantidad debe ser mayor a 0.");
  assert.equal(errors.lines[1].unitCost, "El costo unitario debe ser mayor a 0.");
  assert.equal(errors.items, "Revisa los productos marcados.");
});

test("direct purchase validation rejects the same product in two lines", () => {
  const errors = validateDirectPurchaseForm({
    ...VALID_DIRECT_PURCHASE,
    items: [
      { productId: "INV-1", quantity: "3", unitCost: "1500" },
      { productId: "INV-1", quantity: "1", unitCost: "1500" },
    ],
  });

  assert.equal(errors.lines[1].productId, "Este producto ya está en otra línea.");
});
