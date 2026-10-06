---
name: meson-backend
description: Usar al modificar server/index.js, server/persistence.js, server/printer.js, src/state/rootReducer.js, o al agregar una acción nueva que deba estar disponible desde tablet/celular (no solo en un dispositivo). Da las convenciones del servidor local del Sistema Restaurante El Mesón de Los Laureles y errores ya conocidos a no repetir.
---

# Servidor local — El Mesón de Los Laureles

Documento completo de referencia: `docs/GUIA_DE_DEPLOYMENT.md` y
`docs/ARCHITECTURE.md` §3 (incluye el diagrama completo del flujo
servidor↔cliente).

> Si `docs/` contradice el issue #17 "Estado SISAD" (tablero común) o el
> código, vale el tablero o el código: `docs/` no se está actualizando por ahora.

## Qué es y por qué existe

El sistema corre en el computador B del restaurante (Ubuntu Server) como
servidor local; la tablet y el celular se conectan por WiFi y comparten el
mismo inventario/ventas casi en tiempo real (polling cada ~2s). No
depende de internet.

## Regla no negociable: sin dependencias externas

`server/index.js` y `server/persistence.js` usan **solo módulos nativos
de Node** (`http`, `fs`, `path`, `crypto`, `url`). Nunca agregar
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
- **Confundir el estado del cliente con el del servidor**: el cliente
  (`AppDataContext.jsx`) ya no es dueño del estado — solo lo refleja.
  No reintroducir un `useReducer` local que mute el estado en el
  navegador; toda mutación real pasa por `POST /api/dispatch`.

## Al tocar `AppDataContext.jsx`

- El polling y el `dispatch` siguen usando rutas relativas (`/api/...`)
  — esto es lo que permite que el mismo código funcione en desarrollo
  (con el proxy de Vite) y en producción (servido por el propio
  servidor) sin ramas de código por entorno.
- Si agregas un dato derivado nuevo (tipo `inventory`, `alerts`), sigue
  calculándose en el cliente con `useMemo` a partir del `state` que
  llega del servidor — no lo calcules en el servidor salvo que haya una
  razón concreta para moverlo ahí.

## Impresión (`server/printer.js`)

La impresora térmica se maneja en `server/printer.js`, con
tests en `tests/printer.test.js`. En `main` solo está implementada para
Windows: si `process.platform !== "win32"` lanza un error. El soporte
para Linux, que necesita el B, está en el PR #9 (borrador, pendiente de
validar en el B). No dar por hecho que la impresión funciona en el B
hasta que #9 esté mergeado y probado.
