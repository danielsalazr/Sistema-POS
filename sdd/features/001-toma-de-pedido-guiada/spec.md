---
feature: 001-toma-de-pedido-guiada
fase: spec
estado: borrador        # borrador | en-revision | aprobado
creado: 2026-11-22
aprobado:               # fecha en que el usuario aprobó
---

# Spec: Toma de pedido guiada

> Describe **QUÉ** se necesita y **POR QUÉ**, desde el punto de vista de quien usa el POS. No menciones tablas, endpoints, componentes ni librerías; eso va en `design.md`.
>
> **Borrador inicial** escrito a partir de la descripción del usuario del 2026-11-22. El desarrollo se hará más adelante; antes hay que resolver las preguntas abiertas.

## 1. Contexto y problema

Hoy el pedido se toma en una sola pantalla de ventas: se busca el producto, se agrega al carrito y cualquier personalización (ingredientes, salsas, toppings, adiciones) se escribe como nota de texto libre o se agrega como un producto aparte. En un celular o una tablet, y con el dedo, esa pantalla resulta saturada, y quien toma el pedido puede olvidar preguntar por ingredientes o adiciones.

## 2. Objetivo

Que la persona que toma el pedido lo arme paso a paso, con una decisión por pantalla, como en los quioscos de autoservicio de comida rápida: producto → ingredientes → adiciones → resumen. Así el pedido queda completo y bien registrado con menos esfuerzo y menos errores, en computador, tablet o celular.

## 3. Usuarios y dispositivos

| Usuario | Qué hace con esta feature | Dispositivo principal |
|---|---|---|
| Quien toma pedidos (cajero/mesero) | Arma el pedido del cliente paso a paso y lo registra | Tablet o celular (touch); también computador |
| Cocina | Recibe el pedido con sus personalizaciones claras | Pantalla de pedidos |

## 4. Escenarios de uso

1. **Pedido de un producto personalizado**: como cajero, quiero elegir el producto, luego sus ingredientes (toppings, salsas, ingredientes del producto) y luego las adiciones, cada cosa en su propio paso, para no olvidar nada y no saturar la pantalla.
2. **Pedido con varios productos**: al terminar un producto, quiero agregar otro y repetir los pasos, y al final ver el pedido completo antes de registrarlo.
3. **Corrección**: quiero volver a un paso anterior o editar un producto ya agregado sin empezar de cero.

## 5. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | La toma del pedido se hace en pasos secuenciales, mostrando una sola decisión por pantalla. | Debe |
| RF-02 | Paso de selección del producto. | Debe |
| RF-03 | Paso de selección de ingredientes del producto (toppings, salsas, ingredientes propios del producto). | Debe |
| RF-04 | Paso de adiciones (extras opcionales). | Debe |
| RF-05 | Se puede volver a pasos anteriores sin perder lo elegido. | Debe |
| RF-06 | Al terminar un producto se puede agregar otro al mismo pedido. | Debe |
| RF-07 | Antes de registrar, se ve un resumen del pedido completo (productos, personalizaciones y total), y desde ahí se puede editar o quitar cada producto. | Debe |
| RF-08 | Las personalizaciones quedan registradas en la venta y son visibles para cocina y en el detalle de la venta. | Debe |

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Diseñada para touch: funciona en celular desde 360 px, en tablet y en computador, con botones grandes (mínimo 48 px). |
| RNF-02 | Ninguna pantalla del flujo requiere scroll horizontal. Cada paso muestra solo lo necesario para esa decisión. |
| RNF-03 | Las ventas existentes, los reportes y la caja siguen funcionando y mostrando los mismos valores. |

## 7. Criterios de aceptación

| ID | Dado / Cuando / Entonces | Cubre |
|---|---|---|
| CA-01 | **Dado** un producto con ingredientes y adiciones configurados, **cuando** el cajero lo agrega en una tablet, **entonces** pasa por los pasos producto → ingredientes → adiciones, cada uno en su propia pantalla. | RF-01..RF-04, RNF-01 |
| CA-02 | **Dado** que el cajero está en el paso de adiciones, **cuando** vuelve al paso de ingredientes, **entonces** ve lo que ya había elegido. | RF-05 |
| CA-03 | **Dado** un pedido con 2 productos personalizados, **cuando** el cajero llega al resumen, **entonces** ve ambos productos con sus personalizaciones y el total correcto, y puede editar cualquiera. | RF-06, RF-07 |
| CA-04 | **Dado** un pedido registrado, **cuando** cocina abre la pantalla de pedidos, **entonces** ve cada producto con sus ingredientes y adiciones. | RF-08 |
| CA-05 | **Dado** un celular de 360 px, **cuando** se toma un pedido completo, **entonces** no hay scroll horizontal y todos los botones se pueden tocar con el dedo. | RNF-01, RNF-02 |

## 8. Fuera de alcance

- Autoservicio por parte del cliente final (el flujo lo usa el personal).
- Impresión de comandas (pendiente por resolver en la nube).

## 9. Impacto esperado

- [x] Cambia o agrega información guardada: hoy no existe la noción de ingredientes ni de adiciones por producto.
- [x] Afecta dinero, caja, inventario o reportes: las adiciones pueden cambiar el precio.
- [x] Afecta pantallas existentes: Ventas, Productos y Pantalla de pedidos.
- [ ] Requiere migrar o completar datos existentes: por definir (P-06).

## 10. Preguntas abiertas

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| P-01 | ¿Los productos se agrupan por categorías (crepes, burritos, bebidas…) y el primer paso es elegir la categoría? | | abierta |
| P-02 | Ingredientes: ¿se **quitan** de una receta base ("sin cebolla"), se **eligen** de una lista ("elige 2 salsas"), o ambas? ¿Hay mínimos y máximos por grupo? | | abierta |
| P-03 | ¿Los ingredientes tienen precio, o solo las adiciones? | | abierta |
| P-04 | Además de ingredientes y adiciones, ¿hay otros pasos ("y demás"), como tamaño, término, bebida o combo? | | abierta |
| P-05 | ¿Ingredientes y adiciones deben descontar inventario? | | abierta |
| P-06 | ¿Qué pasa con los productos actuales: todos pasan por el flujo, o solo los que tengan ingredientes y adiciones configurados (los demás se agregan directo)? | | abierta |
| P-07 | ¿Quién y dónde configura los ingredientes y adiciones de cada producto? ¿Hace falta una pantalla de administración? (Podría ser una feature previa e independiente.) | | abierta |
| P-08 | ¿Este flujo reemplaza la pantalla de ventas actual o convive con ella, por ejemplo para ventas rápidas? | | abierta |
| P-09 | ¿El cobro sigue igual que hoy (pago inicial opcional y pagos múltiples) al final del flujo? | | abierta |

## Historial

| Fecha | Cambio |
|---|---|
| 2026-11-22 | Borrador inicial a partir de la descripción del usuario |
