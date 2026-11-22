# Guia: desplegar nuevas funcionalidades sin perder datos

Produccion: https://delapos-production.up.railway.app (proyecto Railway `DelaPOS`, servicio `DelaPOS`).

## Por que un despliegue normal no borra datos

- La base es un archivo SQLite en el **volumen** `delapos-volume`, montado en `/data` (`DATA_DIR=/data`).
- Cada despliegue crea un contenedor nuevo con el codigo nuevo. El disco del contenedor se descarta, pero **el volumen se conserva** y se vuelve a montar.
- Al arrancar, `backend/src/db.js` ejecuta `schema.sql` (solo `CREATE TABLE IF NOT EXISTS`) y las migraciones idempotentes. No borra nada.

Los datos solo se pierden por:

1. Borrar el volumen o el servicio en Railway, o desmontar el volumen.
2. Cambiar o quitar la variable `DATA_DIR`. La app crearia una base nueva y vacia fuera del volumen, que se pierde en el siguiente despliegue.
3. Un cambio de esquema en `db.js` que borre o recree tablas sin copiar los datos.
4. Ejecutar `railway config apply` con un plan que borre o reduzca el volumen.
5. Restaurar un backup viejo encima de la base actual.

## Flujo para cada funcionalidad nueva

### 1. Desarrollar en una rama

```bash
git checkout main && git pull
git checkout -b feat/nombre-de-la-funcionalidad
npm run dev
```

### 2. Probar con una copia real de produccion

1. En produccion: `Empresa` → **Descargar backup**.
2. Guardalo en una carpeta de pruebas, por ejemplo `C:\pos-pruebas\sublime-pos.sqlite`. El nombre del archivo debe ser exactamente ese.
3. Arranca el backend apuntando a esa carpeta:
   ```powershell
   $env:DATA_DIR="C:\pos-pruebas"; npm run dev:backend
   ```
   En otra terminal: `npm run dev:frontend`.
4. Prueba la funcionalidad con datos reales. **Si tocaste la base de datos**, para el backend y vuelvelo a arrancar: debe arrancar bien la segunda vez y los totales de `Caja` deben seguir iguales.

### 3. Integrar a `main`

```bash
git add -A && git commit -m "descripcion del cambio"
git push -u origin feat/nombre-de-la-funcionalidad
```

Abre el Pull Request en GitHub y, cuando este revisado, haz el merge a `main`.

### 4. Desplegar

```bash
git checkout main && git pull
git status              # debe decir "working tree clean"
```

1. **Backup antes de desplegar**: `Empresa` → **Descargar backup**. Guardalo fuera de Railway.
2. Despliega:
   ```bash
   railway up
   ```
   `railway up` sube **la carpeta tal como esta en tu equipo**, incluidos los cambios sin commit. Por eso siempre se despliega desde `main` limpio.
3. Verifica:
   - `https://delapos-production.up.railway.app/api/salud` responde `{"ok":true}`.
   - Puedes entrar y las ventas recientes siguen ahi.
   - `railway logs` no muestra errores.

### 5. Si algo sale mal

- **El codigo falla y los datos estan bien**: en el dashboard de Railway → Deployments → en el despliegue anterior, **Redeploy**. O revierte el cambio (`git revert <commit>`, push a `main`) y `railway up`.
- **Los datos quedaron mal** (por ejemplo, por una migracion erronea):
  1. Pon en Railway una variable temporal `RESTORE_KEY` con un texto aleatorio largo.
  2. Desde `backend/`:
     ```bash
     POS_URL=https://delapos-production.up.railway.app POS_USUARIO=admin POS_CONTRASENA=... RESTORE_KEY=... \
       node scripts/subir-bd.js C:\ruta\al\backup.sqlite
     ```
  3. Borra `RESTORE_KEY` en Railway.

  La restauracion reemplaza la base completa: se pierde lo registrado despues de ese backup. La base reemplazada queda en el volumen como `sublime-pos.before-restore-<fecha>.sqlite`.

## Reglas para cambios de base de datos

Cada cambio de esquema va en **dos sitios**:

1. `backend/sql/schema.sql`, para bases nuevas.
2. Un bloque **idempotente** en `backend/src/db.js` para la base existente. Debe poder ejecutarse en cada arranque sin hacer nada la segunda vez:

```js
const ventasColumns = db.prepare('PRAGMA table_info(ventas_contado)').all().map((c) => c.name);
if (!ventasColumns.includes('nuevaColumna')) {
  db.exec("ALTER TABLE ventas_contado ADD COLUMN nuevaColumna TEXT DEFAULT ''");
}
```

- Agregar tablas y columnas con valor por defecto es seguro.
- **Nunca** `DROP TABLE`, `DROP COLUMN` ni `DELETE` masivo en `db.js`.
- Para cambiar una restriccion (UNIQUE, NOT NULL): renombrar la tabla, crear la nueva, copiar con `INSERT ... SELECT` y solo despues borrar la vieja. Hay ejemplos en `db.js` (`medios_pago`, `productos_comprados`).
- Prueba siempre con la copia de produccion del paso 2.
- Las correcciones de datos puntuales van en `backend/scripts/`, con un marcador en la tabla `comun` para que no se ejecuten dos veces, y con su script de validacion.

## Configuracion de Railway (`.railway/railway.ts`)

- Describe el servicio, el build, el healthcheck y el **volumen**. Railway no lo lee en cada despliegue; solo se aplica con comandos explicitos.
- Para cambiar algo de infraestructura:
  ```bash
  railway config plan     # solo lectura: muestra lo que cambiaria
  railway config apply    # aplica
  ```
  Si el plan muestra un **delete** o un cambio de **volumen** (`delapos-volume`), **no lo apliques**. Nunca uses `--confirm-destructive`.
- Las variables (secretos) no estan en el archivo. Se manejan en el dashboard o con `railway variables`.
- **En Windows** el SDK no encuentra la CLI instalada por npm y falla con "requires Railway CLI 5.42.1 or newer". Ejecuta los comandos desde PowerShell apuntando al `.exe`:
  ```powershell
  $env:_ = "$env:APPDATA\npm\node_modules\@railway\cli\bin\railway.exe"
  & $env:_ config plan
  & $env:_ config apply
  ```

## Nunca

- Borrar o desmontar `delapos-volume`, ni borrar el servicio `DelaPOS`.
- Cambiar `DATA_DIR`.
- Subir las replicas a mas de 1 (SQLite admite un solo proceso escribiendo).
- Dejar configurada `RESTORE_KEY` despues de usarla.
- Desplegar con `railway up` desde una rama sin merge o con cambios sin commit.
- Registrar ventas en la Raspberry: ya no se sincroniza con produccion.

## Backups

Descarga uno al menos una vez por semana y siempre antes de desplegar: `Empresa` → **Descargar backup**. Guarda las copias fuera de Railway, por ejemplo en Google Drive.
