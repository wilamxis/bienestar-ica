// ===== ESTADO GLOBAL DE LA VISTA Y BLOQUES DE PRESENTACIÓN REUTILIZABLES =====
const Estado = { usuario: null, permisos: [], reglas: null, reglasVersion: null };
const can = a => Estado.permisos.includes(a);
const tipoPredio = n => Motor.tipoPredio(Estado.reglas, n);
const GRUPOS = Motor.GRUPOS, CC_ETQ = Motor.CC_ETQ;
const vigentes = evs => evs.filter(e => e.estado === 'cerrada');
const ultimaDe = evs => vigentes(evs).slice(-1)[0];
const ROLES = { evaluador: 'Evaluador', productor: 'Productor', administrador: 'Administrador' };
// ===== BLOQUES DE PRESENTACIÓN REUTILIZABLES =====
const tarjetaCalif = r => `<div class="calif"><div class="num">${f2(r.final)}</div>${chip(r.categoria)}<div class="suave">${r.tipo === 'grande' ? 'Predio de 200 aves o más' : 'Predio de traspatio (menos de 200 aves)'} · pesos MBA ${r.pesos.MBA} / MBR ${r.pesos.MBR} / MBG ${r.pesos.MBG}</div></div>`;
const tablaGrupos = r => `<table class="t"><thead><tr><th>Grupo de medidas</th><th>Indicadores</th><th>Promedio</th><th>Peso</th><th>Aporte</th><th>Puntos perdidos</th></tr></thead><tbody>${['MBA', 'MBR', 'MBG'].map(g => { const x = r.grupos[g]; return `<tr><td>${g} · ${GRUPOS[g]}</td><td>${x.n}</td><td>${x.prom === null ? (x.w ? '—' : 'No se evalúa') : f2(x.prom)}</td><td>${x.w} %</td><td>${f2(x.aporte)}</td><td>${f2(x.perdidos)}</td></tr>`; }).join('')}<tr class="tot"><td colspan="4">Calificación final</td><td colspan="2">${f2(r.final)}</td></tr></tbody></table>`;
const pieDe = r => pieSvg(['MBA', 'MBR', 'MBG'].filter(g => r.grupos[g].w > 0).map(g => ({ etq: g + ' · ' + GRUPOS[g], v: r.grupos[g].perdidos, color: COLG[g] })));
function tablaDetalle(r) {
  let o = '<table class="t"><thead><tr><th>Indicador</th><th>Ref. ICA</th><th>Observación registrada</th><th>Puntaje</th></tr></thead><tbody>';
  for (const g of ['MBA', 'MBR', 'MBG']) {
    const L = r.detalle.filter(d => d.g === g); if (!L.length) continue;
    o += `<tr class="grp"><td colspan="4">${g} · ${GRUPOS[g]}</td></tr>`;
    for (const d of L) o += `<tr><td>${esc(d.n)}</td><td>${esc(d.ref || '')}</td><td>${d.estado === 'ok' ? esc(d.txt) : `<span class="suave">${esc(d.motivo || 'Sin dato')}</span>`}</td><td class="num">${d.estado === 'ok' ? `<b class="p${d.pts}">${d.pts}</b>` : 'N/A'}</td></tr>`;
  }
  return o + '</tbody></table>';
}
function listaMejoras(r, n = 8) {
  if (!r.mejoras.length) return '<p class="suave">Todos los indicadores evaluados obtuvieron 100 puntos.</p>';
  return `<table class="t"><thead><tr><th>#</th><th>Indicador por mejorar</th><th>Grupo</th><th>Puntaje actual</th><th>Ganancia posible en la calificación</th></tr></thead><tbody>${r.mejoras.slice(0, n).map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.n)}</td><td>${m.g}</td><td class="num"><b class="p${m.pts}">${m.pts}</b></td><td class="num">+${f2(m.ganancia)} pts</td></tr>`).join('')}</tbody></table>`;
}
const listaAdv = r => (r.advertencias.length ? `<div class="adv">${r.advertencias.map(a => `<p>⚠ ${esc(a)}</p>`).join('')}</div>` : '');
function tablaCambios(L) {
  if (!L || !L.length) return '<p class="suave">Sin cambios registrados.</p>';
  return `<table class="t"><thead><tr><th>Fecha</th><th>Usuario</th><th>Campo</th><th>Antes</th><th>Después</th><th>Motivo</th></tr></thead><tbody>${L.map(c => `<tr><td>${fechaTxt(c.fecha)} ${c.fecha.slice(11, 16)}</td><td>${esc(c.usuario)}</td><td>${esc(c.campo)}</td><td>${esc(c.antes)}</td><td>${esc(c.despues)}</td><td>${esc(c.motivo)}</td></tr>`).join('')}</tbody></table>`;
}
const migas = (...m) => `<nav class="migas noprint">${m.map(x => (x[1] ? `<a href="${x[1]}">${esc(x[0])}</a>` : `<span>${esc(x[0])}</span>`)).join(' / ')}</nav>`;

