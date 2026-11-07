// Convierte los indicadores del MVP (funciones JS) a reglas declarativas en JSON (datos, no código).
// Uso: node scripts/generar-reglas.js   → escribe src/dominio/reglas_ica_v1.json
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../tests/motor_mvp_original.js'), 'utf8') + '\nthis.X={IND,REGLAS,DENS,CC_ETQ};', ctx);
const { IND, DENS } = ctx.X;
// escalas de los indicadores numéricos: se evalúan en orden y gana la primera condición que se cumple
const E = {
  p_bebint: [{ desde: 80, pts: 100 }, { desde: 40, pts: 55 }, { pts: 0 }],
  p_jadeo: [{ hasta: 40, pts: 100 }, { hasta: 60, pts: 55 }, { pts: 0 }],
  p_amont: [{ hasta: 40, pts: 100 }, { hasta: 60, pts: 55 }, { pts: 0 }],
  p_mort: [{ hasta: 12, pts: 100 }, { hasta: 14, pts: 55 }, { pts: 0 }],
  g_agua: [{ desde: 100, pts: 100 }, { desde: 80, pts: 55 }, { pts: 0 }],
  g_comed: [{ desde: 100, pts: 100 }, { desde: 80, pts: 55 }, { desde: 60, pts: 20 }, { pts: 0 }],
  g_bebed: [{ desde: 100, pts: 100 }, { desde: 80, pts: 55 }, { desde: 60, pts: 20 }, { pts: 0 }],
  g_limp: [{ hasta: 0, pts: 100 }, { menor: 20, pts: 55 }, { hasta: 40, pts: 20 }, { pts: 0 }],
  g_heridas: [{ hasta: 0, pts: 100 }, { hasta: 15, x: true, pts: 55 }, { hasta: 20, pts: 20 }, { pts: 0 }],
  g_plumaje: [{ hasta: 0, pts: 100 }, { hasta: 40, pts: 55 }, { pts: 0 }],
  g_podo: [{ hasta: 0, pts: 100 }, { menor: 20, x: true, pts: 55 }, { menor: 20, pts: 20 }, { x: true, pts: 20 }, { pts: 0 }],
  g_diarrea: [{ hasta: 0, pts: 100 }, { hasta: 10, x: true, pts: 55 }, { hasta: 10, pts: 20 }, { x: true, pts: 20 }, { pts: 0 }],
  g_pico: [{ hasta: 0, pts: 100 }, { hasta: 6, pts: 55 }, { hasta: 8, pts: 20 }, { pts: 0 }],
  g_cojos: [{ menor: 3, pts: 100 }, { hasta: 6, pts: 55 }, { hasta: 8, pts: 20 }, { pts: 0 }],
  g_secrec: [{ hasta: 0, pts: 100 }, { hasta: 10, x: true, pts: 55 }, { hasta: 10, pts: 20 }, { x: true, pts: 20 }, { pts: 0 }],
  g_agres: [{ menor: 5, pts: 100 }, { hasta: 8, pts: 55 }, { hasta: 10, pts: 20 }, { pts: 0 }],
  g_humano: [{ menor: 3, pts: 100 }, { hasta: 6, pts: 55 }, { hasta: 8, pts: 20 }, { pts: 0 }],
  g_posit: [{ desde: 70, pts: 100 }, { desde: 50, pts: 55 }, { pts: 0 }],
  g_g_capac: [{ mayor: 80, pts: 100 }, { desde: 50, pts: 55 }, { desde: 20, pts: 20 }, { pts: 0 }],
  g_g_mort: [{ hasta: 3, x: true, pts: 100 }, { hasta: 3, pts: 55 }, { hasta: 5, pts: 20 }, { pts: 0 }]
};
const AP = {
  p_cama: [{ campo: 'corral', igual: true, motivo: 'Solo aplica si hay galpón o corral con cama en el piso' }, { campo: 'cama', igual: true, motivo: 'Solo aplica si hay galpón o corral con cama en el piso' }],
  p_nidal: [{ campo: 'proposito', distinto: 'carne', motivo: 'El nidal no aplica a patos de carne' }],
  p_jadeo: [{ campo: 'corral', igual: true, motivo: 'Solo aplica si las aves permanecen en galpón o corral' }],
  p_mort: [{ campo: 'nAves', min: 200, motivo: 'Solo se evalúa en predios de 200 aves o más' }],
  g_g_prot: [{ campo: 'sistema', distinto: 'extensivo', motivo: 'Solo aplica a sistemas intensivo y semi-intensivo' }]
};
const ETIQ_X = { g_g_mort: 'Hay registros escritos de mortalidad' };
const indicadores = IND.map(i => {
  const o = { id: i.id, sp: i.sp, g: i.g, n: i.n, ref: i.ref || '' };
  if (i.t === 'nivel') { o.t = 'nivel'; o.ops = i.ops; }
  else if (i.t === 'dens') { o.t = 'dens'; o.esc = i.esc; }
  else if (i.t === 'cc') { o.t = 'cc'; o.esc = i.esc; o.tabla = { carne: { 1: 0, 2: 55, 3: 100, 4: 100, 5: 0 }, huevo: { 1: 0, 2: 100, 3: 100, 4: 55, 5: 0 } }; }
  else { // pct y mortG
    if (!E[i.id]) throw new Error('Falta la escala de ' + i.id);
    o.t = 'pct'; o.un = i.un; o.esc = i.esc; o.escala = E[i.id];
    if (i.tr || i.t === 'mortG') { o.usaX = true; o.etiquetaX = ETIQ_X[i.id] || 'Hay evidencia de tratamiento'; }
  }
  if (i.doc) o.doc = true;
  if (AP[i.id]) o.aplica = AP[i.id];
  return o;
});
const reglas = {
  nombre: 'Metodología ICA para patos y gansos',
  fuente: 'ICA 2024 v1.0',
  umbralGrande: 200,
  pesos: { grande: { MBA: 60, MBR: 25, MBG: 15 }, traspatio: { MBA: 70, MBR: 30, MBG: 0 } },
  umbrales: [[90, 'Excelente'], [75, 'Alto'], [50, 'Medio'], [0, 'Bajo']],
  zonaSensible: 3,
  densidad: DENS,
  indicadores
};
fs.writeFileSync(path.join(__dirname, '../src/dominio/reglas_ica_v1.json'), JSON.stringify(reglas, null, 1));
console.log('indicadores:', indicadores.length);
