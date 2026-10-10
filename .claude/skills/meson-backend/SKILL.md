---
name: meson-backend
description: Usar al modificar server/index.js, server/persistence.js, server/printer.js, src/state/rootReducer.js, o al agregar una acción nueva que deba estar disponible desde tablet/celular (no solo en un dispositivo). Da las convenciones del servidor local y la impresión de tickets del Sistema Restaurante El Mesón de Los Laureles, y errores ya conocidos a no repetir.
---

# Servidor local — El Mesón de Los Laureles

Documento completo de referencia: `docs/GUIA_DE_DEPLOYMENT.md` y
`docs/ARCHITECTURE.md` §3 (incluye el diagrama completo del flujo
servidor↔cliente).

> Si `docs/` contradice el código o GitHub, vale el código o GitHub. El
> issue #17 "Estado SISAD" es el índice breve del proyecto.

## Qué es y por qué existe

El sistema corre en el computador B del restaurante (Ubuntu Server) como
servidor local; la tablet y el celular se conectan por WiFi y comparten el
mismo inventario/ventas casi en tiempo real (polling cada ~2s). No
depende de internet.

## Impresión de tickets

`server/printer.js` selecciona el destino con `PRINTER_MODE`:

- En Windows, el valor predeterminado es `windows-share`; conserva el
  envío con `copy /b` a `PRINTER_SHARE` (por defecto
  `\\localhost\TICKETS`).
- En Linux, el valor predeterminado es `device`: escribe los bytes del
  ticket directamente en `PRINTER_DEVICE` (por defecto
  `/dev/usb/lp0`). Usa apertura `r+`, por lo que no crea un archivo
  normal si el dispositivo no existe. El usuario del servidor necesita
  permisos para el dispositivo; el error sugiere revisar el grupo `lp`.
- En Linux también se puede elegir `cups`: requiere `PRINTER_QUEUE` y
  manda el archivo temporal como trabajo raw con
  `lp -d <cola> -o raw` mediante `execFile`.

Los trabajos se procesan en secuencia para evitar que se mezclen
comandas y cuentas. Las pruebas automatizadas cubren selección de modo,
envíos simulados, limpieza de temporales y cola; no prueban una impresora
física. La impresión en el computador B con la Xprinter XP-P101 se
validó el 2026-10-08 en modo `device`. El texto de los tickets se manda
solo en ASCII (`toTicketAscii` quita tildes y `ñ`, y deja `?` en lo demás) porque la
XP-P101 arranca en modo chino y un byte >= 0x80 sale como ideograma
(visto el 2026-10-08: "Débito" salió "D閲ito").

## Regla no negociable: sin dependencias externas

`server/` usa **solo módulos nativos de Node** (`http`, `fs`, `path`,
`url`, y `child_process` y `os` en `printer.js`). Nunca agregar
`express`, `ws`, ni ninguna librería de terceros al servidor sin
consultarlo explícitamente primero — el restaurante puede no tener
internet disponible en el servidor para hacer `npm install` de algo
nuevo, y cada dependencia es un punto más de falla que nadie ahí podrá
diagnosticar. Si el polling de 2s alguna vez es insuficiente y se
decide agregar `ws` para push en tiempo real, que sea una decisión
explícita, no un efecto colateral de una función que "necesitaba" un
paquete.

## Antes de agregar una acción nueva

Toda mutación de estado tiene que pasar por `src/state/rootReducer.js`
(`appDataReducer`), que es lo que importa `server/index.js` para aplicar
acciones. Si agregas un caso nuevo:

1. La función pura va en `src/state/appState.js` (ver `meson-arquitectura`).
2. El case del switch va en `src/state/rootReducer.js` — **no** solo en
   el cliente. Si se te olvida, la acción falla silenciosamente para
   todos los dispositivos (el servidor no reconoce el `type`).
3. El wrapper de conveniencia (ej. `saveProduct`, `recordSale`) va en
   `AppDataContext.jsx`, llamando a `dispatch({ type, payload })`.

## Errores ya encontrados — no repetir

- **Rutas de archivo en Windows** (sigue aplicando: se desarrolla en
  Windows aunque el servidor sea Linux): nunca usar `new URL(...).pathname`
  directamente como ruta de sistema de archivos — en Windows produce
  rutas corruptas (`C:\C:\Users\...`). Siempre convertir con
  `fileURLToPath()` de `node:url` antes de pasarlo a `path.join`/`fs`.
  Este bug real rompió el primer arranque en Windows durante la
  migración.
- **Persistencia no atómica**: `saveState()` siempre escribe a un
  archivo temporal y recién después hace `renameSync` al archivo final.
  No cambiar esto a una escritura directa — es lo que evita corromper
  `app-state.json` si se corta la luz a mitad de guardado.
- **Estado persistido ilegible**: si `server/data/app-state.json` existe
  pero no se puede leer o normalizar, `loadState()` lanza `StateFileError`
  y no modifica el archivo. `server/index.js` informa el error y termina
  sin iniciar con el estado semilla; no se debe recuperar silenciosamente
  ni renombrar el archivo. Para recuperar: detener el servidor, guardar una
  copia del archivo dañado y reemplazar `app-state.json` por el último
  respaldo descargado con Panel → "Respaldar JSON" (`loadState()` acepta
  ese envoltorio tal cual), y volver a iniciar. Solo una instalación sin archivo
  crea el estado por defecto.
- **Confundir el estado del cliente con el del servidor**: el cliente
  (`AppDataContext.jsx`) ya no es dueño del estado — solo lo refleja.
  No reintroducir un `useReducer` local que mute el estado en el
  navegador; toda mutación real pasa por `POST /api/dispatch`.
- **Ids de venta generados en el cliente** (issue #10): el cliente veía
  `sales.length` con el desfase del polling y dos ventas podían recibir el
  mismo id. Ahora el id lo asigna el servidor (`generateSaleId`, a partir
  del mayor `VTA-n`). Un ticket nuevo del POS no envía `id`, sino una
  `clientRequestId` (`createClientRequestId`, con
  `crypto.getRandomValues`; no usar `crypto.randomUUID`, que no existe
  por `http://`). `saveTicket` con una clave ya guardada actualiza ese
  ticket (reintento) en vez de crear otro. `dispatch` devuelve el estado
  aplicado y el POS ubica su ticket por la clave. No volver a generar ids
  de venta en el cliente.

## Al tocar `AppDataContext.jsx`

- El polling y el `dispatch` siguen usando rutas relativas (`/api/...`)
  — esto es lo que permite que el mismo código funcione en desarrollo
  (con el proxy de Vite) y en producción (servido por el propio
  servidor) sin ramas de código por entorno.
- Si agregas un dato derivado nuevo (tipo `inventory`, `alerts`), sigue
  calculándose en el cliente con `useMemo` a partir del `state` que
  llega del servidor — no lo calcules en el servidor salvo que haya una
  razón concreta para moverlo ahí.

Tests de impresión en `tests/printer.test.js`.
