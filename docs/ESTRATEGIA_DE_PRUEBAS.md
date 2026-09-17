# Estrategia de Pruebas — Sistema Restaurante El Mesón de Los Laureles

> Documento de referencia para la estrategia de testing del proyecto.

## 1. Filosofía de Testing

El sistema prioriza **pruebas de lógica de negocio pura** sobre pruebas de
interfaz de usuario. La regla de negocio central (inventario derivado de
movimientos) es matemática y determinista, por lo que es altamente pretable.

### Principios

1. **Las pruebas validan invariantes matemáticas**, no implementaciones.
2. **Las pruebas no dependen del DOM ni de React** — todo se prueba contra
   funciones puras.
3. **Las pruebas deben ser rápidas** — el suite completo corre en segundos.
4. **Las pruebas deben ser deterministas** — sin dependencia de fecha/hora
   real (usar fechas fijas).

## 2. Stack de Testing

- **Runtime**: Node.js Test Runner nativo (`node --test`)
- **Aserciones**: `node:assert/strict`
- **Sin frameworks externos**: no se usa Jest, Vitest, ni Testing Library.
- **Sin mocks de DOM**: no se usa jsdom ni similares.

### Comandos

```bash
npm test                    # Ejecuta toda la suite
node --test tests/appState.test.js    # Archivo específico
node --test --reporter=spec tests/    # Con output detallado
```

## 3. Tipos de Pruebas

### 3.1 Pruebas Unitarias de Dominio

**Ubicación**: `tests/appState.test.js`

Prueban los reducers de `appState.js` de forma aislada. Cada test crea un
estado inicial, ejecuta una acción y verifica el estado resultante.

**Áreas cubiertas**:
- Agregar/editar/eliminar productos
- Agregar/editar/eliminar proveedores
- Crear/recibir órdenes de compra
- Registrar ventas (incluyendo sub-recetas)
- Anular ventas
- Registrar mermas
- Ajustes manuales

**Ejemplo**:
```js
test("recordSale generates negative movements for recipe ingredients", () => {
  const state = createTestState();
  const result = recordSale(state, {
    items: [{ recipeId: "REC001", quantity: 2, unitPrice: 12500 }],
    paymentMethod: "cash",
  });
  // Verificar movimientos negativos
  const saleMovements = result.inventoryMovements.filter(
    m => m.type === "sale"
  );
  assert.equal(saleMovements.length, expectedIngredientCount);
});
```

### 3.2 Pruebas de Costeo y Recetas

**Ubicación**: `tests/recipeCalculator.test.js`

Prueban el motor de costeo en `recipeCalculator.js`, incluyendo:
- Normalización de unidades (gr ↔ kg, ml ↔ lt)
- Cálculo de costo de recetas simples
- Cálculo de costo con sub-recetas (anidadas)
- Cálculo de porciones máximas
- Detección de ciclos en sub-recetas
- Recetas sin medir (pending_measurement)

**Ejemplo**:
```js
test("calculateRecipeCost with base recipe", () => {
  const recipe = { /* receta con sub-receta */ };
  const cost = calculateRecipeCost(recipe, inventory, recipes);
  assert.equal(cost, expectedCost);
});
```

### 3.3 Pruebas de Validación

**Ubicación**: `tests/validation.test.js`

Prueban los validadores en `validation.js`:
- Validación de productos (nombre, unidad, stock mínimo)
- Validación de proveedores (nombre, contacto)
- Validación de recetas (ingredientes, rendimiento)
- Validación de órdenes de compra
- Validación de ventas
- Validación de mermas
- Validación de backups (`validateBackupData`)

**Ejemplo**:
```js
test("validateProduct rejects empty name", () => {
  const errors = validateProduct({ name: "", unit: "gr" });
  assert.ok(errors.name);
});
```

### 3.4 Pruebas de Mermas

**Ubicación**: `tests/waste.test.js`

Prueban el registro de mermas:
- Generación de movimientos negativos
- Congelamiento de costos
- Validación de stock disponible
- Cálculo de costo total

### 3.5 Pruebas de Alertas

**Ubicación**: `tests/alerts.test.js`

Prueban el motor de alertas:
- Detección de stock crítico (onHand <= 0)
- Detección de stock bajo (onHand <= minStock)
- Detección de merma elevada
- Detección de órdenes atrasadas
- Detección de productos inactivos
- Detección de sin rotación
- Validación de backups

### 3.6 Pruebas de Impresión de Tickets

**Ubicación**: `tests/printer.test.js`

Prueban el formateo ESC/POS puro de `server/printer.js`
(`buildKitchenComandaTicket`, `buildCustomerReceiptTicket`): que el
buffer generado empiece con el comando de inicialización correcto, que
la comanda de cocina no incluya precios, que la cuenta del cliente sí
los incluya junto con la sugerencia de propina, etc. No prueban el envío
real a la impresora (`printTicketBuffer`, que depende de `exec`/Windows)
ni la ruta HTTP `/api/print-ticket`.

