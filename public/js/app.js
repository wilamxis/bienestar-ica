// ===== CONTROLADOR DE LA INTERFAZ: sesión, menú por rol, enrutador y acciones =====
const PAGINAS = {
  inicio: { f: () => pgInicio() }, predios: { f: () => pgPredios(), permiso: 'predio:listar' }, predio: { f: a => pgFicha(+a), permiso: 'predio:ver' },
  eval: { f: a => pgDetalle(+a), permiso: 'evaluacion:ver' }, editar: { f: a => pgEditor(+a), permiso: 'evaluacion:editar' }, informe: { f: (a, b) => pgInforme(a, +b), permiso: 'informe:ver' },
  reglas: { f: () => pgReglas(), permiso: 'regla:ver' }, usuarios: { f: () => pgUsuarios(), permiso: 'usuario:gestionar' }
};
async function cargarReglas() { const r = await Api.get('/reglas'); Estado.reglas = r.reglas; Estado.reglasVersion = r.version; }
function menu() {
  const u = Estado.usuario, items = [['#/', 'Inicio']];
  if (can('predio:listar')) items.push(['#/predios', u.rol === 'productor' ? 'Mis predios' : 'Predios']);
  if (can('regla:ver')) items.push(['#/reglas', 'Reglas']);
  if (can('usuario:gestionar')) items.push(['#/usuarios', 'Usuarios']);
  const top = document.getElementById('top'); top.hidden = false;
  top.innerHTML = `<div class="marca">🦆 Bienestar animal · ICA 2024</div><nav class="menu">${items.map(i => `<a href="${i[0]}">${i[1]}</a>`).join('')}</nav><div class="usr"><span>${esc(u.nombre)}</span><span class="chip rol">${ROLES[u.rol]}</span><button class="salir" data-act="logout">Salir</button></div>`;
}
async function pantallaLogin(mensaje) {
  Estado.usuario = null; Estado.permisos = []; document.getElementById('top').hidden = true; ED = null;
  let demo = false; try { demo = (await Api.get('/auth/config')).demo; } catch (e) { /* sin servidor */ }
  document.getElementById('app').innerHTML = `<div class="login card"><h1>🦆 Bienestar animal en patos y gansos</h1><p class="suave">Sistema experto · metodología del ICA 2024</p>${mensaje ? `<p class="err">${esc(mensaje)}</p>` : ''}<form id="loginform"><label>Correo<input name="email" type="email" autocomplete="username" required autofocus></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label><p class="err" id="loginerr"></p><button class="prim" type="submit">Entrar</button></form>${demo ? `<div class="demo"><b>Usuarios de demostración</b> (contraseña <code>Demo1234</code>)<br><a href="#" data-demo="evaluador@demo.co">Evaluador</a> · <a href="#" data-demo="productor@demo.co">Productor</a> · <a href="#" data-demo="admin@demo.co">Administrador</a></div>` : ''}</div>`;
}
async function entrar(datos) { Estado.usuario = datos.usuario; Estado.permisos = datos.permisos; await cargarReglas(); menu(); }
async function render() {
  const app = document.getElementById('app');
  if (!Estado.usuario) return;
  const h = location.hash.replace(/^#\/?/, ''), [pg, a, b] = h.split('/'), clave = pg || 'inicio', P = PAGINAS[clave];
  let html;
  try {
    if (!P) html = '<div class="card err">Página no encontrada.</div>';
    else if (P.permiso && !can(P.permiso)) html = `<div class="card err"><b>No tiene acceso a esta sección.</b> Su rol (${ROLES[Estado.usuario.rol]}) no incluye este permiso.</div>`;
    else html = await P.f(a, b);
  } catch (e) { if (e.status === 401) return; html = `<div class="card err"><b>${e.status === 404 ? 'No encontrado' : 'Error'}:</b> ${esc(e.message)}</div>`; if (window.console && e.status !== 404 && e.status !== 403) console.error(e); }
  if (clave !== 'editar') ED = null;
  if (!Estado.usuario) return;
  app.innerHTML = html;
  const activo = ['predio', 'eval', 'editar', 'informe'].includes(clave) ? 'predios' : clave;
  document.querySelectorAll('nav.menu a').forEach(l => l.classList.toggle('act', l.getAttribute('href') === '#/' + (activo === 'inicio' ? '' : activo)));
  if (clave === 'editar' && ED) refrescarEd();
  if (!/^(editar|predios)$/.test(clave) && window.scrollTo) window.scrollTo(0, 0);
}
const A = {
  'cerrar-dlg': () => cerrarDlg(),
  'logout': async () => { try { await Api.post('/auth/logout'); } catch (e) { /* ya cerrada */ } location.hash = '#/'; await pantallaLogin(); },
  'form-predio': el => formPredio(el.dataset.id ? +el.dataset.id : null),
  'toggle-predio': async el => { await Api.post(`/predios/${el.dataset.id}/estado`); aviso('Estado del predio actualizado.'); render(); },
  'borrar-predio': el => confirmar('Eliminar predio', 'Se eliminará el predio (no tiene evaluaciones). Esta acción no se puede deshacer.', async () => { await Api.del('/predios/' + el.dataset.id); aviso('Predio eliminado.'); location.hash = '#/predios'; return true; }, 'Eliminar'),
  'nueva-eval': async el => { const e = await Api.post(`/predios/${el.dataset.pid}/evaluaciones`); location.hash = '#/editar/' + e.id; },
  'borrar-borrador': el => confirmar('Eliminar borrador', 'Se eliminará este borrador de evaluación.', async () => { await Api.del('/evaluaciones/' + el.dataset.id); aviso('Borrador eliminado.'); render(); return true; }, 'Eliminar'),
  'anular': el => pedirMotivo('Anular evaluación', 'La evaluación quedará solo para consulta y no entrará en la evolución del predio.', async m => { await Api.post(`/evaluaciones/${el.dataset.id}/anular`, { motivo: m }); aviso('Evaluación anulada.'); render(); return true; }),
  'ed-guardar': async () => { const e = fechaValida(); if (e) return aviso(e, 'err'); await Api.put(`/evaluaciones/${ED.id}/borrador`, cuerpoEd()); aviso('Borrador guardado.'); },
  'ed-cerrar': async () => {
    const e = fechaValida(); if (e) return aviso(e, 'err');
    try { await Api.post(`/evaluaciones/${ED.id}/cerrar`, cuerpoEd()); } catch (x) { if (x.status === 422) return aviso('Faltan indicadores por evaluar: ' + [].concat(x.detalle || []).join(', '), 'err'); throw x; }
    aviso('Evaluación calculada y cerrada.'); location.hash = '#/eval/' + ED.id;
  },
  'ed-corregir': () => {
    const e = fechaValida(); if (e) return aviso(e, 'err');
    if (JSON.stringify(ED.draft.obs) === JSON.stringify(ED.orig.obs) && ED.draft.fecha === ED.orig.fecha && ED.draft.notas === ED.orig.notas) return aviso('No hay cambios para guardar.', 'err');
    pedirMotivo('Motivo de la corrección', 'Toda corrección de una evaluación cerrada queda registrada con su motivo.', async m => {
      try { const r = await Api.post(`/evaluaciones/${ED.id}/corregir`, { ...cuerpoEd(), motivo: m }); aviso('Corrección guardada: versión ' + r.evaluacion.version + '.'); location.hash = '#/eval/' + ED.id; return true; }
      catch (x) { if (x.status === 422) return 'Faltan indicadores por evaluar: ' + [].concat(x.detalle || []).join(', '); throw x; }
    });
  },
  'ed-cancelar': () => { location.hash = ED.cerrada ? '#/eval/' + ED.id : '#/predio/' + ED.predioId; },
  'imprimir': () => window.print(),
  'csv': () => { const [n, t] = csvInforme(); descargar(n, t); },
  'form-usuario': el => formUsuario(el.dataset.id ? +el.dataset.id : null),
  'editar-regla': el => editarRegla(el.dataset.id),
  'editar-params': () => editarParametros()
};
document.addEventListener('click', async e => {
  const d = e.target.closest('[data-demo]'); if (d) { e.preventDefault(); const f = document.getElementById('loginform'); f.elements.email.value = d.dataset.demo; f.elements.password.value = 'Demo1234'; return; }
  const el = e.target.closest('[data-act]'); if (!el || !A[el.dataset.act]) return; e.preventDefault();
  try { await A[el.dataset.act](el, e); } catch (x) { if (x.status !== 401) aviso(x.message, 'err'); }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'loginform') return; e.preventDefault();
  const f = e.target;
  try { const r = await Api.post('/auth/login', { email: f.elements.email.value, password: f.elements.password.value }); await entrar(r); location.hash = '#/'; await render(); }
  catch (x) { document.getElementById('loginerr').textContent = x.message; }
});
document.addEventListener('input', e => {
  if (e.target.id === 'f-q') { FILT.q = e.target.value; document.getElementById('lista-predios').innerHTML = tablaPredios(); }
  else if (e.target.closest && e.target.closest('#edform')) alCambiarEditor(e);
});
document.addEventListener('change', e => {
  if (e.target.id === 'f-esp') { FILT.esp = e.target.value; document.getElementById('lista-predios').innerHTML = tablaPredios(); }
  else if (e.target.id === 'f-est') { FILT.est = e.target.value; document.getElementById('lista-predios').innerHTML = tablaPredios(); }
  else if (e.target.closest && e.target.closest('#edform')) alCambiarEditor(e);
});
document.addEventListener('sesion-vencida', () => pantallaLogin('Su sesión terminó. Inicie sesión de nuevo.'));
window.addEventListener('hashchange', render);
(async () => {
  try { const r = await Api.get('/auth/yo'); await entrar(r); await render(); } catch (e) { await pantallaLogin(); }
})();
