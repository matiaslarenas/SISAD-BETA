import { recipesData } from "../data/recipesData.js";
import {
  inventoryMovements as defaultInventoryMovements,
  MOVEMENT_TYPES,
} from "../data/inventoryMovements.js";
import { suppliers as defaultSuppliers } from "../data/suppliersData.js";
import { purchases as defaultPurchases } from "../data/purchasesData.js";

import { inventoryData } from '../data/inventoryData.js';
import { sales as defaultSales } from "../data/salesData.js";
import { parseCurrency } from "../utils/format.js";
import {
  normalizeQuantity,
  calculateRecipeCost,
  calculateRecipeMaxPortions,
  flattenRecipeIngredients,
} from "../utils/recipeCalculator.js";

/**
 * Convierte una cantidad de la unidad de receta a la unidad de compra/inventario.
 * Versión simplificada para uso interno en appState.js.
 * Para conversiones completas (incluyendo gr↔un con peso promedio), usar normalizeQuantity de recipeCalculator.js.
 */
function getConvertedQuantity(quantity, recipeUnit, purchaseUnit) {
  const unitMap = {
    gr: "kg",
    g: "kg",
    ml: "lt",
    cc: "lt",
  };

  const normalizedRecipeUnit = String(recipeUnit || "").trim().toLowerCase();
  const normalizedPurchaseUnit = String(purchaseUnit || "").trim().toLowerCase();

  // Si la receta viene en 'gr'/'g'/'ml'/'cc' y la unidad de compra es 'kg'/'lt', se divide por 1000
  if (unitMap[normalizedRecipeUnit] === normalizedPurchaseUnit) {
    return quantity / 1000;
  }

  return quantity; // Para unidades equivalentes o 'un'
}

export const PURCHASE_STATUSES = {
  PENDING: "pending",
  IN_TRANSIT: "in-transit",
  RECEIVED: "received",
};

const STATUS_META = {
  [PURCHASE_STATUSES.PENDING]: {
    label: "Pendiente",
    className: "pending",
  },
  [PURCHASE_STATUSES.IN_TRANSIT]: {
    label: "En tránsito",
    className: "in-transit",
  },
  [PURCHASE_STATUSES.RECEIVED]: {
    label: "Recibida",
    className: "success",
  },
};

const LEGACY_PURCHASE_STATUS_MAP = {
  pending: PURCHASE_STATUSES.PENDING,
  "in-transit": PURCHASE_STATUSES.IN_TRANSIT,
  success: PURCHASE_STATUSES.RECEIVED,
  warning: PURCHASE_STATUSES.PENDING,
  received: PURCHASE_STATUSES.RECEIVED,
};

// Ciclo de vida de un ticket/comanda del POS: 'pending' (mesa activa, stock
// ya reservado/descontado), 'completed' (pagada y cerrada) o 'voided'
// (anulada, stock reintegrado). "open" se mantiene como alias legado.
export const SALE_STATUSES = {
  PENDING: "pending",
  COMPLETED: "completed",
  VOIDED: "voided",
};

const LEGACY_SALE_STATUS_MAP = {
  open: SALE_STATUSES.PENDING,
};

