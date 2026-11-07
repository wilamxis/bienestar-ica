// ===== VISTA: detalle de la evaluación y editor =====
async function pgDetalle(id) {
  const d = await Api.get('/evaluaciones/' + id), ev = d.evaluacion, p = d.predio;
  if (ev.estado === 'borrador') { if (can('evaluacion:editar')) location.hash = '#/editar/' + id; return '<div class="card err">Esta evaluación aún es un borrador.</div>'; }
  const r = ev.resultado, anul = ev.estado === 'anulada' ? `<div class="adv anul"><p>Evaluación <b>anulada</b>: ${esc(ev.motivoAnulacion || '')}</p></div>` : '';
  const prod = Estado.usuario.rol === 'productor';
  const botones = `<div class="grupo-btn">${can('informe:ver') ? `<a class="btn sec" href="#/informe/eval/${ev.id}">Informe</a><a class="btn sec" href="#/informe/mejora/${ev.id}">Plan de mejora</a>` : ''}${ev.estado === 'cerrada' && can('evaluacion:corregir') ? `<a class="btn sec" href="#/editar/${ev.id}">Corregir</a>` : ''}${ev.estado === 'cerrada' && can('evaluacion:anular') ? `<button class="sec peligro" data-act="anular" data-id="${ev.id}">Anular</button>` : ''}</div>`;
  return `${migas([prod ? 'Mis predios' : 'Predios', '#/predios'], [p.codigo, '#/predio/' + p.id], ['Evaluación ' + fechaTxt(ev.fecha)])}<div class="barra"><h1>Evaluación del ${fechaTxt(ev.fecha)} <small>versión ${ev.version}</small></h1>${botones}</div>${anul}
  <section class="card"><div class="cols"><div>${tarjetaCalif(r)}<p class="suave">Evaluador: ${esc(ev.evaluador || '—')} · reglas v${ev.reglaVersion}</p>${listaAdv(r)}</div><div><h3>Cómo se pierden los puntos</h3>${pieDe(r)}</div></div></section>
  <section class="card"><h2>Resultado por grupo</h2>${tablaGrupos(r)}</section>
  <section class="card"><h2>Indicadores a mejorar (mayor ganancia primero)</h2>${listaMejoras(r)}</section>
  <section class="card"><h2>Detalle por indicador</h2><div class="scroll">${tablaDetalle(r)}</div>${ev.notas ? `<p><b>Observaciones generales:</b> ${esc(ev.notas)}</p>` : ''}</section>
  ${prod ? '' : `<section class="card"><h2>Historial de cambios de la evaluación</h2>${tablaCambios(d.cambios)}</section>`}`;
}

