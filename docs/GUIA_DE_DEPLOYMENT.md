# Guía de Deployment — Sistema Restaurante El Mesón de Los Laureles

> Documento de referencia para construir, desplegar y mantener el sistema
> en producción.

## 1. Arquitectura de Deployment

El sistema corre como un **servidor local en un computador dedicado del
restaurante** (hoy, un notebook con Ubuntu Server que corre el servidor
como servicio de systemd). La tablet, el celular y cualquier otro equipo
se conectan a ese servidor por la red WiFi local — no requiere internet
ni ningún servicio en la nube. También puede correr en Windows o macOS
(por ejemplo, para desarrollo).

```
Servidor del local (host)
    ↓ npm start
Servidor Node.js (server/index.js)
    ├── Sirve el build de producción (dist/) a cualquier dispositivo
    │     que entre a http://<IP-del-servidor>:3000
    ├── API JSON (/api/state, /api/dispatch)
    └── Persiste el estado en server/data/app-state.json (disco local)
         ↑
Tablet / Celulares (clientes, misma red WiFi)
    → abren esa misma URL en el navegador
    → consultan y modifican el mismo estado del servidor
```

### 1.1 Implicaciones

- **Un solo servidor, una sola fuente de verdad**: el servidor es quien
  manda. Tablet y celulares son clientes que leen y escriben contra él.
- **Sin dependencia de internet**: todo corre dentro de la red WiFi local.
  Si se corta el internet del local pero el WiFi local sigue funcionando,
  el sistema sigue operando con normalidad.
- **El servidor debe estar encendido y conectado a la red** mientras se
  quiera operar desde tablet o celular. Si el servidor se apaga o pierde
  la red, esos dispositivos no pueden seguir trabajando hasta que vuelva.
- **Sincronización casi en tiempo real**: los dispositivos consultan al
  servidor cada ~2 segundos (polling), así que un cambio hecho en un
  dispositivo tarda hasta 2 segundos en reflejarse en los demás.

> Nota histórica: la primera versión del sistema era una SPA 100%
> client-side con `localStorage` por dispositivo (sin backend). Se migró
> a este modelo de servidor local porque el negocio necesita que el PC,
> la tablet y los celulares compartan el mismo inventario y las mismas ventas en
> tiempo real — con solo `localStorage` cada dispositivo tenía su propio
> estado, sin sincronizar entre sí.

## 2. Instalación y Primer Arranque

### 2.1 Requisitos

- Node.js 20.x o superior instalado en el servidor.
- El servidor y todos los dispositivos (tablet, celulares) conectados a la
  **misma red WiFi**.

### 2.2 Instalación

```bash
npm install
```

### 2.3 Arranque en producción (uso diario del restaurante)

```bash
npm start
```

Este comando: construye el build de producción (`vite build`) y luego
levanta el servidor (`server/index.js`) que sirve ese build junto con la
API, todo en un solo proceso y un solo puerto (por defecto, `3000`).

Al arrancar, la consola muestra algo así:

```
El Mesón de Los Laureles — servidor local
Escuchando en el puerto 3000.
Desde este mismo computador: http://localhost:3000
Desde la tablet o celular (misma red WiFi): http://<IP-de-este-computador>:3000
```

### 2.4 Encontrar la IP del servidor

- **Linux**: `ip addr` → buscar la interfaz de red en uso.
- **Windows**: abrir `cmd` y escribir `ipconfig` → buscar "Dirección
  IPv4".
- **macOS**: `ifconfig`.

Conviene reservar esa IP en el router (DHCP estático) para que no cambie
al reiniciar; si cambia, la tablet y los demás equipos dejan de encontrar
el servidor. No escribir la IP real en el repositorio (es público).

Desde la tablet o el celular, entrar en el navegador a
`http://<esa-IP>:3000`.

### 2.5 Arranque automático

En el servidor del local, `server/index.js` debe correr como servicio del
sistema (en Linux, una unidad de systemd con `Restart=always` y
`WorkingDirectory` apuntando al proyecto), para que arranque solo al
encender el equipo y se reinicie si se cae. Ajustar también la zona
horaria del sistema a la de Chile: las fechas de ventas y movimientos se
toman del reloj del servidor.

