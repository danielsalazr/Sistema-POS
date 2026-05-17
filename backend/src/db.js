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
  db.prepare('INSERT OR IGNORE INTO empresa (idEmpresa, nombre, direccion, telefono, mensajePersonal) VALUES (1, ?, ?, ?, ?)').run('', '', '', '');
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
  const insertMedioPago = db.prepare('INSERT OR IGNORE INTO medios_pago (nombre, activo) VALUES (?, 1)');
  for (const medio of mediosPago) insertMedioPago.run(medio);
});

defaults();
