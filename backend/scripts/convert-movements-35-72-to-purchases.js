import Database from 'better-sqlite3';
const db = new Database('data/sublime-pos.sqlite');

const tx = db.transaction(() => {
  const proveedorNombre = 'Aportes convertidos';
  let proveedor = db
    .prepare('SELECT * FROM proveedores WHERE idCompania = ? AND lower(nombre) = lower(?)')
    .get(1, proveedorNombre);

  if (!proveedor) {
    const result = db
      .prepare('INSERT INTO proveedores (idCompania, nombre, numeroTelefono, correo, direccion) VALUES (?, ?, ?, ?, ?)')
      .run(1, proveedorNombre, '', '', '');
    proveedor = { idProveedor: result.lastInsertRowid, nombre: proveedorNombre };
  }

  const movimientos = db.prepare(`
    SELECT *
    FROM prestamos_aportes
    WHERE idCompania = 1
      AND idMovimiento BETWEEN 35 AND 72
      AND tipo IN ('APORTE_AL_NEGOCIO', 'PRESTAMO_AL_NEGOCIO', 'DEVOLUCION_RECIBIDA')
    ORDER BY idMovimiento
  `).all();

  const insertCompra = db.prepare(`
    INSERT INTO compras (idCompania, monto, pago, fecha, fechaRegistro, idProveedor, idUsuario)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProducto = db.prepare(`
    INSERT INTO productos_comprados (
      idProducto, idCompra, codigoBarras, descripcion, precioCompra, precioVenta, cantidadComprada
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let creadas = 0;
  let omitidas = 0;

  for (const movimiento of movimientos) {
    const descripcion = `Movimiento #${movimiento.idMovimiento} - ${String(movimiento.descripcion || 'Compra generada desde aporte').trim()}`;
    const existe = db.prepare(`
      SELECT c.idCompra
      FROM compras c
      INNER JOIN productos_comprados pc ON pc.idCompra = c.idCompra
      WHERE c.idCompania = ? AND pc.descripcion = ?
    `).get(movimiento.idCompania, descripcion);

    if (existe) {
      omitidas += 1;
      continue;
    }

    const compra = insertCompra.run(
      movimiento.idCompania,
      movimiento.monto,
      movimiento.monto,
      movimiento.fecha,
      movimiento.fecha,
      proveedor.idProveedor,
      movimiento.idUsuario
    );

    insertProducto.run(null, compra.lastInsertRowid, null, descripcion, movimiento.monto, 0, 1);
    creadas += 1;
  }

  return { proveedor, movimientos: movimientos.length, creadas, omitidas };
});

const result = tx();
console.log(result);
console.log(db.prepare(`
  SELECT COUNT(*) total, COALESCE(SUM(c.monto), 0) monto
  FROM compras c
  INNER JOIN productos_comprados pc ON pc.idCompra = c.idCompra
  WHERE pc.descripcion LIKE 'Movimiento #% - %'
    AND c.idCompania = 1
`).get());
