import test from "node:test";
import assert from "node:assert/strict";
import { recipesData } from "../src/data/recipesData.js";

import {
  addOrUpdateProduct,
  buildInventorySnapshot,
  closeTicket,
  createClientRequestId,
  createPurchaseOrder,
  DomainError,
  generateSaleId,
  getTodayISODate,
  normalizeLoadedState,
  receivePurchaseOrder,
  recordDirectPurchase,
  recordSale,
  saveTicket,
  voidSale,
} from "../src/state/appState.js";
import { appDataReducer } from "../src/state/rootReducer.js";

test(
  "buildInventorySnapshot derives stock and cost from movements",
  () => {
    const state = normalizeLoadedState({
      inventoryCatalog: [
        {
          id: "INV-1",
          item: "Harina",
          type: "ingredient",
          category: "Abarrotes",
          supplier: "",
          location: "Bodega",
          purchaseUnit: "kg",
          costPerUnit: 900,
          minStock: 5,
        },
      ],
      inventoryMovements: [
        {
          id: "MOV-1",
          productId: "INV-1",
          type: "purchase",
          quantity: 10,
          unitCost: 1000,
          movementDate: "2026-09-01",
          reference: "OC-1",
          notes: "",
        },
        {
          id: "MOV-2",
          productId: "INV-1",
          type: "waste",
          quantity: -2,
          unitCost: null,
          movementDate: "2026-09-02",
          reference: "Merma",
          notes: "",
        },
        {
          id: "MOV-3",
          productId: "INV-1",
          type: "purchase",
          quantity: 4,
          unitCost: 1200,
          movementDate: "2026-09-03",
          reference: "OC-2",
          notes: "",
        },
      ],
      suppliers: [],
      purchases: [],
      recipes: [],
    });

    const inventory = buildInventorySnapshot(
      state.inventoryCatalog,
      state.inventoryMovements
    );

    assert.equal(inventory[0].onHand, 12);
    assert.equal(
      inventory[0].costPerUnit,
      1200
    );
    assert.equal(
      inventory[0].inventoryValue,
      14400
    );
  }
);

test(
  "normalizeLoadedState usa las recetas semilla cuando el estado no trae recipes",
  () => {
    const state = normalizeLoadedState({
      inventoryCatalog: [],
      inventoryMovements: [],
      suppliers: [],
      purchases: [],
      sales: [],
    });

    assert.equal(Array.isArray(state.recipes), true);
    assert.equal(state.recipes.length, recipesData.length);
  }
);

test(
  "addOrUpdateProduct turns desired stock into adjustment movements",
  () => {
    const initialState =
      normalizeLoadedState({
        inventoryCatalog: [],
        inventoryMovements: [],
        suppliers: [],
        purchases: [],
        recipes: [],
      });

    const createdState =
      addOrUpdateProduct(initialState, {
        values: {
          item: "Aceite",
          type: "ingredient",
          category: "Abarrotes",
          supplier: "Proveedor",
          location: "Bodega",
          purchaseUnit: "lt",
          costPerUnit: 2500,
          onHand: 8,
          minStock: 2,
        },
      });

    assert.equal(
      createdState.inventoryCatalog.length,
      1
    );
    assert.equal(
      createdState.inventoryMovements.length,
      1
    );
    assert.equal(
      createdState.inventoryMovements[0]
        .quantity,
      8
    );

    const productId =
      createdState.inventoryCatalog[0].id;

    const updatedState =
      addOrUpdateProduct(createdState, {
        productId,
        values: {
          ...createdState.inventoryCatalog[0],
          onHand: 5,
          costPerUnit: 2700,
        },
      });

    assert.equal(
      updatedState.inventoryMovements.length,
      2
    );
    assert.equal(
      updatedState.inventoryMovements[1]
        .quantity,
      -3
    );

    const costOnlyState =
      addOrUpdateProduct(updatedState, {
        productId,
        values: {
          ...updatedState.inventoryCatalog[0],
          onHand: 5,
          costPerUnit: 3000,
        },
      });

    assert.equal(
      costOnlyState.inventoryMovements[2]
        .quantity,
      0
    );
    assert.equal(
      costOnlyState.inventoryMovements[2]
        .reference,
      "Actualización de costo"
    );
  }
);

