---
feature: 003-centros-de-costo-en-compras
fase: spec
estado: aprobado        # borrador | en-revision | aprobado
creado: 2026-11-24
aprobado: 2026-11-24    # fecha en que el usuario aprobó
depende_de: 002-lineas-de-producto   # para RF-09 y RF-10 (resultado por centro)
---

# Spec: Centros de costo en compras

> Describe **QUÉ** se necesita y **POR QUÉ**, desde el punto de vista de quien usa el POS. No menciones tablas, endpoints, componentes ni librerías; eso va en `design.md`.

## 1. Contexto y problema

El negocio quiere saber por separado cuánto le cuesta operar "fresas y crepes" y cuánto "sodas y burritos". Hoy eso no se puede saber:

- Las compras se registran por proveedor, con ítems de **texto libre**. Las 806 líneas de compra registradas desde mayo de 2026 son texto libre (ninguna está ligada a un producto), con unas 521 descripciones distintas ("fresas 10 libras", "pechuga campo", "tortillas burritos", "crema de leche alqueria"…).
- Una misma compra mezcla insumos de ambos negocios: en una ida al D1 se compran fresas, crema de leche y tortillas.
- Además de insumos, las compras incluyen gastos que no pertenecen a ninguno de los dos negocios en particular, como nevera, carro, carpa, gasolina, máquina granizadora o pagos de mano de obra.

**Concepto: "centro de costo"**. Es la unidad del negocio a la que se le carga un gasto para medir su costo de forma aislada. Se asigna **a cada ítem de la compra**, no a la compra completa, porque una sola compra suele alimentar a varios centros. Debe existir un centro para lo que es de todos (por ejemplo "General"), para no forzar a escoger un negocio cuando el gasto es compartido.

**Concepto complementario: "tipo de gasto"**. Clasifica la **naturaleza** del ítem (insumo, empaque, equipo o inversión, mano de obra, transporte…), independiente del centro. "Nevera" es inversión del centro General; "fresas 10 libras" es insumo de Fresas y crepes. Con las dos dimensiones, el resultado de un centro puede separar el costo operativo de las inversiones puntuales.

**Relación con las líneas de producto (feature 002)**: cada línea de producto se asocia a un centro de costo. Así, por primera vez, se pueden poner lado a lado lo que **vende** cada parte del negocio y lo que **cuesta**, es decir su resultado.

## 2. Objetivo

1. Que cada peso comprado quede asignado a un centro de costo, también el histórico desde mayo de 2026, con una forma rápida de clasificarlo.
2. Ver, para cualquier rango de fechas, las compras por centro de costo con su detalle.
3. Ver el resultado por centro (ventas de sus líneas menos compras del centro), con las compras desglosadas por tipo de gasto y los gastos generales aparte.

## 3. Usuarios y dispositivos

| Usuario | Qué hace con esta feature | Dispositivo principal |
|---|---|---|
| Quien registra compras | Elige el centro de costo de cada ítem (normalmente aceptando la sugerencia) | Celular / tablet / computador |
| Dueños / administración | Crean los centros, clasifican el histórico y consultan compras y resultados por centro | Computador o tablet |

## 4. Escenarios de uso

1. **Compra mixta**: en el D1 se compran fresas, crema de leche y tortillas. Al registrar la compra, las fresas y la crema van a "Fresas y crepes" y las tortillas a "Sodas y burritos". El total de la compra no cambia.
2. **Compra de un solo negocio**: se compra pechuga y tortillas. Elijo "Sodas y burritos" una vez para toda la compra en lugar de ítem por ítem.
3. **Ítem repetido**: vuelvo a comprar "fresas 10 libras" y el sistema me propone el centro que usé la última vez para esa descripción.
4. **Gasto compartido**: compro gasolina o pago una carpa y lo cargo a "General".
5. **Clasificar el histórico**: entro a una pantalla que agrupa los ítems sin centro por descripción (por ejemplo, las 12 compras de "fresas" juntas), y asigno el centro a todo el grupo de una vez.
6. **Resultado del mes**: elijo noviembre y veo, por centro, lo vendido por sus líneas, lo comprado y la diferencia, con los gastos generales aparte.
7. **Corrección**: me equivoqué de centro en un ítem de una compra pasada. Lo cambio sin tocar montos, proveedor ni fechas.

