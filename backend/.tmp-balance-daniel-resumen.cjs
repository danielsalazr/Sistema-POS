const Database = require('better-sqlite3');
const db = new Database('data/sublime-pos.sqlite', { readonly: true });
const idCompania = 1;
const persona = 'Daniel Salazar';
const p = db.prepare('SELECT idPersonaFinanciera FROM personas_financieras WHERE idCompania=? AND nombre=?').get(idCompania, persona);
function table(t, rows){ console.log('\n## '+t); console.table(rows); }
const params = { idCompania, idPersonaFinanciera: p.idPersonaFinanciera };
table('Totales por lado', db.prepare(`
  SELECT CASE WHEN pa.tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA') THEN 'NEGOCIO_DEBE_A_DANIEL' ELSE 'DANIEL_DEBE_AL_NEGOCIO' END lado,
         COUNT(*) movimientos,
         SUM(pa.monto) montoOriginal,
         COALESCE(SUM(s.totalSubsanado),0) subsanado,
         SUM(pa.monto)-COALESCE(SUM(s.totalSubsanado),0) saldo
  FROM prestamos_aportes pa
  LEFT JOIN (SELECT idMovimiento, SUM(monto) totalSubsanado FROM subsanaciones_prestamos_aportes GROUP BY idMovimiento) s ON s.idMovimiento=pa.idMovimiento
  WHERE pa.idCompania=@idCompania AND pa.idPersonaFinanciera=@idPersonaFinanciera
  GROUP BY lado
`).all(params));
table('Totales por tipo', db.prepare(`
  SELECT pa.tipo, COUNT(*) movimientos, SUM(pa.monto) montoOriginal, COALESCE(SUM(s.totalSubsanado),0) subsanado, SUM(pa.monto)-COALESCE(SUM(s.totalSubsanado),0) saldo
  FROM prestamos_aportes pa
  LEFT JOIN (SELECT idMovimiento, SUM(monto) totalSubsanado FROM subsanaciones_prestamos_aportes GROUP BY idMovimiento) s ON s.idMovimiento=pa.idMovimiento
  WHERE pa.idCompania=@idCompania AND pa.idPersonaFinanciera=@idPersonaFinanciera
  GROUP BY pa.tipo
  ORDER BY pa.tipo
`).all(params));
table('Saldos abiertos Daniel', db.prepare(`
  SELECT pa.idMovimiento, pa.fecha,
         CASE WHEN pa.tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA') THEN 'NEGOCIO_DEBE_A_DANIEL' ELSE 'DANIEL_DEBE_AL_NEGOCIO' END lado,
         pa.tipo, pa.monto, COALESCE(s.totalSubsanado,0) subsanado, pa.monto-COALESCE(s.totalSubsanado,0) saldo, pa.descripcion
  FROM prestamos_aportes pa
  LEFT JOIN (SELECT idMovimiento, SUM(monto) totalSubsanado FROM subsanaciones_prestamos_aportes GROUP BY idMovimiento) s ON s.idMovimiento=pa.idMovimiento
  WHERE pa.idCompania=@idCompania AND pa.idPersonaFinanciera=@idPersonaFinanciera AND ABS(pa.monto-COALESCE(s.totalSubsanado,0)) > 0.01
  ORDER BY pa.fecha DESC, pa.idMovimiento DESC
`).all(params));
table('Subsanaciones recientes Daniel desde 2026-06-20', db.prepare(`
  SELECT s.idSubsanacion, s.fecha, s.idMovimiento, pa.tipo, pa.descripcion movimiento, s.monto, mp.nombre medioPago
  FROM subsanaciones_prestamos_aportes s
  JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento
  LEFT JOIN medios_pago mp ON mp.idMedioPago=s.idMedioPago
  WHERE pa.idCompania=@idCompania AND pa.idPersonaFinanciera=@idPersonaFinanciera AND date(s.fecha)>=date('2026-06-20')
  ORDER BY s.fecha, s.idSubsanacion
`).all(params));