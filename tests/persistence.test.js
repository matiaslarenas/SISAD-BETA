import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { loadState, saveState, StateFileError } from "../server/persistence.js";
import { createDefaultAppState } from "../src/state/appState.js";

function withDataDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "meson-persistence-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("loadState: un app-state.json ilegible lanza error y no se modifica", () => {
  withDataDir((dir) => {
    const file = path.join(dir, "app-state.json");
    const damaged = '{"inventoryCatalog": [{"id": "INV001"'; // JSON cortado
    writeFileSync(file, damaged, "utf-8");

    assert.throws(() => loadState(dir), StateFileError);
    assert.equal(readFileSync(file, "utf-8"), damaged);
  });
});

test("loadState: un archivo vacío también se trata como dañado", () => {
  withDataDir((dir) => {
    const file = path.join(dir, "app-state.json");
    writeFileSync(file, "", "utf-8");

    assert.throws(() => loadState(dir), StateFileError);
    assert.equal(readFileSync(file, "utf-8"), "");
  });
});

test("loadState: sin archivo crea el estado por defecto", () => {
  withDataDir((dir) => {
    const state = loadState(dir);

    assert.equal(state.recipes.length, createDefaultAppState().recipes.length);
    assert.ok(existsSync(path.join(dir, "app-state.json")));
  });
});

test("loadState: lee lo que guardó saveState", () => {
  withDataDir((dir) => {
    const state = createDefaultAppState();
    const edited = {
      ...state,
      recipes: state.recipes.map((r, i) => (i === 0 ? { ...r, salePrice: 12345 } : r)),
    };
    saveState(edited, dir);

    assert.equal(loadState(dir).recipes[0].salePrice, 12345);
  });
});

test("loadState: acepta un respaldo descargado desde el Panel ({ schemaVersion, data })", () => {
  withDataDir((dir) => {
    const state = createDefaultAppState();
    writeFileSync(
      path.join(dir, "app-state.json"),
      JSON.stringify({ schemaVersion: 1, data: { ...state, sales: [] } }),
      "utf-8"
    );

    assert.deepEqual(loadState(dir).sales, []);
  });
});
