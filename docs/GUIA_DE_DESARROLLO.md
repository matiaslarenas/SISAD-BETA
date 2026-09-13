# Guía de Desarrollo — Sistema Restaurante El Mesón de Los Laureles

> Documento para desarrolladores que contribuyen al proyecto.

## 1. Requisitos del Entorno

### 1.1 Software Necesario

| Herramienta | Versión mínima | Propósito |
|---|---|---|
| Node.js | 20.x | Runtime y testing |
| npm | 10.x | Gestión de dependencias |
| Git | 2.x | Control de versiones |
| Editor de código | Última estable | Desarrollo (VS Code recomendado) |

### 1.2 Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd restaurant-inventory-dashboard

# Instalar dependencias
npm install

# Desarrollo: dos terminales, frontend y servidor por separado
npm run dev          # Terminal 1 — Vite (puerto 3000, recarga en caliente)
npm run server:dev   # Terminal 2 — servidor Node (puerto 3001)
```

`vite.config.js` tiene un proxy de `/api` hacia el puerto 3001, así el
código de `AppDataContext.jsx` no necesita saber si está en desarrollo o
producción — siempre usa rutas relativas.

### 1.3 Comandos Útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia Vite en modo desarrollo (solo frontend) |
| `npm run server:dev` | Inicia el servidor Node en el puerto 3001 (desarrollo) |
| `npm run build` | Genera el build de producción |
| `npm run server` | Sirve el build ya generado + la API (un solo puerto) |
| `npm start` | `build` + `server` en un solo comando — uso real en el desktop |
| `npm run preview` | Sirve el build de producción localmente (solo frontend, sin API) |
| `npm test` | Ejecuta la suite de pruebas (node --test) |
| `npm test -- --watch` | Ejecuta pruebas en modo observador |

## 2. Arquitectura del Código

### 2.1 Estructura de Carpetas

```
server/
├── index.js        # Servidor HTTP nativo: sirve dist/ + API
├── persistence.js  # Persistencia en disco (server/data/app-state.json)
└── data/           # Estado en vivo (no versionado)
src/
├── components/     # Componentes reutilizables (presentación)
├── context/        # AppDataContext.jsx (único Context, habla con el servidor)
├── data/           # Datos semilla
├── pages/          # Pantallas por sección
├── state/          # appState.js (lógica de dominio pura) + rootReducer.js

├── types/          # Interfaces TypeScript
├── utils/          # Lógica pura (costeo, validación, storage)
├── App.jsx         # Layout raíz + rutas
└── main.jsx        # Bootstrap de React
```

### 2.2 Principios de Arquitectura

1. **Lógica de negocio en `appState.js`**: Nunca en componentes ni en el
   Context. El Context solo orquesta.
2. **Cálculos reutilizables en `utils/`**: costeo, formato, validación.
3. **Componentes solo presentación**: leen del Context y despachan acciones.
4. **Todo cambio de stock pasa por movimientos**: nunca edición directa.
5. **Costos históricos se congelan**: al momento del evento.

## 3. Estándares de Código

### 3.1 Convenciones Generales

- **Lenguaje**: JavaScript (ES2022+) con JSX. TypeScript parcial en
  componentes migrados.
- **Estilos**: Plain CSS en `src/styles.css`. No usar Tailwind, CSS-in-JS
  ni frameworks de estilos.
- **Iconos**: `lucide-react` exclusivamente. No usar emoji ni SVG custom.
- **Gráficos**: `recharts` exclusivamente.
- **Notificaciones**: `sonner` (toasts).

### 3.2 Convenciones de Nombres

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `KpiCard`, `InventoryTable` |
| Funciones | camelCase | `calculateRecipeCost`, `buildInventorySnapshot` |
| Constantes | UPPER_SNAKE_CASE | `MOVEMENT_TYPES`, `WASTE_REASONS` |
| Variables | camelCase | `inventoryValue`, `maxPortions` |
| Archivos | kebab-case o PascalCase | `recipeCalculator.js`, `KpiCard.tsx` |

### 3.3 Estilo de Código

- Usar `const` por defecto, `let` solo si la variable cambia.
- No usar `var`.
- Funciones puras preferidas para lógica de negocio.
- Spread operator para inmutabilidad: `{ ...state, products: [...state.products] }`.
- No mutar objetos/arrays directamente.

### 3.4 Componentes React

```jsx
// ✅ Buenas prácticas
import { useAppData } from "../context/AppDataContext";

