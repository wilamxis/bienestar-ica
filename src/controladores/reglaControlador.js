module.exports = reglas => ({
  actual: async (_req, res) => { const a = await reglas.actual(); res.json({ version: a.version, creada: a.creada, creadoPor: a.creadoPor, motivo: a.motivo, reglas: a.reglas }); },
  version: async (req, res) => { const r = await reglas.porVersion(+req.params.v); if (!r) return res.status(404).json({ error: 'Esa versión de reglas no existe.' }); res.json({ version: r.version, creada: r.creada, creadoPor: r.creadoPor, motivo: r.motivo, reglas: r.reglas }); },
  versiones: async (_req, res) => res.json(await reglas.versiones()),
  indicador: async (req, res) => res.json({ version: await reglas.actualizarIndicador(req.usuario, req.params.id, req.body.cambios, req.body.motivo) }),
  parametros: async (req, res) => res.json({ version: await reglas.actualizarParametros(req.usuario, req.body.cambios, req.body.motivo) })
});
