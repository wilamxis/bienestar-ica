const Motor = require('../dominio/motor'), { invalido, noEncontrado, ErrorApp } = require('../errores');
module.exports = (repos, reglasSrv, prediosSrv) => {
  const hoy = () => new Date().toISOString().slice(0, 10), ahora = () => new Date().toISOString();
  const bit = (u, id, campo, antes, despues, motivo) => repos.cambios.registrar({ entidad: 'evaluacion', refId: id, usuarioId: u.id, usuarioNombre: u.nombre, campo, antes, despues, motivo });
  const fechaOk = f => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) || f > hoy()) throw invalido('La fecha es obligatoria y no puede ser futura.'); return f; };
  const motivoOk = m => { if (typeof m !== 'string' || m.trim().length < 5) throw invalido('Indique el motivo (mínimo 5 caracteres).'); return m.trim(); };
  // solo se conservan observaciones de indicadores existentes, con la forma esperada (evita datos basura)
  function limpiarObs(R, p, obs) {
    const out = {}; if (!obs || typeof obs !== 'object') return out;
    for (const ind of Motor.indicadoresDe(R, p.especie)) {
      const o = obs[ind.id]; if (!o || typeof o !== 'object') continue;
      if (o.na === true) { out[ind.id] = { na: true }; continue; }
      const n = x => (x === '' || x === null || x === undefined || isNaN(Number(x)) ? undefined : Number(x));
      if (ind.t === 'nivel') { if (Number.isInteger(o.i) && ind.ops[o.i]) out[ind.id] = { i: o.i }; }
      else if (ind.t === 'pct') { const v = n(o.v); if (v !== undefined) out[ind.id] = { v, x: !!o.x }; }
      else if (ind.t === 'dens') { const pe = n(o.peso), de = n(o.dens); if (pe !== undefined && de !== undefined) out[ind.id] = { peso: pe, dens: de }; }
      else if (ind.t === 'cc') { const c = n(o.cc); if (c !== undefined) out[ind.id] = { cc: c }; }
    }
    return out;
  }
  const describir = (R, ind, o, p) => { if (!o) return '(sin dato)'; if (o.na) return 'No aplica'; const r = Motor.puntaje(R, ind, o, p); return r ? `${r.pts} pts · ${r.txt}` : '(incompleto)'; };
  async function cargar(u, id) {
    const e = repos.evaluaciones.porId(id); if (!e) throw noEncontrado('La evaluación no existe.');
    const p = repos.predios.porId(e.predioId);
    if (u.rol === 'productor' && (p.duenoId !== u.id || e.estado !== 'cerrada')) throw noEncontrado('La evaluación no existe.');
    return { e, p };
  }
  return {
    async crear(u, predioId) {
      const p = repos.predios.porId(predioId); if (!p) throw noEncontrado('El predio no existe.');
      if (p.estado !== 'activo') throw invalido('Solo se puede evaluar un predio activo.');
      const { version } = await reglasSrv.actual();
      return repos.evaluaciones.crear({ predioId, fecha: hoy(), evaluadorId: u.id, reglaVersion: version });
    },
    async listarDePredio(u, predioId) {
      const p = await prediosSrv.obtener(u, predioId);
      return repos.evaluaciones.deUnPredio(p.id, u.rol === 'productor');
    },
    async obtener(u, id) {
      const { e, p } = await cargar(u, id);
      return { evaluacion: e, predio: p, cambios: u.rol === 'productor' ? [] : repos.cambios.listar('evaluacion', id) };
    },
    async guardarBorrador(u, id, d) {
      const { e, p } = await cargar(u, id); if (e.estado !== 'borrador') throw invalido('Solo se puede guardar un borrador.');
      const { reglas } = await reglasSrv.actual();
      return repos.evaluaciones.actualizar(id, { fecha: fechaOk(d.fecha), notas: String(d.notas || '').slice(0, 2000), obs: limpiarObs(reglas, p, d.obs), evaluadorId: u.id });
    },
    async cerrar(u, id, d) {
      const { e, p } = await cargar(u, id); if (e.estado !== 'borrador') throw invalido('Solo se puede cerrar un borrador.');
      const act = await reglasSrv.actual(), obs = limpiarObs(act.reglas, p, d.obs), r = Motor.evaluar(act.reglas, p, obs);
      if (!r.completa) throw new ErrorApp(422, 'Faltan indicadores por evaluar.', r.detalle.filter(x => x.estado === 'falta').map(x => x.n));
      const out = repos.evaluaciones.actualizar(id, { fecha: fechaOk(d.fecha), notas: String(d.notas || '').slice(0, 2000), obs, resultado: r, estado: 'cerrada', reglaVersion: act.version, cerradaEn: ahora(), evaluadorId: u.id });
      bit(u, id, 'Estado', 'borrador', 'cerrada (calificación ' + r.final.toFixed(2) + ')', ''); return out;
    },
    async corregir(u, id, d) {
      const { e, p } = await cargar(u, id); if (e.estado !== 'cerrada') throw invalido('Solo se puede corregir una evaluación cerrada.');
      const motivo = motivoOk(d.motivo), fecha = fechaOk(d.fecha);
      const reg = (await reglasSrv.porVersion(e.reglaVersion)).reglas, obs = limpiarObs(reg, p, d.obs), r = Motor.evaluar(reg, p, obs);   // se recalcula con las reglas de esa evaluación
      if (!r.completa) throw new ErrorApp(422, 'Faltan indicadores por evaluar.', r.detalle.filter(x => x.estado === 'falta').map(x => x.n));
      const nv = e.version + 1; let dif = 0;
      repos.transaccion(() => {
        for (const ind of Motor.indicadoresDe(reg, p.especie)) { if (Motor.noAplica(reg, ind, p)) continue; const a = describir(reg, ind, e.obs[ind.id], p), b = describir(reg, ind, obs[ind.id], p); if (a !== b) { bit(u, id, ind.n, a, b, motivo); dif++; } }
        if (fecha !== e.fecha) bit(u, id, 'Fecha', e.fecha, fecha, motivo);
        bit(u, id, 'Calificación final (versión ' + nv + ')', e.resultado.final.toFixed(2), r.final.toFixed(2), motivo);
        repos.evaluaciones.actualizar(id, { obs, fecha, notas: String(d.notas || '').slice(0, 2000), resultado: r, version: nv });
      });
      return { evaluacion: repos.evaluaciones.porId(id), cambios: dif };
    },
    async anular(u, id, d) {
      const { e } = await cargar(u, id); if (e.estado !== 'cerrada') throw invalido('Solo se puede anular una evaluación cerrada.');
      const motivo = motivoOk(d.motivo); bit(u, id, 'Estado', e.estado, 'anulada', motivo);
      return repos.evaluaciones.actualizar(id, { estado: 'anulada', motivoAnulacion: motivo });
    },
    async eliminarBorrador(u, id) {
      const { e } = await cargar(u, id); if (e.estado !== 'borrador') throw invalido('Solo se pueden eliminar borradores.');
      repos.transaccion(() => { repos.cambios.eliminarDe('evaluacion', id); repos.evaluaciones.eliminar(id); });
    },
    limpiarObs
  };
};