## 5. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Administrar centros de costo (CRUD): crear, ver, renombrar, desactivar/reactivar y eliminar. Un centro que tiene compras o líneas asociadas no se puede eliminar, solo desactivar. El sistema no crea centros por defecto: los crea el usuario. | Debe |
| RF-02 | Al registrar o editar una compra, cada ítem debe tener un centro de costo. No se puede guardar una compra nueva con ítems sin centro. | Debe |
| RF-03 | Atajo para asignar un mismo centro a todos los ítems de la compra, que después se puede cambiar ítem por ítem. | Debe |
| RF-04 | Sugerencia automática: al escribir la descripción de un ítem, se propone el centro usado la última vez para esa misma descripción. | Debería |
| RF-05 | Las compras que se generan desde Préstamos y aportes también exigen centro de costo en sus ítems. | Debe |
| RF-06 | Clasificación del histórico: una pantalla que agrupa por descripción los ítems de compra sin centro, muestra cuántos son y cuánto suman, y permite asignar un centro a todo el grupo o a ítems sueltos. | Debe |
| RF-07 | Mientras no se clasifiquen, los ítems históricos aparecen como "Sin asignar" en los reportes. No se bloquea nada. | Debe |
| RF-08 | Reporte de compras por centro de costo en un rango de fechas: total por centro, porcentaje y detalle de ítems (fecha, proveedor, descripción, cantidad y valor). | Debe |
| RF-09 | Cada línea de producto (feature 002) se asocia a un centro de costo. | Debe |
| RF-10 | Reporte de resultado por centro en un rango de fechas: ventas de las líneas asociadas, compras del centro y diferencia. Los centros sin ventas (como "General") se muestran como gasto aparte, sin repartirlos entre los demás (ver P-04). | Debe |
| RF-11 | Corregir el centro (y el tipo de gasto) de un ítem de una compra ya registrada, sin cambiar montos, proveedor, fechas ni inventario. | Debe |
| RF-12 | Administrar tipos de gasto (CRUD), con las mismas reglas que los centros (no se elimina un tipo en uso, solo se desactiva; sin siembra). | Debe |
| RF-13 | Cada ítem de compra puede llevar un tipo de gasto. Es **opcional** para no frenar el registro; se aplica con el mismo atajo de toda la compra (RF-03), se sugiere según la última compra de esa descripción (RF-04) y se puede asignar en la clasificación del histórico (RF-06). | Debe |
| RF-14 | Los reportes de compras por centro y de resultado por centro muestran el desglose por tipo de gasto, incluido "Sin tipo". | Debe |

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Registrar una compra no debe ser notablemente más lento: con el atajo (RF-03) y la sugerencia (RF-04), una compra de un solo centro necesita como máximo una acción adicional. |
| RNF-02 | Las pantallas de compras, de clasificación y de reportes funcionan con el dedo en celular desde 360 px, en tablet y en computador. |
| RNF-03 | La suma de compras por centro (incluido "Sin asignar") coincide exactamente con el total de compras del mismo rango que muestra hoy el sistema. |
| RNF-04 | Asignar o cambiar centros no altera ningún valor de Caja, de Movimientos de dinero ni del total de compras. |
| RNF-05 | Los centros de costo son propios de cada compañía. |

## 7. Criterios de aceptación

| ID | Dado / Cuando / Entonces | Cubre |
|---|---|---|
| CA-01 | **Dado** que no hay centros, **cuando** se crean "Fresas y crepes", "Sodas y burritos" y "General", **entonces** quedan disponibles en compras. | RF-01 |
| CA-02 | **Dado** una compra nueva con un ítem sin centro, **cuando** se intenta guardar, **entonces** el sistema lo impide y señala el ítem. | RF-02 |
| CA-03 | **Dado** una compra de 3 ítems, **cuando** se aplica "Sodas y burritos" a toda la compra y luego se cambia un ítem a "General", **entonces** se guardan 2 ítems en Sodas y burritos y 1 en General, y el total no cambia. | RF-03 |
| CA-04 | **Dado** que "fresas 10 libras" se cargó antes a "Fresas y crepes", **cuando** se escribe de nuevo esa descripción, **entonces** se propone ese centro. | RF-04 |
| CA-05 | **Dado** un aporte convertido en compra, **cuando** se registra, **entonces** sus ítems también exigen centro. | RF-05 |
| CA-06 | **Dado** el histórico sin clasificar, **cuando** se abre la pantalla de clasificación, **entonces** los ítems aparecen agrupados por descripción con cantidad y total, y asignar un grupo clasifica todos sus ítems de una vez. | RF-06 |
| CA-07 | **Dado** ítems sin clasificar, **cuando** se consulta el reporte de compras por centro, **entonces** aparecen bajo "Sin asignar" y la suma de todos los centros es igual al total de compras del rango. | RF-07, RF-08, RNF-03 |
| CA-08 | **Dado** las líneas de 002 asociadas a centros, **cuando** se consulta el resultado de noviembre, **entonces** cada centro muestra ventas, compras y diferencia, y "General" aparece aparte. | RF-09, RF-10 |
| CA-09 | **Dado** una compra pasada, **cuando** se cambia el centro de uno de sus ítems, **entonces** cambian solo los reportes por centro; el total de compras, la caja y el inventario quedan iguales. | RF-11, RNF-04 |
| CA-11 | **Dado** los tipos "Insumo" e "Inversión", **cuando** se registra una compra con fresas (Insumo) y una nevera (Inversión) y se consulta el resultado de su centro, **entonces** las compras aparecen desglosadas por tipo y la suma coincide con el total del centro. | RF-12, RF-13, RF-14 |
| CA-10 | **Dado** un celular de 360 px, **cuando** se registra una compra mixta y se clasifica un grupo del histórico, **entonces** no hay scroll horizontal y todo se puede tocar con el dedo. | RNF-02 |

