---
description: Redacta o ajusta la spec (fase 1 de SDD) de una feature
argument-hint: <NNN> [cambios o respuestas del usuario]
---

Trabaja la fase **spec** de la feature $ARGUMENTS.

1. Lee `sdd/README.md`, `sdd/constitucion.md` y el `spec.md` de la feature en `sdd/features/NNN-*/`.
2. La spec describe QUÉ y POR QUÉ desde el punto de vista del usuario del POS: nada de tablas, endpoints ni componentes.
3. Incorpora las respuestas del usuario: mueve las preguntas respondidas a requisitos o criterios y marca la pregunta como `resuelta` con su respuesta. No inventes requisitos; lo dudoso queda como pregunta abierta.
4. Comprueba la calidad:
   - requisitos numerados (RF-xx, RNF-xx);
   - cada criterio de aceptación (CA-xx) se puede verificar usando la app y referencia requisitos;
   - todo RF tiene al menos un CA;
   - los RNF cubren touch y responsive (constitución, principio 2).
5. Registra el cambio en Historial, deja `estado: en-revision` y presenta un resumen con lo que cambió y las preguntas que siguen abiertas.
6. Solo si el usuario aprueba explícitamente: `estado: aprobado`, `aprobado: <fecha de hoy>` y `npm run sdd:estado`. No marques como aprobada una spec con preguntas abiertas que cambien el alcance.
