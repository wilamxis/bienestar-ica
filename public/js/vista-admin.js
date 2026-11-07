// ===== VISTA: reglas, usuarios y administración =====
const SUPUESTOS = [
  'Predio grande = 200 aves o más (la Tabla 1 del ICA usa «≥ 299» y «≤ 199» y deja sin regla a los de 200 a 298).',
  'Cada grupo se promedia de 0 a 100 y luego se pondera; los indicadores no aplicables se excluyen del promedio.',
  'Mortalidad en patos (Tabla 26, contradictoria): ≤ 12 % = 100; 12 a 14 % = 55; > 14 % = 0; solo en predios de 200 aves o más.',
  'Condición corporal en patos de huevo con puntuación 4 = 55 puntos (la Tabla 28 dice «5 punto»).',
  'Suministro de agua sin agua = 0 puntos (la Tabla 9 repite «55 puntos» en la última fila).',
  'Animales por bebedero y por comedero se evalúan por nivel; el texto de las Tablas 8 y 12 es ambiguo.',
  'Rangos con huecos o traslapes (Tablas 52 y 54): se cierran de forma contigua.',
  'Limpieza del galpón en gansos (Tabla 44): la escala del documento está invertida; se asume 0 % = 100, < 20 % = 55, 20 a 40 % = 20, > 40 % = 0.',
  'Indicadores con evidencia de tratamiento (Tablas 47, 49, 50 y 53): los casos no definidos en el documento se puntúan 20 si no hay tratamiento.',
  'La gestión (MBG) en gansos también se evalúa solo en predios de 200 aves o más.',
  'Las escalas se transcribieron del documento del ICA v1.0 y deben validarse con el ICA antes de usarlas oficialmente.'];

