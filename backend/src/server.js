import cors from 'cors';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { db } from './db.js';
import { normalizeDateTimeInput, nowSql, numeric, requireFields } from './utils.js';

const app = express();
const port = process.env.PORT || 3020;
const printerName = process.env.POS_PRINTER || 'EPSON_TM_T20II';
const DELETE_PASSWORD_SETTING = 'PRESTAMOS_APORTES_DELETE_PASSWORD_HASH';

app.disable('etag');
app.use(cors());
app.use(express.json());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/api/salud', (req, res) => {
  res.json({ ok: true });
});

function companiaId(req) {
  return numeric(req.headers['x-compania-id'] || req.query.idCompania || 1, 1);
}

app.get('/api/companias', (req, res) => {
  res.json(db.prepare('SELECT * FROM companias WHERE activa = 1 ORDER BY nombre').all());
});

app.post('/api/companias', (req, res) => {
  requireFields(req.body, ['nombre']);
  const crear = db.transaction(() => {
    const result = db.prepare('INSERT INTO companias (nombre, activa) VALUES (?, 1)').run(req.body.nombre);
    const idCompania = result.lastInsertRowid;
    db.prepare('INSERT INTO clientes (idCompania, nombreCompleto, numeroTelefono) VALUES (?, ?, ?)').run(idCompania, 'Mostrador', '0000000000');
    db.prepare('INSERT INTO empresa (idCompania, nombre, direccion, telefono, mensajePersonal) VALUES (?, ?, ?, ?, ?)').run(idCompania, '', '', '', '');
    for (const medio of ['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi']) {
      db.prepare('INSERT OR IGNORE INTO medios_pago (idCompania, nombre, activo) VALUES (?, ?, 1)').run(idCompania, medio);
    }
    return idCompania;
  });
  const idCompania = crear();
  res.status(201).json(db.prepare('SELECT * FROM companias WHERE idCompania = ?').get(idCompania));
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
    WHERE idCompania = ? AND (descripcion LIKE ? OR codigoBarras LIKE ?)
    ORDER BY descripcion
  `).all(companiaId(req), q, q);
  res.json(productos);
});

app.get('/api/productos/stock/:cantidad', (req, res) => {
  res.json(db.prepare('SELECT * FROM productos WHERE idCompania = ? AND existencia <= ? ORDER BY existencia ASC').all(companiaId(req), numeric(req.params.cantidad)));
});

app.get('/api/productos/codigo/:codigo', (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE idCompania = ? AND (codigoBarras = ? OR idProducto = ?)').get(companiaId(req), req.params.codigo, numeric(req.params.codigo, -1));
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

app.post('/api/productos', (req, res) => {
  requireFields(req.body, ['descripcion', 'precioCompra', 'precioVenta', 'existencia', 'stock']);
  const result = db.prepare(`
    INSERT INTO productos (idCompania, codigoBarras, descripcion, precioCompra, precioVenta, existencia, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    companiaId(req),
    req.body.codigoBarras || null,
    req.body.descripcion,
    numeric(req.body.precioCompra),
    numeric(req.body.precioVenta),
    numeric(req.body.existencia),
    numeric(req.body.stock)
  );
  res.status(201).json(db.prepare('SELECT * FROM productos WHERE idCompania = ? AND idProducto = ?').get(companiaId(req), result.lastInsertRowid));
});

app.put('/api/productos/:id', (req, res) => {
  requireFields(req.body, ['descripcion', 'precioCompra', 'precioVenta', 'existencia', 'stock']);
  db.prepare(`
    UPDATE productos
    SET codigoBarras = ?, descripcion = ?, precioCompra = ?, precioVenta = ?, existencia = ?, stock = ?
    WHERE idCompania = ? AND idProducto = ?
  `).run(
    req.body.codigoBarras || null,
    req.body.descripcion,
    numeric(req.body.precioCompra),
    numeric(req.body.precioVenta),
    numeric(req.body.existencia),
    numeric(req.body.stock),
    companiaId(req),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM productos WHERE idCompania = ? AND idProducto = ?').get(companiaId(req), req.params.id));
});

app.delete('/api/productos/:id', (req, res) => {
  db.prepare('DELETE FROM productos WHERE idCompania = ? AND idProducto = ?').run(companiaId(req), req.params.id);
  res.status(204).end();
});

app.get('/api/clientes', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(db.prepare(`
    SELECT * FROM clientes
    WHERE idCompania = ? AND (nombreCompleto LIKE ? OR numeroTelefono LIKE ?)
    ORDER BY nombreCompleto
  `).all(companiaId(req), q, q));
});

app.post('/api/clientes', (req, res) => {
  requireFields(req.body, ['nombreCompleto', 'numeroTelefono']);
  const result = db.prepare('INSERT INTO clientes (idCompania, nombreCompleto, numeroTelefono) VALUES (?, ?, ?)').run(companiaId(req), req.body.nombreCompleto, req.body.numeroTelefono);
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
    WHERE idCompania = ? AND (nombre LIKE ? OR numeroTelefono LIKE ? OR correo LIKE ?)
    ORDER BY nombre
  `).all(companiaId(req), q, q, q));
});

app.post('/api/proveedores', (req, res) => {
  requireFields(req.body, ['nombre']);
  const result = db.prepare(`
    INSERT INTO proveedores (idCompania, nombre, numeroTelefono, correo, direccion)
    VALUES (?, ?, ?, ?, ?)
  `).run(companiaId(req), req.body.nombre, req.body.numeroTelefono || '', req.body.correo || '', req.body.direccion || '');
  res.status(201).json(db.prepare('SELECT * FROM proveedores WHERE idProveedor = ?').get(result.lastInsertRowid));
});

app.put('/api/proveedores/:id', (req, res) => {
  requireFields(req.body, ['nombre']);
  db.prepare(`
    UPDATE proveedores
    SET nombre = ?, numeroTelefono = ?, correo = ?, direccion = ?
    WHERE idCompania = ? AND idProveedor = ?
  `).run(req.body.nombre, req.body.numeroTelefono || '', req.body.correo || '', req.body.direccion || '', companiaId(req), req.params.id);
  res.json(db.prepare('SELECT * FROM proveedores WHERE idProveedor = ?').get(req.params.id));
});

app.delete('/api/proveedores/:id', (req, res) => {
  db.prepare('DELETE FROM proveedores WHERE idCompania = ? AND idProveedor = ?').run(companiaId(req), req.params.id);
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
    WHERE pf.idCompania = ? AND (pf.nombre LIKE ? OR pf.relacion LIKE ?)
    GROUP BY pf.idPersonaFinanciera
    ORDER BY pf.nombre
  `).all(companiaId(req), q, q));
});

