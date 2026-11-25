---
feature: 002-lineas-de-producto
fase: plan
estado: aprobado        # borrador | en-revision | aprobado
design: ./design.md     # debe estar aprobado
rama: feat/002-lineas-de-producto
creado: 2026-11-24
aprobado: 2026-11-24
---

# Plan: Líneas de producto y ventas por línea

> Parte el `design.md` aprobado en tareas pequeñas y ordenadas. Cada tarea deja la app funcionando y se puede verificar sola. Aquí no se toman decisiones de diseño nuevas; si aparece una, se vuelve a `design.md`.

## 1. Preparación

- [ ] Rama `feat/002-lineas-de-producto` creada desde `main` actualizado.
- [ ] Copia de la base de producción en una carpeta de pruebas, por ejemplo `C:\pos-pruebas-002\sublime-pos.sqlite`. Puede ser un backup reciente (`Empresa → Descargar backup`) o, en su defecto, una copia de `backend/data/sublime-pos.sqlite`. **Nunca** se trabaja sobre `backend/data` directamente.
- [ ] Antes de empezar, se anotan los valores de referencia sobre esa copia: `SUM(monto)` de ventas por mes, el resumen de `Caja` de noviembre de 2026 y el conteo de `productos_vendidos`.
- [ ] Backend local contra esa copia: `$env:DATA_DIR="C:\pos-pruebas-002"; npm run dev:backend`, y en otra terminal `npm run dev:frontend`.

## 2. Tareas

### T-01: Esquema y migración

- **Cubre**: RF-01, RF-08 (estructura); RNF-04
- **Depende de**: —
- **Archivos**: `backend/sql/schema.sql`, `backend/src/db.js`
- **Pasos**:
  1. `schema.sql`: tabla `lineas_producto` con su índice único (design §3.2), y `idLineaProducto` en las definiciones de `productos` y `productos_vendidos`.
  2. `db.js`: bloque idempotente que agrega `idLineaProducto` a `productos` y a `productos_vendidos` si falta, y después crea `ix_productos_linea` e `ix_productos_vendidos_linea`.
- **Verificación**:
  - El backend arranca **dos veces** contra la copia sin errores.
  - `PRAGMA table_info` muestra las columnas nuevas, y `integrity_check` y `foreign_key_check` salen bien.
  - El conteo de `productos_vendidos` y la `SUM(monto)` de ventas son iguales a los de referencia.
  - Una base vacía (`DATA_DIR` en una carpeta nueva) también arranca.

### T-02: Generador de catálogos y CRUD de líneas

- **Cubre**: RF-01, CA-01, CA-02 (backend)
- **Depende de**: T-01
- **Archivos**: `backend/src/server.js`
- **Pasos**:
  1. Función `registrarCatalogo({ ruta, tabla, id, campoActivo, usos })` (design 003 D-07, adelantada aquí para no duplicar): GET con `incluirInactivas` y conteos de uso, POST, PUT y DELETE con 409 si está en uso, 409 por nombre duplicado (se captura el error `UNIQUE` de SQLite), 400 si el nombre está vacío, y filtro por `companiaId(req)` en todo.
  2. Registrar `/api/lineas-producto`, con usos `productos` y `productos_vendidos`.
- **Verificación** (con `curl` y token):
  - crear "Fresas y crepes" → 201;
  - crear "fresas y CREPES" → 409;
  - listar → aparece con 0 productos;
  - renombrar → 200;
  - desactivar → no aparece sin `incluirInactivas` y sí aparece con él;
  - eliminar una sin uso → 204;
  - con `x-compania-id` de otra compañía no se ve.

### T-03: Asignación de línea a productos

- **Cubre**: RF-02, RF-03, RF-04, RF-09; CA-03, CA-09 (backend)
- **Depende de**: T-02
- **Archivos**: `backend/src/server.js`
- **Pasos**:
  1. Función `asignarLineaAProductos(idCompania, idLinea, idProductos)` en transacción (design §4 y D-02).
  2. `POST /api/lineas-producto/asignar`.
  3. `POST` y `PUT /api/productos`: aceptan `idLineaProducto`, validan la compañía y que la línea esté activa (salvo que no cambie), y usan la función anterior.
  4. `GET /api/productos`: `LEFT JOIN` para devolver `lineaProducto`.
