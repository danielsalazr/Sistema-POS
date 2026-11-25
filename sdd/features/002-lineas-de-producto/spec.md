---
feature: 002-lineas-de-producto
fase: spec
estado: aprobado        # borrador | en-revision | aprobado
creado: 2026-11-24
aprobado: 2026-11-24    # fecha en que el usuario aprobó
---

# Spec: Líneas de producto y ventas por línea

> Describe **QUÉ** se necesita y **POR QUÉ**, desde el punto de vista de quien usa el POS. No menciones tablas, endpoints, componentes ni librerías; eso va en `design.md`.

## 1. Contexto y problema

Dela POS vende dos tipos de producto bajo una misma caja: por un lado fresas con crema, crepes, helados y postres; por otro, burritos, megaburritos y sodas italianas, además de bebidas embotelladas y adicionales. Hoy los 31 productos están en una lista plana. El único reporte por producto es "ventas por ítem", así que para saber cuánto vende cada tipo de negocio hay que sumar a mano.

Son el mismo negocio y no dos compañías: 92 de las 606 ventas registradas mezclan, en un mismo pedido, burritos con crepes o fresas, y se cobran juntos. Por eso la separación tiene que hacerse **dentro** de la venta, producto por producto, y no con el selector de compañía.

**Concepto elegido: "línea de producto"**. Es la agrupación comercial de productos que se quieren analizar como un negocio aparte, por ejemplo "Fresas y crepes" y "Sodas y burritos". Se eligió "línea" y no "categoría" a propósito:

- **Línea** responde *¿qué parte del negocio genera esta venta?*, sirve para reportes y rentabilidad, y cada producto pertenece a una sola.
- **Categoría** se reserva para organizar el menú en pantalla (por ejemplo "Crepes de sal", "Crepes de dulce", "Bebidas"), que es lo que necesitará la toma de pedido guiada (feature 001). Las dos cosas pueden coincidir o no, y mantenerlas separadas evita que un cambio de menú altere los reportes.

## 2. Objetivo

Poder ver, para cualquier rango de fechas, cuánto vende cada línea de producto (unidades, valor vendido y participación en el total), por separado y con detalle por producto, sin cálculos manuales. Esta feature es la base para luego cruzar ventas con costos por centro de costo (feature 003).

## 3. Usuarios y dispositivos

| Usuario | Qué hace con esta feature | Dispositivo principal |
|---|---|---|
| Dueños / administración | Crean las líneas, asignan productos y consultan los reportes por línea | Computador, tablet o celular |
| Cajero | Nada cambia al vender: la línea se toma sola del producto | Tablet / celular |

## 4. Escenarios de uso

1. **Configurar líneas**: como administrador, creo las líneas "Fresas y crepes" y "Sodas y burritos" y asigno cada producto a una de ellas de forma rápida, sin editar los productos uno por uno.
2. **Producto nuevo**: al crear un producto, elijo su línea en el mismo formulario.
3. **Ver ventas por línea**: como dueño, elijo un rango (por ejemplo "noviembre") y veo cuánto vendió cada línea, su porcentaje del total y, al tocar una línea, sus productos.
4. **Comparar periodos**: reviso el mismo reporte para octubre y noviembre y veo cómo se mueve cada línea.
5. **Producto que cambia de línea**: muevo un producto de línea (por ejemplo "Helado cono" pasa a otra) y los reportes de meses pasados no cambian.

## 5. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Administrar líneas de producto (CRUD): crear, ver, renombrar, desactivar/reactivar y eliminar. Una línea que tiene productos o ventas no se puede eliminar, solo desactivar. El sistema no crea líneas por defecto: las crea el usuario. | Debe |
| RF-02 | Cada producto pertenece como máximo a una línea. Al crear o editar un producto se elige su línea (solo líneas activas). | Debe |
| RF-03 | Asignación masiva: una pantalla donde se ven los productos agrupados por línea (incluido "Sin línea") y se pueden asignar varios a una línea de una sola vez. | Debe |
| RF-04 | Los productos que existen hoy quedan como "Sin línea" hasta que se asignen. Nada deja de funcionar mientras tanto: se puede seguir vendiendo. | Debe |
| RF-05 | Reporte de ventas por línea en un rango de fechas, con: unidades vendidas, valor vendido, número de ventas en que aparece y porcentaje del total vendido. | Debe |
| RF-06 | Desde una línea del reporte se ve el detalle por producto de esa línea, en el mismo rango. | Debe |
| RF-07 | El reporte existente de ventas por ítem permite filtrar por línea. | Debería |
| RF-08 | Cada venta conserva la línea que tenía el producto **en el momento de venderse**. Mover un producto de línea afecta solo las ventas futuras. | Debe (ver P-03) |
| RF-09 | Las ventas registradas antes de esta feature se clasifican con la línea asignada a su producto en el momento de la configuración inicial, para que el histórico desde mayo de 2026 también se vea por línea. | Debe |
| RF-10 | Las ventas anuladas no cuentan en el reporte, igual que en los reportes actuales. | Debe |

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Las pantallas de líneas, de asignación y del reporte funcionan con el dedo en celular desde 360 px, en tablet y en computador. |
| RNF-02 | Los totales del reporte por línea, sumados, coinciden exactamente con el total vendido del reporte de ventas actual para el mismo rango. |
| RNF-03 | El proceso de venta no se vuelve más lento ni pide pasos adicionales al cajero. |
| RNF-04 | Las líneas son propias de cada compañía. |
| RNF-05 | Ningún valor actual de Caja ni de Reportes cambia por la configuración de líneas. |