test(
  "receiving a purchase updates stock, purchase status, and product cost",
  () => {
    let state = normalizeLoadedState({
      inventoryCatalog: [
        {
          id: "INV-10",
          item: "Tomate",
          type: "ingredient",
          category: "Verduras",
          supplier: "",
          location: "Frío",
          purchaseUnit: "kg",
          costPerUnit: 1000,
          minStock: 4,
        },
      ],
      inventoryMovements: [],
      suppliers: [],
      purchases: [],
      recipes: [],
    });

    state = createPurchaseOrder(state, {
      id: "OC-777",
      supplier: "Huertos Fresh",
      category: "Verduras",
      orderedDate: getTodayISODate(),
      items: [
        {
          id: "POI-1",
          productId: "INV-10",
          productName: "Tomate",
          purchaseUnit: "kg",
          quantity: 12,
          unitCost: 1300,
        },
      ],
    });

    const nextState =
      receivePurchaseOrder(state, {
        purchaseId: "OC-777",
        receiptDate: "2026-09-08",
        receiptNotes: "Recepción completa",
        items: [
          {
            id: "POI-1",
            productId: "INV-10",
            receivedQuantity: 12,
            unitCost: 1300,
          },
        ],
      });

    const inventory = buildInventorySnapshot(
      nextState.inventoryCatalog,
      nextState.inventoryMovements
    );

    assert.equal(
      nextState.purchases[0].status,
      "received"
    );
    assert.equal(inventory[0].onHand, 12);
    assert.equal(
      inventory[0].costPerUnit,
      1300
    );
    assert.equal(
      nextState.inventoryMovements[0]
        .reference,
      "OC-777"
    );
  }
);

function receiveFromSupplier(productSupplier, purchaseSupplier) {
  let state = normalizeLoadedState({
    inventoryCatalog: [
      {
        id: "INV-20",
        item: "Lechuga",
        type: "ingredient",
        category: "Verduras",
        supplier: productSupplier,
        location: "Frío",
        purchaseUnit: "un",
        costPerUnit: 800,
        minStock: 2,
      },
    ],
    inventoryMovements: [],
    suppliers: [],
    purchases: [],
    recipes: [],
  });

  state = createPurchaseOrder(state, {
    id: "OC-900",
    supplier: purchaseSupplier,
    category: "Verduras",
    orderedDate: "2026-10-01",
    items: [
      {
        id: "POI-9",
        productId: "INV-20",
        productName: "Lechuga",
        purchaseUnit: "un",
        quantity: 5,
        unitCost: 950,
      },
    ],
  });

  return receivePurchaseOrder(state, {
    purchaseId: "OC-900",
    receiptDate: "2026-10-02",
    items: [
      {
        id: "POI-9",
        productId: "INV-20",
        receivedQuantity: 5,
        unitCost: 950,
      },
    ],
  });
}

test(
  "recibir una compra de otro proveedor no cambia el proveedor habitual del producto",
  () => {
    const nextState = receiveFromSupplier("Huertos Fresh", "Feria");

    assert.equal(nextState.inventoryCatalog[0].supplier, "Huertos Fresh");
    assert.equal(nextState.inventoryCatalog[0].costPerUnit, 950);
    assert.equal(nextState.purchases[0].supplier, "Feria");
  }
);

test(
  "recibir una compra asigna el proveedor si el producto no tenía uno",
  () => {
    const nextState = receiveFromSupplier("", "Feria");

    assert.equal(nextState.inventoryCatalog[0].supplier, "Feria");
  }
);

