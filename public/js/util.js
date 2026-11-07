// ===== UTILIDADES DE LA VISTA (formato, gráficas SVG, diálogos, descargas) =====
// ===== UTILIDADES =====
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f2 = x => (x === null || x === undefined ? '—' : Number(x).toFixed(2).replace('.', ','));
const fechaTxt = iso => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const ESP = { pato: 'Patos', ganso: 'Gansos' };
const PROP = { huevo: 'Huevo', carne: 'Carne', otro: 'Otro (cría, plumas, etc.)' };
const SIST = { intensivo: 'Intensivo', semi: 'Semi-intensivo', extensivo: 'Extensivo / traspatio' };
const COLCAT = { Excelente: '#2E6B34', Alto: '#6BA368', Medio: '#E1A02B', Bajo: '#C0392B' };
const COLG = { MBA: '#2E6B34', MBR: '#8DB580', MBG: '#D9C25B' };
const chip = c => (c ? `<span class="chip" style="background:${COLCAT[c]}">${c}</span>` : '<span class="chip gris">Sin calificar</span>');
function aviso(msg, tipo = 'ok') {
  let t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.className = 'toast ' + tipo + ' ver';
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { t.className = 'toast'; }, 3800);
}

// ===== GRÁFICAS SVG (sin librerías externas) =====
function pieSvg(partes, tam = 170) {
  const tot = partes.reduce((s, x) => s + x.v, 0), r = tam / 2 - 6, c = tam / 2;
  if (!tot) return `<p class="suave">Sin puntos perdidos: todos los indicadores cumplen.</p>`;
  let a0 = -Math.PI / 2, out = '';
  const vis = partes.filter(x => x.v > 0);
  if (vis.length === 1) out = `<circle cx="${c}" cy="${c}" r="${r}" fill="${vis[0].color}"/>`;
  else for (const x of vis) {
    const a1 = a0 + 2 * Math.PI * x.v / tot, large = a1 - a0 > Math.PI ? 1 : 0;
    out += `<path d="M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z" fill="${x.color}" stroke="#fff" stroke-width="2"/>`;
    a0 = a1;
  }
  const leyenda = partes.map(x => `<li><i style="background:${x.color}"></i>${esc(x.etq)}: <b>${f2(x.v)}</b> pts (${(x.v / tot * 100).toFixed(0)} %)</li>`).join('');
  return `<div class="pie"><svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}" role="img" aria-label="Gráfica de torta de puntos perdidos">${out}</svg><ul class="leyenda">${leyenda}</ul></div>`;
}
function barrasSvg(datos) {
  const W = 420, H = 170, m = 28, max = Math.max(1, ...datos.map(d => d.v)), bw = (W - m * 2) / datos.length;
  let o = '';
  datos.forEach((d, i) => {
    const h = (H - m * 2) * d.v / max, x = m + i * bw + bw * 0.15, y = H - m - h;
    o += `<rect x="${x}" y="${y}" width="${bw * 0.7}" height="${h}" fill="${d.color}" rx="3"/><text x="${x + bw * 0.35}" y="${y - 5}" text-anchor="middle" font-size="12" font-weight="700">${d.v}</text><text x="${x + bw * 0.35}" y="${H - 10}" text-anchor="middle" font-size="11">${esc(d.etq)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="Predios por categoría">${o}<line x1="${m}" y1="${H - m}" x2="${W - m}" y2="${H - m}" stroke="#999"/></svg>`;
}
function lineaSvg(etiquetas, series, umbrales = [50, 75, 90]) {
  const W = 560, H = 260, L = 40, R = 14, T = 16, B = 36, iw = W - L - R, ih = H - T - B;
  const X = i => L + (etiquetas.length === 1 ? iw / 2 : iw * i / (etiquetas.length - 1)), Y = v => T + ih * (1 - v / 100);
  let o = '';
  for (let v = 0; v <= 100; v += 25) o += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e3e3e3"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="#777">${v}</text>`;
  for (const u of umbrales) o += `<line x1="${L}" x2="${W - R}" y1="${Y(u)}" y2="${Y(u)}" stroke="#999" stroke-dasharray="4 3"/><text x="${W - R}" y="${Y(u) - 3}" text-anchor="end" font-size="9" fill="#777">${u}</text>`;
  etiquetas.forEach((e, i) => { o += `<text x="${X(i)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="#555">${esc(e)}</text>`; });
  for (const s of series) {
    const pts = s.valores.map((v, i) => (v === null ? null : [X(i), Y(v)])).filter(Boolean);
    if (pts.length > 1) o += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.grueso ? 3 : 1.6}" ${s.punteado ? 'stroke-dasharray="5 4"' : ''}/>`;
    s.valores.forEach((v, i) => { if (v === null) return; o += `<circle cx="${X(i)}" cy="${Y(v)}" r="${s.grueso ? 4.5 : 3}" fill="${s.color}"/>` + (s.grueso ? `<text x="${X(i)}" y="${Y(v) - 9}" text-anchor="middle" font-size="11" font-weight="700" fill="${s.color}">${f2(v)}</text>` : ''); });
  }
  const leg = series.map(s => `<span class="lg"><i style="background:${s.color}"></i>${esc(s.nombre)}</span>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" role="img" aria-label="Evolución de la calificación">${o}</svg><div class="leyenda-h">${leg}</div>`;
}

// ===== DIÁLOGOS =====
function modal(titulo, cuerpo, { ok = 'Guardar', onOk, soloCerrar = false } = {}) {
  const d = document.getElementById('dlg');
  d.innerHTML = `<form id="dlgform" autocomplete="off"><h3>${esc(titulo)}</h3><div class="dlg-cuerpo">${cuerpo}</div><p class="err" id="dlgerr"></p><div class="acciones"><button type="button" class="sec" data-act="cerrar-dlg">${soloCerrar ? 'Cerrar' : 'Cancelar'}</button>${soloCerrar ? '' : `<button type="submit" class="prim">${esc(ok)}</button>`}</div></form>`;
  d.querySelector('form').onsubmit = async ev => {
    ev.preventDefault();
    const bt = d.querySelector('button[type=submit]'); if (bt) bt.disabled = true;
    try { const r = onOk ? await onOk(new FormData(ev.target)) : true; if (r === true) cerrarDlg(); else document.getElementById('dlgerr').textContent = r || ''; }
    catch (e) { document.getElementById('dlgerr').textContent = e.message || 'Error inesperado.'; }
    if (bt) bt.disabled = false;
  };
  if (d.showModal) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } else d.setAttribute('open', '');
  const f = d.querySelector('input,select,textarea'); if (f) f.focus();
}
function cerrarDlg() { const d = document.getElementById('dlg'); if (d.close) { try { d.close(); } catch (e) { /* */ } } d.removeAttribute('open'); }
function pedirMotivo(titulo, texto, onOk) {
  modal(titulo, `<p>${esc(texto)}</p><label>Motivo (obligatorio)<textarea name="motivo" rows="3" required></textarea></label>`, { ok: 'Confirmar', onOk: fd => { const m = String(fd.get('motivo') || '').trim(); if (m.length < 5) return 'Escriba un motivo de al menos 5 caracteres.'; return onOk(m); } });
}
function confirmar(titulo, texto, onOk, ok = 'Confirmar') { modal(titulo, `<p>${esc(texto)}</p>`, { ok, onOk: () => onOk() }); }
function descargar(nombre, texto, mime = 'text/csv') {
  const b = new Blob(['\ufeff' + texto], { type: mime + ';charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const csvc = v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCsv = filas => filas.map(r => r.map(csvc).join(';')).join('\n');


const chip2 = chip;
const hoy = () => new Date().toISOString().slice(0, 10);

const fmtM2 = n => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