### 2.6 Firewall

La primera vez que se corre el servidor, el sistema operativo puede pedir
permiso para aceptar conexiones entrantes (Firewall de Windows u
equivalente; en Linux, revisar `ufw` si está activo). Hay que **aceptar/permitir el acceso** o los demás
dispositivos no podrán conectarse. Si la tablet/celular no logran cargar
la página, este es el primer punto a revisar.

### 2.7 Impresora térmica (opcional)

El POS puede imprimir comandas de cocina y cuentas de cliente en una
impresora térmica USB (58mm, ESC/POS) conectada al servidor — ver
`server/printer.js` y `docs/ARCHITECTURE.md` §3.

> **Estado en `main`:** la impresión solo está implementada para Windows
> (`process.platform === "win32"`; en otro sistema operativo falla con un
> error explícito y el resto del sistema sigue funcionando). El soporte
> para Linux (escritura directa al dispositivo USB, por ejemplo
> `/dev/usb/lp0`) está en el PR #9, y los tickets solo en ASCII (sin
> tildes ni ñ, porque la impresora no los imprime bien) en el PR #26.
> Esta sección se actualiza cuando ambos estén mergeados.

Configuración única en Windows:

1. Panel de Control de Windows → Dispositivos e impresoras.
2. Clic derecho en la impresora térmica → Propiedades de impresora.
3. Pestaña "Compartir" → "Compartir esta impresora" → asignar un nombre
   corto, por ejemplo `TICKETS`.
4. Si el nombre compartido no es `TICKETS`, configurar la variable de
   entorno `PRINTER_SHARE` antes de `npm start`, ej.
   `PRINTER_SHARE=\\localhost\MiImpresora`.

Sin este paso, el sistema completo (inventario, compras, recetas, POS,
reportes) sigue funcionando con normalidad — solo fallan los botones de
imprimir comanda/cuenta en el POS.

## 3. Build de Producción (paso interno de `npm start`)

Si se necesita solo construir sin levantar el servidor:

```bash
npm run build
```

Genera `dist/` (HTML, CSS, JS minificados y con hash para cache
busting). `server/index.js` sirve ese contenido directamente — no hace
falta subirlo a ningún hosting externo.

## 4. Desarrollo local (para quien programa, no para el uso diario)

Durante el desarrollo conviene correr Vite (con recarga en caliente) y el
servidor por separado, en dos terminales:

```bash
# Terminal 1
npm run dev          # Vite en el puerto 3000, con recarga en caliente

# Terminal 2
npm run server:dev   # servidor Node en el puerto 3001
```

`vite.config.js` ya tiene configurado un proxy de `/api` hacia el puerto
3001, así que el código del frontend (`AppDataContext.jsx`) es idéntico
en desarrollo y en producción — solo usa rutas relativas (`/api/...`).

## 5. Persistencia y Backups

### 5.1 Dónde vive el estado

El estado completo del sistema (productos, movimientos, recetas, ventas,
compras, proveedores) se guarda en:

```
server/data/app-state.json
```

en el servidor. Esta carpeta **no se sube al control de
versiones** (está en `.gitignore`) — es el dato real y en vivo del
restaurante, distinto en cada instalación.

La escritura es atómica (se escribe primero a un archivo temporal y
recién después se reemplaza el archivo real), para que un corte de luz a
mitad de una escritura no corrompa el archivo.

### 5.2 Backup manual (recomendado, además de lo anterior)

1. Desde el Panel, clic en **Respaldar JSON** → descarga un JSON con
   todo el estado.
2. Recomendación: hacerlo al final de cada día, y guardar esa copia fuera
   del propio servidor (pendrive, nube personal, etc.) por si el disco del
   equipo falla.

### 5.3 Restauración

1. Panel → **Restaurar JSON** → seleccionar el archivo JSON.
2. Confirmar. Esto reemplaza el estado actual del servidor (y por lo
   tanto lo que ven todos los dispositivos conectados).

