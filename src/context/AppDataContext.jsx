import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import {
  addOrUpdateProduct,
  addRecipe,
  addSupplier,
  buildInventorySnapshot,
  calculatePurchaseAmount,
  closeTicket,
  createPurchaseOrder,
  deleteProduct,
  deleteSupplier,
  formatDisplayDate,
  generateDailySnapshots,
  generatePurchaseSuggestions,
  generateSaleId,
  getOperationalAlerts,
  getPurchaseStatusMeta,
  getRecentMovements,
  markPurchaseInTransit,
  normalizeLoadedState,
  receivePurchaseOrder,
  recordSale,
  recordWaste,
  saveTicket,
  updateSupplier,
  voidSale,
} from "../state/appState";

import {
  loadAppState,
  saveAppState,
} from "../utils/storage";

const AppDataContext =
  createContext(null);

function appDataReducer(state, action) {
  switch (action.type) {
    case "product/save":
      return addOrUpdateProduct(
        state,
        action.payload
      );

    case "product/delete":
      return deleteProduct(
        state,
        action.payload.productId
      );

    case "supplier/add":
      return addSupplier(
        state,
        action.payload
      );

    case "supplier/update":
      return updateSupplier(
        state,
        action.payload
      );

    case "supplier/delete":
      return deleteSupplier(
        state,
        action.payload.supplierId
      );

    case "recipe/add":
      return addRecipe(
        state,
        action.payload
      );

    case "purchase/create":
      return createPurchaseOrder(
        state,
        action.payload
      );

    case "purchase/in-transit":
      return markPurchaseInTransit(
        state,
        action.payload.purchaseId
      );

    case "purchase/receive":
      return receivePurchaseOrder(
        state,
        action.payload
      );

    case "sale/record":
      return recordSale(
        state,
        action.payload
      );

    case "sale/save-ticket":
      return saveTicket(
        state,
        action.payload
      );

    case "sale/close-ticket":
      return closeTicket(
        state,
        action.payload
      );

    case "sale/void":
      return voidSale(
        state,
        action.payload.saleId
      );

    case "waste/record":
      return recordWaste(
        state,
        action.payload
      );

    case "state/restore":
      return normalizeLoadedState(action.payload);

    default:
      return state;
  }
}

export function AppDataProvider({
  children,
}) {
  const [state, dispatch] = useReducer(
    appDataReducer,
    undefined,
    loadAppState
  );

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const inventory = useMemo(
    () =>
      buildInventorySnapshot(
        state.inventoryCatalog,
        state.inventoryMovements
      ),
    [
      state.inventoryCatalog,
      state.inventoryMovements,
    ]
  );

  const purchases = useMemo(
    () =>
      state.purchases.map((purchase) => ({
        ...purchase,
        amount: calculatePurchaseAmount(
          purchase
        ),
        orderedDateLabel:
          formatDisplayDate(
            purchase.orderedDate
          ),
        receiptDateLabel:
          formatDisplayDate(
            purchase.receiptDate
          ),
        statusMeta:
          getPurchaseStatusMeta(
            purchase.status
          ),
      })),
    [state.purchases]
  );

  const recentMovements = useMemo(
    () =>
      getRecentMovements(
        state.inventoryMovements,
        inventory
      ),
    [state.inventoryMovements, inventory]
  );

  const alerts = useMemo(
    () => getOperationalAlerts(state),
    [state]
  );

  const purchaseSuggestions = useMemo(
    () => generatePurchaseSuggestions(state),
    [state]
  );

  const dailySnapshots = useMemo(
    () => generateDailySnapshots(state),
    [state]
  );

  const value = useMemo(
    () => ({
      inventory,
      inventoryMovements:
        state.inventoryMovements,
      suppliers: state.suppliers,
      recipes: state.recipes,
      purchases,
      recentMovements,
      alerts,
      purchaseSuggestions,
      dailySnapshots,
      saveProduct: (
        productId,
        values
      ) =>
        dispatch({
          type: "product/save",
          payload: {
            productId,
            values,
          },
        }),
      removeProduct: (productId) =>
        dispatch({
          type: "product/delete",
          payload: { productId },
        }),
      addSupplier: (values) =>
        dispatch({
          type: "supplier/add",
          payload: values,
        }),
      updateSupplier: (
        supplierId,
        values
      ) =>
        dispatch({
          type: "supplier/update",
          payload: {
            supplierId,
            values,
          },
        }),
      removeSupplier: (supplierId) =>
        dispatch({
          type: "supplier/delete",
          payload: { supplierId },
        }),
      addRecipe: (values) =>
        dispatch({
          type: "recipe/add",
          payload: values,
        }),
      createPurchase: (values) =>
        dispatch({
          type: "purchase/create",
          payload: values,
        }),
      setPurchaseInTransit: (
        purchaseId
      ) =>
        dispatch({
          type: "purchase/in-transit",
          payload: { purchaseId },
        }),
      receivePurchase: (payload) =>
        dispatch({
          type: "purchase/receive",
          payload,
        }),
      sales: state.sales,
      rawState: state,
      restoreBackupState: (backupState) =>
        dispatch({
          type: "state/restore",
          payload: backupState,
        }),
      recordSale: (payload) =>
        dispatch({
          type: "sale/record",
          payload,
        }),
      saveTicket: (payload) =>
        dispatch({
          type: "sale/save-ticket",
          payload,
        }),
      closeTicket: (payload) =>
        dispatch({
          type: "sale/close-ticket",
          payload,
        }),
      generateSaleId: () =>
        generateSaleId(state),
      voidSale: (saleId) =>
        dispatch({
          type: "sale/void",
          payload: { saleId },
        }),
      recordWaste: (payload) =>
        dispatch({
          type: "waste/record",
          payload,
        }),
    }),
    [
      inventory,
      purchases,
      recentMovements,
      state,
      state.inventoryMovements,
      state.recipes,
      state.sales,
      state.suppliers,
    ]
  );

  return (
    <AppDataContext.Provider
      value={value}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context =
    useContext(AppDataContext);

  if (!context) {
    throw new Error(
      "useAppData debe utilizarse dentro de AppDataProvider"
    );
  }

  return context;
}
