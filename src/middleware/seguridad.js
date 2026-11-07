const { ErrorApp } = require('../errores'), { puede } = require('../permisos');
const NOMBRE_COOKIE = 'sid';
function cookies(req, _res, next) { req.cookies = {}; String(req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) req.cookies[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); next(); }
function cabeceras(req, res, next) {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Cache-Control': req.path.startsWith('/api') ? 'no-store' : 'no-cache',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'" }); next();
}
// Protección CSRF básica: las peticiones que modifican datos deben venir del mismo origen
function mismoOrigen(req, _res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) { const o = req.headers.origin; if (o && new URL(o).host !== req.headers.host) return next(new ErrorApp(403, 'Origen no permitido.')); }
  next();
}
const autenticar = auth => async (req, _res, next) => {
  try { const u = await auth.usuarioDeToken(req.cookies[NOMBRE_COOKIE]); if (!u) throw new ErrorApp(401, 'Debe iniciar sesión.'); req.usuario = u; next(); } catch (e) { next(e); }
};
const requiere = accion => (req, _res, next) => (puede(req.usuario.rol, accion) ? next() : next(new ErrorApp(403, 'No tiene permiso para esta acción.')));
function errores(err, _req, res, _next) {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : err.message, detalle: err.detalle });
}
module.exports = { NOMBRE_COOKIE, cookies, cabeceras, mismoOrigen, autenticar, requiere, errores };
