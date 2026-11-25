---
feature: 003-centros-de-costo-en-compras
fase: implementation
estado: aprobado        # en-progreso | en-revision | aprobado
plan: ./plan.md         # debe estar aprobado
rama: feat/003-centros-de-costo-en-compras
iniciado: 2026-11-24
terminado: 2026-11-24
desplegado:             # fecha y commit desplegado en producción
---

# Implementación: Centros de costo en compras

> Bitácora de la ejecución del `plan.md`. Se actualiza **mientras** se trabaja, no al final.

Base de pruebas: copias de `backend/data/sublime-pos.sqlite` en el scratchpad de la sesión. Una copia de trabajo, otra intacta para repetir la migración y una tercera para la prueba de falla. Ningún cambio se hizo sobre `backend/data` ni sobre producción.

Referencias tomadas **antes** de cualquier cambio, con el código de la 002: ítems 806 / 15.744.772,26 / id máximo 814; compras 352, monto 15.744.772,26 y pago 15.744.772; compras y ventas por mes; existencias 16.667; y `/api/caja/resumen` (total, noviembre y junio de 2026).

## 1. Avance por tarea

| Tarea | Estado | Commit | Notas |
|---|---|---|---|
| T-01 Tablas nuevas y columna en líneas | hecha | — (sin commit) | `centros_costo`, `tipos_gasto` y `lineas_producto.idCentroCosto` |
| T-02 Reconstrucción de `productos_comprados` | hecha | — | Bloque en `db.js` con verificación de conteo y suma, y `foreign_key_check` |
| T-03 CRUD de centros y tipos | hecha | — | `registrarCatalogo` con `CATALOGO_CENTROS` y `CATALOGO_TIPOS`; `validarReferenciaCatalogo`; `camposExtra.idCentroCosto` en líneas |
| T-04 Centro y tipo en compras | hecha | — | `clasificarItemsCompra`, `clasificacionPreviaCompra`, `SELECT_ITEMS_COMPRA` |
| T-05 Conversión desde préstamos y aportes | hecha | — | Valida antes de crear el movimiento y la compra |
| T-06 Sugerencias, clasificación masiva y PATCH | hecha | — | `normalizarDescripcion` en `utils.js` |
| T-07 Reportes | hecha | — | `itemsCompraEnRango`, `agruparComprasPorCentro`, dos endpoints |
| T-08 Pestañas de centros y tipos, y centro en líneas | hecha | — | `ClasificacionView.vue` (cuatro pestañas, `?pestana=`) |
| T-09 Selectores en Compras | hecha | — | `ClasificacionItemSelect.vue`, `texto.js`; carrito y detalle como lista de tarjetas |
| T-10 Selectores en Préstamos y aportes | hecha | — | Sugerencia incluida |
| T-11 Pestaña Clasificar compras | hecha | — | `ClasificarComprasPanel.vue` |
| T-12 Reportes en la interfaz | hecha | — | `ReporteComprasPorCentro.vue`, `ReporteResultadoPorCentro.vue` |
| T-13 Documentación | hecha | — | `sdd/data-model.md`, `CLAUDE.md` |

## 2. Desviaciones del plan o del design

| Fecha | Qué cambió | Por qué | Documento actualizado |
|---|---|---|---|
| 2026-11-24 | La rama `feat/003-…` se creó desde `feat/002-lineas-de-producto` (commit `40c76f0`) y no desde `main`. | La 002 todavía no está en `main`, y la 003 depende de ella. | Este documento |
| 2026-11-24 | En Compras, el carrito y el detalle pasaron de `v-table` a una lista de tarjetas por ítem. | La tabla de 5 columnas ya desbordaba a 360 px; agregarle centro y tipo la empeoraba. | Este documento |
| 2026-11-24 | En Compras, el centro y el tipo elegidos se **conservan** para el siguiente ítem cuando no hay sugerencia (se muestran sin la marca "sugerido"). | Agiliza las compras de un solo centro (RNF-01). El valor siempre está visible y se puede cambiar. | Este documento |
| 2026-11-24 | En Préstamos y aportes, el centro se exige **al agregar** cada artículo, en lugar de permitir artículos sin centro y bloquear el guardado. | Evita la edición por fila en una tabla pequeña; el resultado es el mismo (CA-05). | Este documento |
| 2026-11-24 | `normalizarDescripcion` usa `\p{Diacritic}` en lugar del rango `̀-ͯ`. | Es equivalente para español y queda legible en el código fuente. | — |
| 2026-11-24 | Mensaje de 409 `EN_USO` del generador de catálogos cambiado a "Puedes desactivar el registro en su lugar." | El anterior ("desactivarla") no concordaba con los catálogos masculinos. | — |

## 3. Evidencia de verificación

