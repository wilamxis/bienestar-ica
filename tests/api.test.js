const test = require('node:test'), assert = require('node:assert/strict'), http = require('http');
const { crearApp } = require('../src/app'), seed = require('../src/seed'), Motor = require('../src/dominio/motor');
let ctx, base, srv;
const opcionesBd = () => (process.env.TEST_DATABASE_URL ? { databaseUrl: process.env.TEST_DATABASE_URL, reiniciar: true } : { dbPath: ':memory:', databaseUrl: null });   // con TEST_DATABASE_URL se prueba contra PostgreSQL

const cliente = () => { let cookie = ''; const f = async (metodo, ruta, cuerpo, extra = {}) => {
  const r = await fetch(base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', cookie, ...extra }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].startsWith('sid=') && sc.includes('Expires=Thu, 01 Jan 1970') ? '' : sc.split(';')[0];
  let json = null; try { json = await r.json(); } catch (e) { /* sin cuerpo */ } return { status: r.status, json }; };
  f.get = (r) => f('GET', r); f.post = (r, b) => f('POST', r, b || {}); f.put = (r, b) => f('PUT', r, b); f.patch = (r, b) => f('PATCH', r, b); f.del = r => f('DELETE', r);
  f.login = async (email, password = 'Demo1234') => f.post('/api/auth/login', { email, password }); return f; };
test.before(async () => {
  ctx = await crearApp(opcionesBd()); await seed.sembrarDemo(ctx);
  srv = http.createServer(ctx.app); await new Promise(r => srv.listen(0, r)); base = 'http://localhost:' + srv.address().port;
});
test.after(async () => { srv.close(); await ctx.cerrar(); });
const mejorObs = (R, p) => { const o = {}; for (const i of Motor.indicadoresDe(R, p.especie)) if (!Motor.noAplica(R, i, p)) o[i.id] = Motor.candidatos(R, i, p).find(c => c.pts === 100).obs; return o; };
const datosPredio = (x = {}) => ({ codigo: 'T-' + Math.random().toString(36).slice(2, 7), nombre: 'Predio de prueba', especie: 'pato', proposito: 'carne', sistema: 'intensivo', nAves: 300, corral: true, cama: true, ...x });

test('autenticación: credenciales, sesión y cierre de sesión', async () => {
  const c = cliente();
  assert.equal((await c.get('/api/predios')).status, 401);
  assert.equal((await c.login('evaluador@demo.co', 'mala')).status, 401);
  const r = await c.login('evaluador@demo.co'); assert.equal(r.status, 200); assert.equal(r.json.usuario.rol, 'evaluador'); assert.ok(r.json.permisos.includes('predio:crear'));
  assert.equal(JSON.stringify(r.json).includes('hash'), false, 'no expone el hash');
  assert.equal((await c.get('/api/auth/yo')).json.usuario.email, 'evaluador@demo.co');
  await c.post('/api/auth/logout'); assert.equal((await c.get('/api/auth/yo')).status, 401);
});
test('límite de intentos fallidos de acceso', async () => {
  const c = cliente(); for (let i = 0; i < 5; i++) assert.equal((await c.login('productora2@demo.co', 'x')).status, 401);
  assert.equal((await c.login('productora2@demo.co')).status, 429);
});
test('roles: cada rol solo accede a lo suyo (verificado en el servidor)', async () => {
  const ev = cliente(), pr = cliente(), ad = cliente(); await ev.login('evaluador@demo.co'); await pr.login('productor@demo.co'); await ad.login('admin@demo.co');
  assert.equal((await ev.get('/api/predios')).json.length, 4);
  assert.equal((await ad.get('/api/predios')).status, 403, 'el administrador no ve predios');
  assert.equal((await pr.post('/api/predios', datosPredio())).status, 403, 'el productor no crea predios');
  assert.equal((await ev.patch('/api/reglas/parametros', { cambios: { zonaSensible: 2 }, motivo: 'prueba de permisos' })).status, 403, 'el evaluador no edita reglas');
  assert.equal((await pr.get('/api/usuarios')).status, 403); assert.equal((await ev.get('/api/usuarios')).status, 403);
  assert.equal((await ad.get('/api/usuarios')).status, 200); assert.equal((await pr.get('/api/reglas')).status, 200, 'todos pueden consultar reglas');
});
test('el productor solo ve sus predios y solo evaluaciones cerradas', async () => {
  const ev = cliente(), pr = cliente(); await ev.login('evaluador@demo.co'); await pr.login('productor@demo.co');
  const mios = (await pr.get('/api/predios')).json; assert.deepEqual(mios.map(p => p.codigo).sort(), ['P-001', 'P-002']);
  const todos = (await ev.get('/api/predios')).json, ajeno = todos.find(p => p.codigo === 'P-003');
  assert.equal((await pr.get('/api/predios/' + ajeno.id)).status, 404, 'predio de otro productor: no existe para él');
  assert.equal((await pr.get(`/api/predios/${ajeno.id}/evaluaciones`)).status, 404);
  const p2 = todos.find(p => p.codigo === 'P-002'), evs = (await pr.get(`/api/predios/${p2.id}/evaluaciones`)).json;
  assert.ok(evs.length === 2 && evs.every(e => e.estado === 'cerrada'), 'no ve el borrador');
  const borrador = (await ev.get(`/api/predios/${p2.id}/evaluaciones`)).json.find(e => e.estado === 'borrador');
  assert.equal((await pr.get('/api/evaluaciones/' + borrador.id)).status, 404);
  const det = (await pr.get('/api/evaluaciones/' + evs[0].id)).json; assert.deepEqual(det.cambios, [], 'sin historial interno');
  assert.equal((await pr.post(`/api/evaluaciones/${evs[0].id}/anular`, { motivo: 'intento no permitido' })).status, 403);
  assert.equal((await pr.get('/api/tablero')).json.activos, 2);
});
test('CRUD de predios con validaciones y registro de cambios', async () => {
  const ev = cliente(); await ev.login('evaluador@demo.co');
  assert.equal((await ev.post('/api/predios', datosPredio({ nAves: 0 }))).status, 400);
  assert.equal((await ev.post('/api/predios', datosPredio({ codigo: 'p-001' }))).status, 400, 'código duplicado sin distinguir mayúsculas');
  assert.equal((await ev.post('/api/predios', datosPredio({ duenoId: 1 }))).status, 400, 'el dueño debe ser productor');
  const prods = (await ev.get('/api/productores')).json; assert.equal(prods.length, 2);
  assert.equal((await ev.post('/api/predios', datosPredio({ areaM2: -5 }))).status, 400, 'el tamaño debe ser positivo');
  assert.equal((await ev.post('/api/predios', datosPredio({ areaM2: 'abc' }))).status, 400, 'el tamaño debe ser numérico');
  const p = (await ev.post('/api/predios', datosPredio({ duenoId: prods[0].id, areaM2: 5000 }))).json; assert.ok(p.id); assert.equal(p.areaM2, 5000, 'guarda el tamaño en m²');
  assert.equal((await ev.post('/api/predios', datosPredio())).json.areaM2, null, 'el tamaño es opcional');
  const e = await ev.patch('/api/predios/' + p.id, { nombre: 'Nombre editado', nAves: 450 }); assert.equal(e.json.cambios, 2);
  const ea = await ev.patch('/api/predios/' + p.id, { areaM2: 7500.5 }); assert.equal(ea.json.predio.areaM2, 7500.5);
  assert.ok((await ev.get(`/api/predios/${p.id}/cambios`)).json.some(c => c.campo === 'Tamaño (m²)' && c.antes === '5000 m²' && c.despues === '7500.5 m²'), 'el cambio de tamaño queda en la bitácora');
  const cam = (await ev.get(`/api/predios/${p.id}/cambios`)).json; assert.ok(cam.some(c => c.campo === 'Nombre' && c.despues === 'Nombre editado'));
  assert.equal((await ev.post(`/api/predios/${p.id}/estado`)).json.estado, 'inactivo');
  assert.equal((await ev.post(`/api/predios/${p.id}/evaluaciones`)).status, 400, 'no se evalúa un predio inactivo');
  assert.equal((await ev.del('/api/predios/' + p.id)).status, 200, 'sin evaluaciones se elimina');
  const con = (await ev.get('/api/predios')).json.find(x => x.codigo === 'P-001'); assert.equal((await ev.del('/api/predios/' + con.id)).status, 400, 'con evaluaciones solo se desactiva');
});
test('ciclo de una evaluación: borrador, cierre, corrección con motivo y anulación', async () => {
  const ev = cliente(); await ev.login('evaluador@demo.co');
  const { reglas } = await ctx.servicios.reglas.actual();
  const p = (await ev.post('/api/predios', datosPredio({ especie: 'ganso', proposito: 'carne', sistema: 'semi', nAves: 300, corral: false, cama: false }))).json;
  const e = (await ev.post(`/api/predios/${p.id}/evaluaciones`)).json; assert.equal(e.estado, 'borrador');
  assert.equal((await ev.put(`/api/evaluaciones/${e.id}/borrador`, { fecha: '2999-01-01', obs: {} })).status, 400, 'fecha futura');
  const cierre0 = await ev.post(`/api/evaluaciones/${e.id}/cerrar`, { fecha: '2026-01-10', obs: {} }); assert.equal(cierre0.status, 422); assert.ok(cierre0.json.detalle.length > 0);
  const obs = mejorObs(reglas, p);
  assert.equal((await ev.put(`/api/evaluaciones/${e.id}/borrador`, { fecha: '2026-01-10', obs: { ...obs, inventado: { i: 1 } } })).json.obs.inventado, undefined, 'descarta indicadores desconocidos');
  const c = (await ev.post(`/api/evaluaciones/${e.id}/cerrar`, { fecha: '2026-01-10', obs })).json; assert.equal(c.estado, 'cerrada'); assert.equal(c.resultado.final, 100); assert.equal(c.resultado.categoria, 'Excelente');
  assert.equal((await ev.put(`/api/evaluaciones/${e.id}/borrador`, { fecha: '2026-01-10', obs })).status, 400, 'una cerrada no se edita como borrador');
  const peor = { ...obs, g_alim: { i: 2 } };
  assert.equal((await ev.post(`/api/evaluaciones/${e.id}/corregir`, { fecha: '2026-01-10', obs: peor })).status, 400, 'la corrección exige motivo');
  const k = await ev.post(`/api/evaluaciones/${e.id}/corregir`, { fecha: '2026-01-10', obs: peor, motivo: 'El alimento no tiene registro ICA' });
  assert.equal(k.status, 200); assert.equal(k.json.evaluacion.version, 2); assert.ok(k.json.evaluacion.resultado.final < 100); assert.equal(k.json.cambios, 1);
  const det = (await ev.get('/api/evaluaciones/' + e.id)).json; assert.ok(det.cambios.length >= 2 && det.cambios.every(x => x.motivo.includes('registro ICA') || x.campo === 'Estado'));
  assert.equal((await ev.post(`/api/evaluaciones/${e.id}/anular`, { motivo: 'ok' })).status, 400, 'motivo muy corto');
  assert.equal((await ev.post(`/api/evaluaciones/${e.id}/anular`, { motivo: 'Visita registrada por error' })).json.estado, 'anulada');
  assert.equal((await ev.del('/api/evaluaciones/' + e.id)).status, 400, 'una anulada no se elimina');
});
test('reglas versionadas: el administrador edita, las evaluaciones antiguas conservan su versión', async () => {
  const ev = cliente(), ad = cliente(); await ev.login('evaluador@demo.co'); await ad.login('admin@demo.co');
  const v1 = (await ad.get('/api/reglas')).json; assert.equal(v1.version, 1);
  const p = (await ev.get('/api/predios')).json.find(x => x.codigo === 'P-001'), cerradas = (await ev.get(`/api/predios/${p.id}/evaluaciones`)).json.filter(e => e.estado === 'cerrada');
  assert.equal(cerradas[0].reglaVersion, 1);
  assert.equal((await ad.patch('/api/reglas/indicadores/p_jadeo', { cambios: { escala: [{ hasta: 40, pts: 150 }, { pts: 0 }] }, motivo: 'puntaje fuera de rango' })).status, 400);
  assert.equal((await ad.patch('/api/reglas/indicadores/p_jadeo', { cambios: { escala: [{ hasta: 30, pts: 100 }, { hasta: 60, pts: 55 }, { pts: 0 }] }, motivo: '' })).status, 400, 'exige motivo');
  assert.equal((await ad.patch('/api/reglas/indicadores/p_jadeo', { cambios: { id: 'otro' }, motivo: 'campo no permitido' })).status, 400);
  assert.equal((await ad.patch('/api/reglas/parametros', { cambios: { pesos: { grande: { MBA: 50, MBR: 25, MBG: 15 }, traspatio: { MBA: 70, MBR: 30, MBG: 0 } } }, motivo: 'pesos que no suman 100' })).status, 400);
  const nueva = await ad.patch('/api/reglas/indicadores/p_jadeo', { cambios: { escala: [{ hasta: 30, pts: 100 }, { hasta: 60, pts: 55 }, { pts: 0 }] }, motivo: 'Ajuste de prueba del umbral de jadeo' });
  assert.equal(nueva.status, 200); assert.equal(nueva.json.version, 2);
  assert.equal((await ad.get('/api/reglas/versiones')).json.length, 2);
  const e2 = (await ev.get('/api/evaluaciones/' + cerradas[0].id)).json.evaluacion; assert.equal(e2.reglaVersion, 1, 'la evaluación antigua sigue ligada a la versión 1');
  const nuevaEv = (await ev.post(`/api/predios/${p.id}/evaluaciones`)).json; assert.equal(nuevaEv.reglaVersion, 2, 'las nuevas usan la versión vigente');
  await ev.del('/api/evaluaciones/' + nuevaEv.id);
  const k = await ev.post(`/api/evaluaciones/${cerradas[0].id}/corregir`, { fecha: cerradas[0].fecha, obs: cerradas[0].obs, motivo: 'Revisión sin cambios de datos' });
  assert.equal(k.json.evaluacion.reglaVersion, 1, 'corregir recalcula con las reglas de esa evaluación');
});
test('gestión de usuarios y sesiones', async () => {
  const ad = cliente(); await ad.login('admin@demo.co');
  assert.equal((await ad.post('/api/usuarios', { nombre: 'X', email: 'x@y.co', password: 'corta', rol: 'evaluador' })).status, 400, 'contraseña débil');
  assert.equal((await ad.post('/api/usuarios', { nombre: 'X', email: 'evaluador@demo.co', password: 'Clave1234', rol: 'evaluador' })).status, 400, 'correo repetido');
  const u = (await ad.post('/api/usuarios', { nombre: 'Nuevo Evaluador', email: 'nuevo@demo.co', password: 'Clave1234', rol: 'evaluador' })).json;
  assert.equal(JSON.stringify(u).includes('hash'), false);
  const n = cliente(); assert.equal((await n.login('nuevo@demo.co', 'Clave1234')).status, 200); assert.equal((await n.get('/api/predios')).status, 200);
  await ad.patch('/api/usuarios/' + u.id, { activo: false }); assert.equal((await n.get('/api/predios')).status, 401, 'al desactivarlo se cierra su sesión');
  assert.equal((await cliente().login('nuevo@demo.co', 'Clave1234')).status, 401);
  const yo = (await ad.get('/api/auth/yo')).json.usuario; assert.equal((await ad.patch('/api/usuarios/' + yo.id, { activo: false })).status, 400, 'no puede desactivarse a sí mismo');
  assert.equal((await ad.patch('/api/usuarios/' + yo.id, { rol: 'evaluador' })).status, 400, 'debe quedar un administrador');
});
test('seguridad: origen cruzado, rutas inexistentes y cabeceras', async () => {
  const ev = cliente(); await ev.login('evaluador@demo.co');
  const cookie = await new Promise(res => { const r = http.request(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, m => { m.resume(); res(m.headers['set-cookie'][0].split(';')[0]); }); r.end(JSON.stringify({ email: 'evaluador@demo.co', password: 'Demo1234' })); });
  const crudo = (origen) => new Promise(res => { const r = http.request(base + '/api/predios', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie, Origin: origen } }, m => { m.resume(); res(m.statusCode); }); r.end(JSON.stringify(datosPredio())); });
  assert.equal(await crudo('http://sitio-malicioso.com'), 403, 'rechaza peticiones de otro origen');
  assert.equal(await crudo(base), 201, 'acepta el mismo origen');
  assert.equal((await ev.get('/api/no-existe')).status, 404);
  const r = await fetch(base + '/'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.ok(r.headers.get('content-security-policy'));
  const mot = await fetch(base + '/js/motor.js'); assert.equal(mot.status, 200, 'el motor se sirve al navegador');
});
