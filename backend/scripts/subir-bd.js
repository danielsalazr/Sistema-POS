// Sube un archivo .sqlite a un servidor Dela POS desplegado y lo deja como base activa.
// Uso (desde backend/):
//   POS_URL=https://tu-app.up.railway.app POS_USUARIO=admin POS_CONTRASENA=... RESTORE_KEY=... \
//     node scripts/subir-bd.js ruta/al/archivo.sqlite
import fs from 'node:fs';

const [archivo] = process.argv.slice(2);
const { POS_URL, POS_USUARIO, POS_CONTRASENA, RESTORE_KEY } = process.env;

if (!archivo || !POS_URL || !POS_USUARIO || !POS_CONTRASENA || !RESTORE_KEY) {
  console.error('Uso: POS_URL=... POS_USUARIO=... POS_CONTRASENA=... RESTORE_KEY=... node scripts/subir-bd.js archivo.sqlite');
  process.exit(1);
}

const baseUrl = POS_URL.replace(/\/+$/, '');

async function main() {
  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: POS_USUARIO, contrasena: POS_CONTRASENA })
  });
  const sesion = await login.json().catch(() => ({}));
  if (!login.ok) throw new Error(`Login fallido: ${sesion.error || login.status}`);

  const contenido = fs.readFileSync(archivo);
  console.log(`Subiendo ${archivo} (${(contenido.length / 1024).toFixed(1)} KB)...`);
  const respuesta = await fetch(`${baseUrl}/api/admin/restaurar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      Authorization: `Bearer ${sesion.token}`,
      'x-restore-key': RESTORE_KEY
    },
    body: contenido
  });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.error || `HTTP ${respuesta.status}`);
  console.log(resultado.mensaje);
  console.table(resultado.resumen);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
