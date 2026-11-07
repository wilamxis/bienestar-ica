/* Motor de reglas (capa de dominio). Funciones puras: no usa DOM, base de datos ni red.
   Funciona igual en el servidor (Node) y en el navegador, y recibe las reglas como parámetro. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Motor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const GRUPOS = { MBA: 'Basadas en el animal', MBR: 'Basadas en los recursos', MBG: 'Basadas en la gestión' };
  const CC_ETQ = { 1: 'Delgado', 2: 'Adecuada', 3: 'Buena (ideal)', 4: 'Musculosa', 5: 'Sobrepeso' };
  const num = x => (x === '' || x === null || x === undefined || isNaN(Number(x)) ? null : Number(x));

  const tipoPredio = (R, n) => (n >= R.umbralGrande ? 'grande' : 'traspatio');
  const indicadoresDe = (R, sp) => R.indicadores.filter(i => i.sp === sp);
  const categoria = (R, f) => R.umbrales.find(u => f >= u[0])[1];

  function noAplica(R, ind, p) {
    const pesos = R.pesos[tipoPredio(R, p.nAves)];
    if (pesos[ind.g] === 0) return ind.g === 'MBG' ? 'La gestión solo se evalúa en predios de ' + R.umbralGrande + ' aves o más' : 'Este grupo no se evalúa en este tipo de predio';
    for (const c of ind.aplica || []) {
      const v = p[c.campo];
      if ('igual' in c && v !== c.igual) return c.motivo;
      if ('distinto' in c && v === c.distinto) return c.motivo;
      if ('min' in c && !(v >= c.min)) return c.motivo;
    }
    return null;
  }
  function densPerm(tabla, peso) {
    if (peso <= tabla[0][0]) return tabla[0][1];
    const ult = tabla[tabla.length - 1];
    if (peso >= ult[0]) return ult[1];
    for (let i = 1; i < tabla.length; i++) if (peso <= tabla[i][0]) { const [a, b] = tabla[i - 1], [c, d] = tabla[i]; return b + (d - b) * (peso - a) / (c - a); }
  }
  // Escala declarativa: gana la primera condición que se cumple (hasta: v<=, menor: v<, desde: v>=, mayor: v>, x: tratamiento/registros)
  function puntosEscala(escala, v, x) {
    for (const c of escala) {
      if ('hasta' in c && !(v <= c.hasta)) continue;
      if ('menor' in c && !(v < c.menor)) continue;
      if ('desde' in c && !(v >= c.desde)) continue;
      if ('mayor' in c && !(v > c.mayor)) continue;
      if ('x' in c && !!x !== c.x) continue;
      return c.pts;
    }
    return 0;
  }
  // puntaje de un indicador a partir de lo observado; null si falta información
  function puntaje(R, ind, o, p) {
    if (!o) return null;
    if (ind.t === 'nivel') { if (o.i === undefined || !ind.ops[o.i]) return null; return { pts: ind.ops[o.i][0], txt: ind.ops[o.i][1] }; }
    if (ind.t === 'pct') {
      const v = num(o.v); if (v === null || v < 0 || v > 100) return null;
      const txt = `${v} %` + (ind.usaX && v > 0 ? (o.x ? ' · con ' + (ind.etiquetaX || 'evidencia').replace(/^Hay /, '').toLowerCase() : ' · sin ' + (ind.etiquetaX || 'evidencia').replace(/^Hay /, '').toLowerCase()) : '');
      return { pts: puntosEscala(ind.escala, v, !!o.x), txt };
    }
    if (ind.t === 'dens') { const pe = num(o.peso), de = num(o.dens); if (pe === null || de === null || pe <= 0 || de < 0) return null; const perm = densPerm(R.densidad, pe); return { pts: de <= perm ? 100 : 0, txt: `Aves de ${pe} kg: ${de} kg/m² (máximo permitido ${perm.toFixed(1)})` }; }
    if (ind.t === 'cc') { const n = parseInt(o.cc, 10); if (!(n >= 1 && n <= 5)) return null; const t = ind.tabla[p.proposito === 'huevo' ? 'huevo' : 'carne']; return { pts: t[n], txt: `Condición corporal ${n} (${CC_ETQ[n]})` }; }
    return null;
  }

  function evaluar(R, p, obs) {
    const tipo = tipoPredio(R, p.nAves), pesos = R.pesos[tipo];
    const detalle = [], faltan = [];
    for (const ind of indicadoresDe(R, p.especie)) {
      const razon = noAplica(R, ind, p), o = obs[ind.id];
      const d = { id: ind.id, n: ind.n, g: ind.g, ref: ind.ref };
      if (razon) { d.estado = 'na-auto'; d.motivo = razon; }
      else if (o && o.na) { d.estado = 'na'; d.motivo = 'Marcado como no aplicable por el evaluador'; }
      else { const r = puntaje(R, ind, o, p); if (r) { d.estado = 'ok'; d.pts = r.pts; d.txt = r.txt; } else { d.estado = 'falta'; faltan.push(ind.id); } }
      detalle.push(d);
    }
    const grupos = {}; let final = 0, pesoUsado = 0, completa = faltan.length === 0; const sinDatos = [];
    for (const g of ['MBA', 'MBR', 'MBG']) {
      const ok = detalle.filter(d => d.g === g && d.estado === 'ok');
      const aplican = detalle.filter(d => d.g === g && (d.estado === 'ok' || d.estado === 'falta')).length, w = pesos[g];
      const prom = ok.length ? ok.reduce((s, d) => s + d.pts, 0) / ok.length : null;
      grupos[g] = { w, n: ok.length, aplican, prom, aporte: prom === null ? 0 : w * prom / 100, perdidos: prom === null ? 0 : w * (100 - prom) / 100 };
      if (w > 0) { if (prom === null) sinDatos.push(g); else { final += grupos[g].aporte; pesoUsado += w; } }
    }
    if (sinDatos.length) completa = false;
    const provisional = !completa;
    const finalR = pesoUsado > 0 ? Math.round((provisional ? final * 100 / pesoUsado : final) * 100) / 100 : null;
    const cat = finalR === null ? null : categoria(R, finalR);
    const mejoras = detalle.filter(d => d.estado === 'ok' && d.pts < 100).map(d => { const gr = grupos[d.g]; return { id: d.id, n: d.n, g: d.g, pts: d.pts, ganancia: gr.w * (100 - d.pts) / 100 / gr.n }; }).sort((a, b) => b.ganancia - a.ganancia);
    const adv = [];
    if (finalR !== null && completa) for (const [u] of R.umbrales) { if (u > 0 && Math.abs(finalR - u) < R.zonaSensible) { adv.push(`Zona sensible: la calificación está a ${Math.abs(finalR - u).toFixed(2)} puntos del umbral ${u}. Una diferencia pequeña entre evaluadores podría cambiar la categoría.`); break; } }
    if (sinDatos.length) adv.push(`No hay indicadores evaluados en: ${sinDatos.join(', ')}.`);
    const nNa = detalle.filter(d => d.estado === 'na').length;
    if (nNa) adv.push(`${nNa} indicador(es) marcados manualmente como no aplicables: confirme que corresponde excluirlos del promedio.`);
    return { tipo, pesos, grupos, final: finalR, categoria: cat, completa, provisional, faltan, detalle, mejoras, advertencias: adv };
  }

  // ---- validación estructural de un conjunto de reglas (lo usa el administrador al editar) ----
  const CLAVES_COND = ['hasta', 'menor', 'desde', 'mayor', 'x', 'pts'];
  function validarReglas(R) {
    const e = [], suma = o => o.MBA + o.MBR + o.MBG;
    if (!R || typeof R !== 'object') return ['Las reglas no tienen formato válido.'];
    if (!(R.umbralGrande > 0)) e.push('umbralGrande debe ser un número positivo.');
    for (const t of ['grande', 'traspatio']) {
      const p = R.pesos && R.pesos[t];
      if (!p || ['MBA', 'MBR', 'MBG'].some(g => typeof p[g] !== 'number' || p[g] < 0)) e.push('Pesos inválidos para ' + t + '.');
      else if (suma(p) !== 100) e.push('Los pesos de ' + t + ' deben sumar 100 (suman ' + suma(p) + ').');
    }
    if (!Array.isArray(R.umbrales) || R.umbrales.length < 2 || R.umbrales[R.umbrales.length - 1][0] !== 0 || R.umbrales.some((u, i) => i && u[0] >= R.umbrales[i - 1][0] || typeof u[1] !== 'string')) e.push('Los umbrales deben ir de mayor a menor y terminar en 0.');
    if (typeof R.zonaSensible !== 'number' || R.zonaSensible < 0) e.push('zonaSensible debe ser un número mayor o igual que 0.');
    if (!Array.isArray(R.densidad) || R.densidad.length < 2) e.push('La tabla de densidad es obligatoria.');
    const ids = new Set();
    for (const i of R.indicadores || []) {
      const c = `Indicador ${i && i.id}: `;
      if (!i || !i.id || ids.has(i.id)) { e.push(c + 'id vacío o repetido.'); continue; } ids.add(i.id);
      if (!['pato', 'ganso'].includes(i.sp) || !['MBA', 'MBR', 'MBG'].includes(i.g) || !i.n) e.push(c + 'especie, grupo o nombre inválidos.');
      if (i.t === 'nivel') { if (!Array.isArray(i.ops) || i.ops.length < 2 || i.ops.some(o => !Array.isArray(o) || typeof o[0] !== 'number' || o[0] < 0 || o[0] > 100 || !o[1])) e.push(c + 'los niveles deben ser [puntaje 0-100, descripción].'); }
      else if (i.t === 'pct') {
        if (!Array.isArray(i.escala) || !i.escala.length) e.push(c + 'la escala es obligatoria.');
        else {
          i.escala.forEach(k => { if (Object.keys(k).some(x => !CLAVES_COND.includes(x)) || typeof k.pts !== 'number' || k.pts < 0 || k.pts > 100) e.push(c + 'condición de escala inválida.'); });
          const ult = i.escala[i.escala.length - 1]; if (Object.keys(ult).some(x => x !== 'pts')) e.push(c + 'la última condición debe ser solo {pts} (valor por defecto).');
        }
      } else if (i.t === 'cc') { if (!i.tabla || !i.tabla.carne || !i.tabla.huevo) e.push(c + 'la tabla de condición corporal es obligatoria.'); }
      else if (i.t !== 'dens') e.push(c + 'tipo desconocido.');
    }
    for (const sp of ['pato', 'ganso']) if (!(R.indicadores || []).some(i => i.sp === sp)) e.push('No hay indicadores de ' + sp + '.');
    return e;
  }

  // ---- generador de observaciones de ejemplo (datos ilustrativos) ----
  function candidatos(R, ind, p) {
    if (ind.t === 'nivel') return ind.ops.map((o, i) => ({ obs: { i }, pts: o[0] }));
    if (ind.t === 'pct') { const c = []; for (const v of [0, 1, 2, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 50, 60, 70, 90, 100]) for (const x of [true, false]) c.push({ obs: { v, x }, pts: puntosEscala(ind.escala, v, x) }); return c; }
    if (ind.t === 'dens') return [{ obs: { peso: 2, dens: 15 }, pts: 100 }, { obs: { peso: 2, dens: 25 }, pts: 0 }];
    if (ind.t === 'cc') return [1, 2, 3, 4, 5].map(n => ({ obs: { cc: n }, pts: ind.tabla[p.proposito === 'huevo' ? 'huevo' : 'carne'][n] }));
    return [];
  }
  function obsEjemplo(R, p, objetivos) {
    const obs = {};
    for (const g of ['MBA', 'MBR', 'MBG']) {
      const L = indicadoresDe(R, p.especie).filter(i => i.g === g && !noAplica(R, i, p));
      if (!L.length || objetivos[g] === undefined) continue;
      let resto = L.length * (100 - objetivos[g]);
      for (let j = L.length - 1; j >= 0; j--) {
        const c = candidatos(R, L[j], p), niveles = [...new Set(c.map(x => x.pts))].sort((a, b) => a - b);
        let pts = 100; for (const l of niveles) { if (100 - l <= resto + 22) { pts = l; break; } }
        resto -= 100 - pts; obs[L[j].id] = c.find(x => x.pts === pts).obs;
      }
    }
    return obs;
  }
  return { GRUPOS, CC_ETQ, tipoPredio, indicadoresDe, categoria, noAplica, puntaje, puntosEscala, evaluar, validarReglas, candidatos, obsEjemplo, densPerm };
});
