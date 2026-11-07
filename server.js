const { crearApp } = require('./src/app'), seed = require('./src/seed');
(async () => {
  const produccion = process.env.NODE_ENV === 'production';
  const ctx = await crearApp();
  const vacia = ctx.repos.usuarios.listar().length === 0;
  const quiereDemo = process.env.DEMO === '1';              // DEMO=1: usuarios y datos de ejemplo (solo para presentaciones)
  const hayAdmin = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  if (vacia) {
    if (quiereDemo || (!produccion && !hayAdmin)) { await seed.sembrarDemo(ctx); console.log('\nModo demostración: usuarios admin@demo.co, evaluador@demo.co y productor@demo.co (contraseña', seed.CLAVE_DEMO + ')\n'); }
    if (hayAdmin) { await seed.sembrarAdmin(ctx, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }); console.log('Administrador creado:', process.env.ADMIN_EMAIL); }
    if (!ctx.repos.usuarios.listar().length) { console.error('Base vacía: defina ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador.'); process.exit(1); }
  }
  // la ayuda con los usuarios de demostración solo se muestra si esos usuarios existen y el modo demo está permitido
  ctx.app.locals.demo = (quiereDemo || !produccion) && !!ctx.repos.usuarios.porEmail('evaluador@demo.co');
  if (produccion && ctx.app.locals.demo) console.warn('AVISO: modo demostración activo en producción; las contraseñas de los usuarios de ejemplo son públicas.');
  const puerto = process.env.PORT || 3000;
  const servidor = require('http').createServer(ctx.app).listen(puerto, '0.0.0.0', () => console.log('Sistema experto de bienestar animal en el puerto ' + puerto));
  const apagar = () => servidor.close(() => { try { ctx.cerrar(); } catch (e) { /* ya cerrada */ } process.exit(0); });
  process.on('SIGTERM', apagar); process.on('SIGINT', apagar);
})();