test(
  "recordSale discounts recipe ingredients and voidSale restores them",
  () => {
    let state = normalizeLoadedState({
      inventoryCatalog: [
        {
          id: "INV-100",
          item: "Carne Mechada",
          type: "ingredient",
          category: "Carnes",
          supplier: "Carnes Sur",
          location: "Frío",
          purchaseUnit: "kg",
          costPerUnit: 8000,
          minStock: 2,
        },
        {
          id: "INV-101",
          item: "Pan Amasado",
          type: "ingredient",
          category: "Panadería",
          supplier: "Panadería Central",
          location: "Cocina",
          purchaseUnit: "un",
          costPerUnit: 300,
          minStock: 10,
        },
      ],
      inventoryMovements: [
        {
          id: "MOV-1",
          productId: "INV-100",
          type: "purchase",
          quantity: 10,
          unitCost: 8000,
          movementDate: "2026-09-01",
          reference: "Inicio",
          notes: "",
        },
        {
          id: "MOV-2",
          productId: "INV-101",
          type: "purchase",
          quantity: 20,
          unitCost: 300,
          movementDate: "2026-09-01",
          reference: "Inicio",
          notes: "",
        },
      ],
      suppliers: [],
      purchases: [],
      recipes: [
        {
          id: "REC-1",
          name: "Sándwich Mechada",
          category: "Fondos",
          salePrice: 7500,
          servings: 1,
          ingredients: [
            {
              id: "ING-1",
              productId: "INV-100",
              item: "Carne Mechada",
              quantity: 200,
              unit: "gr",
            },
            {
              id: "ING-2",
              productId: "INV-101",
              item: "Pan Amasado",
              quantity: 1,
              unit: "un",
            },
          ],
        },
      ],
      sales: [],
    });

    const saleState = recordSale(state, {
      id: "SALE-999",
      date: "2026-09-08",
      time: "13:30",
      tableOrCustomer: "Mesa 4",
      paymentMethod: "Tarjeta",
      items: [
        {
          type: "recipe",
          itemId: "REC-1",
          quantity: 2,
        },
      ],
    });

    assert.equal(saleState.sales.length, 1);
    assert.equal(saleState.sales[0].totalAmount, 15000);
    assert.equal(saleState.sales[0].status, "completed");

    const invAfterSale = buildInventorySnapshot(
      saleState.inventoryCatalog,
      saleState.inventoryMovements
    );

    // 2 portions * 200gr = 400gr = 0.4kg consumed -> 10 - 0.4 = 9.6kg
    const meat = invAfterSale.find((i) => i.id === "INV-100");
    assert.equal(meat.onHand, 9.6);

    // 2 portions * 1 un = 2 un consumed -> 20 - 2 = 18 un
    const bread = invAfterSale.find((i) => i.id === "INV-101");
    assert.equal(bread.onHand, 18);

    // Now test voiding the sale
    const voidState = voidSale(saleState, "SALE-999");

    assert.equal(voidState.sales[0].status, "voided");

    const invAfterVoid = buildInventorySnapshot(
      voidState.inventoryCatalog,
      voidState.inventoryMovements
    );

    const meatRestored = invAfterVoid.find((i) => i.id === "INV-100");
    assert.equal(meatRestored.onHand, 10);

    const breadRestored = invAfterVoid.find((i) => i.id === "INV-101");
    assert.equal(breadRestored.onHand, 20);
  }
);

