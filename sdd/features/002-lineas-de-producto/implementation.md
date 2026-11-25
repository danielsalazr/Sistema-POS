---
feature: 002-lineas-de-producto
fase: implementation
estado: aprobado        # en-progreso | en-revision | aprobado
plan: ./plan.md         # debe estar aprobado
rama: feat/002-lineas-de-producto
iniciado: 2026-11-24
terminado: 2026-11-24
desplegado:             # fecha y commit desplegado en producción
---

# Implementación: Líneas de producto y ventas por línea

> Bitácora de la ejecución del `plan.md`. Se actualiza **mientras** se trabaja, no al final.

Base de pruebas: copia de `backend/data/sublime-pos.sqlite` (606 ventas, 1.028 renglones) en el scratchpad de la sesión, más una copia intacta para comparar. Ningún cambio se hizo sobre `backend/data` ni sobre producción.

## 1. Avance por tarea

| Tarea | Estado | Commit | Notas |
|---|---|---|---|
| T-01 Esquema y migración | hecha | — (sin commit) | `schema.sql` y bloque idempotente en `db.js` |
| T-02 Generador de catálogos y CRUD de líneas | hecha | — | `registrarCatalogo`, `httpError` en `server.js` |
| T-03 Asignación de línea a productos | hecha | — | `validarLineaProducto`, `asignarLineaAProductos`, `POST /api/lineas-producto/asignar`, productos POST/PUT/GET |
| T-04 Snapshot en ventas | hecha | — | POST y PUT de `/api/ventas/contado` |
| T-05 Reporte por línea | hecha | — | `GET /api/reportes/ventas-por-linea` |
| T-06 CatalogoCrud + Clasificación | hecha | — | `components/CatalogoCrud.vue`, `views/ClasificacionView.vue`, ruta y menú |
| T-07 Asignación masiva (UI) | hecha | — | `components/AsignarLineaDialog.vue` |
| T-08 Línea en Productos | hecha | — | selector, columna, chips de filtro, errores visibles en el formulario |
| T-09 Reportes | hecha | — | `components/reportes/ReporteVentasPorLinea.vue`, selector de tipo y atajo de filtro en `ReportesView.vue` |
| T-10 Documentación | hecha | — | `sdd/data-model.md`, `CLAUDE.md` |

## 2. Desviaciones del plan o del design

| Fecha | Qué cambió | Por qué | Documento actualizado |
|---|---|---|---|
| 2026-11-24 | `CatalogoCrud` usa tarjetas en todos los anchos (grilla de 1, 2 o 3 columnas) en lugar de tarjetas en `xs` y tabla en `md+`. | Una sola plantilla, objetivos táctiles grandes también en tablet, y menos código. Los catálogos tienen pocas filas. | Este documento |
| 2026-11-24 | Al editar una venta, un renglón que estaba en NULL toma la línea actual del producto (en vez de quedar NULL). | Es coherente con D-02: NULL significa "sin clasificar". Si quedara NULL, la edición lo dejaría sin clasificar para siempre. | Este documento (complementa D-03) |
| 2026-11-24 | **Hallazgo**: 49 renglones (51 unidades) de las ventas importadas de mayo de 2026 tienen `idProducto = 0` y descripciones libres, por 938.000 COP (5,2 % del total histórico). No se clasifican asignando productos (RF-09). **Decisión del usuario: opción b.** Se agrega el script `backend/scripts/clasificar-renglones-sin-producto.js`: busca las líneas por nombre, clasifica por palabras clave solo cuando apuntan a una sola línea, y por defecto es una simulación (`--aplicar` para guardar). En la copia clasificó 44 renglones (711.000); quedan 5 en "Sin línea" (3 mixtos por 223.000 y 2 de "agua" por 4.000). Es idempotente y no cambia montos. | La spec suponía que todo renglón vendido tiene un producto. | `sdd/data-model.md` (Brechas), este documento |
| 2026-11-24 | Se agregaron mensajes de error visibles en el formulario de Productos. Antes, los errores distintos de "código duplicado" se lanzaban sin mostrarse. | Necesario para ver la validación de línea inactiva (400). | — |

## 3. Evidencia de verificación

