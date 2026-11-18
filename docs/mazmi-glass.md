# MAZMI Glass: navegación y lectura operativa

El índice lateral utiliza la misma tipografía del ERP, sobre una superficie clara. Una marca de grafito y el peso del texto distinguen el destino activo sin depender del color.

## Navegación

| Grupo | Destinos |
| --- | --- |
| Overview | Dashboard |
| Operations | Orders, Shipments, Incidents |
| Resources | Inventory, Fleet, Customers |
| Digital spaces | Fleet Twin, Warehouse Twin, Warehouse Editor, Control Room |
| Administration | Users |

El editor requiere permisos de operación; solo un administrador ve **Administration**. World Map se abre desde el dashboard o desde el seguimiento, no es otra ruta del índice.

Los títulos de grupo son botones desplegables. Abrir un enlace directo o volver con el historial despliega el grupo del destino. El panel se puede ocultar para trabajar con más ancho. A 960 px o menos, **Menu** abre un diálogo nativo: el resto de la página queda fuera de la navegación con Tab y **Escape** devuelve el foco al botón. No hay acciones exclusivas de hover ni un segundo dock.

[Grupo abierto](screenshots/navigation-expanded.webp) · [Grupo cerrado](screenshots/navigation-folded.webp) · [Menú móvil](screenshots/mobile-navigation.webp).

## Materiales y movimiento

- **Liquid Glass:** transparencia en elementos flotantes. Con transparencia reducida se usan superficies opacas.
- **Silk Aurora:** luz decorativa en cabeceras, sin otro contexto WebGL. Su animación se suspende fuera de la vista.
- **Kinetic Text Reveal:** entrada breve del título. El lector de pantalla recibe el encabezado completo y el modo de movimiento reducido no requiere animación para leerlo.
- **Circuit Board:** conexiones ilustrativas de Control Room; los contadores de envíos, incidencias e inventario sí proceden del dashboard. No representan sensores físicos.

## Evidencia de navegador

La [galería del proyecto](../README.md#capturas) muestra la aplicación con los datos demo. El [workflow de captura](../.github/workflows/capture-demo.yml) arranca Angular, Spring Boot y PostgreSQL y abre Chromium con Playwright. Además de tomar imágenes, verifica la navegación por teclado, la preferencia de movimiento reducido, el contraste del botón **New order**, los desbordamientos y los flujos operativos y 3D.

Las capturas del índice se obtuvieron en Chromium local con Angular, Spring Boot y PostgreSQL 17. El [dashboard de la revisión anterior](https://github.com/LucaMZM/mazmi-logistics-control/blob/af624de/docs/screenshots/dashboard.webp) permite comparar la navegación sin conservar otra copia en la galería.

Las capturas son fotogramas, no una medición de fluidez. Chromium con SwiftShader permite comprobar que una escena se dibuja; no mide el rendimiento de Safari ni de la GPU de un MacBook Air M2.
