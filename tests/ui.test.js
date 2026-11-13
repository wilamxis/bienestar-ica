// Pruebas de la vista con un navegador simulado (jsdom) contra el servidor real.
const test = require('node:test'), assert = require('node:assert/strict'), http = require('http');
const { JSDOM } = require('jsdom');
const { crearApp } = require('../src/app'), seed = require('../src/seed');
let ctx, srv, base;
const opcionesBd = () => (process.env.TEST_DATABASE_URL ? { databaseUrl: process.env.TEST_DATABASE_URL, reiniciar: true } : { dbPath: ':memory:', databaseUrl: null });   // con TEST_DATABASE_URL se prueba contra PostgreSQL

test.before(async () => { ctx = await crearApp(opcionesBd()); ctx.app.locals.demo = true; await seed.sembrarDemo(ctx); srv = http.createServer(ctx.app); await new Promise(r => srv.listen(0, r)); base = 'http://localhost:' + srv.address().port; });
test.after(async () => { srv.close(); await ctx.cerrar(); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function abrir() {
  const errores = []; let cookie = '', pendientes = 0;
  const dom = await JSDOM.fromURL(base + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, beforeParse(w) {
    w.fetch = async (u, o = {}) => { pendientes++; try { const r = await fetch(new URL(u, base), { ...o, headers: { ...(o.headers || {}), cookie } }); const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.includes('Expires=Thu, 01 Jan 1970') ? '' : sc.split(';')[0]; return r; } finally { pendientes--; } };
    w.console.error = (...a) => errores.push(a.join(' ')); w.addEventListener('error', e => errores.push('JS: ' + e.message));
    w.print = () => {}; w.scrollTo = () => {}; w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () { w.__descarga = this.download; };
  } });
  const w = dom.window, d = w.document;
  const asentar = async () => { let quieto = 0; for (let i = 0; i < 80 && quieto < 3; i++) { await sleep(25); quieto = pendientes === 0 ? quieto + 1 : 0; } };
  await new Promise(r => (d.readyState === 'complete' ? r() : w.addEventListener('load', r))); await asentar();
  const U = { w, d, errores, asentar,
    app: () => d.getElementById('app'), nav: () => [...d.querySelectorAll('nav.menu a')].map(a => a.textContent),
    ir: async h => { w.location.hash = h; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await asentar(); },
    click: async el => { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await asentar(); },
    ev: (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true })),
    enviar: async f => { f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await asentar(); },
    login: async (email, pw = 'Demo1234') => { const f = d.getElementById('loginform'); f.elements.email.value = email; f.elements.password.value = pw; await U.enviar(f); },
    eval: s => w.eval(s) };
  return U;
}
const hayError = U => U.app().querySelector('.card.err');

test('acceso: pantalla de ingreso, credenciales incorrectas y demostración', async () => {
  const U = await abrir();
  assert.ok(U.d.getElementById('loginform'), 'sin sesión se muestra el ingreso'); assert.ok(U.d.querySelector('.demo'), 'muestra usuarios de demostración');
  await U.login('evaluador@demo.co', 'incorrecta'); assert.match(U.d.getElementById('loginerr').textContent, /incorrectos/);
  await U.login('evaluador@demo.co'); assert.ok(!U.d.getElementById('loginform')); assert.deepEqual(U.nav(), ['Inicio', 'Predios', 'Reglas']);
  await U.click(U.d.querySelector('[data-act=logout]')); assert.ok(U.d.getElementById('loginform'), 'al salir vuelve al ingreso');
  assert.deepEqual(U.errores, []);
});

