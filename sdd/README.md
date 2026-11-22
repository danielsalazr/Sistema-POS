# Desarrollo guiado por especificaciones (SDD)

Todo requerimiento nuevo de Dela POS (funcionalidad, cambio de comportamiento o cambio de base de datos) pasa por cuatro fases. Cada fase produce un documento en la carpeta de la feature, y **no se avanza a la siguiente hasta que el usuario apruebe la actual**.

```
spec ──▶ design ──▶ plan ──▶ implementation
 QUÉ y     CÓMO       PASOS      CÓDIGO +
 POR QUÉ   técnico    ordenados  verificación
```

| Fase | Documento | Responde | No incluye |
|---|---|---|---|
| 1. Spec | `spec.md` | ¿Qué problema resolvemos, para quién, y cómo sabremos que está bien? | Tablas, endpoints, componentes |
| 2. Design | `design.md` | ¿Cómo se construye? Datos, API, UI, reglas, riesgos | Orden de trabajo |
| 3. Plan | `plan.md` | ¿En qué tareas pequeñas y en qué orden? ¿Cómo se verifica cada una? | Decisiones de diseño nuevas |
| 4. Implementation | `implementation.md` | ¿Qué se hizo, qué cambió respecto al plan y qué evidencia hay de que funciona? | — |

## Estructura

```
sdd/
├── README.md              ← esta guía
├── constitucion.md        ← principios no negociables del proyecto (leer siempre)
├── data-model.md          ← modelo de datos vigente (fuente de verdad del esquema)
├── templates/             ← plantillas de cada fase
│   ├── spec.md
│   ├── design.md
│   ├── plan.md
│   └── implementation.md
├── scripts/
│   └── sdd.mjs            ← crea features, agrega fases y regenera el índice
└── features/
    ├── README.md          ← índice de features y su estado
    └── NNN-nombre-corto/
        ├── spec.md
        ├── design.md
        ├── plan.md
        └── implementation.md
```

## Cómo arrancar un requerimiento nuevo (instrucciones para el agente)

1. **Leer contexto obligatorio**: `sdd/constitucion.md`, `sdd/data-model.md`, `CLAUDE.md` y `sdd/features/README.md` (para ver si ya existe una feature relacionada o si choca con otra en curso).
2. **Crear la feature**:
   ```bash
   npm run sdd:nueva -- "nombre corto en español"
   ```
   Crea `sdd/features/NNN-nombre-corto/spec.md` a partir de la plantilla y lo registra en el índice.
   Para las fases siguientes: `npm run sdd:fase -- NNN design` (o `plan`, `implementation`). El script se niega si la fase anterior no está `aprobado`.
   Para ver el estado de todo y regenerar el índice: `npm run sdd:estado`.
3. **Fase spec**: llenar `spec.md` a partir de lo que pidió el usuario. Lo que no esté claro va en **Preguntas abiertas**; no se inventan requisitos. Presentar el resumen al usuario y esperar aprobación.
4. **Fase design**: solo con la spec aprobada. Crear `design.md` con `npm run sdd:fase -- NNN design`, leer el código involucrado y diseñar. Si cambia la base de datos, describir el cambio contra `data-model.md` y la migración idempotente. Esperar aprobación.
5. **Fase plan**: `npm run sdd:fase -- NNN plan`, partir el diseño en tareas pequeñas y verificables (cada una deja la app funcionando). Esperar aprobación.
6. **Fase implementation**: `npm run sdd:fase -- NNN implementation`, trabajar en la rama `feat/NNN-nombre-corto`, ejecutar las tareas en orden y registrar en `implementation.md` el avance, las desviaciones y la evidencia de cada criterio de aceptación.
7. **Cierre**: actualizar `sdd/data-model.md` si cambió el esquema, poner `estado: aprobado` en `implementation.md` cuando el usuario la dé por terminada, correr `npm run sdd:estado` y desplegar siguiendo `deploy/GUIA-DESPLIEGUE.md`.

Comandos de Claude Code disponibles (en `.claude/commands/`): `/sdd-nueva`, `/sdd-spec`, `/sdd-design`, `/sdd-plan`, `/sdd-implementar`, `/sdd-estado`.

## Reglas del flujo

- **Puertas de aprobación**: el campo `estado` del encabezado de cada documento pasa por `borrador → en-revision → aprobado`. Solo el usuario aprueba. El agente cambia a `aprobado` únicamente cuando el usuario lo dice explícitamente, y anota la fecha en el campo `aprobado`.
- **Una fase a la vez**: no escribir código durante spec, design o plan. Hacer prototipos para responder una pregunta de diseño está permitido si se descartan y se dice explícitamente.
- **Si una fase posterior descubre un problema en una anterior**: se vuelve a la fase afectada, se corrige el documento, se registra el cambio en su sección **Historial** y se pide aprobación de nuevo. El código nunca contradice silenciosamente a la spec o al design.
- **Trazabilidad**: los requisitos se numeran (`RF-01`, `RNF-01`), los criterios de aceptación (`CA-01`) referencian requisitos, las tareas del plan (`T-01`) referencian requisitos y criterios, y la implementación da evidencia por criterio.
- **Tamaño**: si una spec tiene más de ~10 requisitos funcionales o mezcla objetivos independientes, se divide en varias features (por ejemplo `002-catalogo-ingredientes` antes de `003-toma-pedido-guiada`).
- **Cambios pequeños** (corregir un texto, un bug evidente de una línea) no necesitan SDD. Ante la duda, se pregunta al usuario.

## Estados de una feature (índice)

`spec` · `design` · `plan` · `implementacion` · `terminado` · `pausado` · `descartado`