export default function MyComponent() {
  const { data, actions } = useAppData();

  const handleClick = () => {
    actions.doSomething(payload);
  };

  return (
    <div className="my-component">
      <button onClick={handleClick}>Acción</button>
    </div>
  );
}
```

- Usar function components y hooks.
- No usar clases.
- Los componentes deben ser pequeños y enfocados.
- Extraer lógica compleja a hooks personalizados o utils.

## 4. Estado Global

### 4.1 AppDataContext

El único Context de la aplicación. Desde la migración a servidor local,
ya no mantiene el estado con `useReducer` local: lo obtiene del servidor
vía `fetch`/polling y despacha acciones vía `POST /api/dispatch` (detalle
completo en `docs/ARCHITECTURE.md` §3). Sigue exponiendo lo mismo al
árbol de componentes:

- **Datos derivados** (memoizados con `useMemo`):
  - `inventory` — snapshot de inventario
  - `purchases` — órdenes con metadatos
  - `alerts` — alertas operacionales
  - `purchaseSuggestions` — sugerencias de compra
  - `dailySnapshots` — snapshots diarios

- **Acciones** (wrappers de `dispatch`):
  - `saveProduct`, `removeProduct`
  - `addSupplier`, `updateSupplier`, `removeSupplier`
  - `addRecipe`, `updateRecipe`
  - `createPurchase`, `setPurchaseInTransit`, `receivePurchase`
  - `recordSale`, `voidSale`
  - `recordWaste`
  - `restoreBackupState`

### 4.2 appState.js

Núcleo de dominio. Todas las funciones son puras:
`(state, payload) => newState`.

- **Normalización**: `normalizeLoadedState`, `normalizeRecipe`, etc.
- **Snapshot**: `buildInventorySnapshot(catalog, movements)`
- **Reducers**: `addOrUpdateProduct`, `deleteProduct`, `recordSale`, etc.
- **Alertas**: `getOperationalAlerts(state, referenceDate)`
- **Sugerencias**: `generatePurchaseSuggestions(state)`
- **Snapshots**: `generateDailySnapshots(state, daysLimit)`

### 4.3 Persistencia

- `server/persistence.js` maneja la persistencia en disco del servidor
  (`server/data/app-state.json`), con escritura atómica.
- Reutiliza `normalizeLoadedState`/`createDefaultAppState` de
  `appState.js` — mismas migraciones automáticas que la versión anterior
  100% client-side.
- `src/utils/storage.js` (localStorage) queda como referencia histórica,
  **no lo usa la app en producción** desde la migración a servidor local.

## 5. Testing

### 5.1 Estructura de Tests

```
tests/
├── appState.test.js       # Reducers de dominio
├── recipeCalculator.test.js # Costeo y sub-recetas
├── validation.test.js     # Validadores de formularios
├── waste.test.js          # Registro de mermas
├── alerts.test.js         # Motor de alertas
└── invariants.test.js     # Invariantes matemáticas
```

### 5.2 Cómo Escribir Tests

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { recordSale } from "../src/state/appState.js";

describe("recordSale", () => {
  test("should generate negative movements for recipe ingredients", () => {
    const state = createTestState();
    const result = recordSale(state, salePayload);
    assert.equal(result.inventoryMovements.length, expectedMovements);
  });
});
```

### 5.3 Qué Probar

- **Reducers de dominio**: cada acción debe retornar un nuevo estado
  correcto.
