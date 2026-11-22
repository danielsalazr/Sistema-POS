# Despliegue en Railway (SQLite + volumen)

Un solo servicio Node sirve la API (`/api`) y el frontend compilado (`frontend/dist`).
La base SQLite vive en un volumen persistente. La configuracion de build y arranque esta en `railway.json`.

## 1. Crear el servicio

1. En Railway: **New Project → Deploy from GitHub repo** y elige este repositorio y la rama.
2. En el servicio: **Settings → Volumes → Add volume**, montado en `/data`.
3. En **Variables** agrega:

| Variable | Valor | Para que |
|---|---|---|
| `DATA_DIR` | `/data` | Guarda la base en el volumen (obligatorio, si no se pierde en cada deploy) |
| `AUTH_SECRET` | texto aleatorio largo | Firma los tokens de sesion |
| `ADMIN_PASSWORD` | contrasena fuerte | Contrasena del `admin` solo si la base se crea vacia |
| `RESTORE_KEY` | texto aleatorio largo | Habilita subir una base (`/api/admin/restaurar`). Borrala cuando termines |
| `PRINT_ENABLED` | `false` | No hay impresora en la nube |
| `NODE_ENV` | `production` | Desactiva CORS abierto |

`PORT` lo pone Railway. Para generar valores aleatorios: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

4. **Settings → Networking → Generate Domain** para obtener la URL `https://...up.railway.app`.

Debe correr **una sola replica**: SQLite no admite varias instancias escribiendo el mismo archivo.

## 2. Pasar los datos de la Raspberry

1. Deja de registrar ventas en la Raspberry.
2. Copia la base a tu equipo (ajusta usuario, IP y ruta):
   ```bash
   scp pi@IP_RASPBERRY:~/Desktop/POS/backend/data/sublime-pos.sqlite ./raspberry-final.sqlite
   ```
3. Subela (desde `backend/`). Usa el usuario y contrasena que existan **en la base de Railway en ese momento** (si estaba vacia: `admin` + `ADMIN_PASSWORD`):
   ```bash
   POS_URL=https://TU-APP.up.railway.app POS_USUARIO=admin POS_CONTRASENA=... RESTORE_KEY=... \
     node scripts/subir-bd.js ./raspberry-final.sqlite
   ```
   El servidor valida el archivo, muestra conteos, se reinicia y aplica la base. La anterior queda en el volumen como `sublime-pos.before-restore-<fecha>.sqlite`.
4. Entra a la app con los usuarios de la Raspberry. Las contrasenas se cifran solas al arrancar.
5. **Cambia de inmediato la contrasena de `admin`** en `Usuarios` (icono de candado). La de la Raspberry probablemente es `admin`.
6. Compara con la Raspberry: numero de ventas, total de ventas del mes y resumen de `Caja`.
7. Borra la variable `RESTORE_KEY` en Railway para deshabilitar la restauracion.

## 3. Backups

En `Empresa` → **Descargar backup** se baja una copia consistente de la base (`GET /api/admin/backup`). Hazlo periodicamente y guarda las copias fuera de Railway.