## 8. Fuera de alcance

- Separar la caja o los pagos por centro: el dinero sigue saliendo de una sola caja.
- Repartir automáticamente los gastos de "General" entre los demás centros (ver P-04; podría ser una feature posterior).
- Ligar los ítems de compra a productos del inventario: las compras siguen siendo de texto libre.
- Centros de costo para ingresos, egresos y préstamos o aportes que no se convierten en compra.

## 9. Impacto esperado

- [x] Cambia o agrega información guardada: los centros, el centro de cada ítem de compra y el centro de cada línea de producto.
- [x] Afecta dinero, caja, inventario o reportes: agrega reportes; no cambia caja, inventario ni totales.
- [x] Afecta pantallas existentes: Compras (nuevo y edición), Préstamos y aportes (conversión a compra), Reportes y la administración de líneas (002).
- [x] Requiere migrar o completar datos existentes: clasificar 806 ítems históricos (unas 521 descripciones), con ayuda de la agrupación.

## 10. Preguntas abiertas

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| P-01 | ¿Cuáles son los centros exactos? Propuesta: "Fresas y crepes", "Sodas y burritos" y "General". | Los crea el usuario con el CRUD; el sistema no siembra centros. | resuelta |
| P-02 | ¿Cada línea de producto pertenece a un solo centro? Por ejemplo, ¿a qué centro van las bebidas embotelladas y los adicionales? | Sí: una línea pertenece a un centro (o a ninguno); el usuario decide la asociación. | resuelta |
| P-03 | ¿Se clasifica **todo** el histórico desde mayo de 2026, o basta con hacerlo desde una fecha de corte y dejar lo anterior en "Sin asignar"? | La herramienta permite clasificar todo; cuánto clasificar lo decide el usuario. Lo no clasificado queda como "Sin asignar". | resuelta |
| P-04 | ¿Los gastos de "General" deben repartirse entre los centros (por ejemplo, en proporción a las ventas) en el resultado, o basta con mostrarlos aparte (propuesta actual)? | Se muestran aparte, sin reparto (propuesta), aprobado con la spec. | resuelta |
| P-05 | Las compras mezclan insumos con inversiones (nevera, carro, carpa, máquinas) y mano de obra. ¿Se quiere distinguir el **tipo de gasto** además del centro? Si sí, se propone como feature aparte (004) para mantener esta acotada. | Sí, se incluye en esta feature (RF-12 a RF-14), opcional por ítem. | resuelta |
| P-06 | Algunos ítems históricos de texto libre agrupan muchas cosas en un solo renglón (por ejemplo "movimiento #70 - compra makro: guantes, …"). Si mezclan centros, ¿basta con asignarlos a "General", o se necesita poder dividir un ítem en varios? | Basta con asignarlos a un centro (p. ej. General); no se dividen ítems. | resuelta |
| P-07 | ¿Cuál es la fecha que define el periodo en los reportes: la fecha en que ocurrió la compra (como en los reportes actuales) o la fecha en que se registró en el sistema? | La fecha en que ocurrió, como los reportes actuales. | resuelta |

## Historial

| Fecha | Cambio |
|---|---|
| 2026-11-24 | Borrador inicial a partir del requerimiento del usuario y del análisis de los datos de producción |
| 2026-11-24 | Respuestas del usuario: CRUD de centros (sin siembra), centro al registrar compra, se incluyen tipos de gasto (RF-12 a RF-14, CA-11). Demás preguntas resueltas con la propuesta. Spec aprobada. |
