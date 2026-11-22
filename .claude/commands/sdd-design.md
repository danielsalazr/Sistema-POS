---
description: Redacta el design técnico (fase 2 de SDD) de una feature con spec aprobada
argument-hint: <NNN> [indicaciones]
---

Trabaja la fase **design** de la feature $ARGUMENTS.

1. Verifica que `spec.md` esté `estado: aprobado`. Si no lo está, detente y dilo.
2. Si no existe `design.md`, créalo con `npm run sdd:fase -- <NNN> design`.
3. Lee `sdd/constitucion.md`, `sdd/data-model.md`, `CLAUDE.md` y **el código que se va a tocar** (`backend/src/server.js`, `backend/src/db.js`, las vistas involucradas). Diseña sobre lo que existe, no sobre suposiciones.
4. Completa todas las secciones de la plantilla. En especial:
   - **Decisiones** con alternativas y el porqué;
   - **Modelo de datos**: cambios aditivos, SQL de `schema.sql`, bloque idempotente de `db.js` y backfill;
   - **API** con errores y filtro por `idCompania`;
   - **Interfaz** con bocetos por paso para 360 px y para tablet o escritorio;
   - **Impacto en caja, inventario y reportes**;
   - **Trazabilidad**: cada RF y CA resuelto en alguna sección.
5. Si el diseño revela un problema en la spec, no lo resuelvas en silencio: propón el cambio en la spec.
6. No escribas código de la aplicación. Deja `estado: en-revision` y presenta un resumen con las decisiones clave y los riesgos. Solo con aprobación explícita: `estado: aprobado`, la fecha y `npm run sdd:estado`.
