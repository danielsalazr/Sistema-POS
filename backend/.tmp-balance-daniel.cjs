const Database = require('better-sqlite3');
const db = new Database('data/sublime-pos.sqlite', { readonly: true });
const persona = 'Daniel Salazar';
const idCompania = 1;
const entradaTipos = ['APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA'];
const salidaTipos = ['RETIRO_DEL_NEGOCIO','PRESTAMO_DEL_NEGOCIO','DEVOLUCION_PAGADA'];
function table(t, rows){ console.log('\n## '+t); console.table(rows); }
function money(n){ return Number(n||0); }
const personaRow = db.prepare('SELECT * FROM personas_financieras WHERE idCompania=? AND nombre=?').get(idCompania, persona);
console.log('\n## Persona');
console.log(personaRow);
if (!personaRow) process.exit(0);
const id = personaRow.idPersonaFinanciera;
const movimientos = db.prepare(`
  SELECT pa.idMovimiento, pa.fecha, pa.tipo, pa.monto, pa.descripcion,
         COALESCE(SUM(s.monto),0) subsanado,
         pa.monto - COALESCE(SUM(s.monto),0) saldo,
         CASE
           WHEN pa.tipo IN ('APORTE_AL_NEGOCIO','PRESTAMO_AL_NEGOCIO','DEVOLUCION_RECIBIDA') THEN 'NEGOCIO_DEBE'
           ELSE 'DANIEL_DEBE'
         END lado
  FROM prestamos_aportes pa
  LEFT JOIN subsanaciones_prestamos_aportes s ON s.idMovimiento=pa.idMovimiento
  WHERE pa.idCompania=? AND pa.idPersonaFinanciera=?
  GROUP BY pa.idMovimiento
  ORDER BY pa.fecha, pa.idMovimiento
`).all(idCompania, id);
const resumen = movimientos.reduce((acc,m)=>{
  if (m.lado === 'NEGOCIO_DEBE') {
    acc.negocioDebeOriginal += money(m.monto);
    acc.negocioDebeSubsanado += money(m.subsanado);
    acc.negocioDebeSaldo += money(m.saldo);
  } else {
    acc.danielDebeOriginal += money(m.monto);
    acc.danielDebeSubsanado += money(m.subsanado);
    acc.danielDebeSaldo += money(m.saldo);
  }
  return acc;
}, { negocioDebeOriginal:0, negocioDebeSubsanado:0, negocioDebeSaldo:0, danielDebeOriginal:0, danielDebeSubsanado:0, danielDebeSaldo:0 });
resumen.balanceNeto = resumen.danielDebeSaldo - resumen.negocioDebeSaldo;
resumen.interpretacion = resumen.balanceNeto > 0 ? 'Daniel debe al negocio' : resumen.balanceNeto < 0 ? 'El negocio debe a Daniel' : 'Cruzado en cero';
console.log('\n## Resumen balance Daniel');
console.log(JSON.stringify(resumen, null, 2));
table('Movimientos Daniel con saldo', movimientos.map(m=>({id:m.idMovimiento, fecha:m.fecha, lado:m.lado, tipo:m.tipo, monto:m.monto, subsanado:m.subsanado, saldo:m.saldo, descripcion:m.descripcion})));
const subs = db.prepare(`
  SELECT s.idSubsanacion, s.fecha, s.idMovimiento, pa.fecha fechaMovimiento, pa.tipo, pa.monto montoMovimiento,
         s.monto montoSubsanado, mp.nombre medioPago, s.referencia, s.descripcion, pa.descripcion descripcionMovimiento
  FROM subsanaciones_prestamos_aportes s
  JOIN prestamos_aportes pa ON pa.idMovimiento=s.idMovimiento
  LEFT JOIN medios_pago mp ON mp.idMedioPago=s.idMedioPago
  WHERE pa.idCompania=? AND pa.idPersonaFinanciera=?
  ORDER BY s.fecha, s.idSubsanacion
`).all(idCompania,id);
table('Subsanaciones Daniel', subs);
const porTipo = db.prepare(`
  SELECT pa.tipo, COUNT(*) cantidad, SUM(pa.monto) monto, COALESCE(SUM(s.totalSubsanado),0) subsanado, SUM(pa.monto)-COALESCE(SUM(s.totalSubsanado),0) saldo
  FROM prestamos_aportes pa
  LEFT JOIN (SELECT idMovimiento, SUM(monto) totalSubsanado FROM subsanaciones_prestamos_aportes GROUP BY idMovimiento) s ON s.idMovimiento=pa.idMovimiento
  WHERE pa.idCompania=? AND pa.idPersonaFinanciera=?
  GROUP BY pa.tipo
  ORDER BY pa.tipo
`).all(idCompania,id);
table('Resumen por tipo', porTipo);
const caja = movimientos.reduce((acc,m)=>{
  const original = salidaTipos.includes(m.tipo) ? -money(m.monto) : money(m.monto);
  const subsanado = salidaTipos.includes(m.tipo) ? money(m.subsanado) : -money(m.subsanado);
  acc.efectoOriginal += original;
  acc.efectoSubsanaciones += subsanado;
  acc.efectoNeto += original + subsanado;
  return acc;
},{efectoOriginal:0, efectoSubsanaciones:0, efectoNeto:0});
console.log('\n## Efecto acumulado en Total caja por movimientos Daniel');
console.log(JSON.stringify(caja, null, 2));
const ultimos = movimientos.slice(-15);
table('Ultimos 15 movimientos Daniel', ultimos.map(m=>({id:m.idMovimiento, fecha:m.fecha, lado:m.lado, monto:m.monto, subsanado:m.subsanado, saldo:m.saldo, descripcion:m.descripcion})));