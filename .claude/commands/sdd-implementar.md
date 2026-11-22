---
description: Ejecuta el plan aprobado de una feature y registra la evidencia (fase 4 de SDD)
argument-hint: <NNN> [T-xx desde donde continuar]
---

Trabaja la fase **implementation** de la feature $ARGUMENTS.

1. Verifica que `plan.md` esté `estado: aprobado`. Si no lo está, detente y dilo.
2. Si no existe `implementation.md`, créalo con `npm run sdd:fase -- <NNN> implementation`. Trabaja en la rama `feat/NNN-...` (créala desde `main` actualizado si no existe).
3. Ejecuta las tareas en orden. Por cada una:
   - implementa solo lo que dice la tarea;
   - ejecuta su verificación;
   - actualiza la tabla de avance de `implementation.md` (estado y commit).
4. Respeta `sdd/constitucion.md`. Prueba los cambios de datos contra una **copia** de la base (`DATA_DIR` apuntando a una carpeta de pruebas), nunca contra `backend/data` ni contra producción, y arranca el backend dos veces para confirmar la idempotencia.
5. Si algo no sale como dice el plan o el design: registra la desviación y, si cambia comportamiento o datos, actualiza el documento afectado y avisa al usuario antes de seguir.
6. Al terminar:
   - completa la evidencia por criterio de aceptación;
   - actualiza `sdd/data-model.md` (tablas, diagrama e historial) si cambió el esquema, y `CLAUDE.md` si cambió la arquitectura;
   - ejecuta `npm run sdd:estado`;
   - presenta el resultado.
7. Haz commits solo cuando el usuario lo pida. **No despliegues**: el despliegue lo decide el usuario siguiendo `deploy/GUIA-DESPLIEGUE.md`.