- **Verificación**:
  - asignar 3 productos → `actualizados: 3` y `ventasClasificadas` igual al número de renglones de esos productos;
  - reasignar uno de ellos a otra línea → `ventasClasificadas: 0`, y sus renglones vendidos conservan la primera línea;
  - asignar a una línea inactiva → 400;
  - `GET /api/productos` muestra el nombre de la línea;
  - con una línea en uso, `DELETE` → 409 con conteos.

### T-04: Snapshot de la línea al vender y editar ventas

- **Cubre**: RF-08, RNF-03; CA-04, CA-08
- **Depende de**: T-03
- **Archivos**: `backend/src/server.js` (`POST` y `PUT /api/ventas/contado`)
- **Pasos**:
  1. `POST`: insertar `idLineaProducto` del producto leído en cada renglón.
  2. `PUT`: antes del `DELETE` de renglones, construir el mapa `idProducto → idLineaProducto`; al reinsertar, usar el del mapa o, si el producto es nuevo en la venta, el actual (design D-03).
- **Verificación**:
  - una venta nueva de un producto con línea A guarda A;
  - un producto sin línea guarda NULL y la venta funciona;
  - mover el producto a B, editar esa venta (cambiar la cantidad) → el renglón sigue en A;
  - agregar a la venta un producto de B → ese renglón queda en B;
  - totales y `existencia` iguales a como funcionaban antes.

### T-05: Reporte de ventas por línea (backend)

- **Cubre**: RF-05, RF-06, RF-10; RNF-02; CA-05, CA-06, CA-07
- **Depende de**: T-04
- **Archivos**: `backend/src/server.js`
- **Pasos**: `GET /api/reportes/ventas-por-linea?desde&hasta&idUsuario` según design §4: agrupa por snapshot, incluye "Sin línea", el detalle por producto, los porcentajes y los totales.
- **Verificación**:
  - para cada mes de mayo a noviembre de 2026 en la copia, `totalVendido` es igual a `SUM(monto)` de `ventas_contado` en el mismo rango;
  - la suma de `valor` de las líneas es igual a `totalVendido`;
  - una venta mixta reparte sus valores entre dos líneas;
  - filtrar por usuario funciona.

### T-06: Componente `CatalogoCrud` y vista Clasificación (pestaña Líneas)

- **Cubre**: RF-01; RNF-01; CA-01, CA-02, CA-10
- **Depende de**: T-02
- **Archivos**: `frontend/src/components/CatalogoCrud.vue` (nuevo), `frontend/src/views/ClasificacionView.vue` (nuevo), `frontend/src/router.js`, `frontend/src/App.vue`
- **Pasos**:
  1. `CatalogoCrud`: props `endpoint`, `titulo`, `campoActivo` y una ranura para columnas extra; tarjetas en `xs` y tabla en `md+`; menú ⋮ con Renombrar, Desactivar o Activar y Eliminar; el 409 de eliminación ofrece "Desactivar"; estados de carga, vacío y error.
  2. `ClasificacionView` con `v-tabs` (solo *Líneas de producto*) y la tarjeta "Sin línea" con su conteo.
  3. Ruta `/clasificacion` y menú **Clasificación** después de Productos.
- **Verificación**: en el navegador con 360 px (DevTools), 768 px y 1280 px: crear, renombrar, desactivar, reactivar, intentar eliminar una línea en uso (aparece la opción de desactivar) y eliminar una sin uso. Sin scroll horizontal y con objetivos táctiles de 48 px o más.

### T-07: Asignación masiva (frontend)

- **Cubre**: RF-03, RF-04, RF-09; CA-03, CA-09
- **Depende de**: T-03, T-06
- **Archivos**: `frontend/src/components/AsignarLineaDialog.vue` (nuevo), `ClasificacionView.vue`
- **Pasos**: diálogo a pantalla completa en `xs` con línea destino, búsqueda, el filtro "Solo sin línea", lista con checkbox y el botón fijo "Asignar N productos". Antes de confirmar avisa que se clasificarán las ventas históricas sin línea; después muestra el resultado (`ventasClasificadas`).
- **Verificación**: asignar los 31 productos de la copia a sus líneas en pocos pasos; la tarjeta "Sin línea" queda en 0; probado en 360 px.

