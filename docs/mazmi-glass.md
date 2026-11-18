# MAZMI Glass: navegación operativa

El dock mantiene visibles los nombres de las rutas. **Operations** agrupa la cola de trabajo, **Resources** reúne clientes y flota, y **Digital spaces** abre los entornos de exploración. El mapa mundial sigue en el dashboard y en el seguimiento de envíos: no es un destino independiente. La administración y el Editor conservan sus condiciones de acceso.

En escritorio, pasar el puntero amplía el icono bajo el cursor y, en menor medida, los adyacentes del mismo grupo. El área pulsable y el texto no se desplazan. El marcador de página, la superficie salvia y `aria-current` identifican la ruta activa sin depender del movimiento.

La adaptación del [Magnetic Dock de Componentry](https://componentry.dev/) es propia: selectores CSS de proximidad entre enlaces y una curva con un pequeño sobrepaso, sin integrar componentes React, un motor físico ni un bucle de animación. El efecto se desactiva con puntero táctil o movimiento reducido. Las superficies de navegación tienen un fondo sólido si no se admite transparencia.

**Repaso en macOS:** recorrer Orders y su detalle con Tab, volver al dashboard y comprobar el marcador activo; reducir la ventana hasta el menú móvil, abrir con Enter y cerrar con Escape. Repetir con Reducir movimiento y Reducir transparencia. Las tablas deben permanecer opacas y los iconos no deben alterar el ancho de las filas.

## Fase B — Superficies y jerarquía de datos

El dashboard mantiene **los mismos cuatro KPIs** y las mismas rutas, pero los muestra como tarjetas independientes y legibles, con un diseño de grafito, azul petróleo y verde salvia. Los valores son texto HTML normal: no hay animación numérica ni acceso adicional al backend. El estado que necesita atención conserva su contraste ámbar y una segunda señal visual.

Las secciones **Needs attention**, **Network activity**, el gráfico semanal y **Critical inventory** comparten superficies blancas opacas, cabeceras suaves y radios consistentes. El mapa no recibe transformaciones ni nuevos efectos WebGL. Los enlaces reales conservan foco visible y solo muestran desplazamiento de 3 píxeles bajo puntero fino.

El registro de pedidos, los formularios de creación, los controles de búsqueda y las tablas del ERP reutilizan un lenguaje visual común mediante frontend/src/styles.scss. Se mantiene la densidad de datos, las validaciones, los permisos y el flujo de reserva de stock. El material translúcido sigue limitado a la navegación; **no hay blur ni animaciones continuas detrás de formularios o tablas**.

### Prueba de diseño

capture-demo.cjs verifica en Chromium que las cuatro tarjetas KPI, el registro de pedidos y los formularios utilicen los nuevos estilos calculados en navegador. Mantiene las comprobaciones existentes de datos, vistas, responsive y permisos. No equivale a una prueba física en Safari o en la GPU M2.

Esta primera entrega se amplió posteriormente con **Silk Aurora**, **Kinetic Text Reveal** y **Circuit Board**, descritos en la sección siguiente.

## Fases C–E — Identidad, movimiento y Control Room

**Silk Aurora** se implementa como componente angular `SilkAuroraComponent`, con un gradiente sedoso de gris perla, azul petróleo y verde salvia. No importa React, no crea WebGL ni solicita recursos externos. Se usa en las cabeceras de las secciones principales y en Control Room; el efecto decorativo está marcado `aria-hidden`, se detiene fuera de viewport mediante `IntersectionObserver` y no se anima cuando está activado el movimiento reducido.

**Kinetic Text Reveal** aparece en los encabezados `PageHeaderComponent` mediante palabras visibles que entran una vez al montar la página. El elemento sigue siendo un `h1` con nombre accesible completo mediante `aria-label`. No interfiere con títulos de pedidos dinámicos, cifras que cambian o tablas. En Control Room, el encabezado conserva su `h1` y una transición equivalente. Todo el efecto se desactiva con `prefers-reduced-motion`.

**Circuit Board**, implementado como `OperationalCircuitComponent`, añade al panel lateral de Control Room una agrupación visual de Operations, Fleet y Warehouse. Las cifras **open incidents**, **active shipments** y **critical positions** proceden exclusivamente del mismo snapshot del dashboard; el SVG no es una topología física ni representa comunicaciones reales. La etiqueta visible deja clara esa distinción. No se altera el visor Three.js ni las escrituras de negocio.

Los módulos Inventory, Shipments, Fleet, Customers, Incidents, formularios, fichas y vistas 3D comparten tratamiento visual de paneles, filtros, tablas, etiquetas y foco. Las superficies con datos siguen siendo opacas. Se mantienen todas las rutas y reglas del ERP. El CI usa pruebas unitarias para comprobar la desconexión del observer, la semántica de títulos y la procedencia de métricas; el navegador comprueba los materiales, el modo de movimiento reducido y los contadores ilustrativos.

**Limitaciones:** esta implementación adapta el vocabulario visual de Componentry sin copiar su código React. La aurora es una interpretación CSS ligera, no un shader original de su librería; el circuito no ofrece relaciones físicas ni sensores; las cifras WebGL no son FPS de GPU. El aspecto final en Safari, la fluidez en el MacBook Air M2 y las preferencias de transparencia deben contrastarse localmente antes de dar el producto por finalizado.

## Fase F — Contraste, estados y revisión visual

La inspección manual de capturas detectó un defecto que el CI no identificaba: una regla compartida de `span` reducía los títulos cinéticos del `h1`. Se corrigió aumentando la especificidad del selector tipográfico y el smoke de Chromium verifica ahora el tamaño real de las palabras y el estado `display: inline-block`.

La revisión de capturas también detectó que **New order**, la acción primaria del dashboard, tenía un contraste insuficiente en el material de botón. El tema MAZMI Glass fija el texto blanco y un fondo verde petróleo oscuro, y el smoke mide el contraste calculado entre texto y fondo (mínimo **4.5:1**) en el navegador real. Se comprueban también estados vacíos y de error sin añadir rutas ni acciones empresariales.

Se mantiene el encuadre de captura de Control Room al inicio de página para evitar capturas desplazadas después de comprobar métricas bajo el viewport. Las pruebas de Chrome/SwiftShader validan estructura y funcionalidad, pero no la fluidez física de Safari en un MacBook Air M2.

## Galería en Chromium

[Dashboard y cabecera Silk Aurora](screenshots/dashboard.webp) · [Dock móvil con foco visible](screenshots/mobile-dock.webp) · [Circuit Board en Control Room](screenshots/control-room-overview.webp). Las imágenes son fotogramas estáticos: no reproducen la animación de proximidad del dock.

[Galería completa](../README.md#capturas). Las imágenes publicadas conservan los píxeles de Chromium en WebP sin pérdida. Proceden de la [captura integral de MAZMI Glass](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/44205542839) y de la [captura del registro de flota](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/44207308025), sin cambios de aplicación entre ambas.

## Entrega UI/UX — auditoría de cierre

La solicitud original está implementada con adaptaciones nativas de Angular/CSS, sin dependencia de componentes React de Componentry:

| Efecto solicitado | Implementación | Alcance |
| --- | --- | --- |
| Apple-style Liquid Glass | `backdrop-filter` con respaldo opaco | Sidebar, barra superior y algunos controles flotantes |
| Magnetic Dock | Escalado CSS de icono activo y vecinos al pasar el ratón | Navegación principal en escritorio |
| Hover transitions | Transiciones cortas y foco visible | Navegación, tarjetas, botones y superficies operativas |
| Silk Aurora | `SilkAuroraComponent`, gradientes CSS con observador de visibilidad | Cabeceras principales y Control Room |
| Circuit Board | `OperationalCircuitComponent`, SVG ilustrativo con datos del dashboard | Panel de Control Room |
| Kinetic Text Reveal | `PageHeaderComponent` y título de Control Room | Cabeceras, no datos dinámicos ni fichas |

El refinamiento final restringe la regla tipográfica global del encabezado al selector `.subtitle`, evitando contaminar las etiquetas y palabras animadas. El smoke de Chromium mide el contraste de `.mdc-button__label` en la acción **New order** y exige al menos 4.5:1. Las escenas y operaciones de negocio no han sido modificadas por este ajuste.

En la captura automática de `main` se incluyen ahora los recorridos de **Warehouse Twin** y **World Map** además del dashboard, las fichas, Control Room y Warehouse Editor. Los resultados de cada ejecución deben consultarse en GitHub Actions; una ejecución todavía pendiente no equivale a una aprobación.

### Comprobaciones que requieren equipo real

- Safari en macOS: transparencia reducida, movimiento reducido, foco, apertura/cierre del menú y legibilidad a diferentes anchos.
- MacBook Air M2: fluidez percibida de hover, aurora y escenas 3D, memoria/temperatura y calidad visual en pantalla Retina.
- Rendimiento: el build de referencia avisó de un inicial de 603.86 kB respecto al umbral de aviso de 500 kB, además de presupuestos SCSS; es deuda de optimización, no un error de compilación. No aumentar presupuestos para ocultar avisos.

**Criterio de cierre:** funcionalidad UI/UX implementada y cobertura automatizada ampliada. El cierre de calidad final exige CI/capturas verdes en el último SHA y la revisión local de Safari; esta guía no afirma que las pruebas de hardware ya se hayan realizado.
