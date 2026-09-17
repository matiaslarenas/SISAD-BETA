# Guía de Deployment — Sistema Restaurante El Mesón de Los Laureles

> Documento de referencia para construir, desplegar y mantener el sistema
> en producción.

## 1. Arquitectura de Deployment

El sistema corre como un **servidor local en el computador de escritorio**
del restaurante. La tablet y los celulares se conectan a ese servidor por
la red WiFi local — no requiere internet ni ningún servicio en la nube.

```
Computador de escritorio (host)
    ↓ npm start
Servidor Node.js (server/index.js)
    ├── Sirve el build de producción (dist/) a cualquier dispositivo
    │     que entre a http://<IP-del-desktop>:3000
    ├── API JSON (/api/state, /api/dispatch)
    └── Persiste el estado en server/data/app-state.json (disco local)
         ↑
Tablet / Celulares (clientes, misma red WiFi)
    → abren esa misma URL en el navegador
    → consultan y modifican el mismo estado del desktop
```

### 1.1 Implicaciones

- **Un solo servidor, una sola fuente de verdad**: el desktop es quien
  manda. Tablet y celulares son clientes que leen y escriben contra él.
- **Sin dependencia de internet**: todo corre dentro de la red WiFi local.
  Si se corta el internet del local pero el WiFi local sigue funcionando,
  el sistema sigue operando con normalidad.
- **El desktop debe estar encendido y conectado a la red** mientras se
  quiera operar desde tablet o celular. Si el desktop se apaga o pierde
  la red, esos dispositivos no pueden seguir trabajando hasta que vuelva.
- **Sincronización casi en tiempo real**: los dispositivos consultan al
  servidor cada ~2 segundos (polling), así que un cambio hecho en un
  dispositivo tarda hasta 2 segundos en reflejarse en los demás.

> Nota histórica: la primera versión del sistema era una SPA 100%
> client-side con `localStorage` por dispositivo (sin backend). Se migró
> a este modelo de servidor local porque el negocio necesita que desktop,
> tablet y celulares compartan el mismo inventario y las mismas ventas en
> tiempo real — con solo `localStorage` cada dispositivo tenía su propio
> estado, sin sincronizar entre sí.

## 2. Instalación y Primer Arranque

### 2.1 Requisitos

- Node.js 20.x o superior instalado en el computador de escritorio.
- El desktop y todos los dispositivos (tablet, celulares) conectados a la
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

### 2.4 Encontrar la IP del desktop

- **Windows**: abrir `cmd` y escribir `ipconfig` → buscar "Dirección
  IPv4" (ej. `192.168.1.23`).
- **macOS/Linux**: `ifconfig` o `ip addr` → buscar la interfaz WiFi.

Desde la tablet o el celular, entrar en el navegador a
`http://<esa-IP>:3000`.

### 2.5 Firewall

La primera vez que se corre el servidor, el sistema operativo puede pedir
permiso para aceptar conexiones entrantes (Firewall de Windows u
equivalente). Hay que **aceptar/permitir el acceso** o los demás
dispositivos no podrán conectarse. Si la tablet/celular no logran cargar
la página, este es el primer punto a revisar.

### 2.6 Impresora térmica (opcional)

El POS puede imprimir comandas de cocina y cuentas de cliente en una
impresora térmica USB (58mm, ESC/POS) conectada al desktop — ver
`server/printer.js` y `docs/ARCHITECTURE.md` §3. Configuración única por
desktop, solo Windows (`process.platform === "win32"`; en otro sistema
operativo la impresión falla con un error explícito y el resto del
sistema sigue funcionando):

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

en el computador de escritorio. Esta carpeta **no se sube al control de
versiones** (está en `.gitignore`) — es el dato real y en vivo del
restaurante, distinto en cada instalación.

La escritura es atómica (se escribe primero a un archivo temporal y
recién después se reemplaza el archivo real), para que un corte de luz a
mitad de una escritura no corrompa el archivo.

### 5.2 Backup manual (recomendado, además de lo anterior)

