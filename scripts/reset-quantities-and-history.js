/**
 * Reset de cantidades e historial — uso único, antes de empezar a operar
 * con datos reales.
 *
 * A diferencia de reset-to-empty.js (que borra TODO, incluido el
 * catálogo de productos/recetas/proveedores), este script:
 *
 *   MANTIENE tal cual:
 *     - inventoryCatalog (productos: nombre, unidad, costo, minStock, etc.)
 *     - recipes (recetas y sub-recetas)
 *     - suppliers (proveedores)
 *
 *   VACÍA (queda en cero / sin historial):
 *     - inventoryMovements → el stock (onHand) de todos los productos
 *       queda en 0, porque se deriva exclusivamente de los movimientos
 *     - sales (historial de ventas)
 *     - purchases (historial de órdenes de compra)
 *
 * Uso:
 *   node scripts/reset-quantities-and-history.js
 *
 * Requiere que el servidor esté DETENIDO mientras se corre.
 *
 * Recomendación: hacer un backup desde el Panel ("Respaldar Datos")
 * antes de correr esto, igual que la vez anterior.
 */
import { normalizeLoadedState } from "../src/state/appState.js";
import { loadState, saveState } from "../server/persistence.js";

const current = loadState();

const resetState = normalizeLoadedState({
  inventoryCatalog: current.inventoryCatalog,
  recipes: current.recipes,
  suppliers: current.suppliers,
  inventoryMovements: [],
  purchases: [],
  sales: [],
});

saveState(resetState);

console.log("Listo.");
console.log(
  `Catálogo mantenido: ${resetState.inventoryCatalog.length} productos, ${resetState.recipes.length} recetas, ${resetState.suppliers.length} proveedores.`
);
console.log(
  `Historial vaciado: ${resetState.inventoryMovements.length} movimientos, ${resetState.purchases.length} compras, ${resetState.sales.length} ventas.`
);
console.log("Ya puedes correr 'npm start' — el stock de todos los productos parte en 0.");