test(
  "recordSale flattens a sub-recipe (base_recipe) into raw inventory movements, and voidSale restores them exactly",
  () => {
    let state = normalizeLoadedState({
      inventoryCatalog: [
        {
          id: "INV-FLOUR",
          item: "Harina",
          type: "ingredient",
          category: "Abarrotes",
          purchaseUnit: "kg",
          costPerUnit: 1000,
          minStock: 10,
        },
        {
          id: "INV-WATER",
          item: "Agua",
          type: "ingredient",
          category: "Abarrotes",
          purchaseUnit: "lt",
          costPerUnit: 50,
          minStock: 10,
        },
        {
          id: "INV-CHEESE",
          item: "Mozzarella",
          type: "ingredient",
          category: "Lácteos",
          purchaseUnit: "kg",
          costPerUnit: 4000,
          minStock: 5,
        },
      ],
      inventoryMovements: [
        {
          id: "MOV-BASE-1",
          productId: "INV-FLOUR",
          type: "purchase",
          quantity: 20,
          unitCost: 1000,
          movementDate: "2026-09-01",
          reference: "Inicio",
          notes: "",
        },
        {
          id: "MOV-BASE-2",
          productId: "INV-WATER",
          type: "purchase",
          quantity: 20,
          unitCost: 50,
          movementDate: "2026-09-01",
          reference: "Inicio",
          notes: "",
        },
        {
          id: "MOV-BASE-3",
          productId: "INV-CHEESE",
          type: "purchase",
          quantity: 5,
          unitCost: 4000,
          movementDate: "2026-09-01",
          reference: "Inicio",
          notes: "",
        },
      ],
      suppliers: [],
      purchases: [],
      recipes: [
        {
          id: "BASE_DOUGH_TEST",
          name: "Masa Base Test",
          type: "base_recipe",
          yieldQuantity: 4,
          yieldUnit: "un",
          ingredients: [
            { productId: "INV-FLOUR", quantity: 1000, unit: "gr" },
            { productId: "INV-WATER", quantity: 600, unit: "ml" },
          ],
        },
        {
          id: "REC-PIZZA-TEST",
          name: "Pizza Test",
          category: "Pizzas",
          salePrice: 11000,
          servings: 1,
          ingredients: [
            { baseRecipeId: "BASE_DOUGH_TEST", quantity: 1, unit: "un" },
            { productId: "INV-CHEESE", quantity: 250, unit: "gr" },
          ],
        },
      ],
      sales: [],
    });

    const saleState = recordSale(state, {
      id: "SALE-SUBRECIPE",
      date: "2026-09-09",
      time: "20:00",
      tableOrCustomer: "Mesa 2",
      paymentMethod: "Tarjeta",
      items: [
        {
          type: "recipe",
          itemId: "REC-PIZZA-TEST",
          quantity: 2, // 2 pizzas => 2/4 = 0.5 dough batches
        },
      ],
    });

    const invAfterSale = buildInventorySnapshot(
      saleState.inventoryCatalog,
      saleState.inventoryMovements
    );

    // 0.5 batch * 1000gr flour = 500gr = 0.5kg -> 20 - 0.5 = 19.5kg
    const flour = invAfterSale.find((i) => i.id === "INV-FLOUR");
    assert.equal(flour.onHand, 19.5);

    // 0.5 batch * 600ml water = 300ml = 0.3lt -> 20 - 0.3 = 19.7lt
    const water = invAfterSale.find((i) => i.id === "INV-WATER");
    assert.equal(water.onHand, 19.7);

    // No inventory movement should ever target the virtual base
    // recipe id itself — only real, purchasable products.
    const baseRecipeMovement = saleState.inventoryMovements.find(
      (m) => m.productId === "BASE_DOUGH_TEST"
    );
    assert.equal(baseRecipeMovement, undefined);

    // 2 pizzas * 250gr cheese = 500gr = 0.5kg -> 5 - 0.5 = 4.5kg
    const cheese = invAfterSale.find((i) => i.id === "INV-CHEESE");
    assert.equal(cheese.onHand, 4.5);

    const voidState = voidSale(saleState, "SALE-SUBRECIPE");
    const invAfterVoid = buildInventorySnapshot(
      voidState.inventoryCatalog,
      voidState.inventoryMovements
    );

    assert.equal(invAfterVoid.find((i) => i.id === "INV-FLOUR").onHand, 20);
    assert.equal(invAfterVoid.find((i) => i.id === "INV-WATER").onHand, 20);
    assert.equal(invAfterVoid.find((i) => i.id === "INV-CHEESE").onHand, 5);
  }
);

// Estado mínimo para los tests de tickets del POS: un producto con stock
// de 20 unidades y una receta que consume 1 unidad por porción.
function buildTicketState() {
  return normalizeLoadedState({
    inventoryCatalog: [
      {
        id: "INV-PAN",
        item: "Pan Amasado",
        type: "ingredient",
        category: "Panadería",
        purchaseUnit: "un",
        costPerUnit: 300,
        minStock: 5,
      },
    ],
    inventoryMovements: [
      {
        id: "MOV-PAN-1",
        productId: "INV-PAN",
        type: "purchase",
        quantity: 20,
        unitCost: 300,
        movementDate: "2026-09-01",
        reference: "Inicio",
        notes: "",
      },
    ],
    suppliers: [],
    purchases: [],
    recipes: [
      {
        id: "REC-SANDWICH",
        name: "Sándwich",
        category: "Fondos",
        salePrice: 5000,
        servings: 1,
        ingredients: [
          { productId: "INV-PAN", quantity: 1, unit: "un" },
        ],
      },
    ],
    sales: [],
  });
}

