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
- Cada PR actualiza lo que su cambio vuelve incorrecto: `docs/`, skills
  `meson-*`, este archivo y `CHANGELOG.md` (con fecha). Quien revisa lo
  comprueba. Si una skill o un doc contradice el código, vale el código y se
  corrige el texto en el mismo PR.
- Nunca correr ni escribir scripts que borren o reescriban datos sin confirmar
  el alcance (skill `meson-data-reset`). No correr `scripts/` contra datos reales
  desde un entorno de desarrollo.
- El repo es público: no escribir IP, nombres de red, contraseñas ni datos
  personales en código, docs, issues o PR.
- UI y documentación en español; montos en CLP.

## Flujo de trabajo (para todas las sesiones de IA)

Participan Matias, el Coordinador de proyecto (Claude en claude.ai), Claude
Code (VS Code, en el equipo de Matias) y GitHub Copilot. Matias decide y es el
único que hace merge. Gemini no participa.

- **Paquete de aprobación:** cada tarea define objetivo, alcance y áreas
  previstas, criterios de aceptación, riesgo, validación, documentación que
  puede verse afectada, responsable, revisor previsto (riesgo medio y alto) y
  línea de dependencia. Dentro de esos límites, el responsable decide la
  implementación reversible.
- **Registro:** el issue de la tarea guarda el responsable aprobado, el revisor
  previsto, el alcance aprobado, la línea de dependencia (o "independiente") y
  el PR bloqueante si existe. El PR solo enlaza al issue.
- **Puertas de Matias:** (1) aprobación del paquete; (2) expansión de alcance
  o cambio de conducta no previsto; (3) datos reales, borrado, permisos o
  publicación; (4) merge. Si estaban en el paquete, no piden otra pausa: rama,
  commits, push, PR en borrador, pedido de revisión y actualización breve del
  #17.
- **Tres capas de información:** este archivo guarda las reglas durables; el
  issue #17 "Estado SISAD" es un índice breve (decisiones vigentes, bloqueos,
  dependencias y próximos hitos); issues, PR y CI guardan el detalle
  verificable. Se enlaza, no se resume de nuevo. **GitHub manda:** si un
  resumen no coincide con GitHub, vale GitHub.
- **Responsable único:** Matias lo elige al aprobar el paquete, por capacidad
  y riesgo. El Coordinador lo propone con una línea de justificación. El
  briefing lleva solo el issue o PR, los criterios, las decisiones vigentes y
  las superficies afectadas.
- **Revisor previsto** (riesgo medio y alto): lo designa Matias junto al
  responsable; el Coordinador puede proponerlo. Es una sesión distinta del
  responsable y recibe solo el diff, los criterios y la evidencia.
- **Roles:**
  - Coordinador de proyecto: crea y refina tareas, arma el paquete, propone
    responsable y revisor, mantiene breve el #17 y la memoria del proyecto;
    implementa cuando Matias lo elige. No prueba en el servidor ni en la copia
    local.
  - Claude Code: implementa cuando Matias lo elige, sobre todo lo que se
    prueba en el navegador, en la copia local o en el servidor. Entrega PR con
    evidencia de UI cuando corresponde. No revisa su propio PR.
  - Copilot: audita y revisa (ver `.github/copilot-instructions.md`). No
    implementa en ramas de otra sesión, no aprueba ni hace merge.
- **Riesgo y revisión** (el revisor puede subir el riesgo, justificándolo):

  | Riesgo | Qué entra | Revisión |
  |---|---|---|
  | Bajo | Documentación o cosmética aislada | Checklist + CI |
  | Medio | UI funcional, lógica cubierta por tests, API o servidor sin datos reales | Revisión cruzada focalizada |
  | Alto | Ventas, inventario, persistencia, impresión, seguridad, scripts de datos, despliegue o varios clientes | Revisión cruzada + prueba manual definida |

- **Validación proporcional:** si toca código, `npm test` una vez como línea
  base antes de la primera modificación, pruebas focalizadas durante el
  trabajo y `npm test` completo antes del PR. Si toca UI, además
  `npm run build` y evidencia: por cada pantalla o flujo modificado, una
  captura o clip y los pasos con el resultado esperado (no reemplaza la
  prueba final de Matias). Documentación pura: sin validación local de
  código. El CI (`.github/workflows/ci.yml`: `npm test` y `npm run build`) es
  obligatorio en todo PR.
- **Línea de dependencia:** cadena donde un PR requiere el merge de otro, o
  donde ambos cambian el mismo comportamiento, contrato, archivo de alta
  colisión, datos o infraestructura compartidos. Hay un solo PR de código
  abierto por cadena. Compartir un archivo no bloquea si los cambios son
  claramente independientes y el riesgo de conflicto es bajo; las dudas las
  resuelve Matias. Investigaciones o documentación independientes pueden
  coexistir.
- **Una tarea, una rama, un PR.** Nunca dos sesiones en la misma rama.
- **Autor de los commits:** `matiaslarenas
  <33456759+matiaslarenas@users.noreply.github.com>`. No reescribir historial.
- **Tests nuevos en `tests/appState.test.js`:** insertarlos en medio del
  archivo, no al final, para evitar conflictos entre PRs.
- **Mejora ligera:** al cerrar una tarea se anota solo relectura duplicada,
  espera evitable, cambio de alcance o revisión insuficiente. Tras 5 a 10
  tareas se ajusta el flujo.
- **Cierre con destinatario:** toda respuesta a Matias termina con
  `➡ Entrega a: <quién> — <qué pasarle>` (Matias, Coordinador de proyecto,
  Claude Code o Copilot), pasando un número de PR o issue, no un resumen.

## Impresión

`server/printer.js` imprime en Linux escribiendo en `/dev/usb/lp0` (modo
`device`, por defecto) o por CUPS, y en Windows por recurso compartido con
`copy /b`. Los tickets van solo en ASCII (sin tildes ni ñ). Detalle en la
skill `meson-backend`.

## Dónde leer más

- Skills en `.claude/skills/meson-*`: cargar la que corresponda antes de tocar código.
- `docs/ARCHITECTURE.md`, `docs/MODELO_DE_DATOS.md`, `docs/REGLAS_DE_NEGOCIO.md`,
  `docs/ESTRATEGIA_DE_PRUEBAS.md`, `docs/GUIA_DE_DEPLOYMENT.md`.
- `AI_RULES.md`: librerías y estilo de la interfaz (Lucide, Recharts, Sonner, CSS plano).