### T-08: Línea en Productos

- **Cubre**: RF-02; CA-04
- **Depende de**: T-03
- **Archivos**: `frontend/src/views/ProductosView.vue`
- **Pasos**: selector **Línea** (solo activas, más la actual aunque esté inactiva, más la opción "Sin línea") en el formulario; columna **Línea** en la tabla; chips de filtro por línea.
- **Verificación**: crear un producto con línea, editar otro y cambiarle la línea, filtrar por línea; probado en 360 px.

### T-09: Reportes: "Ventas por línea" y atajo de filtro

- **Cubre**: RF-05, RF-06, RF-07; CA-05, CA-06, CA-07, CA-10
- **Depende de**: T-05
- **Archivos**: `frontend/src/views/ReportesView.vue`
- **Pasos**:
  1. Selector del tipo de reporte (`Ventas` / `Ventas por línea`), conservando los filtros de fecha y usuario.
  2. Vista por línea: tarjetas con barra de proporción, valor, unidades y número de ventas; al tocar una línea se despliegan sus productos.
  3. En `Ventas`, el atajo "Productos de la línea…" que preselecciona los productos actuales de esa línea en el filtro existente, con la aclaración de D-06.
- **Verificación**: el reporte de noviembre cuadra con el total del reporte `Ventas` del mismo rango; el detalle por producto se ve; el atajo llena el filtro; probado en 360 px y 1280 px.

### T-10: Documentación

- **Cubre**: —
- **Depende de**: T-01 a T-09
- **Archivos**: `sdd/data-model.md` (tabla `lineas_producto`, las columnas nuevas, el diagrama, la brecha resuelta y el historial), `CLAUDE.md` (snapshot de línea en ventas, `registrarCatalogo`, vista Clasificación), `sdd/features/README.md` (`npm run sdd:estado`)
- **Verificación**: los documentos reflejan lo construido.

## 3. Verificación final

| Criterio | Cómo se verifica | Dispositivo / ancho |
|---|---|---|
| CA-01 | Crear las dos líneas desde Clasificación | celular 360 px |
| CA-02 | Eliminar una línea con productos → ofrece desactivar | tablet 768 px |
| CA-03 | Asignar varios productos en una acción | celular 360 px |
| CA-04 | Vender un producto sin línea → aparece en "Sin línea" | escritorio |
| CA-05 | Reporte de noviembre: la suma es igual al total del reporte Ventas | escritorio |
| CA-06 | Tocar una línea → ver sus productos | celular 360 px |
| CA-07 | Venta mixta (burrito + fresas) → cada valor en su línea | escritorio |
| CA-08 | Mover un producto de línea → octubre no cambia | escritorio |
| CA-09 | Reporte desde mayo de 2026 con todo clasificado | escritorio |
| CA-10 | Pantallas nuevas en 360 px sin scroll horizontal | celular 360 px |

Además:

- [ ] Con la base de prueba, el backend arranca dos veces sin errores.
- [ ] Los totales de `Caja` y del reporte de `Ventas` de octubre y noviembre de 2026 son iguales a los valores de referencia.
- [ ] Sin errores en la consola del navegador.

## 4. Despliegue

Según `deploy/GUIA-DESPLIEGUE.md`:

1. PR de `feat/002-lineas-de-producto` y merge a `main`.
2. Backup de producción (`Empresa → Descargar backup`).
3. `railway up` desde `main` limpio.
4. Verificación posterior: `/api/salud`, login, el total del reporte de Ventas del mes igual al del backup, y la pestaña Clasificación visible con "Sin línea" = 31 productos.

**Plan de reversa**: la migración solo agrega columnas, así que basta con un redeploy del despliegue anterior (el código viejo ignora las columnas nuevas). Solo si hubiera daño en los datos, se restaura el backup con `subir-bd.js`.

## Historial

| Fecha | Cambio |
|---|---|
| 2026-11-24 | Borrador inicial |
| 2026-11-24 | Plan aprobado por el usuario |
