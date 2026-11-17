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

Quedan pendientes las fases siguientes: dirección artística de **Silk Aurora**, introducciones discretas con **Kinetic Text Reveal**, y una integración de **Circuit Board** en Control Room que no invente relaciones entre entidades.

## Comparación en Chromium

Mismo dashboard, perfil demo y viewport de 1440 × 1440: [antes](screenshots/navigation-before.png) · [después](screenshots/dashboard.png). [Dock móvil con foco de teclado, 390 × 844](screenshots/mobile-dock.png).

Recorrido de pedidos: [listado](screenshots/orders.png) · [detalle](screenshots/order-detail.png) · [formulario](screenshots/order-form.png).

[Ejecución de referencia](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/44186312513) · [Prueba gráfica de la Fase A](https://github.com/LucaMZM/mazmi-logistics-control/actions/runs/44186886023).