const TICKET_PAYLOAD = {
  tableOrCustomer: "Mesa 2",
  paymentMethod: "Efectivo",
  items: [{ type: "recipe", itemId: "REC-SANDWICH", quantity: 2 }],
  notes: "",
};

function panOnHand(state) {
  return buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements)
    .find((item) => item.id === "INV-PAN").onHand;
}

// Regresión del cobro en el POS: saveTicket y closeTicket se despachaban
// sin esperar respuesta, en paralelo. Si el cierre llega al servidor
// antes que el guardado, no encuentra un ticket pendiente y no hace nada,
// mientras el POS ya mostró "Venta registrada". Por eso POS.jsx debe
// esperar a saveTicket antes de despachar closeTicket.
test(
  "closeTicket is a no-op when it reaches the server before saveTicket",
  () => {
    const state = buildTicketState();

    const closedFirst = closeTicket(state, {
      saleId: "VTA-1001",
      paymentMethod: "Efectivo",
      notes: "",
    });
    assert.equal(closedFirst, state);

    const saved = saveTicket(closedFirst, { id: "VTA-1001", ...TICKET_PAYLOAD });
    assert.equal(saved.sales[0].status, "pending");
  }
);

test(
  "saveTicket followed by closeTicket completes the sale and discounts stock once",
  () => {
    const saved = saveTicket(buildTicketState(), { id: "VTA-1001", ...TICKET_PAYLOAD });
    const closed = closeTicket(saved, {
      saleId: "VTA-1001",
      paymentMethod: "Efectivo",
      notes: "",
    });

    assert.equal(closed.sales.length, 1);
    assert.equal(closed.sales[0].status, "completed");
    assert.equal(panOnHand(closed), 18);
  }
);

// Regresión: saveTicket solo reconocía tickets PENDING, pero siempre
// borraba los movimientos de venta con ese id. Con el id de una venta ya
// cobrada (o anulada) duplicaba el id y rehacía su descuento de stock.
// Pasa, por ejemplo, si el cliente genera un id con un estado desfasado.
test(
  "saveTicket rejects the id of a sale that is already completed",
  () => {
    const saved = saveTicket(buildTicketState(), { id: "VTA-1001", ...TICKET_PAYLOAD });
    const closed = closeTicket(saved, {
      saleId: "VTA-1001",
      paymentMethod: "Efectivo",
      notes: "",
    });

    assert.throws(
      () => saveTicket(closed, { id: "VTA-1001", ...TICKET_PAYLOAD }),
      (error) =>
        error instanceof DomainError && /VTA-1001 ya fue cobrada/.test(error.message)
    );
  }
);

test(
  "saveTicket rejects the id of a voided sale so its stock is not restored twice",
  () => {
    const saved = saveTicket(buildTicketState(), { id: "VTA-1001", ...TICKET_PAYLOAD });
    const voided = voidSale(saved, "VTA-1001");
    assert.equal(panOnHand(voided), 20);

    assert.throws(
      () => saveTicket(voided, { id: "VTA-1001", ...TICKET_PAYLOAD }),
      (error) =>
        error instanceof DomainError && /VTA-1001 ya fue anulada/.test(error.message)
    );
  }
);

test(
  "saveTicket on a pending ticket replaces its stock reservation instead of adding to it",
  () => {
    const saved = saveTicket(buildTicketState(), { id: "VTA-1001", ...TICKET_PAYLOAD });
    const updated = saveTicket(saved, {
      id: "VTA-1001",
      ...TICKET_PAYLOAD,
      items: [{ type: "recipe", itemId: "REC-SANDWICH", quantity: 3 }],
    });

    assert.equal(updated.sales.length, 1);
    assert.equal(panOnHand(updated), 17);
  }
);