| Criterio | Resultado | Evidencia |
|---|---|---|
| CA-01 | ✅ | `POST /api/lineas-producto` → 201; las líneas aparecen en Clasificación (captura a 360 px). |
| CA-02 | ✅ | `DELETE` de una línea en uso → 409 `EN_USO` con `cantidadProductos: 3, cantidadVentas: 296`; la UI muestra el diálogo con "Desactivar". |
| CA-03 | ✅ | Diálogo a 360 px: búsqueda "fresas", marcar visibles, asignar → "5 producto(s) asignados. 80 renglón(es) … clasificados". |
| CA-04 | ✅ | Venta 636 con un producto sin línea → se registra; su renglón queda con NULL y aparece en "Sin línea". |
| CA-05 | ✅ | En cada mes de mayo a noviembre de 2026 y en el año completo: `totalVendido` es igual a `SUM(monto)`, `numeroVentas` es igual al conteo y los porcentajes suman 100,00. |
| CA-06 | ✅ | Reporte a 360 px: al tocar "Sodas y burritos" se despliegan sus 11 productos con unidades y valor. |
| CA-07 | ✅ | Venta mixta 636 (burrito, crepocho y goloso) → 48.000 en Sodas y burritos, 18.000 en Fresas y crepes y 12.000 en Sin línea. |
| CA-08 | ✅ | Burrito Pollo movido de la línea 3 a la 1: `ventasClasificadas: 0` y sus 85 renglones siguen en la 3. Venta 636 editada después de mover Burrito Mixto: su renglón conserva la línea 3; Crepocho, agregado al editar, toma la línea 1. |
| CA-09 | ✅ (con excepción documentada) | Al asignar todos los productos se clasificaron 354 + 80 + 267 + 260 renglones históricos. Con el script de la opción b, 44 de los 49 renglones sin producto también. Quedan 5 renglones (227.000; 3 mixtos y 2 de "agua") en "Sin línea" por diseño. |
| CA-10 | ✅ | Clasificación, diálogo de asignación, Productos y reporte a 360 px: `scrollWidth = clientWidth = 360` y ningún elemento desborda. También probado a 1280 px. |

Verificaciones generales:

- [x] Migración idempotente: dos arranques contra la copia sin errores; una base vacía también arranca; `integrity_check = ok` y `foreign_key_check` vacío.
- [x] Ventas y compras por mes iguales a la referencia (descontando la venta de prueba 636); los pagos totales (17.935.100) son iguales a los de la copia intacta.
- [x] Probado en celular (360 px) y escritorio (1280 px).
- [ ] Tablet (768 px): no se probó por separado. La grilla usa los mismos breakpoints de Vuetify (`sm`).
- [x] Sin errores en la consola del navegador (0 errores, 0 advertencias) ni en los logs del backend.

## 4. Documentación actualizada

- [x] `sdd/data-model.md` (tabla, columnas, diagrama, brecha nueva e historial)
- [x] `CLAUDE.md` (`registrarCatalogo`, `httpError`, Clasificación, snapshot de línea y reporte)
- [x] `sdd/features/README.md` (`npm run sdd:estado`)

## 5. Despliegue

| Paso | Hecho | Notas |
|---|---|---|
| Commit en `feat/002-lineas-de-producto` | ✅ | |
| PR / merge a `main` | | |
| Backup previo descargado | | |
| `railway up` | | |
| Verificación en producción | | |
| Crear las líneas en Clasificación y asignar los productos | | Las hace el usuario |
| Script de renglones sin producto | | `railway ssh`, luego `cd backend && node scripts/clasificar-renglones-sin-producto.js` (revisar la simulación) y repetir con `--aplicar`. Los nombres de las líneas deben coincidir con las reglas, o se pasa `--reglas`. |

## 6. Pendientes y seguimiento

- Renglones vendidos sin producto: resuelto con la opción b (script). Los 5 renglones restantes se pueden clasificar agregando reglas con `--reglas`, por ejemplo "agua".
- **Mejora sugerida, fuera de esta feature**: en celular, la barra superior (selector de compañía, usuario y salir) se corta. El problema ya existía.
- **Bug existente, fuera de esta feature**: las fechas por defecto de Reportes usan `toISOString()` (UTC), así que después de las 7 p. m. en Bogotá muestran el día siguiente. Corrección de una línea con `todayDateInput()` de `dates.js`.
