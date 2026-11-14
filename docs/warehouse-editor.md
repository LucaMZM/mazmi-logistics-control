# MAZMI Warehouse Editor — diseño de distribución espacial

## Alcance y garantías

`/warehouse-editor` es una herramienta 3D para guardar y editar **distribuciones visuales** por cada almacén registrado en MAZMI. Utiliza Angular, Three.js y la base PostgreSQL existente. No crea aplicaciones, servicios ni proveedores externos.

**Lo que se guarda:** tipo, identificador, coordenadas X/Z de cuadrícula y giro de hasta 60 objetos ilustrativos (estanterías, muelles, recepción y picking), vinculados por clave foránea al UUID del almacén. La geometría no representa ubicaciones observadas.

**Lo que no se guarda ni se altera:** asignación de SKUs a estantes, existencias, pedidos, vehículos, conductores, simulaciones ni históricos de movimientos. Al abrir el Twin se carga la revisión del almacén seleccionado. Ambos visores comparten geometría, posición y orientación. Un plano vacío guardado no se sustituye por el predeterminado.

## API y migración

Migración aditiva: `V9__warehouse_visual_layouts.sql`.

| Verbo | URL | Función |
| --- | --- | --- |
| GET | `/api/v1/warehouses/{id}/visual-layout` | Leer plano y revisión; `saved=false` si aún no hay configuración |
| PUT | `/api/v1/warehouses/{id}/visual-layout` | Guardar plano validado mediante compare-and-swap |

El PUT requiere sesión con rol **ADMIN** u **OPERATOR**, CSRF como el resto del ERP y cuerpo:

```json
{
  "revision": 0,
  "items": [
    { "id": "rack-1", "kind": "RACK", "x": -7, "z": -3, "orientation": 0 },
    { "id": "dock-1", "kind": "DOCK", "x": 7, "z": 5, "orientation": 0 }
  ]
}
```

`revision` indica la versión que vio el editor. Cada PUT exitoso incrementa el número; si otro usuario ha guardado entretanto, devuelve **409 LAYOUT_STALE** sin sobrescribir sus cambios. Todas las escrituras ocurren en una transacción, incluida la sustitución de objetos. La lectura y escritura de un almacén inexistente devuelve 404.

El servidor valida límites de la cuadrícula (X ±10, Z ±6), id único, tipo válido, ángulos 0/90/180/270, un máximo de 60 objetos, separación geométrica y muelles situados junto al borde de expedición. Las columnas de PostgreSQL repiten restricciones críticas.

La distribución inicial aparece como **starter blueprint sin guardar**; no se persiste hasta pulsar Save layout.

## Interacciones

Se puede seleccionar un objeto desde el canvas 3D o con el selector HTML; una pulsación sobre una celda libre del suelo mueve el objeto seleccionado, ajustando a la cuadrícula. Los controles permiten desplazarlo celda a celda, girarlo, eliminarlo, añadir objetos, deshacer y restaurar. La cámara es orbital y permite Overview.

Se impide salir de la ruta sin confirmar cuando hay modificaciones no guardadas. Un conflicto 409 mantiene las modificaciones locales y exige recargar conscientemente para resolverlo.

La escena funciona con carga diferida de Three.js y fallback HTML: incluso sin WebGL, los objetos pueden seleccionarse y manipularse mediante controles y guardarse. Se libera el contexto y sus recursos al salir de la página.

## Seguridad, atribución y accesibilidad

No hay modelos comerciales externos. Las geometrías procedurales pertenecen al repositorio y reutilizan los materiales de Fleet Twin. El catálogo `TwinAssets` gestiona sus recursos.

La ruta usa `operatorGuard`; el endpoint de escritura vuelve a imponer autorización en el backend. El lector de almacenes y el plano se limitan a usuarios autenticados por la configuración de seguridad del ERP.

Los componentes conservan botones y selectores HTML, mensajes de error y de estado, y no dependen del color del canvas como única señal de interacción.

## Validación real

Los tests del modelo cubren las ubicaciones permitidas, colisiones, rotaciones y unicidad. Los tests de Angular verifican carga, edición, guardado con revisión, conflicto y fallback WebGL. Los tests Java incluyen validación y persistencia en PostgreSQL real mediante Testcontainers.

[CI de la integración](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/43598217265): **119 tests frontend y 65 backend**. El recorrido de navegador utiliza la aplicación con PostgreSQL temporal, no imágenes de diseño.

[Editor anterior](screenshots/warehouse-editor-before.png) · [Editor actual](screenshots/warehouse-editor-saved.png) · [Plano en Warehouse Twin](screenshots/warehouse-twin-saved-layout.png) · [Vista móvil](screenshots/warehouse-editor-mobile.png).

Pendiente una medición de rendimiento y revisión ergonómica sobre la GPU física del MacBook Air M2; las pruebas con SwiftShader no equivalen a una medición de FPS en ese equipo.

**Limitaciones:** sin almacenamiento físico por producto, sin plano topográfico real, sin medición de FPS sobre la GPU del Mac. El editor es una configuración espacial ilustrativa persistente.
