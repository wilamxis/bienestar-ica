module.exports = (usuarios, tablero) => ({
  listar: async (_req, res) => res.json(await usuarios.listar()),
  crear: async (req, res) => res.status(201).json(await usuarios.crear(req.body)),
  actualizar: async (req, res) => res.json(await usuarios.actualizar(req.usuario, +req.params.id, req.body)),
  productores: async (_req, res) => res.json((await usuarios.listar('productor')).filter(u => u.activo).map(u => ({ id: u.id, nombre: u.nombre }))),
  tablero: async (req, res) => res.json(await tablero.resumen(req.usuario))
});