app.post('/api/personas-financieras', (req, res) => {
  requireFields(req.body, ['nombre', 'relacion']);
  const result = db.prepare(`
    INSERT INTO personas_financieras (idCompania, nombre, relacion, numeroTelefono, notas)
    VALUES (?, ?, ?, ?, ?)
  `).run(companiaId(req), req.body.nombre, req.body.relacion, req.body.numeroTelefono || '', req.body.notas || '');
  res.status(201).json(db.prepare('SELECT * FROM personas_financieras WHERE idPersonaFinanciera = ?').get(result.lastInsertRowid));
});

app.put('/api/personas-financieras/:id', (req, res) => {
  requireFields(req.body, ['nombre', 'relacion']);
  db.prepare(`
    UPDATE personas_financieras
    SET nombre = ?, relacion = ?, numeroTelefono = ?, notas = ?
    WHERE idCompania = ? AND idPersonaFinanciera = ?
  `).run(req.body.nombre, req.body.relacion, req.body.numeroTelefono || '', req.body.notas || '', companiaId(req), req.params.id);
  res.json(db.prepare('SELECT * FROM personas_financieras WHERE idPersonaFinanciera = ?').get(req.params.id));
});

app.delete('/api/personas-financieras/:id', (req, res) => {
  const usado = db.prepare('SELECT COUNT(*) total FROM prestamos_aportes WHERE idPersonaFinanciera = ?').get(req.params.id).total;
  if (usado > 0) return res.status(400).json({ error: 'No se puede eliminar una persona con movimientos registrados' });
  db.prepare('DELETE FROM personas_financieras WHERE idCompania = ? AND idPersonaFinanciera = ?').run(companiaId(req), req.params.id);
  res.status(204).end();
});

