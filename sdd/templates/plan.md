---
feature: NNN-nombre-corto
fase: plan
estado: borrador        # borrador | en-revision | aprobado
design: ./design.md     # debe estar aprobado
rama: feat/NNN-nombre-corto
creado: AAAA-MM-DD
aprobado:
---

# Plan: <Nombre de la feature>

> Parte el `design.md` aprobado en tareas pequeñas y ordenadas. Cada tarea deja la app funcionando y se puede verificar sola. Aquí no se toman decisiones de diseño nuevas; si aparece una, se vuelve a `design.md`.

## 1. Preparación

- [ ] Rama `feat/NNN-nombre-corto` creada desde `main` actualizado.
- [ ] Backup de producción descargado (`Empresa → Descargar backup`) en una carpeta de pruebas, por ejemplo `C:\pos-pruebas\sublime-pos.sqlite`.
- [ ] Backend local contra esa copia: `$env:DATA_DIR="C:\pos-pruebas"; npm run dev:backend`.

## 2. Tareas

<!-- Orden habitual: datos → backend → frontend → integración → documentación.
     Tamaño: que se pueda hacer y revisar en una sesión. -->

### T-01: <título>

- **Cubre**: RF-01, CA-01
- **Depende de**: —
- **Archivos**: `backend/src/db.js`, `backend/sql/schema.sql`
- **Pasos**:
  1. …
- **Verificación**: <cómo se comprueba que quedó bien; un comando, una petición o una acción en la UI con el resultado esperado>

### T-02: <título>

- **Cubre**:
- **Depende de**: T-01
- **Archivos**:
- **Pasos**:
- **Verificación**:

### T-NN: Documentación

- **Archivos**: `sdd/data-model.md` (si cambió el esquema), `CLAUDE.md` (si cambió la arquitectura), `sdd/features/README.md`
- **Verificación**: los documentos reflejan lo construido.

## 3. Verificación final

<!-- No hay tests automáticos: la verificación es manual y con evidencia. -->

| Criterio | Cómo se verifica | Dispositivo / ancho |
|---|---|---|
| CA-01 | | celular 360 px |
| CA-02 | | tablet |

Además:

- [ ] Con la base de prueba, el backend arranca dos veces sin errores (migración idempotente).
- [ ] Los totales de `Caja` y de `Reportes` de un periodo anterior no cambian, salvo que la spec diga lo contrario.
- [ ] Sin errores en la consola del navegador.

## 4. Despliegue

Según `deploy/GUIA-DESPLIEGUE.md`:

1. PR y merge a `main`.
2. Backup de producción.
3. `railway up` desde `main` limpio.
4. Verificación posterior: <qué revisar en producción>.

**Plan de reversa**: <redeploy del despliegue anterior; si hubo migración de datos, restaurar el backup con `subir-bd.js`>.

## Historial

| Fecha | Cambio |
|---|---|
| AAAA-MM-DD | Borrador inicial |
