# Sistema Restaurante El Mesón de Los Laureles (SISAD)

Gestión de inventario, recetas y costeo, compras, proveedores, POS y reportes
para un restaurante de Los Laureles, Cunco (Araucanía). Equipo de ~4 personas.
Funciona solo en la red local: un servidor Linux en el local es el host, y la
tablet (POS), el celular y otros equipos son clientes por WiFi.

## Comandos

- `npm test`: tests con `node --test` (sin Jest ni Vitest).
- `npm run dev` + `npm run server:dev`: desarrollo (Vite en :3000, API en :3001
  vía el proxy de `vite.config.js`). `server:dev` usa sintaxis de shell Unix.
- `npm start`: build + servidor en un solo puerto (uso real en el servidor).

## Arquitectura en pocas líneas

- `server/index.js` (Node, solo módulos nativos) es la única fuente de verdad.
  Persiste en `server/data/app-state.json` (no versionado, escritura atómica).
- El cliente React consulta `GET /api/state` cada 2 s y envía acciones a
  `POST /api/dispatch`. El reducer `src/state/rootReducer.js` es compartido
  por cliente y servidor.
- Las reglas de negocio viven en `src/state/appState.js`; React solo presenta.
- Si `app-state.json` existe pero no se puede leer, el servidor no arranca
  (`StateFileError`): nunca parte desde la semilla encima de datos reales.
- El id de venta (`VTA-n`) lo asigna el servidor; el POS envía una
  `clientRequestId` para que un reintento no duplique la venta.
- `src/utils/storage.js` (localStorage) es legado y no se usa.

## Reglas no negociables

- El stock se deriva de `inventoryMovements`; nunca se edita `onHand`.
- El costo de receta se calcula desde el inventario; nunca se ingresa a mano.
- El servidor no agrega dependencias externas sin decisión explícita.
- Toda acción nueva va en `src/state/rootReducer.js`, no solo en el cliente.
- Todo cambio significativo se registra en `CHANGELOG.md` con fecha.
- Si un cambio contradice una skill `meson-*`, el mismo cambio actualiza la skill.
- Nunca correr ni escribir scripts que borren o reescriban datos sin confirmar
  el alcance (skill `meson-data-reset`). No correr `scripts/` contra datos reales
  desde un entorno de desarrollo.
- El repo es público: no escribir IP, nombres de red, contraseñas ni datos
  personales en código, docs, issues o PR.
- UI y documentación en español; montos en CLP.

## Impresión

`server/printer.js` en `main` solo imprime en Windows (recurso compartido con
`copy /b`). El soporte Linux (`/dev/usb/lp0`) y los tickets en ASCII están en
los PR #9 y #26, todavía sin mergear.

## Dónde leer más

- Skills en `.claude/skills/meson-*`: cargar la que corresponda antes de tocar código.
- `docs/ARCHITECTURE.md`, `docs/MODELO_DE_DATOS.md`, `docs/REGLAS_DE_NEGOCIO.md`,
  `docs/ESTRATEGIA_DE_PRUEBAS.md`, `docs/GUIA_DE_DEPLOYMENT.md`.
- `AI_RULES.md`: librerías y estilo de la interfaz (Lucide, Recharts, Sonner, CSS plano).
