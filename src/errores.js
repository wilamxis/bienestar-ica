class ErrorApp extends Error { constructor(status, mensaje, detalle) { super(mensaje); this.status = status; this.detalle = detalle; } }
module.exports = { ErrorApp, noEncontrado: (m = 'No encontrado') => new ErrorApp(404, m), prohibido: (m = 'No tiene permiso para esta acción') => new ErrorApp(403, m), invalido: (m, d) => new ErrorApp(400, m, d) };
