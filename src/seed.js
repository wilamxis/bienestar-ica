// Datos iniciales. Modo demostración: 3 usuarios (uno por rol) y 4 predios de ejemplo con histórico.
const Motor = require('./dominio/motor');
const CLAVE_DEMO = 'Demo1234';
async function sembrarAdmin({ repos, servicios }, { email, password, nombre = 'Administrador' }) {
  return servicios.usuarios.crear({ nombre, email, password, rol: 'administrador' });
}
async function sembrarDemo({ repos, servicios }) {
  const adm = await servicios.usuarios.crear({ nombre: 'Ana Administradora', email: 'admin@demo.co', password: CLAVE_DEMO, rol: 'administrador' });
  const eva = await servicios.usuarios.crear({ nombre: 'Elena Evaluadora', email: 'evaluador@demo.co', password: CLAVE_DEMO, rol: 'evaluador' });
  const pro = await servicios.usuarios.crear({ nombre: 'Pablo Productor', email: 'productor@demo.co', password: CLAVE_DEMO, rol: 'productor' });
  const pro2 = await servicios.usuarios.crear({ nombre: 'Paula Productora', email: 'productora2@demo.co', password: CLAVE_DEMO, rol: 'productor' });
  const { reglas, version } = await servicios.reglas.actual();
  const mk = async (d, dueno) => servicios.predios.crear(eva, { ...d, duenoId: dueno.id });
  const ev = (p, fecha, obj, estado = 'cerrada') => {
    const obs = Motor.obsEjemplo(reglas, p, obj), r = estado === 'cerrada' ? Motor.evaluar(reglas, p, obs) : null;
    repos.evaluaciones.crear({ predioId: p.id, fecha, estado, evaluadorId: eva.id, notas: 'Dato ilustrativo', obs, resultado: r, reglaVersion: version, creada: fecha + 'T08:00:00.000Z', cerradaEn: estado === 'cerrada' ? fecha + 'T09:00:00.000Z' : null });
  };
  const a = await mk({ codigo: 'P-001', nombre: 'Granja El Estanque', ubicacion: 'Cundinamarca', especie: 'pato', proposito: 'carne', sistema: 'intensivo', nAves: 1200, areaM2: 12000, corral: true, cama: true }, pro);
  [['2025-03-14', { MBA: 62, MBR: 60, MBG: 40 }], ['2025-10-09', { MBA: 70, MBR: 65, MBG: 50 }], ['2026-04-22', { MBA: 75, MBR: 68, MBG: 55 }], ['2026-09-18', { MBA: 78, MBR: 70, MBG: 55 }]].forEach(x => ev(a, x[0], x[1]));
  const b = await mk({ codigo: 'P-002', nombre: 'Finca Los Gansos', ubicacion: 'Boyacá', especie: 'ganso', proposito: 'carne', sistema: 'semi', nAves: 500, areaM2: 8000, corral: true, cama: false }, pro);
  ev(b, '2026-02-10', { MBA: 70, MBR: 72, MBG: 60 }); ev(b, '2026-08-05', { MBA: 88, MBR: 90, MBG: 85 }); ev(b, new Date().toISOString().slice(0, 10), { MBA: 90, MBR: 80 }, 'borrador');
  const c = await mk({ codigo: 'P-003', nombre: 'Traspatio Doña Rosa', ubicacion: 'Tolima', especie: 'pato', proposito: 'huevo', sistema: 'extensivo', nAves: 40, areaM2: 600, corral: false, cama: false }, pro2);
  ev(c, '2026-06-20', { MBA: 55, MBR: 45 });
  const d = await mk({ codigo: 'P-004', nombre: 'Patos del Río', ubicacion: 'Meta', especie: 'pato', proposito: 'huevo', sistema: 'semi', nAves: 220, areaM2: 3500, corral: true, cama: true }, pro2);
  ev(d, '2026-07-12', { MBA: 40, MBR: 50, MBG: 20 });
  return { adm, eva, pro, pro2 };
}
module.exports = { CLAVE_DEMO, sembrarAdmin, sembrarDemo };
