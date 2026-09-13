---
name: meson-testing
description: Usar al corregir un bug o agregar lógica de dominio nueva en el Sistema Restaurante El Mesón de Los Laureles. Da la convención de testing del proyecto (node:test, sin Jest/Vitest) y en qué archivo va cada tipo de test.
---

# Testing — El Mesón de Los Laureles

Documento completo de referencia: `docs/ESTRATEGIA_DE_PRUEBAS.md`. Léelo si
necesitas más detalle de cobertura o invariantes.

## Stack (no cambiar)

`node:test` + `node:assert/strict`. Sin Jest, Vitest, ni Testing Library.
Sin mocks de DOM. Correr con `npm test`.

## Dónde va cada test

| Área | Archivo |
|---|---|
| Reducers de dominio (productos, proveedores, compras, ventas, mermas) | `tests/appState.test.js` |
| Costeo, conversión de unidades, sub-recetas | `tests/recipeCalculator.test.js` |
| Validadores de formularios y backups | `tests/validation.test.js` |
| Registro de mermas | `tests/waste.test.js` |
| Motor de alertas | `tests/alerts.test.js` |
| Invariantes matemáticas (idempotencia, reversibilidad, congelamiento de costos) | `tests/invariants.test.js` |

## Regla no negociable

**Después de corregir cualquier bug, agrega un test de regresión** en el
archivo correspondiente antes de dar el fix por terminado. Ejemplo real:
el bug de costos inflados en Limonada/Café Helado (mismatch masa↔volumen
en `normalizeQuantity`) tiene su test de regresión en
`tests/recipeCalculator.test.js` — usa ese caso como plantilla de estilo.

## Buenas prácticas del proyecto

- Un concepto por test, nombre descriptivo del comportamiento.
- Fechas fijas, nunca `new Date()` real.
- `assert.equal` sobre `assert.ok` cuando sea posible.
- Tests independientes entre sí, sin depender de orden de ejecución.
