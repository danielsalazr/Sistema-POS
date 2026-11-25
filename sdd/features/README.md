# Features

Cada carpeta `NNN-nombre-corto/` es un requerimiento que sigue el flujo SDD (ver `sdd/README.md`).

- Crear una feature: `npm run sdd:nueva -- "nombre"`
- Iniciar la siguiente fase (exige la anterior aprobada): `npm run sdd:fase -- NNN design|plan|implementation`
- Actualizar este índice: `npm run sdd:estado`

Leyenda: ✅ aprobado · 📝 en trabajo · · no iniciado. Para pausar o descartar una feature, agrega `feature_estado: pausado` (o `descartado`) al encabezado de su `spec.md`.

## Índice

<!-- El bloque siguiente lo genera `npm run sdd:estado`; no editar a mano. -->
<!-- indice:inicio -->
| Feature | Nombre | Estado | spec design plan impl |
|---|---|---|---|
| [001-toma-de-pedido-guiada](./001-toma-de-pedido-guiada/) | Toma de pedido guiada | pausado | 📝 · · · |
| [002-lineas-de-producto](./002-lineas-de-producto/) | Líneas de producto y ventas por línea | terminado | ✅ ✅ ✅ ✅ |
| [003-centros-de-costo-en-compras](./003-centros-de-costo-en-compras/) | Centros de costo en compras | terminado | ✅ ✅ ✅ ✅ |
<!-- indice:fin -->
