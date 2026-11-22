# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Dela POS": a point-of-sale system for a small restaurant (initial company "Dela Crepes"), historically deployed on a Raspberry Pi behind Nginx/Apache (`deploy/README.md`), now deployed on Railway as a single service with SQLite on the volume `delapos-volume` mounted at `/data`. Infra is defined in `.railway/railway.ts` (applied only via `railway config plan/apply`, never by deploys). Deploy workflow and data-safety rules: `deploy/GUIA-DESPLIEGUE.md`. Never remove/rename/shrink the volume in `railway.ts`, change `DATA_DIR`, or raise replicas above 1. Node + Express + better-sqlite3 backend, Vue 3 + Vuetify 3 frontend (plain JS, no TypeScript). Code, identifiers, UI text and commit messages are in Spanish.

## Commands

From the repo root:

```bash
npm run install:all     # install backend + frontend deps
npm run dev             # backend (node --watch) + frontend (vite) via concurrently
npm run dev:backend
npm run dev:frontend
```

- Frontend build: `npm run build --prefix frontend` (outputs `frontend/dist`).
- Production (Railway): root `npm run build` (installs both + builds frontend) then `npm start`. When `frontend/dist` exists, Express serves it with an SPA fallback, so one process serves UI and API.
- Run the backend against a throwaway DB: `DATA_DIR=/some/dir PORT=3999 node backend/src/server.js`.
- There are no tests, linter or formatter configured.

**Ports:** `server.js` defaults to `PORT=3020` and the Vite dev proxy forwards `/api` to `VITE_API_TARGET` or `http://localhost:3020`. The README and deploy configs say 3001; production runs with `PORT=3001` explicitly. Keep the two in sync if you change either.

Backend env vars: `DATA_DIR` (folder holding `sublime-pos.sqlite`, default `backend/data`), `AUTH_SECRET` (token HMAC key; if unset one is generated and stored in `comun`), `ADMIN_PASSWORD` (seed password for `admin` on an empty DB), `RESTORE_KEY` (enables `POST /api/admin/restaurar`), `PRINT_ENABLED=false` (print endpoint becomes a no-op returning `deshabilitada: true`), `POS_PRINTER` (CUPS printer, default `EPSON_TM_T20II`), `CORS_ORIGIN`, `NODE_ENV=production` (disables open CORS).

## Architecture

### Backend (`backend/src`)
- `server.js` is a single ~2000-line Express file with all routes under `/api/*`, plus ticket/kitchen-order (comanda) text generation and printing. Printing shells out to `lp -d $POS_PRINTER` with ESC/POS bytes, so it only works on Linux/CUPS hosts.
- `db.js` opens `backend/data/sublime-pos.sqlite` (gitignored, created on first run), runs `sql/schema.sql` on every startup (all `CREATE TABLE IF NOT EXISTS`), then runs **ad-hoc migrations**: `PRAGMA table_info` checks followed by `ALTER TABLE ADD COLUMN`, or rename/recreate/copy for constraint changes. It also seeds defaults (company 1, client 1 "Mostrador", user `admin`/`admin`, permissions, payment methods). To change the schema, update `schema.sql` for fresh DBs **and** add an idempotent migration block in `db.js` for existing DBs.
- Multi-tenancy: almost every table has `idCompania`. The frontend sends the active company in the `x-compania-id` header; `companiaId(req)` reads it (default 1). Every query on company-scoped tables must filter by it.
- Writes that touch several tables (sales, purchases, payments, voids) are wrapped in `db.transaction(...)`. Errors are thrown with `error.status` and turned into `{ error }` JSON by the final error middleware.
- List endpoints take `?limite=N` (or `limite=todos`) via `queryLimit`.
- **Auth** (`auth.js`): login returns an HMAC-signed token (`payload.signature`, 7-day default TTL). A middleware on `/api` requires `Authorization: Bearer <token>` for everything except `/api/salud` and `/api/login`, and sets `req.usuario`. Passwords are scrypt hashes (`scrypt:salt:hash`); `db.js` hashes any plaintext password at startup. Only use HTTP 401 for invalid sessions: the frontend logs out on any 401, so wrong secondary passwords (delete password, current password) return 403.
- **Backup/restore**: `GET /api/admin/backup` streams a `db.backup()` copy. `POST /api/admin/restaurar` (token + `x-restore-key`) validates an uploaded SQLite file, writes `restore-pending.sqlite` and exits; on next boot `db.js` swaps it in, keeping the old file as `sublime-pos.before-restore-*.sqlite`. Client: `backend/scripts/subir-bd.js`. Exits with code 1 so Railway restarts it under any restart policy.

### Dates (important)
All datetimes are stored as local strings `YYYY-MM-DD HH:MM:SS` in `America/Bogota`, never UTC/ISO. Use `localDateTimeSql`/`nowSql`/`normalizeDateTimeInput` from `backend/src/utils.js` and the helpers in `frontend/src/dates.js`. Sales and purchases have two dates: `fecha` (when the transaction actually happened, entered as a date only and stored as `YYYY-MM-DD 00:00:00`) and `fechaRegistro` (when it was entered into the system). Reports filter by `date(fecha)`.

### Domain flows
- **Sales** (`ventas_contado` + `productos_vendidos` + `pagos_ventas`): creating a sale decreases `productos.existencia`; voiding (DELETE) restores it. A sale can have several payments or none. `estadoPago` (`PENDIENTE`/`PARCIAL`/`PAGADA`) is derived from `monto` vs `pago`, and later payments go through `POST /api/ventas/contado/:id/pagos`. `estadoPreparacion`/`fechaCumplido` power the public kitchen display `/pantalla-pedidos`.
- **Purchases** (`compras` + `productos_comprados`): each line is either a product (raises stock and updates cost/price) or a free-text expense line (`idProducto` NULL).
- **Préstamos y aportes**: loans and contributions between the business, partners and third parties (`personas_financieras`), with partial settlements ("subsanaciones") that drive `PENDIENTE`/`PARCIAL`/`SUBSANADO`. Deleting one requires a password whose hash is stored per company (`PRESTAMOS_APORTES_DELETE_PASSWORD_HASH`).
- **Caja** (`/api/caja/resumen`, `/api/caja/movimientos`) adds up cash flow from sales payments, purchases, ingresos/egresos and préstamos/aportes. If you change how any of those are stored, update these queries too.
- Per-company settings live in the key/value table `comun` (`getCompanySetting`/`setCompanySetting`).

### Frontend (`frontend/src`)
- One `.vue` file per module in `views/`, routes in `router.js`, nav menu in `App.vue`. Views call the backend through `api.js`, which uses relative `/api` paths and adds the company header.
- `session.js` keeps the token, user, permissions and active company in a reactive object persisted to `localStorage` (`dela-pos-session`). `api.js` sends the token; on 401 it clears the session and redirects to `/login?redirect=...`. All routes except `/login` require a token (including the kiosk `/pantalla-pedidos`). Permissions are returned at login but not enforced per route or on the backend; any logged-in user can do everything, across all companies.

### Scripts and one-off files
- `backend/scripts/*.js` are one-off data fixes and imports that run directly against the live DB (`node scripts/<file>.js` from `backend/`). They import `../src/db.js`, which also runs the migrations. Imports guard against re-running with a marker key in `comun`, and each has a matching `validate-*` script.
- `backend/.tmp-*.cjs` are throwaway read-only analysis scripts (CommonJS, relative path `data/sublime-pos.sqlite`, so run them from `backend/`).