1. Desde el Panel, clic en **Respaldar Datos** → descarga un JSON con
   todo el estado.
2. Recomendación: hacerlo al final de cada día, y guardar esa copia fuera
   del propio desktop (pendrive, nube personal, etc.) por si el disco del
   equipo falla.

### 5.3 Restauración

1. Panel → **Restaurar Backup** → seleccionar el archivo JSON.
2. Confirmar. Esto reemplaza el estado actual del servidor (y por lo
   tanto lo que ven todos los dispositivos conectados).

> ⚠️ La restauración reemplaza todos los datos actuales para **todos los
> dispositivos conectados**, no solo el que la ejecuta.

## 6. Actualizaciones del sistema

1. **Backup de datos** desde el Panel.
2. Detener el servidor (`Ctrl+C` en la consola donde corre).
3. Reemplazar los archivos del proyecto por la nueva versión (sin tocar
   `server/data/`, que no se versiona).
4. `npm install` (por si hay dependencias nuevas).
5. `npm start` de nuevo.
6. Verificar que las páginas cargan y que un dispositivo de prueba
   (tablet/celular) puede conectarse.

`normalizeLoadedState` (en `src/state/appState.js`) sigue aplicando
migraciones automáticas de versiones anteriores de datos, igual que
antes de la migración a servidor.

## 7. Consideraciones de Seguridad

- **Sin autenticación**: cualquier dispositivo en la red WiFi local puede
  acceder al sistema con solo conocer la IP. Es aceptable en una red
  doméstica/local de confianza, pero **no exponer el puerto del servidor
  a internet** (no hacer port-forwarding en el router).
- **No hay HTTPS**: al ser tráfico dentro de una red local de confianza,
  no es indispensable, pero tampoco se debe usar esta configuración fuera
  de esa red.
- **No se almacenan datos de pago ni información personal de clientes**
  — el sistema no lo requiere para operar.

## 8. Monitoreo y Mantenimiento

- **Mantener el desktop encendido y sin suspensión** durante el horario
  de atención — revisar la configuración de energía de Windows/macOS
  para que no entre en reposo mientras el servidor debe estar disponible.
- **Actualización de dependencias**: revisar periódicamente con
  `npm outdated`.
- **Backups regulares**: aunque el archivo en disco es la fuente de
  verdad, los backups manuales son la red de seguridad ante fallas de
  disco o borrados accidentales.

## 9. Recuperación ante Desastres

| Escenario | Solución |
|---|---|
| Se corrompe o se borra `server/data/app-state.json` | Restaurar desde el backup JSON más reciente vía Panel → Restaurar Backup |
| El desktop se apaga a mitad de una venta | Ese cambio puntual puede perderse si no llegó a persistirse; los cambios previos ya guardados están intactos |
| Desktop roto/perdido | Reinstalar el sistema en un desktop nuevo y restaurar el backup JSON más reciente |
| Tablet/celular no conecta | Revisar: misma red WiFi, IP correcta, Firewall del desktop |
| Actualización rompe datos | Restaurar backup anterior |

## 10. Checklist de Deployment

### Antes de un cambio grande

- [ ] Tests pasan (`npm test`)
- [ ] Build exitoso (`npm run build`)
- [ ] CHANGELOG.md actualizado
- [ ] Backup de datos creado desde el Panel
- [ ] Probado con al menos un dispositivo adicional (tablet o celular) en la red WiFi

### Después de desplegar

- [ ] El desktop sirve la app en `http://localhost:3000`
- [ ] La tablet/celular puede acceder por `http://<IP-del-desktop>:3000`
- [ ] Firewall del desktop permite conexiones entrantes al puerto usado
- [ ] Datos cargan correctamente en todos los dispositivos
- [ ] POS funciona (registrar una venta de prueba y verla reflejarse en otro dispositivo)
- [ ] Compras funcionan (crear una OC de prueba)
- [ ] Reportes cargan correctamente
- [ ] Backup/restauración funciona
- [ ] Notificar al personal
