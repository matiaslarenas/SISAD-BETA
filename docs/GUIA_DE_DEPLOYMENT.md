# Guía de Deployment — Sistema Restaurante Los Laureles

> Documento de referencia para construir, desplegar y mantener el sistema
> en producción.

## 1. Arquitectura de Deployment

El sistema es una **SPA (Single Page Application)** estática construida con
Vite. No requiere servidor backend — toda la lógica y persistencia se
ejecutan en el navegador del cliente mediante `localStorage`.

```
Cliente (navegador)
    ↓
Archivos estáticos (HTML, CSS, JS)
    ↓
localStorage (persistencia local)
```

### 1.1 Implicaciones

- **Sin backend**: no hay API, base de datos ni autenticación en el servidor.
- **Persistencia local**: los datos se guardan en el navegador del cliente.
- **Offline-first**: el sistema funciona sin conexión a internet.
- **Multi-dispositivo**: cada dispositivo tiene su propio estado local.

> ⚠️ **Importante**: Si se necesita sincronización entre dispositivos o
> backup en la nube, se requiere un backend adicional (fuera del alcance
> actual del sistema).

## 2. Build de Producción

### 2.1 Comando

```bash
npm run build
```

### 2.2 Salida

El build genera archivos en `dist/`:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

### 2.3 Optimizaciones

- **Code splitting**: Vite divide el código automáticamente.
- **Minificación**: CSS y JS se minifican.
- **Hashing**: los archivos tienen hash para cache busting.
- **Compresión**: se recomienda servir con gzip o brotli.

### 2.4 Verificación del Build

```bash
# Construir
npm run build

# Servir localmente para verificar
npm run preview
```

## 3. Opciones de Hosting

### 3.1 Hosting Estático (Recomendado)

El sistema puede desplegarse en cualquier proveedor de hosting estático:

| Proveedor | Ventajas | Consideraciones |
|---|---|---|
| **Vercel** | Deploy automático desde Git, preview URLs | Integración Git nativa |
| **Netlify** | Deploy automático, form handling | Integración Git nativa |
| **GitHub Pages** | Gratuito, fácil de configurar | Requiere configuración de routing |
| **Cloudflare Pages** | CDN global, rápido | Integración Git nativa |
| **Firebase Hosting** | CDN global, fácil | Requiere cuenta de Google |
| **Servidor propio** | Control total | Requiere configuración manual |

### 3.2 Configuración para GitHub Pages

Si usas GitHub Pages, configura `vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/nombre-del-repositorio/", // Cambiar al nombre de tu repo
  plugins: [react()],
});
```

### 3.3 Configuración para Servidor Propio

```nginx
# Ejemplo de configuración de Nginx
server {
    listen 80;
    server_name restaurante-loslaureles.cl;

    root /var/www/restaurante/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compresión
    gzip on;
    gzip_types text/css application/javascript;
}
```

## 4. Configuración de Dominio

### 4.1 Dominio Personalizado

1. Compra un dominio (ej. `restaurante-loslaureles.cl`).
2. Configura los DNS apuntando al hosting.
3. Habilita HTTPS (la mayoría de proveedores lo hacen automáticamente).

### 4.2 HTTPS

**Obligatorio**: El sistema usa `localStorage` y APIs modernas que requieren
HTTPS en producción. La mayoría de proveedores de hosting ofrecen HTTPS
gratuito con Let's Encrypt.

## 5. Actualizaciones

### 5.1 Proceso de Actualización

1. **Haz backup de datos**: Desde el Panel, haz clic en **Respaldar Datos**.
2. **Despliega la nueva versión**: Push a la rama principal o sube el build.
3. **Verifica**: Accede al sistema y comprueba que todo funciona.
4. **Comunica**: Informa al personal sobre cambios importantes.

### 5.2 Estrategia de Versionamiento

- Usar **versionamiento semántico** (SemVer): `MAJOR.MINOR.PATCH`.
- **MAJOR**: cambios que rompen compatibilidad.
- **MINOR**: nuevas funcionalidades (backward compatible).
- **PATCH**: correcciones de bugs.

### 5.3 Migración de Datos

