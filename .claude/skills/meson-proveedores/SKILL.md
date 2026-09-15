---
name: meson-proveedores
description: Usar cuando el usuario pida agregar, registrar o precargar un proveedor nuevo en el código del Sistema Restaurante El Mesón de Los Laureles (no desde la app en vivo). Da la ubicación del archivo, los campos del modelo Supplier y la distinción clave entre "dato semilla por defecto" y "dato real ya persistido".
---

# Agregar un proveedor — El Mesón de Los Laureles

## Distinción clave antes de tocar nada: ¿semilla o dato en vivo?

`src/data/suppliersData.js` es el **estado por defecto de una instalación
nueva** (`createDefaultAppState()`). Solo se usa cuando el servidor local
arranca sin `server/data/app-state.json` previo (ver `meson-data-reset`).

- Si el usuario pide agregar un proveedor **al código** (este chat, sin la
  app corriendo delante) → editar `src/data/suppliersData.js`.
- Si el usuario ya tiene la app corriendo y quiere que el proveedor
  aparezca en su instalación actual → decirle que lo agregue desde la
  página **Proveedores → Nuevo Proveedor** en la app (se guarda vía
  `POST /api/dispatch` en su `app-state.json`, que no está en el repo).
  Editar `suppliersData.js` en ese caso **no tiene ningún efecto** sobre
  su instalación ya inicializada.

Si hay duda de cuál de los dos casos aplica, preguntar.

## Campos del objeto Supplier en `suppliersData.js`

```js
{
    name: "Nombre de la empresa",
    category: "Categoría principal",   // ej. Proteínas, Abarrotes y otros, Verduras y Frutas
    leadTime: "Tiempo de entrega",     // texto libre, ej. "2 días" — "Por confirmar" si no se sabe
    phone: "Teléfono de contacto",     // texto libre, opcional — "" o "Por confirmar" si no se sabe
    compliance: "0%",                  // string con %, 0-100 — "0%" como placeholder si no hay dato aún
},
```

No agregar `status` ni `statusClass` a mano: `normalizeSupplier()` en
`src/state/appState.js` los deriva automáticamente a partir de
`compliance` (≥95% Excelente/success, ≥90% Aceptable/warning, resto
Crítico/danger). Si se agregan a mano y quedan inconsistentes con el
`compliance` real, `normalizeSupplier()` los respeta tal cual porque usa
`supplier.status || derivedStatus.status` — es decir, el valor a mano
gana y puede quedar mostrando un estado que no corresponde.

`name`, `category` y `leadTime` son obligatorios en el formulario de la
app (`validateSupplierForm` en `src/utils/validation.js`), así que aunque
se agreguen por código conviene no dejarlos vacíos — usar "Por confirmar"
como placeholder de texto en vez de `""`.

`phone` no existe en `validateSupplierForm` (es opcional) — se agregó en
`normalizeSupplier`, el formulario de `src/pages/Suppliers.jsx` y la
columna de `src/components/SuppliersTable.jsx`.

## Después de editar

Correr `npm test` (ver `meson-testing`) — no valida los datos en sí, pero
confirma que no se rompió nada en `normalizeSupplier`/`normalizeLoadedState`
al tocar el archivo.
