# MAZMI Glass: navegación y lectura operativa

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

## Materiales y movimiento

- **Liquid Glass:** transparencia en elementos flotantes. Con transparencia reducida se usan superficies opacas.
- **Cabeceras operativas:** título, descripción y acciones sobre el lienzo, separados de los datos por una línea. Control Room conserva su luz ambiental Silk Aurora.
- **Kinetic Text Reveal:** entrada breve del título. El lector de pantalla recibe el encabezado completo y el modo de movimiento reducido no requiere animación para leerlo.
- **Circuit Board:** conexiones ilustrativas de Control Room; los contadores de envíos, incidencias e inventario sí proceden del dashboard. No representan sensores físicos.

## Evidencia de navegador

La [galería del proyecto](../README.md#capturas) muestra la aplicación con los datos demo. El [workflow de captura](../.github/workflows/capture-demo.yml) arranca Angular, Spring Boot y PostgreSQL y abre Chromium con Playwright. Además de tomar imágenes, verifica la navegación por teclado, la preferencia de movimiento reducido, el contraste del botón **New order**, los desbordamientos y los flujos operativos y 3D.

Las capturas de la barra superior se obtuvieron en Chromium local con Angular, Spring Boot y PostgreSQL 17. El [dashboard de la revisión anterior](https://github.com/LucaMZM/mazmi-logistics-control/blob/937fb30/docs/screenshots/dashboard.webp) permite comparar la navegación sin conservar otra copia en la galería.

Las capturas son fotogramas, no una medición de fluidez. Chromium con SwiftShader permite comprobar que una escena se dibuja; no mide el rendimiento de Safari ni de la GPU de un MacBook Air M2.
