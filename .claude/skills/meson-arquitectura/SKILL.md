---
name: meson-arquitectura
description: Usar antes de modificar src/state/appState.js, src/state/rootReducer.js, src/utils/recipeCalculator.js, src/context/AppDataContext.jsx, o al agregar una entidad de dominio nueva al Sistema Restaurante El Mesón de Los Laureles. Da el principio arquitectónico central, la estructura de carpetas y dónde debe vivir cada tipo de lógica. Para el servidor local (server/), ver también meson-backend.
---

# Arquitectura — El Mesón de Los Laureles

Documento completo de referencia: `docs/ARCHITECTURE.md` y `docs/MODELO_DE_DATOS.md`. Lee ambos antes de tocar código de dominio si no los tienes en contexto.

## Principio central (no negociable)

**El inventario no es un número editable.** Se deriva matemáticamente de
`inventoryMovements` (compras, ventas, mermas, ajustes). Nunca edites
`onHand` directamente — todo cambio de stock pasa por un movimiento nuevo.

## Dónde va cada cosa

- **Reglas de negocio** → `src/state/appState.js` únicamente. Nunca en
  componentes ni en `AppDataContext.jsx` (el Context solo orquesta,
  `dispatch` → reducer puro).
- **Cálculos reutilizables** (costeo, conversión de unidades, formato) →
  `src/utils/`.
- **React** → solo presentación. Los componentes leen del Context y
  despachan acciones.
- **Costos históricos se congelan** en el momento del evento (`unitCost`
  del movimiento, `costSnapshot` de la venta). Nunca se recalculan
  retroactivamente.
- **No inventar datos no medidos.** Si falta información real (ej. una
  sub-receta sin medir), el sistema debe reflejar `0`/`pending`, nunca una
  estimación arbitraria.

## Antes de tocar costeo o sub-recetas

Revisa `docs/ARCHITECTURE.md` §6 (Sub-Recetas). Presta especial atención a
`normalizeQuantity` en `recipeCalculator.js`: ya soporta conversión
cruzada masa↔volumen (fallback de densidad 1:1) — ver
`tests/recipeCalculator.test.js` para el caso de regresión de Limonada/Café
Helado. No reintroduzcas ese bug.

## Contexto del negocio

El Mesón de Los Laureles, localidad de Los Laureles, comuna de Cunco,
Región de La Araucanía. El sistema ya migró de `localStorage` puro a un
servidor local (desktop como host, tablet/celulares como clientes vía
WiFi) — probado en producción real, sincronización confirmada
funcionando. Ver `meson-backend` para las convenciones de esa capa
(`server/index.js`, `server/persistence.js`, `rootReducer.js`).