| Criterio | Resultado | Evidencia |
|---|---|---|
| CA-01 | ✅ | Por API se crearon "Fresas y crepes", "Sodas y burritos" y "General"; "GENERAL" devuelve 409. En la UI se ven en la pestaña "Centros de costo" y en los selectores. |
| CA-02 | ✅ | API: compra con un ítem sin centro → 400 `ITEMS_SIN_CENTRO`, `itemsSinCentro: [1]`. UI (360 px): ítem resaltado, aviso "N ítem(s) sin centro" y botón de guardar deshabilitado. |
| CA-03 | ✅ | UI: compra histórica 356 cargada con 2 ítems sin centro → "Aplicar a todos: Fresas y crepes" → 0 pendientes y botón habilitado. Compra 360 registrada con 3 centros distintos y total 43.000. |
| CA-04 | ✅ | UI: al escribir "Fresas" se propone Fresas y crepes / Insumo con la marca "sugerido"; "tortillas" propone Sodas y burritos. También en Préstamos y aportes. |
| CA-05 | ✅ | API: aporte convertido sin centro → 400 y no se crean ni el movimiento ni la compra (conteos 167/353 sin cambio); con centro se crean ambos (168/354) y el ítem queda clasificado. |
| CA-06 | ✅ | `items-por-clasificar` agrupa "Fresas", "fresas" y "FRESAS " en un solo grupo; la suma de los grupos es igual a la suma de los ítems sin centro (804 / 15.713.579,26 en la BD). Clasificar el grupo → `actualizados: 10`, el grupo desaparece y la sugerencia se actualiza. En la UI a 360 px, "Nevera" (4 ítems) → General / Inversión y el contador pasa de 736 a 732. |
| CA-07 | ✅ | En cada mes de mayo a noviembre de 2026 y en el total: compras por centro (con "Sin asignar") igual a `SUM(compras.monto)`; cada centro cuadra con sus tipos y sus ítems. |
| CA-08 | ✅ | El resultado cuadra por mes: ventas de los centros más ventas sin centro igual al total vendido; compras de los centros más gastos sin línea más sin asignar igual al total de compras. "General" aparece en "Gastos sin línea asociada". |
| CA-09 | ✅ | API: PATCH sobre un ítem → solo cambia la clasificación; `SUM(compras.monto)`, `SUM(pago)` y `SUM(existencia)` no cambian. UI: "tortillas" de la compra 360 pasa a General desde "Cambiar clasificación", con monto y pago iguales. PATCH desde otra compañía → 404. |
| CA-10 | ✅ | Compra mixta, Clasificar compras, Préstamos y aportes y reportes a 360 px: sin scroll horizontal (`scrollWidth = clientWidth`). |
| CA-11 | ✅ | Compra con fresas (Insumo) y nevera (Inversión) → `porTipo` del centro desglosado; la suma de tipos es igual al total del centro en todos los meses. |

Verificaciones generales:

- [x] Migración: primer arranque "Migración productos_comprados aplicada: 806 items, total 15744772.26"; el segundo no migra; conteo, suma e id máximo iguales a la referencia; `integrity_check = ok`; `foreign_key_check` vacío; base vacía OK.
- [x] Prueba de falla: con la verificación forzada a fallar (copia temporal de `db.js`, ya eliminada), el arranque se aborta y la tabla original queda intacta (sin columnas nuevas, mismo conteo y suma, sin `_old`).
- [x] **Caja**: la copia intacta migrada con el código nuevo da un `/api/caja/resumen` idéntico byte a byte al del código anterior en los 3 rangos. Compras y ventas por mes, y existencias, iguales a la referencia.
- [x] Probado en celular (360 px). Escritorio cubierto por la 002 y por los breakpoints `sm`/`md`; no se tomaron capturas de 1280 px específicas de la 003.
- [x] Sin errores ni advertencias en la consola del navegador.

## 4. Documentación actualizada

- [x] `sdd/data-model.md` (tablas nuevas, `productos_comprados` reconstruida, `lineas_producto.idCentroCosto`, diagrama, efectos en caja, reportes e historial)
- [x] `CLAUDE.md` (centro obligatorio en compras, endpoints de clasificación y reportes)
- [x] `sdd/features/README.md` (`npm run sdd:estado`)

## 5. Despliegue

Primero la 002 y después la 003, o las dos juntas desde `main` con ambas ramas integradas.

| Paso | Hecho | Notas |
|---|---|---|
| Commit en `feat/003-centros-de-costo-en-compras` | ✅ | |
| PR / merge a `main` | | |
| **Backup previo obligatorio** | | Esta feature reconstruye `productos_comprados` |
| `railway up` | | |
| Verificación en producción | | En `railway logs` debe aparecer "Migración productos_comprados aplicada: N items…"; total de compras de noviembre y Caja iguales al backup |
| Crear centros y tipos, asociar líneas a centros | | Los hace el usuario en Clasificación |
| Clasificar el histórico | | Pestaña "Clasificar compras" |

## 6. Pendientes y seguimiento

- `backend/scripts/convert-movements-35-72-to-purchases.js` (ya ejecutado) insertaría ítems sin centro si se volviera a correr. Está documentado en el design §7 y no se modificó.
- Ideas fuera de alcance: repartir "General" entre centros; reglas automáticas de clasificación por proveedor.
- Siguen pendientes los dos problemas existentes anotados en la 002: la barra superior en celular y las fechas por defecto de Reportes en UTC.