El sistema incluye migraciones automáticas en `src/utils/storage.js`:

- `STORAGE_VERSION` controla la versión del estado.
- `normalizeLoadedState` aplica migraciones necesarias.
- Los backups incluyen `schemaVersion` y `backupVersion`.

> Al restaurar un backup de una versión anterior, el sistema aplica las
> migraciones automáticamente.

## 6. Monitoreo y Mantenimiento

### 6.1 Monitoreo

Como el sistema es estático y sin backend, el monitoreo se limita a:

- **Uptime**: verificar que el sitio responde.
- **Performance**: tiempo de carga de la SPA.
- **Errores de cliente**: usar Sentry o similar para capturar errores JS.

### 6.2 Mantenimiento

- **Actualización de dependencias**: revisar mensualmente con `npm outdated`.
- **Actualización de Node.js**: mantener la versión LTS.
- **Renovación de certificados SSL**: automática con la mayoría de proveedores.
- **Backup de datos**: los usuarios deben exportar backups regularmente.

## 7. Consideraciones de Seguridad

### 7.1 Seguridad del Lado del Cliente

- **No hay secretos en el código**: todo el código es visible en el cliente.
- **localStorage**: los datos están en el navegador del usuario.
- **No hay autenticación**: el sistema es accesible para quien tenga la URL.

### 7.2 Recomendaciones

- **Acceso restringido**: servir el sistema en una red local o VPN.
- **HTTPS obligatorio**: proteger la transmisión de datos.
- **Backups regulares**: los datos están en el navegador del cliente.
- **No almacenar datos sensibles**: el sistema no maneja información
  personal de clientes ni datos de pago.

### 7.3 Futuras Consideraciones

Si el sistema necesita:
- **Autenticación**: integrar un proveedor (Auth0, Firebase Auth, etc.).
- **Sincronización multi-dispositivo**: agregar un backend con API.
- **Base de datos en la nube**: integrar Supabase, Firebase, etc.

## 8. Rendimiento

### 8.1 Optimizaciones Implementadas

- **Code splitting**: Vite divide el bundle automáticamente.
- **Lazy loading**: componentes pesados se cargan bajo demanda.
- **Memoización**: datos derivados usan `useMemo` en el Context.
- **CSS optimizado**: estilos planos sin frameworks pesados.

### 8.2 Métricas Objetivo

| Métrica | Objetivo |
|---|---|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.0s |
| Bundle size | < 500 KB (gzip) |

### 8.3 Testing de Rendimiento

```bash
# Build de producción
npm run build

# Analizar bundle
npx vite-bundle-visualizer

# Lighthouse (manual)
# Abrir Chrome DevTools → Lighthouse → Run audit
```

## 9. Recuperación ante Desastres

### 9.1 Escenarios

| Escenario | Solución |
|---|---|
| Navegador borró localStorage | Restaurar desde backup JSON |
| Dispositivo roto/perdido | Restaurar backup en nuevo dispositivo |
| Actualización rompe datos | Restaurar backup anterior |
| Sitio caído | Redesplegar desde el repositorio |

### 9.2 Procedimiento de Recuperación

1. **Acceder al backup más reciente** (JSON descargado).
2. **Navegar al sistema** en el dispositivo de recuperación.
3. **Ir a Panel → Restaurar Backup**.
4. **Seleccionar el archivo JSON**.
5. **Confirmar la restauración**.

> ⚠️ La restauración reemplaza todos los datos actuales. Siempre
> verificar que el backup sea el más reciente antes de restaurar.

## 10. Checklist de Deployment

### Pre-Deployment

- [ ] Tests pasan (`npm test`)
- [ ] Build exitoso (`npm run build`)
- [ ] CHANGELOG.md actualizado
- [ ] Backup de datos creado
- [ ] Versión etiquetada (tag)

### Post-Deployment

- [ ] Sitio accesible en la URL
- [ ] HTTPS funcionando
- [ ] Datos cargan correctamente
- [ ] POS funciona (registrar una venta de prueba)
- [ ] Compras funcionan (crear una OC de prueba)
- [ ] Reportes cargan correctamente
- [ ] Backup/restauración funciona
- [ ] Notificar al personal