// --- Compra directa: se registra ya recibida, en un solo paso ---

const DIRECT_PURCHASE = {
  supplier: "Panadería Central",
  purchaseDate: "2026-10-05",
  notes: "Boleta 1234",
  items: [{ productId: "INV-PAN", quantity: "12", unitCost: "350" }],
};

test(
  "recordDirectPurchase adds stock with a purchase movement at the price paid",
  () => {
    const next = recordDirectPurchase(buildTicketState(), DIRECT_PURCHASE);

    assert.equal(panOnHand(next), 32);

    const movement = next.inventoryMovements.at(-1);
    assert.equal(movement.type, "purchase");
    assert.equal(movement.productId, "INV-PAN");
    assert.equal(movement.quantity, 12);
    assert.equal(movement.unitCost, 350);
    assert.equal(movement.movementDate, "2026-10-05");
    assert.equal(movement.reference, next.purchases.at(-1).id);
  }
);

test(
  "recordDirectPurchase stores the purchase as received and updates the current cost",
  () => {
    const state = buildTicketState();
    const next = recordDirectPurchase(state, DIRECT_PURCHASE);

    assert.equal(next.purchases.length, state.purchases.length + 1);
    const purchase = next.purchases.at(-1);
    assert.equal(purchase.status, "received");
    assert.equal(purchase.supplier, "Panadería Central");
    assert.equal(purchase.orderedDate, "2026-10-05");
    assert.equal(purchase.receiptDate, "2026-10-05");
    assert.equal(purchase.amount, 4200);

    assert.equal(
      next.inventoryCatalog.find((p) => p.id === "INV-PAN").costPerUnit,
      350
    );
    // El costo de la compra anterior queda congelado.
    assert.equal(
      next.inventoryMovements.find((m) => m.id === "MOV-PAN-1").unitCost,
      300
    );
  }
);

test(
  "recordDirectPurchase gives a new id even when older purchases left gaps",
  () => {
    const state = {
      ...buildTicketState(),
      purchases: [
        { id: "OC-1001", supplier: "A", status: "received", items: [] },
        { id: "OC-1003", supplier: "B", status: "received", items: [] },
      ],
    };

    const next = recordDirectPurchase(state, DIRECT_PURCHASE);

    assert.equal(next.purchases.at(-1).id, "OC-1004");
  }
);

// --- Id de venta asignado en el servidor, con clave de idempotencia (#10) ---

function newTicket(clientRequestId, quantity = 2) {
  return {
    clientRequestId,
    ...TICKET_PAYLOAD,
    items: [{ type: "recipe", itemId: "REC-SANDWICH", quantity }],
  };
}

test(
  "two saveTicket without id get different ids assigned by the server",
  () => {
    const first = saveTicket(buildTicketState(), newTicket("clave-a"));
    const second = saveTicket(first, newTicket("clave-b"));

    assert.deepEqual(second.sales.map((s) => s.id).sort(), ["VTA-1001", "VTA-1002"]);
    assert.equal(panOnHand(second), 16);
  }
);

test(
  "the next sale id follows the highest VTA number even if there are fewer sales",
  () => {
    const state = {
      ...buildTicketState(),
      sales: [
        { id: "VTA-1007", status: "completed", items: [] },
        { id: "VTA-1002", status: "voided", items: [] },
      ],
    };

    assert.equal(generateSaleId(state), "VTA-1008");
    assert.equal(saveTicket(state, newTicket("clave-a")).sales[0].id, "VTA-1008");
  }
);

test(
  "retrying saveTicket with the same key keeps a single ticket and a single reservation",
  () => {
    const first = saveTicket(buildTicketState(), newTicket("clave-a"));
    const retried = saveTicket(first, newTicket("clave-a"));

    assert.equal(retried.sales.length, 1);
    assert.equal(retried.sales[0].clientRequestId, "clave-a");
    assert.equal(panOnHand(retried), 18);
  }
);

