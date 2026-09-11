import test from "node:test";
import assert from "node:assert/strict";

import {
  hasValidationErrors,
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

