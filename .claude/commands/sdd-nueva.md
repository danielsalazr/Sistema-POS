---
description: Inicia un requerimiento nuevo con SDD (crea la feature y redacta la spec)
argument-hint: <descripción del requerimiento>
---

Vas a iniciar un requerimiento nuevo siguiendo el flujo SDD del proyecto.

Requerimiento del usuario: $ARGUMENTS

1. Lee `sdd/README.md`, `sdd/constitucion.md`, `sdd/data-model.md` y `sdd/features/README.md`. Si ya existe una feature que cubre esto, o que choca con ello, dilo y pregunta antes de crear otra.
2. Si el requerimiento mezcla objetivos independientes o es muy grande, propón dividirlo en varias features y espera la respuesta.
3. Elige un nombre corto en español y ejecuta `npm run sdd:nueva -- "<nombre>"`.
4. Redacta el `spec.md` creado siguiendo `/sdd-spec`: solo QUÉ y POR QUÉ, sin inventar requisitos; todo lo dudoso va en Preguntas abiertas.
5. Deja `estado: en-revision`, ejecuta `npm run sdd:estado` y presenta al usuario un resumen (objetivo, requisitos, criterios, preguntas abiertas). Pídele que responda las preguntas y apruebe. No avances a design.
