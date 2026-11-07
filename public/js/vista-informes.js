// ===== VISTA: informes (evaluación, histórico y plan de mejora) =====
let INF = null;
function informeEval(ev, p, cambios) {
  const r = ev.resultado;
  return `<article class="informe"><header><h1>Informe de evaluación del bienestar animal</h1><p class="suave">Patos y gansos · Metodología del ICA 2024 (v1.0) · generado el ${fechaTxt(hoy())}</p></header>
  <h2>1. Datos del predio</h2>${datosPredio(p)}<p><b>Fecha de evaluación:</b> ${fechaTxt(ev.fecha)} · <b>Versión:</b> ${ev.version}${ev.estado === 'anulada' ? ' · <b>ANULADA</b>' : ''}</p>
  <h2>2. Resultado</h2>${tarjetaCalif(r)}${listaAdv(r)}<h2>3. Resultado por grupo de medidas</h2>${tablaGrupos(r)}<h3>Distribución de los puntos perdidos</h3>${pieDe(r)}
  <h2>4. Indicadores por mejorar</h2>${listaMejoras(r, 10)}<h2>5. Detalle por indicador</h2>${tablaDetalle(r)}${ev.notas ? `<p><b>Observaciones generales:</b> ${esc(ev.notas)}</p>` : ''}
  ${ev.version > 1 && cambios.length ? `<h2>6. Historial de cambios</h2>${tablaCambios(cambios)}` : ''}
  <footer><p class="suave">Evaluador: ${esc(ev.evaluador)} · Versión de reglas: v${ev.reglaVersion}. Resultado calculado por el sistema experto a partir de las observaciones registradas.</p><p class="firma">Firma del evaluador: ______________________________</p></footer></article>`;
}
function informeHist(p, L) {
  const cer = vigentes(L);
  if (!cer.length) return `<article class="informe"><h1>Informe histórico del predio ${esc(p.codigo)}</h1>${datosPredio(p)}<p>El predio no tiene evaluaciones cerradas.</p></article>`;
  const a = cer[cer.length - 1], b = cer.length > 1 ? cer[cer.length - 2] : null;
  let cmp = '<p class="suave">Se necesitan al menos dos evaluaciones cerradas para comparar indicadores.</p>';
  if (b) {
    const L = a.resultado.detalle.filter(d => d.estado === 'ok').map(d => { const q = b.resultado.detalle.find(x => x.id === d.id && x.estado === 'ok'); return q && q.pts !== d.pts ? { n: d.n, g: d.g, antes: q.pts, ahora: d.pts } : null; }).filter(Boolean);
    cmp = L.length ? `<table class="t"><thead><tr><th>Indicador</th><th>Grupo</th><th>${fechaTxt(b.fecha)}</th><th>${fechaTxt(a.fecha)}</th><th>Cambio</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(x.n)}</td><td>${x.g}</td><td class="num">${x.antes}</td><td class="num">${x.ahora}</td><td>${x.ahora > x.antes ? '▲ mejoró' : '▼ empeoró'}</td></tr>`).join('')}</tbody></table>` : '<p class="suave">Ningún indicador cambió de puntaje entre las dos últimas evaluaciones.</p>';
  }
  const vari = cer.length > 1 ? a.resultado.final - cer[0].resultado.final : 0;
  const graf = lineaSvg(cer.map(e => fechaTxt(e.fecha)), [{ nombre: 'Calificación final', color: '#1F3864', valores: cer.map(e => e.resultado.final), grueso: true }, { nombre: 'MBA', color: COLG.MBA, valores: cer.map(e => e.resultado.grupos.MBA.prom), punteado: true }, { nombre: 'MBR', color: '#6f9a5f', valores: cer.map(e => e.resultado.grupos.MBR.prom), punteado: true }, { nombre: 'MBG', color: '#b9a23d', valores: cer.map(e => (e.resultado.grupos.MBG.w ? e.resultado.grupos.MBG.prom : null)), punteado: true }]);
  return `<article class="informe"><header><h1>Informe histórico del predio ${esc(p.codigo)}</h1><p class="suave">Metodología del ICA 2024 (v1.0) · generado el ${fechaTxt(hoy())}</p></header><h2>1. Datos del predio</h2>${datosPredio(p)}
  <h2>2. Resumen</h2><p>${cer.length} evaluación(es) cerrada(s). Última calificación: <b>${f2(a.resultado.final)}</b> ${chip(a.resultado.categoria)}.${cer.length > 1 ? ` Variación desde la primera evaluación: <b>${vari >= 0 ? '+' : ''}${f2(vari)}</b> puntos.` : ''}</p>
  <h2>3. Evolución</h2>${graf}<h2>4. Evaluaciones</h2><table class="t"><thead><tr><th>Fecha</th><th>Versión</th><th>MBA</th><th>MBR</th><th>MBG</th><th>Final</th><th>Categoría</th></tr></thead><tbody>${cer.map(e => `<tr><td>${fechaTxt(e.fecha)}</td><td class="num">v${e.version}</td><td class="num">${f2(e.resultado.grupos.MBA.prom)}</td><td class="num">${f2(e.resultado.grupos.MBR.prom)}</td><td class="num">${e.resultado.grupos.MBG.w ? f2(e.resultado.grupos.MBG.prom) : '—'}</td><td class="num"><b>${f2(e.resultado.final)}</b></td><td>${chip(e.resultado.categoria)}</td></tr>`).join('')}</tbody></table>
  <h2>5. Indicadores que cambiaron en la última evaluación</h2>${cmp}<footer><p class="suave">Versión de reglas de la última evaluación: v${a.reglaVersion}.</p></footer></article>`;
}
function filasMejora(r) { let acc = r.final; return r.mejoras.map((m, i) => { acc = Math.min(100, acc + m.ganancia); return { i: i + 1, n: m.n, g: m.g, pts: m.pts, gan: m.ganancia, acc }; }); }
function informeMejora(ev, p) {
  const r = ev.resultado, F = filasMejora(r);
  return `<article class="informe"><header><h1>Plan de mejora · ${esc(p.codigo)} ${esc(p.nombre)}</h1><p class="suave">Evaluación del ${fechaTxt(ev.fecha)} (v${ev.version}) · generado el ${fechaTxt(hoy())}</p></header><p>Calificación actual: <b>${f2(r.final)}</b> ${chip(r.categoria)}. Si todos los indicadores de la lista llegaran a 100 puntos, la calificación sería <b>${f2(F.length ? F[F.length - 1].acc : r.final)}</b>.</p>
  ${F.length ? `<table class="t"><thead><tr><th>Prioridad</th><th>Indicador</th><th>Grupo</th><th>Puntaje actual</th><th>Ganancia</th><th>Calificación acumulada</th></tr></thead><tbody>${F.map(x => `<tr><td>${x.i}</td><td>${esc(x.n)}</td><td>${x.g}</td><td class="num"><b class="p${x.pts}">${x.pts}</b></td><td class="num">+${f2(x.gan)}</td><td class="num">${f2(x.acc)}</td></tr>`).join('')}</tbody></table>` : '<p>No hay indicadores por mejorar.</p>'}<footer><p class="suave">La ganancia asume pesos de grupo y promedio simple dentro del grupo (supuesto 2 del sistema). Reglas: v${ev.reglaVersion}.</p></footer></article>`;
}
function csvInforme() {
  const { tipo, p, ev, L } = INF;
  if (tipo === 'hist') return [`historico_${p.codigo}.csv`, toCsv([['Fecha', 'Version', 'MBA', 'MBR', 'MBG', 'Final', 'Categoria'], ...vigentes(L).map(e => [e.fecha, e.version, e.resultado.grupos.MBA.prom, e.resultado.grupos.MBR.prom, e.resultado.grupos.MBG.w ? e.resultado.grupos.MBG.prom : '', e.resultado.final, e.resultado.categoria])])];
  const r = ev.resultado;
  if (tipo === 'mejora') return [`mejora_${p.codigo}_${ev.fecha}.csv`, toCsv([['Prioridad', 'Indicador', 'Grupo', 'Puntaje', 'Ganancia', 'Acumulado'], ...filasMejora(r).map(x => [x.i, x.n, x.g, x.pts, x.gan.toFixed(2), x.acc.toFixed(2)])])];
  return [`evaluacion_${p.codigo}_${ev.fecha}.csv`, toCsv([['Predio', p.codigo, p.nombre], ['Fecha', ev.fecha, 'v' + ev.version], ['Calificacion final', r.final, r.categoria], [], ['Indicador', 'Grupo', 'Referencia', 'Observacion', 'Puntaje'], ...r.detalle.map(d => [d.n, d.g, d.ref || '', d.estado === 'ok' ? d.txt : d.motivo, d.estado === 'ok' ? d.pts : 'N/A'])])];
}
async function pgInforme(tipo, id) {
  let cuerpo, volver;
  if (tipo === 'hist') { const [p, L] = await Promise.all([Api.get('/predios/' + id), Api.get(`/predios/${id}/evaluaciones`)]); INF = { tipo, p, L }; cuerpo = informeHist(p, L); volver = '#/predio/' + id; }
  else { const d = await Api.get('/evaluaciones/' + id); if (!d.evaluacion.resultado) return '<div class="card err">La evaluación aún no está cerrada.</div>'; INF = { tipo, p: d.predio, ev: d.evaluacion }; cuerpo = tipo === 'mejora' ? informeMejora(d.evaluacion, d.predio) : informeEval(d.evaluacion, d.predio, d.cambios); volver = '#/eval/' + id; }
  return `<div class="barra noprint"><a class="btn sec" href="${volver}">← Volver</a><div class="grupo-btn"><button class="prim" data-act="imprimir">Imprimir / guardar PDF</button><button class="sec" data-act="csv">Descargar CSV</button></div></div>${cuerpo}`;
}
