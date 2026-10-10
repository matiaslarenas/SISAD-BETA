# Guía de Usuario — Sistema Restaurante El Mesón de Los Laureles

> Manual práctico para el personal del restaurante. El sistema no pide
> usuario ni contraseña: basta con estar en la red WiFi del local.

## 1. Primeros Pasos

### 1.1 Acceso al Sistema

El sistema corre en el servidor del local (un computador dedicado). Para
que funcione, **el servidor debe estar encendido y conectado a la red
WiFi** del restaurante — es el que guarda toda la información.

- **En la tablet, el celular o un PC**: conéctate a la misma red WiFi y
  abre el navegador en `http://<IP-del-servidor>:3000` (el administrador te
  da esta dirección — no cambia salvo que se reconfigure la red).
- El sistema carga automáticamente con los datos actuales. Si tarda unos
  segundos en aparecer o dice "Conectando con el servidor local…", es
  normal mientras se establece la conexión.
- Los cambios que hagas (una venta, un ajuste de stock) se reflejan en
  los demás dispositivos en un par de segundos — no es instantáneo, pero
  es automático.

### 1.2 Navegación

El sistema tiene un menú lateral con las siguientes secciones:

| Ícono | Sección | Uso principal |
|---|---|---|
| 📊 | **Panel** | Vista general de KPIs y alertas |
| 📦 | **Inventario** | Consultar y gestionar stock |
| 🛒 | **Compras** | Registrar compras recibidas y armar pedidos |
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

### 4.1 Registrar una Compra Recibida

Es la forma de cargar al sistema lo que se compró y ya llegó.

1. Ve a **Compras** en el menú.
2. En **Compras recibidas**, haz clic en **+ Registrar compra**.
3. Indica el proveedor y la fecha.
4. Agrega cada producto con la cantidad y el precio pagado.
5. Confirma con **Registrar compra**.

> Al registrar, el stock sube y el precio pagado pasa a ser el costo del
> producto. La compra aparece en la tabla de **Compras recibidas**. El
> proveedor habitual de cada producto no cambia.

### 4.2 Planificador y Borrador de Pedido

El **Planificador Inteligente de Compras** muestra los insumos que
tienen stock actual igual o menor a su stock mínimo. Al agregarlos al
borrador, la cantidad sugerida es lo que falta para llegar al mínimo
(mínimo 1). No descuenta compras ya pedidas ni agrega margen de
seguridad: revisar a mano si algo ya viene en camino.

1. Presiona **+ Agregar** en un insumo (o **+ Agregar Todos los
   Críticos**) para moverlo al borrador.
2. En el **Borrador de Orden de Compra**, ajusta cantidades y elige el
   proveedor.
3. **Generar Orden de Compra Final (Enviar por WA)** abre WhatsApp con el
   pedido listo para enviar al proveedor.

> El borrador **no se guarda en el sistema** ni sube el stock: solo arma
> el mensaje. Cuando la mercadería llegue, regístrala con
> **+ Registrar compra** (§4.1).

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

### 6.1 Elegir Productos

1. Ve a **POS** en el menú.
2. La carta se muestra por **categorías**: toca una categoría para ver
   sus productos, y **Volver a categorías** para regresar. También puedes
   filtrar con el selector de categoría.
3. Cada producto muestra su precio y las porciones disponibles según el
   inventario. Un producto sin stock se ve apagado, pero se puede vender.

### 6.2 Armar el Pedido (Mesa)

1. Toca un producto para agregarlo al ticket; repite para sumar unidades.
2. Escribe la **Mesa / Identificador** y, si hace falta, una nota para
   cocina.
3. Haz clic en **Guardar Pedido**. La mesa queda en **Mesas / Pedidos
   Activos** y el stock se reserva (se descuenta) en ese momento.
4. Para seguir agregando, toca la mesa en **Mesas / Pedidos Activos**,
   suma productos y haz clic en **Actualizar Pedido**.

> **Aviso de stock**: si agregas más de lo que el inventario dice que hay,
> el sistema pregunta "¿Agregar igual?". Si confirmas, la venta sigue y el
> stock queda en negativo. Avísale al administrador para revisar el
> inventario.

> Si otro equipo cobra o anula la mesa que tienes abierta, el POS te avisa
> y suelta esa mesa, pero conserva lo que habías ingresado.

### 6.3 Cobrar