async function pgReglas() {
  const [act, vers] = await Promise.all([Api.get('/reglas'), Api.get('/reglas/versiones')]), R = act.reglas, edit = can('regla:editar');
  const escala = i => i.t === 'nivel' ? i.ops.map(o => `<b>${o[0]}</b>: ${esc(o[1])}`).join('<br>') : esc(i.esc || '');
  const tabla = sp => ['MBA', 'MBR', 'MBG'].map(g => { const L = R.indicadores.filter(i => i.sp === sp && i.g === g); return `<h3>${ESP[sp]} · ${g} ${GRUPOS[g]} (${L.length})</h3><div class="scroll"><table class="t"><thead><tr><th>Indicador</th><th>Ref.</th><th>Escala de puntaje</th>${edit ? '<th class="noprint">Editar</th>' : ''}</tr></thead><tbody>${L.map(i => `<tr><td>${esc(i.n)}</td><td>${esc(i.ref || '')}</td><td>${escala(i)}</td>${edit ? `<td class="noprint"><a href="#" data-act="editar-regla" data-id="${i.id}">Editar</a></td>` : ''}</tr>`).join('')}</tbody></table></div>`; }).join('');
  const p = R.pesos;
  return `<h1>Reglas y escalas</h1><p class="suave">Versión vigente: <b>v${act.version}</b> (${fechaTxt(act.creada)} · ${esc(act.creadoPor)}). ${edit ? 'Como administrador puede editarlas: cada cambio crea una versión nueva y las evaluaciones ya cerradas conservan la versión con la que se calcularon.' : 'Las reglas son de solo lectura; solo el administrador puede actualizarlas.'}</p>
  <section class="card"><div class="barra"><h2>Pesos y categorías</h2>${edit ? '<button class="sec" data-act="editar-params">Editar parámetros</button>' : ''}</div><table class="t"><thead><tr><th>Grupo</th><th>${R.umbralGrande} aves o más</th><th>Menos de ${R.umbralGrande} aves</th></tr></thead><tbody><tr><td>MBA · animal</td><td>${p.grande.MBA} %</td><td>${p.traspatio.MBA} %</td></tr><tr><td>MBR · recursos</td><td>${p.grande.MBR} %</td><td>${p.traspatio.MBR} %</td></tr><tr><td>MBG · gestión</td><td>${p.grande.MBG} %</td><td>${p.traspatio.MBG ? p.traspatio.MBG + ' %' : 'No se evalúa'}</td></tr></tbody></table><p>Categorías: ${R.umbrales.map((u, i) => `<b>${u[1]}</b> ${i < R.umbrales.length - 1 ? '≥ ' + u[0] : '&lt; ' + R.umbrales[i - 1][0]}`).join(' · ')}. Zona sensible: ±${R.zonaSensible} puntos.</p></section>
  <section class="card"><h2>Historial de versiones</h2><table class="t"><thead><tr><th>Versión</th><th>Fecha</th><th>Autor</th><th>Motivo</th></tr></thead><tbody>${vers.map(v => `<tr><td>v${v.version}</td><td>${fechaTxt(v.creada)}</td><td>${esc(v.creadoPor)}</td><td>${esc(v.motivo)}</td></tr>`).join('')}</tbody></table></section>
  <section class="card"><h2>Supuestos aplicados</h2><ol>${SUPUESTOS.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>
  <section class="card"><h2>Indicadores de patos (${R.indicadores.filter(i => i.sp === 'pato').length})</h2>${tabla('pato')}</section><section class="card"><h2>Indicadores de gansos (${R.indicadores.filter(i => i.sp === 'ganso').length})</h2>${tabla('ganso')}</section>`;
}
const EDITABLES = { nivel: ['ops'], pct: ['escala', 'esc', 'un'], dens: ['esc'], cc: ['esc', 'tabla'] };
async function editarRegla(id) {
  const { reglas: R } = await Api.get('/reglas'), ind = R.indicadores.find(i => i.id === id), sub = {}; EDITABLES[ind.t].forEach(k => { if (ind[k] !== undefined) sub[k] = ind[k]; });
  modal('Editar «' + ind.n + '»', `<p class="suave">Edite el JSON de la escala. Para escalas numéricas, las condiciones se evalúan en orden y gana la primera que se cumple (hasta: ≤, menor: &lt;, desde: ≥, mayor: &gt;); la última debe ser solo {"pts": n}.</p><label>Escala (JSON)<textarea name="json" rows="12" style="font-family:monospace">${esc(JSON.stringify(sub, null, 1))}</textarea></label><label>Motivo del cambio (obligatorio)<input name="motivo" required></label>`, { ok: 'Publicar nueva versión', onOk: async fd => {
    let cambios; try { cambios = JSON.parse(fd.get('json')); } catch (e) { return 'El JSON no es válido: ' + e.message; }
    try { const r = await Api.patch('/reglas/indicadores/' + id, { cambios, motivo: fd.get('motivo') }); aviso('Reglas actualizadas: versión ' + r.version + '.'); await cargarReglas(); render(); return true; }
    catch (e) { return e.message + (e.detalle ? ' ' + [].concat(e.detalle).join(' ') : ''); }
  } });
}
async function editarParametros() {
  const { reglas: R } = await Api.get('/reglas'), sub = { pesos: R.pesos, umbrales: R.umbrales, zonaSensible: R.zonaSensible, umbralGrande: R.umbralGrande };
  modal('Editar parámetros generales', `<p class="suave">Los pesos de cada tipo de predio deben sumar 100 y los umbrales ir de mayor a menor terminando en 0.</p><label>Parámetros (JSON)<textarea name="json" rows="14" style="font-family:monospace">${esc(JSON.stringify(sub, null, 1))}</textarea></label><label>Motivo del cambio (obligatorio)<input name="motivo" required></label>`, { ok: 'Publicar nueva versión', onOk: async fd => {
    let cambios; try { cambios = JSON.parse(fd.get('json')); } catch (e) { return 'El JSON no es válido: ' + e.message; }
    try { const r = await Api.patch('/reglas/parametros', { cambios, motivo: fd.get('motivo') }); aviso('Reglas actualizadas: versión ' + r.version + '.'); await cargarReglas(); render(); return true; }
    catch (e) { return e.message + (e.detalle ? ' ' + [].concat(e.detalle).join(' ') : ''); }
  } });
}

