import { db } from '../src/db.js';

const importMarker = db.prepare("SELECT valor FROM comun WHERE clave = 'IMPORT_MAY_2026_SALES_V1'").get()?.valor;
const whereImport = importMarker ? 'AND v.fechaRegistro = @importMarker' : '';
const params = { importMarker };

console.log(`Lote importado: ${importMarker || 'no encontrado'}`);

console.log('Por fecha:');
console.table(db.prepare(`
  SELECT date(fecha) AS fecha, COUNT(*) AS ventas, SUM(monto) AS total, SUM(pago) AS pagado
  FROM ventas_contado v
  WHERE date(fecha) BETWEEN '2026-05-01' AND '2026-05-10'
  ${whereImport}
  GROUP BY date(fecha)
  ORDER BY fecha
`).all(params));

console.log('Por medio de pago:');
console.table(db.prepare(`
  SELECT mp.nombre, SUM(pv.monto) AS total
  FROM pagos_ventas pv
  INNER JOIN medios_pago mp ON mp.idMedioPago = pv.idMedioPago
  INNER JOIN ventas_contado v ON v.idVenta = pv.idVenta
  WHERE date(v.fecha) BETWEEN '2026-05-01' AND '2026-05-10'
  ${whereImport}
  GROUP BY mp.nombre
  ORDER BY mp.nombre
`).all(params));

console.log('Pendientes:');
console.table(db.prepare(`
  SELECT v.idVenta, v.monto, v.pago, v.estadoPago, c.nombreCompleto AS cliente, pv.descripcion
  FROM ventas_contado v
  INNER JOIN clientes c ON c.idCliente = v.idCliente
  INNER JOIN productos_vendidos pv ON pv.idVenta = v.idVenta
  WHERE v.estadoPago != 'PAGADA'
  ${whereImport}
  ORDER BY v.idVenta DESC
  LIMIT 10
`).all(params));

db.close();