1. Abre la mesa (o arma el ticket directamente, sin guardarlo antes).
2. Selecciona el método de pago: **Efectivo**, **Tarjeta** o
   **Transferencia**.
3. Haz clic en **Cobrar & Cerrar**.

> Si la red falla al cobrar, puedes reintentar: el sistema no duplica la
> venta.

### 6.4 Imprimir Comanda y Cuenta

Si el servidor tiene una impresora térmica configurada (ver
`docs/GUIA_DE_DEPLOYMENT.md` §2.7):

- **Comanda a cocina** (botón con el ícono de cubiertos): imprime los
  ítems y cantidades del pedido actual (sin precios), con la nota si se
  agregó una.
- **Cuenta del cliente** (botón con el ícono de boleta): imprime el
  detalle con precios, el total y una sugerencia de propina del 10%.
- También se puede **reimprimir la cuenta** de una venta ya cerrada
  desde el historial.

> Si la impresora no está configurada, el sistema muestra un error al
> intentar imprimir y el resto del POS sigue funcionando con normalidad
> (la impresión es independiente de registrar la venta).

### 6.5 Anular

- **Una mesa pendiente**: en **Mesas / Pedidos Activos**, usa el botón de
  anular de esa mesa y confirma. Se reintegra el stock reservado.
- **Una venta ya cobrada**: en el **Historial de Ventas & Comandas**, usa
  la acción de anular y confirma.

> La anulación restaura automáticamente los ingredientes al inventario.
> La venta queda como anulada y no suma en los reportes.

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

1. En el **Panel**, haz clic en **Respaldar JSON**.
2. Se descargará un archivo JSON con todo el estado del sistema.

> **Recomendación**: Crea un backup al final de cada día.

### 9.2 Restaurar Backup

1. En el **Panel**, haz clic en **Restaurar JSON**.
2. Selecciona el archivo JSON descargado anteriormente.
3. Confirma la restauración.

> ⚠️ **Advertencia**: La restauración reemplazará todos los datos actuales.
> Asegúrate de haber creado un backup antes de restaurar.

## 10. Solución de Problemas Comunes

### 10.1 El sistema no carga (o dice "Conectando con el servidor local…")

- Verifica que el **servidor esté encendido** y no esté en modo de
  suspensión/reposo — es el que sirve el sistema a los demás
  dispositivos.
- Verifica que tu dispositivo (tablet/celular) esté conectado a la
  **misma red WiFi** que el servidor.
- Verifica que estés entrando a la dirección correcta
  (`http://<IP-del-servidor>:3000` — pregúntale al administrador si no
  la tienes).
- Verifica que el navegador esté actualizado (Chrome, Firefox, Edge).
- Refresca la página (Ctrl+F5 o desliza hacia abajo en móvil).
- Si persiste, contacta al administrador — puede ser el firewall del
  servidor bloqueando la conexión, o que el servidor no arrancó (por
  ejemplo, porque su archivo de datos está dañado; ver
  `docs/GUIA_DE_DEPLOYMENT.md` §9).

### 10.2 Una receta no aparece en POS

- Las recetas base (sub-recetas, como masas o salsas) no aparecen en el
  POS: son preparaciones internas.
- Revisa el filtro de categoría (o vuelve a "Todas").
- Un producto sin stock sigue apareciendo, aunque se ve apagado.
- Si el costo es 0, es posible que falte medir una sub-receta.

### 10.3 El stock no se actualiza después de una venta

- Espera unos segundos: si la venta se hizo en **otro dispositivo**, la
  sincronización toma hasta 2 segundos en reflejarse.
- Refresca la página.
- Verifica en **Inventario** → historial de movimientos.
- Si el movimiento no aparece después de un rato, revisa que ambos
  dispositivos tengan conexión con el servidor (ver §10.1); si no, la
  venta no llegó a registrarse.

### 10.4 No puedo anular una venta

- Verifica que la venta no esté ya anulada.
- Si el problema persiste, contacta al administrador.

### 10.5 Las sugerencias de compra no aparecen

- Verifica que los productos tengan definido `minStock`.
- Verifica que no haya pedidos en camino cubriendo el déficit.

## 11. Contacto y Soporte

- **Administrador**: [Nombre del administrador]
- **Email**: [email@restaurante.com]
- **Teléfono**: [número de contacto]

> Para problemas técnicos, conserva la información de la alerta o error
> que aparece en pantalla.