function normalizeSaleStatus(status) {
  return LEGACY_SALE_STATUS_MAP[status] || status || SALE_STATUSES.PENDING;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildId(prefix) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2, 8)}`;
}

export function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeDate(value) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }

  return value;
}

export function formatDisplayDate(value) {
  const normalized = normalizeDate(value);

  if (!normalized) {
    return "—";
  }

  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

export function getPurchaseStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || "Pendiente",
      className: "pending",
    }
  );
}

function normalizeInventoryProduct(product) {
  const { onHand, ...rest } = product || {};

  return {
    ...rest,
    item: String(rest.item || "").trim(),
    type: rest.type || "ingredient",
    category: String(rest.category || "").trim(),
    supplier: String(rest.supplier || "").trim(),
    location: String(rest.location || "").trim(),
    purchaseUnit: rest.purchaseUnit || "un",
    costPerUnit: toNumber(rest.costPerUnit),
    minStock: toNumber(rest.minStock),
  };
}

function normalizeInventoryMovement(movement) {
  return {
    ...movement,
    id: movement.id || buildId("MOV"),
    type: movement.type || MOVEMENT_TYPES.ADJUSTMENT,
    productId: movement.productId,
    quantity: toNumber(movement.quantity),
    unitCost:
      movement.unitCost == null
        ? null
        : toNumber(movement.unitCost),
    movementDate:
      normalizeDate(movement.movementDate) ||
      getTodayISODate(),
    timestamp: movement.timestamp || (movement.movementDate ? `${normalizeDate(movement.movementDate)}T12:00:00.000Z` : new Date().toISOString()),
    source: movement.source || "system",
    reference: String(movement.reference || "").trim(),
    notes: String(movement.notes || "").trim(),
  };
}

function normalizeSupplierStatus(compliance) {
  const complianceValue = toNumber(
    String(compliance).replace(/[^\d.,-]/g, "")
  );

  if (complianceValue >= 95) {
    return {
      status: "Excelente",
      statusClass: "success",
    };
  }

  if (complianceValue >= 90) {
    return {
      status: "Aceptable",
      statusClass: "warning",
    };
  }

  return {
    status: "Crítico",
    statusClass: "danger",
  };
}

function normalizeSupplier(supplier) {
  const complianceValue = toNumber(
    String(supplier.compliance || "").replace(
      /[^\d.,-]/g,
      ""
    )
  );

  const compliance = `${complianceValue}%`;
  const derivedStatus =
    normalizeSupplierStatus(complianceValue);

  return {
    id:
      String(supplier.id || "").trim() ||
      buildId("SUP"),
    name: String(supplier.name || "").trim(),
    category: String(supplier.category || "").trim(),
    leadTime: String(supplier.leadTime || "").trim(),
    phone: String(supplier.phone || "").trim(),
    compliance,
    status:
      supplier.status || derivedStatus.status,
    statusClass:
      supplier.statusClass ||
      derivedStatus.statusClass,
  };
}

function normalizeRecipeIngredient(ingredient) {
  if (ingredient.baseRecipeId) {
    return {
      baseRecipeId: ingredient.baseRecipeId,
      quantity: toNumber(ingredient.quantity),
      unit: ingredient.unit || "un",
    };
  }

  return {
    productId: ingredient.productId,
    quantity: toNumber(ingredient.quantity),
    unit: ingredient.unit || "un",
  };
}

function normalizeRecipe(recipe) {
  const type =
    recipe.type === "base_recipe" ? "base_recipe" : "recipe";

  return {
    ...recipe,
    id: recipe.id || buildId("REC"),
    type,
    name: String(recipe.name || "").trim(),
    category: String(recipe.category || "").trim(),
    status: recipe.status || "active",
    salePrice: toNumber(recipe.salePrice),
    servings: Math.max(1, toNumber(recipe.servings, 1)),
    yieldQuantity:
      recipe.yieldQuantity != null
        ? toNumber(recipe.yieldQuantity)
        : undefined,
    yieldUnit: recipe.yieldUnit || undefined,
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(
        normalizeRecipeIngredient
      )
      : [],
  };
}

function normalizePurchaseItem(item, catalog = []) {
  const product = catalog.find(
    (entry) => entry.id === item.productId
  );

  const quantity = toNumber(item.quantity);
  const unitCost = toNumber(item.unitCost);
  const receivedQuantity =
    item.receivedQuantity == null
      ? quantity
      : toNumber(item.receivedQuantity);

  return {
    id: item.id || buildId("POI"),
    productId: item.productId,
    productName:
      String(item.productName || "").trim() ||
      product?.item ||
      "Producto",
    purchaseUnit:
      item.purchaseUnit ||
      product?.purchaseUnit ||
      "un",
    quantity,
    receivedQuantity,
    unitCost,
    totalCost: quantity * unitCost,
  };
}

function derivePurchaseCategory(purchase, catalog) {
  if (purchase.category) {
    return String(purchase.category).trim();
  }

  const firstItem = purchase.items?.[0];
  const product = catalog.find(
    (entry) => entry.id === firstItem?.productId
  );

  return product?.category || "General";
}

export function calculatePurchaseAmount(purchase) {
  if (
    Array.isArray(purchase.items) &&
    purchase.items.length > 0
  ) {
    return purchase.items.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item.receivedQuantity ??
          item.quantity
        ) *
        toNumber(item.unitCost),
      0
    );
  }

  return parseCurrency(purchase.amount);
}

function normalizePurchase(purchase, catalog) {
  const items = Array.isArray(purchase.items)
    ? purchase.items.map((item) =>
      normalizePurchaseItem(item, catalog)
    )
    : [];

  const status =
    LEGACY_PURCHASE_STATUS_MAP[purchase.status] ||
    PURCHASE_STATUSES.PENDING;

  return {
    id:
      String(purchase.id || "").trim() ||
      buildId("OC"),
    supplier: String(
      purchase.supplier || ""
    ).trim(),
    category: derivePurchaseCategory(
      { ...purchase, items },
      catalog
    ),
    status,
    orderedDate:
      normalizeDate(
        purchase.orderedDate || purchase.date
      ) || getTodayISODate(),
    receiptDate: normalizeDate(
      purchase.receiptDate
    ),
    notes: String(purchase.notes || "").trim(),
    receiptNotes: String(
      purchase.receiptNotes || ""
    ).trim(),
    items,
    amount: calculatePurchaseAmount({
      ...purchase,
      items,
    }),
  };
}

function normalizeSaleItem(item, catalog = [], recipes = []) {
  const type = item.type || "recipe";
  let unitCost = toNumber(item.unitCost, 0);
  let name = String(item.name || "").trim();
  let unitPrice = toNumber(item.unitPrice, 0);
  let unit = item.unit || "";

  if (type === "recipe") {
    const recipe = recipes.find((r) => r.id === item.itemId);
    if (recipe) {
      name = name || recipe.name;
      unitPrice = unitPrice || recipe.salePrice;
      if (unitCost === 0) {
        unitCost = calculateRecipeCost(recipe, catalog, recipes);
      }
      unit = unit || "porción";
    }
  } else {
    const product = catalog.find((p) => p.id === item.itemId);
    if (product) {
      name = name || product.item;
      unitPrice = unitPrice || Math.round(product.costPerUnit * 1.5);
      if (unitCost === 0) {
        unitCost = product.costPerUnit;
      }
      unit = unit || product.purchaseUnit;
    }
  }

  const quantity = Math.max(1, toNumber(item.quantity, 1));
  const totalPrice = quantity * unitPrice;
  const totalCost = quantity * unitCost;

  return {
    id: item.id || buildId("VTI"),
    type,
    itemId: item.itemId,
    name: name || "Ítem de venta",
    quantity,
    unit,
    unitPrice,
    totalPrice,
    unitCost,
    totalCost,
  };
}

function normalizeSale(sale, catalog = [], recipes = []) {
  const items = Array.isArray(sale.items)
    ? sale.items.map((item) => normalizeSaleItem(item, catalog, recipes))
    : [];

  const totalAmount =
    sale.totalAmount != null && toNumber(sale.totalAmount) > 0
      ? toNumber(sale.totalAmount)
      : items.reduce((sum, it) => sum + it.totalPrice, 0);

  const totalCost =
    sale.totalCost != null && toNumber(sale.totalCost) > 0
      ? toNumber(sale.totalCost)
      : items.reduce((sum, it) => sum + it.totalCost, 0);

  return {
    id: String(sale.id || "").trim() || buildId("VTA"),
    date: normalizeDate(sale.date) || getTodayISODate(),
    time: String(sale.time || "12:00").trim(),
    tableOrCustomer: String(sale.tableOrCustomer || "Mostrador").trim(),
    paymentMethod: String(sale.paymentMethod || "Efectivo").trim(),
    items,
    totalAmount,
    totalCost,
    status: normalizeSaleStatus(sale.status),
    closedAt: sale.closedAt || null,
    notes: String(sale.notes || "").trim(),
  };
}

export function buildInventorySnapshot(
  catalog = [],
  movements = []
) {
  const normalizedCatalog =
    catalog.map(normalizeInventoryProduct);
  const normalizedMovements = movements.map(
    normalizeInventoryMovement
  );

  return normalizedCatalog.map((product) => {
    const productMovements =
      normalizedMovements.filter(
        (movement) =>
          movement.productId === product.id
      );

    const onHand = productMovements.reduce(
      (sum, movement) =>
        sum + toNumber(movement.quantity),
      0
    );

    const latestCostMovement =
      [...productMovements]
        .reverse()
        .find(
          (movement) =>
            movement.unitCost != null
        );

    const costPerUnit =
      latestCostMovement?.unitCost ??
      product.costPerUnit;

    return {
      ...product,
      onHand,
      costPerUnit,
      inventoryValue: onHand * costPerUnit,
    };
  });
}

export function createDefaultAppState() {
  return normalizeLoadedState({
    inventoryCatalog: inventoryData,
    inventoryMovements:
      defaultInventoryMovements,
    suppliers: defaultSuppliers,
    purchases: defaultPurchases,
    recipes: recipesData || [],
    sales: defaultSales,
  });
}

function createSnapshotMovements(inventory = []) {
  return inventory
    .filter((product) => toNumber(product.onHand) !== 0)
    .map((product) => ({
      id: buildId("MOV"),
      productId: product.id,
      type: MOVEMENT_TYPES.ADJUSTMENT,
      quantity: toNumber(product.onHand),
      unitCost: toNumber(product.costPerUnit),
      movementDate: getTodayISODate(),
      reference: "Migración de stock",
      notes:
        "Saldo inicial generado desde almacenamiento anterior",
    }));
}

export function normalizeLoadedState(rawState = {}) {
  // Soporte transparente para envoltorios con metadatos ({ schemaVersion, data })
  const effectiveState =
    rawState && rawState.data && typeof rawState.data === "object"
      ? rawState.data
      : rawState;

  const inventoryCatalog = Array.isArray(
    effectiveState.inventoryCatalog
  )
    ? effectiveState.inventoryCatalog.map(
      normalizeInventoryProduct
    )
    : Array.isArray(effectiveState.inventory)
      ? effectiveState.inventory.map(
        normalizeInventoryProduct
      )
      : inventoryData.map(
        normalizeInventoryProduct
      );

  const inventoryMovements = Array.isArray(
    effectiveState.inventoryMovements
  )
    ? effectiveState.inventoryMovements.map(
      normalizeInventoryMovement
    )
    : Array.isArray(effectiveState.inventory)
      ? createSnapshotMovements(effectiveState.inventory)
      : defaultInventoryMovements.map(
        normalizeInventoryMovement
      );

  const suppliers = Array.isArray(effectiveState.suppliers)
    ? effectiveState.suppliers.map(
      normalizeSupplier
    )
    : defaultSuppliers.map(normalizeSupplier);

  const recipes = Array.isArray(effectiveState.recipes)
    ? effectiveState.recipes.map(normalizeRecipe)
    : defaultRecipes.map(normalizeRecipe);

  const purchases = Array.isArray(effectiveState.purchases)
    ? effectiveState.purchases.map((purchase) =>
      normalizePurchase(
        purchase,
        inventoryCatalog
      )
    )
    : defaultPurchases.map((purchase) =>
      normalizePurchase(
        purchase,
        inventoryCatalog
      )
    );

  const sales = Array.isArray(effectiveState.sales)
    ? effectiveState.sales.map((sale) =>
      normalizeSale(
        sale,
        inventoryCatalog,
        recipes
      )
    )
    : defaultSales.map((sale) =>
      normalizeSale(
        sale,
        inventoryCatalog,
        recipes
      )
    );

  return {
    inventoryCatalog,
    inventoryMovements,
    suppliers,
    recipes,
    purchases,
    sales,
  };
}

export function addOrUpdateProduct(
  state,
  { productId, values }
) {
  const snapshot = buildInventorySnapshot(
    state.inventoryCatalog,
    state.inventoryMovements
  );

  const desiredStock = toNumber(values.onHand);
  const normalizedProduct =
    normalizeInventoryProduct(values);

  if (productId) {
    const currentProduct = snapshot.find(
      (product) => product.id === productId
    );

    const stockDelta =
      desiredStock -
      toNumber(currentProduct?.onHand);
    const costChanged =
      toNumber(currentProduct?.costPerUnit) !==
      normalizedProduct.costPerUnit;
    const shouldCreateMovement =
      stockDelta !== 0 || costChanged;

    return {
      ...state,
      inventoryCatalog:
        state.inventoryCatalog.map((product) =>
          product.id === productId
            ? {
              ...product,
              ...normalizedProduct,
            }
            : product
        ),
      inventoryMovements:
        !shouldCreateMovement
          ? state.inventoryMovements
          : [
            ...state.inventoryMovements,
            {
              id: buildId("MOV"),
              productId,
              type:
                MOVEMENT_TYPES.ADJUSTMENT,
              quantity: stockDelta,
              unitCost:
                normalizedProduct.costPerUnit,
              movementDate: getTodayISODate(),
              timestamp: new Date().toISOString(),
              source: "inventory_adjustment",
              reference:
                stockDelta === 0
                  ? "Actualización de costo"
                  : "Ajuste manual",
              notes:
                stockDelta === 0
                  ? "Actualización manual de costo"
                  : "Actualización desde ficha de inventario",
            },
          ],
    };
  }

  const nextProductId = buildId("INV");
  const nextCatalog = [
    ...state.inventoryCatalog,
    {
      id: nextProductId,
      ...normalizedProduct,
    },
  ];

  const nextMovements =
    desiredStock > 0
      ? [
        ...state.inventoryMovements,
        {
          id: buildId("MOV"),
          productId: nextProductId,
          type: MOVEMENT_TYPES.ADJUSTMENT,
          quantity: desiredStock,
          unitCost:
            normalizedProduct.costPerUnit,
          movementDate: getTodayISODate(),
          timestamp: new Date().toISOString(),
          source: "product_creation",
          reference:
            "Stock inicial",
          notes:
            "Saldo de apertura del producto",
        },
      ]
      : state.inventoryMovements;

  return {
    ...state,
    inventoryCatalog: nextCatalog,
    inventoryMovements: nextMovements,
  };
}

export function deleteProduct(state, productId) {
  return {
    ...state,
    inventoryCatalog: state.inventoryCatalog.filter(
      (product) => product.id !== productId
    ),
    inventoryMovements:
      state.inventoryMovements.filter(
        (movement) =>
          movement.productId !== productId
      ),
  };
}

export function addSupplier(state, values) {
  return {
    ...state,
    suppliers: [
      ...state.suppliers,
      normalizeSupplier(values),
    ],
  };
}

export function updateSupplier(
  state,
  { supplierId, values }
) {
  return {
    ...state,
    suppliers: state.suppliers.map((supplier) =>
      supplier.id === supplierId
        ? {
          ...supplier,
          ...normalizeSupplier({
            ...values,
            id: supplierId,
          }),
        }
        : supplier
    ),
  };
}

export function deleteSupplier(
  state,
  supplierId
) {
  return {
    ...state,
    suppliers: state.suppliers.filter(
      (supplier) => supplier.id !== supplierId
    ),
  };
}

export function addRecipe(state, values) {
  return {
    ...state,
    recipes: [
      ...state.recipes,
      normalizeRecipe({
        ...values,
        id: buildId("REC"),
      }),
    ],
  };
}

export function createPurchaseOrder(
  state,
  values
) {
  const purchase = normalizePurchase(
    {
      ...values,
      id:
        values.id?.trim() ||
        `OC-${String(
          state.purchases.length + 1001
        )}`,
    },
    state.inventoryCatalog
  );

  return {
    ...state,
    purchases: [...state.purchases, purchase],
  };
}

export function markPurchaseInTransit(
  state,
  purchaseId
) {
  return {
    ...state,
    purchases: state.purchases.map(
      (purchase) =>
        purchase.id === purchaseId &&
          purchase.status ===
          PURCHASE_STATUSES.PENDING
          ? {
            ...purchase,
            status:
              PURCHASE_STATUSES.IN_TRANSIT,
          }
          : purchase
    ),
  };
}

export function receivePurchaseOrder(
  state,
  { purchaseId, receiptDate, receiptNotes, items }
) {
  const purchase = state.purchases.find(
    (entry) => entry.id === purchaseId
  );

  if (!purchase) {
    return state;
  }

  const receiptItems = items.map((item) => ({
    ...item,
    receivedQuantity: toNumber(
      item.receivedQuantity
    ),
    unitCost: toNumber(item.unitCost),
  }));

  const nextMovements = [
    ...state.inventoryMovements,
    ...receiptItems
      .filter(
        (item) => item.receivedQuantity > 0
      )
      .map((item) => ({
        id: buildId("MOV"),
        productId: item.productId,
        type: MOVEMENT_TYPES.PURCHASE,
        quantity: item.receivedQuantity,
        unitCost: item.unitCost,
        movementDate:
          normalizeDate(receiptDate) ||
          getTodayISODate(),
        timestamp: new Date().toISOString(),
        source: "purchase_receipt",
        reference: purchase.id,
        notes:
          receiptNotes ||
          `Recepción ${purchase.id}`,
      })),
  ];

  const nextCatalog =
    state.inventoryCatalog.map((product) => {
      const receiptItem = receiptItems.find(
        (item) =>
          item.productId === product.id
      );

      if (!receiptItem) {
        return product;
      }

      return {
        ...product,
        supplier: purchase.supplier,
        costPerUnit: receiptItem.unitCost,
      };
    });

  const nextPurchases = state.purchases.map(
    (entry) => {
      if (entry.id !== purchaseId) {
        return entry;
      }

      const nextItems = entry.items.map((item) => {
        const receiptItem =
          receiptItems.find(
            (candidate) =>
              candidate.id === item.id
          ) || item;

        return {
          ...item,
          receivedQuantity:
            receiptItem.receivedQuantity,
          unitCost: receiptItem.unitCost,
          totalCost:
            toNumber(
              receiptItem.receivedQuantity
            ) *
            toNumber(
              receiptItem.unitCost
            ),
        };
      });

      return {
        ...entry,
        status: PURCHASE_STATUSES.RECEIVED,
        receiptDate: normalizeDate(
          receiptDate
        ),
        receiptNotes: String(
          receiptNotes || ""
        ).trim(),
        items: nextItems,
        amount: calculatePurchaseAmount({
          ...entry,
          items: nextItems,
        }),
      };
    }
  );

  return {
    ...state,
    inventoryCatalog: nextCatalog,
    inventoryMovements: nextMovements,
    purchases: nextPurchases,
  };
}

export function generateSaleId(state) {
  return `VTA-${String(state.sales.length + 1001)}`;
}

// Calcula los movimientos de inventario (descuento de stock) que
// corresponden a los ítems de un ticket/venta. Se reutiliza tanto para
// ventas directas (recordSale) como para tickets pendientes (saveTicket),
// ya que en ambos casos el stock se reserva/descuenta en el mismo momento.
function buildSaleStockMovements(
  normalizedItems,
  recipes,
  snapshot,
  saleId,
  saleDate,
  source
) {
  const newMovements = [];

  for (const item of normalizedItems) {
    if (item.type === "recipe") {
      const recipe = recipes.find((r) => r.id === item.itemId);
      if (recipe?.ingredients) {
        // Flatten resolves any sub-recipe (base_recipe) references
        // down to raw inventory products, scaled by the quantity of
        // portions sold, so stock is always discounted from actual
        // purchasable ingredients (e.g. flour, water) rather than a
        // virtual "1 dough unit" that has no inventory of its own.
        const flattenedIngredients = flattenRecipeIngredients(
          recipe,
          recipes,
          item.quantity
        );

        const aggregatedByProduct = new Map();
        for (const ing of flattenedIngredients) {
          const existing = aggregatedByProduct.get(ing.productId);
          if (existing) {
            existing.quantity += ing.quantity;
          } else {
            aggregatedByProduct.set(ing.productId, {
              quantity: ing.quantity,
              unit: ing.unit,
            });
          }
        }

        for (const [productId, { quantity, unit }] of aggregatedByProduct) {
          const product = snapshot.find((p) => p.id === productId);
          if (product) {
            const totalQtyToDeduct = normalizeQuantity(
              quantity,
              unit,
              product.purchaseUnit,
              product.avgUnitWeightGr
            );
            newMovements.push({
              id: buildId("MOV"),
              productId,
              type: MOVEMENT_TYPES.SALE,
              quantity: -1 * totalQtyToDeduct,
              unitCost: product.costPerUnit,
              movementDate: saleDate,
              timestamp: new Date().toISOString(),
              source,
              reference: saleId,
              notes: `Venta ${item.quantity}x ${recipe.name}`,
            });
          }
        }
      }
    } else {
      const product = snapshot.find((p) => p.id === item.itemId);
      if (product) {
        const convertedQuantity = getConvertedQuantity(
          item.quantity,
          item.unit,
          product.purchaseUnit
        );
        newMovements.push({
          id: buildId("MOV"),
          productId: product.id,
          type: MOVEMENT_TYPES.SALE,
          quantity: -1 * convertedQuantity,
          unitCost: product.costPerUnit,
          movementDate: saleDate,
          timestamp: new Date().toISOString(),
          source,
          reference: saleId,
          notes: `Venta directa ${item.quantity}x ${product.item}`,
        });
      }
    }
  }

  return newMovements;
}

// Venta directa de mostrador: se registra y se cierra (paga) en un solo
// paso, descontando el stock en el mismo momento.
export function recordSale(
  state,
  { id, date, time, tableOrCustomer, paymentMethod, items, notes }
) {
  const saleId = id?.trim() || generateSaleId(state);
  const saleDate = normalizeDate(date) || getTodayISODate();
  const saleTime =
    time ||
    new Date().toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const now = new Date().toISOString();

  const snapshot = buildInventorySnapshot(
    state.inventoryCatalog,
    state.inventoryMovements
  );

  const normalizedItems = (items || []).map((item) =>
    normalizeSaleItem(item, snapshot, state.recipes)
  );

  const sale = normalizeSale(
    {
      id: saleId,
      date: saleDate,
      time: saleTime,
      tableOrCustomer,
      paymentMethod,
      items: normalizedItems,
      notes,
      status: SALE_STATUSES.COMPLETED,
      closedAt: now,
    },
    snapshot,
    state.recipes
  );

  const newMovements = buildSaleStockMovements(
    normalizedItems,
    state.recipes,
    snapshot,
    saleId,
    saleDate,
    "pos_sale"
  );

  return {
    ...state,
    sales: [sale, ...state.sales],
    inventoryMovements: [
      ...state.inventoryMovements,
      ...newMovements,
    ],
  };
}

// Guarda (crea o actualiza) un ticket pendiente: una mesa/comanda activa
// cuyo stock se reserva/descuenta de inmediato, pero que aún no se ha
// cobrado. Si el ticket ya existía, sus movimientos de stock previos se
// reintegran y se recalculan según los ítems actuales (evita duplicar
// el descuento al agregar o quitar productos de una mesa abierta).
export function saveTicket(
  state,
  { id, tableOrCustomer, paymentMethod, items, notes }
) {
  const existing = id
    ? state.sales.find(
      (s) => s.id === id && s.status === SALE_STATUSES.PENDING
    )
    : null;

  const saleId = existing?.id || id?.trim() || generateSaleId(state);
  const saleDate = existing?.date || getTodayISODate();
  const saleTime =
    existing?.time ||
    new Date().toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const snapshot = buildInventorySnapshot(
    state.inventoryCatalog,
    state.inventoryMovements
  );

  const normalizedItems = (items || []).map((item) =>
    normalizeSaleItem(item, snapshot, state.recipes)
  );

  const sale = normalizeSale(
    {
      id: saleId,
      date: saleDate,
      time: saleTime,
      tableOrCustomer,
      paymentMethod: paymentMethod || existing?.paymentMethod,
      items: normalizedItems,
      notes,
      status: SALE_STATUSES.PENDING,
    },
    snapshot,
    state.recipes
  );

  // Reintegra los movimientos de stock previos de este ticket (si existía)
  // antes de recalcular el descuento con los ítems actuales.
  const movementsWithoutPreviousTicket = state.inventoryMovements.filter(
    (m) => !(m.reference === saleId && m.type === MOVEMENT_TYPES.SALE)
  );

  const newMovements = buildSaleStockMovements(
    normalizedItems,
    state.recipes,
    snapshot,
    saleId,
    saleDate,
    "pos_pending_ticket"
  );

  const sales = existing
    ? state.sales.map((s) => (s.id === saleId ? sale : s))
    : [sale, ...state.sales];

  return {
    ...state,
    sales,
    inventoryMovements: [
      ...movementsWithoutPreviousTicket,
      ...newMovements,
    ],
  };
}

// Cierra (cobra) un ticket pendiente: el stock ya fue descontado al
// guardarlo, por lo que solo se actualiza el estado, método de pago y
// fecha de cierre.
export function closeTicket(state, { saleId, paymentMethod, notes }) {
  const sale = state.sales.find((s) => s.id === saleId);

  if (!sale || sale.status !== SALE_STATUSES.PENDING) {
    return state;
  }

  const now = new Date().toISOString();

  return {
    ...state,
    sales: state.sales.map((s) =>
      s.id === saleId
        ? {
          ...s,
          status: SALE_STATUSES.COMPLETED,
          paymentMethod: paymentMethod || s.paymentMethod,
          notes: notes != null ? String(notes).trim() : s.notes,
          closedAt: now,
        }
        : s
    ),
  };
}

export function voidSale(state, saleId) {
  const sale = state.sales.find(
    (s) => s.id === saleId
  );
  if (!sale || sale.status === "voided") {
    return state;
  }

  const saleMovements =
    state.inventoryMovements.filter(
      (m) =>
        m.reference === saleId &&
        m.type === MOVEMENT_TYPES.SALE
    );

  const reversalMovements = saleMovements.map(
    (m) => ({
      id: buildId("MOV"),
      productId: m.productId,
      type: MOVEMENT_TYPES.ADJUSTMENT,
      quantity: Math.abs(m.quantity),
      unitCost: m.unitCost,
      movementDate: getTodayISODate(),
      timestamp: new Date().toISOString(),
      source: "sale_void",
      reference: `Anulación ${saleId}`,
      notes: `Reintegro por venta anulada ${saleId}`,
    })
  );

  const updatedSales = state.sales.map((s) =>
    s.id === saleId
      ? { ...s, status: "voided" }
      : s
  );

  return {
    ...state,
    sales: updatedSales,
    inventoryMovements: [
      ...state.inventoryMovements,
      ...reversalMovements,
    ],
  };
}

export const WASTE_REASONS = [
  "Producto vencido",
  "Daño físico / golpe",
  "Preparación fallida",
  "Merma de cocina",
  "Contaminación cruzada",
  "Error de producción",
  "Derrame",
  "Otro",
];

export function recordWaste(
  state,
  { productId, quantity, reason, notes, movementDate }
) {
  const snapshot = buildInventorySnapshot(
    state.inventoryCatalog,
    state.inventoryMovements
  );

  const product = snapshot.find((p) => p.id === productId);
  if (!product) {
    return state;
  }

  const numericQty = toNumber(quantity, 0);
  if (numericQty <= 0) {
    return state;
  }

  const date = normalizeDate(movementDate) || getTodayISODate();
  const unitCost = product.costPerUnit || 0;
  const totalCost = numericQty * unitCost;
  const wasteReason = reason || "Otro";
  const wasteNotes = String(notes || "").trim();

  const wasteMovement = {
    id: buildId("MOV"),
    productId,
    type: MOVEMENT_TYPES.WASTE,
    quantity: -1 * numericQty,
    unitCost,
    totalCost,
    reason: wasteReason,
    movementDate: date,
    timestamp: new Date().toISOString(),
    source: "inventory_waste",
    reference: `Merma: ${wasteReason}`,
    notes: wasteNotes ? `${wasteReason} - ${wasteNotes}` : wasteReason,
  };

  return {
    ...state,
    inventoryMovements: [...state.inventoryMovements, wasteMovement],
  };
}

export function getRecentMovements(
  movements,
  catalog,
  limit = 8
) {
  const productById = new Map(
    catalog.map((product) => [
      product.id,
      product,
    ])
  );

  return [...movements]
    .map((movement) => {
      const product = productById.get(
        movement.productId
      );

      return {
        ...movement,
        productName:
          product?.item || "Producto",
      };
    })
    .sort((left, right) =>
      right.movementDate.localeCompare(
        left.movementDate
      )
    )
    .slice(0, limit);
}

export function getOperationalAlerts(state, referenceDate = getTodayISODate()) {
  if (!state) return [];

  const inventory = buildInventorySnapshot(
    state.inventoryCatalog || [],
    state.inventoryMovements || []
  );

  const alerts = [];

  // 1. Quiebres de stock y stock crítico
  inventory.forEach((product) => {
    if (product.onHand <= 0) {
      alerts.push({
        id: `alert-out-${product.id}`,
        category: "stock",
        severity: "danger",
        title: "Quiebre de Stock",
        message: `${product.item} no tiene existencias disponibles (0 ${product.purchaseUnit}).`,
        entityId: product.id,
        actionLabel: "Reponer en Compras",
        actionRoute: "/purchases",
      });
    } else if (product.onHand <= product.minStock) {
      alerts.push({
        id: `alert-low-${product.id}`,
        category: "stock",
        severity: "warning",
        title: "Stock Crítico",
        message: `${product.item} tiene ${product.onHand} ${product.purchaseUnit} (mínimo: ${product.minStock} ${product.purchaseUnit}).`,
        entityId: product.id,
        actionLabel: "Crear Pedido",
        actionRoute: "/purchases",
      });
    }
  });

  // 2. Mermas elevadas
  const wasteByProduct = new Map();
  (state.inventoryMovements || []).forEach((mov) => {
    if (mov.type === "waste") {
      const current = wasteByProduct.get(mov.productId) || { cost: 0, qty: 0 };
      current.cost += Math.abs(mov.totalCost || (mov.unitCost ? Math.abs(mov.quantity) * mov.unitCost : 0));
      current.qty += Math.abs(mov.quantity);
      wasteByProduct.set(mov.productId, current);
    }
  });

  const productMap = new Map(inventory.map((p) => [p.id, p]));
  wasteByProduct.forEach((wasteData, productId) => {
    if (wasteData.cost >= 10000 || wasteData.qty >= 3) {
      const prod = productMap.get(productId);
      const name = prod?.item || "Insumo";
      const unit = prod?.purchaseUnit || "un";
      alerts.push({
        id: `alert-waste-${productId}`,
        category: "waste",
        severity: "warning",
        title: "Alerta de Merma Elevada",
        message: `${name} acumula ${wasteData.qty} ${unit} en mermas ($${Math.round(wasteData.cost).toLocaleString("es-CL")}).`,
        entityId: productId,
        actionLabel: "Ver en Reportes",
        actionRoute: "/reports",
      });
    }
  });

  // 3. Órdenes de compra pendientes / en tránsito antiguas
  const refTime = new Date(referenceDate).getTime();
  (state.purchases || []).forEach((purchase) => {
    if (purchase.status === "pending" || purchase.status === "in-transit") {
      const orderDateStr = normalizeDate(purchase.orderedDate) || referenceDate;
      const orderTime = new Date(orderDateStr).getTime();
      const daysDiff = Math.max(0, Math.floor((refTime - orderTime) / (1000 * 60 * 60 * 24)));
      if (daysDiff >= 3) {
        alerts.push({
          id: `alert-purchase-${purchase.id}`,
          category: "purchases",
          severity: purchase.status === "in-transit" ? "warning" : "info",
          title: `Orden ${purchase.id} pendiente (${daysDiff} días)`,
          message: `Proveedor ${purchase.supplier || "Sin asignar"} (${purchase.category || "General"}) solicitada el ${formatDisplayDate(purchase.orderedDate)}.`,
          entityId: purchase.id,
          actionLabel: "Recepcionar Orden",
          actionRoute: "/purchases",
        });
      }
    }
  });

  // 4. Insumos sin rotación (> 30 días)
  const lastMovementByProduct = new Map();
  (state.inventoryMovements || []).forEach((mov) => {
    const movDate = normalizeDate(mov.movementDate);
    const existing = lastMovementByProduct.get(mov.productId);
    if (!existing || movDate > existing) {
      lastMovementByProduct.set(mov.productId, movDate);
    }
  });

  inventory.forEach((product) => {
    if (product.onHand > 0) {
      const lastDate = lastMovementByProduct.get(product.id);
      if (!lastDate) {
        alerts.push({
          id: `alert-inactive-${product.id}`,
          category: "inactive",
          severity: "info",
          title: "Insumo sin rotación",
          message: `${product.item} (${product.onHand} ${product.purchaseUnit}) no registra movimientos.`,
          entityId: product.id,
          actionLabel: "Ver en Inventario",
          actionRoute: "/inventory",
        });
      } else {
        const lastTime = new Date(lastDate).getTime();
        const daysSinceLastMov = Math.max(0, Math.floor((refTime - lastTime) / (1000 * 60 * 60 * 24)));
        if (daysSinceLastMov >= 30) {
          alerts.push({
            id: `alert-inactive-${product.id}`,
            category: "inactive",
            severity: "info",
            title: `Insumo inactivo (${daysSinceLastMov} días)`,
            message: `${product.item} (${product.onHand} ${product.purchaseUnit}) sin movimientos desde ${formatDisplayDate(lastDate)}.`,
            entityId: product.id,
            actionLabel: "Ver en Inventario",
            actionRoute: "/inventory",
          });
        }
      }
    }
  });

  return alerts;
}

export function generatePurchaseSuggestions(state) {
  if (!state) return [];

  const inventory = buildInventorySnapshot(
    state.inventoryCatalog || [],
    state.inventoryMovements || []
  );

  // Consider items in pending/in-transit purchase orders
  const onOrderMap = new Map();
  (state.purchases || []).forEach((purchase) => {
    if (purchase.status === "pending" || purchase.status === "in-transit") {
      (purchase.items || []).forEach((item) => {
        const cur = onOrderMap.get(item.productId) || 0;
        onOrderMap.set(item.productId, cur + toNumber(item.quantity, 0));
      });
    }
  });

  const suggestions = [];

  inventory.forEach((product) => {
    const onOrder = onOrderMap.get(product.id) || 0;
    const effectiveStock = product.onHand + onOrder;
    const minStock = toNumber(product.minStock, 0);

    // If effective stock is below minimum required
    if (effectiveStock < minStock) {
      // Recommend buying enough to cover deficit plus a buffer (50% of minStock, or at least 1 unit)
      const buffer = Math.max(1, Math.ceil(minStock * 0.5));
      const suggestedQty = (minStock - effectiveStock) + buffer;
      const estimatedCost = suggestedQty * (product.costPerUnit || 0);

      suggestions.push({
        productId: product.id,
        productName: product.item,
        category: product.category,
        supplier: product.supplier || "Sin asignar",
        purchaseUnit: product.purchaseUnit,
        onHand: product.onHand,
        onOrder,
        minStock: product.minStock,
        unitCost: product.costPerUnit || 0,
        suggestedQuantity: suggestedQty,
        estimatedCost,
        urgency: product.onHand <= 0 ? "critical" : "high",
      });
    }
  });

  return suggestions.sort((a, b) => {
    if (a.urgency === "critical" && b.urgency !== "critical") return -1;
    if (b.urgency === "critical" && a.urgency !== "critical") return 1;
    return b.estimatedCost - a.estimatedCost;
  });
}

export function generateDailySnapshots(state, daysLimit = 14) {
  if (!state) return [];

  // Group events by movementDate
  const allDates = new Set();
  const today = getTodayISODate();
  allDates.add(today);

  (state.inventoryMovements || []).forEach((m) => {
    if (m.movementDate) allDates.add(normalizeDate(m.movementDate));
  });
  (state.sales || []).forEach((s) => {
    if (s.date) allDates.add(normalizeDate(s.date));
  });
  (state.purchases || []).forEach((p) => {
    if (p.receiptDate) allDates.add(normalizeDate(p.receiptDate));
  });

  const sortedDates = Array.from(allDates)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const snapshots = [];

  sortedDates.forEach((date) => {
    // Movements up to this date
    const movementsUpToDate = (state.inventoryMovements || []).filter(
      (m) => normalizeDate(m.movementDate) <= date
    );

    const snapshotInventory = buildInventorySnapshot(
      state.inventoryCatalog || [],
      movementsUpToDate
    );

    const inventoryValue = snapshotInventory.reduce(
      (sum, p) => sum + (p.inventoryValue || 0),
      0
    );

    const outOfStockCount = snapshotInventory.filter((p) => p.onHand <= 0).length;
    const criticalStockCount = snapshotInventory.filter(
      (p) => p.onHand > 0 && p.onHand <= p.minStock
    ).length;

    // Daily metrics for this specific day (solo ventas cerradas/pagadas)
    const dailySales = (state.sales || [])
      .filter((s) => normalizeDate(s.date) === date && s.status === SALE_STATUSES.COMPLETED)
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    const dailyCost = (state.sales || [])
      .filter((s) => normalizeDate(s.date) === date && s.status === SALE_STATUSES.COMPLETED)
      .reduce((sum, s) => sum + (s.totalCost || 0), 0);

    const dailyWaste = (state.inventoryMovements || [])
      .filter((m) => m.type === "waste" && normalizeDate(m.movementDate) === date)
      .reduce((sum, m) => sum + (m.totalCost || (m.unitCost ? Math.abs(m.quantity) * m.unitCost : 0)), 0);

    const dailyPurchases = (state.purchases || [])
      .filter((p) => p.status === "received" && normalizeDate(p.receiptDate) === date)
      .reduce((sum, p) => sum + calculatePurchaseAmount(p), 0);

    const grossMargin = dailySales > 0 ? Math.round(((dailySales - dailyCost) / dailySales) * 100) : 0;

    snapshots.push({
      date,
      dateLabel: formatDisplayDate(date),
      inventoryValue,
      outOfStockCount,
      criticalStockCount,
      dailySales,
      dailyCost,
      dailyWaste,
      dailyPurchases,
      grossMargin,
      profit: dailySales - dailyCost,
    });
  });

  return snapshots.slice(-daysLimit);
}
