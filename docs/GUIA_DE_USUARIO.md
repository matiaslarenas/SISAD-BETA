# Guía de Usuario — Sistema Restaurante Los Laureles

> Manual práctico para el personal del restaurante. Esta guía asume que
> ya has iniciado sesión en el sistema.

## 1. Primeros Pasos

### 1.1 Acceso al Sistema

1. Abre el navegador en la PC, tablet o smartphone.
2. Navega a la URL del sistema (proporcionada por el administrador).
3. El sistema carga automáticamente con los datos del último cierre.

### 1.2 Navegación

El sistema tiene un menú lateral con las siguientes secciones:

| Ícono | Sección | Uso principal |
|---|---|---|
| 📊 | **Panel** | Vista general de KPIs y alertas |
| 📦 | **Inventario** | Consultar y gestionar stock |
| 🛒 | **Compras** | Crear y recibir órdenes de compra |
| 📋 | **Recetas** | Consultar fichas técnicas y costos |
| 💰 | **POS** | Punto de venta / caja |
| 📈 | **Reportes** | Reportes analíticos y exportación |
| 🏢 | **Proveedores** | Gestión de proveedores |

> En dispositivos móviles, toca el menú hamburguesa (☰) para abrir el
> menú lateral.

## 2. Panel de Control (Overview)

La pantalla de inicio muestra:

- **KPIs principales**: valor de inventario, ventas del día, margen bruto,
  mermas del día.
- **Centro de Alertas**: notificaciones importantes (stock crítico, OC
  atrasadas, etc.).
- **Acciones rápidas**: botones para respaldar datos, exportar CSV e
  importar backup.

### 2.1 Interpretar KPIs

- **Valor de inventario**: suma del costo de todos los productos en stock.
- **Ventas del día**: total de ventas completadas hoy.
- **Margen bruto**: diferencia entre ventas y costo de insumos (COGS).
- **Mermas del día**: valor total de productos perdidos hoy.

## 3. Gestión de Inventario

### 3.1 Consultar Stock

1. Ve a **Inventario** en el menú.
2. La tabla muestra todos los productos con:
   - Nombre y categoría
   - Stock actual (en unidad base)
   - Costo unitario vigente
   - Stock mínimo
   - Estado (activo/inactivo)

### 3.2 Buscar Productos

Usa la barra de búsqueda en la parte superior de la tabla para filtrar por
nombre o categoría.

### 3.3 Registrar Merma

1. En la tabla de inventario, haz clic en el botón **Merma** del producto.
2. Ingresa la cantidad perdida.
3. Selecciona el motivo de la merma:
   - **Vencido**: producto pasó su fecha de vencimiento
   - **Dañado**: producto dañado físicamente
   - **Preparación fallida**: receta mal hecha
   - **Merma de cocina**: cáscaras, sobras, etc.
   - **Otro**: especifica en la nota
4. Agrega una nota opcional.
5. Confirma el registro.

> ⚠️ **Importante**: La merma reduce el stock inmediatamente y se registra
> en el historial de movimientos.

### 3.4 Ajuste Manual de Inventario

> Solo el administrador debe realizar ajustes manuales.

1. En la tabla de inventario, haz clic en **Ajustar**.
2. Ingresa la cantidad ajustada (puede ser positiva o negativa).
3. Agrega una nota explicando el ajuste.
4. Confirma.

## 4. Compras

### 4.1 Crear Orden de Compra

1. Ve a **Compras** en el menú.
2. Haz clic en **Nueva Orden**.
3. Selecciona el proveedor.
4. Agrega productos:
   - Busca el producto en el catálogo.
   - Ingresa la cantidad y unidad.
   - Ingresa el costo unitario estimado.
5. Revisa el total y confirma.

> La orden se crea en estado **Pendiente**.

### 4.2 Confirmar Orden (En Tránsito)

1. En la lista de órdenes, haz clic en la orden.
2. Haz clic en **Confirmar Envío**.
3. La orden pasa a estado **En Tránsito**.

### 4.3 Recibir Mercancía

1. En la lista de órdenes, haz clic en la orden **En Tránsito**.
2. Haz clic en **Recibir**.
3. Ingresa la cantidad real recibida (puede diferir del pedido).
4. Confirma la recepción.

> Al recibir, el stock se actualiza automáticamente y se registra el costo
> real del producto.

### 4.4 Sugerencias de Compra

El sistema genera automáticamente sugerencias de compra basadas en:
- Stock actual vs. stock mínimo
- Órdenes en tránsito
- Margen de seguridad

1. Ve a **Compras** → pestaña **Sugerencias**.
2. Revisa las sugerencias.
3. Haz clic en **Crear OC** para generar una orden con un solo clic.

## 5. Recetas

### 5.1 Consultar Recetas

