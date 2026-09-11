import test from "node:test";
import assert from "node:assert/strict";

import {
  addOrUpdateProduct,
  buildInventorySnapshot,
  createPurchaseOrder,
  getTodayISODate,
  normalizeLoadedState,
  receivePurchaseOrder,
  recordSale,
  voidSale,
} from "../src/state/appState.js";

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
