// ===== VISTA: inicio, predios y ficha del predio =====
let PREDIOS = [];
const FILT = { q: '', esp: '', est: 'activo' };

async function pgInicio() {
  const t = await Api.get('/tablero');
  if (t.tipo === 'administrador') {
    const n = t.usuariosPorRol;
    return `<h1>Panel de administración</h1><p class="suave">Desde aquí se gestionan los usuarios y las reglas de evaluación.</p><div class="kpis"><div class="kpi"><b>${n.evaluador || 0}</b><span>Evaluadores activos</span></div><div class="kpi"><b>${n.productor || 0}</b><span>Productores activos</span></div><div class="kpi"><b>${n.administrador || 0}</b><span>Administradores</span></div><div class="kpi"><b>v${t.reglasVersion}</b><span>Versión de reglas vigente</span></div></div><div class="cols"><section class="card"><h2>Usuarios</h2><p>Cree usuarios, asigne roles y desactive accesos.</p><p><a class="btn prim" href="#/usuarios">Gestionar usuarios</a></p></section><section class="card"><h2>Reglas y escalas</h2><p>Consulte y actualice las escalas. Cada cambio crea una versión nueva.</p><p><a class="btn prim" href="#/reglas">Ver reglas</a></p></section></div>`;
  }
  const dist = ['Excelente', 'Alto', 'Medio', 'Bajo'].map(c => ({ etq: c, color: COLCAT[c], v: t.categorias[c] }));
  const productor = t.tipo === 'productor';
  const vacio = t.activos === 0 ? `<div class="card vacio"><h3>${productor ? 'Todavía no tiene predios asignados' : 'Empiece creando un predio'}</h3><p>${productor ? 'Cuando un evaluador registre sus predios y cierre evaluaciones, las verá aquí.' : 'Primero se crea el predio; después se le agregan evaluaciones y se consulta su histórico.'}</p>${can('predio:crear') ? '<p><button class="prim" data-act="form-predio">+ Nuevo predio</button></p>' : ''}</div>` : '';
  return `<h1>${productor ? 'Mis predios' : 'Evaluación del bienestar animal en patos y gansos'}</h1><p class="suave">Metodología del ICA 2024 (versión 1.0). ${productor ? 'Aquí ve sus predios y las evaluaciones cerradas.' : ''}</p>${vacio}
  <div class="kpis"><div class="kpi"><b>${t.activos}</b><span>Predios activos</span></div><div class="kpi"><b>${t.cerradas}</b><span>Evaluaciones cerradas</span></div>${productor ? '' : `<div class="kpi"><b>${t.borradores}</b><span>Borradores</span></div><div class="kpi"><b>${t.sinEvaluar}</b><span>Predios sin evaluar</span></div>`}</div>
  <div class="cols"><section class="card"><h2>Predios por categoría (última evaluación)</h2>${barrasSvg(dist)}</section><section class="card"><h2>Últimas evaluaciones cerradas</h2>${t.recientes.length ? `<table class="t"><tbody>${t.recientes.map(e => `<tr><td><a href="#/eval/${e.id}">${esc(e.codigo)} · ${fechaTxt(e.fecha)}</a></td><td class="num">${f2(e.final)}</td><td>${chip(e.categoria)}</td></tr>`).join('')}</tbody></table>` : '<p class="suave">Aún no hay evaluaciones cerradas.</p>'}</section></div>`;
}