test('evaluador: flujo completo (crear predio, evaluar, cerrar, corregir, histórico, informes)', async () => {
  const U = await abrir(); await U.login('evaluador@demo.co');
  await U.ir('#/predios'); assert.equal(U.app().querySelectorAll('#lista-predios tbody tr').length, 4);
  const q = U.d.getElementById('f-q'); q.value = 'gansos'; U.ev(q, 'input'); assert.equal(U.app().querySelectorAll('#lista-predios tbody tr').length, 1); q.value = ''; U.ev(q, 'input');
  // crear predio (con validación y dueño)
  await U.click(U.app().querySelector('[data-act=form-predio]'));
  const f = () => U.d.getElementById('dlgform'), set = (n, v) => { f().elements[n].value = v; };
  set('codigo', 'P-001'); set('nombre', 'Duplicado'); set('nAves', '10'); await U.enviar(f()); assert.match(U.d.getElementById('dlgerr').textContent, /Ya existe un predio/);
  set('codigo', 'P-800'); set('nombre', 'Predio UI'); set('nAves', '250'); set('especie', 'ganso'); set('proposito', 'carne'); set('sistema', 'semi'); set('areaM2', '3200'); set('duenoId', f().elements.duenoId.options[1].value); await U.enviar(f());
  assert.match(U.w.location.hash, /#\/predio\/\d+/); await U.asentar(); assert.match(U.app().textContent, /P-800/); assert.match(U.app().textContent, /Pablo Productor/); assert.match(U.app().textContent, /3\.200 m²/, 'muestra el tamaño del predio'); assert.match(U.app().textContent, /0,08 aves\/m²/, 'y las aves por m²');
  const pid = U.w.location.hash.split('/')[2];
  // evaluación: no cierra incompleta; con todo en 100 cierra
  await U.click(U.app().querySelector('[data-act=nueva-eval]')); assert.match(U.w.location.hash, /#\/editar\//); await U.asentar();
  const eid = U.w.location.hash.split('/')[2];
  await U.click(U.app().querySelector('[data-act=ed-cerrar]')); assert.ok(U.d.getElementById('toast').classList.contains('err'), 'no cierra con faltantes');
  const Est = U.eval('Estado'), pred = { especie: 'ganso', proposito: 'carne', nAves: 250, sistema: 'semi', corral: false, cama: false };
  const tarjetas = [...U.app().querySelectorAll('.ind:not(.off)')]; assert.equal(tarjetas.length, 25);
  for (const c of tarjetas) {
    const ind = Est.reglas.indicadores.find(i => i.id === c.dataset.id), mejor = U.w.Motor.candidatos(Est.reglas, ind, pred).find(x => x.pts === 100).obs, q2 = n => c.querySelector(`[name=${n}]`);
    if (ind.t === 'nivel') { const r = c.querySelectorAll('input[type=radio]')[mejor.i]; r.checked = true; U.ev(r, 'change'); } else if (ind.t === 'pct') { q2('v').value = mejor.v; if (q2('x')) q2('x').checked = !!mejor.x; U.ev(q2('v'), 'input'); }
  }
  assert.match(U.d.getElementById('resumen').textContent, /100,00/);
  await U.click(U.app().querySelector('[data-act=ed-guardar]')); await U.click(U.app().querySelector('[data-act=ed-cerrar]')); await U.ir('#/eval/' + eid);
  assert.match(U.app().textContent, /Excelente/); assert.match(U.app().textContent, /Historial de cambios/);
  // corrección con motivo
  await U.ir('#/editar/' + eid); assert.match(U.app().textContent, /Corregir evaluación/);
  const r2 = U.app().querySelectorAll('.ind[data-id=g_alim] input[type=radio]')[2]; r2.checked = true; U.ev(r2, 'change');
  await U.click(U.app().querySelector('[data-act=ed-corregir]')); set('motivo', 'x'); await U.enviar(f()); assert.match(U.d.getElementById('dlgerr').textContent, /5 caracteres|al menos 5/);
  set('motivo', 'Corrección tras revisar soporte del alimento'); await U.enviar(f()); await U.asentar(); assert.match(U.w.location.hash, /#\/eval\//); await U.asentar();
  assert.match(U.app().textContent, /versión 2/); assert.match(U.app().textContent, /Corrección tras revisar/);
  // histórico, informes y CSV
  await U.ir('#/predio/' + pid); assert.ok(U.app().querySelectorAll('svg').length >= 2); assert.ok(!hayError(U));
  for (const t of ['eval', 'mejora']) { await U.ir(`#/informe/${t}/${eid}`); assert.ok(U.app().querySelector('.informe'), 'informe ' + t); assert.ok(!hayError(U)); }
  await U.ir('#/informe/hist/' + pid); assert.match(U.app().textContent, /Informe histórico/); await U.click(U.app().querySelector('[data-act=csv]')); assert.match(U.w.__descarga || '', /historico_P-800/);
  // anular y desactivar
  await U.ir('#/eval/' + eid); await U.click(U.app().querySelector('[data-act=anular]')); set('motivo', 'Registrada por error en la visita'); await U.enviar(f()); assert.match(U.app().textContent, /anulada/);
  await U.ir('#/reglas'); assert.ok(!U.app().querySelector('[data-act=editar-regla]'), 'el evaluador no ve botones de edición de reglas');
  assert.deepEqual(U.errores, []);
});

test('productor: solo consulta sus predios; sin botones ni rutas de edición', async () => {
  const U = await abrir(); await U.login('productor@demo.co');
  assert.deepEqual(U.nav(), ['Inicio', 'Mis predios', 'Reglas']); assert.match(U.app().textContent, /Mis predios/);
  const pablo = await ctx.repos.usuarios.porEmail('productor@demo.co'), todosPredios = await ctx.repos.predios.listar(), suyos = todosPredios.filter(p => p.duenoId === pablo.id).length;
  await U.ir('#/predios'); assert.equal(U.app().querySelectorAll('#lista-predios tbody tr').length, suyos, 'solo los predios de este productor'); assert.ok(suyos < todosPredios.length); assert.ok(!U.app().querySelector('[data-act=form-predio]'), 'sin botón de nuevo predio');
  const ver = U.app().querySelector('#lista-predios a[href^="#/predio/"]'); await U.ir(ver.getAttribute('href'));
  assert.ok(!U.app().querySelector('[data-act=nueva-eval]') && !U.app().querySelector('[data-act=toggle-predio]') && !U.app().querySelector('[data-act=form-predio]'), 'ficha de solo lectura');
  assert.ok(U.app().querySelector('a[href^="#/informe/hist/"]'), 'sí puede pedir informes');
  const ev = U.app().querySelector('a[href^="#/eval/"]'); await U.ir(ev.getAttribute('href')); assert.ok(!/Historial de cambios/.test(U.app().textContent), 'no ve el historial interno'); assert.ok(!U.app().querySelector('[data-act=anular]'));
  await U.ir('#/editar/1'); assert.match(U.app().textContent, /No tiene acceso/);
  await U.ir('#/usuarios'); assert.match(U.app().textContent, /No tiene acceso/);
  const otro = (await ctx.repos.predios.listar()).find(p => p.codigo === 'P-003'); await U.ir('#/predio/' + otro.id); assert.match(U.app().textContent, /No encontrado/, 'predio de otro productor');
  assert.deepEqual(U.errores, []);
});

test('administrador: reglas versionadas y usuarios; no ve predios', async () => {
  const U = await abrir(); await U.login('admin@demo.co');
  assert.deepEqual(U.nav(), ['Inicio', 'Reglas', 'Usuarios']); assert.match(U.app().textContent, /Panel de administración/);
  await U.ir('#/predios'); assert.match(U.app().textContent, /No tiene acceso/);
  await U.ir('#/reglas'); assert.match(U.app().textContent, /Indicadores de patos \(33\)/); assert.match(U.app().textContent, /Indicadores de gansos \(25\)/); const v0 = (U.app().textContent.match(/Versión vigente: v(\d+)/) || [])[1];
  await U.click(U.app().querySelector('[data-act=editar-regla][data-id=g_posit]'));
  const f = () => U.d.getElementById('dlgform'); f().elements.json.value = '{"escala":[{"desde":75,"pts":100},{"desde":50,"pts":55},{"pts":0}]}'; f().elements.motivo.value = 'Ajuste de prueba del umbral'; await U.enviar(f()); await U.asentar();
  assert.match(U.app().textContent, new RegExp('Versión vigente: v' + (+v0 + 1))); assert.match(U.app().textContent, /Ajuste de prueba del umbral/);
  await U.click(U.app().querySelector('[data-act=editar-regla][data-id=g_posit]')); f().elements.json.value = '{"escala":[{"desde":75,"pts":300},{"pts":0}]}'; f().elements.motivo.value = 'Intento inválido'; await U.enviar(f()); assert.match(U.d.getElementById('dlgerr').textContent, /válidas|inválida/);
  await U.click(U.d.querySelector('[data-act=cerrar-dlg]'));
  await U.ir('#/usuarios'); await U.click(U.app().querySelector('[data-act=form-usuario]')); f().elements.nombre.value = 'Usuario UI'; f().elements.email.value = 'ui@demo.co'; f().elements.password.value = 'corta'; await U.enviar(f()); assert.match(U.d.getElementById('dlgerr').textContent, /contraseña/);
  f().elements.password.value = 'Clave1234'; f().elements.rol.value = 'productor'; await U.enviar(f()); await U.asentar(); assert.match(U.app().textContent, /ui@demo.co/);
  assert.deepEqual(U.errores, []);
});
