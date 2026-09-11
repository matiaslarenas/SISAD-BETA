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

- El estado cliente se centraliza en un único store React con persistencia unificada.
- El stock visible se calcula desde movimientos de inventario, no desde edición directa de localStorage.
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
