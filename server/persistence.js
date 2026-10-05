/**
 * Persistencia del estado en el servidor: reemplaza a localStorage
 * (src/utils/storage.js) usando el sistema de archivos del desktop.
 *
 * Reutiliza createDefaultAppState/normalizeLoadedState de appState.js —
 * el mismo formato de estado y las mismas migraciones que ya existían
 * en el cliente, para que un backup exportado desde la versión anterior
 * (solo localStorage) se pueda restaurar tal cual en el servidor nuevo.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDefaultAppState,
  normalizeLoadedState,
} from "../src/state/appState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// `dataDir` es configurable solo para los tests; el servidor y los
// scripts usan siempre server/data.
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE_NAME = "app-state.json";

function ensureDataDir(dataDir) {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

export class StateFileError extends Error {}

export function loadState(dataDir = DATA_DIR) {
  ensureDataDir(dataDir);
  const stateFile = path.join(dataDir, STATE_FILE_NAME);

  // Solo una instalación nueva (sin archivo) parte del estado por defecto.
  if (!existsSync(stateFile)) {
    const defaultState = createDefaultAppState();
    saveState(defaultState, dataDir);
    return defaultState;
  }

  // Si el archivo existe pero no se puede leer, se detiene sin tocarlo.
  // Reemplazarlo por el estado por defecto borraría los datos reales, y
  // renombrarlo haría que el siguiente arranque creara la semilla en
  // silencio. El archivo queda tal cual para repararlo o restaurar un
  // respaldo.
  try {
    const raw = readFileSync(stateFile, "utf-8");
    return normalizeLoadedState(JSON.parse(raw));
  } catch (error) {
    throw new StateFileError(
      `No se pudo leer ${stateFile} (${error.message}). ` +
        "El archivo no se modificó. Para recuperar, guarda una copia de él y " +
        "reemplázalo por el último respaldo (el .json descargado con Panel → " +
        "Respaldar Datos sirve tal cual), y vuelve a iniciar.",
      { cause: error }
    );
  }
}

// Escritura atómica: escribe a un archivo temporal y luego renombra, para
// que una caída a mitad de escritura (corte de luz, etc.) nunca deje el
// archivo de estado corrupto a medio escribir.
export function saveState(state, dataDir = DATA_DIR) {
  ensureDataDir(dataDir);
  const stateFile = path.join(dataDir, STATE_FILE_NAME);
  const tmpFile = `${stateFile}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(state), "utf-8");
  renameSync(tmpFile, stateFile);
}
