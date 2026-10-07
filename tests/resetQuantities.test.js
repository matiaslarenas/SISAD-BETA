import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildBackupFileName,
  createResetPlan,
  runReset,
} from "../scripts/reset-quantities-and-history.js";
import { createDefaultAppState } from "../src/state/appState.js";

async function withTempDir(callback) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "meson-reset-"));
  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writeState(directory) {
  const stateFile = path.join(directory, "app-state.json");
  const state = createDefaultAppState();
  writeFileSync(stateFile, JSON.stringify(state), "utf-8");
  return { stateFile, state, originalContents: readFileSync(stateFile) };
}

test("createResetPlan vacía solo movimientos, ventas y compras", () => {
  const current = createDefaultAppState();
  const plan = createResetPlan(current);

  assert.deepEqual(plan.resetState.inventoryCatalog, current.inventoryCatalog);
  assert.deepEqual(plan.resetState.recipes, current.recipes);
  assert.deepEqual(plan.resetState.suppliers, current.suppliers);
  assert.deepEqual(plan.resetState.inventoryMovements, []);
  assert.deepEqual(plan.resetState.sales, []);
  assert.deepEqual(plan.resetState.purchases, []);
  assert.deepEqual(plan.counts, {
    movements: current.inventoryMovements.length,
    sales: current.sales.length,
    purchases: current.purchases.length,
  });
});

test("buildBackupFileName genera un nombre basado en la fecha recibida", () => {
  assert.equal(
    buildBackupFileName(new Date(2026, 9, 6, 18, 58, 51, 725)),
    "app-state.backup-20261006-185851-725.json"
  );
});

test("runReset sin --confirm solo muestra el plan y no crea respaldos ni guarda", async () => {
  await withTempDir(async (directory) => {
    const { stateFile, state } = writeState(directory);
    const backupDir = path.join(directory, "backups");
    const output = [];
    let serverChecked = false;
    let saved = false;

    const result = await runReset({
      stateFile,
      backupDir,
      log: (line) => output.push(line),
      checkServer: async () => {
        serverChecked = true;
        return false;
      },
      persist: () => {
        saved = true;
      },
    });

    assert.equal(result.applied, false);
    assert.equal(serverChecked, false);
    assert.equal(saved, false);
    assert.equal(existsSync(backupDir), false);
    assert.equal(output.some((line) => line.includes(String(state.sales.length))), true);
    assert.deepEqual(readFileSync(stateFile), Buffer.from(JSON.stringify(state)));
  });
});

test("runReset rechaza un archivo inexistente sin persistir un estado por defecto", async () => {
  await withTempDir(async (directory) => {
    const stateFile = path.join(directory, "missing.json");
    let saved = false;

    await assert.rejects(
      runReset({
        stateFile,
        persist: () => {
          saved = true;
        },
      }),
      /No existe .*No se creó ni se cargó un estado por defecto/
    );
    assert.equal(existsSync(stateFile), false);
    assert.equal(saved, false);
  });
});

test("runReset con servidor activo aborta antes de crear respaldo o guardar", async () => {
  await withTempDir(async (directory) => {
    const { stateFile, originalContents } = writeState(directory);
    const backupDir = path.join(directory, "backups");
    let saved = false;

    await assert.rejects(
      runReset({
        stateFile,
        backupDir,
        confirm: true,
        port: 3456,
        log: () => {},
        checkServer: async (port) => {
          assert.equal(port, 3456);
          return true;
        },
        persist: () => {
          saved = true;
        },
      }),
      /Hay un servidor escuchando en el puerto 3456/
    );
    assert.equal(existsSync(backupDir), false);
    assert.deepEqual(readFileSync(stateFile), originalContents);
    assert.equal(saved, false);
  });
});

test("runReset aborta si el estado cambia mientras comprueba el servidor", async () => {
  await withTempDir(async (directory) => {
    const { stateFile } = writeState(directory);
    const backupDir = path.join(directory, "backups");
    let saved = false;

    await assert.rejects(
      runReset({
        stateFile,
        backupDir,
        confirm: true,
        log: () => {},
        checkServer: async () => {
          writeFileSync(stateFile, '{"changed":true}', "utf-8");
          return false;
        },
        persist: () => {
          saved = true;
        },
      }),
      /no coincide con el archivo original/
    );
    assert.equal(saved, false);
  });
});

test("runReset verifica el respaldo antes de persistir el estado reseteado", async () => {
  await withTempDir(async (directory) => {
    const { stateFile, state, originalContents } = writeState(directory);
    const backupDir = path.join(directory, "backups");
    let savedState;

    const result = await runReset({
      stateFile,
      backupDir,
      confirm: true,
      port: 3456,
      log: () => {},
      checkServer: async () => false,
      persist: (nextState) => {
        const [backupName] = readdirSync(backupDir);
        const backupFile = path.join(backupDir, backupName);
        assert.equal(existsSync(backupFile), true);
        assert.deepEqual(readFileSync(backupFile), originalContents);
        savedState = nextState;
      },
    });

    assert.equal(result.applied, true);
    assert.equal(path.dirname(result.backupFile), backupDir);
    assert.deepEqual(savedState.inventoryCatalog, state.inventoryCatalog);
    assert.deepEqual(savedState.recipes, state.recipes);
    assert.deepEqual(savedState.suppliers, state.suppliers);
    assert.deepEqual(savedState.inventoryMovements, []);
    assert.deepEqual(savedState.sales, []);
    assert.deepEqual(savedState.purchases, []);
    assert.deepEqual(readFileSync(stateFile), originalContents);
  });
});