// ---------- editor ----------
let ED = null;
const clon = o => JSON.parse(JSON.stringify(o));
function widget(ind, o) {
  const id = ind.id, v = o && o.v !== undefined ? esc(o.v) : '';
  if (ind.t === 'nivel') return `<div class="opts">${ind.ops.map((op, i) => `<label class="opt"><input type="radio" name="r_${id}" value="${i}"${o && o.i === i ? ' checked' : ''}><span>${esc(op[1])} <em>${op[0]} pts</em></span></label>`).join('')}</div>`;
  if (ind.t === 'pct') return `<div class="num-in"><input type="number" name="v" min="0" max="100" step="any" inputmode="decimal" value="${v}"><span>${esc(ind.un || '%')}</span>${ind.usaX ? `<label class="chk"><input type="checkbox" name="x"${o && o.x ? ' checked' : ''}> ${esc(ind.etiquetaX || 'Hay evidencia')}</label>` : ''}</div>`;
  if (ind.t === 'dens') return `<div class="num-in"><label>Peso promedio (kg)<input type="number" name="peso" min="0.1" step="any" value="${o && o.peso !== undefined ? esc(o.peso) : ''}"></label><label>Densidad real (kg/m²)<input type="number" name="dens" min="0" step="any" value="${o && o.dens !== undefined ? esc(o.dens) : ''}"></label></div>`;
  if (ind.t === 'cc') return `<div class="num-in"><select name="cc"><option value="">Seleccione…</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${o && o.cc == n ? ' selected' : ''}>${n} · ${CC_ETQ[n]}</option>`).join('')}</select></div>`;
  return '';
}
function cardInd(R, ind, p, o) {
  const razon = Motor.noAplica(R, ind, p);
  if (razon) return `<div class="ind off" data-id="${ind.id}"><div class="ind-h"><b>${esc(ind.n)}</b><span class="badge">N/A</span></div><p class="suave">${esc(razon)}</p></div>`;
  const na = !!(o && o.na);
  return `<div class="ind${na ? ' na' : ''}" data-id="${ind.id}"><div class="ind-h"><b>${esc(ind.n)}</b><span class="ref">${esc(ind.ref || '')}</span><span class="badge" id="b-${ind.id}">—</span></div>${ind.esc ? `<p class="esc">${esc(ind.esc)}</p>` : ''}${widget(ind, o)}<label class="chk na-chk"><input type="checkbox" data-na${na ? ' checked' : ''}> No aplica o no se pudo evaluar (se excluye del promedio)</label></div>`;
}
function resumenHTML(r, modo) {
  const total = r.detalle.filter(d => d.estado !== 'na-auto').length, hecho = r.detalle.filter(d => d.estado === 'ok' || d.estado === 'na').length, pc = total ? Math.round(hecho / total * 100) : 0;
  const g = ['MBA', 'MBR', 'MBG'].map(k => `<tr><td>${k}</td><td class="num">${r.grupos[k].w ? (r.grupos[k].prom === null ? '—' : f2(r.grupos[k].prom)) : 'No aplica'}</td><td class="num">${r.grupos[k].w} %</td></tr>`).join('');
  const btn = modo === 'correccion' ? '<button class="prim" data-act="ed-corregir">Guardar corrección…</button>' : '<button class="sec" data-act="ed-guardar">Guardar borrador</button><button class="prim" data-act="ed-cerrar">Calcular y cerrar</button>';
  return `<h3>Resumen</h3><div class="prog"><div style="width:${pc}%"></div></div><p class="suave">${hecho} de ${total} indicadores respondidos (${pc} %)</p><table class="t mini"><thead><tr><th>Grupo</th><th>Promedio</th><th>Peso</th></tr></thead><tbody>${g}</tbody></table><div class="calif chica"><div class="num">${r.final === null ? '—' : f2(r.final)}</div>${chip(r.categoria)}</div><p class="suave">${r.completa ? 'Calificación definitiva (vista previa).' : 'Provisional: faltan indicadores.'}</p>${listaAdv(r)}<div class="acciones col">${btn}<button class="sec" data-act="ed-cancelar">Salir sin guardar</button></div>`;
}
function refrescarEd() {
  const r = Motor.evaluar(ED.R, ED.p, ED.draft.obs);
  for (const d of r.detalle) { const b = document.getElementById('b-' + d.id); if (!b) continue; b.textContent = d.estado === 'ok' ? d.pts + ' pts' : d.estado === 'na' ? 'N/A' : '—'; b.className = 'badge' + (d.estado === 'ok' ? ' p' + d.pts : ''); }
  const res = document.getElementById('resumen'); if (res) res.innerHTML = resumenHTML(r, ED.modo);
}
async function pgEditor(id) {
  const d = await Api.get('/evaluaciones/' + id), ev = d.evaluacion, p = d.predio;
  if (ev.estado === 'anulada') return '<div class="card err">Una evaluación anulada no se puede editar.</div>';
  const corr = ev.estado === 'cerrada';
  // vista previa con las reglas de esa evaluación (si se corrige) o las vigentes (si es borrador); el servidor siempre recalcula
  const R = corr ? (await Api.get('/reglas/versiones/' + ev.reglaVersion)).reglas : Estado.reglas;
  ED = { id, R, p, modo: corr ? 'correccion' : 'borrador', draft: { obs: clon(ev.obs), fecha: ev.fecha, notas: ev.notas || '' }, orig: clon({ obs: ev.obs, fecha: ev.fecha, notas: ev.notas || '' }), predioId: p.id, cerrada: corr };
  const L = Motor.indicadoresDe(R, p.especie);
  const sec = g => `<details class="gr" open><summary>${g} · ${GRUPOS[g]}</summary>${L.filter(i => i.g === g).map(i => cardInd(R, i, p, ED.draft.obs[i.id])).join('')}</details>`;
  return `${migas(['Predios', '#/predios'], [p.codigo, '#/predio/' + p.id], [corr ? 'Corregir evaluación' : 'Nueva evaluación'])}<h1>${corr ? 'Corregir evaluación' : 'Evaluación'} · ${esc(p.codigo)} ${esc(p.nombre)} <small>${ESP[p.especie]} · ${PROP[p.proposito]} · ${p.nAves} aves</small></h1>${corr ? `<div class="adv"><p>Está corrigiendo una evaluación cerrada. Al guardar deberá indicar el motivo; se creará la versión ${ev.version + 1} y el cambio quedará en el historial. Se recalcula con las reglas v${ev.reglaVersion}.</p></div>` : ''}
  <div class="ed"><form id="edform" autocomplete="off"><section class="card"><div class="cols2"><label>Fecha de la evaluación<input type="date" name="fecha" id="ed-fecha" value="${esc(ED.draft.fecha)}" max="${hoy()}"></label><label>Observaciones generales<textarea name="notas" id="ed-notas" rows="2">${esc(ED.draft.notas)}</textarea></label></div></section>${sec('MBA')}${sec('MBR')}${sec('MBG')}</form><aside class="card sticky" id="resumen"></aside></div>`;
}
function leerCard(card, ind) {
  if (card.querySelector('[data-na]').checked) return { na: true };
  const q = n => card.querySelector(`[name=${n}]`);
  if (ind.t === 'nivel') { const c = card.querySelector('input[type=radio]:checked'); return c ? { i: +c.value } : undefined; }
  if (ind.t === 'pct') { const v = q('v').value; if (v === '') return undefined; const o = { v: +v }; if (q('x')) o.x = q('x').checked; return o; }
  if (ind.t === 'dens') { if (q('peso').value === '' || q('dens').value === '') return undefined; return { peso: +q('peso').value, dens: +q('dens').value }; }
  if (ind.t === 'cc') { const v = q('cc').value; return v ? { cc: +v } : undefined; }
}
function alCambiarEditor(e) {
  if (!ED) return;
  if (e.target.id === 'ed-fecha') { ED.draft.fecha = e.target.value; return; }
  if (e.target.id === 'ed-notas') { ED.draft.notas = e.target.value; return; }
  const card = e.target.closest('.ind'); if (!card || !card.dataset.id) return;
  const ind = ED.R.indicadores.find(i => i.id === card.dataset.id), o = leerCard(card, ind);
  card.classList.toggle('na', !!(o && o.na));
  if (o === undefined) delete ED.draft.obs[ind.id]; else ED.draft.obs[ind.id] = o;
  refrescarEd();
}
function fechaValida() { const f = ED.draft.fecha; return /^\d{4}-\d{2}-\d{2}$/.test(f) && f <= hoy() ? null : 'La fecha es obligatoria y no puede ser futura.'; }
function cuerpoEd() { return { fecha: ED.draft.fecha, notas: ED.draft.notas, obs: clon(ED.draft.obs) }; }
