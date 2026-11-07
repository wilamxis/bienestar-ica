const { NOMBRE_COOKIE } = require('../middleware/seguridad'), { permisosDe } = require('../permisos');
module.exports = (auth, { produccion }) => ({
  async login(req, res) {
    const r = await auth.login(req.body.email, req.body.password);
    res.cookie(NOMBRE_COOKIE, r.token, { httpOnly: true, sameSite: 'lax', secure: produccion, maxAge: r.ttlMs, path: '/' });
    res.json({ usuario: r.usuario, permisos: permisosDe(r.usuario.rol) });
  },
  async logout(req, res) { await auth.logout(req.cookies[NOMBRE_COOKIE]); res.clearCookie(NOMBRE_COOKIE, { path: '/' }); res.json({ ok: true }); },
  yo: (req, res) => res.json({ usuario: req.usuario, permisos: permisosDe(req.usuario.rol) }),
  config: (req, res) => res.json({ demo: !!req.app.locals.demo })
});
