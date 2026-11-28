# Graphite & Yellow: navegación y lectura operativa

La barra superior separa los destinos de trabajo de los datos de sesión. La marca activa queda bajo el nombre del área incluso al abrir un detalle. No hay columna lateral ni accesos por hover.

## Navegación

| Acceso | Destino |
| --- | --- |
| Overview | Dashboard; el World Map sigue integrado aquí y en el seguimiento de envíos. |
| Operations | Orders, Shipments, Incidents y Customers. |
| Inventory y Fleet | Enlaces directos a los dos registros. |
| Digital spaces | Fleet Twin, Warehouse Twin, Warehouse Editor y Control Room. |
| Users | Administración de usuarios, visible solo para ADMIN. |

Warehouse Editor sigue limitado a ADMIN y OPERATOR. Las rutas y sus guards no cambian. En escritorio, activar un grupo abre sus enlaces; Escape devuelve el foco al botón. En tablet los destinos pasan a una segunda línea. Hasta 700 px, **Menu** abre un diálogo desde arriba: Tab queda dentro, Escape lo cierra y elegir un destino devuelve el espacio al contenido.

[Operations](screenshots/top-operations.webp) · [Digital spaces](screenshots/top-digital-spaces.webp) · [Tablet](screenshots/tablet-dashboard.webp) · [Menú móvil](screenshots/mobile-navigation.webp).

## Color, materiales y movimiento

El lienzo antracita separa los registros de las superficies elevadas sin recurrir a sombras. El amarillo dorado identifica los iconos de navegación, las acciones principales y el foco de teclado. El texto de los estados acompaña siempre a su color: rojo para incidencias críticas, ámbar para advertencias y verde para resultados favorables.

- **Liquid Glass:** transparencia en elementos flotantes. Con transparencia reducida se usan superficies opacas.
- **Cabeceras operativas:** título, descripción y acciones sobre el lienzo, separados de los datos por una línea. En Control Room una línea dorada identifica la cabecera sin mantener un efecto ambiental en movimiento.
- **Kinetic Text Reveal:** entrada breve del título. El lector de pantalla recibe el encabezado completo y el modo de movimiento reducido no requiere animación para leerlo.
- **Circuit Board:** conexiones ilustrativas de Control Room; los contadores de envíos, incidencias e inventario sí proceden del dashboard. No representan sensores físicos.

## Galería por dispositivo

Las tres columnas muestran la aplicación en Chromium con datos demo. En Warehouse Twin, la vista de escritorio muestra la distribución guardada y las otras dos vistas muestran el recorrido de exploración.

| Pantalla | Escritorio | Tablet | Móvil |
| --- | --- | --- | --- |
| Acceso | [Abrir](screenshots/login.webp) | [Abrir](screenshots/tablet-login.webp) | [Abrir](screenshots/mobile-login.webp) |
| Dashboard | [Abrir](screenshots/dashboard.webp) | [Abrir](screenshots/tablet-dashboard.webp) | [Abrir](screenshots/mobile-dashboard.webp) |
| Pedidos | [Abrir](screenshots/orders.webp) | [Abrir](screenshots/tablet-orders.webp) | [Abrir](screenshots/mobile-orders.webp) |
| Nuevo pedido | [Abrir](screenshots/order-form.webp) | [Abrir](screenshots/tablet-order-form.webp) | [Abrir](screenshots/mobile-order-form.webp) |
| Detalle de pedido | [Abrir](screenshots/order-detail.webp) | [Abrir](screenshots/tablet-order-detail.webp) | [Abrir](screenshots/mobile-order-detail.webp) |
| Inventario | [Abrir](screenshots/inventory.webp) | [Abrir](screenshots/tablet-inventory.webp) | [Abrir](screenshots/mobile-inventory.webp) |
| Movimientos de inventario | [Abrir](screenshots/inventory-detail.webp) | [Abrir](screenshots/tablet-inventory-detail.webp) | [Abrir](screenshots/mobile-inventory-detail.webp) |
| Envíos | [Abrir](screenshots/shipments.webp) | [Abrir](screenshots/tablet-shipments.webp) | [Abrir](screenshots/mobile-shipments.webp) |
| Seguimiento simulado | [Abrir](screenshots/shipment-tracking.webp) | [Abrir](screenshots/tablet-shipment-tracking.webp) | [Abrir](screenshots/mobile-shipment-tracking.webp) |
| Incidencias | [Abrir](screenshots/incidents.webp) | [Abrir](screenshots/tablet-incidents.webp) | [Abrir](screenshots/mobile-incidents.webp) |
| Detalle de incidencia | [Abrir](screenshots/incidents-detail.webp) | [Abrir](screenshots/tablet-incidents-detail.webp) | [Abrir](screenshots/mobile-incidents-detail.webp) |
| Clientes | [Abrir](screenshots/customers.webp) | [Abrir](screenshots/tablet-customers.webp) | [Abrir](screenshots/mobile-customers.webp) |
| Ficha de cliente | [Abrir](screenshots/customers-detail.webp) | [Abrir](screenshots/tablet-customers-detail.webp) | [Abrir](screenshots/mobile-customers-detail.webp) |
| Flota | [Abrir](screenshots/fleet.webp) | [Abrir](screenshots/tablet-fleet.webp) | [Abrir](screenshots/mobile-fleet.webp) |
| Usuarios | [Abrir](screenshots/admin-users.webp) | [Abrir](screenshots/tablet-admin-users.webp) | [Abrir](screenshots/mobile-admin-users.webp) |
| Control Room | [Abrir](screenshots/control-room-overview.webp) | [Abrir](screenshots/tablet-control-room-overview.webp) | [Abrir](screenshots/mobile-control-room-overview.webp) |
| Fleet Twin | [Abrir](screenshots/fleet-twin.webp) | [Abrir](screenshots/tablet-fleet-twin.webp) | [Abrir](screenshots/mobile-fleet-twin.webp) |
| Warehouse Twin | [Abrir](screenshots/warehouse-twin-saved-layout.webp) | [Abrir](screenshots/tablet-warehouse-twin-saved-layout.webp) | [Abrir](screenshots/mobile-warehouse-twin-saved-layout.webp) |
| Warehouse Editor | [Abrir](screenshots/warehouse-editor-saved.webp) | [Abrir](screenshots/tablet-warehouse-editor-saved.webp) | [Abrir](screenshots/mobile-warehouse-editor-saved.webp) |
| World Map 3D | [Abrir](screenshots/world-map-overview.webp) | [Abrir](screenshots/tablet-world-map-overview.webp) | [Abrir](screenshots/mobile-world-map-overview.webp) |

## Evidencia de navegador

La galería incluye 20 vistas en tres tamaños y tres estados de navegación. Las imágenes proceden de la [captura completa del entorno demo](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/46140000919), con una [segunda captura del World Map en tablet](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/46140751915) que encuadra el mapa en vez de la cola de incidencias. En Warehouse Twin se verifica la selección de la estantería con el puntero después de restaurar la vista de escritorio.

La [galería del proyecto](../README.md#capturas) muestra la aplicación con los datos demo. El [workflow de captura](../.github/workflows/capture-demo.yml) arranca Angular, Spring Boot y PostgreSQL y abre Chromium con Playwright. Además de tomar imágenes, verifica la navegación por teclado, la preferencia de movimiento reducido, el contraste del botón **New order**, los desbordamientos y los flujos operativos y 3D.

Las capturas son fotogramas, no una medición de fluidez. Chromium con SwiftShader permite comprobar que una escena se dibuja; no mide el rendimiento de Safari ni de la GPU de un MacBook Air M2.