1. Ve a **Recetas** en el menú.
2. La tabla muestra:
   - Nombre de la receta
   - Costo actual (calculado automáticamente)
   - Precio de venta
   - Margen y % de costo
   - Porciones máximas disponibles

### 5.2 Porciones Máximas

El sistema calcula en tiempo real cuántas unidades de cada receta puedes
preparar con el stock actual. Este número aparece en la columna
**Porciones Máx** y se actualiza automáticamente al cambiar el inventario.

> Si una receta muestra 0 porciones, falta algún ingrediente.

### 5.3 Sub-Recetas (Recetas Base)

Las sub-recetas (masa, salsas) aparecen marcadas como **Base**. Su costo se
muestra como costo por unidad de rendimiento (ej. $/un, $/ml).

## 6. Punto de Venta (POS)

### 6.1 Tomar una Orden

1. Ve a **POS** en el menú.
2. La carta muestra todas las recetas de venta con:
   - Nombre
   - Precio de venta
   - Porciones disponibles (en tiempo real)
   - Costo y margen

### 6.2 Agregar al Ticket

1. Haz clic en una receta para agregar una unidad al ticket.
2. Repite para agregar más unidades o diferentes recetas.
3. El ticket se actualiza en tiempo real con el total.

### 6.3 Cobrar

1. Revisa el ticket.
2. Selecciona el método de pago:
   - **Efectivo**
   - **Tarjeta**
   - **Transferencia**
3. Haz clic en **Cobrar**.

> Al cobrar, el stock se reduce automáticamente y se registra la venta.

### 6.4 Anular una Venta

1. En el ticket, haz clic en **Anular**.
2. Confirma la anulación.

> La anulación restaura automáticamente los ingredientes al inventario.
> El ticket se marca como anulado y no afecta los reportes.

## 7. Proveedores

### 7.1 Ver Proveedores

1. Ve a **Proveedores** en el menú.
2. La tabla muestra: nombre, contacto, teléfono, email y dirección.

### 7.2 Agregar Proveedor

1. Haz clic en **Nuevo Proveedor**.
2. Completa los datos:
   - Nombre de la empresa
   - Persona de contacto
   - Teléfono
   - Email
   - Dirección
3. Guarda.

### 7.3 Editar / Eliminar

- Haz clic en el botón de **Editar** (✏️) para modificar datos.
- Haz clic en **Eliminar** (🗑️) para eliminar (con confirmación).

## 8. Reportes

### 8.1 Ver Reportes

1. Ve a **Reportes** en el menú.
2. La pantalla muestra:
   - Gráficos de ventas por día
   - Gráficos de mermas por categoría
   - Tabla de órdenes de compra
   - Snapshots diarios

### 8.2 Exportar Datos

1. En la sección de reportes, haz clic en **Exportar CSV**.
2. Se descargará un archivo CSV con los datos mostrados.

> El archivo CSV incluye BOM UTF-8 para abrir correctamente en Excel.

## 9. Backup y Restauración

### 9.1 Crear Backup

1. En el **Panel**, haz clic en **Respaldar Datos**.
2. Se descargará un archivo JSON con todo el estado del sistema.

> **Recomendación**: Crea un backup al final de cada día.

### 9.2 Restaurar Backup

1. En el **Panel**, haz clic en **Restaurar Backup**.
2. Selecciona el archivo JSON descargado anteriormente.
3. Confirma la restauración.

> ⚠️ **Advertencia**: La restauración reemplazará todos los datos actuales.
> Asegúrate de haber creado un backup antes de restaurar.

## 10. Solución de Problemas Comunes

### 10.1 El sistema no carga

- Verifica que el navegador esté actualizado (Chrome, Firefox, Edge).
- Refresca la página (Ctrl+F5 o desliza hacia abajo en móvil).
- Si persiste, contacta al administrador.

### 10.2 Una receta no aparece en POS

- Verifica que la receta esté **activa** en la sección de Recetas.
- Verifica que tenga ingredientes con stock suficiente.
- Si el costo es 0, es posible que falte medir una sub-receta.

### 10.3 El stock no se actualiza después de una venta

- Refresca la página.
- Verifica en **Inventario** → historial de movimientos.
- Si el movimiento no aparece, la venta no se registró correctamente.

### 10.4 No puedo anular una venta

- Verifica que la venta no esté ya anulada.
- Si el problema persiste, contacta al administrador.

### 10.5 Las sugerencias de compra no aparecen

- Verifica que los productos tengan definido `minStock`.
- Verifica que no haya órdenes en tránsito cubriendo el déficit.

## 11. Contacto y Soporte

- **Administrador**: [Nombre del administrador]
- **Email**: [email@restaurante.com]
- **Teléfono**: [número de contacto]

> Para problemas técnicos, conserva la información de la alerta o error
> que aparece en pantalla.
