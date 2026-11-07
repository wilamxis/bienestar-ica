// Control de acceso basado en roles (RBAC): qué acciones puede hacer cada rol. Se verifica SIEMPRE en el servidor.
const MATRIZ = {
  evaluador: ['predio:listar', 'predio:ver', 'predio:crear', 'predio:editar', 'predio:estado', 'predio:eliminar', 'evaluacion:ver', 'evaluacion:crear', 'evaluacion:editar', 'evaluacion:cerrar', 'evaluacion:corregir', 'evaluacion:anular', 'evaluacion:eliminar', 'cambios:ver', 'informe:ver', 'regla:ver', 'usuario:listar-productores'],
  productor: ['predio:listar', 'predio:ver', 'evaluacion:ver', 'informe:ver', 'regla:ver'],
  administrador: ['regla:ver', 'regla:editar', 'usuario:gestionar', 'usuario:listar-productores']
};
const ROLES = Object.keys(MATRIZ);
const puede = (rol, accion) => !!(MATRIZ[rol] && MATRIZ[rol].includes(accion));
module.exports = { MATRIZ, ROLES, puede, permisosDe: rol => MATRIZ[rol] || [] };
