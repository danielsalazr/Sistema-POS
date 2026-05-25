import { db } from '../src/db.js';
import { localDateTimeSql } from '../src/utils.js';

const importKey = 'IMPORT_MAY_2026_SALES_V1';

const existingImport = db.prepare('SELECT valor FROM comun WHERE clave = ?').get(importKey);
if (existingImport) {
  console.log(`Importacion ya ejecutada: ${existingImport.valor}`);
  db.close();
  process.exit(0);
}

const rows = [
  ['2026-05-01', 'Bowl (banano, fresa, salsa mora y chips)', 1, 14000, [{ medio: 'Efectivo', monto: 14000 }]],
  ['2026-05-01', 'Caleñito', 1, 14000, [{ medio: 'Nequi', monto: 14000 }]],
  ['2026-05-01', 'coqueta con chips adicional', 1, 14000, [{ medio: 'Nequi', monto: 14000 }]],
  ['2026-05-01', 'crepocho helado adicional', 1, 20000, [{ medio: 'Efectivo', monto: 20000 }]],
  ['2026-05-01', 'crepocho', 1, 18000, [{ medio: 'Nequi', monto: 18000 }]],
  ['2026-05-01', 'crepocho helado adicional', 1, 20000, [{ medio: 'Efectivo', monto: 20000 }]],
  ['2026-05-01', 'goloso', 1, 12000, [{ medio: 'Nequi', monto: 12000 }]],
  ['2026-05-01', 'toxica', 1, 13000, [{ medio: 'Nequi', monto: 13000 }]],
  ['2026-05-01', 'solo fruta', 1, 15000, [{ medio: 'Efectivo', monto: 15000 }]],

  ['2026-05-02', 'calidoso', 1, 11000, [{ medio: 'Nequi', monto: 11000 }]],
  ['2026-05-02', 'sin sentimiento con nutella', 1, 15500, [{ medio: 'Nequi', monto: 15500 }]],
  ['2026-05-02', 'tentacion', 1, 13000, [{ medio: 'Efectivo', monto: 13000 }]],
  ['2026-05-02', 'noche cremosa', 1, 14000, [{ medio: 'Efectivo', monto: 14000 }]],
  ['2026-05-02', 'tentacion', 1, 13000, [{ medio: 'Efectivo', monto: 13000 }]],
  ['2026-05-02', 'goloso con chips', 1, 13000, [], 'Daniel Salazar'],
  ['2026-05-02', 'crepocho', 1, 18000, [{ medio: 'Efectivo', monto: 18000 }]],
  ['2026-05-02', 'caleñito', 1, 14000, [{ medio: 'Efectivo', monto: 14000 }]],
  ['2026-05-02', 'sin sentimientos', 1, 15500, [{ medio: 'Efectivo', monto: 15500 }]],
  ['2026-05-02', 'noche cremosa', 1, 13000, [{ medio: 'Efectivo', monto: 13000 }]],

  ['2026-05-03', 'caleñito y botella de agua', 1, 16000, [{ medio: 'Efectivo', monto: 16000 }]],
  ['2026-05-03', 'caleñito', 1, 14000, [{ medio: 'Efectivo', monto: 14000 }]],
  ['2026-05-03', 'tentacion y noche cremosa', 1, 26000, [{ medio: 'Nequi', monto: 26000 }]],
  ['2026-05-03', 'noche cremosa', 1, 13000, [{ medio: 'Nequi', monto: 11000 }, { medio: 'Efectivo', monto: 2000 }]],
  ['2026-05-03', 'noche cremosa', 1, 13000, [{ medio: 'Efectivo', monto: 13000 }]],
  ['2026-05-03', 'noche cremosa y botella de agua', 1, 15000, [{ medio: 'Efectivo', monto: 15000 }]],
  ['2026-05-03', 'agua', 1, 2000, [{ medio: 'Nequi', monto: 2000 }]],
  ['2026-05-03', 'goloso', 1, 12000, [{ medio: 'Efectivo', monto: 12000 }]],
  ['2026-05-03', 'noche cremosa', 1, 13000, [{ medio: 'Efectivo', monto: 13000 }]],
  ['2026-05-03', 'burritos', 2, 26000, [{ medio: 'Efectivo', monto: 26000 }]],

  ['2026-05-08', 'calidoso', 1, 11000, [{ medio: 'Nequi', monto: 11000 }]],
  ['2026-05-08', 'burrito y noche cremosa', 1, 28000, [{ medio: 'NU', monto: 28000 }]],
  ['2026-05-08', 'goloso, tentacion, sin sentimientos', 1, 37000, [{ medio: 'Efectivo', monto: 37000 }]],
  ['2026-05-08', 'tentacion', 1, 12000, [{ medio: 'Efectivo', monto: 12000 }]],
  ['2026-05-08', 'noche cremosa', 1, 13000, [{ medio: 'Efectivo', monto: 13000 }]],
  ['2026-05-08', 'tentacion con adicion de helado', 1, 14000, [{ medio: 'Nequi', monto: 14000 }]],
  ['2026-05-08', 'agua', 1, 2000, [{ medio: 'Efectivo', monto: 2000 }]],
  ['2026-05-08', 'fruta con crema', 1, 14000, [{ medio: 'Efectivo', monto: 14000 }]],

  ['2026-05-09', 'sin sentimientos y calidoso con helado', 1, 26000, [{ medio: 'Nequi', monto: 26000 }]],
  ['2026-05-09', 'tentación con helado', 1, 15000, [{ medio: 'Nequi', monto: 15000 }]],
  ['2026-05-09', 'calidoso', 1, 11000, [{ medio: 'Efectivo', monto: 11000 }]],
  ['2026-05-09', 'burrito de pollo', 1, 12000, [{ medio: 'Efectivo', monto: 12000 }]],
  ['2026-05-09', 'burrito de carne', 1, 14000, [{ medio: 'Efectivo', monto: 14000 }]],
  ['2026-05-10', 'burrito mixto y pollo', 1, 29000, [{ medio: 'Nequi', monto: 29000 }]],
  ['2026-05-09', 'burrito mixto', 1, 15000, [{ medio: 'Nequi', monto: 15000 }]],
  ['2026-05-10', 'burritos mixtos', 2, 30000, [{ medio: 'Efectivo', monto: 30000 }]],
  ['2026-05-10', 'burrito de carne', 1, 14000, [{ medio: 'Nequi', monto: 14000 }]],
  ['2026-05-10', '2 mixtos y un crepé noche cremosa', 1, 45000, [{ medio: 'Efectivo', monto: 45000 }]],
  ['2026-05-10', '5 mixtos, 1 carne, 1 pollo, 3 crepes noche cremosa dos con helado', 1, 150000, [{ medio: 'Efectivo', monto: 150000 }]],
  ['2026-05-10', '1 burrito mixto', 1, 16000, [{ medio: 'Nequi', monto: 16000 }]]
];