> ⚠️ La restauración reemplaza todos los datos actuales para **todos los
> dispositivos conectados**, no solo el que la ejecuta.

## 6. Actualizaciones del sistema

1. **Backup de datos** desde el Panel.
2. Detener el servidor (`Ctrl+C` en la consola donde corre, o detener el
   servicio, por ejemplo `sudo systemctl stop <servicio>`).
3. Reemplazar los archivos del proyecto por la nueva versión (sin tocar
   `server/data/`, que no se versiona).
4. `npm install` (por si hay dependencias nuevas).
5. `npm run build` y volver a iniciar el servidor (`npm start` o
   iniciar el servicio).
6. Verificar que las páginas cargan y que un dispositivo de prueba
   (tablet/celular) puede conectarse.

`normalizeLoadedState` (en `src/state/appState.js`) sigue aplicando
migraciones automáticas de versiones anteriores de datos, igual que
antes de la migración a servidor.

## 7. Consideraciones de Seguridad

- **Sin autenticación**: cualquier dispositivo en la red WiFi local puede
  acceder al sistema, cobrar y anular con solo conocer la IP. Antes de
  operar en el local hay que limitar el acceso al puerto del servidor a
  los equipos autorizados (firewall por IP). En cualquier caso, **no
  exponer el puerto del servidor a internet** (no hacer port-forwarding en
  el router).
- **No hay HTTPS**: al ser tráfico dentro de una red local de confianza,
  no es indispensable, pero tampoco se debe usar esta configuración fuera
  de esa red.
- **No se almacenan datos de pago ni información personal de clientes**
  — el sistema no lo requiere para operar.

## 8. Monitoreo y Mantenimiento

- **Mantener el servidor encendido y sin suspensión** durante el horario
  de atención. Si es un notebook, configurar que no se suspenda al cerrar
  la tapa, y revisar en la BIOS si puede encenderse solo al volver la
  luz tras un corte.
- **Actualización de dependencias**: revisar periódicamente con
  `npm outdated`.
- **Backups regulares**: aunque el archivo en disco es la fuente de
  verdad, los backups manuales son la red de seguridad ante fallas de
  disco o borrados accidentales.

## 9. Recuperación ante Desastres

| Escenario | Solución |
|---|---|
| `server/data/app-state.json` existe pero no se puede leer (dañado) | El servidor **no arranca** y muestra el error (no parte desde cero, para no pisar los datos reales). Detener el servicio, guardar una copia del archivo dañado, reemplazar `app-state.json` por el último respaldo descargado con **Respaldar JSON** (sirve tal cual) y volver a iniciar |
| Se borra `server/data/app-state.json` | El servidor arranca con el catálogo semilla (instalación nueva). Restaurar el último respaldo con Panel → **Restaurar JSON** |
| El servidor se apaga a mitad de una venta | Ese cambio puntual puede perderse si no llegó a persistirse; los cambios previos ya guardados están intactos |
| Servidor roto/perdido | Reinstalar el sistema en otro equipo y restaurar el backup JSON más reciente |
| Tablet/celular no conecta | Revisar: misma red WiFi, IP correcta, servicio corriendo, firewall del servidor |
| Actualización rompe datos | Restaurar backup anterior |

## 10. Checklist de Deployment

### Antes de un cambio grande

- [ ] Tests pasan (`npm test`)
- [ ] Build exitoso (`npm run build`)
- [ ] CHANGELOG.md actualizado
- [ ] Backup de datos creado desde el Panel
- [ ] Probado con al menos un dispositivo adicional (tablet o celular) en la red WiFi

### Después de desplegar

- [ ] El servidor sirve la app en `http://localhost:3000`
- [ ] La tablet/celular puede acceder por `http://<IP-del-servidor>:3000`
- [ ] Firewall del servidor permite conexiones entrantes al puerto usado
- [ ] Datos cargan correctamente en todos los dispositivos
- [ ] POS funciona (registrar una venta de prueba y verla reflejarse en otro dispositivo)
- [ ] Compras funcionan (crear una OC de prueba)
- [ ] Reportes cargan correctamente
- [ ] Backup/restauración funciona
- [ ] Notificar al personal
