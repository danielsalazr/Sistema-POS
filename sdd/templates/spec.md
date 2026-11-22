---
feature: NNN-nombre-corto
fase: spec
estado: borrador        # borrador | en-revision | aprobado
creado: AAAA-MM-DD
aprobado:               # fecha en que el usuario aprobó
---

# Spec: <Nombre de la feature>

> Describe **QUÉ** se necesita y **POR QUÉ**, desde el punto de vista de quien usa el POS. No menciones tablas, endpoints, componentes ni librerías; eso va en `design.md`.

## 1. Contexto y problema

<!-- ¿Qué pasa hoy? ¿Qué duele o qué falta? Usa ejemplos reales del negocio. -->

## 2. Objetivo

<!-- Una o dos frases con el resultado esperado. Si se puede medir, inclúyelo
     (p. ej. "tomar un pedido de 3 productos personalizados en menos de 1 minuto"). -->

## 3. Usuarios y dispositivos

| Usuario | Qué hace con esta feature | Dispositivo principal |
|---|---|---|
| <!-- Cajero / quien toma pedidos --> | | <!-- tablet / celular / computador --> |

## 4. Escenarios de uso

<!-- Historias concretas paso a paso. Incluye el caso normal y los casos difíciles. -->

1. **<Escenario principal>**: Como <usuario>, quiero <acción> para <beneficio>.
   - Paso a paso: …

## 5. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | El sistema debe … | Debe |
| RF-02 | | Debería / Podría |

## 6. Requisitos no funcionales

<!-- Revisa sdd/constitucion.md: touch y responsive, multiempresa, fechas, caja. -->

| ID | Requisito |
|---|---|
| RNF-01 | Usable con el dedo en celular (desde 360 px), tablet y computador. |
| RNF-02 | |

## 7. Criterios de aceptación

<!-- Verificables por una persona usando la app. Cada uno referencia requisitos. -->

| ID | Dado / Cuando / Entonces | Cubre |
|---|---|---|
| CA-01 | **Dado** … **cuando** … **entonces** … | RF-01 |

## 8. Fuera de alcance

<!-- Lo que explícitamente NO se hace en esta feature (y si va en otra posterior). -->

-

## 9. Impacto esperado

<!-- Solo a alto nivel, sin diseño. Marca lo que aplique y explica en una línea. -->

- [ ] Cambia o agrega información guardada (datos nuevos o existentes)
- [ ] Afecta dinero, caja, inventario o reportes
- [ ] Afecta pantallas existentes: …
- [ ] Requiere migrar o completar datos existentes

## 10. Preguntas abiertas

<!-- Todo lo que no está claro. No se pasa a design con preguntas que cambien el alcance. -->

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| P-01 | | | abierta |

## Historial

| Fecha | Cambio |
|---|---|
| AAAA-MM-DD | Borrador inicial |