function tablaPredios() {
  const q = FILT.q.toLowerCase(), edit = can('predio:editar');
  const L = PREDIOS.filter(p => (!q || (p.codigo + ' ' + p.nombre + ' ' + p.ubicacion).toLowerCase().includes(q)) && (!FILT.esp || p.especie === FILT.esp) && (!FILT.est || p.estado === FILT.est));
  if (!L.length) return '<p class="suave">No hay predios con esos criterios.</p>';
  const prod = Estado.usuario.rol === 'productor';
  return `<div class="scroll"><table class="t"><thead><tr><th>Código</th><th>Nombre</th><th>Especie · propósito</th><th>Aves</th><th>Tamaño (m²)</th>${prod ? '' : '<th>Productor</th>'}<th>Última calificación</th><th>Evaluaciones</th><th class="noprint">Acciones</th></tr></thead><tbody>${L.map(p => `<tr class="${p.estado === 'inactivo' ? 'inact' : ''}"><td><a href="#/predio/${p.id}"><b>${esc(p.codigo)}</b></a></td><td>${esc(p.nombre)}${p.estado === 'inactivo' ? ' <span class="chip gris">inactivo</span>' : ''}</td><td>${ESP[p.especie]} · ${PROP[p.proposito]}</td><td class="num">${p.nAves}</td><td class="num">${p.areaM2 ? fmtM2(p.areaM2) : '—'}</td>${prod ? '' : `<td>${esc(p.duenoNombre || '—')}</td>`}<td>${p.ultima ? f2(p.ultima.final) + ' ' + chip(p.ultima.categoria) : '—'}</td><td class="num">${p.nEvaluaciones}</td><td class="noprint"><a href="#/predio/${p.id}">Ver</a>${edit ? ` · <a href="#" data-act="form-predio" data-id="${p.id}">Editar</a>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
async function pgPredios() {
  PREDIOS = await Api.get('/predios');
  const prod = Estado.usuario.rol === 'productor';
  return `<div class="barra"><h1>${prod ? 'Mis predios' : 'Predios'}</h1>${can('predio:crear') ? '<button class="prim" data-act="form-predio">+ Nuevo predio</button>' : ''}</div><div class="filtros card"><label>Buscar<input id="f-q" value="${esc(FILT.q)}" placeholder="Código, nombre o ubicación"></label><label>Especie<select id="f-esp"><option value="">Todas</option><option value="pato"${FILT.esp === 'pato' ? ' selected' : ''}>Patos</option><option value="ganso"${FILT.esp === 'ganso' ? ' selected' : ''}>Gansos</option></select></label><label>Estado<select id="f-est"><option value="">Todos</option><option value="activo"${FILT.est === 'activo' ? ' selected' : ''}>Activos</option><option value="inactivo"${FILT.est === 'inactivo' ? ' selected' : ''}>Inactivos</option></select></label></div><div class="card" id="lista-predios">${tablaPredios()}</div>`;
}

const datosPredio = p => `<dl class="datos"><div><dt>Código</dt><dd>${esc(p.codigo)}</dd></div><div><dt>Nombre</dt><dd>${esc(p.nombre)}</dd></div><div><dt>Ubicación</dt><dd>${esc(p.ubicacion || '—')}</dd></div><div><dt>Especie</dt><dd>${ESP[p.especie]}</dd></div><div><dt>Propósito</dt><dd>${PROP[p.proposito]}</dd></div><div><dt>Sistema</dt><dd>${SIST[p.sistema]}</dd></div><div><dt>Aves</dt><dd>${p.nAves} (${tipoPredio(p.nAves) === 'grande' ? 'predio grande' : 'traspatio'})</dd></div><div><dt>Tamaño del predio</dt><dd>${p.areaM2 ? fmtM2(p.areaM2) + ' m²' : '—'}${p.areaM2 ? ` <span class="suave">· ${(p.nAves / p.areaM2).toFixed(2).replace('.', ',')} aves/m²</span>` : ''}</dd></div><div><dt>Galpón o corral</dt><dd>${p.corral ? 'Sí' : 'No'}${p.corral ? ' · cama: ' + (p.cama ? 'sí' : 'no') : ''}</dd></div><div><dt>Estado</dt><dd>${p.estado}</dd></div>${p.duenoNombre ? `<div><dt>Productor</dt><dd>${esc(p.duenoNombre)}</dd></div>` : ''}</dl>`;

async function pgFicha(id) {
  const [p, L, cambios] = await Promise.all([Api.get('/predios/' + id), Api.get(`/predios/${id}/evaluaciones`), can('cambios:ver') ? Api.get(`/predios/${id}/cambios`) : Promise.resolve(null)]);
  const cer = vigentes(L), puedeEv = can('evaluacion:crear');
  const filas = L.map(e => {
    const i = cer.indexOf(e), prev = i > 0 ? cer[i - 1].resultado.final : null, r = e.resultado;
    const vari = r && prev !== null ? (r.final - prev >= 0 ? '+' : '') + f2(r.final - prev) : '—';
    let acc;
    if (e.estado === 'borrador') acc = `<a href="#/editar/${e.id}">Continuar</a> · <a href="#" data-act="borrar-borrador" data-id="${e.id}" data-pid="${p.id}">Eliminar</a>`;
    else acc = `<a href="#/eval/${e.id}">Ver</a>${e.estado === 'cerrada' ? `${can('evaluacion:corregir') ? ` · <a href="#/editar/${e.id}">Corregir</a>` : ''}${can('informe:ver') ? ` · <a href="#/informe/eval/${e.id}">Informe</a>` : ''}` : ''}`;
    return `<tr class="${e.estado === 'anulada' ? 'inact' : ''}"><td>${fechaTxt(e.fecha)}</td><td class="num">v${e.version}</td><td>${e.estado}</td><td class="num">${r ? f2(r.grupos.MBA.prom) : '—'}</td><td class="num">${r ? f2(r.grupos.MBR.prom) : '—'}</td><td class="num">${r && r.grupos.MBG.w ? f2(r.grupos.MBG.prom) : '—'}</td><td class="num"><b>${r ? f2(r.final) : '—'}</b></td><td>${r ? chip(r.categoria) : ''}</td><td class="num">${e.estado === 'cerrada' ? vari : '—'}</td><td class="noprint">${acc}</td></tr>`;
  }).join('');
  const graf = cer.length ? lineaSvg(cer.map(e => fechaTxt(e.fecha)), [
    { nombre: 'Calificación final', color: '#1F3864', valores: cer.map(e => e.resultado.final), grueso: true },
    { nombre: 'MBA animal', color: COLG.MBA, valores: cer.map(e => e.resultado.grupos.MBA.prom), punteado: true },
    { nombre: 'MBR recursos', color: '#6f9a5f', valores: cer.map(e => e.resultado.grupos.MBR.prom), punteado: true },
    { nombre: 'MBG gestión', color: '#b9a23d', valores: cer.map(e => (e.resultado.grupos.MBG.w ? e.resultado.grupos.MBG.prom : null)), punteado: true }]) : '<p class="suave">La gráfica aparece cuando el predio tiene evaluaciones cerradas.</p>';
  const u = ultimaDe(L);
  const botones = `<div class="grupo-btn">${puedeEv ? `<button class="prim" data-act="nueva-eval" data-pid="${p.id}"${p.estado !== 'activo' ? ' disabled title="Reactive el predio para evaluarlo"' : ''}>+ Nueva evaluación</button>` : ''}${can('predio:editar') ? `<button class="sec" data-act="form-predio" data-id="${p.id}">Editar predio</button>` : ''}${can('informe:ver') ? `<a class="btn sec" href="#/informe/hist/${p.id}">Informe histórico</a>` : ''}</div>`;
  const acciones = can('predio:estado') ? `<p class="acc-pred"><button class="lnk" data-act="toggle-predio" data-id="${p.id}">${p.estado === 'activo' ? 'Desactivar predio' : 'Reactivar predio'}</button>${p.tieneEvaluaciones ? ' <span class="suave">(un predio con evaluaciones solo se desactiva, para conservar su histórico)</span>' : ` · <button class="lnk peligro" data-act="borrar-predio" data-id="${p.id}">Eliminar predio</button>`}</p>` : '';
  return `${migas([Estado.usuario.rol === 'productor' ? 'Mis predios' : 'Predios', '#/predios'], [p.codigo])}<div class="barra"><h1>${esc(p.codigo)} · ${esc(p.nombre)}</h1>${botones}</div>
  <section class="card">${datosPredio(p)}${acciones}</section>
  ${u ? `<section class="card"><h2>Última evaluación cerrada</h2><div class="cols"><div>${tarjetaCalif(u.resultado)}</div><div>${pieDe(u.resultado)}</div></div></section>` : ''}
  <section class="card"><h2>Histórico de evaluaciones</h2>${L.length ? `<div class="scroll"><table class="t"><thead><tr><th>Fecha</th><th>Versión</th><th>Estado</th><th>MBA</th><th>MBR</th><th>MBG</th><th>Final</th><th>Categoría</th><th>Variación</th><th class="noprint">Acciones</th></tr></thead><tbody>${filas}</tbody></table></div>` : `<p class="suave">Este predio todavía no tiene evaluaciones.${puedeEv ? ' Use «Nueva evaluación».' : ''}</p>`}</section>
  <section class="card"><h2>Evolución de la calificación</h2>${graf}</section>
  ${cambios ? `<section class="card"><h2>Cambios del predio</h2>${tablaCambios(cambios)}</section>` : ''}`;
}

async function formPredio(id) {
  const [p, prods] = await Promise.all([id ? Api.get('/predios/' + id) : Promise.resolve({ codigo: '', nombre: '', ubicacion: '', especie: 'pato', proposito: 'carne', sistema: 'intensivo', nAves: '', corral: true, cama: true, duenoId: null }), can('usuario:listar-productores') ? Api.get('/productores') : Promise.resolve([])]);
  const bloq = id && p.tieneEvaluaciones;
  const opt = (m, v) => Object.entries(m).map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const yn = (n, v) => `<select name="${n}"><option value="si"${v ? ' selected' : ''}>Sí</option><option value="no"${!v ? ' selected' : ''}>No</option></select>`;
  modal(id ? 'Editar predio ' + p.codigo : 'Nuevo predio', `<div class="cols2"><label>Código<input name="codigo" value="${esc(p.codigo)}" required></label><label>Nombre<input name="nombre" value="${esc(p.nombre)}" required></label><label>Ubicación<input name="ubicacion" value="${esc(p.ubicacion)}"></label><label>Número de aves<input name="nAves" type="number" min="1" step="1" value="${esc(p.nAves)}" required></label><label>Tamaño del predio (m²)<input name="areaM2" type="number" min="1" step="any" inputmode="decimal" placeholder="Opcional" value="${p.areaM2 ? esc(p.areaM2) : ''}"></label><label>Especie<select name="especie"${bloq ? ' disabled' : ''}>${opt(ESP, p.especie)}</select></label><label>Propósito productivo<select name="proposito">${opt(PROP, p.proposito)}</select></label><label>Tipo de sistema<select name="sistema">${opt(SIST, p.sistema)}</select></label><label>Productor (dueño del predio)<select name="duenoId"><option value="">Sin asignar</option>${prods.map(x => `<option value="${x.id}"${x.id === p.duenoId ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label><label>Aves en galpón o corral${yn('corral', p.corral)}</label><label>Cama en el piso${yn('cama', p.cama)}</label></div>${bloq ? '<p class="suave">La especie no se puede cambiar porque el predio ya tiene evaluaciones.</p>' : ''}`,
    { ok: id ? 'Guardar cambios' : 'Crear predio', onOk: async fd => {
      const d = { codigo: fd.get('codigo'), nombre: fd.get('nombre'), ubicacion: fd.get('ubicacion'), especie: bloq ? p.especie : fd.get('especie'), proposito: fd.get('proposito'), sistema: fd.get('sistema'), nAves: parseInt(fd.get('nAves'), 10), areaM2: fd.get('areaM2') ? Number(fd.get('areaM2')) : null, corral: fd.get('corral') === 'si', cama: fd.get('cama') === 'si', duenoId: fd.get('duenoId') ? +fd.get('duenoId') : null };
      if (id) { const r = await Api.patch('/predios/' + id, d); aviso(r.cambios ? 'Predio actualizado.' : 'No hubo cambios.'); render(); return true; }
      const r = await Api.post('/predios', d); aviso('Predio creado. Ahora puede agregarle evaluaciones.'); location.hash = '#/predio/' + r.id; return true;
    } });
}