- **Invariantes matemáticas**: stock post-anulación = stock pre-venta.
- **Costeo**: recetas con sub-recetas calculan correctamente.
- **Validaciones**: casos válidos e inválidos.
- **Alertas**: condiciones de disparo correctas.

### 5.4 Qué NO Probar

- Aspectos puramente visuales (colores, tipografías).
- Interacciones de UI (clicks, hovers) — usar testing manual.
- Animaciones y transiciones.

## 6. Cómo Agregar una Nueva Funcionalidad

### 6.1 Proceso Recomendado

1. **Define la regla de negocio** en `REGLAS_DE_NEGOCIO.md`.
2. **Implementa la lógica** en `appState.js` o `utils/`.
3. **Exponla** a través del Context (`AppDataContext.jsx`).
4. **Crea la UI** en `components/` y/o `pages/`.
5. **Escribe tests** en `tests/`.
6. **Actualiza el CHANGELOG.md** con la fecha.
7. **Actualiza la documentación** relevante.

### 6.2 Ejemplo: Agregar un Nuevo Tipo de Movimiento

1. Agrega el tipo en `src/data/inventoryMovements.js` (constante).
2. Implementa el reducer en `appState.js`.
3. Exponlo en `AppDataContext.jsx`.
4. Usa en el componente correspondiente.
5. Escribe tests en `tests/appState.test.js`.
6. Documenta en `CHANGELOG.md` y `REGLAS_DE_NEGOCIO.md`.

## 7. Depuración

### 7.1 Herramientas

- **React DevTools**: inspeccionar el árbol de componentes y el Context.
- **Console.log**: para debugging rápido (eliminar antes de commit).
- **Pestaña Network del navegador**: inspeccionar las llamadas a
  `/api/state` (polling) y `/api/dispatch` (acciones) — es la forma más
  directa de ver qué está mandando/recibiendo el cliente.
- **Archivo de estado del servidor**: `server/data/app-state.json` — se
  puede abrir directamente para ver el estado real y completo en
  cualquier momento (el servidor debe estar detenido o hacerlo de
  solo lectura para no pisar una escritura en curso).

### 7.2 Debugging de Estado

```bash
# Estado completo, directo desde el archivo del servidor
cat server/data/app-state.json | python3 -m json.tool
```

```js
// En la consola del navegador — última respuesta que vio el cliente
// (no lee el archivo directamente; refleja lo último que devolvió el servidor)
await fetch("/api/state").then((r) => r.json())
```

### 7.3 Debugging de Tests

```bash
# Ejecutar un archivo de tests específico
node --test tests/appState.test.js

# Ejecutar con verbose
node --test --reporter=spec tests/appState.test.js
```

## 8. Actualización de Dependencias

### 8.1 Proceso Seguro

1. Revisa el `CHANGELOG.md` de cada dependencia.
2. Actualiza una a la vez.
3. Ejecuta los tests: `npm test`.
4. Ejecuta el build: `npm run build`.
5. Verifica en el preview.

### 8.2 Dependencias Clave

| Dependencia | Uso |
|---|---|
| `react` / `react-dom` | UI |
| `react-router-dom` | Ruteo |
| `vite` | Build |
| `@vitejs/plugin-react` | Plugin Vite para React |
| `recharts` | Gráficos |
| `sonner` | Toasts |
| `lucide-react` | Iconos |
| `typescript` | Tipado (dev) |

## 9. Pull Requests

### 9.1 Checklist

- [ ] Tests pasan (`npm test`)
- [ ] Build exitoso (`npm run build`)
- [ ] CHANGELOG.md actualizado
- [ ] Documentación actualizada
- [ ] Código formateado consistentemente
- [ ] Sin `console.log` de debug
- [ ] Sin TODOs o comentarios obsoletos

### 9.2 Mensajes de Commit

Usar formato [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: agregar cálculo de porciones máximas en POS
fix: corregir anulación de venta con sub-recetas
docs: actualizar guía de usuario con sección de mermas
refactor: extraer lógica de costeo a recipeCalculator.js
test: agregar invariante de reversibilidad de ventas
```
