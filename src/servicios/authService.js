const crypto = require('crypto'), { ErrorApp, invalido } = require('../errores');
const TTL_HORAS = 8, MAX_INTENTOS = 5, VENTANA_MS = 15 * 60 * 1000;
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
function hashPassword(pw) { const sal = crypto.randomBytes(16); return 'scrypt$' + sal.toString('hex') + '$' + crypto.scryptSync(pw, sal, 64).toString('hex'); }
function verificar(pw, guardado) { const [alg, sal, h] = String(guardado).split('$'); if (alg !== 'scrypt') return false; const x = crypto.scryptSync(pw, Buffer.from(sal, 'hex'), 64), y = Buffer.from(h, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); }
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const claveOk = p => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
module.exports = repos => {
  const intentos = new Map();   // limitador sencillo de intentos fallidos por correo
  const bloqueado = k => { const r = intentos.get(k); return r && r.n >= MAX_INTENTOS && Date.now() - r.t < VENTANA_MS; };
  async function login(email, password) {
    const k = String(email || '').toLowerCase().trim();
    if (bloqueado(k)) throw new ErrorApp(429, 'Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.');
    const u = repos.usuarios.porEmail(k);
    if (!u || !u.activo || !verificar(String(password || ''), u._hash)) { const r = intentos.get(k) || { n: 0, t: Date.now() }; r.n++; r.t = Date.now(); intentos.set(k, r); throw new ErrorApp(401, 'Correo o contraseña incorrectos.'); }
    intentos.delete(k); repos.sesiones.limpiar();
    const token = crypto.randomBytes(32).toString('hex');
    repos.sesiones.crear(sha(token), u.id, new Date(Date.now() + TTL_HORAS * 3600 * 1000).toISOString());
    return { token, ttlMs: TTL_HORAS * 3600 * 1000, usuario: publico(u) };
  }
  const publico = u => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo });
  async function usuarioDeToken(token) {
    if (!token) return null; const s = repos.sesiones.usuarioDe(sha(token));
    if (!s || !s.usuario.activo || s.expira < new Date().toISOString()) { if (s) repos.sesiones.borrar(sha(token)); return null; }
    return publico(s.usuario);
  }
  async function logout(token) { if (token) repos.sesiones.borrar(sha(token)); }
  async function crearUsuario({ nombre, email, password, rol }, roles) {
    nombre = String(nombre || '').trim(); email = String(email || '').toLowerCase().trim();
    if (!nombre) throw invalido('El nombre es obligatorio.'); if (!emailOk(email)) throw invalido('El correo no es válido.');
    if (!roles.includes(rol)) throw invalido('El rol no es válido.'); if (!claveOk(password)) throw invalido('La contraseña debe tener al menos 8 caracteres, con letras y números.');
    if (repos.usuarios.porEmail(email)) throw invalido('Ya existe un usuario con ese correo.');
    return publico(repos.usuarios.crear({ nombre, email, hash: hashPassword(password), rol }));
  }
  return { login, logout, usuarioDeToken, crearUsuario, hashPassword, claveOk, publico };
};
