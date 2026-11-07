const { invalido, noEncontrado } = require('../errores'), { ROLES } = require('../permisos');
module.exports = (repos, auth) => ({
  listar: async rol => repos.usuarios.listar(rol).map(auth.publico),
  crear: async datos => auth.crearUsuario(datos, ROLES),
  async actualizar(admin, id, c) {
    const u = repos.usuarios.porId(id); if (!u) throw noEncontrado('El usuario no existe.');
    const cambios = {};
    if (c.nombre !== undefined) { if (!String(c.nombre).trim()) throw invalido('El nombre no puede quedar vacío.'); cambios.nombre = String(c.nombre).trim(); }
    if (c.rol !== undefined) { if (!ROLES.includes(c.rol)) throw invalido('El rol no es válido.'); cambios.rol = c.rol; }
    if (c.activo !== undefined) cambios.activo = !!c.activo;
    if (c.password !== undefined) { if (!auth.claveOk(c.password)) throw invalido('La contraseña debe tener al menos 8 caracteres, con letras y números.'); cambios.hash = auth.hashPassword(c.password); }
    const pierdeAdmin = u.rol === 'administrador' && ((cambios.rol && cambios.rol !== 'administrador') || cambios.activo === false);
    if (pierdeAdmin && repos.usuarios.listar('administrador').filter(x => x.activo).length <= 1) throw invalido('Debe quedar al menos un administrador activo.');
    if (u.id === admin.id && (cambios.activo === false)) throw invalido('No puede desactivar su propio usuario.');
    const r = repos.usuarios.actualizar(id, cambios);
    if (cambios.activo === false || cambios.hash || cambios.rol) repos.sesiones.borrarDeUsuario(id);   // cierra sus sesiones
    return auth.publico(r);
  }
});
