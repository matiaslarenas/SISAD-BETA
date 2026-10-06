/**
 * Reset de cantidades e historial — uso único, antes de empezar a operar
 * con datos reales.
 *
 * Mantiene catálogo, recetas y proveedores. Vacía movimientos, ventas y
 * compras. Sin --confirm solo muestra el plan; antes de aplicarlo exige que
 * el servidor esté detenido y crea un respaldo verificable.
 *
 * Uso:
 *   node scripts/reset-quantities-and-history.js
 *   node scripts/reset-quantities-and-history.js --confirm
 *
 * Se recomienda además descargar un respaldo desde el Panel ("Respaldar Datos").
 */
import {
  copyFileSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeLoadedState } from "../src/state/appState.js";
import { saveState } from "../server/persistence.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "..", "server", "data", "app-state.json");

export function createResetPlan(current) {
  const resetState = normalizeLoadedState({
    inventoryCatalog: current.inventoryCatalog,
    recipes: current.recipes,
    suppliers: current.suppliers,
    inventoryMovements: [],
    purchases: [],
    sales: [],
  });

  return {
    resetState,
    counts: {
      movements: current.inventoryMovements.length,
      sales: current.sales.length,
      purchases: current.purchases.length,
    },
  };
}

export function buildBackupFileName(date) {
  const pad = (value, length = 2) => String(value).padStart(length, "0");
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-` +
    pad(date.getMilliseconds(), 3);
  return `app-state.backup-${stamp}.json`;
}

function validatePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Puerto inválido: ${port}`);
  }
}

function isServerRunning(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error(`No se pudo comprobar si el servidor está detenido en el puerto ${port}.`));
    }, 1000);

    function finish(error, running) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      if (error) reject(error);
      else resolve(running);
    }

    socket.once("connect", () => finish(null, true));
    socket.once("error", (error) => {
      if (error.code === "ECONNREFUSED") finish(null, false);
      else finish(new Error(`No se pudo comprobar el puerto ${port}: ${error.message}`));
    });
  });
}

function printPlan(plan, log) {
  const { counts } = plan;
  log("Plan de reset (no modifica el catálogo):");
  log(`  Movimientos que se vaciarán: ${counts.movements}`);
  log(`  Ventas que se vaciarán: ${counts.sales}`);
  log(`  Compras que se vaciarán: ${counts.purchases}`);
  log(
    `  Se mantienen ${plan.resetState.inventoryCatalog.length} productos, ` +
      `${plan.resetState.recipes.length} recetas y ${plan.resetState.suppliers.length} proveedores.`
  );
}

export async function runReset(options = {}) {
  const stateFile = options.stateFile ?? STATE_FILE;
  const backupDir =
    options.backupDir ??
    (process.env.BACKUP_DIR
      ? path.resolve(process.env.BACKUP_DIR)
      : path.dirname(stateFile));
  const confirm = options.confirm === true;
  const log = options.log ?? console.log;

  if (!existsSync(stateFile)) {
    throw new Error(
      `No existe ${stateFile}. No se creó ni se cargó un estado por defecto; ` +
        "este reset solo funciona sobre una instalación con datos existentes."
    );
  }

  const originalContents = readFileSync(stateFile);
  const current = normalizeLoadedState(JSON.parse(originalContents.toString("utf-8")));
  const plan = createResetPlan(current);
  printPlan(plan, log);

  if (!confirm) {
    log(
      "\nNo se escribió nada. Para aplicar, detén el servidor y repite con --confirm. " +
        "Se recomienda descargar antes un respaldo desde el Panel (\"Respaldar Datos\")."
    );
    return { applied: false, plan };
  }

  const port =
    options.port ?? (process.env.PORT ? Number(process.env.PORT) : 3000);
  validatePort(port);
  const checkServer = options.checkServer ?? isServerRunning;
  if (await checkServer(port)) {
    throw new Error(
      `Hay un servidor escuchando en el puerto ${port}. Deténlo y vuelve a intentar.`
    );
  }

  mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, buildBackupFileName(new Date()));
  copyFileSync(stateFile, backupFile, fsConstants.COPYFILE_EXCL);

  if (!existsSync(backupFile)) {
    throw new Error(`No se pudo verificar que se creó el respaldo ${backupFile}.`);
  }
  const backupContents = readFileSync(backupFile);
  if (
    statSync(backupFile).size !== originalContents.length ||
    !backupContents.equals(originalContents)
  ) {
    throw new Error(
      `El respaldo ${backupFile} no coincide con el archivo original. No se guardaron cambios.`
    );
  }

  if (!existsSync(stateFile) || !readFileSync(stateFile).equals(originalContents)) {
    throw new Error(
      "El archivo de estado desapareció o cambió durante la operación. No se guardaron cambios."
    );
  }

  const persist = options.persist ?? saveState;
  persist(plan.resetState);
  log(`\nListo. Respaldo verificado: ${backupFile}`);
  log(
    `Historial vaciado: ${plan.resetState.inventoryMovements.length} movimientos, ` +
      `${plan.resetState.sales.length} ventas, ${plan.resetState.purchases.length} compras.`
  );
  return { applied: true, backupFile, plan };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== "--confirm")) {
    throw new Error(`Opción desconocida: ${args.find((argument) => argument !== "--confirm")}`);
  }
  await runReset({ confirm: args.includes("--confirm") });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
