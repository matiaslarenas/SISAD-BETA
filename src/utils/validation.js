function hasValue(value) {
  return String(value || "").trim().length > 0;
}

function isNonNegativeNumber(value) {
  return (
    value !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0
  );
}

function isPositiveNumber(value) {
  return (
    value !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) > 0
  );
}

export function hasValidationErrors(
  errors
) {
  return Object.keys(errors).length > 0;
}

export function validateProductForm(
  values
) {
  const errors = {};

  if (!hasValue(values.item)) {
    errors.item =
      "Ingresa el nombre del producto.";
  }

  if (!hasValue(values.category)) {
    errors.category =
      "Selecciona una categoría.";
  }

  if (!hasValue(values.location)) {
    errors.location =
      "Ingresa una ubicación.";
  }

  if (
    !isPositiveNumber(values.costPerUnit)
  ) {
    errors.costPerUnit =
      "El costo unitario debe ser mayor a 0.";
  }

  if (
    !isNonNegativeNumber(values.onHand)
  ) {
    errors.onHand =
      "El stock actual debe ser 0 o mayor.";
  }

  if (
    !isNonNegativeNumber(values.minStock)
  ) {
    errors.minStock =
      "El stock mínimo debe ser 0 o mayor.";
  }

  return errors;
}

export function validateSupplierForm(
  values
) {
  const errors = {};

  if (!hasValue(values.name)) {
    errors.name =
      "Ingresa el nombre del proveedor.";
  }

  if (!hasValue(values.category)) {
    errors.category =
      "Ingresa la categoría principal.";
  }

  if (!hasValue(values.leadTime)) {
    errors.leadTime =
      "Ingresa el lead time comprometido.";
  }

  if (
    !isNonNegativeNumber(values.compliance) ||
    Number(values.compliance) > 100
  ) {
    errors.compliance =
      "El cumplimiento debe estar entre 0 y 100.";
  }

  return errors;
}

export function validateIngredientForm(
  values
) {
  const errors = {};

  if (!hasValue(values.productId)) {
    errors.productId =
      "Selecciona un producto.";
  }

  if (
    !isPositiveNumber(values.quantity)
  ) {
    errors.quantity =
      "La cantidad debe ser mayor a 0.";
  }

  return errors;
}

export function validateRecipeForm(
  values
) {
  const errors = {};

  if (!hasValue(values.name)) {
    errors.name =
      "Ingresa el nombre de la receta.";
  }

  if (!hasValue(values.category)) {
    errors.category =
      "Selecciona una categoría.";
  }

  if (
    !isPositiveNumber(values.salePrice)
  ) {
    errors.salePrice =
      "El precio de venta debe ser mayor a 0.";
  }

  if (
    !isPositiveNumber(values.servings)
  ) {
    errors.servings =
      "Las porciones deben ser mayores a 0.";
  }

  if (
    !Array.isArray(values.ingredients) ||
    values.ingredients.length === 0
  ) {
    errors.ingredients =
      "Agrega al menos un ingrediente.";
  }

  return errors;
}

export function validatePurchaseItemForm(
  values
) {
  const errors = {};

  if (!hasValue(values.productId)) {
    errors.productId =
      "Selecciona un producto.";
  }

  if (
    !isPositiveNumber(values.quantity)
  ) {
    errors.quantity =
      "La cantidad debe ser mayor a 0.";
  }

  if (
    !isPositiveNumber(values.unitCost)
  ) {
    errors.unitCost =
      "El costo unitario debe ser mayor a 0.";
  }

  return errors;
}

export function validatePurchaseForm(
  values
) {
  const errors = {};

  if (!hasValue(values.supplier)) {
    errors.supplier =
      "Ingresa el proveedor.";
  }

  if (!hasValue(values.category)) {
    errors.category =
      "Ingresa la categoría de compra.";
  }

  if (!hasValue(values.orderedDate)) {
    errors.orderedDate =
      "Selecciona la fecha de la orden.";
  }

  if (
    !Array.isArray(values.items) ||
    values.items.length === 0
  ) {
    errors.items =
      "Agrega al menos un ítem a la orden.";
  }

  return errors;
}

export function validateReceiptForm(
  values
) {
  const errors = {};

  if (!hasValue(values.receiptDate)) {
    errors.receiptDate =
      "Selecciona la fecha de recepción.";
  }

  if (
    !Array.isArray(values.items) ||
    values.items.length === 0
  ) {
    errors.items =
      "No existen ítems para recibir.";
    return errors;
  }

  const invalidItem =
    values.items.find(
      (item) =>
        !isNonNegativeNumber(
          item.receivedQuantity
        ) ||
        !isPositiveNumber(item.unitCost)
    );

  if (invalidItem) {
    errors.items =
      "Verifica cantidades y costos recibidos.";
  }

  const totalReceived =
    values.items.reduce(
      (sum, item) =>
        sum +
        Number(item.receivedQuantity || 0),
      0
    );

  if (totalReceived <= 0) {
    errors.items =
      "Debes registrar al menos una unidad recibida.";
  }

  return errors;
}

export function validateSaleForm(
  values
) {
  const errors = {};

  if (!hasValue(values.tableOrCustomer)) {
    errors.tableOrCustomer =
      "Ingresa la mesa o cliente.";
  }

  if (!hasValue(values.paymentMethod)) {
    errors.paymentMethod =
      "Selecciona el método de pago.";
  }

  if (
    !Array.isArray(values.items) ||
    values.items.length === 0
  ) {
    errors.items =
      "El ticket debe tener al menos un ítem.";
  }

  return errors;
}

export function validateWasteForm(
  values,
  availableStock = Infinity
) {
  const errors = {};

  if (!hasValue(values.productId)) {
    errors.productId =
      "Selecciona un producto.";
  }

  if (!isPositiveNumber(values.quantity)) {
    errors.quantity =
      "La cantidad de merma debe ser mayor a 0.";
  } else if (Number(values.quantity) > availableStock) {
    errors.quantity = `La merma (${values.quantity}) no puede superar el stock disponible (${availableStock}).`;
  }

  if (!hasValue(values.reason)) {
    errors.reason =
      "Selecciona un motivo de merma.";
  }

  return errors;
}

export function validateBackupData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      isValid: false,
      error: "El archivo no contiene un objeto JSON válido.",
    };
  }

  // Si viene encapsulado en un envoltorio con metadatos ({ schemaVersion, data })
  const payload = data.data && typeof data.data === "object" ? data.data : data;

  const recognizedKeys = [
    "inventoryCatalog",
    "inventory",
    "inventoryMovements",
    "suppliers",
    "purchases",
    "recipes",
    "sales",
  ];

  const hasAnyKey = recognizedKeys.some((k) => Array.isArray(payload[k]));

  if (!hasAnyKey) {
    return {
      isValid: false,
      error: "El archivo no contiene ninguna estructura reconocida del sistema (inventario, movimientos, compras o ventas).",
    };
  }

  return {
    isValid: true,
    error: null,
    payload,
    metadata: {
      backupVersion: data.backupVersion || "legacy",
      schemaVersion: data.schemaVersion || 1,
      createdAt: data.createdAt || null,
      system: data.system || null,
    },
  };
}