// ----- usuarios (solo administrador) -----
async function pgUsuarios() {
  const L = await Api.get('/usuarios');
  return `<div class="barra"><h1>Usuarios</h1><button class="prim" data-act="form-usuario">+ Nuevo usuario</button></div><section class="card"><table class="t"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${L.map(u => `<tr class="${u.activo ? '' : 'inact'}"><td>${esc(u.nombre)}</td><td>${esc(u.email)}</td><td>${ROLES[u.rol]}</td><td>${u.activo ? 'activo' : 'inactivo'}</td><td><a href="#" data-act="form-usuario" data-id="${u.id}">Editar</a></td></tr>`).join('')}</tbody></table></section>
  <section class="card"><h2>Qué puede hacer cada rol</h2><table class="t"><thead><tr><th>Acción</th><th>Evaluador</th><th>Productor</th><th>Administrador</th></tr></thead><tbody>
  <tr><td>Crear y editar predios, asignarles dueño</td><td>Sí</td><td>No</td><td>No</td></tr><tr><td>Ver predios</td><td>Todos</td><td>Solo los suyos</td><td>No</td></tr><tr><td>Crear, cerrar, corregir y anular evaluaciones</td><td>Sí</td><td>No</td><td>No</td></tr><tr><td>Ver evaluaciones, histórico e informes</td><td>Todas</td><td>Cerradas de sus predios</td><td>No</td></tr><tr><td>Consultar reglas</td><td>Sí</td><td>Sí</td><td>Sí</td></tr><tr><td>Actualizar reglas (nueva versión)</td><td>No</td><td>No</td><td>Sí</td></tr><tr><td>Gestionar usuarios</td><td>No</td><td>No</td><td>Sí</td></tr></tbody></table></section>`;
}
async function formUsuario(id) {
  const u = id ? (await Api.get('/usuarios')).find(x => x.id === id) : { nombre: '', email: '', rol: 'evaluador', activo: true };
  const roles = Object.entries(ROLES).map(([k, t]) => `<option value="${k}"${k === u.rol ? ' selected' : ''}>${t}</option>`).join('');
  modal(id ? 'Editar usuario' : 'Nuevo usuario', `<div class="cols2"><label>Nombre<input name="nombre" value="${esc(u.nombre)}" required></label><label>Correo<input name="email" type="email" value="${esc(u.email)}" ${id ? 'disabled' : 'required'}></label><label>Rol<select name="rol">${roles}</select></label><label>${id ? 'Nueva contraseña (opcional)' : 'Contraseña'}<input name="password" type="password" autocomplete="new-password" ${id ? '' : 'required'}></label>${id ? `<label>Estado<select name="activo"><option value="si"${u.activo ? ' selected' : ''}>Activo</option><option value="no"${!u.activo ? ' selected' : ''}>Inactivo</option></select></label>` : ''}</div><p class="suave">La contraseña debe tener al menos 8 caracteres, con letras y números.</p>`, { ok: id ? 'Guardar' : 'Crear usuario', onOk: async fd => {
    if (id) { const c = { nombre: fd.get('nombre'), rol: fd.get('rol'), activo: fd.get('activo') === 'si' }; if (fd.get('password')) c.password = fd.get('password'); await Api.patch('/usuarios/' + id, c); aviso('Usuario actualizado.'); }
    else { await Api.post('/usuarios', { nombre: fd.get('nombre'), email: fd.get('email'), password: fd.get('password'), rol: fd.get('rol') }); aviso('Usuario creado.'); }
    render(); return true;
  } });
}
