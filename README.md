# Sistema Restaurante El Mesón de Los Laureles

Sistema de gestión integral para el restaurante El Mesón de Los Laureles, diseñado para controlar inventario, recetas, costeo, compras, ventas y reportes operacionales.

---

# Objetivo

Centralizar la operación del restaurante en una única aplicación, permitiendo:

- Control de inventario.
- Gestión de recetas.
- Costeo automático.
- Compras.
- Punto de venta (POS).
- Reportes operacionales.

---

# Contexto del Negocio

## Restaurante

Nombre:

El Mesón de Los Laureles

Ubicación:

Los Laureles, Cunco
Región de La Araucanía
Chile

## Operación

La operación está diseñada para una estructura pequeña:

- 1 Administrador.
- Personal de cocina.
- Caja.
- Aproximadamente 4 personas en total.

Dispositivos considerados:

- PC principal.
- Tablet.
- Smartphone.

---

# Decisiones Fundamentales

## Inventario

El inventario es la fuente de verdad.

Todo costo y stock debe originarse desde inventario.

## Costeo

Los costos se calculan automáticamente.

Nunca se ingresan manualmente en recetas.

## Carta Comercial

La Carta 2026 es la fuente de verdad del negocio.

Toda receta debe reflejar productos existentes en la carta.

## Flujo Operacional Implementado

- Un servidor local (`server/`, Node sin dependencias externas) es la única fuente de verdad y guarda todo en `server/data/app-state.json`. La tablet, el celular y los PC de la red WiFi consultan y modifican ese mismo estado.
- El stock visible se calcula desde movimientos de inventario, nunca por edición directa.
- La recepción de compras genera movimientos y actualiza stock/costo vigente por producto.
- El Punto de Venta (POS) descuenta automáticamente los ingredientes de cada receta en inventario mediante movimientos de tipo `sale`.
- Cálculo en tiempo real de porciones máximas disponibles según ingredientes cuello de botella en bodega.
- Soporte para anulación de ventas con reintegro automático de insumos al inventario.
- Formularios y diálogos entregan validación y retroalimentación accesible.

## Simplicidad

Se prioriza simplicidad operacional por sobre complejidad técnica.

## Escalabilidad

El sistema debe escalar solamente cuando exista una necesidad real.

No se implementará complejidad innecesaria.

---

# Arquitectura General

```text
Proveedor
    ↓
Compra
    ↓
Inventario
    ↓
Recetas
    ↓
Costeo
    ↓
POS
    ↓
Venta
    ↓
Reportes

---

# Cómo ejecutar

Requisito: Node.js 20 o superior.

```bash
npm install
npm test          # tests (node --test)
npm start         # build + servidor en http://localhost:3000
```

Para desarrollo, en dos terminales: `npm run dev` (Vite, puerto 3000) y
`npm run server:dev` (API, puerto 3001).

Más detalle:

- `CLAUDE.md`: resumen para herramientas de IA y reglas no negociables.
- `docs/GUIA_DE_DEPLOYMENT.md`: instalación en el servidor del local, respaldos y recuperación.
- `docs/ARCHITECTURE.md`: estructura del código y API.
- `docs/GUIA_DE_USUARIO.md`: uso diario para el personal.
