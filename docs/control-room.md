# MAZMI Control Room — Fase 4

La sala de control está integrada en la aplicación Angular autenticada, en la ruta `/control-room`, junto a Fleet Twin, Warehouse Twin y el mapa 2D/3D del dashboard. No introduce nuevos servicios ni tablas.

## Experiencia 3D

Escena isométrica original Three.js con piso, paredes abiertas, ventanas, tres pantallas operativas y estaciones de trabajo. Se carga al visitar Control Room, no al abrir otros módulos.

El usuario puede seleccionar **Operations wall**, **Fleet console** o **Warehouse console** mediante botones accesibles o seleccionando sus pantallas 3D, enfocar la cámara, rotarla y volver a la vista general. Cada estación enlaza a su funcionalidad existente. Los enlaces HTML funcionan incluso si WebGL no está disponible.

## Datos operativos

La escena utiliza el `DashboardStore` existente, que consulta `/api/v1/dashboard` y actualiza sus lecturas a través de los eventos de dashboard del sistema. Las pantallas 3D muestran las siguientes métricas del backend:

- Operations: envíos activos y retrasados.
- Fleet: envíos activos; **no se presenta como cantidad de vehículos**.
- Warehouse: posiciones críticas de inventario e incidencias abiertas.

Las estadísticas se muestran como «—» mientras no existan datos. No hay cuentas, sensores ni personas ficticias haciéndose pasar por telemetría. Los valores se dibujan sobre texturas Canvas reutilizadas, nunca concatenados como HTML.

La oficina y sus muebles son **ilustrativos**: no representan un edificio real, operadores existentes ni ubicaciones físicas verificadas. La selección y los movimientos de cámara no realizan peticiones de mutación al ERP.

## Rendimiento y accesibilidad

- Carga diferida de la escena, que utiliza el Three.js ya instalado.
- Cámara ortográfica, geometría procedural y materiales locales, sin assets externos ni servicios de pago.
- Pixel ratio limitado a 1.5, luces simples y sombras limitadas a 1024 px.
- Render bajo demanda salvo durante transiciones breves; suspensión en pestaña oculta.
- Limpieza de geometrías, texturas, materiales, controles, eventos y renderer al desmontar.
- Movimiento reducido: enfoque instantáneo.
- Alternativa HTML de métricas, estados y enlaces independiente de WebGL.

## Validación

Las pruebas de `control-room.model.spec.ts` comprueban el uso de datos reales y el tratamiento de métricas desconocidas. `control-room.page.spec.ts` verifica integración del store, selección, enlaces, destrucción y recuperación funcional sin WebGL.

La ejecución automática de CI incluye formato, lint, tipos, tests y build. Antes de considerar terminada una revisión gráfica, comprobar la escena en un navegador con WebGL real y documentar el rendimiento en el MacBook Air M2.

## Límites y siguientes pasos

Control Room es una interfaz 3D que unifica la navegación de los módulos existentes; **no** convierte sus escenas en un único espacio físico ni añade telemetría real. No incorpora usuarios avatar, videovigilancia, edificios reales o editor de instalaciones. Mantener los datos empresariales del backend como fuente de verdad.

Los assets procedurales originales siguen la licencia del repositorio. Three.js y OrbitControls conservan su licencia MIT.
