// Feature 002 (opción b aprobada 2026-11-24): clasifica por palabras clave los renglones vendidos
// sin producto (idProducto = 0, ventas importadas de mayo de 2026) que siguen sin línea.
//
// - Busca las líneas POR NOMBRE en la compañía (deben existir; las crea el usuario en Clasificación).
// - Un renglón se clasifica solo si sus palabras clave apuntan a UNA sola línea.
//   Si no coincide con ninguna o coincide con varias (renglón mixto), queda en "Sin línea".
// - Solo toca renglones con idLineaProducto NULL: es idempotente y no altera montos.
// - Por defecto es una simulación. Para aplicar: --aplicar
//
// Uso (desde backend/):
//   node scripts/clasificar-renglones-sin-producto.js                 # simulación, compañía 1
//   node scripts/clasificar-renglones-sin-producto.js --aplicar
//   node scripts/clasificar-renglones-sin-producto.js --compania 2 --reglas reglas.json --aplicar
//
// reglas.json (opcional): { "Nombre de línea": ["palabra", "otra"], ... }
import fs from 'node:fs';
import { db } from '../src/db.js';

const REGLAS_POR_DEFECTO = {
  'Fresas y crepes': [
    'crep', 'fresa', 'goloso', 'tentaci', 'noche cremosa', 'sin sentimiento', 'calidoso', 'calenito',
    'crepocho', 'coqueta', 'toxica', 'bowl', 'fruta', 'helado', 'nutella', 'arequipe'
  ],
  'Sodas y burritos': ['burrito', 'mixto', 'soda']
};

function argumento(nombre) {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const aplicar = process.argv.includes('--aplicar');
const idCompania = Number(argumento('--compania') || 1);
const archivoReglas = argumento('--reglas');
const reglas = archivoReglas ? JSON.parse(fs.readFileSync(archivoReglas, 'utf8')) : REGLAS_POR_DEFECTO;

const lineas = Object.keys(reglas).map((nombre) => {
  const linea = db.prepare('SELECT idLineaProducto, nombre FROM lineas_producto WHERE idCompania = ? AND nombre = ? COLLATE NOCASE').get(idCompania, nombre);
  return { nombre, linea, palabras: reglas[nombre].map(normalizar) };
});
const faltantes = lineas.filter((item) => !item.linea).map((item) => item.nombre);
if (faltantes.length) {
  console.error(`No existen en la compañía ${idCompania} las líneas: ${faltantes.join(', ')}. Créalas en Clasificación o ajusta --reglas.`);
  db.close();
  process.exit(1);
}

const renglones = db.prepare(`
  SELECT pv.rowid AS fila, pv.idVenta, pv.descripcion, pv.precioVenta * pv.cantidadVendida AS valor
  FROM productos_vendidos pv
  INNER JOIN ventas_contado v ON v.idVenta = pv.idVenta
  WHERE v.idCompania = ? AND pv.idProducto = 0 AND pv.idLineaProducto IS NULL
  ORDER BY pv.idVenta
`).all(idCompania);

const plan = renglones.map((renglon) => {
  const texto = normalizar(renglon.descripcion);
  const coincidencias = lineas.filter((item) => item.palabras.some((palabra) => texto.includes(palabra)));
  return { ...renglon, destino: coincidencias.length === 1 ? coincidencias[0].linea : null, coincidencias: coincidencias.map((item) => item.nombre) };
});

const resumen = new Map();
for (const item of plan) {
  const clave = item.destino ? item.destino.nombre : (item.coincidencias.length > 1 ? 'Sin línea (mixto)' : 'Sin línea (sin coincidencia)');
  const actual = resumen.get(clave) || { renglones: 0, valor: 0 };
  resumen.set(clave, { renglones: actual.renglones + 1, valor: actual.valor + item.valor });
}

console.log(`${aplicar ? 'APLICANDO' : 'SIMULACIÓN'} · compañía ${idCompania} · ${plan.length} renglones sin producto y sin línea`);
console.table(plan.map((item) => ({ venta: item.idVenta, descripcion: item.descripcion, valor: item.valor, destino: item.destino?.nombre || `— (${item.coincidencias.join(' + ') || 'sin coincidencia'})` })));
console.table([...resumen.entries()].map(([destino, datos]) => ({ destino, ...datos })));

if (aplicar) {
  const actualizar = db.prepare('UPDATE productos_vendidos SET idLineaProducto = ? WHERE rowid = ? AND idProducto = 0 AND idLineaProducto IS NULL');
  const actualizados = db.transaction(() => plan
    .filter((item) => item.destino)
    .reduce((total, item) => total + actualizar.run(item.destino.idLineaProducto, item.fila).changes, 0))();
  console.log(`Renglones clasificados: ${actualizados}`);
} else {
  console.log('Nada se modificó. Ejecuta con --aplicar para guardar.');
}

db.close();
