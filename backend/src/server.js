import cors from 'cors';
import express from 'express';
import { db } from './db.js';
import { nowSql, numeric, requireFields } from './utils.js';

const app = express();
const port = process.env.PORT || 3020;

app.use(cors());
app.use(express.json());

app.get('/api/salud', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  requireFields(req.body, ['nombre', 'contrasena']);
  const usuario = db.prepare('SELECT idUsuario, nombre FROM usuarios WHERE nombre = ? AND contrasena = ?').get(req.body.nombre, req.body.contrasena);
  if (!usuario) return res.status(401).json({ error: 'Usuario o contrasena invalidos' });
  const permisos = db.prepare(`
    SELECT p.clave, p.descripcion
    FROM permisos p
    INNER JOIN permisos_usuarios pu ON pu.idPermiso = p.idPermiso
    WHERE pu.idUsuario = ?
    ORDER BY p.clave
  `).all(usuario.idUsuario);
  res.json({ usuario, permisos });
});

app.get('/api/productos', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const productos = db.prepare(`
    SELECT * FROM productos
    WHERE descripcion LIKE ? OR codigoBarras LIKE ?
    ORDER BY descripcion
  `).all(q, q);
  res.json(productos);
});

app.get('/api/productos/stock/:cantidad', (req, res) => {
  res.json(db.prepare('SELECT * FROM productos WHERE existencia <= ? ORDER BY existencia ASC').all(numeric(req.params.cantidad)));
});