## 7. Criterios de aceptación

| ID | Dado / Cuando / Entonces | Cubre |
|---|---|---|
| CA-01 | **Dado** que no existen líneas, **cuando** el administrador crea "Fresas y crepes" y "Sodas y burritos", **entonces** quedan disponibles para asignar productos. | RF-01 |
| CA-02 | **Dado** una línea con productos, **cuando** se intenta eliminar, **entonces** el sistema solo permite desactivarla y explica por qué. | RF-01 |
| CA-03 | **Dado** 31 productos "Sin línea", **cuando** el administrador selecciona varios y los asigna a una línea, **entonces** todos quedan asignados en una sola acción. | RF-03, RF-04 |
| CA-04 | **Dado** un producto sin línea, **cuando** el cajero lo vende, **entonces** la venta se registra normalmente y aparece en el reporte bajo "Sin línea". | RF-04 |
| CA-05 | **Dado** las líneas configuradas, **cuando** se consulta el reporte de noviembre de 2026, **entonces** se ve cada línea con unidades, valor, número de ventas y porcentaje, y la suma coincide con el total vendido del reporte actual. | RF-05, RNF-02 |
| CA-06 | **Dado** el reporte por línea, **cuando** se toca una línea, **entonces** se ven sus productos con cantidades y valores del mismo rango. | RF-06 |
| CA-07 | **Dado** una venta con un burrito y unas fresas con crema, **cuando** se consulta el reporte, **entonces** el valor de cada producto suma en su propia línea. | RF-05 |
| CA-08 | **Dado** un producto vendido en octubre en la línea A, **cuando** en noviembre se mueve a la línea B, **entonces** el reporte de octubre lo sigue mostrando en A y las ventas nuevas van a B. | RF-08 |
| CA-09 | **Dado** la configuración inicial terminada, **cuando** se consulta el reporte desde mayo de 2026, **entonces** las ventas históricas aparecen repartidas por línea. | RF-09 |
| CA-10 | **Dado** un celular de 360 px, **cuando** se usan las pantallas de líneas y del reporte, **entonces** no hay scroll horizontal y todo se puede tocar con el dedo. | RNF-01 |

## 8. Fuera de alcance

- Costos y rentabilidad por línea. El costo cargado en cada producto hoy no es confiable (hay productos con costo 1 o con costo mayor que el precio), así que la rentabilidad se resuelve con los costos reales de las compras en la feature 003.
- Categorías de menú para la toma de pedido guiada (feature 001).
- Separar la caja o los pagos por línea: un pago cubre la venta completa, y la caja sigue siendo única.
- Permisos sobre quién puede administrar líneas (hoy los permisos no se aplican en el sistema).

## 9. Impacto esperado

- [x] Cambia o agrega información guardada: las líneas, la línea de cada producto y la línea registrada en cada venta.
- [x] Afecta dinero, caja, inventario o reportes: agrega un reporte; no cambia caja ni inventario.
- [x] Afecta pantallas existentes: Productos (elegir línea) y Reportes (nuevo reporte y filtro).
- [x] Requiere migrar o completar datos existentes: clasificar los 31 productos y, con ellos, las ventas históricas.

## 10. Preguntas abiertas

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| P-01 | ¿Cuáles son las líneas exactas? Propuesta: "Fresas y crepes" y "Sodas y burritos". | Las crea el usuario con el CRUD; el sistema no siembra líneas. | resuelta |
| P-02 | ¿A qué línea van los productos ambiguos: gaseosas, Coca-Cola, agua, helados (cono, vasito, bola), postre de arequipe, "Topping adicional" y "Salsa adicional"? ¿Hace falta una tercera línea, por ejemplo "Bebidas y otros"? | Lo decide el usuario al asignar; el CRUD permite crear las líneas que necesite. | resuelta |
| P-03 | Si un producto cambia de línea, ¿las ventas pasadas se quedan en la línea original (recomendado, RF-08) o se reclasifican con la nueva? | Se quedan en la línea original (recomendado), aprobado con la spec. | resuelta |
| P-04 | ¿El reporte debe mostrar también lo **cobrado** por línea (repartiendo los pagos de cada venta entre sus productos), o basta con lo **vendido**? Las ventas pendientes de pago hacen que ambos difieran. | Basta con lo vendido en esta feature. | resuelta |
| P-05 | ¿Se quiere ver el reporte por línea también en el Inicio (dashboard), o solo en Reportes? | Solo en Reportes por ahora. | resuelta |

## Historial

| Fecha | Cambio |
|---|---|
| 2026-11-24 | Borrador inicial a partir del requerimiento del usuario y del análisis de los datos de producción |
| 2026-11-24 | Respuestas del usuario: CRUD completo, líneas creadas por el usuario (sin siembra), elegir línea al editar producto. Preguntas restantes resueltas con la propuesta. Spec aprobada. |
