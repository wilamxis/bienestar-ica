// Comprueba que el motor nuevo (reglas como datos) da EXACTAMENTE los mismos resultados que el motor del MVP (reglas como código).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm'), path = require('path');
const Motor = require('../src/dominio/motor.js'), R = require('../src/dominio/reglas_ica_v1.json');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'motor_mvp_original.js'), 'utf8') + '\nthis.V={IND,evaluar,puntaje,noAplica,obsEjemplo};', ctx);
const V = ctx.V;
const predios = [];
for (const sp of ['pato', 'ganso']) for (const prop of ['huevo', 'carne', 'otro']) for (const n of [40, 199, 200, 1200]) for (const sis of ['intensivo', 'semi', 'extensivo']) for (const corral of [true, false]) for (const cama of [true, false])
  predios.push({ especie: sp, proposito: prop, nAves: n, sistema: sis, corral, cama });

test('las reglas declarativas cumplen la validación estructural', () => assert.deepEqual(Motor.validarReglas(R), []));
test('mismo puntaje en cada indicador para toda la rejilla de valores', () => {
  let casos = 0;
  for (const ind of R.indicadores) {
    const viejo = V.IND.find(i => i.id === ind.id), p = { especie: ind.sp, proposito: 'carne', nAves: 500, sistema: 'intensivo', corral: true, cama: true };
    const obs = [];
    if (ind.t === 'nivel') ind.ops.forEach((_, i) => obs.push({ i }));
    else if (ind.t === 'pct') for (let v = 0; v <= 100; v += 0.5) for (const x of [true, false]) obs.push({ v, x });
    else if (ind.t === 'dens') for (const peso of [0.5, 1.5, 2, 2.25, 3.2, 4.5, 6]) for (const dens of [0, 10, 17, 18, 19, 20.5, 25, 30]) obs.push({ peso, dens });
    else if (ind.t === 'cc') for (const cc of [1, 2, 3, 4, 5]) obs.push({ cc });
    for (const o of obs) for (const prop of ['huevo', 'carne', 'otro']) {
      const a = V.puntaje(viejo, o, { ...p, proposito: prop }), b = Motor.puntaje(R, ind, o, { ...p, proposito: prop });
      assert.equal(b && b.pts, a && a.pts, `${ind.id} ${JSON.stringify(o)} ${prop}`); casos++;
    }
  }
  assert.ok(casos > 10000);
});
test('misma aplicabilidad en todas las combinaciones de predio', () => {
  for (const p of predios) for (const ind of R.indicadores.filter(i => i.sp === p.especie)) {
    const a = V.noAplica(V.IND.find(i => i.id === ind.id), p), b = Motor.noAplica(R, ind, p);
    assert.equal(!!b, !!a, `${ind.id} ${JSON.stringify(p)}`);
  }
});
test('misma evaluación completa (calificación, categoría, grupos) en predios y escenarios variados', () => {
  let n = 0;
  for (const p of predios) for (const obj of [{ MBA: 100, MBR: 100, MBG: 100 }, { MBA: 62, MBR: 60, MBG: 40 }, { MBA: 78, MBR: 70, MBG: 55 }, { MBA: 20, MBR: 35, MBG: 0 }, { MBA: 90 }]) {
    const obs = V.obsEjemplo(p, obj), a = V.evaluar(p, obs), b = Motor.evaluar(R, p, obs);
    assert.equal(b.final, a.final); assert.equal(b.categoria, a.categoria); assert.equal(b.completa, a.completa);
    for (const g of ['MBA', 'MBR', 'MBG']) assert.equal(b.grupos[g].prom, a.grupos[g].prom);
    assert.equal(JSON.stringify(b.faltan), JSON.stringify(a.faltan)); n++;
  }
  assert.ok(n > 500);
});
