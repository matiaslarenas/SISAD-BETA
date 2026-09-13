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
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "app-state.json");
const TMP_FILE = path.join(DATA_DIR, "app-state.json.tmp");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadState() {
  ensureDataDir();

  if (!existsSync(STATE_FILE)) {
    const defaultState = createDefaultAppState();
    saveState(defaultState);
    return defaultState;
  }

  try {
    const raw = readFileSync(STATE_FILE, "utf-8");
    return normalizeLoadedState(JSON.parse(raw));
  } catch (error) {
    console.error(
      "[persistence] No se pudo leer app-state.json, se usa el estado por defecto:",
      error.message
    );
    const defaultState = createDefaultAppState();
    saveState(defaultState);
    return defaultState;
  }
}

// Escritura atómica: escribe a un archivo temporal y luego renombra, para
// que una caída a mitad de escritura (corte de luz, etc.) nunca deje el
// archivo de estado corrupto a medio escribir.
export function saveState(state) {
  ensureDataDir();
  writeFileSync(TMP_FILE, JSON.stringify(state), "utf-8");
  renameSync(TMP_FILE, STATE_FILE);
}