### 3.7 Pruebas de Invariantes

**Ubicación**: `tests/invariants.test.js`

Pruebas matemáticas que certifican invariantes del sistema:

| Invariante | Descripción |
|---|---|
| **INVARIANT 1** | Idempotencia del snapshot: `buildInventorySnapshot` produce el mismo resultado con los mismos movimientos |
| **INVARIANT 2** | Reversibilidad de anulación: stock post-anulación = stock pre-venta |
| **INVARIANT 3** | Sincronización recepción: al recibir una OC, el stock y costo se actualizan correctamente |
| **INVARIANT 4** | Planificador y snapshots: las sugerencias de compra respetan los umbrales definidos |
| **INVARIANT 5** | Costeo congelado: el costo de una venta no cambia al modificar precios posteriores |

## 4. Cobertura de Pruebas

### 4.1 Qué está cubierto

| Área | Cobertura | Archivo |
|---|---|---|
| Reducers de dominio | ✅ Alta | `appState.test.js` |
| Costeo de recetas | ✅ Alta | `recipeCalculator.test.js` |
| Validaciones | ✅ Alta | `validation.test.js` |
| Mermas | ✅ Alta | `waste.test.js` |
| Alertas | ✅ Alta | `alerts.test.js` |
| Invariantes | ✅ Alta | `invariants.test.js` |
| Formato de tickets ESC/POS | ✅ Alta | `printer.test.js` |

### 4.2 Qué NO está cubierto

- **Interfaz de usuario**: clicks, navegación, renderizado visual.
- **Servidor HTTP** (`server/index.js`): las rutas `/api/state`,
  `/api/dispatch` y `/api/print-ticket` se prueban manualmente (con
  `curl` o desde el navegador), no hay tests automáticos de la capa HTTP
  todavía. El **formato** de los tickets (bytes ESC/POS generados por
  `server/printer.js`) sí está cubierto por `printer.test.js`; lo que
  falta es el envío real a la impresora (`printTicketBuffer`) y el
  ruteo HTTP en sí.
- **Sincronización multi-dispositivo**: el comportamiento real de
  polling entre desktop/tablet/celular se valida manualmente, no con
  tests automáticos.
- **Persistencia en disco** (`server/persistence.js`): escritura
  atómica y migración de `app-state.json`.
- **Responsive design**: comportamiento en móviles/tablets.
- **Performance**: tiempos de renderizado.
- **Accesibilidad**: ARIA, navegación con teclado.

> Estas áreas se validan manualmente durante el desarrollo.

## 5. Estrategia de Escritura de Tests

### 5.1 Cuándo Escribir Tests

- **Antes** de implementar: para invariantes y reglas de negocio críticas.
- **Durante** el desarrollo: para cada nueva regla de negocio.
- **Después** de un bug: para prevenir regresiones.

### 5.2 Cómo Estructurar Tests

```js
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("nombre de la funcionalidad", () => {
  // Setup común
  let state;
  beforeEach(() => {
    state = createTestState();
  });

  test("caso de éxito", () => {
    const result = funcion(state, payload);
    assert.deepEqual(result, expected);
  });

  test("caso límite", () => {
    // ...
  });

  test("caso de error", () => {
    // ...
  });
});
```

### 5.3 Buenas Prácticas

1. **Un concepto por test**: cada test verifica una sola cosa.
2. **Nombres descriptivos**: el nombre del test debe describir el comportamiento.
3. **Setup explícito**: crear el estado de prueba de forma visible.
4. **Aserciones específicas**: usar `assert.equal` sobre `assert.ok` cuando sea posible.
5. **No depender de orden**: los tests deben ser independientes.
6. **Fechas fijas**: usar fechas constantes, no `new Date()`.

### 5.4 Datos de Prueba

Crear funciones helper para estados de prueba:

```js
function createTestState() {
  return {
    products: [
      { id: "INV001", name: "Harina", unit: "gr", onHand: 10000, costPerUnit: 3500, minStock: 5000, active: true },
      // ...
    ],
    inventoryMovements: [],
    recipes: [],
    // ...
  };
}
```

## 6. Integración Continua

### 6.1 Verificaciones Pre-Commit

- `npm test` — todos los tests deben pasar.
- `npm run build` — el build de producción debe ser exitoso.

### 6.2 Verificaciones Pre-Merge

- Tests pasan en la rama.
- Build exitoso.
- Sin regresiones en invariantes.
- CHANGELOG.md actualizado.

## 7. Mantenimiento de Tests

### 7.1 Cuándo Actualizar Tests

- Al cambiar una regla de negocio, actualizar los tests afectados.
- Al refactorizar, los tests deben seguir pasando sin cambios.
- Al agregar una nueva funcionalidad, agregar tests correspondientes.

### 7.2 Cuándo Eliminar Tests

- Si una regla de negocio se elimina, eliminar sus tests.
- Si un test se vuelve obsoleto por un refactor, actualizarlo o eliminarlo.
- Nunca eliminar tests para "hacer pasar" el suite.
