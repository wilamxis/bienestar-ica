module.exports = ev => ({
  obtener: async (req, res) => res.json(await ev.obtener(req.usuario, +req.params.id)),
  guardar: async (req, res) => res.json(await ev.guardarBorrador(req.usuario, +req.params.id, req.body)),
  cerrar: async (req, res) => res.json(await ev.cerrar(req.usuario, +req.params.id, req.body)),
  corregir: async (req, res) => res.json(await ev.corregir(req.usuario, +req.params.id, req.body)),
  anular: async (req, res) => res.json(await ev.anular(req.usuario, +req.params.id, req.body)),
  eliminar: async (req, res) => { await ev.eliminarBorrador(req.usuario, +req.params.id); res.json({ ok: true }); }
});