app.get('/api/productos/codigo/:codigo', (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE codigoBarras = ? OR idProducto = ?').get(req.params.codigo, numeric(req.params.codigo, -1));
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

app.post('/api/productos', (req, res) => {
  requireFields(req.body, ['descripcion', 'precioCompra', 'precioVenta', 'existencia', 'stock']);
  const result = db.prepare(`
    INSERT INTO productos (codigoBarras, descripcion, precioCompra, precioVenta, existencia, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.body.codigoBarras || null,
    req.body.descripcion,
    numeric(req.body.precioCompra),
    numeric(req.body.precioVenta),
    numeric(req.body.existencia),
    numeric(req.body.stock)
  );
  res.status(201).json(db.prepare('SELECT * FROM productos WHERE idProducto = ?').get(result.lastInsertRowid));
});

app.put('/api/productos/:id', (req, res) => {
  requireFields(req.body, ['descripcion', 'precioCompra', 'precioVenta', 'existencia', 'stock']);
  db.prepare(`
    UPDATE productos
    SET codigoBarras = ?, descripcion = ?, precioCompra = ?, precioVenta = ?, existencia = ?, stock = ?
    WHERE idProducto = ?
  `).run(
    req.body.codigoBarras || null,
    req.body.descripcion,
    numeric(req.body.precioCompra),
    numeric(req.body.precioVenta),
    numeric(req.body.existencia),
    numeric(req.body.stock),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM productos WHERE idProducto = ?').get(req.params.id));
});

app.delete('/api/productos/:id', (req, res) => {
  db.prepare('DELETE FROM productos WHERE idProducto = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/clientes', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(db.prepare(`
    SELECT * FROM clientes
    WHERE nombreCompleto LIKE ? OR numeroTelefono LIKE ?
    ORDER BY nombreCompleto
  `).all(q, q));
});

app.post('/api/clientes', (req, res) => {
  requireFields(req.body, ['nombreCompleto', 'numeroTelefono']);
  const result = db.prepare('INSERT INTO clientes (nombreCompleto, numeroTelefono) VALUES (?, ?)').run(req.body.nombreCompleto, req.body.numeroTelefono);
  res.status(201).json(db.prepare('SELECT * FROM clientes WHERE idCliente = ?').get(result.lastInsertRowid));
});

app.put('/api/clientes/:id', (req, res) => {
  requireFields(req.body, ['nombreCompleto', 'numeroTelefono']);
  db.prepare('UPDATE clientes SET nombreCompleto = ?, numeroTelefono = ? WHERE idCliente = ?').run(req.body.nombreCompleto, req.body.numeroTelefono, req.params.id);
  res.json(db.prepare('SELECT * FROM clientes WHERE idCliente = ?').get(req.params.id));
});

app.delete('/api/clientes/:id', (req, res) => {
  db.prepare('DELETE FROM clientes WHERE idCliente = ? AND idCliente <> 1').run(req.params.id);
  res.status(204).end();
});

app.get('/api/proveedores', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(db.prepare(`
    SELECT * FROM proveedores
    WHERE nombre LIKE ? OR numeroTelefono LIKE ? OR correo LIKE ?
    ORDER BY nombre
  `).all(q, q, q));
});

app.post('/api/proveedores', (req, res) => {
  requireFields(req.body, ['nombre']);
  const result = db.prepare(`
    INSERT INTO proveedores (nombre, numeroTelefono, correo, direccion)
    VALUES (?, ?, ?, ?)
  `).run(req.body.nombre, req.body.numeroTelefono || '', req.body.correo || '', req.body.direccion || '');
  res.status(201).json(db.prepare('SELECT * FROM proveedores WHERE idProveedor = ?').get(result.lastInsertRowid));
});

app.put('/api/proveedores/:id', (req, res) => {
  requireFields(req.body, ['nombre']);
  db.prepare(`
    UPDATE proveedores
    SET nombre = ?, numeroTelefono = ?, correo = ?, direccion = ?
    WHERE idProveedor = ?
  `).run(req.body.nombre, req.body.numeroTelefono || '', req.body.correo || '', req.body.direccion || '', req.params.id);
  res.json(db.prepare('SELECT * FROM proveedores WHERE idProveedor = ?').get(req.params.id));
});

app.delete('/api/proveedores/:id', (req, res) => {
  db.prepare('DELETE FROM proveedores WHERE idProveedor = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/personas-financieras', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(db.prepare(`
    SELECT pf.*,
      COALESCE(SUM(CASE
        WHEN pa.tipo IN ('PRESTAMO_AL_NEGOCIO', 'APORTE_AL_NEGOCIO') THEN pa.monto - COALESCE(s.totalSubsanado, 0)
        WHEN pa.tipo IN ('DEVOLUCION_PAGADA', 'RETIRO_DEL_NEGOCIO') THEN -(pa.monto - COALESCE(s.totalSubsanado, 0))
        ELSE 0
      END), 0) AS negocioDebe,
      COALESCE(SUM(CASE
        WHEN pa.tipo = 'PRESTAMO_DEL_NEGOCIO' THEN pa.monto - COALESCE(s.totalSubsanado, 0)
        WHEN pa.tipo = 'DEVOLUCION_RECIBIDA' THEN -(pa.monto - COALESCE(s.totalSubsanado, 0))
        ELSE 0
      END), 0) AS personaDebe
    FROM personas_financieras pf
    LEFT JOIN prestamos_aportes pa ON pa.idPersonaFinanciera = pf.idPersonaFinanciera
    LEFT JOIN (
      SELECT idMovimiento, SUM(monto) AS totalSubsanado
      FROM subsanaciones_prestamos_aportes
      GROUP BY idMovimiento
    ) s ON s.idMovimiento = pa.idMovimiento
    WHERE pf.nombre LIKE ? OR pf.relacion LIKE ?
    GROUP BY pf.idPersonaFinanciera
    ORDER BY pf.nombre
  `).all(q, q));
});

app.post('/api/personas-financieras', (req, res) => {
  requireFields(req.body, ['nombre', 'relacion']);
  const result = db.prepare(`
    INSERT INTO personas_financieras (nombre, relacion, numeroTelefono, notas)
    VALUES (?, ?, ?, ?)
  `).run(req.body.nombre, req.body.relacion, req.body.numeroTelefono || '', req.body.notas || '');
  res.status(201).json(db.prepare('SELECT * FROM personas_financieras WHERE idPersonaFinanciera = ?').get(result.lastInsertRowid));
});

app.put('/api/personas-financieras/:id', (req, res) => {
  requireFields(req.body, ['nombre', 'relacion']);
  db.prepare(`
    UPDATE personas_financieras
    SET nombre = ?, relacion = ?, numeroTelefono = ?, notas = ?
    WHERE idPersonaFinanciera = ?
  `).run(req.body.nombre, req.body.relacion, req.body.numeroTelefono || '', req.body.notas || '', req.params.id);
  res.json(db.prepare('SELECT * FROM personas_financieras WHERE idPersonaFinanciera = ?').get(req.params.id));
});

app.delete('/api/personas-financieras/:id', (req, res) => {
  const usado = db.prepare('SELECT COUNT(*) total FROM prestamos_aportes WHERE idPersonaFinanciera = ?').get(req.params.id).total;
  if (usado > 0) return res.status(400).json({ error: 'No se puede eliminar una persona con movimientos registrados' });
  db.prepare('DELETE FROM personas_financieras WHERE idPersonaFinanciera = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/prestamos-aportes', (req, res) => {
  const where = [];
  const params = [];
  if (req.query.idPersonaFinanciera) {
    where.push('pa.idPersonaFinanciera = ?');
    params.push(req.query.idPersonaFinanciera);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const movimientos = db.prepare(`
    SELECT pa.*, pf.nombre AS persona, pf.relacion, u.nombre AS usuario,
      COALESCE(s.totalSubsanado, 0) AS subsanado,
      MAX(pa.monto - COALESCE(s.totalSubsanado, 0), 0) AS saldo,
      CASE
        WHEN COALESCE(s.totalSubsanado, 0) <= 0 THEN 'PENDIENTE'
        WHEN COALESCE(s.totalSubsanado, 0) < pa.monto THEN 'PARCIAL'
        ELSE 'SUBSANADO'
      END AS estado
    FROM prestamos_aportes pa
    INNER JOIN personas_financieras pf ON pf.idPersonaFinanciera = pa.idPersonaFinanciera
    INNER JOIN usuarios u ON u.idUsuario = pa.idUsuario
    LEFT JOIN (
      SELECT idMovimiento, SUM(monto) AS totalSubsanado
      FROM subsanaciones_prestamos_aportes
      GROUP BY idMovimiento
    ) s ON s.idMovimiento = pa.idMovimiento
    ${whereSql}
    ORDER BY pa.fecha DESC, pa.idMovimiento DESC
    LIMIT 200
  `).all(...params);
  res.json(movimientos);
});

app.get('/api/prestamos-aportes/:id', (req, res) => {
  const movimiento = db.prepare(`
    SELECT pa.*, pf.nombre AS persona, pf.relacion, u.nombre AS usuario,
      COALESCE(s.totalSubsanado, 0) AS subsanado,
      MAX(pa.monto - COALESCE(s.totalSubsanado, 0), 0) AS saldo,
      CASE
        WHEN COALESCE(s.totalSubsanado, 0) <= 0 THEN 'PENDIENTE'
        WHEN COALESCE(s.totalSubsanado, 0) < pa.monto THEN 'PARCIAL'
        ELSE 'SUBSANADO'
      END AS estado
    FROM prestamos_aportes pa
    INNER JOIN personas_financieras pf ON pf.idPersonaFinanciera = pa.idPersonaFinanciera
    INNER JOIN usuarios u ON u.idUsuario = pa.idUsuario
    LEFT JOIN (
      SELECT idMovimiento, SUM(monto) AS totalSubsanado
      FROM subsanaciones_prestamos_aportes
      GROUP BY idMovimiento
    ) s ON s.idMovimiento = pa.idMovimiento
    WHERE pa.idMovimiento = ?
  `).get(req.params.id);
  if (!movimiento) return res.status(404).json({ error: 'Movimiento no encontrado' });
  const subsanaciones = db.prepare(`
    SELECT s.*, mp.nombre AS medioPago, u.nombre AS usuario
    FROM subsanaciones_prestamos_aportes s
    LEFT JOIN medios_pago mp ON mp.idMedioPago = s.idMedioPago
    INNER JOIN usuarios u ON u.idUsuario = s.idUsuario
    WHERE s.idMovimiento = ?
    ORDER BY s.fecha DESC, s.idSubsanacion DESC
  `).all(req.params.id);
  res.json({ ...movimiento, subsanaciones });
});

app.post('/api/prestamos-aportes', (req, res) => {
  requireFields(req.body, ['idPersonaFinanciera', 'tipo', 'monto', 'idUsuario']);
  const tipos = [
    'APORTE_AL_NEGOCIO',
    'RETIRO_DEL_NEGOCIO',
    'PRESTAMO_AL_NEGOCIO',
    'PRESTAMO_DEL_NEGOCIO',
    'DEVOLUCION_RECIBIDA',
    'DEVOLUCION_PAGADA'
  ];
  if (!tipos.includes(req.body.tipo)) return res.status(400).json({ error: 'Tipo de movimiento invalido' });
  const monto = numeric(req.body.monto, 0);
  if (monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor que cero' });

  const result = db.prepare(`
    INSERT INTO prestamos_aportes (idPersonaFinanciera, tipo, monto, fecha, descripcion, idUsuario)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.body.idPersonaFinanciera, req.body.tipo, monto, nowSql(), req.body.descripcion || '', req.body.idUsuario);
  res.status(201).json(db.prepare(`
    SELECT pa.*, pf.nombre AS persona, pf.relacion, u.nombre AS usuario
    FROM prestamos_aportes pa
    INNER JOIN personas_financieras pf ON pf.idPersonaFinanciera = pa.idPersonaFinanciera
    INNER JOIN usuarios u ON u.idUsuario = pa.idUsuario
    WHERE pa.idMovimiento = ?
  `).get(result.lastInsertRowid));
});

app.put('/api/prestamos-aportes/:id', (req, res) => {
  requireFields(req.body, ['idPersonaFinanciera', 'tipo', 'monto', 'idUsuario']);
  const tipos = [
    'APORTE_AL_NEGOCIO',
    'RETIRO_DEL_NEGOCIO',
    'PRESTAMO_AL_NEGOCIO',
    'PRESTAMO_DEL_NEGOCIO',
    'DEVOLUCION_RECIBIDA',
    'DEVOLUCION_PAGADA'
  ];
  if (!tipos.includes(req.body.tipo)) return res.status(400).json({ error: 'Tipo de movimiento invalido' });
  const monto = numeric(req.body.monto, 0);
  if (monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor que cero' });

  const actual = db.prepare('SELECT * FROM prestamos_aportes WHERE idMovimiento = ?').get(req.params.id);
  if (!actual) return res.status(404).json({ error: 'Movimiento no encontrado' });

  db.prepare(`
    UPDATE prestamos_aportes
    SET idPersonaFinanciera = ?, tipo = ?, monto = ?, descripcion = ?, idUsuario = ?
    WHERE idMovimiento = ?
  `).run(req.body.idPersonaFinanciera, req.body.tipo, monto, req.body.descripcion || '', req.body.idUsuario, req.params.id);

  res.json(db.prepare(`
    SELECT pa.*, pf.nombre AS persona, pf.relacion, u.nombre AS usuario
    FROM prestamos_aportes pa
    INNER JOIN personas_financieras pf ON pf.idPersonaFinanciera = pa.idPersonaFinanciera
    INNER JOIN usuarios u ON u.idUsuario = pa.idUsuario
    WHERE pa.idMovimiento = ?
  `).get(req.params.id));
});

app.post('/api/prestamos-aportes/:id/subsanaciones', (req, res) => {
  requireFields(req.body, ['monto', 'idUsuario']);
  const movimiento = db.prepare(`
    SELECT pa.*, COALESCE(SUM(s.monto), 0) AS subsanado
    FROM prestamos_aportes pa
    LEFT JOIN subsanaciones_prestamos_aportes s ON s.idMovimiento = pa.idMovimiento
    WHERE pa.idMovimiento = ?
    GROUP BY pa.idMovimiento
  `).get(req.params.id);
  if (!movimiento) return res.status(404).json({ error: 'Movimiento no encontrado' });

  const monto = numeric(req.body.monto, 0);
  const saldo = Math.max(numeric(movimiento.monto) - numeric(movimiento.subsanado), 0);
  if (monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor que cero' });
  if (monto > saldo) return res.status(400).json({ error: 'La subsanacion no puede superar el saldo pendiente' });

  if (req.body.idMedioPago) {
    const medio = db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ? AND activo = 1').get(req.body.idMedioPago);
    if (!medio) return res.status(400).json({ error: 'Medio de pago no disponible' });
  }

  const result = db.prepare(`
    INSERT INTO subsanaciones_prestamos_aportes (
      idMovimiento, monto, fecha, idMedioPago, referencia, descripcion, idUsuario
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    monto,
    nowSql(),
    req.body.idMedioPago || null,
    req.body.referencia || '',
    req.body.descripcion || '',
    req.body.idUsuario
  );

  res.status(201).json(db.prepare(`
    SELECT s.*, mp.nombre AS medioPago, u.nombre AS usuario
    FROM subsanaciones_prestamos_aportes s
    LEFT JOIN medios_pago mp ON mp.idMedioPago = s.idMedioPago
    INNER JOIN usuarios u ON u.idUsuario = s.idUsuario
    WHERE s.idSubsanacion = ?
  `).get(result.lastInsertRowid));
});

app.get('/api/usuarios', (req, res) => {
  res.json(db.prepare('SELECT idUsuario, nombre FROM usuarios ORDER BY nombre').all());
});

app.post('/api/usuarios', (req, res) => {
  requireFields(req.body, ['nombre', 'contrasena']);
  const result = db.prepare('INSERT INTO usuarios (nombre, contrasena) VALUES (?, ?)').run(req.body.nombre, req.body.contrasena);
  res.status(201).json(db.prepare('SELECT idUsuario, nombre FROM usuarios WHERE idUsuario = ?').get(result.lastInsertRowid));
});

app.get('/api/permisos', (req, res) => {
  res.json(db.prepare('SELECT * FROM permisos ORDER BY clave').all());
});

app.get('/api/permisos/de/:idUsuario', (req, res) => {
  res.json(db.prepare(`
    SELECT p.*
    FROM permisos p
    INNER JOIN permisos_usuarios pu ON pu.idPermiso = p.idPermiso
    WHERE pu.idUsuario = ?
    ORDER BY p.clave
  `).all(req.params.idUsuario));
});

app.put('/api/permisos/de/:idUsuario', (req, res) => {
  const ids = Array.isArray(req.body.idPermisos) ? req.body.idPermisos : [];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM permisos_usuarios WHERE idUsuario = ?').run(req.params.idUsuario);
    const insert = db.prepare('INSERT OR IGNORE INTO permisos_usuarios (idUsuario, idPermiso) VALUES (?, ?)');
    for (const idPermiso of ids) insert.run(req.params.idUsuario, idPermiso);
  });
  tx();
  res.json({ ok: true });
});

app.get('/api/medios-pago', (req, res) => {
  const incluirInactivos = req.query.incluirInactivos === '1';
  const medios = db.prepare(`
    SELECT * FROM medios_pago
    ${incluirInactivos ? '' : 'WHERE activo = 1'}
    ORDER BY nombre
  `).all();
  res.json(medios);
});

app.post('/api/medios-pago', (req, res) => {
  requireFields(req.body, ['nombre']);
  const result = db.prepare('INSERT INTO medios_pago (nombre, activo) VALUES (?, ?)').run(req.body.nombre, req.body.activo === false ? 0 : 1);
  res.status(201).json(db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ?').get(result.lastInsertRowid));
});

app.put('/api/medios-pago/:id', (req, res) => {
  requireFields(req.body, ['nombre']);
  db.prepare('UPDATE medios_pago SET nombre = ?, activo = ? WHERE idMedioPago = ?').run(req.body.nombre, req.body.activo === false || req.body.activo === 0 ? 0 : 1, req.params.id);
  res.json(db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ?').get(req.params.id));
});

app.delete('/api/medios-pago/:id', (req, res) => {
  const usado = db.prepare('SELECT COUNT(*) total FROM pagos_ventas WHERE idMedioPago = ?').get(req.params.id).total;
  if (usado > 0) {
    db.prepare('UPDATE medios_pago SET activo = 0 WHERE idMedioPago = ?').run(req.params.id);
    return res.json(db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ?').get(req.params.id));
  }
  db.prepare('DELETE FROM medios_pago WHERE idMedioPago = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/ajustes/empresa', (req, res) => {
  res.json(db.prepare('SELECT * FROM empresa WHERE idEmpresa = 1').get());
});

app.put('/api/ajustes/empresa', (req, res) => {
  db.prepare(`
    UPDATE empresa
    SET nombre = ?, direccion = ?, telefono = ?, mensajePersonal = ?
    WHERE idEmpresa = 1
  `).run(req.body.nombre || '', req.body.direccion || '', req.body.telefono || '', req.body.mensajePersonal || '');
  res.json(db.prepare('SELECT * FROM empresa WHERE idEmpresa = 1').get());
});

app.get('/api/caja/resumen', (req, res) => {
  const ventas = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM ventas_contado').get().total;
  const abonos = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM abonos').get().total;
  const ingresos = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM ingresos').get().total;
  const egresos = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM egresos').get().total;
  const compras = db.prepare("SELECT COALESCE(SUM(pago), 0) total FROM compras").get().total;
  const entradaPrestamosAportes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE tipo IN ('APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.tipo IN ('RETIRO_DEL_NEGOCIO', 'PRESTAMO_DEL_NEGOCIO', 'DEVOLUCION_PAGADA')
    )
  `).get().total;
  const salidaPrestamosAportes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE tipo IN ('RETIRO_DEL_NEGOCIO', 'PRESTAMO_DEL_NEGOCIO', 'DEVOLUCION_PAGADA')
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.tipo IN ('APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
    )
  `).get().total;
  res.json({
    ventas,
    abonos,
    ingresos,
    egresos,
    compras,
    entradaPrestamosAportes,
    salidaPrestamosAportes,
    total: ventas + abonos + ingresos + entradaPrestamosAportes - egresos - compras - salidaPrestamosAportes
  });
});

app.get('/api/compras', (req, res) => {
  const compras = db.prepare(`
    SELECT c.idCompra, c.monto, c.pago, c.fecha, c.idProveedor, c.idUsuario,
           p.nombre AS proveedor, u.nombre AS usuario,
           COUNT(pc.idProducto) AS cantidadProductos
    FROM compras c
    INNER JOIN proveedores p ON p.idProveedor = c.idProveedor
    INNER JOIN usuarios u ON u.idUsuario = c.idUsuario
    LEFT JOIN productos_comprados pc ON pc.idCompra = c.idCompra
    GROUP BY c.idCompra
    ORDER BY c.idCompra DESC
    LIMIT 100
  `).all();
  res.json(compras);
});

app.get('/api/compras/:id', (req, res) => {
  const compra = db.prepare(`
    SELECT c.*, p.nombre AS proveedor, p.numeroTelefono, p.correo, u.nombre AS usuario
    FROM compras c
    INNER JOIN proveedores p ON p.idProveedor = c.idProveedor
    INNER JOIN usuarios u ON u.idUsuario = c.idUsuario
    WHERE c.idCompra = ?
  `).get(req.params.id);
  if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
  const productos = db.prepare('SELECT * FROM productos_comprados WHERE idCompra = ? ORDER BY descripcion').all(req.params.id);
  res.json({ ...compra, productos });
});

app.post('/api/compras', (req, res) => {
  requireFields(req.body, ['idProveedor', 'idUsuario', 'productos']);
  if (!Array.isArray(req.body.productos) || req.body.productos.length === 0) {
    return res.status(400).json({ error: 'La compra debe tener al menos un producto' });
  }

  const crearCompra = db.transaction(() => {
    let monto = 0;
    const productosCompra = [];

    for (const item of req.body.productos) {
      const cantidad = numeric(item.cantidadComprada || item.cantidad, 0);
      const precioCompra = numeric(item.precioCompra, 0);
      if (cantidad <= 0 || precioCompra < 0) {
        const error = new Error('La cantidad debe ser mayor que cero y el costo no puede ser negativo');
        error.status = 400;
        throw error;
      }

      const producto = item.idProducto ? db.prepare('SELECT * FROM productos WHERE idProducto = ?').get(item.idProducto) : null;
      if (item.idProducto && !producto) {
        const error = new Error(`Producto ${item.idProducto} no encontrado`);
        error.status = 404;
        throw error;
      }

      const descripcion = item.descripcion || producto?.descripcion;
      if (!descripcion) {
        const error = new Error('Cada producto comprado debe tener descripcion');
        error.status = 400;
        throw error;
      }

      const precioVenta = numeric(item.precioVenta, producto?.precioVenta || 0);
      monto += precioCompra * cantidad;
      productosCompra.push({
        idProducto: producto?.idProducto || null,
        codigoBarras: producto?.codigoBarras || item.codigoBarras || null,
        descripcion,
        precioCompra,
        precioVenta,
        cantidadComprada: cantidad,
        actualizaInventario: Boolean(producto)
      });
    }

    const pago = numeric(req.body.pago, monto);
    const compra = db.prepare(`
      INSERT INTO compras (monto, pago, fecha, idProveedor, idUsuario)
      VALUES (?, ?, ?, ?, ?)
    `).run(monto, pago, nowSql(), req.body.idProveedor, req.body.idUsuario);

    const insertarProducto = db.prepare(`
      INSERT INTO productos_comprados (
        idProducto, idCompra, codigoBarras, descripcion, precioCompra, precioVenta, cantidadComprada
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const actualizarProducto = db.prepare(`
      UPDATE productos
      SET existencia = existencia + ?, precioCompra = ?, precioVenta = ?
      WHERE idProducto = ?
    `);

    for (const producto of productosCompra) {
      insertarProducto.run(
        producto.idProducto,
        compra.lastInsertRowid,
        producto.codigoBarras,
        producto.descripcion,
        producto.precioCompra,
        producto.precioVenta,
        producto.cantidadComprada
      );
      if (producto.actualizaInventario) {
        actualizarProducto.run(producto.cantidadComprada, producto.precioCompra, producto.precioVenta, producto.idProducto);
      }
    }

    return compra.lastInsertRowid;
  });

  const idCompra = crearCompra();
  const compraCreada = db.prepare('SELECT * FROM compras WHERE idCompra = ?').get(idCompra);
  const productos = db.prepare('SELECT * FROM productos_comprados WHERE idCompra = ?').all(idCompra);
  res.status(201).json({ ...compraCreada, productos });
});

app.put('/api/compras/:id', (req, res) => {
  requireFields(req.body, ['idProveedor', 'idUsuario', 'productos']);
  if (!Array.isArray(req.body.productos) || req.body.productos.length === 0) {
    return res.status(400).json({ error: 'La compra debe tener al menos un producto' });
  }

  const editarCompra = db.transaction(() => {
    const compraActual = db.prepare('SELECT * FROM compras WHERE idCompra = ?').get(req.params.id);
    if (!compraActual) {
      const error = new Error('Compra no encontrada');
      error.status = 404;
      throw error;
    }

    const productosAnteriores = db.prepare(`
      SELECT idProducto, cantidadComprada
      FROM productos_comprados
      WHERE idCompra = ? AND idProducto IS NOT NULL
    `).all(req.params.id);
    const descontarExistencia = db.prepare('UPDATE productos SET existencia = existencia - ? WHERE idProducto = ?');
    for (const producto of productosAnteriores) {
      const actual = db.prepare('SELECT existencia FROM productos WHERE idProducto = ?').get(producto.idProducto);
      if (actual.existencia < producto.cantidadComprada) {
        const error = new Error('No se puede editar la compra porque ya se vendio parte del inventario comprado');
        error.status = 400;
        throw error;
      }
      descontarExistencia.run(producto.cantidadComprada, producto.idProducto);
    }

    let monto = 0;
    const productosCompra = [];

    for (const item of req.body.productos) {
      const cantidad = numeric(item.cantidadComprada || item.cantidad, 0);
      const precioCompra = numeric(item.precioCompra, 0);
      if (cantidad <= 0 || precioCompra < 0) {
        const error = new Error('La cantidad debe ser mayor que cero y el costo no puede ser negativo');
        error.status = 400;
        throw error;
      }

      const producto = item.idProducto ? db.prepare('SELECT * FROM productos WHERE idProducto = ?').get(item.idProducto) : null;
      if (item.idProducto && !producto) {
        const error = new Error(`Producto ${item.idProducto} no encontrado`);
        error.status = 404;
        throw error;
      }

      const descripcion = item.descripcion || producto?.descripcion;
      if (!descripcion) {
        const error = new Error('Cada producto comprado debe tener descripcion');
        error.status = 400;
        throw error;
      }

      const precioVenta = numeric(item.precioVenta, producto?.precioVenta || 0);
      monto += precioCompra * cantidad;
      productosCompra.push({
        idProducto: producto?.idProducto || null,
        codigoBarras: producto?.codigoBarras || item.codigoBarras || null,
        descripcion,
        precioCompra,
        precioVenta,
        cantidadComprada: cantidad,
        actualizaInventario: Boolean(producto)
      });
    }

    const pago = numeric(req.body.pago, monto);
    db.prepare(`
      UPDATE compras
      SET monto = ?, pago = ?, idProveedor = ?, idUsuario = ?
      WHERE idCompra = ?
    `).run(monto, pago, req.body.idProveedor, req.body.idUsuario, req.params.id);

    db.prepare('DELETE FROM productos_comprados WHERE idCompra = ?').run(req.params.id);

    const insertarProducto = db.prepare(`
      INSERT INTO productos_comprados (
        idProducto, idCompra, codigoBarras, descripcion, precioCompra, precioVenta, cantidadComprada
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const actualizarProducto = db.prepare(`
      UPDATE productos
      SET existencia = existencia + ?, precioCompra = ?, precioVenta = ?
      WHERE idProducto = ?
    `);

    for (const producto of productosCompra) {
      insertarProducto.run(
        producto.idProducto,
        req.params.id,
        producto.codigoBarras,
        producto.descripcion,
        producto.precioCompra,
        producto.precioVenta,
        producto.cantidadComprada
      );
      if (producto.actualizaInventario) {
        actualizarProducto.run(producto.cantidadComprada, producto.precioCompra, producto.precioVenta, producto.idProducto);
      }
    }
  });

  editarCompra();
  const compraEditada = db.prepare('SELECT * FROM compras WHERE idCompra = ?').get(req.params.id);
  const productos = db.prepare('SELECT * FROM productos_comprados WHERE idCompra = ?').all(req.params.id);
  res.json({ ...compraEditada, productos });
});

app.delete('/api/compras/:id', (req, res) => {
  const anularCompra = db.transaction(() => {
    const compra = db.prepare('SELECT * FROM compras WHERE idCompra = ?').get(req.params.id);
    if (!compra) {
      const error = new Error('Compra no encontrada');
      error.status = 404;
      throw error;
    }

    const productos = db.prepare('SELECT idProducto, cantidadComprada FROM productos_comprados WHERE idCompra = ? AND idProducto IS NOT NULL').all(req.params.id);
    const descontarExistencia = db.prepare('UPDATE productos SET existencia = existencia - ? WHERE idProducto = ?');
    for (const producto of productos) {
      const actual = db.prepare('SELECT existencia FROM productos WHERE idProducto = ?').get(producto.idProducto);
      if (actual.existencia < producto.cantidadComprada) {
        const error = new Error('No se puede anular la compra porque ya se vendio parte del inventario');
        error.status = 400;
        throw error;
      }
      descontarExistencia.run(producto.cantidadComprada, producto.idProducto);
    }
    db.prepare('DELETE FROM compras WHERE idCompra = ?').run(req.params.id);
  });

  anularCompra();
  res.status(204).end();
});

app.get('/api/ventas/contado', (req, res) => {
  const where = [];
  const params = [];

  if (req.query.desde) {
    where.push('date(v.fecha) >= date(?)');
    params.push(req.query.desde);
  }
  if (req.query.hasta) {
    where.push('date(v.fecha) <= date(?)');
    params.push(req.query.hasta);
  }
  if (req.query.idUsuario) {
    where.push('v.idUsuario = ?');
    params.push(req.query.idUsuario);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitSql = req.query.limite === 'todos' ? '' : 'LIMIT 100';

  const ventas = db.prepare(`
    SELECT v.idVenta, v.monto, v.pago, v.estadoPago, (v.monto - v.pago) AS saldo,
           v.fecha, v.idCliente, v.idUsuario,
           c.nombreCompleto AS cliente, u.nombre AS usuario,
           COUNT(pv.idProducto) AS cantidadProductos
    FROM ventas_contado v
    INNER JOIN clientes c ON c.idCliente = v.idCliente
    INNER JOIN usuarios u ON u.idUsuario = v.idUsuario
    LEFT JOIN productos_vendidos pv ON pv.idVenta = v.idVenta
    ${whereSql}
    GROUP BY v.idVenta
    ORDER BY v.idVenta DESC
    ${limitSql}
  `).all(...params);

  const resumen = ventas.reduce((acc, venta) => {
    acc.total += Number(venta.monto || 0);
    acc.pago += Number(venta.pago || 0);
    acc.cantidad += 1;
    return acc;
  }, { total: 0, pago: 0, cantidad: 0 });

  if (req.query.resumen === '1') return res.json({ ventas, resumen });
  res.json(ventas);
});

app.get('/api/ventas/contado/:id', (req, res) => {
  const venta = db.prepare(`
    SELECT v.*, (v.monto - v.pago) AS saldo, c.nombreCompleto AS cliente, c.numeroTelefono, u.nombre AS usuario
    FROM ventas_contado v
    INNER JOIN clientes c ON c.idCliente = v.idCliente
    INNER JOIN usuarios u ON u.idUsuario = v.idUsuario
    WHERE v.idVenta = ?
  `).get(req.params.id);
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

  const productos = db.prepare('SELECT * FROM productos_vendidos WHERE idVenta = ? ORDER BY descripcion').all(req.params.id);
  const pagos = db.prepare(`
    SELECT pv.*, mp.nombre AS medioPago
    FROM pagos_ventas pv
    INNER JOIN medios_pago mp ON mp.idMedioPago = pv.idMedioPago
    WHERE pv.idVenta = ?
    ORDER BY pv.idPagoVenta
  `).all(req.params.id);
  res.json({ ...venta, productos, pagos });
});

app.post('/api/ventas/contado', (req, res) => {
  requireFields(req.body, ['idCliente', 'idUsuario', 'productos']);
  if (!Array.isArray(req.body.productos) || req.body.productos.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  const crearVenta = db.transaction(() => {
    let monto = 0;
    const productosVenta = [];

    for (const item of req.body.productos) {
      const cantidad = numeric(item.cantidadVendida || item.cantidad, 0);
      if (cantidad <= 0) {
        const error = new Error('La cantidad vendida debe ser mayor que cero');
        error.status = 400;
        throw error;
      }

      const producto = db.prepare('SELECT * FROM productos WHERE idProducto = ?').get(item.idProducto);
      if (!producto) {
        const error = new Error(`Producto ${item.idProducto} no encontrado`);
        error.status = 404;
        throw error;
      }
      if (producto.existencia < cantidad) {
        const error = new Error(`Existencia insuficiente para ${producto.descripcion}`);
        error.status = 400;
        throw error;
      }

      const precioVenta = numeric(item.precioVenta, producto.precioVenta);
      monto += precioVenta * cantidad;
      productosVenta.push({ ...producto, cantidadVendida: cantidad, precioVenta });
    }

    const pagos = normalizarPagos(req.body.pagos, req.body.pago);
    const pago = pagos.reduce((sum, item) => sum + numeric(item.monto), 0);
    const estadoPago = estadoPagoDesdeMontos(monto, pago);

    const venta = db.prepare(`
      INSERT INTO ventas_contado (monto, pago, estadoPago, fecha, idCliente, idUsuario)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(monto, pago, estadoPago, nowSql(), req.body.idCliente, req.body.idUsuario);

    const insertarProducto = db.prepare(`
      INSERT INTO productos_vendidos (
        idProducto, codigoBarras, idVenta, descripcion, precioCompra,
        precioVenta, precioVentaOriginal, cantidadVendida
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const actualizarExistencia = db.prepare('UPDATE productos SET existencia = existencia - ? WHERE idProducto = ?');
    const insertarPago = db.prepare('INSERT INTO pagos_ventas (idVenta, idMedioPago, monto, referencia) VALUES (?, ?, ?, ?)');

    for (const producto of productosVenta) {
      insertarProducto.run(
        producto.idProducto,
        producto.codigoBarras,
        venta.lastInsertRowid,
        producto.descripcion,
        producto.precioCompra,
        producto.precioVenta,
        producto.precioVenta,
        producto.cantidadVendida
      );
      actualizarExistencia.run(producto.cantidadVendida, producto.idProducto);
    }

    for (const pagoItem of pagos) {
      const medio = db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ? AND activo = 1').get(pagoItem.idMedioPago);
      if (!medio) {
        const error = new Error(`Medio de pago ${pagoItem.idMedioPago} no disponible`);
        error.status = 400;
        throw error;
      }
      insertarPago.run(venta.lastInsertRowid, pagoItem.idMedioPago, numeric(pagoItem.monto), pagoItem.referencia || null);
    }

    return venta.lastInsertRowid;
  });

  const idVenta = crearVenta();
  const ventaCreada = db.prepare('SELECT * FROM ventas_contado WHERE idVenta = ?').get(idVenta);
  const productos = db.prepare('SELECT * FROM productos_vendidos WHERE idVenta = ?').all(idVenta);
  res.status(201).json({ ...ventaCreada, productos, cambio: ventaCreada.pago - ventaCreada.monto });
});

app.put('/api/ventas/contado/:id', (req, res) => {
  requireFields(req.body, ['idCliente', 'idUsuario', 'productos']);
  if (!Array.isArray(req.body.productos) || req.body.productos.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  const editarVenta = db.transaction(() => {
    const ventaActual = db.prepare('SELECT * FROM ventas_contado WHERE idVenta = ?').get(req.params.id);
    if (!ventaActual) {
      const error = new Error('Venta no encontrada');
      error.status = 404;
      throw error;
    }

    const productosAnteriores = db.prepare('SELECT idProducto, cantidadVendida FROM productos_vendidos WHERE idVenta = ?').all(req.params.id);
    const devolverExistencia = db.prepare('UPDATE productos SET existencia = existencia + ? WHERE idProducto = ?');
    for (const producto of productosAnteriores) {
      devolverExistencia.run(producto.cantidadVendida, producto.idProducto);
    }

    let monto = 0;
    const productosVenta = [];

    for (const item of req.body.productos) {
      const cantidad = numeric(item.cantidadVendida || item.cantidad, 0);
      if (cantidad <= 0) {
        const error = new Error('La cantidad vendida debe ser mayor que cero');
        error.status = 400;
        throw error;
      }

      const producto = db.prepare('SELECT * FROM productos WHERE idProducto = ?').get(item.idProducto);
      if (!producto) {
        const error = new Error(`Producto ${item.idProducto} no encontrado`);
        error.status = 404;
        throw error;
      }
      if (producto.existencia < cantidad) {
        const error = new Error(`Existencia insuficiente para ${producto.descripcion}`);
        error.status = 400;
        throw error;
      }

      const precioVenta = numeric(item.precioVenta, producto.precioVenta);
      monto += precioVenta * cantidad;
      productosVenta.push({ ...producto, cantidadVendida: cantidad, precioVenta });
    }

    const pagos = normalizarPagos(req.body.pagos, req.body.pago);
    const pago = pagos.reduce((sum, item) => sum + numeric(item.monto), 0);
    const estadoPago = estadoPagoDesdeMontos(monto, pago);

    db.prepare(`
      UPDATE ventas_contado
      SET monto = ?, pago = ?, estadoPago = ?, idCliente = ?, idUsuario = ?
      WHERE idVenta = ?
    `).run(monto, pago, estadoPago, req.body.idCliente, req.body.idUsuario, req.params.id);

    db.prepare('DELETE FROM productos_vendidos WHERE idVenta = ?').run(req.params.id);
    db.prepare('DELETE FROM pagos_ventas WHERE idVenta = ?').run(req.params.id);

    const insertarProducto = db.prepare(`
      INSERT INTO productos_vendidos (
        idProducto, codigoBarras, idVenta, descripcion, precioCompra,
        precioVenta, precioVentaOriginal, cantidadVendida
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const actualizarExistencia = db.prepare('UPDATE productos SET existencia = existencia - ? WHERE idProducto = ?');
    const insertarPago = db.prepare('INSERT INTO pagos_ventas (idVenta, idMedioPago, monto, referencia) VALUES (?, ?, ?, ?)');

    for (const producto of productosVenta) {
      insertarProducto.run(
        producto.idProducto,
        producto.codigoBarras,
        req.params.id,
        producto.descripcion,
        producto.precioCompra,
        producto.precioVenta,
        producto.precioVenta,
        producto.cantidadVendida
      );
      actualizarExistencia.run(producto.cantidadVendida, producto.idProducto);
    }

    for (const pagoItem of pagos) {
      const medio = db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ? AND activo = 1').get(pagoItem.idMedioPago);
      if (!medio) {
        const error = new Error(`Medio de pago ${pagoItem.idMedioPago} no disponible`);
        error.status = 400;
        throw error;
      }
      insertarPago.run(req.params.id, pagoItem.idMedioPago, numeric(pagoItem.monto), pagoItem.referencia || null);
    }
  });

  editarVenta();
  const ventaEditada = db.prepare('SELECT * FROM ventas_contado WHERE idVenta = ?').get(req.params.id);
  const productos = db.prepare('SELECT * FROM productos_vendidos WHERE idVenta = ?').all(req.params.id);
  res.json({ ...ventaEditada, productos, cambio: ventaEditada.pago - ventaEditada.monto });
});

app.post('/api/ventas/contado/:id/pagos', (req, res) => {
  requireFields(req.body, ['pagos']);
  if (!Array.isArray(req.body.pagos) || req.body.pagos.length === 0) {
    return res.status(400).json({ error: 'Debe indicar al menos un pago' });
  }

  const registrarPagos = db.transaction(() => {
    const venta = db.prepare('SELECT * FROM ventas_contado WHERE idVenta = ?').get(req.params.id);
    if (!venta) {
      const error = new Error('Venta no encontrada');
      error.status = 404;
      throw error;
    }

    const pagos = normalizarPagos(req.body.pagos, 0);
    if (pagos.length === 0) {
      const error = new Error('Debe indicar pagos validos');
      error.status = 400;
      throw error;
    }

    const insertarPago = db.prepare('INSERT INTO pagos_ventas (idVenta, idMedioPago, monto, referencia) VALUES (?, ?, ?, ?)');
    let nuevoPago = numeric(venta.pago, 0);

    for (const pagoItem of pagos) {
      const medio = db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ? AND activo = 1').get(pagoItem.idMedioPago);
      if (!medio) {
        const error = new Error(`Medio de pago ${pagoItem.idMedioPago} no disponible`);
        error.status = 400;
        throw error;
      }
      insertarPago.run(req.params.id, pagoItem.idMedioPago, numeric(pagoItem.monto), pagoItem.referencia || null);
      nuevoPago += numeric(pagoItem.monto);
    }

    db.prepare('UPDATE ventas_contado SET pago = ?, estadoPago = ? WHERE idVenta = ?')
      .run(nuevoPago, estadoPagoDesdeMontos(venta.monto, nuevoPago), req.params.id);
  });

  registrarPagos();
  const ventaActualizada = db.prepare('SELECT *, (monto - pago) AS saldo FROM ventas_contado WHERE idVenta = ?').get(req.params.id);
  const pagos = db.prepare(`
    SELECT pv.*, mp.nombre AS medioPago
    FROM pagos_ventas pv
    INNER JOIN medios_pago mp ON mp.idMedioPago = pv.idMedioPago
    WHERE pv.idVenta = ?
    ORDER BY pv.idPagoVenta
  `).all(req.params.id);
  res.status(201).json({ ...ventaActualizada, pagos });
});

app.delete('/api/ventas/contado/:id', (req, res) => {
  const anularVenta = db.transaction(() => {
    const venta = db.prepare('SELECT * FROM ventas_contado WHERE idVenta = ?').get(req.params.id);
    if (!venta) {
      const error = new Error('Venta no encontrada');
      error.status = 404;
      throw error;
    }

    const productos = db.prepare('SELECT idProducto, cantidadVendida FROM productos_vendidos WHERE idVenta = ?').all(req.params.id);
    const devolverExistencia = db.prepare('UPDATE productos SET existencia = existencia + ? WHERE idProducto = ?');
    for (const producto of productos) {
      devolverExistencia.run(producto.cantidadVendida, producto.idProducto);
    }
    db.prepare('DELETE FROM ventas_contado WHERE idVenta = ?').run(req.params.id);
  });

  anularVenta();
  res.status(204).end();
});

app.post('/api/ingresos', (req, res) => {
  requireFields(req.body, ['monto', 'descripcion', 'idUsuario']);
  const result = db.prepare('INSERT INTO ingresos (monto, descripcion, fecha, idUsuario) VALUES (?, ?, ?, ?)').run(numeric(req.body.monto), req.body.descripcion, nowSql(), req.body.idUsuario);
  res.status(201).json(db.prepare('SELECT * FROM ingresos WHERE idIngreso = ?').get(result.lastInsertRowid));
});

app.post('/api/egresos', (req, res) => {
  requireFields(req.body, ['monto', 'descripcion', 'idUsuario']);
  const result = db.prepare('INSERT INTO egresos (monto, descripcion, fecha, idUsuario) VALUES (?, ?, ?, ?)').run(numeric(req.body.monto), req.body.descripcion, nowSql(), req.body.idUsuario);
  res.status(201).json(db.prepare('SELECT * FROM egresos WHERE idEgreso = ?').get(result.lastInsertRowid));
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno' });
});

function normalizarPagos(pagos, pagoAnterior) {
  if (Array.isArray(pagos)) {
    return pagos
      .map((pago) => ({
        idMedioPago: pago.idMedioPago,
        monto: numeric(pago.monto),
        referencia: pago.referencia || ''
      }))
      .filter((pago) => pago.idMedioPago && pago.monto > 0);
  }

  const montoAnterior = numeric(pagoAnterior);
  if (montoAnterior <= 0) return [];
  const efectivo = db.prepare("SELECT idMedioPago FROM medios_pago WHERE nombre = 'Efectivo'").get();
  return [{ idMedioPago: efectivo?.idMedioPago || 1, monto: montoAnterior, referencia: '' }];
}

function estadoPagoDesdeMontos(monto, pago) {
  if (pago <= 0) return 'PENDIENTE';
  if (pago < monto) return 'PARCIAL';
  return 'PAGADA';
}

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
