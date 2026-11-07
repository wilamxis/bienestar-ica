const { invalido, noEncontrado, prohibido } = require('../errores');
const ESP = ['pato', 'ganso'], PROP = ['huevo', 'carne', 'otro'], SIST = ['intensivo', 'semi', 'extensivo'];
const ETQ = { codigo: 'Código', nombre: 'Nombre', ubicacion: 'Ubicación', especie: 'Especie', proposito: 'Propósito', sistema: 'Sistema', nAves: 'Número de aves', areaM2: 'Tamaño (m²)', corral: 'Galpón o corral', cama: 'Cama en piso', duenoId: 'Productor (dueño)' };
module.exports = repos => {
  const limpiar = d => ({ codigo: String(d.codigo || '').trim(), nombre: String(d.nombre || '').trim(), ubicacion: String(d.ubicacion || '').trim(), especie: d.especie, proposito: d.proposito, sistema: d.sistema, nAves: Number(d.nAves), areaM2: d.areaM2 === '' || d.areaM2 === null || d.areaM2 === undefined ? null : Number(d.areaM2), corral: !!d.corral, cama: !!d.cama, duenoId: d.duenoId ? Number(d.duenoId) : null });
  function validar(d, idActual) {
    const e = [];
    if (!d.codigo) e.push('El código es obligatorio.'); else if (d.codigo.length > 30) e.push('El código es demasiado largo.');
    const otro = d.codigo && repos.predios.porCodigo(d.codigo); if (otro && otro.id !== idActual) e.push('Ya existe un predio con ese código.');
    if (!d.nombre) e.push('El nombre es obligatorio.'); if (!ESP.includes(d.especie)) e.push('Seleccione la especie.');
    if (!PROP.includes(d.proposito)) e.push('Seleccione el propósito productivo.'); if (!SIST.includes(d.sistema)) e.push('Seleccione el tipo de sistema.');
    if (!Number.isInteger(d.nAves) || d.nAves < 1 || d.nAves > 10000000) e.push('El número de aves debe ser un entero mayor que 0.');
    if (d.areaM2 !== null && (!Number.isFinite(d.areaM2) || d.areaM2 <= 0 || d.areaM2 > 1e9)) e.push('El tamaño del predio debe ser un número mayor que 0 (en metros cuadrados).');
    if (d.duenoId) { const u = repos.usuarios.porId(d.duenoId); if (!u || u.rol !== 'productor' || !u.activo) e.push('El dueño debe ser un usuario productor activo.'); }
    if (e.length) throw invalido(e.join(' '), e);
  }
  const visible = (u, p) => p && (u.rol !== 'productor' || p.duenoId === u.id);
  const bitacora = (u, id, campo, antes, despues) => repos.cambios.registrar({ entidad: 'predio', refId: id, usuarioId: u.id, usuarioNombre: u.nombre, campo, antes, despues });
  const mostrar = (k, v, ref) => (k === 'corral' || k === 'cama' ? (v ? 'Sí' : 'No') : k === 'areaM2' ? (v === null ? 'Sin dato' : v + ' m²') : k === 'duenoId' ? (v ? (repos.usuarios.porId(v) || {}).nombre : 'Sin dueño') : v);
  return {
    async listar(u) {
      const ps = repos.predios.listar(u.rol === 'productor' ? u.id : undefined), evs = repos.evaluaciones.deLosPredios(ps.map(p => p.id));
      return ps.map(p => { const mias = evs.filter(e => e.predioId === p.id && (u.rol !== 'productor' || e.estado === 'cerrada')); const ult = mias.filter(e => e.estado === 'cerrada').slice(-1)[0]; return { ...p, nEvaluaciones: mias.length, ultima: ult ? { id: ult.id, fecha: ult.fecha, final: ult.resultado.final, categoria: ult.resultado.categoria } : null }; });
    },
    async obtener(u, id) { const p = repos.predios.porId(id); if (!visible(u, p)) throw noEncontrado('El predio no existe.'); return { ...p, tieneEvaluaciones: repos.predios.contarEvaluaciones(id) > 0 }; },
    async crear(u, datos) {
      const d = limpiar(datos); validar(d); const p = repos.predios.crear(d);
      bitacora(u, p.id, 'creación', '—', 'Predio ' + p.codigo + ' creado'); return p;
    },
    async editar(u, id, datos) {
      const p = repos.predios.porId(id); if (!p) throw noEncontrado('El predio no existe.');
      const d = limpiar({ ...p, ...datos }); if (repos.predios.contarEvaluaciones(id) > 0) d.especie = p.especie;
      validar(d, id); let n = 0;
      for (const k of Object.keys(ETQ)) if (p[k] !== d[k]) { bitacora(u, id, ETQ[k], mostrar(k, p[k]), mostrar(k, d[k])); n++; }
      return { predio: repos.predios.actualizar(id, d), cambios: n };
    },
    async cambiarEstado(u, id) {
      const p = repos.predios.porId(id); if (!p) throw noEncontrado('El predio no existe.');
      const nuevo = p.estado === 'activo' ? 'inactivo' : 'activo'; bitacora(u, id, 'Estado', p.estado, nuevo); return repos.predios.actualizar(id, { estado: nuevo });
    },
    async eliminar(u, id) {
      const p = repos.predios.porId(id); if (!p) throw noEncontrado('El predio no existe.');
      if (repos.predios.contarEvaluaciones(id) > 0) throw invalido('Un predio con evaluaciones no se elimina: desactívelo para conservar su histórico.');
      repos.transaccion(() => { repos.cambios.eliminarDe('predio', id); repos.predios.eliminar(id); });
    },
    async cambios(u, id) { const p = repos.predios.porId(id); if (!p) throw noEncontrado('El predio no existe.'); return repos.cambios.listar('predio', id); },
    visible
  };
};