app.get('/api/prestamos-aportes', (req, res) => {
  const where = [];
  const params = [];
  if (req.query.idPersonaFinanciera) {
    where.push('pa.idPersonaFinanciera = ?');
    params.push(req.query.idPersonaFinanciera);
  }
  where.push('pa.idCompania = ?');
  params.push(companiaId(req));
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

  const convertirCompra = req.body.compraDesdeMovimiento?.activa === true;
  if (convertirCompra && !['APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA'].includes(req.body.tipo)) {
    return res.status(400).json({ error: 'Solo los movimientos de entrada pueden convertirse en compra' });
  }
  let productosCompraDesdeMovimiento = [];
  let montoCompraDesdeMovimiento = 0;
  if (convertirCompra) {
    if (!req.body.compraDesdeMovimiento.idProveedor) return res.status(400).json({ error: 'Debe seleccionar proveedor para crear la compra' });
    const proveedor = db.prepare('SELECT * FROM proveedores WHERE idCompania = ? AND idProveedor = ?').get(companiaId(req), req.body.compraDesdeMovimiento.idProveedor);
    if (!proveedor) return res.status(400).json({ error: 'Proveedor no disponible para la compra' });
    if (!Array.isArray(req.body.compraDesdeMovimiento.productos) || req.body.compraDesdeMovimiento.productos.length === 0) {
      return res.status(400).json({ error: 'Debe agregar al menos un articulo para crear la compra' });
    }

    productosCompraDesdeMovimiento = req.body.compraDesdeMovimiento.productos.map((item) => {
      const cantidad = numeric(item.cantidadComprada || item.cantidad, 0);
      const precioCompra = numeric(item.precioCompra, 0);
      const descripcion = String(item.descripcion || '').trim();
      if (!descripcion) {
        const error = new Error('Cada articulo de la compra debe tener descripcion');
        error.status = 400;
        throw error;
      }
      if (cantidad <= 0 || precioCompra < 0) {
        const error = new Error('La cantidad debe ser mayor que cero y el costo no puede ser negativo');
        error.status = 400;
        throw error;
      }
      montoCompraDesdeMovimiento += cantidad * precioCompra;
      return { descripcion, cantidadComprada: cantidad, precioCompra };
    });

    if (Math.abs(montoCompraDesdeMovimiento - monto) > 0.01) {
      return res.status(400).json({ error: 'El total de articulos de la compra debe coincidir con el monto del movimiento' });
    }
  }

  const crearMovimiento = db.transaction(() => {
    const fecha = nowSql();
    const result = db.prepare(`
      INSERT INTO prestamos_aportes (idCompania, idPersonaFinanciera, tipo, monto, fecha, descripcion, idUsuario)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(companiaId(req), req.body.idPersonaFinanciera, req.body.tipo, monto, fecha, req.body.descripcion || '', req.body.idUsuario);

    let idCompra = null;
    if (convertirCompra) {
      const compra = db.prepare(`
        INSERT INTO compras (idCompania, monto, pago, fecha, fechaRegistro, idProveedor, idUsuario)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(companiaId(req), montoCompraDesdeMovimiento, montoCompraDesdeMovimiento, fecha, fecha, req.body.compraDesdeMovimiento.idProveedor, req.body.idUsuario);
      idCompra = compra.lastInsertRowid;
      const insertarProductoCompra = db.prepare(`
        INSERT INTO productos_comprados (
          idProducto, idCompra, codigoBarras, descripcion, precioCompra, precioVenta, cantidadComprada
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const producto of productosCompraDesdeMovimiento) {
        insertarProductoCompra.run(null, idCompra, null, producto.descripcion, producto.precioCompra, 0, producto.cantidadComprada);
      }
    }

    return { idMovimiento: result.lastInsertRowid, idCompra };
  });

  const creado = crearMovimiento();
  const movimiento = db.prepare(`
    SELECT pa.*, pf.nombre AS persona, pf.relacion, u.nombre AS usuario
    FROM prestamos_aportes pa
    INNER JOIN personas_financieras pf ON pf.idPersonaFinanciera = pa.idPersonaFinanciera
    INNER JOIN usuarios u ON u.idUsuario = pa.idUsuario
    WHERE pa.idMovimiento = ?
  `).get(creado.idMovimiento);
  res.status(201).json({ ...movimiento, idCompra: creado.idCompra });
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


app.post('/api/prestamos-aportes/:id/eliminar', (req, res) => {
  const idCompania = companiaId(req);
  const confirmacion = String(req.body.confirmacion || '').trim().toUpperCase();
  const contrasena = String(req.body.contrasena || '');
  if (confirmacion !== 'ELIMINAR') return res.status(400).json({ error: 'Debes confirmar escribiendo ELIMINAR' });

  const storedPassword = getCompanySetting(idCompania, DELETE_PASSWORD_SETTING, '');
  if (!storedPassword) return res.status(400).json({ error: 'Configura primero la contraseña de eliminación en Empresa' });
  if (!verifyPassword(contrasena, storedPassword)) return res.status(401).json({ error: 'Contraseña de eliminación incorrecta' });

  const movimiento = db.prepare('SELECT idMovimiento FROM prestamos_aportes WHERE idMovimiento = ? AND idCompania = ?').get(req.params.id, idCompania);
  if (!movimiento) return res.status(404).json({ error: 'Movimiento no encontrado' });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM subsanaciones_prestamos_aportes WHERE idMovimiento = ?').run(req.params.id);
    db.prepare('DELETE FROM prestamos_aportes WHERE idMovimiento = ? AND idCompania = ?').run(req.params.id, idCompania);
  });
  tx();

  res.json({ ok: true });
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
    WHERE idCompania = ?
    ${incluirInactivos ? '' : 'AND activo = 1'}
    ORDER BY nombre
  `).all(companiaId(req));
  res.json(medios);
});

app.post('/api/medios-pago', (req, res) => {
  requireFields(req.body, ['nombre']);
  const result = db.prepare('INSERT INTO medios_pago (idCompania, nombre, activo) VALUES (?, ?, ?)').run(companiaId(req), req.body.nombre, req.body.activo === false ? 0 : 1);
  res.status(201).json(db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ?').get(result.lastInsertRowid));
});

app.put('/api/medios-pago/:id', (req, res) => {
  requireFields(req.body, ['nombre']);
  db.prepare('UPDATE medios_pago SET nombre = ?, activo = ? WHERE idCompania = ? AND idMedioPago = ?').run(req.body.nombre, req.body.activo === false || req.body.activo === 0 ? 0 : 1, companiaId(req), req.params.id);
  res.json(db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ?').get(req.params.id));
});

app.delete('/api/medios-pago/:id', (req, res) => {
  const usado = db.prepare('SELECT COUNT(*) total FROM pagos_ventas WHERE idMedioPago = ?').get(req.params.id).total;
  if (usado > 0) {
    db.prepare('UPDATE medios_pago SET activo = 0 WHERE idCompania = ? AND idMedioPago = ?').run(companiaId(req), req.params.id);
    return res.json(db.prepare('SELECT * FROM medios_pago WHERE idMedioPago = ?').get(req.params.id));
  }
  db.prepare('DELETE FROM medios_pago WHERE idCompania = ? AND idMedioPago = ?').run(companiaId(req), req.params.id);
  res.status(204).end();
});

app.get('/api/ajustes/empresa', (req, res) => {
  let empresa = db.prepare('SELECT * FROM empresa WHERE idCompania = ? ORDER BY idEmpresa LIMIT 1').get(companiaId(req));
  if (!empresa) {
    const result = db.prepare('INSERT INTO empresa (idCompania, nombre, direccion, telefono, mensajePersonal) VALUES (?, ?, ?, ?, ?)').run(companiaId(req), '', '', '', '');
    empresa = db.prepare('SELECT * FROM empresa WHERE idEmpresa = ?').get(result.lastInsertRowid);
  }
  res.json(empresa);
});

app.put('/api/ajustes/empresa', (req, res) => {
  db.prepare(`
    UPDATE empresa
    SET nombre = ?, direccion = ?, telefono = ?, mensajePersonal = ?
    WHERE idCompania = ?
  `).run(req.body.nombre || '', req.body.direccion || '', req.body.telefono || '', req.body.mensajePersonal || '', companiaId(req));
  res.json(db.prepare('SELECT * FROM empresa WHERE idCompania = ? ORDER BY idEmpresa LIMIT 1').get(companiaId(req)));
});

app.get('/api/ajustes/impresion', (req, res) => {
  res.json(getPrintSettings(companiaId(req)));
});

app.put('/api/ajustes/impresion', (req, res) => {
  const width = Math.min(Math.max(numeric(req.body.width, 35), 28), 48);
  const settings = {
    width,
    imprimirTicketCliente: req.body.imprimirTicketCliente === false || req.body.imprimirTicketCliente === 0 ? false : true,
    imprimirComandaCocina: req.body.imprimirComandaCocina === true || req.body.imprimirComandaCocina === 1
  };

  setCompanySetting(companiaId(req), 'IMPRESION_WIDTH', String(settings.width));
  setCompanySetting(companiaId(req), 'IMPRESION_TICKET_CLIENTE', settings.imprimirTicketCliente ? '1' : '0');
  setCompanySetting(companiaId(req), 'IMPRESION_COMANDA_COCINA', settings.imprimirComandaCocina ? '1' : '0');

  res.json(settings);
});


app.get('/api/ajustes/seguridad', (req, res) => {
  const storedPassword = getCompanySetting(companiaId(req), DELETE_PASSWORD_SETTING, '');
  res.json({ contrasenaEliminacionConfigurada: Boolean(storedPassword) });
});

app.put('/api/ajustes/seguridad', (req, res) => {
  const idCompania = companiaId(req);
  const password = String(req.body.contrasenaEliminacion || '').trim();
  if (password) setCompanySetting(idCompania, DELETE_PASSWORD_SETTING, hashPassword(password));
  if (req.body.limpiarContrasena === true) setCompanySetting(idCompania, DELETE_PASSWORD_SETTING, '');

  const storedPassword = getCompanySetting(idCompania, DELETE_PASSWORD_SETTING, '');
  res.json({ contrasenaEliminacionConfigurada: Boolean(storedPassword), contrasenaEliminacion: '' });
});
app.get('/api/caja/resumen', (req, res) => {
  const idCompania = companiaId(req);
  const ventasGeneradas = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM ventas_contado WHERE idCompania = ?').get(idCompania).total;
  const ventasCobradas = db.prepare('SELECT COALESCE(SUM(pago), 0) total FROM ventas_contado WHERE idCompania = ?').get(idCompania).total;
  const abonos = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM abonos').get().total;
  const ingresos = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM ingresos WHERE idCompania = ?').get(idCompania).total;
  const egresos = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM egresos WHERE idCompania = ?').get(idCompania).total;
  const comprasGeneradas = db.prepare('SELECT COALESCE(SUM(monto), 0) total FROM compras WHERE idCompania = ?').get(idCompania).total;
  const comprasPagadas = db.prepare('SELECT COALESCE(SUM(pago), 0) total FROM compras WHERE idCompania = ?').get(idCompania).total;
  const entradaPrestamosAportes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE idCompania = @idCompania AND tipo IN ('APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.idCompania = @idCompania AND pa.tipo IN ('RETIRO_DEL_NEGOCIO', 'PRESTAMO_DEL_NEGOCIO', 'DEVOLUCION_PAGADA')
    )
  `).get({ idCompania }).total;
  const salidaPrestamosAportes = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE idCompania = @idCompania AND tipo IN ('RETIRO_DEL_NEGOCIO', 'PRESTAMO_DEL_NEGOCIO', 'DEVOLUCION_PAGADA')
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.idCompania = @idCompania AND pa.tipo IN ('APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
    )
  `).get({ idCompania }).total;
  const prestamosAportesNeto = entradaPrestamosAportes - salidaPrestamosAportes;
  const aportesEntrada = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE idCompania = @idCompania AND tipo = 'APORTE_AL_NEGOCIO'
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.idCompania = @idCompania AND pa.tipo = 'RETIRO_DEL_NEGOCIO'
    )
  `).get({ idCompania }).total;
  const aportesSalida = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE idCompania = @idCompania AND tipo = 'RETIRO_DEL_NEGOCIO'
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.idCompania = @idCompania AND pa.tipo = 'APORTE_AL_NEGOCIO'
    )
  `).get({ idCompania }).total;
  const prestamosEntrada = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE idCompania = @idCompania AND tipo IN ('PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.idCompania = @idCompania AND pa.tipo IN ('PRESTAMO_DEL_NEGOCIO', 'DEVOLUCION_PAGADA')
    )
  `).get({ idCompania }).total;
  const prestamosSalida = db.prepare(`
    SELECT COALESCE(SUM(monto), 0) total FROM (
      SELECT monto FROM prestamos_aportes WHERE idCompania = @idCompania AND tipo IN ('PRESTAMO_DEL_NEGOCIO', 'DEVOLUCION_PAGADA')
      UNION ALL
      SELECT s.monto
      FROM subsanaciones_prestamos_aportes s
      INNER JOIN prestamos_aportes pa ON pa.idMovimiento = s.idMovimiento
      WHERE pa.idCompania = @idCompania AND pa.tipo IN ('PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
    )
  `).get({ idCompania }).total;
  const aportesNeto = aportesEntrada - aportesSalida;
  const prestamosNeto = prestamosEntrada - prestamosSalida;
  const totalCaja = ventasCobradas + abonos + ingresos + entradaPrestamosAportes - egresos - comprasPagadas - salidaPrestamosAportes;
  const balanceSistema = ventasGeneradas + abonos + ingresos + entradaPrestamosAportes - egresos - comprasGeneradas - salidaPrestamosAportes;
  const pendientePorMover = balanceSistema - totalCaja;

  res.json({
    ventas: ventasCobradas,
    ventasCobradas,
    ventasGeneradas,
    abonos,
    ingresos,
    egresos,
    compras: comprasPagadas,
    comprasPagadas,
    comprasGeneradas,
    entradaPrestamosAportes,
    salidaPrestamosAportes,
      prestamosAportesNeto,
      aportesEntrada,
      aportesSalida,
      aportesNeto,
      prestamosEntrada,
      prestamosSalida,
      prestamosNeto,
    total: totalCaja,
    totalCaja,
    balanceSistema,
    pendientePorMover
  });
});

app.get('/api/compras', (req, res) => {
  const compras = db.prepare(`
    SELECT c.idCompra, c.monto, c.pago, c.fecha, c.idProveedor, c.idUsuario,
           p.nombre AS proveedor, u.nombre AS usuario,
           COUNT(pc.idCompra) AS cantidadProductos
    FROM compras c
    INNER JOIN proveedores p ON p.idProveedor = c.idProveedor
    INNER JOIN usuarios u ON u.idUsuario = c.idUsuario
    LEFT JOIN productos_comprados pc ON pc.idCompra = c.idCompra
    WHERE c.idCompania = ?
    GROUP BY c.idCompra
    ORDER BY c.idCompra DESC
    LIMIT 100
  `).all(companiaId(req));
  res.json(compras);
});

app.get('/api/compras/:id', (req, res) => {
  const compra = db.prepare(`
    SELECT c.*, p.nombre AS proveedor, p.numeroTelefono, p.correo, u.nombre AS usuario
    FROM compras c
    INNER JOIN proveedores p ON p.idProveedor = c.idProveedor
    INNER JOIN usuarios u ON u.idUsuario = c.idUsuario
    WHERE c.idCompania = ? AND c.idCompra = ?
  `).get(companiaId(req), req.params.id);
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

      const producto = item.idProducto ? db.prepare('SELECT * FROM productos WHERE idCompania = ? AND idProducto = ?').get(companiaId(req), item.idProducto) : null;
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
      INSERT INTO compras (idCompania, monto, pago, fecha, fechaRegistro, idProveedor, idUsuario)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(companiaId(req), monto, pago, normalizeDateTimeInput(req.body.fechaMovimiento || req.body.fecha), nowSql(), req.body.idProveedor, req.body.idUsuario);

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
  const compraCreada = db.prepare('SELECT * FROM compras WHERE idCompania = ? AND idCompra = ?').get(companiaId(req), idCompra);
  const productos = db.prepare('SELECT * FROM productos_comprados WHERE idCompra = ?').all(idCompra);
  res.status(201).json({ ...compraCreada, productos });
});

app.put('/api/compras/:id', (req, res) => {
  requireFields(req.body, ['idProveedor', 'idUsuario', 'productos']);
  if (!Array.isArray(req.body.productos) || req.body.productos.length === 0) {
    return res.status(400).json({ error: 'La compra debe tener al menos un producto' });
  }

  const editarCompra = db.transaction(() => {
    const compraActual = db.prepare('SELECT * FROM compras WHERE idCompania = ? AND idCompra = ?').get(companiaId(req), req.params.id);
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

      const producto = item.idProducto ? db.prepare('SELECT * FROM productos WHERE idCompania = ? AND idProducto = ?').get(companiaId(req), item.idProducto) : null;
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
      SET monto = ?, pago = ?, fecha = ?, idProveedor = ?, idUsuario = ?
      WHERE idCompania = ? AND idCompra = ?
    `).run(monto, pago, normalizeDateTimeInput(req.body.fechaMovimiento || req.body.fecha), req.body.idProveedor, req.body.idUsuario, companiaId(req), req.params.id);

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
  const compraEditada = db.prepare('SELECT * FROM compras WHERE idCompania = ? AND idCompra = ?').get(companiaId(req), req.params.id);
  const productos = db.prepare('SELECT * FROM productos_comprados WHERE idCompra = ?').all(req.params.id);
  res.json({ ...compraEditada, productos });
});

app.delete('/api/compras/:id', (req, res) => {
  const anularCompra = db.transaction(() => {
    const compra = db.prepare('SELECT * FROM compras WHERE idCompania = ? AND idCompra = ?').get(companiaId(req), req.params.id);
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

app.get('/api/pedidos-pendientes', (req, res) => {
  const rows = db.prepare(`
    SELECT v.idVenta, v.monto, v.pago, v.estadoPago, v.estadoPreparacion,
           v.fecha, v.fechaRegistro, c.nombreCompleto AS cliente, u.nombre AS usuario,
           pv.idProducto, pv.codigoBarras, pv.descripcion, pv.precioVenta, pv.cantidadVendida, pv.nota
    FROM ventas_contado v
    INNER JOIN clientes c ON c.idCliente = v.idCliente
    INNER JOIN usuarios u ON u.idUsuario = v.idUsuario
    LEFT JOIN productos_vendidos pv ON pv.idVenta = v.idVenta
    WHERE v.idCompania = ? AND v.estadoPreparacion = 'PENDIENTE'
    ORDER BY v.fecha ASC, v.idVenta ASC, pv.descripcion ASC
  `).all(companiaId(req));

  const pedidos = [];
  const byId = new Map();
  for (const row of rows) {
    if (!byId.has(row.idVenta)) {
      const pedido = {
        idVenta: row.idVenta,
        monto: row.monto,
        pago: row.pago,
        estadoPago: row.estadoPago,
        estadoPreparacion: row.estadoPreparacion,
        fecha: row.fecha,
        fechaRegistro: row.fechaRegistro,
        cliente: row.cliente,
        usuario: row.usuario,
        productos: []
      };
      byId.set(row.idVenta, pedido);
      pedidos.push(pedido);
    }

    if (row.descripcion) {
      byId.get(row.idVenta).productos.push({
        idProducto: row.idProducto,
        codigoBarras: row.codigoBarras,
        descripcion: row.descripcion,
        precioVenta: row.precioVenta,
        cantidadVendida: row.cantidadVendida,
        nota: row.nota || ''
      });
    }
  }

  res.json(pedidos);
});

app.post('/api/pedidos/:id/cumplido', (req, res) => {
  const result = db.prepare(`
    UPDATE ventas_contado
    SET estadoPreparacion = 'CUMPLIDO', fechaCumplido = ?
    WHERE idCompania = ? AND idVenta = ? AND estadoPreparacion = 'PENDIENTE'
  `).run(nowSql(), companiaId(req), req.params.id);

  if (result.changes === 0) {
    const venta = db.prepare('SELECT idVenta FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), req.params.id);
    if (!venta) return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  res.json(db.prepare('SELECT idVenta, estadoPreparacion, fechaCumplido FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), req.params.id));
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

  const productosFiltro = []
    .concat(req.query.idProducto || req.query.idProductos || [])
    .flatMap((item) => String(item).split(','))
    .map((item) => numeric(item, 0))
    .filter((item) => item > 0);

  if (productosFiltro.length > 0) {
    where.push(`EXISTS (
      SELECT 1
      FROM productos_vendidos pvf
      WHERE pvf.idVenta = v.idVenta
        AND pvf.idProducto IN (${productosFiltro.map(() => '?').join(',')})
    )`);
    params.push(...productosFiltro);
  }

  where.push('v.idCompania = ?');
  params.push(companiaId(req));

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

  let resumenItems = { totalVendido: 0, totalPagado: 0, cantidad: 0, items: [] };
  if (productosFiltro.length > 0) {
    const itemWhere = [];
    const itemParams = [];

    if (req.query.desde) {
      itemWhere.push('date(v.fecha) >= date(?)');
      itemParams.push(req.query.desde);
    }
    if (req.query.hasta) {
      itemWhere.push('date(v.fecha) <= date(?)');
      itemParams.push(req.query.hasta);
    }
    if (req.query.idUsuario) {
      itemWhere.push('v.idUsuario = ?');
      itemParams.push(req.query.idUsuario);
    }
    itemWhere.push(`pv.idProducto IN (${productosFiltro.map(() => '?').join(',')})`);
    itemParams.push(...productosFiltro);
    itemWhere.push('v.idCompania = ?');
    itemParams.push(companiaId(req));

    const itemWhereSql = `WHERE ${itemWhere.join(' AND ')}`;
    const items = db.prepare(`
      SELECT pv.idProducto,
             pv.descripcion,
             SUM(pv.cantidadVendida) AS cantidad,
             SUM(pv.precioVenta * pv.cantidadVendida) AS totalVendido,
             SUM(CASE WHEN v.pago >= v.monto THEN pv.precioVenta * pv.cantidadVendida ELSE 0 END) AS totalPagado
      FROM productos_vendidos pv
      INNER JOIN ventas_contado v ON v.idVenta = pv.idVenta
      ${itemWhereSql}
      GROUP BY pv.idProducto, pv.descripcion
      ORDER BY pv.descripcion
    `).all(...itemParams);

    const ventasPorItem = db.prepare(`
      SELECT pv.idProducto,
             pv.descripcion,
             pv.cantidadVendida AS cantidad,
             pv.precioVenta,
             pv.precioVenta * pv.cantidadVendida AS totalVendido,
             CASE WHEN v.pago >= v.monto THEN pv.precioVenta * pv.cantidadVendida ELSE 0 END AS totalPagado,
             v.idVenta,
             v.fecha,
             v.monto,
             v.pago,
             v.estadoPago,
             v.estadoPreparacion,
             c.nombreCompleto AS cliente,
             u.nombre AS usuario
      FROM productos_vendidos pv
      INNER JOIN ventas_contado v ON v.idVenta = pv.idVenta
      INNER JOIN clientes c ON c.idCliente = v.idCliente
      INNER JOIN usuarios u ON u.idUsuario = v.idUsuario
      ${itemWhereSql}
      ORDER BY pv.descripcion, v.fecha DESC, v.idVenta DESC
    `).all(...itemParams);

    const ventasByItem = ventasPorItem.reduce((acc, venta) => {
      const key = `${venta.idProducto}|${venta.descripcion}`;
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(venta);
      return acc;
    }, new Map());

    resumenItems = items.reduce((acc, item) => {
      const key = `${item.idProducto}|${item.descripcion}`;
      acc.totalVendido += Number(item.totalVendido || 0);
      acc.totalPagado += Number(item.totalPagado || 0);
      acc.cantidad += Number(item.cantidad || 0);
      acc.items.push({ ...item, ventas: ventasByItem.get(key) || [] });
      return acc;
    }, { totalVendido: 0, totalPagado: 0, cantidad: 0, items: [] });
  }

  if (req.query.resumen === '1') return res.json({ ventas, resumen, resumenItems });
  res.json(ventas);
});

app.get('/api/ventas/contado/:id', (req, res) => {
  const venta = db.prepare(`
    SELECT v.*, (v.monto - v.pago) AS saldo, c.nombreCompleto AS cliente, c.numeroTelefono, u.nombre AS usuario
    FROM ventas_contado v
    INNER JOIN clientes c ON c.idCliente = v.idCliente
    INNER JOIN usuarios u ON u.idUsuario = v.idUsuario
    WHERE v.idCompania = ? AND v.idVenta = ?
  `).get(companiaId(req), req.params.id);
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

app.post('/api/ventas/contado/:id/imprimir', async (req, res, next) => {
  try {
    const idCompania = companiaId(req);
    const venta = ventaCompleta(idCompania, req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    const settings = getPrintSettings(idCompania);
    const impresiones = [];

    if (settings.imprimirTicketCliente) {
      await imprimirTexto(generarTicketVenta(venta, idCompania, settings));
      impresiones.push('ticket_cliente');
    }
    if (settings.imprimirComandaCocina) {
      await imprimirTexto(generarComandaCocina(venta, settings));
      impresiones.push('comanda_cocina');
    }

    res.json({ ok: true, impresora: printerName, impresiones });
  } catch (err) {
    next(err);
  }
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

      const producto = db.prepare('SELECT * FROM productos WHERE idCompania = ? AND idProducto = ?').get(companiaId(req), item.idProducto);
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
      productosVenta.push({ ...producto, cantidadVendida: cantidad, precioVenta, nota: String(item.nota || '').trim() });
    }

    const pagoAplicado = ajustarPagosAlMonto(normalizarPagos(req.body.pagos, req.body.pago), monto);
    const pagos = pagoAplicado.pagos;
    const pago = pagoAplicado.pago;
    const estadoPago = estadoPagoDesdeMontos(monto, pago);

    const venta = db.prepare(`
      INSERT INTO ventas_contado (idCompania, monto, pago, estadoPago, fecha, fechaRegistro, idCliente, idUsuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(companiaId(req), monto, pago, estadoPago, normalizeDateTimeInput(req.body.fechaMovimiento || req.body.fecha), nowSql(), req.body.idCliente, req.body.idUsuario);

    const insertarProducto = db.prepare(`
      INSERT INTO productos_vendidos (
        idProducto, codigoBarras, idVenta, descripcion, precioCompra,
        precioVenta, precioVentaOriginal, cantidadVendida, nota
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        producto.cantidadVendida,
        producto.nota
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

    return { idVenta: venta.lastInsertRowid, cambio: pagoAplicado.cambio };
  });

  const resultadoVenta = crearVenta();
  const idVenta = resultadoVenta.idVenta;
  const ventaCreada = db.prepare('SELECT * FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), idVenta);
  const productos = db.prepare('SELECT * FROM productos_vendidos WHERE idVenta = ?').all(idVenta);
  res.status(201).json({ ...ventaCreada, productos, cambio: resultadoVenta.cambio });
});

app.put('/api/ventas/contado/:id', (req, res) => {
  requireFields(req.body, ['idCliente', 'idUsuario', 'productos']);
  if (!Array.isArray(req.body.productos) || req.body.productos.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  const editarVenta = db.transaction(() => {
    const ventaActual = db.prepare('SELECT * FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), req.params.id);
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

      const producto = db.prepare('SELECT * FROM productos WHERE idCompania = ? AND idProducto = ?').get(companiaId(req), item.idProducto);
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
      productosVenta.push({ ...producto, cantidadVendida: cantidad, precioVenta, nota: String(item.nota || '').trim() });
    }

    const pagoAplicado = ajustarPagosAlMonto(normalizarPagos(req.body.pagos, req.body.pago), monto);
    const pagos = pagoAplicado.pagos;
    const pago = pagoAplicado.pago;
    const estadoPago = estadoPagoDesdeMontos(monto, pago);

    db.prepare(`
      UPDATE ventas_contado
      SET monto = ?, pago = ?, estadoPago = ?, fecha = ?, idCliente = ?, idUsuario = ?
      WHERE idCompania = ? AND idVenta = ?
    `).run(monto, pago, estadoPago, normalizeDateTimeInput(req.body.fechaMovimiento || req.body.fecha), req.body.idCliente, req.body.idUsuario, companiaId(req), req.params.id);

    db.prepare('DELETE FROM productos_vendidos WHERE idVenta = ?').run(req.params.id);
    db.prepare('DELETE FROM pagos_ventas WHERE idVenta = ?').run(req.params.id);

    const insertarProducto = db.prepare(`
      INSERT INTO productos_vendidos (
        idProducto, codigoBarras, idVenta, descripcion, precioCompra,
        precioVenta, precioVentaOriginal, cantidadVendida, nota
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        producto.cantidadVendida,
        producto.nota
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

    return { cambio: pagoAplicado.cambio };
  });

  const resultadoVenta = editarVenta();
  const ventaEditada = db.prepare('SELECT * FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), req.params.id);
  const productos = db.prepare('SELECT * FROM productos_vendidos WHERE idVenta = ?').all(req.params.id);
  res.json({ ...ventaEditada, productos, cambio: resultadoVenta.cambio });
});

app.post('/api/ventas/contado/:id/pagos', (req, res) => {
  requireFields(req.body, ['pagos']);
  if (!Array.isArray(req.body.pagos) || req.body.pagos.length === 0) {
    return res.status(400).json({ error: 'Debe indicar al menos un pago' });
  }

  const registrarPagos = db.transaction(() => {
    const venta = db.prepare('SELECT * FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), req.params.id);
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

    const totalNuevoPago = pagos.reduce((sum, item) => sum + numeric(item.monto), 0);
    const saldoActual = Math.max(numeric(venta.monto) - numeric(venta.pago), 0);
    if (totalNuevoPago > saldoActual) {
      const error = new Error('El pago no puede superar el saldo pendiente de la venta');
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

    db.prepare('UPDATE ventas_contado SET pago = ?, estadoPago = ? WHERE idCompania = ? AND idVenta = ?')
      .run(nuevoPago, estadoPagoDesdeMontos(venta.monto, nuevoPago), companiaId(req), req.params.id);
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
    const venta = db.prepare('SELECT * FROM ventas_contado WHERE idCompania = ? AND idVenta = ?').get(companiaId(req), req.params.id);
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

function ajustarPagosAlMonto(pagos, montoVenta) {
  const totalRecibido = pagos.reduce((sum, item) => sum + numeric(item.monto), 0);
  let restante = Math.max(numeric(montoVenta), 0);
  const pagosAplicados = [];

  for (const pago of pagos) {
    if (restante <= 0) break;
    const montoAplicado = Math.min(numeric(pago.monto), restante);
    if (montoAplicado > 0) {
      pagosAplicados.push({ ...pago, monto: montoAplicado });
      restante -= montoAplicado;
    }
  }

  const pago = pagosAplicados.reduce((sum, item) => sum + numeric(item.monto), 0);
  return {
    pagos: pagosAplicados,
    pago,
    recibido: totalRecibido,
    cambio: Math.max(totalRecibido - pago, 0)
  };
}
function estadoPagoDesdeMontos(monto, pago) {
  if (pago <= 0) return 'PENDIENTE';
  if (pago < monto) return 'PARCIAL';
  return 'PAGADA';
}

function ventaCompleta(idCompania, idVenta) {
  const venta = db.prepare(`
    SELECT v.*, (v.monto - v.pago) AS saldo, c.nombreCompleto AS cliente, c.numeroTelefono, u.nombre AS usuario
    FROM ventas_contado v
    INNER JOIN clientes c ON c.idCliente = v.idCliente
    INNER JOIN usuarios u ON u.idUsuario = v.idUsuario
    WHERE v.idCompania = ? AND v.idVenta = ?
  `).get(idCompania, idVenta);
  if (!venta) return null;

  const productos = db.prepare('SELECT * FROM productos_vendidos WHERE idVenta = ? ORDER BY descripcion').all(idVenta);
  const pagos = db.prepare(`
    SELECT pv.*, mp.nombre AS medioPago
    FROM pagos_ventas pv
    INNER JOIN medios_pago mp ON mp.idMedioPago = pv.idMedioPago
    WHERE pv.idVenta = ?
    ORDER BY pv.idPagoVenta
  `).all(idVenta);
  return { ...venta, productos, pagos };
}

function getCompanySetting(idCompania, clave, fallback) {
  const row = db.prepare('SELECT valor FROM comun WHERE clave = ?').get(`${clave}_${idCompania}`);
  return row?.valor ?? fallback;
}

function setCompanySetting(idCompania, clave, valor) {
  db.prepare(`
    INSERT INTO comun (clave, valor, idCompania)
    VALUES (?, ?, ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, idCompania = excluded.idCompania
  `).run(`${clave}_${idCompania}`, String(valor), idCompania);
}


function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !password) return false;
  const [algorithm, salt, storedHash] = String(storedPassword).split(':');
  if (algorithm !== 'scrypt' || !salt || !storedHash) return password === storedPassword;
  const expected = Buffer.from(storedHash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function getPrintSettings(idCompania) {
  return {
    width: Math.min(Math.max(numeric(getCompanySetting(idCompania, 'IMPRESION_WIDTH', '35'), 35), 28), 48),
    imprimirTicketCliente: getCompanySetting(idCompania, 'IMPRESION_TICKET_CLIENTE', '1') === '1',
    imprimirComandaCocina: getCompanySetting(idCompania, 'IMPRESION_COMANDA_COCINA', '0') === '1'
  };
}

function generarTicketVenta(venta, idCompania, settings = getPrintSettings(idCompania)) {
  const empresa = db.prepare('SELECT * FROM empresa WHERE idCompania = ? ORDER BY idEmpresa LIMIT 1').get(idCompania) || {};
  const nombreEmpresa = (empresa.nombre || 'Dela Crepes').trim();
  const telefono = (empresa.telefono || '').trim();
  const direccion = (empresa.direccion || '').trim();
  const mensaje = (empresa.mensajePersonal || 'Gracias por tu compra').trim();
  const width = settings.width;
  const productWidth = Math.max(width - 17, 12);
  const line = '='.repeat(width);
  const dash = '-'.repeat(width);
  const rows = [];

  rows.push(line);
  rows.push(center(nombreEmpresa.toUpperCase(), width));
  rows.push(center('Dela POS', width));
  if (telefono) rows.push(center(telefono, width));
  if (direccion) rows.push(center(direccion, width));
  rows.push(line);
  rows.push(`Venta: ${String(venta.idVenta).padStart(6, '0')}`);
  rows.push(`Fecha mov.: ${formatTicketDate(venta.fecha)}`);
  rows.push(`Fecha reg.: ${formatTicketDate(venta.fechaRegistro)}`);
  rows.push(`Cliente: ${venta.cliente}`);
  rows.push(`Atendio: ${venta.usuario}`);
  rows.push(dash);
  rows.push(`${'PRODUCTO'.padEnd(productWidth)}${'CANT'.padStart(5)}${'TOTAL'.padStart(12)}`);
  rows.push(dash);

  for (const producto of venta.productos) {
    const cantidad = Number(producto.cantidadVendida || 0);
    const total = Number(producto.precioVenta || 0) * cantidad;
    const wrapped = wrapText(producto.descripcion, productWidth);
    rows.push(`${wrapped[0].padEnd(productWidth)}${formatQty(cantidad).padStart(5)}${formatMoney(total).padStart(12)}`);
    for (const extraLine of wrapped.slice(1)) rows.push(extraLine);
    if (producto.nota) rows.push(`  Nota: ${producto.nota}`);
    rows.push('');
  }

  rows.push(dash);
  rows.push(labelMoney('Subtotal', venta.monto, width));
  rows.push(labelMoney('Pagado', venta.pago, width));
  rows.push(labelMoney('Cambio', Math.max(Number(venta.pago || 0) - Number(venta.monto || 0), 0), width));
  rows.push(labelMoney('Saldo', Math.max(Number(venta.monto || 0) - Number(venta.pago || 0), 0), width));

  if (venta.pagos?.length) {
    rows.push(dash);
    rows.push('Pago:');
    for (const pago of venta.pagos) rows.push(labelMoney(pago.medioPago || 'Pago', pago.monto, width));
  }

  rows.push(line);
  rows.push(center(mensaje, width));
  rows.push(line);
  rows.push('\n\n\n');

  return `${rows.join('\n')}\x1dV\x00`;
}

function generarComandaCocina(venta, settings = { width: 35 }) {
  const width = settings.width;
  const line = '*'.repeat(width);
  const dash = '-'.repeat(width);
  const rows = [];

  rows.push(line);
  rows.push(center('COCINA', width));
  rows.push(line);
  rows.push(`Venta: ${String(venta.idVenta).padStart(6, '0')}`);
  rows.push(`Hora: ${formatTicketDate(venta.fecha)}`);
  rows.push(`Cliente: ${venta.cliente}`);
  rows.push(dash);

  for (const producto of venta.productos) {
    const cantidad = formatQty(producto.cantidadVendida);
    const lines = wrapText(`${cantidad} x ${producto.descripcion}`, width);
    rows.push(...lines);
    if (producto.nota) {
      const noteLines = wrapText(producto.nota.toUpperCase(), width - 4);
      for (const noteLine of noteLines) rows.push(`    ${noteLine}`);
    }
    rows.push('');
  }

  rows.push(dash);
  rows.push('\n\n\n');
  return `${rows.join('\n')}\x1dV\x00`;
}

function imprimirTexto(texto) {
  return new Promise((resolve, reject) => {
    const child = spawn('lp', ['-d', printerName], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      err.status = 500;
      err.message = `No se pudo ejecutar lp: ${err.message}`;
      reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const err = new Error(stderr.trim() || `lp termino con codigo ${code}`);
      err.status = 500;
      reject(err);
    });

    child.stdin.write(texto, 'binary');
    child.stdin.end();
  });
}

function center(text, width) {
  const value = String(text || '').slice(0, width);
  const left = Math.max(Math.floor((width - value.length) / 2), 0);
  return `${' '.repeat(left)}${value}`;
}

function wrapText(text, width) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function formatQty(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function labelMoney(label, value, width) {
  const amount = formatMoney(value);
  return `${String(label).padEnd(Math.max(width - amount.length, 1))}${amount}`;
}

function formatTicketDate(value) {
  if (!value) return '';
  const [datePart, timePart = ''] = String(value).replace('T', ' ').split(' ');
  const [year, month, day] = datePart.split('-');
  const [hour = '00', minute = '00'] = timePart.split(':');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
