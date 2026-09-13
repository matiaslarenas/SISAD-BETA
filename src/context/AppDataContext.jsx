import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  buildInventorySnapshot,
  calculatePurchaseAmount,
  formatDisplayDate,
  generateDailySnapshots,
  generatePurchaseSuggestions,
  generateSaleId,
  getOperationalAlerts,
  getPurchaseStatusMeta,
  getRecentMovements,
} from "../state/appState";

const AppDataContext = createContext(null);

// Cada dispositivo (desktop, tablet, celular) consulta este mismo servidor
// corriendo en el computador de escritorio — es la única fuente de verdad
// del inventario y las ventas. Ver server/index.js.
const POLL_INTERVAL_MS = 2000;

async function fetchState() {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("No se pudo obtener el estado del servidor");
  return res.json();
}

async function postAction(action) {
  const res = await fetch("/api/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo guardar el cambio");
  }
  return res.json();
}

export function AppDataProvider({ children }) {
  const [state, setState] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const revisionRef = useRef(0);
  const hasWarnedRef = useRef(false);

  // Carga inicial + polling corto para reflejar cambios hechos desde otros
  // dispositivos conectados a la misma red WiFi. Ver la nota de diseño en
  // server/index.js sobre por qué se usa polling en vez de WebSockets.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const { revision, data } = await fetchState();
        if (cancelled) return;

        if (revision !== revisionRef.current) {
          revisionRef.current = revision;
          setState(data);
        }

        setConnectionError((prev) => (prev ? null : prev));
        hasWarnedRef.current = false;
      } catch (error) {
        if (cancelled) return;
        setConnectionError(error.message);
        if (!hasWarnedRef.current) {
          toast.error(
            "Sin conexión con el servidor local. Verifica la red WiFi."
          );
          hasWarnedRef.current = true;
        }
      }
    }

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const dispatch = useCallback(async (action) => {
    try {
      const { revision, data } = await postAction(action);
      revisionRef.current = revision;
      setState(data);
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el cambio.");
      throw error;
    }
  }, []);

  const inventory = useMemo(
    () =>
      state
        ? buildInventorySnapshot(state.inventoryCatalog, state.inventoryMovements)
        : [],
    [state]
  );

  const purchases = useMemo(
    () =>
      state
        ? state.purchases.map((purchase) => ({
            ...purchase,
            amount: calculatePurchaseAmount(purchase),
            orderedDateLabel: formatDisplayDate(purchase.orderedDate),
            receiptDateLabel: formatDisplayDate(purchase.receiptDate),
            statusMeta: getPurchaseStatusMeta(purchase.status),
          }))
        : [],
    [state]
  );

  const recentMovements = useMemo(
    () => (state ? getRecentMovements(state.inventoryMovements, inventory) : []),
    [state, inventory]
  );

  const alerts = useMemo(
    () => (state ? getOperationalAlerts(state) : []),
    [state]
  );

  const purchaseSuggestions = useMemo(
    () => (state ? generatePurchaseSuggestions(state) : []),
    [state]
  );

  const dailySnapshots = useMemo(
    () => (state ? generateDailySnapshots(state) : []),
    [state]
  );

  const value = useMemo(
    () => ({
      isLoading: state === null,
      connectionError,
      inventory,
      inventoryMovements: state?.inventoryMovements ?? [],
      suppliers: state?.suppliers ?? [],
      recipes: state?.recipes ?? [],
      purchases,
      recentMovements,
      alerts,
      purchaseSuggestions,
      dailySnapshots,
      sales: state?.sales ?? [],
      rawState: state,
      saveProduct: (productId, values) =>
        dispatch({ type: "product/save", payload: { productId, values } }),
      removeProduct: (productId) =>
        dispatch({ type: "product/delete", payload: { productId } }),
      addSupplier: (values) => dispatch({ type: "supplier/add", payload: values }),
      updateSupplier: (supplierId, values) =>
        dispatch({ type: "supplier/update", payload: { supplierId, values } }),
      removeSupplier: (supplierId) =>
        dispatch({ type: "supplier/delete", payload: { supplierId } }),
      addRecipe: (values) => dispatch({ type: "recipe/add", payload: values }),
      createPurchase: (values) =>
        dispatch({ type: "purchase/create", payload: values }),
      setPurchaseInTransit: (purchaseId) =>
        dispatch({ type: "purchase/in-transit", payload: { purchaseId } }),
      receivePurchase: (payload) =>
        dispatch({ type: "purchase/receive", payload }),
      restoreBackupState: (backupState) =>
        dispatch({ type: "state/restore", payload: backupState }),
      recordSale: (payload) => dispatch({ type: "sale/record", payload }),
      saveTicket: (payload) => dispatch({ type: "sale/save-ticket", payload }),
      closeTicket: (payload) => dispatch({ type: "sale/close-ticket", payload }),
      generateSaleId: () => (state ? generateSaleId(state) : ""),
      voidSale: (saleId) => dispatch({ type: "sale/void", payload: { saleId } }),
      recordWaste: (payload) => dispatch({ type: "waste/record", payload }),
    }),
    [
      state,
      connectionError,
      inventory,
      purchases,
      recentMovements,
      alerts,
      purchaseSuggestions,
      dailySnapshots,
      dispatch,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData debe utilizarse dentro de AppDataProvider");
  }

  return context;
}
