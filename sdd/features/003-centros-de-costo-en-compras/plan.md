---
feature: 003-centros-de-costo-en-compras
fase: plan
estado: aprobado        # borrador | en-revision | aprobado
design: ./design.md     # debe estar aprobado
rama: feat/003-centros-de-costo-en-compras
creado: 2026-11-24
aprobado: 2026-11-24
depende_de: 002-lineas-de-producto (implementada: lineas_producto, registrarCatalogo, CatalogoCrud, ClasificacionView)
---

# Plan: Centros de costo en compras

> Parte el `design.md` aprobado en tareas pequeñas y ordenadas. Cada tarea deja la app funcionando y se puede verificar sola. Aquí no se toman decisiones de diseño nuevas; si aparece una, se vuelve a `design.md`.

## 1. Preparación

- [ ] La 002 está terminada (como mínimo en `main` local). La rama `feat/003-centros-de-costo-en-compras` se crea desde `main` actualizado.
- [ ] Copia de la base de producción en `C:\pos-pruebas-003\sublime-pos.sqlite`, **más una segunda copia intacta** para repetir la migración desde cero.
- [ ] Valores de referencia sobre la copia: el conteo y la `SUM(precioCompra*cantidadComprada)` de `productos_comprados` (hoy 806 y 15.744.772,26), la `SUM(monto)` y la `SUM(pago)` de compras, y el resumen de `Caja` de noviembre de 2026.
- [ ] Backend local contra la copia: `$env:DATA_DIR="C:\pos-pruebas-003"; npm run dev:backend`.

## 2. Tareas

### T-01: Tablas nuevas y columna en líneas

- **Cubre**: RF-01, RF-09, RF-12 (estructura); RNF-05
- **Depende de**: —
- **Archivos**: `backend/sql/schema.sql`, `backend/src/db.js`
- **Pasos**: `centros_costo` y `tipos_gasto` con sus índices únicos en `schema.sql`; `idCentroCosto` en `lineas_producto` (en `schema.sql` y en un `ALTER` idempotente en `db.js`).
- **Verificación**: doble arranque sin errores; `PRAGMA table_info(lineas_producto)` muestra la columna; una base vacía también arranca.

### T-02: Reconstrucción de `productos_comprados`

- **Cubre**: base de RF-06, RF-11 y RF-13
- **Depende de**: T-01
- **Archivos**: `backend/sql/schema.sql` (nueva definición), `backend/src/db.js`
- **Pasos**: bloque condicionado a que falte `idProductoComprado`, exactamente como en design §3.2:
  1. guardar el conteo y la suma de control, y `foreign_keys = OFF`;
  2. en transacción: renombrar, crear la tabla nueva, `INSERT … SELECT rowid … ORDER BY rowid` y verificar el conteo y la suma (si difieren, `throw`, lo que provoca rollback);
  3. `DROP` de la tabla vieja;
  4. `foreign_keys = ON` y `foreign_key_check` vacío (si no, `throw`);
  5. índices `idCompra`, `idCentroCosto` e `idTipoGasto`.
- **Verificación**:
  - Primer arranque: los logs indican la migración; el conteo (806), la suma (15.744.772,26) y el máximo id (814) son iguales a la referencia; `integrity_check` sale `ok`.
  - Segundo arranque: no migra de nuevo.
  - Con la copia intacta, se simula una falla (por ejemplo, forzando temporalmente que la verificación falle) y se confirma que el rollback deja la tabla original sin cambios. Después se revierte la prueba.
  - Las pantallas de Compras (lista, detalle, crear, editar, anular) funcionan igual que antes.

### T-03: CRUD de centros y tipos de gasto

- **Cubre**: RF-01, RF-12; CA-01 (backend)
- **Depende de**: T-01 y `registrarCatalogo` de 002
- **Archivos**: `backend/src/server.js`
- **Pasos**: registrar `/api/centros-costo` (usos: `productos_comprados`, `lineas_producto`) y `/api/tipos-gasto` (uso: `productos_comprados`). En `PUT /api/lineas-producto/:id`, aceptar `idCentroCosto`, validando la compañía y que esté activo, y devolverlo en el GET.
- **Verificación** con `curl`: crear, duplicar (409), renombrar, desactivar, eliminar en uso (409) y sin uso (204); asociar una línea a un centro; aislamiento por compañía.

### T-04: Centro y tipo en crear y editar compras

- **Cubre**: RF-02, RF-13; CA-02, CA-03 (backend)
- **Depende de**: T-02, T-03
- **Archivos**: `backend/src/server.js` (`POST`/`PUT /api/compras`, `GET /api/compras/:id`)
- **Pasos**:
  1. Validar `idCentroCosto` en cada ítem; si falta, responder 400 con `itemsSinCentro` (índices). `idTipoGasto` es opcional; ambos deben ser de la compañía y estar activos (salvo que no cambien al editar).
  2. Insertar las dos columnas.
  3. En `GET /api/compras/:id`, devolver `idProductoComprado`, `centroCosto` y `tipoGasto` (`LEFT JOIN`).
