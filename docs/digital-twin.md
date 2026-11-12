# Fleet Twin — primera entrega

Ruta autenticada: `/digital-twin`. Lectura de `/api/v1/vehicles` con los permisos existentes. No hay nuevas tablas, mutaciones ni reglas de negocio.

## Uso

Seleccionar un vehículo y pulsar **Open vehicle in 3D**. Las furgonetas tienen una representación genérica original, con su matrícula real dibujada en una textura Canvas. Otros tipos conservan una ficha HTML sin asignarles una silueta incorrecta. Inspect, Rotate y Overview permiten explorar sin arrastrar el ratón. La maniobra es una demostración visual que puede pausarse, no telemetría ni una acción de expedición.

## Capturas

![Patio Fleet Twin con un vehículo vinculado al registro real](screenshots/fleet-twin.png)

[Vista móvil completa](screenshots/fleet-twin-mobile.png)

## Arquitectura

- `FleetTwinStore`: consulta HTTP cancelable, selección y recuperación de errores; alcance local.
- `vehicle-twin.ts`: adaptación explícita del contrato Vehicle. Sin inferir fabricante, variante o color a partir de texto libre.
- `FleetScene`: renderer, cámara ortográfica, OrbitControls, raycasting, reloj único y trayectoria. Render bajo demanda; RAF solo durante movimiento o enfoque. Suspensión en pestaña oculta.
- `TwinAssets`: catálogo por escena, geometrías y materiales compartidos, texturas de matrícula limitadas y liberación idempotente.
- `DigitalTwinPage`: interfaz accesible, carga dinámica del motor, protección frente a cargas obsoletas, fallback y reconstrucción tras pérdida de contexto.

Three.js se importa al abrir el visor, no en las rutas existentes. Resolución limitada a DPR 1.5 y sombras de 1024 px. Sin postprocesado ni assets remotos. No se aplica LOD a esta escena pequeña.

## Assets y licencias

La furgoneta, nave, muelles, señalización y cajas son geometrías procedurales originales del repositorio, sujetas a su LICENSE. No representan modelos comerciales verificados. Three.js y sus addons: MIT; @types/three: MIT. No se redistribuyen modelos externos ni se requiere ninguna descarga de assets.

## Límites explícitos

El patio no reproduce instalaciones reales. Las cajas no equivalen a unidades de inventario. El color neutro no procede del registro: el contrato no contiene color. No hay configuración persistente de pintura, fabricante o asset. No se pretende que un modelo genérico sea una Transit o Sprinter exacta. La ficha se actualiza al solicitar Refresh, no mediante telemetría en vivo. No se enlaza un envío concreto sin consultar su asignación real.

WebGL2 es necesario para el visor; la ficha y el enlace Fleet funcionan sin él. La preferencia de movimiento reducido desactiva la maniobra. La validación gráfica automatizada usa Chromium/SwiftShader en Ubuntu, no certifica rendimiento de GPU ni gestos en dispositivos físicos.

## Validación reproducible

Los comandos frontend del README incluyen las pruebas del adaptador, selección, cancelación, errores y recursos compartidos. El workflow manual `Capture demo screenshots` arranca PostgreSQL, backend y frontend reales y ejecuta `capture-twin.cjs`: ficha vinculada, escritorio, móvil, controles, movimiento reducido y pérdida/recuperación de contexto. Produce `fleet-twin.png` y `fleet-twin-mobile.png` como artifacts.

## Próximas fases

1. World Map: evaluar MapLibre con capa Three.js y georreferenciación; conservar Leaflet como alternativa. Rutas de carretera solo con geometría verificable, separadas del tracking simulado.
2. Warehouse Twin: introducir ubicaciones y muelles persistentes únicamente tras definir su correspondencia con inventario; migraciones aditivas, no coordenadas ficticias.
3. Control Room: escenas compartiendo catálogo y adaptadores, con paneles reales.
4. Editor: esquema espacial versionado, permisos, presupuesto de assets y optimización medida.

Los futuros campos de vehículo (fabricante, variante, año, color, asset y grado de fidelidad) deben ser opcionales y validados; un catálogo autorizado limitará las partes pintables. Esta entrega no necesita ampliar el DTO.
