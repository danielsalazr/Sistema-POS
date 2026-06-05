import Database from 'better-sqlite3';
const db = new Database('data/sublime-pos.sqlite');
console.log(db.prepare(`
  SELECT COUNT(*) total, COALESCE(SUM(c.monto), 0) monto
  FROM compras c
  INNER JOIN productos_comprados pc ON pc.idCompra = c.idCompra
  WHERE pc.descripcion LIKE 'Movimiento #% - %'
    AND c.idCompania = 1
`).get());
console.table(db.prepare(`
  SELECT c.idCompra, c.monto, c.fecha, p.nombre AS proveedor, substr(pc.descripcion, 1, 90) AS descripcion
  FROM compras c
  INNER JOIN proveedores p ON p.idProveedor = c.idProveedor
  INNER JOIN productos_comprados pc ON pc.idCompra = c.idCompra
  WHERE pc.descripcion LIKE 'Movimiento #% - %'
    AND c.idCompania = 1
  ORDER BY c.idCompra DESC
  LIMIT 8
`).all());
