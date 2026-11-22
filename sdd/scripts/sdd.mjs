#!/usr/bin/env node
// Utilidades del flujo SDD. Uso (desde la raiz del repo):
//   npm run sdd:nueva -- "toma de pedido guiada"   crea sdd/features/NNN-slug/spec.md
//   npm run sdd:fase -- 001 design                 agrega design.md | plan.md | implementation.md
//   npm run sdd:estado                             muestra el estado y regenera el indice
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sddDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const featuresDir = path.join(sddDir, 'features');
const templatesDir = path.join(sddDir, 'templates');
const indexPath = path.join(featuresDir, 'README.md');
const FASES = ['spec', 'design', 'plan', 'implementation'];
const INDEX_START = '<!-- indice:inicio -->';
const INDEX_END = '<!-- indice:fin -->';

function hoy() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());
}

function slugify(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 50).replace(/-+$/, '');
}

function listarFeatures() {
  if (!fs.existsSync(featuresDir)) return [];
  return fs.readdirSync(featuresDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{3}-/.test(d.name))
    .map((d) => d.name)
    .sort();
}

function buscarFeature(ref) {
  const encontradas = listarFeatures().filter((f) => f === ref || f.startsWith(`${String(ref).padStart(3, '0')}-`));
  if (encontradas.length !== 1) throw new Error(`No se encontro una unica feature para "${ref}". Existentes: ${listarFeatures().join(', ') || '(ninguna)'}`);
  return encontradas[0];
}

function frontMatter(archivo) {
  if (!fs.existsSync(archivo)) return null;
  const match = fs.readFileSync(archivo, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return Object.fromEntries(match[1].split(/\r?\n/).map((linea) => {
    const [clave, ...resto] = linea.split(':');
    return [clave.trim(), resto.join(':').replace(/#.*$/, '').trim()];
  }).filter(([clave]) => clave));
}

function titulo(feature) {
  const spec = path.join(featuresDir, feature, 'spec.md');
  const linea = fs.existsSync(spec) ? fs.readFileSync(spec, 'utf8').match(/^# Spec: (.+)$/m) : null;
  return linea ? linea[1].trim() : feature;
}

function desdePlantilla(fase, feature, nombre) {
  const fecha = hoy();
  return fs.readFileSync(path.join(templatesDir, `${fase}.md`), 'utf8')
    .replaceAll('NNN-nombre-corto', feature)
    .replaceAll('<Nombre de la feature>', nombre)
    .replace(/^(creado|iniciado): AAAA-MM-DD/m, `$1: ${fecha}`)
    .replace(/\| AAAA-MM-DD \| Borrador inicial \|/, `| ${fecha} | Borrador inicial |`);
}

function estadoFeature(feature) {
  const docs = Object.fromEntries(FASES.map((fase) => [fase, frontMatter(path.join(featuresDir, feature, `${fase}.md`))]));
  const override = docs.spec?.feature_estado;
  if (override) return { fase: override, docs };
  const actual = [...FASES].reverse().find((fase) => docs[fase]);
  if (!actual) return { fase: 'sin-spec', docs };
  if (actual === 'implementation' && docs.implementation.estado === 'aprobado') return { fase: 'terminado', docs };
  return { fase: `${actual === 'implementation' ? 'implementacion' : actual} (${docs[actual].estado || '?'})`, docs };
}

function regenerarIndice() {
  const filas = listarFeatures().map((feature) => {
    const { fase, docs } = estadoFeature(feature);
    const marca = (fase2) => (docs[fase2] ? (docs[fase2].estado === 'aprobado' ? '✅' : '📝') : '·');
    return `| [${feature}](./${feature}/) | ${titulo(feature)} | ${fase} | ${FASES.map(marca).join(' ')} |`;
  });
  const tabla = [
    '| Feature | Nombre | Estado | spec design plan impl |',
    '|---|---|---|---|',
    ...(filas.length ? filas : ['| — | — | — | — |'])
  ].join('\n');
  const actual = fs.readFileSync(indexPath, 'utf8');
  const inicio = actual.indexOf(INDEX_START);
  const fin = actual.indexOf(INDEX_END);
  if (inicio < 0 || fin < 0) throw new Error(`Faltan los marcadores ${INDEX_START} / ${INDEX_END} en ${indexPath}`);
  fs.writeFileSync(indexPath, `${actual.slice(0, inicio + INDEX_START.length)}\n${tabla}\n${actual.slice(fin)}`);
  return tabla;
}

function nueva(nombre) {
  if (!nombre) throw new Error('Uso: npm run sdd:nueva -- "nombre de la feature"');
  const numeros = listarFeatures().map((f) => Number(f.slice(0, 3)));
  const numero = String((numeros.length ? Math.max(...numeros) : 0) + 1).padStart(3, '0');
  const feature = `${numero}-${slugify(nombre)}`;
  const carpeta = path.join(featuresDir, feature);
  fs.mkdirSync(carpeta, { recursive: true });
  const nombreVisible = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  fs.writeFileSync(path.join(carpeta, 'spec.md'), desdePlantilla('spec', feature, nombreVisible));
  regenerarIndice();
  console.log(`Creada sdd/features/${feature}/spec.md`);
  console.log(`Rama sugerida: git checkout -b feat/${feature}`);
}

function fase(ref, nombreFase) {
  if (!ref || !['design', 'plan', 'implementation'].includes(nombreFase)) {
    throw new Error('Uso: npm run sdd:fase -- <NNN> <design|plan|implementation>');
  }
  const feature = buscarFeature(ref);
  const anterior = FASES[FASES.indexOf(nombreFase) - 1];
  const docAnterior = frontMatter(path.join(featuresDir, feature, `${anterior}.md`));
  if (!docAnterior) throw new Error(`Falta ${anterior}.md en ${feature}`);
  if (docAnterior.estado !== 'aprobado') {
    throw new Error(`${anterior}.md esta en estado "${docAnterior.estado}". El usuario debe aprobarlo antes de iniciar ${nombreFase}.`);
  }
  const destino = path.join(featuresDir, feature, `${nombreFase}.md`);
  if (fs.existsSync(destino)) throw new Error(`Ya existe ${path.relative(process.cwd(), destino)}`);
  fs.writeFileSync(destino, desdePlantilla(nombreFase, feature, titulo(feature)));
  regenerarIndice();
  console.log(`Creado sdd/features/${feature}/${nombreFase}.md`);
}

try {
  const [comando, ...args] = process.argv.slice(2);
  if (comando === 'nueva') nueva(args.join(' ').trim());
  else if (comando === 'fase') fase(args[0], args[1]);
  else if (comando === 'estado') console.log(regenerarIndice());
  else throw new Error('Comandos: nueva "<nombre>" | fase <NNN> <design|plan|implementation> | estado');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
