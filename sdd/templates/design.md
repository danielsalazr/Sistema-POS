---
feature: NNN-nombre-corto
fase: design
estado: borrador        # borrador | en-revision | aprobado
spec: ./spec.md         # debe estar aprobada
creado: AAAA-MM-DD
aprobado:
---

# Design: <Nombre de la feature>

> Describe **CÓMO** se construye lo que pide `spec.md`, respetando `sdd/constitucion.md`. Antes de escribir, lee el código involucrado y `sdd/data-model.md`.

## 1. Resumen de la solución

<!-- 3 a 6 líneas: la idea general y las piezas que se tocan. -->

## 2. Decisiones

<!-- Una entrada por decisión no obvia. Si una decisión rompe un principio de la constitución, se justifica aquí. -->

### D-01: <decisión>

- **Opciones consideradas**: A) … B) …
- **Elegida**: …
- **Por qué**: …
- **Consecuencias**: …

## 3. Modelo de datos

<!-- Borra esta sección si no hay cambios de esquema y escribe "Sin cambios de esquema". -->

### 3.1 Cambios

| Tabla | Cambio | Detalle |
|---|---|---|
| `nueva_tabla` | Nueva | columnas, tipos, PK, FK, `idCompania` |
| `tabla_existente` | Columna nueva | `columna TEXT DEFAULT ''` |

### 3.2 Migración

- [ ] `backend/sql/schema.sql`: `CREATE TABLE IF NOT EXISTS …` para bases nuevas.
- [ ] `backend/src/db.js`: bloque idempotente para la base existente (comprueba con `PRAGMA table_info` antes de alterar).
- [ ] Relleno de datos existentes (backfill): cómo quedan los registros previos.
- [ ] Riesgo para los datos existentes: ninguno / … (explicar).

```sql
-- SQL propuesto
```

### 3.3 Diagrama (si aplica)

```mermaid
erDiagram
```

## 4. API

| Método | Ruta | Request | Response | Errores |
|---|---|---|---|---|
| GET | `/api/...` | query: … | `[{…}]` | 404 … |

Reglas: todas detrás de autenticación, filtradas por `companiaId(req)`, escrituras multi-tabla en `db.transaction`, 401 solo para sesión inválida.

## 5. Interfaz

### 5.1 Pantallas y navegación

<!-- Vistas nuevas o modificadas (frontend/src/views/), rutas (router.js) y entrada en el menú (App.vue). -->

### 5.2 Flujo y bocetos

<!-- Boceto ASCII por paso o estado. Indica cómo se ve en celular (360 px) y en tablet o escritorio. -->

```
┌──────────────────────────┐
│ Paso 1 de N: …           │
│                          │
│ [   botón 48px+   ]      │
└──────────────────────────┘
```

### 5.3 Touch y responsive

- Tamaño mínimo de los objetivos táctiles: …
- Comportamiento por ancho (`xs`, `sm`, `md+`): …
- Estados de carga, vacío y error: …

## 6. Reglas de negocio y cálculos

<!-- Precios, totales, inventario, estados. Cómo se calcula y en qué momento se guarda. -->

## 7. Impacto en caja, inventario y reportes

| Área | Impacto | Cambio necesario |
|---|---|---|
| `/api/caja/resumen` | ninguno / … | |
| `/api/caja/movimientos` | | |
| Inventario (`existencia`) | | |
| Reportes | | |
| Pantalla de pedidos | | |

## 8. Seguridad y permisos

## 9. Compatibilidad

<!-- Qué pasa con las ventas, pantallas y datos existentes. ¿Siguen funcionando igual? -->

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad / impacto | Mitigación |
|---|---|---|

## 11. Trazabilidad

| Requisito / criterio | Dónde se resuelve |
|---|---|
| RF-01 / CA-01 | §3 tabla X, §4 endpoint Y, §5 paso Z |

## Historial

| Fecha | Cambio |
|---|---|
| AAAA-MM-DD | Borrador inicial |
