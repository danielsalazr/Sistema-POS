---
description: Parte el design aprobado en tareas verificables (fase 3 de SDD)
argument-hint: <NNN>
---

Trabaja la fase **plan** de la feature $ARGUMENTS.

1. Verifica que `design.md` esté `estado: aprobado`. Si no lo está, detente y dilo.
2. Si no existe `plan.md`, créalo con `npm run sdd:fase -- <NNN> plan`.
3. Divide el design en tareas T-xx pequeñas y ordenadas (datos → backend → frontend → integración → documentación). Cada tarea:
   - deja la app funcionando;
   - indica qué RF y CA cubre, sus dependencias y los archivos que toca;
   - trae una **verificación concreta**: comando, petición HTTP o acción en la UI con el resultado esperado.
4. Incluye la preparación (rama `feat/NNN-...` y backup de producción como base de pruebas), la verificación final por criterio y por dispositivo, el despliegue según `deploy/GUIA-DESPLIEGUE.md` y el plan de reversa.
5. No tomes decisiones de diseño nuevas. Si hace falta una, propón actualizar `design.md`.
6. Deja `estado: en-revision` y presenta las tareas. Solo con aprobación explícita: `estado: aprobado`, la fecha y `npm run sdd:estado`.
