module.exports = (predios, evaluaciones) => ({
  listar: async (req, res) => res.json(await predios.listar(req.usuario)),
  obtener: async (req, res) => res.json(await predios.obtener(req.usuario, +req.params.id)),
  crear: async (req, res) => res.status(201).json(await predios.crear(req.usuario, req.body)),
  editar: async (req, res) => res.json(await predios.editar(req.usuario, +req.params.id, req.body)),
  estado: async (req, res) => res.json(await predios.cambiarEstado(req.usuario, +req.params.id)),
  eliminar: async (req, res) => { await predios.eliminar(req.usuario, +req.params.id); res.json({ ok: true }); },
  cambios: async (req, res) => res.json(await predios.cambios(req.usuario, +req.params.id)),
  evaluaciones: async (req, res) => res.json(await evaluaciones.listarDePredio(req.usuario, +req.params.id)),
  nuevaEvaluacion: async (req, res) => res.status(201).json(await evaluaciones.crear(req.usuario, +req.params.id))
});
