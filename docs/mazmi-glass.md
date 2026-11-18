# MAZMI Glass: navegación y lectura operativa

El dock de grafito se separa del lienzo gris perla (`#F3F3F5`). El fondo de las tablas y los formularios permanece opaco: las excepciones de stock, las incidencias y la salud de entrega conservan sus colores de estado.

## Navegación

En escritorio, el dock muestra accesos por icono con nombre accesible. La cápsula marca la sección activa también al abrir un detalle. **Digital spaces** reúne los entornos tridimensionales; **More sections** abre las rutas secundarias. Los menús se abren por activación, no al pasar el puntero. En pantallas estrechas, la barra pasa al pie y, cuando no caben todos los accesos, Inventory y Fleet aparecen en el menú secundario. Los permisos del Editor y de administración siguen aplicándose.

El magnetismo se calcula desde el cursor hasta el centro de cada botón. Se transforma el icono, no la zona pulsable. Las medidas se leen juntas y se aplican como máximo una vez por fotograma, sin un bucle permanente. Con puntero táctil o movimiento reducido no se activa. Al abrir un panel con el teclado, el foco pasa al botón de cierre; Tab permanece dentro y Escape devuelve el foco al acceso del dock.

## Materiales y movimiento

- **Liquid Glass:** transparencia en elementos flotantes. Con transparencia reducida se usan superficies opacas.
- **Silk Aurora:** luz decorativa en cabeceras, sin otro contexto WebGL. Su animación se suspende fuera de la vista.
- **Kinetic Text Reveal:** entrada breve del título. El lector de pantalla recibe el encabezado completo y el modo de movimiento reducido no requiere animación para leerlo.
- **Circuit Board:** conexiones ilustrativas de Control Room; los contadores de envíos, incidencias e inventario sí proceden del dashboard. No representan sensores físicos.

## Evidencia de navegador

La [galería del proyecto](../README.md#capturas) muestra la aplicación con los datos demo. El [workflow de captura](../.github/workflows/capture-demo.yml) arranca Angular, Spring Boot y PostgreSQL y abre Chromium con Playwright. Además de tomar imágenes, verifica la navegación por teclado, la preferencia de movimiento reducido, el contraste del botón **New order**, los desbordamientos y los flujos operativos y 3D.

Para comparar el cambio sin duplicar imágenes antiguas en el repositorio: [captura anterior al ajuste del dock](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/44293648546) y [captura de la interfaz revisada](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/44299941981). La portada del dashboard se capturó en Chromium local con el mismo frontend, Spring Boot y PostgreSQL 17: incluye los 1513 px de la página completa. El resto de la galería procede del runner. Los artefactos de Actions son temporales; la galería del README queda versionada con el proyecto.

Las capturas son fotogramas, no una medición de fluidez. Chromium con SwiftShader permite comprobar que una escena se dibuja; no mide el rendimiento de Safari ni de la GPU de un MacBook Air M2.
