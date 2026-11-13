// Composición de la aplicación: aquí se "enchufan" las capas (BD → repositorios → servicios → controladores → rutas).
const express = require('express'), path = require('path');
const { abrir } = require('./db/conexion'), { crearRepositorios } = require('./db/repositorios');
const seg = require('./middleware/seguridad');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function crearApp({ dbPath = process.env.DB_PATH || path.join(__dirname, '../data/bienestar.db'), databaseUrl = process.env.DATABASE_URL, reiniciar = false, produccion = process.env.NODE_ENV === 'production', demo = false } = {}) {
  // Con DATABASE_URL se usa PostgreSQL (datos permanentes en la nube); si no, SQLite local
  let repos, cerrarBd;
  if (databaseUrl) { const pg = await require('./db/conexionPg').abrir(databaseUrl, { reiniciar }); repos = pg.repos; cerrarBd = pg.cerrar; }
  else { const db = abrir(dbPath); repos = crearRepositorios(db); cerrarBd = () => db.close(); }
  const reglas = require('./servicios/reglaService')(repos), auth = require('./servicios/authService')(repos);
  const predios = require('./servicios/predioService')(repos), evaluaciones = require('./servicios/evaluacionService')(repos, reglas, predios);
  const usuarios = require('./servicios/usuarioService')(repos, auth), tablero = require('./servicios/tableroService')(repos, predios);
  await reglas.inicializar();
  const C = { auth: require('./controladores/authControlador')(auth, { produccion, demo }), predio: require('./controladores/predioControlador')(predios, evaluaciones), ev: require('./controladores/evaluacionControlador')(evaluaciones), regla: require('./controladores/reglaControlador')(reglas), usu: require('./controladores/usuarioControlador')(usuarios, tablero) };

  const app = express(); app.disable('x-powered-by');
  if (produccion) app.set('trust proxy', 1);   // detrás del proxy del proveedor (HTTPS)
  app.get('/salud', async (_req, res) => { try { await repos.reglas.actual(); res.json({ ok: true }); } catch (e) { res.status(503).json({ ok: false }); } });   // chequeo de salud para el hosting
  app.use(seg.cabeceras, express.json({ limit: '1mb' }), seg.cookies, seg.mismoOrigen);
  const api = express.Router(), A = seg.autenticar(auth), R = seg.requiere;
  api.get('/auth/config', C.auth.config); api.post('/auth/login', wrap(C.auth.login)); api.post('/auth/logout', wrap(C.auth.logout)); api.get('/auth/yo', A, C.auth.yo);
  api.get('/tablero', A, wrap(C.usu.tablero));
  api.get('/predios', A, R('predio:listar'), wrap(C.predio.listar)); api.post('/predios', A, R('predio:crear'), wrap(C.predio.crear));
  api.get('/predios/:id', A, R('predio:ver'), wrap(C.predio.obtener)); api.patch('/predios/:id', A, R('predio:editar'), wrap(C.predio.editar));
  api.post('/predios/:id/estado', A, R('predio:estado'), wrap(C.predio.estado)); api.delete('/predios/:id', A, R('predio:eliminar'), wrap(C.predio.eliminar));
  api.get('/predios/:id/cambios', A, R('cambios:ver'), wrap(C.predio.cambios));
  api.get('/predios/:id/evaluaciones', A, R('evaluacion:ver'), wrap(C.predio.evaluaciones)); api.post('/predios/:id/evaluaciones', A, R('evaluacion:crear'), wrap(C.predio.nuevaEvaluacion));
  api.get('/evaluaciones/:id', A, R('evaluacion:ver'), wrap(C.ev.obtener)); api.put('/evaluaciones/:id/borrador', A, R('evaluacion:editar'), wrap(C.ev.guardar));
  api.post('/evaluaciones/:id/cerrar', A, R('evaluacion:cerrar'), wrap(C.ev.cerrar)); api.post('/evaluaciones/:id/corregir', A, R('evaluacion:corregir'), wrap(C.ev.corregir));
  api.post('/evaluaciones/:id/anular', A, R('evaluacion:anular'), wrap(C.ev.anular)); api.delete('/evaluaciones/:id', A, R('evaluacion:eliminar'), wrap(C.ev.eliminar));
  api.get('/reglas', A, R('regla:ver'), wrap(C.regla.actual)); api.get('/reglas/versiones', A, R('regla:ver'), wrap(C.regla.versiones)); api.get('/reglas/versiones/:v', A, R('regla:ver'), wrap(C.regla.version));
  api.patch('/reglas/indicadores/:id', A, R('regla:editar'), wrap(C.regla.indicador)); api.patch('/reglas/parametros', A, R('regla:editar'), wrap(C.regla.parametros));
  api.get('/productores', A, R('usuario:listar-productores'), wrap(C.usu.productores));
  api.get('/usuarios', A, R('usuario:gestionar'), wrap(C.usu.listar)); api.post('/usuarios', A, R('usuario:gestionar'), wrap(C.usu.crear)); api.patch('/usuarios/:id', A, R('usuario:gestionar'), wrap(C.usu.actualizar));
  api.use((_req, _res, next) => next(new (require('./errores').ErrorApp)(404, 'Ruta no encontrada.')));
  app.use('/api', api);
  app.get('/js/motor.js', (_req, res) => res.type('js').sendFile(path.join(__dirname, 'dominio/motor.js')));   // el MISMO motor corre en el navegador (vista previa)
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(seg.errores);
  return { app, repos, servicios: { reglas, auth, predios, evaluaciones, usuarios, tablero }, motorBd: databaseUrl ? 'PostgreSQL' : 'SQLite', cerrar: cerrarBd };
}
module.exports = { crearApp };
