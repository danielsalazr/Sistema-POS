const Database = require('better-sqlite3');
const db = new Database('data/sublime-pos.sqlite', { readonly: true });
const idCompania = 1;
function scalar(sql, params={}) { return db.prepare(sql).get(params)?.total || 0; }
function q(sql, params={}) { return db.prepare(sql).all(params); }
function table(title, rows) { console.log('\n## '+title); console.table(rows); }
const ventasGeneradas = scalar('SELECT COALESCE(SUM(monto),0) total FROM ventas_contado WHERE idCompania=@idCompania',{idCompania});
const ventasCobradas = scalar('SELECT COALESCE(SUM(pago),0) total FROM ventas_contado WHERE idCompania=@idCompania',{idCompania});
const abonos = scalar('SELECT COALESCE(SUM(monto),0) total FROM abonos');
const ingresos = scalar('SELECT COALESCE(SUM(monto),0) total FROM ingresos WHERE idCompania=@idCompania',{idCompania});
const egresos = scalar('SELECT COALESCE(SUM(monto),0) total FROM egresos WHERE idCompania=@idCompania',{idCompania});
const comprasGeneradas = scalar('SELECT COALESCE(SUM(monto),0) total FROM compras WHERE idCompania=@idCompania',{idCompania});
const comprasPagadas = scalar('SELECT COALESCE(SUM(pago),0) total FROM compras WHERE idCompania=@idCompania',{idCompania});
const entradaPA = scalar("SELECT COALESCE(SUM(monto),0) total FROM prestamos_aportes WHERE idCompania=@idCompania AND tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA')",{idCompania});
const salidaPA = scalar("SELECT COALESCE(SUM(monto),0) total FROM prestamos_aportes WHERE idCompania=@idCompania AND tipo IN ('RETIRO_DEL_NEGOCIO','PRESTAMO_DEL_NEGOCIO','DEVOLUCION_PAGADA')",{idCompania});
const entradaSub = scalar("SELECT COALESCE(SUM(s.monto),0) total FROM subsanaciones_prestamos_aportes s JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento WHERE pa.idCompania=@idCompania AND pa.tipo IN ('RETIRO_DEL_NEGOCIO','PRESTAMO_DEL_NEGOCIO','DEVOLUCION_PAGADA')",{idCompania});
const salidaSub = scalar("SELECT COALESCE(SUM(s.monto),0) total FROM subsanaciones_prestamos_aportes s JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento WHERE pa.idCompania=@idCompania AND pa.tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA')",{idCompania});
const totalCaja = ventasCobradas + abonos + ingresos + entradaPA + entradaSub - egresos - comprasPagadas - salidaPA - salidaSub;
console.log('\n## TOTAL CAJA ACTUAL');
console.log(JSON.stringify({ventasGeneradas, ventasCobradas, abonos, ingresos, egresos, comprasGeneradas, comprasPagadas, entradaPA, salidaPA, entradaSub, salidaSub, totalCaja}, null, 2));

table('Ventas con saldo pendiente actuales', q('SELECT idVenta, fecha, monto, pago, monto-pago saldo, estadoPago FROM ventas_contado WHERE idCompania=@idCompania AND pago < monto ORDER BY fecha DESC',{idCompania}));
table('Prestamos/aportes con subsanaciones y saldos', q(`SELECT pa.idMovimiento, pa.fecha, pf.nombre persona, pa.tipo, pa.monto, COALESCE(SUM(s.monto),0) subsanado, pa.monto-COALESCE(SUM(s.monto),0) saldo, pa.descripcion FROM prestamos_aportes pa JOIN personas_financieras pf ON pf.idPersonaFinanciera=pa.idPersonaFinanciera LEFT JOIN subsanaciones_prestamos_aportes s ON s.idMovimiento=pa.idMovimiento WHERE pa.idCompania=@idCompania GROUP BY pa.idMovimiento HAVING ABS(saldo)>0.01 ORDER BY pa.fecha DESC`,{idCompania}));
table('Subsanaciones sin medio de pago', q(`SELECT s.idSubsanacion, s.fecha, s.idMovimiento, pf.nombre persona, pa.tipo, s.monto, s.descripcion FROM subsanaciones_prestamos_aportes s JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento JOIN personas_financieras pf ON pf.idPersonaFinanciera=pa.idPersonaFinanciera WHERE pa.idCompania=@idCompania AND s.idMedioPago IS NULL ORDER BY s.fecha DESC`,{idCompania}));
table('Movimientos de caja por dia desde 2026-06-20', q(`WITH mov AS (
 SELECT date(fecha) dia, 'ventas cobradas' tipo, SUM(pago) valor FROM ventas_contado WHERE idCompania=@idCompania AND date(fecha)>=date('2026-06-20') GROUP BY date(fecha)
 UNION ALL SELECT date(fecha), 'compras pagadas', -SUM(pago) FROM compras WHERE idCompania=@idCompania AND date(fecha)>=date('2026-06-20') GROUP BY date(fecha)
 UNION ALL SELECT date(fecha), 'prestamos/aportes salida', -SUM(monto) FROM prestamos_aportes WHERE idCompania=@idCompania AND tipo IN ('RETIRO_DEL_NEGOCIO','PRESTAMO_DEL_NEGOCIO','DEVOLUCION_PAGADA') AND date(fecha)>=date('2026-06-20') GROUP BY date(fecha)
 UNION ALL SELECT date(fecha), 'prestamos/aportes entrada', SUM(monto) FROM prestamos_aportes WHERE idCompania=@idCompania AND tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA') AND date(fecha)>=date('2026-06-20') GROUP BY date(fecha)
 UNION ALL SELECT date(s.fecha), 'subsanacion entrada', SUM(s.monto) FROM subsanaciones_prestamos_aportes s JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento WHERE pa.idCompania=@idCompania AND pa.tipo IN ('RETIRO_DEL_NEGOCIO','PRESTAMO_DEL_NEGOCIO','DEVOLUCION_PAGADA') AND date(s.fecha)>=date('2026-06-20') GROUP BY date(s.fecha)
 UNION ALL SELECT date(s.fecha), 'subsanacion salida', -SUM(s.monto) FROM subsanaciones_prestamos_aportes s JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento WHERE pa.idCompania=@idCompania AND pa.tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA') AND date(s.fecha)>=date('2026-06-20') GROUP BY date(s.fecha)
 UNION ALL SELECT date(fecha), 'ingresos', SUM(monto) FROM ingresos WHERE idCompania=@idCompania AND date(fecha)>=date('2026-06-20') GROUP BY date(fecha)
 UNION ALL SELECT date(fecha), 'egresos', -SUM(monto) FROM egresos WHERE idCompania=@idCompania AND date(fecha)>=date('2026-06-20') GROUP BY date(fecha)
) SELECT dia, tipo, valor FROM mov WHERE valor IS NOT NULL ORDER BY dia, tipo`,{idCompania}));