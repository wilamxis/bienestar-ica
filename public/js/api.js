// Cliente de la API REST. Es el único lugar de la vista que conoce las rutas del servidor.
const Api = (() => {
  async function f(metodo, url, cuerpo) {
    let r;
    try { r = await fetch('/api' + url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), credentials: 'same-origin' }); }
    catch (e) { throw new Error('No hay conexión con el servidor.'); }
    let j = null; try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) {
      const err = new Error((j && j.error) || 'Error ' + r.status); err.status = r.status; err.detalle = j && j.detalle;
      if (r.status === 401 && !url.startsWith('/auth/login')) document.dispatchEvent(new Event('sesion-vencida'));
      throw err;
    }
    return j;
  }
  return { get: u => f('GET', u), post: (u, b) => f('POST', u, b || {}), put: (u, b) => f('PUT', u, b), patch: (u, b) => f('PATCH', u, b), del: u => f('DELETE', u) };
})();
