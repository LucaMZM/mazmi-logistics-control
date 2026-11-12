# Seguridad y límites operativos

Aplicación de demostración con datos ficticios y tracking simulado. No constituye una certificación de seguridad ni una plataforma lista para producción.

## Controles existentes

- JWT en cookie HttpOnly, SameSite=Lax; Secure configurable para HTTPS.
- CSRF en mutaciones HTTP, incluidos login y logout; CORS limitado al origen configurado.
- Roles comprobados por Spring Security y no solo por guards Angular.
- Handshake WebSocket autenticado. Suscripciones limitadas a `/topic/dashboard` y `/topic/shipments/{uuid}`. Publicaciones STOMP del cliente rechazadas.
- Precios y actores determinados por el servidor; acciones de negocio explícitas.
- Transacciones, bloqueo optimista y restricciones PostgreSQL sobre reservas, saldos y asignaciones activas.
- Publicación posterior al commit y aislamiento de fallos por envío y por topic.
- Escaneo del historial Git mediante Gitleaks en CI. `.env` y artefactos de compilación excluidos del repositorio.

## Dependencias revisadas el 11 de noviembre de 2026

Se actualizaron Angular CLI/build a 22.2.6 y Vitest a 4.1.12 para corregir avisos de sus herramientas de desarrollo. Angular y Material permanecen en 22.2.3.

`npm audit --omit=dev` no detectó vulnerabilidades. El análisis completo sigue notificando siete entradas moderadas asociadas a minimatch y su cadena de dependencias de TypeScript ESLint. La última versión estable consultada de `@typescript-eslint/typescript-estree` (8.72.2) requiere minimatch 10; la corrección indicada por el aviso está en minimatch 11. No se fuerza una versión mayor fuera del contrato de la dependencia. Estos avisos afectan al tooling, no al bundle servido por Nginx.

Referencias: [Vitest](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [Vite](https://github.com/advisories/GHSA-rq7h-c2jc-7f22), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

La consulta OSV de las 119 coordenadas Maven del classpath runtime no devolvió vulnerabilidades conocidas en esa fecha. Es una comprobación de dependencias, no una garantía de ausencia de problemas en la aplicación.

## Límites que requieren una fase específica

- Logout elimina la cookie del navegador, pero no revoca una copia del JWT antes de su caducidad.
- La identidad WebSocket se establece en el handshake. Una sesión ya abierta no revalida periódicamente la caducidad del JWT o un cambio de rol; la aplicación cierra su conexión al salir.
- No hay aislamiento multiempresa ni permisos por envío. Los usuarios autenticados comparten el entorno logístico.
- El broker es local al proceso y no persistente; tras reconectar, el frontend recupera snapshots HTTP. No se garantiza entrega de cada evento.
- Antes de exponer datos reales se necesitan HTTPS, política de secretos, protección frente a abuso del login, observabilidad y revisión del ciclo de sesiones.

Las cuentas demo y su contraseña pública solo deben utilizarse en entornos de demostración aislados.