test(
  "a retry with the same key and one more item updates the ticket and its reservation",
  () => {
    const first = saveTicket(buildTicketState(), newTicket("clave-a", 2));
    const retried = saveTicket(first, newTicket("clave-a", 3));

    assert.equal(retried.sales.length, 1);
    assert.equal(retried.sales[0].id, first.sales[0].id);
    assert.equal(retried.sales[0].items[0].quantity, 3);
    assert.equal(panOnHand(retried), 17);
  }
);

// Por qué el POS renueva la clave al vaciar el ticket o abrir una mesa: si
// se perdió la respuesta de un pedido, ese pedido ya quedó guardado con su
// clave. Un pedido distinto con la misma clave lo pisaría.
test(
  "a different order needs a new key, or it overwrites a ticket whose response was lost",
  () => {
    const lostResponse = saveTicket(buildTicketState(), newTicket("clave-a", 2));
    const otherOrder = (key) => ({ ...newTicket(key, 1), tableOrCustomer: "Mesa 5" });

    const sameKey = saveTicket(lostResponse, otherOrder("clave-a"));
    assert.equal(sameKey.sales.length, 1);
    assert.equal(sameKey.sales[0].tableOrCustomer, "Mesa 5");

    const renewedKey = saveTicket(lostResponse, otherOrder("clave-b"));
    assert.deepEqual(
      renewedKey.sales.map((s) => s.tableOrCustomer).sort(),
      ["Mesa 2", "Mesa 5"]
    );
    assert.equal(panOnHand(renewedKey), 17);
  }
);

test(
  "a retry with the key of a ticket that was already charged is rejected",
  () => {
    const saved = saveTicket(buildTicketState(), newTicket("clave-a"));
    const closed = closeTicket(saved, { saleId: "VTA-1001", paymentMethod: "Efectivo", notes: "" });

    assert.throws(
      () => saveTicket(closed, newTicket("clave-a")),
      (error) =>
        error instanceof DomainError && /VTA-1001 ya fue cobrada/.test(error.message)
    );
  }
);

test(
  "the idempotency key survives a server restart (normalizeLoadedState)",
  () => {
    const saved = saveTicket(buildTicketState(), newTicket("clave-a"));
    const reloaded = normalizeLoadedState(JSON.parse(JSON.stringify(saved)));
    const retried = saveTicket(reloaded, newTicket("clave-a"));

    assert.equal(retried.sales.length, 1);
    assert.equal(panOnHand(retried), 18);
  }
);

test(
  "createClientRequestId gives a different 32-character hex key each time",
  () => {
    const first = createClientRequestId();
    const second = createClientRequestId();

    assert.match(first, /^[0-9a-f]{32}$/);
    assert.notEqual(first, second);
  }
);

test(
  "recordDirectPurchase rejects an invalid purchase without changing the state",
  () => {
    const state = buildTicketState();

    assert.throws(
      () => recordDirectPurchase(state, { ...DIRECT_PURCHASE, items: [] }),
      (error) => error instanceof DomainError && /al menos un producto/.test(error.message)
    );
    assert.throws(
      () =>
        recordDirectPurchase(state, {
          ...DIRECT_PURCHASE,
          items: [{ productId: "INV-PAN", quantity: "12", unitCost: "0" }],
        }),
      (error) => error instanceof DomainError && /costo unitario/.test(error.message)
    );
    assert.equal(panOnHand(state), 20);
  }
);

test(
  "recordDirectPurchase rejects a product that is not in the inventory",
  () => {
    assert.throws(
      () =>
        recordDirectPurchase(buildTicketState(), {
          ...DIRECT_PURCHASE,
          items: [{ productId: "INV-NO-EXISTE", quantity: "1", unitCost: "100" }],
        }),
      (error) => error instanceof DomainError && /no existe en el inventario/.test(error.message)
    );
  }
);

test(
  "the root reducer applies purchase/record-direct so every device can register purchases",
  () => {
    const next = appDataReducer(buildTicketState(), {
      type: "purchase/record-direct",
      payload: DIRECT_PURCHASE,
    });

    assert.equal(panOnHand(next), 32);
  }
);
