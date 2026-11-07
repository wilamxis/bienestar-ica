// Reglas versionadas: cada cambio del administrador crea una versión nueva; las evaluaciones guardan la versión con que se calcularon.
const fs = require('fs'), path = require('path');
const Motor = require('../dominio/motor'), { invalido } = require('../errores');
module.exports = repos => {
  let cache = null;
  const refrescar = () => { cache = null; };
  const actual = async () => cache || (cache = repos.reglas.actual());
  const motivoOk = m => { if (typeof m !== 'string' || m.trim().length < 5) throw invalido('Indique el motivo del cambio (mínimo 5 caracteres).'); return m.trim(); };
  async function inicializar() {
    if (repos.reglas.actual()) return;
    const R = JSON.parse(fs.readFileSync(path.join(__dirname, '../dominio/reglas_ica_v1.json'), 'utf8'));
    const err = Motor.validarReglas(R); if (err.length) throw new Error('Reglas iniciales inválidas: ' + err.join(' '));
    repos.reglas.crear(R, 'sistema', 'Carga inicial: metodología ICA 2024 v1.0'); refrescar();
  }
  async function porVersion(v) { return repos.reglas.porVersion(v); }
  async function publicar(usuario, nuevas, motivo, detalleCambio) {
    const err = Motor.validarReglas(nuevas); if (err.length) throw invalido('Las reglas resultantes no son válidas.', err);
    const v = repos.reglas.crear(nuevas, usuario.nombre, motivo);
    repos.cambios.registrar({ entidad: 'reglas', refId: v, usuarioId: usuario.id, usuarioNombre: usuario.nombre, campo: detalleCambio, antes: 'versión ' + (v - 1), despues: 'versión ' + v, motivo });
    refrescar(); return v;
  }
  const PERMITIDOS = { nivel: ['n', 'ref', 'ops'], pct: ['n', 'ref', 'esc', 'un', 'escala', 'etiquetaX'], dens: ['n', 'ref', 'esc'], cc: ['n', 'ref', 'esc', 'tabla'] };
  async function actualizarIndicador(usuario, id, parche, motivo) {
    motivo = motivoOk(motivo); const { reglas } = await actual(); const R = JSON.parse(JSON.stringify(reglas));
    const ind = R.indicadores.find(i => i.id === id); if (!ind) throw invalido('El indicador no existe.');
    const ok = PERMITIDOS[ind.t]; const raros = Object.keys(parche || {}).filter(k => !ok.includes(k));
    if (!parche || !Object.keys(parche).length || raros.length) throw invalido('Solo se pueden modificar estos campos: ' + ok.join(', ') + '.');
    Object.assign(ind, parche);
    return publicar(usuario, R, motivo, 'Indicador «' + ind.n + '»');
  }
  async function actualizarParametros(usuario, parche, motivo) {
    motivo = motivoOk(motivo); const { reglas } = await actual(); const R = JSON.parse(JSON.stringify(reglas));
    const claves = ['pesos', 'umbrales', 'zonaSensible', 'umbralGrande']; const raros = Object.keys(parche || {}).filter(k => !claves.includes(k));
    if (!parche || !Object.keys(parche).length || raros.length) throw invalido('Solo se pueden modificar: ' + claves.join(', ') + '.');
    Object.assign(R, parche); return publicar(usuario, R, motivo, 'Parámetros generales: ' + Object.keys(parche).join(', '));
  }
  return { inicializar, actual, porVersion, versiones: async () => repos.reglas.versiones(), actualizarIndicador, actualizarParametros, refrescar };
};
