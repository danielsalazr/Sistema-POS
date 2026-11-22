# Constitución del proyecto

Principios que toda spec, design, plan e implementación de Dela POS debe respetar. Si una feature necesita romper uno, el design lo justifica en la sección **Decisiones** y el usuario lo aprueba explícitamente.

## 1. Los datos de producción son intocables

- La base de producción es un único archivo SQLite en el volumen de Railway. No hay réplica ni otra copia automática.
- Los cambios de esquema son **aditivos e idempotentes**: van en `backend/sql/schema.sql` (bases nuevas) **y** en un bloque de `backend/src/db.js` que comprueba antes de alterar (bases existentes). Nunca `DROP TABLE`, `DROP COLUMN` ni borrados masivos.
- Para cambiar una restricción se renombra la tabla, se crea la nueva y se copian los datos con `INSERT ... SELECT`, todo antes de borrar la vieja (ver ejemplos en `db.js`).
- Todo cambio de datos se prueba con **una copia real de producción** (`Empresa → Descargar backup`, `DATA_DIR` apuntando a una carpeta de pruebas) y arrancando el backend **dos veces**.
- Antes de desplegar se descarga un backup. Ver `deploy/GUIA-DESPLIEGUE.md`.

## 2. Touch primero y responsive

- La app se usa en computador, tablet y celular con el dedo. Toda pantalla nueva debe funcionar desde **360 px de ancho** sin scroll horizontal.
- Objetivos táctiles de **mínimo 48 × 48 px** y separación suficiente entre botones de acción.
- Nada depende del hover, del clic derecho ni de atajos de teclado. Pueden existir como extra, pero nunca como única vía.
- Una pantalla, una tarea: en móvil se prefieren los pasos guiados y los diálogos a pantalla completa en lugar de formularios largos.
- Se usan componentes de Vuetify 3 y los colores del tema `sublime` (`frontend/src/plugins/vuetify.js`).

## 3. Multiempresa

- Toda tabla de negocio nueva lleva `idCompania` y toda consulta sobre ella filtra por `companiaId(req)`.
- Las configuraciones por empresa van en `comun` con clave `CLAVE_<idCompania>` (`getCompanySetting` / `setCompanySetting`).

## 4. Fechas en hora local de Bogotá

- Se guardan como texto `YYYY-MM-DD HH:MM:SS` en `America/Bogota`, nunca en UTC ni ISO.
- Backend: `localDateTimeSql`, `nowSql` y `normalizeDateTimeInput` (`backend/src/utils.js`). Frontend: `frontend/src/dates.js`.
- Los movimientos distinguen `fecha` (cuándo ocurrió) de `fechaRegistro` (cuándo se registró).

## 5. Dinero, inventario y caja son consistentes

- Los montos están en pesos colombianos (COP).
- Las escrituras que tocan varias tablas van dentro de `db.transaction(...)`.
- Toda feature que cree, cambie o anule movimientos de dinero o inventario debe revisar su efecto en `/api/caja/resumen`, en `/api/caja/movimientos` y en los reportes, y documentarlo en el design.
- Los detalles de venta y compra guardan una **copia** de la descripción y los precios del producto en ese momento. Cambiar un producto no altera ventas pasadas.

## 6. Seguridad

- Toda ruta nueva queda detrás del middleware de autenticación de `/api`. Solo `/api/salud` y `/api/login` son públicas.
- HTTP 401 significa exclusivamente "sesión inválida", porque el frontend cierra la sesión al recibirlo. Las contraseñas secundarias incorrectas y los permisos negados usan 403.
- Nunca se guardan contraseñas en texto plano (`hashPassword` / `verifyPassword` de `backend/src/auth.js`).

## 7. Simplicidad

- Se mantiene el stack actual: Express, better-sqlite3, Vue 3 y Vuetify 3, en JavaScript sin TypeScript. Una dependencia nueva se justifica en el design.
- Se sigue el patrón existente (rutas en `server.js`, una vista por módulo en `frontend/src/views/`, llamadas vía `api.js`) salvo que el design apruebe extraer módulos.
- Se construye lo que pide la spec, no lo que "podría servir después".

## 8. Idioma

- La interfaz, los nombres del dominio (tablas, columnas, rutas, variables de negocio), los documentos SDD y los mensajes de commit van en español.
