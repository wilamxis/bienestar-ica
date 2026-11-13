/* Repositorios para PostgreSQL: MISMAS funciones que repositorios.js (SQLite), pero asíncronas.
   Los servicios no saben qué base de datos hay debajo. */
const J = JSON.stringify, ahora = () => new Date().toISOString(), ent = x => Number.isInteger(x);

function fabricar(q) {
  const todos = async (t, p) => (await q(t, p)).rows, uno = async (t, p) => (await q(t, p)).rows[0] || null;
  const actualizarDin = async (tabla, col, id, campos) => { const f = [], v = []; for (const [k, x] of campos) if (x !== undefined) { v.push(x); f.push(`${k} = $${v.length}`); } if (f.length) { v.push(id); await q(`UPDATE ${tabla} SET ${f.join(', ')} WHERE ${col} = $${v.length}`, v); } };
  const aUsuario = r => r && { id: r.id, nombre: r.nombre, email: r.email, rol: r.rol, activo: !!r.activo, creado: r.creado, _hash: r.hash };
  const aPredio = r => r && { id: r.id, codigo: r.codigo, nombre: r.nombre, ubicacion: r.ubicacion, especie: r.especie, proposito: r.proposito, sistema: r.sistema, nAves: r.n_aves, areaM2: r.area_m2 ?? null, corral: !!r.corral, cama: !!r.cama, estado: r.estado, duenoId: r.dueno_id, duenoNombre: r.dueno_nombre || null, creado: r.creado };
  const aEval = r => r && { id: r.id, predioId: r.predio_id, fecha: r.fecha, estado: r.estado, version: r.version, evaluadorId: r.evaluador_id, evaluador: r.evaluador_nombre || null, notas: r.notas, obs: JSON.parse(r.obs_json), resultado: r.resultado_json ? JSON.parse(r.resultado_json) : null, reglaVersion: r.regla_version, creada: r.creada, cerradaEn: r.cerrada_en, motivoAnulacion: r.motivo_anulacion };
  const aRegla = r => r && { version: r.version, creada: r.creada, creadoPor: r.creado_por, motivo: r.motivo, reglas: JSON.parse(r.json) };

  const usuarios = {
    crear: async u => aUsuario(await uno('INSERT INTO usuarios(nombre,email,hash,rol,activo,creado) VALUES($1,$2,$3,$4,TRUE,$5) RETURNING *', [u.nombre, u.email, u.hash, u.rol, ahora()])),
    porEmail: async e => aUsuario(await uno('SELECT * FROM usuarios WHERE email = $1', [e])),
    porId: async id => (ent(id) ? aUsuario(await uno('SELECT * FROM usuarios WHERE id = $1', [id])) : null),
    listar: async rol => (await (rol ? todos('SELECT * FROM usuarios WHERE rol = $1 ORDER BY nombre', [rol]) : todos('SELECT * FROM usuarios ORDER BY nombre'))).map(aUsuario),
    actualizar: async (id, c) => { await actualizarDin('usuarios', 'id', id, [['nombre', c.nombre], ['rol', c.rol], ['hash', c.hash], ['activo', c.activo === undefined ? undefined : !!c.activo]]); return usuarios.porId(id); },
    contarPorRol: async () => (await todos('SELECT rol, COUNT(*) AS n FROM usuarios WHERE activo = TRUE GROUP BY rol')).map(r => ({ rol: r.rol, n: Number(r.n) }))
  };
  const sesiones = {
    crear: async (tokenHash, usuarioId, expira) => { await q('INSERT INTO sesiones(token_hash,usuario_id,expira) VALUES($1,$2,$3)', [tokenHash, usuarioId, expira]); },
    usuarioDe: async tokenHash => { const r = await uno('SELECT u.*, s.expira FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = $1', [tokenHash]); return r && { usuario: aUsuario(r), expira: r.expira }; },
    borrar: async tokenHash => { await q('DELETE FROM sesiones WHERE token_hash = $1', [tokenHash]); },
    borrarDeUsuario: async id => { await q('DELETE FROM sesiones WHERE usuario_id = $1', [id]); },
    limpiar: async () => { await q('DELETE FROM sesiones WHERE expira < $1', [ahora()]); }
  };
  const SEL_PRED = 'SELECT p.*, d.nombre AS dueno_nombre FROM predios p LEFT JOIN usuarios d ON d.id = p.dueno_id';
  const predios = {
    crear: async p => predios.porId((await uno('INSERT INTO predios(codigo,nombre,ubicacion,especie,proposito,sistema,n_aves,area_m2,corral,cama,estado,dueno_id,creado) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id', [p.codigo, p.nombre, p.ubicacion || '', p.especie, p.proposito, p.sistema, p.nAves, p.areaM2 ?? null, !!p.corral, !!p.cama, 'activo', p.duenoId || null, p.creado || ahora().slice(0, 10)])).id),
    porId: async id => (ent(id) ? aPredio(await uno(SEL_PRED + ' WHERE p.id = $1', [id])) : null),
    porCodigo: async c => aPredio(await uno(SEL_PRED + ' WHERE lower(p.codigo) = lower($1)', [c])),
    listar: async duenoId => (await (duenoId ? todos(SEL_PRED + ' WHERE p.dueno_id = $1 ORDER BY p.codigo', [duenoId]) : todos(SEL_PRED + ' ORDER BY p.codigo'))).map(aPredio),
    actualizar: async (id, c) => { await actualizarDin('predios', 'id', id, [['codigo', c.codigo], ['nombre', c.nombre], ['ubicacion', c.ubicacion], ['especie', c.especie], ['proposito', c.proposito], ['sistema', c.sistema], ['n_aves', c.nAves], ['area_m2', c.areaM2], ['corral', c.corral === undefined ? undefined : !!c.corral], ['cama', c.cama === undefined ? undefined : !!c.cama], ['estado', c.estado], ['dueno_id', c.duenoId]]); return predios.porId(id); },
    eliminar: async id => { await q('DELETE FROM predios WHERE id = $1', [id]); },
    contarEvaluaciones: async id => Number((await uno('SELECT COUNT(*) AS n FROM evaluaciones WHERE predio_id = $1', [id])).n)
  };
  const SEL_EV = 'SELECT e.*, u.nombre AS evaluador_nombre FROM evaluaciones e LEFT JOIN usuarios u ON u.id = e.evaluador_id';
  const evaluaciones = {
    crear: async e => evaluaciones.porId((await uno('INSERT INTO evaluaciones(predio_id,fecha,estado,version,evaluador_id,notas,obs_json,resultado_json,regla_version,creada,cerrada_en) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id', [e.predioId, e.fecha, e.estado || 'borrador', e.version || 1, e.evaluadorId || null, e.notas || '', J(e.obs || {}), e.resultado ? J(e.resultado) : null, e.reglaVersion || null, e.creada || ahora(), e.cerradaEn || null])).id),
    porId: async id => (ent(id) ? aEval(await uno(SEL_EV + ' WHERE e.id = $1', [id])) : null),
    deLosPredios: async ids => (ids.length ? (await todos(SEL_EV + ' WHERE e.predio_id = ANY($1::int[]) ORDER BY e.fecha, e.creada', [ids])).map(aEval) : []),
    deUnPredio: async (predioId, soloCerradas) => (await todos(SEL_EV + ' WHERE e.predio_id = $1' + (soloCerradas ? " AND e.estado = 'cerrada'" : '') + ' ORDER BY e.fecha, e.creada', [predioId])).map(aEval),
    actualizar: async (id, c) => { await actualizarDin('evaluaciones', 'id', id, [['fecha', c.fecha], ['estado', c.estado], ['version', c.version], ['evaluador_id', c.evaluadorId], ['notas', c.notas], ['regla_version', c.reglaVersion], ['cerrada_en', c.cerradaEn], ['motivo_anulacion', c.motivoAnulacion], ['obs_json', c.obs === undefined ? undefined : J(c.obs)], ['resultado_json', c.resultado === undefined ? undefined : (c.resultado ? J(c.resultado) : null)]]); return evaluaciones.porId(id); },
    eliminar: async id => { await q('DELETE FROM evaluaciones WHERE id = $1', [id]); }
  };
  const cambios = {
    registrar: async c => { await q('INSERT INTO cambios(entidad,ref_id,fecha,usuario_id,usuario_nombre,campo,antes,despues,motivo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [c.entidad, c.refId, ahora(), c.usuarioId || null, c.usuarioNombre, c.campo, String(c.antes ?? '—'), String(c.despues ?? '—'), c.motivo || '']); },
    listar: async (entidad, refId) => (await todos('SELECT * FROM cambios WHERE entidad = $1 AND ref_id = $2 ORDER BY fecha DESC, id DESC', [entidad, refId])).map(r => ({ id: r.id, fecha: r.fecha, usuario: r.usuario_nombre, campo: r.campo, antes: r.antes, despues: r.despues, motivo: r.motivo })),
    eliminarDe: async (entidad, refId) => { await q('DELETE FROM cambios WHERE entidad = $1 AND ref_id = $2', [entidad, refId]); }
  };
  const reglas = {
    actual: async () => aRegla(await uno('SELECT * FROM reglas ORDER BY version DESC LIMIT 1')),
    porVersion: async v => (ent(v) ? aRegla(await uno('SELECT * FROM reglas WHERE version = $1', [v])) : null),
    versiones: async () => (await todos('SELECT version, creada, creado_por, motivo FROM reglas ORDER BY version DESC')).map(r => ({ version: r.version, creada: r.creada, creadoPor: r.creado_por, motivo: r.motivo })),
    crear: async (json, creadoPor, motivo) => { const n = Number((await uno('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM reglas')).n); await q('INSERT INTO reglas(version,creada,creado_por,motivo,json) VALUES($1,$2,$3,$4,$5)', [n, ahora(), creadoPor, motivo, J(json)]); return n; }
  };
  return { usuarios, sesiones, predios, evaluaciones, cambios, reglas };
}

function crearRepositoriosPg(pool) {
  const repos = fabricar((t, p) => pool.query(t, p));
  repos.transaccion = async fn => {
    const cliente = await pool.connect();
    try { await cliente.query('BEGIN'); const r = await fn(fabricar((t, p) => cliente.query(t, p))); await cliente.query('COMMIT'); return r; }
    catch (e) { await cliente.query('ROLLBACK'); throw e; }
    finally { cliente.release(); }
  };
  return repos;
}
module.exports = { crearRepositoriosPg };
