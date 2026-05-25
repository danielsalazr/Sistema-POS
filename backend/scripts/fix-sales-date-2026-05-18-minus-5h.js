import { db } from '../src/db.js';

const targetDate = '2026-05-18';

const before = db.prepare(`
  SELECT idVenta, fecha, datetime(fecha, '-5 hours') AS fechaCorregida, monto, pago, estadoPago
  FROM ventas_contado
  WHERE date(fecha) = ?
  ORDER BY idVenta
`).all(targetDate);

console.log('Ventas a corregir:');
console.table(before);

const tx = db.transaction(() => {
  const result = db.prepare(`
    UPDATE ventas_contado
    SET fecha = datetime(fecha, '-5 hours')
    WHERE date(fecha) = ?
  `).run(targetDate);

  return result.changes;
});

const changed = tx();

const after = db.prepare(`
  SELECT idVenta, fecha, monto, pago, estadoPago
  FROM ventas_contado
  WHERE idVenta IN (${before.map(() => '?').join(',') || 'NULL'})
  ORDER BY idVenta
`).all(...before.map((venta) => venta.idVenta));

console.log(`Ventas corregidas: ${changed}`);
console.log('Resultado:');
console.table(after);

db.close();
