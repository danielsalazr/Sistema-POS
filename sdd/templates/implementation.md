---
feature: NNN-nombre-corto
fase: implementation
estado: en-progreso     # en-progreso | en-revision | aprobado
plan: ./plan.md         # debe estar aprobado
rama: feat/NNN-nombre-corto
iniciado: AAAA-MM-DD
terminado:
desplegado:             # fecha y commit desplegado en producción
---

# Implementación: <Nombre de la feature>

> Bitácora de la ejecución del `plan.md`. Se actualiza **mientras** se trabaja, no al final.

## 1. Avance por tarea

| Tarea | Estado | Commit | Notas |
|---|---|---|---|
| T-01 | pendiente / en curso / hecha | `abc1234` | |
| T-02 | | | |

## 2. Desviaciones del plan o del design

<!-- Todo lo que se hizo distinto a lo planeado y por qué. Si cambia el comportamiento
     o el modelo de datos, se actualizó el documento correspondiente (indicar cuál). -->

| Fecha | Qué cambió | Por qué | Documento actualizado |
|---|---|---|---|

## 3. Evidencia de verificación

<!-- Una fila por criterio de aceptación de la spec. Evidencia concreta: petición y respuesta,
     pasos realizados, captura (ruta), totales comparados, etc. -->

| Criterio | Resultado | Evidencia |
|---|---|---|
| CA-01 | ✅ / ❌ | |

Verificaciones generales:

- [ ] Migración idempotente: el backend arrancó dos veces contra la copia de producción.
- [ ] `Caja` y `Reportes` de un periodo anterior iguales antes y después.
- [ ] Probado en celular (360 px), tablet y escritorio.
- [ ] Sin errores en la consola del navegador ni en los logs del backend.

## 4. Documentación actualizada

- [ ] `sdd/data-model.md` (tablas, diagrama e historial), si cambió el esquema
- [ ] `CLAUDE.md`, si cambió la arquitectura o los comandos
- [ ] `sdd/features/README.md`, con el estado de la feature

## 5. Despliegue

| Paso | Hecho | Notas |
|---|---|---|
| PR / merge a `main` | | |
| Backup previo descargado | | nombre del archivo |
| `railway up` | | id del deployment |
| Verificación en producción | | |

## 6. Pendientes y seguimiento

<!-- Lo que quedó fuera, deuda técnica o ideas para features futuras. -->
