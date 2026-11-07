module.exports = (repos, prediosSrv) => ({
  async resumen(u) {
    if (u.rol === 'administrador') { const act = repos.reglas.actual(); const por = {}; repos.usuarios.contarPorRol().forEach(r => { por[r.rol] = r.n; }); return { tipo: 'administrador', usuariosPorRol: por, reglasVersion: act.version, reglasFecha: act.creada }; }
    const ps = await prediosSrv.listar(u), activos = ps.filter(p => p.estado === 'activo');
    const cat = { Excelente: 0, Alto: 0, Medio: 0, Bajo: 0 }; activos.forEach(p => { if (p.ultima) cat[p.ultima.categoria]++; });
    const evs = repos.evaluaciones.deLosPredios(ps.map(p => p.id)).filter(e => u.rol !== 'productor' || e.estado === 'cerrada');
    const rec = evs.filter(e => e.estado === 'cerrada').sort((a, b) => (b.cerradaEn || '').localeCompare(a.cerradaEn || '')).slice(0, 5).map(e => ({ id: e.id, fecha: e.fecha, predioId: e.predioId, codigo: (ps.find(p => p.id === e.predioId) || {}).codigo, final: e.resultado.final, categoria: e.resultado.categoria }));
    return { tipo: u.rol, activos: activos.length, cerradas: evs.filter(e => e.estado === 'cerrada').length, borradores: evs.filter(e => e.estado === 'borrador').length, sinEvaluar: activos.filter(p => !p.nEvaluaciones).length, categorias: cat, recientes: rec };
  }
});
