import {
  createDefaultAppState,
  normalizeLoadedState,
} from "../state/appState";

const STORAGE_VERSION = "5";
const VERSION_KEY = "reserve_storage_version";
const APP_STATE_KEY = "reserve_app_state";

export const STORAGE_KEYS = {
  inventory: "inventory",
  inventoryMovements:
    "inventoryMovements",
  suppliers: "suppliers",
  purchases: "purchases",
  recipes: "recipes",
  sales: "sales",
};

function getStorage() {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return null;
  }

  return window.localStorage;
}

function clearLegacyKeys(storage) {
  Object.values(STORAGE_KEYS).forEach((key) =>
    storage.removeItem(key)
  );
}

function readLegacyState(storage) {
  const legacyState = {};
  let hasLegacyData = false;

  Object.entries(STORAGE_KEYS).forEach(
    ([stateKey, storageKey]) => {
      const rawValue =
        storage.getItem(storageKey);

      if (!rawValue) {
        return;
      }

      try {
        legacyState[stateKey] =
          JSON.parse(rawValue);
        hasLegacyData = true;
      } catch {
        legacyState[stateKey] = [];
      }
    }
  );

  return hasLegacyData
    ? legacyState
    : null;
}

export function seedData() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const currentVersion =
    storage.getItem(VERSION_KEY);
  const currentState =
    storage.getItem(APP_STATE_KEY);

  if (
    currentVersion === STORAGE_VERSION &&
    currentState
  ) {
    return;
  }

  if (currentState) {
    try {
      saveAppState(
        normalizeLoadedState(
          JSON.parse(currentState)
        )
      );
      return;
    } catch {
      // Fall through to legacy/default recovery.
    }
  }

  const legacyState =
    readLegacyState(storage);

  saveAppState(
    legacyState
      ? normalizeLoadedState(legacyState)
      : createDefaultAppState()
  );
}

export function loadAppState() {
  const storage = getStorage();

  if (!storage) {
    return createDefaultAppState();
  }

  const rawState =
    storage.getItem(APP_STATE_KEY);

  if (rawState) {
    try {
      return normalizeLoadedState(
        JSON.parse(rawState)
      );
    } catch {
      saveAppState(createDefaultAppState());
      return createDefaultAppState();
    }
  }

  const legacyState =
    readLegacyState(storage);

  if (legacyState) {
    const migratedState =
      normalizeLoadedState(legacyState);
    saveAppState(migratedState);
    return migratedState;
  }

  const defaultState =
    createDefaultAppState();
  saveAppState(defaultState);
  return defaultState;
}

export function saveAppState(state) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(
    APP_STATE_KEY,
    JSON.stringify(state)
  );
  storage.setItem(
    VERSION_KEY,
    STORAGE_VERSION
  );
  clearLegacyKeys(storage);
}

export function loadData(key) {
  const state = loadAppState();

  switch (key) {
    case STORAGE_KEYS.inventory:
      return state.inventoryCatalog;
    case STORAGE_KEYS.inventoryMovements:
      return state.inventoryMovements;
    case STORAGE_KEYS.suppliers:
      return state.suppliers;
    case STORAGE_KEYS.purchases:
      return state.purchases;
    case STORAGE_KEYS.recipes:
      return state.recipes;
    case STORAGE_KEYS.sales:
      return state.sales;
    default:
      return [];
  }
}