- **Verificación**:
  - Una compra sin centro en un ítem → 400 con el índice del ítem.
  - Una compra con 3 ítems clasificados → 201, y `monto`, `pago` y `existencia` se comportan igual que antes.
  - Editar una compra histórica sin clasificar exigiendo centro → 400; con los centros puestos → 200, y el monto se mantiene.

### T-05: Centro en la conversión de Préstamos y aportes a compra

- **Cubre**: RF-05; CA-05 (backend)
- **Depende de**: T-04
- **Archivos**: `backend/src/server.js` (`POST /api/prestamos-aportes`)
- **Pasos**: validar e insertar `idCentroCosto` e `idTipoGasto` en los artículos de `compraDesdeMovimiento` con la misma función de validación de T-04.
- **Verificación**: un aporte convertido sin centro → 400 y no se crea ni el movimiento ni la compra; con centro → se crean los dos y los ítems quedan clasificados.

### T-06: Sugerencias, clasificación masiva y corrección puntual

- **Cubre**: RF-04, RF-06, RF-07, RF-11, RF-13; RNF-04; CA-04, CA-06, CA-09 (backend)
- **Depende de**: T-04
- **Archivos**: `backend/src/utils.js` (`normalizarDescripcion`), `backend/src/server.js`
- **Pasos**:
  1. `GET /api/compras/sugerencias-clasificacion` (design D-03).
  2. `GET /api/compras/items-por-clasificar` y `POST /api/compras/clasificar` (D-04).
  3. `PATCH /api/compras/:id/items/:idItem` (D-05).
- **Verificación**:
  - Los grupos de la copia juntan "Fresas", "fresas" y "fresas " en uno solo; la suma de los totales de todos los grupos pendientes es igual a la suma de los ítems sin centro.
  - Clasificar un grupo → `actualizados` igual a su cantidad, y el grupo desaparece de los pendientes.
  - La sugerencia de esa descripción devuelve el centro asignado.
  - `PATCH` sobre un ítem → cambia solo su clasificación; `compras.monto`, `compras.pago`, `existencia` y el resumen de Caja quedan iguales a la referencia.
  - `PATCH` sobre un ítem de otra compañía → 404.

### T-07: Reportes de compras por centro y resultado por centro

- **Cubre**: RF-08, RF-10, RF-14; RNF-03; CA-07, CA-08, CA-11 (backend)
- **Depende de**: T-06
- **Archivos**: `backend/src/server.js`
- **Pasos**: `GET /api/reportes/compras-por-centro` y `GET /api/reportes/resultado-por-centro` según design §4 y D-06, con "Sin asignar", "Sin tipo", los gastos sin línea asociada, las ventas sin centro y el desglose `porTipo`.
- **Verificación**, por mes de mayo a noviembre de 2026:
  - la suma de compras por centro (con "Sin asignar") es igual a `SUM(monto)` de compras del mes;
  - en el resultado, la suma de ventas de los centros más las ventas sin centro es igual al total vendido del mes;
  - la suma de compras (centros, gastos sin línea y sin asignar) es igual al total de compras;
  - en cada centro, la suma de `porTipo` es igual a sus compras.

### T-08: Pestañas Centros de costo y Tipos de gasto, y centro en la pestaña Líneas

- **Cubre**: RF-01, RF-09, RF-12; CA-01, CA-10
- **Depende de**: T-03
- **Archivos**: `frontend/src/views/ClasificacionView.vue`
- **Pasos**: dos pestañas con `CatalogoCrud`. En la pestaña Líneas, una columna o chip con el centro y la acción "Asignar centro".
- **Verificación**: CRUD completo de ambos catálogos y asociación línea → centro en 360 px, 768 px y 1280 px.

### T-09: Selectores en Compras

- **Cubre**: RF-02, RF-03, RF-04, RF-11, RF-13; RNF-01; CA-02, CA-03, CA-04, CA-09, CA-10
- **Depende de**: T-04, T-06
- **Archivos**: `frontend/src/components/ClasificacionItemSelect.vue` (nuevo), `frontend/src/views/ComprasView.vue`
- **Pasos**:
  1. Componente con Centro (requerido) y Tipo (opcional) que muestra "sugerido".
  2. En el formulario de ítem: la sugerencia se aplica al escribir la descripción (mapa cargado al abrir la vista).
  3. "Aplicar a todos" sobre la tabla de ítems.
  4. Los ítems sin centro se marcan con color e icono, y Guardar se deshabilita mientras existan.
  5. Al editar una compra histórica, los ítems llegan sin centro y deben completarse.
  6. En el detalle, "Cambiar clasificación" por ítem (PATCH).
- **Verificación**:
  - Registrar una compra mixta en 360 px.
  - Registrar una compra de un solo centro con "Aplicar a todos": cuenta como una sola acción adicional (RNF-01).
  - La sugerencia aparece con una descripción ya clasificada.
  - Corregir un ítem desde el detalle.

