import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'sublime-pos.sqlite');
const schemaPath = path.resolve(__dirname, '..', 'sql', 'schema.sql');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

db.prepare('INSERT OR IGNORE INTO companias (idCompania, nombre, activa) VALUES (1, ?, 1)').run('Dela Crepes');

const tablesWithCompany = [
  'productos',
  'clientes',
  'proveedores',
  'personas_financieras',
  'usuarios',
  'ventas_contado',
  'compras',
  'ingresos',
  'egresos',
  'empresa',
  'comun',
  'medios_pago',
  'prestamos_aportes'
];

for (const table of tablesWithCompany) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  if (!exists) continue;
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
  if (!columns.includes('idCompania')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN idCompania INTEGER DEFAULT 1`);
    db.exec(`UPDATE ${table} SET idCompania = 1 WHERE idCompania IS NULL`);
  }
}

const empresaSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'empresa'").get()?.sql || '';
if (empresaSql.includes('CHECK (idEmpresa = 1)')) {
  db.exec('ALTER TABLE empresa RENAME TO empresa_old');
  db.exec(`
    CREATE TABLE empresa (
      idEmpresa INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      idCompania INTEGER,
      nombre TEXT,
      direccion TEXT,
      telefono TEXT,
      mensajePersonal TEXT
    )
  `);
  db.exec(`
    INSERT INTO empresa (idCompania, nombre, direccion, telefono, mensajePersonal)
    SELECT COALESCE(idCompania, 1), nombre, direccion, telefono, mensajePersonal
    FROM empresa_old
  `);
  db.exec('DROP TABLE empresa_old');
}

const mediosPagoSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'medios_pago'").get()?.sql || '';
if (mediosPagoSql.includes('UNIQUE')) {
  db.exec('ALTER TABLE medios_pago RENAME TO medios_pago_old');
  db.exec(`
    CREATE TABLE medios_pago (
      idMedioPago INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      idCompania INTEGER,
      nombre TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    )
  `);
  db.exec(`
    INSERT INTO medios_pago (idMedioPago, idCompania, nombre, activo)
    SELECT idMedioPago, COALESCE(idCompania, 1), nombre, activo
    FROM medios_pago_old
  `);
  db.exec('DROP TABLE medios_pago_old');
}

const ventasColumns = db.prepare('PRAGMA table_info(ventas_contado)').all().map((column) => column.name);
if (!ventasColumns.includes('estadoPago')) {
  db.exec("ALTER TABLE ventas_contado ADD COLUMN estadoPago TEXT NOT NULL DEFAULT 'PAGADA'");
  db.exec(`
    UPDATE ventas_contado
    SET estadoPago = CASE
      WHEN pago <= 0 THEN 'PENDIENTE'
      WHEN pago < monto THEN 'PARCIAL'
      ELSE 'PAGADA'
    END
  `);
}
if (!ventasColumns.includes('fechaRegistro')) {
  db.exec('ALTER TABLE ventas_contado ADD COLUMN fechaRegistro TEXT');
  db.exec('UPDATE ventas_contado SET fechaRegistro = fecha WHERE fechaRegistro IS NULL');
}
if (!ventasColumns.includes('estadoPreparacion')) {
  db.exec("ALTER TABLE ventas_contado ADD COLUMN estadoPreparacion TEXT NOT NULL DEFAULT 'PENDIENTE'");
  db.exec("UPDATE ventas_contado SET estadoPreparacion = 'CUMPLIDO' WHERE estadoPreparacion = 'PENDIENTE'");
}
if (!ventasColumns.includes('fechaCumplido')) {
  db.exec('ALTER TABLE ventas_contado ADD COLUMN fechaCumplido TEXT');
  db.exec("UPDATE ventas_contado SET fechaCumplido = COALESCE(fechaRegistro, fecha) WHERE estadoPreparacion = 'CUMPLIDO' AND fechaCumplido IS NULL");
}

const productosVendidosColumns = db.prepare('PRAGMA table_info(productos_vendidos)').all().map((column) => column.name);
if (productosVendidosColumns.length && !productosVendidosColumns.includes('nota')) {
  db.exec("ALTER TABLE productos_vendidos ADD COLUMN nota TEXT DEFAULT ''");
}

const comprasColumns = db.prepare('PRAGMA table_info(compras)').all().map((column) => column.name);
if (comprasColumns.length && !comprasColumns.includes('fechaRegistro')) {
  db.exec('ALTER TABLE compras ADD COLUMN fechaRegistro TEXT');
  db.exec('UPDATE compras SET fechaRegistro = fecha WHERE fechaRegistro IS NULL');
}

const productosCompradosColumns = db.prepare('PRAGMA table_info(productos_comprados)').all();
const idProductoCompra = productosCompradosColumns.find((column) => column.name === 'idProducto');
if (idProductoCompra?.notnull) {
  db.exec('ALTER TABLE productos_comprados RENAME TO productos_comprados_old');
  db.exec(`
    CREATE TABLE productos_comprados (
      idProducto INTEGER,
      idCompra INTEGER NOT NULL,
      codigoBarras TEXT,
      descripcion TEXT NOT NULL,
      precioCompra REAL NOT NULL,
      precioVenta REAL NOT NULL,
      cantidadComprada REAL NOT NULL,
      FOREIGN KEY (idCompra) REFERENCES compras (idCompra) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (idProducto) REFERENCES productos (idProducto) ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  db.exec(`
    INSERT INTO productos_comprados (
      idProducto, idCompra, codigoBarras, descripcion, precioCompra, precioVenta, cantidadComprada
    )
    SELECT idProducto, idCompra, codigoBarras, descripcion, precioCompra, precioVenta, cantidadComprada
    FROM productos_comprados_old
  `);
  db.exec('DROP TABLE productos_comprados_old');
}

const defaults = db.transaction(() => {
  db.prepare('INSERT OR IGNORE INTO clientes (idCliente, nombreCompleto, numeroTelefono) VALUES (1, ?, ?)').run('Mostrador', '0000000000');
  db.prepare('INSERT INTO empresa (idCompania, nombre, direccion, telefono, mensajePersonal) SELECT 1, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM empresa WHERE idCompania = 1)').run('', '', '', '');
  db.prepare('INSERT OR IGNORE INTO usuarios (idUsuario, nombre, contrasena) VALUES (1, ?, ?)').run('admin', 'admin');

  const permisos = [
    ['RegistrarVentaContado', 'Hacer ventas al contado e imprimir tickets'],
    ['RegistrarApartado', 'Hacer apartados y abonos'],
    ['VerReporteCaja', 'Ver reporte de caja'],
    ['VerUsuarios', 'Ver usuarios'],
    ['RegistrarUsuario', 'Agregar usuarios'],
    ['VerAjustes', 'Ver ajustes'],
    ['CambiarAjustes', 'Cambiar ajustes'],
    ['VerGraficas', 'Ver graficas'],
    ['RegistrarIngreso', 'Registrar ingreso'],
    ['RegistrarEgreso', 'Registrar egreso'],
    ['VerVentasContado', 'Ver ventas al contado'],
    ['VerApartados', 'Ver apartados'],
    ['VerClientes', 'Ver clientes'],
    ['RegistrarCliente', 'Registrar cliente'],
    ['ActualizarCliente', 'Actualizar cliente'],
    ['EliminarCliente', 'Eliminar cliente'],
    ['VerProductos', 'Ver productos'],
    ['RegistrarProducto', 'Registrar producto'],
    ['ActualizarProducto', 'Actualizar producto'],
    ['EliminarProducto', 'Eliminar producto'],
    ['ModificarYVerPermisos', 'Modificar permisos']
  ];

  const insertPermiso = db.prepare('INSERT OR IGNORE INTO permisos (clave, descripcion) VALUES (?, ?)');
  const linkPermiso = db.prepare('INSERT OR IGNORE INTO permisos_usuarios (idUsuario, idPermiso) SELECT 1, idPermiso FROM permisos WHERE clave = ?');
  for (const permiso of permisos) {
    insertPermiso.run(...permiso);
    linkPermiso.run(permiso[0]);
  }

  const comun = [
    ['NOMBRE_IMPRESORA', ''],
    ['CREATED_BY', 'reconstruccion'],
    ['MODO_IMPRESION_CODIGOS', 'codigo'],
    ['MODO_LECTURA_CODIGOS', 'codigo'],
    ['NUMERO_COPIAS_TICKET_CONTADO', '1'],
    ['NUMERO_COPIAS_TICKET_APARTADO', '1'],
    ['NUMERO_COPIAS_TICKET_ABONO', '1']
  ];
  const insertComun = db.prepare('INSERT OR IGNORE INTO comun (clave, valor) VALUES (?, ?)');
  for (const item of comun) insertComun.run(...item);

  const mediosPago = ['Efectivo', 'Tarjeta', 'Transferencia'];
  const insertMedioPago = db.prepare('INSERT INTO medios_pago (idCompania, nombre, activo) SELECT 1, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM medios_pago WHERE idCompania = 1 AND lower(nombre) = lower(?))');
  for (const medio of mediosPago) insertMedioPago.run(medio, medio);
});

defaults();