function ensureCliente(nombre) {
  const existing = db.prepare('SELECT idCliente FROM clientes WHERE nombreCompleto = ?').get(nombre);
  if (existing) return existing.idCliente;
  return db.prepare('INSERT INTO clientes (nombreCompleto, numeroTelefono) VALUES (?, ?)').run(nombre, '').lastInsertRowid;
}

function ensureMedioPago(nombre) {
  const normalized = nombre.trim();
  const existing = db.prepare('SELECT idMedioPago FROM medios_pago WHERE lower(nombre) = lower(?)').get(normalized);
  if (existing) return existing.idMedioPago;
  return db.prepare('INSERT INTO medios_pago (nombre, activo) VALUES (?, 1)').run(normalized).lastInsertRowid;
}

const tx = db.transaction(() => {
  const idUsuario = db.prepare("SELECT idUsuario FROM usuarios WHERE nombre = 'admin'").get()?.idUsuario || 1;
  const idMostrador = ensureCliente('Mostrador');
  const idDaniel = ensureCliente('Daniel Salazar');
  const fechaRegistro = localDateTimeSql();

  const insertVenta = db.prepare(`
    INSERT INTO ventas_contado (monto, pago, estadoPago, fecha, fechaRegistro, idCliente, idUsuario)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDetalle = db.prepare(`
    INSERT INTO productos_vendidos (
      idProducto, codigoBarras, idVenta, descripcion, precioCompra,
      precioVenta, precioVentaOriginal, cantidadVendida
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPago = db.prepare('INSERT INTO pagos_ventas (idVenta, idMedioPago, monto, referencia) VALUES (?, ?, ?, ?)');

  let total = 0;
  let pagado = 0;
  for (const [date, descripcion, cantidad, monto, pagos, clientePendiente] of rows) {
    const pago = pagos.reduce((sum, item) => sum + item.monto, 0);
    const estadoPago = pago <= 0 ? 'PENDIENTE' : pago < monto ? 'PARCIAL' : 'PAGADA';
    const idCliente = clientePendiente === 'Daniel Salazar' ? idDaniel : idMostrador;
    const idVenta = insertVenta.run(monto, pago, estadoPago, `${date} 00:00:00`, fechaRegistro, idCliente, idUsuario).lastInsertRowid;
    const precioUnitario = monto / cantidad;

    insertDetalle.run(0, null, idVenta, descripcion.trim(), 0, precioUnitario, precioUnitario, cantidad);
    for (const pagoItem of pagos) {
      insertPago.run(idVenta, ensureMedioPago(pagoItem.medio), pagoItem.monto, '');
    }

    total += monto;
    pagado += pago;
  }

  db.prepare('INSERT INTO comun (clave, valor) VALUES (?, ?)').run(importKey, fechaRegistro);
  return { cantidad: rows.length, total, pagado, pendiente: total - pagado };
});

const result = tx();
console.log(result);
db.close();
