/**
 * Reducer raíz de la aplicación. Extraído de AppDataContext.jsx para que
 * tanto el cliente (React) como el servidor (Node, sin React) puedan
 * aplicar exactamente la misma lógica de negocio sobre el mismo estado.
 *
 * No importar nada de React ni del navegador aquí — debe poder correr
 * tal cual en el servidor Node.
 */
import {
  addOrUpdateProduct,
  addRecipe,
  addSupplier,
  closeTicket,
  createPurchaseOrder,
  deleteProduct,
  deleteSupplier,
  markPurchaseInTransit,
  normalizeLoadedState,
  receivePurchaseOrder,
  recordSale,
  recordWaste,
  saveTicket,
  updateSupplier,
  voidSale,
} from "./appState.js";

export function appDataReducer(state, action) {
  switch (action.type) {
    case "product/save":
      return addOrUpdateProduct(state, action.payload);

    case "product/delete":
      return deleteProduct(state, action.payload.productId);

    case "supplier/add":
      return addSupplier(state, action.payload);

    case "supplier/update":
      return updateSupplier(state, action.payload);

    case "supplier/delete":
      return deleteSupplier(state, action.payload.supplierId);

    case "recipe/add":
      return addRecipe(state, action.payload);

    case "purchase/create":
      return createPurchaseOrder(state, action.payload);

    case "purchase/in-transit":
      return markPurchaseInTransit(state, action.payload.purchaseId);

    case "purchase/receive":
      return receivePurchaseOrder(state, action.payload);

    case "sale/record":
      return recordSale(state, action.payload);

    case "sale/save-ticket":
      return saveTicket(state, action.payload);

    case "sale/close-ticket":
      return closeTicket(state, action.payload);

    case "sale/void":
      return voidSale(state, action.payload.saleId);

    case "waste/record":
      return recordWaste(state, action.payload);

    case "state/restore":
      return normalizeLoadedState(action.payload);

    default:
      return state;
  }
}