### T-10: Selectores en Préstamos y aportes

- **Cubre**: RF-05; CA-05
- **Depende de**: T-05, T-09
- **Archivos**: `frontend/src/views/PrestamosAportesView.vue`
- **Pasos**: `ClasificacionItemSelect` en el formulario de artículo de "convertir en compra", y validación antes de enviar.
- **Verificación**: convertir un aporte en compra con artículos clasificados; sin centro no deja guardar.

### T-11: Pestaña Clasificar compras

- **Cubre**: RF-06, RF-07, RF-13; CA-06, CA-10
- **Depende de**: T-06, T-08
- **Archivos**: `frontend/src/components/ClasificarComprasPanel.vue` (nuevo), `ClasificacionView.vue`
- **Pasos**: interruptor pendiente Centro/Tipo, búsqueda, tarjetas de grupo con [Centro] [Tipo] [✓], desplegable de ítems con checkbox para asignar solo algunos, y el contador de progreso ("N ítems sin centro").
- **Verificación**: clasificar 5 grupos grandes en 360 px; el contador baja; los grupos clasificados desaparecen; los ítems clasificados se ven en el detalle de su compra.

### T-12: Reportes en la interfaz

- **Cubre**: RF-08, RF-10, RF-14; CA-07, CA-08, CA-11, CA-10
- **Depende de**: T-07
- **Archivos**: `frontend/src/views/ReportesView.vue`
- **Pasos**: tipos de reporte `Compras por centro` (tarjetas por centro con %, el desglose por tipo y los ítems desplegables) y `Resultado por centro` (tarjetas ventas / compras / resultado, la sección "Gastos sin línea asociada" y las partidas de conciliación).
- **Verificación**: los valores coinciden con los de T-07 para noviembre; probado en 360 px y 1280 px.

### T-13: Documentación

- **Depende de**: T-01 a T-12
- **Archivos**: `sdd/data-model.md` (tablas nuevas, `productos_comprados` reconstruida con PK, `lineas_producto.idCentroCosto`, diagrama, "Efectos en caja" sin cambios, brechas e historial), `CLAUDE.md` (centro obligatorio en compras, endpoints de clasificación), `sdd/features/README.md`
- **Verificación**: los documentos reflejan lo construido.

## 3. Verificación final

| Criterio | Cómo se verifica | Dispositivo / ancho |
|---|---|---|
| CA-01 | Crear "Fresas y crepes", "Sodas y burritos" y "General" | celular 360 px |
| CA-02 | Guardar una compra con un ítem sin centro → bloqueado y señalado | celular 360 px |
| CA-03 | "Aplicar a todos" y luego cambiar un ítem → 2 + 1, mismo total | tablet |
| CA-04 | Sugerencia de "fresas 10 libras" | celular 360 px |
| CA-05 | Aporte convertido en compra exige centro | escritorio |
| CA-06 | Clasificar un grupo del histórico | celular 360 px |
| CA-07 | Compras por centro con "Sin asignar" = total de compras del rango | escritorio |
| CA-08 | Resultado de noviembre con "General" aparte | escritorio |
| CA-09 | Corregir un ítem pasado → caja, total e inventario iguales | escritorio |
| CA-10 | Registro mixto y clasificación en 360 px sin scroll horizontal | celular 360 px |
| CA-11 | Fresas (Insumo) y nevera (Inversión) → desglose por tipo correcto | escritorio |

Además:

- [ ] Migración: la copia intacta migra una sola vez; el segundo arranque no hace nada; conteo y suma iguales.
- [ ] `Caja` de noviembre y los totales de compras por mes son iguales a la referencia.
- [ ] Sin errores en la consola ni en los logs del backend.

## 4. Despliegue

Según `deploy/GUIA-DESPLIEGUE.md`, **después de desplegar la 002**:

1. PR de `feat/003-centros-de-costo-en-compras` y merge a `main`.
2. **Backup de producción obligatorio**: esta feature reconstruye `productos_comprados`. Se guarda fuera de Railway.
3. `railway up` desde `main` limpio.
4. Verificación posterior:
   - en `railway logs`, el mensaje de migración sin errores;
   - el total de compras de noviembre y el resumen de Caja iguales a los del backup;
   - crear un centro de prueba y una compra de prueba en una compañía de prueba (o anularla después).

**Plan de reversa**:
- Si la migración falla, la transacción hace rollback y la app no arranca. Se hace redeploy del despliegue anterior: la tabla original sigue intacta.
- Si se detecta un problema **después** de migrar, el código anterior es compatible con la tabla nueva (columnas adicionales e `INSERT` con columnas explícitas), así que basta con un redeploy del despliegue anterior.
- Ante daño en los datos, se restaura el backup con `subir-bd.js`.

## Historial

| Fecha | Cambio |
|---|---|
| 2026-11-24 | Borrador inicial |
| 2026-11-24 | Plan aprobado por el usuario |
