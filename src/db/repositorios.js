/* Capa de acceso a datos (repositorios). El resto de la aplicación solo usa estas funciones.
   Para migrar a PostgreSQL basta con escribir otro archivo con las MISMAS funciones (usando `pg`) y cambiar la línea
   que lo crea en src/app.js. Los servicios usan `await`, así que funcionan igual si las funciones pasan a ser asíncronas. */
const J = JSON.stringify;
const ahora = () => new Date().toISOString();
const b = v => (v ? 1 : 0);

function crearRepositorios(db) {
  const q = sql => db.prepare(sql);

  const aUsuario = r => r && { id: r.id, nombre: r.nombre, email: r.email, rol: r.rol, activo: !!r.activo, creado: r.creado, _hash: r.hash };
  const aPredio = r => r && { id: r.id, codigo: r.codigo, nombre: r.nombre, ubicacion: r.ubicacion, especie: r.especie, proposito: r.proposito, sistema: r.sistema, nAves: r.n_aves, areaM2: r.area_m2 ?? null, corral: !!r.corral, cama: !!r.cama, estado: r.estado, duenoId: r.dueno_id, duenoNombre: r.dueno_nombre || null, creado: r.creado };
  const aEval = r => r && { id: r.id, predioId: r.predio_id, fecha: r.fecha, estado: r.estado, version: r.version, evaluadorId: r.evaluador_id, evaluador: r.evaluador_nombre || null, notas: r.notas, obs: JSON.parse(r.obs_json), resultado: r.resultado_json ? JSON.parse(r.resultado_json) : null, reglaVersion: r.regla_version, creada: r.creada, cerradaEn: r.cerrada_en, motivoAnulacion: r.motivo_anulacion };

  const usuarios = {
    crear: u => aUsuario(q('INSERT INTO usuarios(nombre,email,hash,rol,activo,creado) VALUES(?,?,?,?,1,?) RETURNING *').get(u.nombre, u.email, u.hash, u.rol, ahora())),
    porEmail: e => aUsuario(q('SELECT * FROM usuarios WHERE email = ?').get(e)),
    porId: id => aUsuario(q('SELECT * FROM usuarios WHERE id = ?').get(id)),
    listar: (rol) => (rol ? q('SELECT * FROM usuarios WHERE rol = ? ORDER BY nombre').all(rol) : q('SELECT * FROM usuarios ORDER BY nombre').all()).map(aUsuario),
    actualizar: (id, c) => { const f = [], v = []; for (const [k, x] of Object.entries({ nombre: c.nombre, rol: c.rol, hash: c.hash, activo: c.activo === undefined ? undefined : b(c.activo) })) if (x !== undefined) { f.push(k + ' = ?'); v.push(x); } if (f.length) q(`UPDATE usuarios SET ${f.join(', ')} WHERE id = ?`).run(...v, id); return usuarios.porId(id); },
    contarPorRol: () => q('SELECT rol, COUNT(*) AS n FROM usuarios WHERE activo = 1 GROUP BY rol').all()
  };
  const sesiones = {
    crear: (tokenHash, usuarioId, expira) => q('INSERT INTO sesiones(token_hash,usuario_id,expira) VALUES(?,?,?)').run(tokenHash, usuarioId, expira),
    usuarioDe: tokenHash => { const r = q('SELECT u.*, s.expira FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ?').get(tokenHash); return r && { usuario: aUsuario(r), expira: r.expira }; },
    borrar: tokenHash => q('DELETE FROM sesiones WHERE token_hash = ?').run(tokenHash),
    borrarDeUsuario: id => q('DELETE FROM sesiones WHERE usuario_id = ?').run(id),
    limpiar: () => q('DELETE FROM sesiones WHERE expira < ?').run(ahora())
  };
  const SEL_PRED = 'SELECT p.*, d.nombre AS dueno_nombre FROM predios p LEFT JOIN usuarios d ON d.id = p.dueno_id';
  const predios = {
    crear: p => predios.porId(q('INSERT INTO predios(codigo,nombre,ubicacion,especie,proposito,sistema,n_aves,area_m2,corral,cama,estado,dueno_id,creado) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').get(p.codigo, p.nombre, p.ubicacion || '', p.especie, p.proposito, p.sistema, p.nAves, p.areaM2 ?? null, b(p.corral), b(p.cama), 'activo', p.duenoId || null, p.creado || ahora().slice(0, 10)).id),
    porId: id => aPredio(q(SEL_PRED + ' WHERE p.id = ?').get(id)),
    porCodigo: c => aPredio(q(SEL_PRED + ' WHERE lower(p.codigo) = lower(?)').get(c)),
    listar: (duenoId) => (duenoId ? q(SEL_PRED + ' WHERE p.dueno_id = ? ORDER BY p.codigo').all(duenoId) : q(SEL_PRED + ' ORDER BY p.codigo').all()).map(aPredio),
    actualizar: (id, c) => { const mapa = { codigo: 'codigo', nombre: 'nombre', ubicacion: 'ubicacion', especie: 'especie', proposito: 'proposito', sistema: 'sistema', nAves: 'n_aves', areaM2: 'area_m2', corral: 'corral', cama: 'cama', estado: 'estado', duenoId: 'dueno_id' }; const f = [], v = []; for (const [k, col] of Object.entries(mapa)) if (c[k] !== undefined) { f.push(col + ' = ?'); v.push(k === 'corral' || k === 'cama' ? b(c[k]) : c[k]); } if (f.length) q(`UPDATE predios SET ${f.join(', ')} WHERE id = ?`).run(...v, id); return predios.porId(id); },
    eliminar: id => q('DELETE FROM predios WHERE id = ?').run(id),
    contarEvaluaciones: id => q('SELECT COUNT(*) AS n FROM evaluaciones WHERE predio_id = ?').get(id).n
  };
  const SEL_EV = 'SELECT e.*, u.nombre AS evaluador_nombre FROM evaluaciones e LEFT JOIN usuarios u ON u.id = e.evaluador_id';
  const evaluaciones = {
    crear: e => evaluaciones.porId(q('INSERT INTO evaluaciones(predio_id,fecha,estado,version,evaluador_id,notas,obs_json,resultado_json,regla_version,creada,cerrada_en) VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id').get(e.predioId, e.fecha, e.estado || 'borrador', e.version || 1, e.evaluadorId || null, e.notas || '', J(e.obs || {}), e.resultado ? J(e.resultado) : null, e.reglaVersion || null, e.creada || ahora(), e.cerradaEn || null).id),
    porId: id => aEval(q(SEL_EV + ' WHERE e.id = ?').get(id)),
    deLosPredios: ids => (ids.length ? q(SEL_EV + ` WHERE e.predio_id IN (${ids.map(() => '?').join(',')}) ORDER BY e.fecha, e.creada`).all(...ids) : []).map(aEval),
    deUnPredio: (predioId, soloCerradas) => q(SEL_EV + ' WHERE e.predio_id = ?' + (soloCerradas ? " AND e.estado = 'cerrada'" : '') + ' ORDER BY e.fecha, e.creada').all(predioId).map(aEval),
    actualizar: (id, c) => { const mapa = { fecha: 'fecha', estado: 'estado', version: 'version', evaluadorId: 'evaluador_id', notas: 'notas', reglaVersion: 'regla_version', cerradaEn: 'cerrada_en', motivoAnulacion: 'motivo_anulacion' }; const f = [], v = []; for (const [k, col] of Object.entries(mapa)) if (c[k] !== undefined) { f.push(col + ' = ?'); v.push(c[k]); } if (c.obs !== undefined) { f.push('obs_json = ?'); v.push(J(c.obs)); } if (c.resultado !== undefined) { f.push('resultado_json = ?'); v.push(c.resultado ? J(c.resultado) : null); } if (f.length) q(`UPDATE evaluaciones SET ${f.join(', ')} WHERE id = ?`).run(...v, id); return evaluaciones.porId(id); },
    eliminar: id => q('DELETE FROM evaluaciones WHERE id = ?').run(id)
  };
  const cambios = {
    registrar: c => q('INSERT INTO cambios(entidad,ref_id,fecha,usuario_id,usuario_nombre,campo,antes,despues,motivo) VALUES(?,?,?,?,?,?,?,?,?)').run(c.entidad, c.refId, ahora(), c.usuarioId || null, c.usuarioNombre, c.campo, String(c.antes ?? '—'), String(c.despues ?? '—'), c.motivo || ''),
    listar: (entidad, refId) => q('SELECT * FROM cambios WHERE entidad = ? AND ref_id = ? ORDER BY fecha DESC, id DESC').all(entidad, refId).map(r => ({ id: r.id, fecha: r.fecha, usuario: r.usuario_nombre, campo: r.campo, antes: r.antes, despues: r.despues, motivo: r.motivo })),
    eliminarDe: (entidad, refId) => q('DELETE FROM cambios WHERE entidad = ? AND ref_id = ?').run(entidad, refId)
  };
  const reglas = {
    actual: () => { const r = q('SELECT * FROM reglas ORDER BY version DESC LIMIT 1').get(); return r && { version: r.version, creada: r.creada, creadoPor: r.creado_por, motivo: r.motivo, reglas: JSON.parse(r.json) }; },
    porVersion: v => { const r = q('SELECT * FROM reglas WHERE version = ?').get(v); return r && { version: r.version, creada: r.creada, creadoPor: r.creado_por, motivo: r.motivo, reglas: JSON.parse(r.json) }; },
    versiones: () => q('SELECT version, creada, creado_por, motivo FROM reglas ORDER BY version DESC').all().map(r => ({ version: r.version, creada: r.creada, creadoPor: r.creado_por, motivo: r.motivo })),
    crear: (json, creadoPor, motivo) => { const n = (q('SELECT MAX(version) AS m FROM reglas').get().m || 0) + 1; q('INSERT INTO reglas(version,creada,creado_por,motivo,json) VALUES(?,?,?,?,?)').run(n, ahora(), creadoPor, motivo, J(json)); return n; }
  };
  const repos = { usuarios, sesiones, predios, evaluaciones, cambios, reglas };
  // todo ocurre dentro de la misma tarea de Node (SQLite es síncrono), así que la transacción es atómica
  repos.transaccion = async fn => { db.exec('BEGIN'); try { const r = await fn(repos); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  return repos;
}
module.exports = { crearRepositorios };
