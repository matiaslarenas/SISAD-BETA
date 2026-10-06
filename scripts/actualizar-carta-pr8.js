/**
 * Actualiza la carta de una instalación en uso (el computador B) con los
 * cambios del PR #8: precios de empanadas, pizzas con Todo, batidos,
 * limonada menta frambuesa, fettuccinni casero, fideos con espagueti
 * envasado, rendimiento del fetuccini y categorías Papas Fritas / Extras.
 *
 * No borra nada ni toca ventas, compras ni movimientos. Un campo que ya
 * se editó desde la app no se pisa: se informa como conflicto. El
 * detalle de las reglas está en scripts/lib/cartaPr8.js.
 *
 * Uso (con el servidor DETENIDO):
 *   node scripts/actualizar-carta-pr8.js            → solo muestra qué haría
 *   node scripts/actualizar-carta-pr8.js --aplicar  → respalda y escribe
 *
 * Opciones:
 *   --archivo <ruta>  otro app-state.json (por defecto server/data/app-state.json)
 *   --puerto <n>      puerto del servidor a verificar (por defecto PORT o 3000)
 *
 * Con --aplicar, antes de escribir copia el archivo original junto a él
 * como app-state.antes-carta-pr8-<fecha>.json. Para deshacer, detener el
 * servidor y reemplazar app-state.json por ese respaldo.
 */
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeLoadedState } from "../src/state/appState.js";
import { planCartaPr8 } from "./lib/cartaPr8.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { apply: false, file: path.join(__dirname, "..", "server", "data", "app-state.json"),
    port: process.env.PORT ? Number(process.env.PORT) : 3000 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--aplicar") args.apply = true;
    else if (argv[i] === "--archivo") args.file = path.resolve(argv[++i]);
    else if (argv[i] === "--puerto") args.port = Number(argv[++i]);
    else throw new Error(`Opción desconocida: ${argv[i]}`);
  }
  return args;
}

// El servidor guarda el estado en memoria y lo reescribe en cada acción:
// si está corriendo, borraría lo que escriba este script.
function isServerRunning(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

const LABELS = {
  aplicar: "Se aplica",
  ya_aplicado: "Ya estaba",
  conflicto: "Conflicto (no se toca)",
  omitido: "Omitido",
  descartado: "Descartado",
};

function describe(change) {
  if (change.status !== "aplicar") return change.reason ? `${change.id}: ${change.reason}` : change.id;
  if (change.kind === "addProduct") return `${change.id}: agrega "${change.product.item}"`;
  if (change.kind === "addRecipe") return `${change.id}: agrega "${change.recipe.name}"`;
  const fields = Object.keys(change.patch).map((f) =>
    f === "ingredients" ? "ingredientes" : `${f} ${JSON.stringify(change.before[f])} → ${JSON.stringify(change.patch[f])}`
  );
  return `${change.id}: ${fields.join(", ")}`;
}

function printReport(changes) {
  for (const status of Object.keys(LABELS)) {
    const group = changes.filter((c) => c.status === status);
    if (!group.length) continue;
    console.log(`\n${LABELS[status]} (${group.length}):`);
    for (const change of group) console.log(`  - ${describe(change)}`);
  }
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.file)) {
    throw new Error(`No existe ${args.file}. Este script es para una instalación en uso.`);
  }
  // Se lee aparte de loadState(): ese reemplaza un archivo ilegible por el
  // estado por defecto, y aquí un error debe detener todo.
  const state = normalizeLoadedState(JSON.parse(readFileSync(args.file, "utf-8")));
  const { nextState, changes } = planCartaPr8(state);

  console.log(`Archivo: ${args.file}`);
  printReport(changes);

  const toApply = changes.filter((c) => c.status === "aplicar").length;
  if (!toApply) {
    console.log("\nNo hay nada que aplicar.");
    return;
  }
  if (!args.apply) {
    console.log("\nNo se escribió nada. Para aplicar: detener el servidor y repetir con --aplicar.");
    return;
  }
  if (await isServerRunning(args.port)) {
    throw new Error(`Hay un servidor escuchando en el puerto ${args.port}. Detenlo y vuelve a intentar.`);
  }

  const backup = path.join(path.dirname(args.file), `app-state.antes-carta-pr8-${timestamp()}.json`);
  copyFileSync(args.file, backup);
  const tmp = `${args.file}.tmp`;
  writeFileSync(tmp, JSON.stringify(nextState), "utf-8");
  renameSync(tmp, args.file);

  console.log(`\nListo: ${toApply} cambios aplicados.`);
  console.log(`Respaldo: ${backup}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
