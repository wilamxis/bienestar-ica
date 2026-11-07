// ===== MOTOR DE REGLAS (ICA 2024 v1.0) · funciones puras, sin DOM =====
const REGLAS = {
  version: 'ICA 2024 v1.0 · MVP 0.1',
  pesos: { grande: { MBA: 60, MBR: 25, MBG: 15 }, traspatio: { MBA: 70, MBR: 30, MBG: 0 } },
  umbrales: [[90, 'Excelente'], [75, 'Alto'], [50, 'Medio'], [0, 'Bajo']],
  zonaSensible: 3
};
const GRUPOS = { MBA: 'Basadas en el animal', MBR: 'Basadas en los recursos', MBG: 'Basadas en la gestión' };

const N3 = (a, b, c) => [[100, a], [55, b], [0, c]];
const N2 = (a, b) => [[100, a], [0, b]];
const IND = [];
const nivel = (id, sp, g, n, ops, x = {}) => IND.push({ id, sp, g, n, t: 'nivel', ops, ...x });
const pct = (id, sp, g, n, esc, f, x = {}) => IND.push({ id, sp, g, n, t: 'pct', esc, f, ...x });

const noCorral = p => (!p.corral ? 'Solo aplica si las aves permanecen en galpón o corral' : null);
const menos200 = p => (p.nAves < 200 ? 'Solo se evalúa en predios de 200 aves o más' : null);

// ---------------- PATOS · recursos (12) ----------------
nivel('p_aloj', 'pato', 'MBR', 'Alojamiento', N3('Alojamiento con refugio y protección, equipado (comederos, bebederos, nidales), limpio, sin humedad y con rampas a las perchas', 'Alojamiento con refugio y protección, pero sin equipamiento, húmedo o con materia fecal acumulada', 'No hay ninguna instalación de alojamiento o refugio'), { ref: 'Tabla 5' });
nivel('p_cama', 'pato', 'MBR', 'Calidad de la cama', N3('El material no se compacta o es granuloso y se desmorona con facilidad', 'El material está ligeramente compactado por humedad', 'Muy compacto por humedad o hay líquido en la mano del evaluador'), { ref: 'Tabla 6', ap: p => (!p.corral || !p.cama ? 'Solo aplica si hay galpón o corral con cama en el piso' : null) });
pct('p_bebint', 'pato', 'MBR', 'Integridad de los bebederos', '% de bebederos que cumplen: altura adecuada, sin derrames, limpios, íntegros y funcionales. ≥ 80 % = 100 · 40 a 79 % = 55 · < 40 % o sin bebederos = 0', v => (v >= 80 ? 100 : v >= 40 ? 55 : 0), { ref: 'Tabla 7', un: '% de bebederos que cumplen' });
nivel('p_bebanim', 'pato', 'MBR', 'Animales por bebedero', N3('Relación adecuada de animales por bebedero; no hay competencia por el agua', 'Se excede la relación recomendada, pero no se evidencia competencia por el agua', 'Se excede la relación en más de 30 % y hay competencia por el agua'), { ref: 'Tabla 8' });
nivel('p_bebagua', 'pato', 'MBR', 'Suministro de agua en los bebederos', N3('Los bebederos tienen agua suficiente; presión y flujo constantes si son automatizados', 'Agua insuficiente, o presión/flujo fluctuante o goteo', 'No hay suministro de agua en los bebederos'), { ref: 'Tabla 9' });
nivel('p_calagua', 'pato', 'MBR', 'Calidad del agua de bebida', N3('Fuentes y tanques limpios y aptos; protocolo de tratamiento implementado con soportes y recursos funcionales', 'Recursos funcionales y registros, pero sin protocolo escrito o incompleto', 'Sin infraestructura o registros, recursos no funcionales o agua sucia'), { ref: 'Tabla 10' });
nivel('p_comcal', 'pato', 'MBR', 'Calidad de los comederos', N3('Altura suficiente para comer cómodamente; comedero íntegro y limpio', 'Altura suficiente, pero comedero no íntegro, deteriorado, sucio o expuesto al sol', 'Altura insuficiente para alimentarse cómodamente'), { ref: 'Tabla 11' });
nivel('p_comanim', 'pato', 'MBR', 'Animales por comedero', N3('Relación adecuada de animales por comedero; no hay competencia por el alimento', 'Se excede la relación recomendada, pero no se evidencia competencia por el alimento', 'Se excede la relación en más de 30 % y hay competencia por el alimento'), { ref: 'Tabla 12' });
nivel('p_termico', 'pato', 'MBR', 'Medios para contribuir al confort térmico', N3('Infraestructura, equipos e insumos existen, son funcionales y están declarados en el POE', 'Existen y son funcionales, pero no están declarados en el POE', 'No existen o no son funcionales'), { ref: 'Tabla 13' });
nivel('p_nidal', 'pato', 'MBR', 'Calidad, integridad y funcionalidad del nidal', N3('Nidales íntegros (individuales o colectivos) y con cama', 'Condiciones no ideales (sin cama, envejecidos, sin aislamiento visual) pero funcionales', 'No hay nidales, o están en mal estado o fracturados'), { ref: 'Tabla 14', ap: p => (p.proposito === 'carne' ? 'El nidal no aplica a patos de carne' : null) });
IND.push({ id: 'p_espacio', sp: 'pato', g: 'MBR', n: 'Espacio disponible (densidad)', t: 'dens', ref: 'Sección 6.1.11', esc: 'La densidad real (kg/m²) no debe superar la permitida para el peso de las aves: 1,5 kg = 17 · 2 = 18 · 2,5 = 20 · 3 = 21 · 3,5 = 22 · 4 = 23 · 4,5 = 24' });
nivel('p_poceta', 'pato', 'MBR', 'Pocetas, estanques o lagos', N3('Espacio para nadar de al menos 10 cm de profundidad, con rampas de entrada y salida y sin encharcamientos', 'Espacio para nadar de al menos 10 cm, pero sin rampas o con encharcamientos', 'No hay un lugar donde los patos puedan nadar'), { ref: 'Tabla 16' });
// ---------------- PATOS · animal (11) ----------------
pct('p_jadeo', 'pato', 'MBA', 'Jadeo', '% de aves con jadeo. ≤ 40 % = 100 · 41 a 60 % = 55 · > 60 % = 0', v => (v <= 40 ? 100 : v <= 60 ? 55 : 0), { ref: 'Tabla 17', un: '% de aves con jadeo', ap: noCorral });
pct('p_amont', 'pato', 'MBA', 'Acurrucarse en grupos (amontonamiento)', '% de aves amontonadas. ≤ 40 % = 100 · 41 a 60 % = 55 · > 60 % = 0', v => (v <= 40 ? 100 : v <= 60 ? 55 : 0), { ref: 'Tabla 18', un: '% de aves amontonadas' });
nivel('p_quilla', 'pato', 'MBA', 'Integridad del hueso de la quilla', N3('Ausente: sin anormalidades en la quilla', 'Leve: indicios de desviación (fractura, callosidad o curvatura)', 'Severa: desviación visible y palpable'), { ref: 'Tabla 19' });
nivel('p_podo', 'pato', 'MBA', 'Podo dermatitis', N3('Ausente: sin inflamación, lesiones ni dolor en la almohadilla o membrana interdigital', 'Leve: heridas o inflamación leve, sin señales de dolor', 'Severa: fibromas o inflamación severa con señales de dolor'), { ref: 'Tabla 20' });
nivel('p_dedos', 'pato', 'MBA', 'Daño en los dedos', N3('Sin anormalidades ni pérdida de integridad en los dedos', 'Heridas, inflamaciones o amputaciones sin señales de dolor', 'Heridas, inflamaciones o amputaciones con señales de dolor'), { ref: 'Tabla 21' });
nivel('p_piel', 'pato', 'MBA', 'Lesiones en piel y otros tegumentos', N3('Sin lesiones, o hasta 2 rasguños o lesiones activas menores de 0,5 cm; sin prolapso', 'Una lesión de 0,5 a 2 cm, o 3 o más rasguños menores de 0,5 cm; sin prolapso', 'Una o más lesiones de 2 cm o más, o prolapso en cloaca'), { ref: 'Tabla 22' });
nivel('p_plumaje', 'pato', 'MBA', 'Suciedad y apariencia del plumaje', N3('Plumaje homogéneo, ordenado y sin áreas desprovistas (sin contar la suciedad de la cloaca)', 'Algunas zonas con plumas quebradas, desordenadas o sin brillo', 'Plumaje no acorde a la raza, erizado o con pérdida de continuidad'), { ref: 'Tabla 23' });
nivel('p_oculo', 'pato', 'MBA', 'Integridad óculo-nasal', N3('Sin descargas, carnosidades ni lesiones en ojos y nariz', 'Hay descarga nasal u ocular (alguna de las dos), sin lesiones', 'Descarga nasal y ocular, carnosidades o lesiones agudas o crónicas'), { ref: 'Tabla 24' });
nivel('p_pico', 'pato', 'MBA', 'Condición del pico', N3('Sin lesiones de ningún tipo', 'Una lesión que no causa dolor ni impide comer o acicalarse', 'Lesiones que causan dolor'), { ref: 'Tabla 25' });
pct('p_mort', 'pato', 'MBA', 'Mortalidad acumulada (últimos 5 ciclos)', 'Supuesto del MVP (la Tabla 26 es contradictoria): ≤ 12 % = 100 · 12 a 14 % = 55 · > 14 % = 0', v => (v <= 12 ? 100 : v <= 14 ? 55 : 0), { ref: 'Tabla 26', un: '% de mortalidad acumulada', ap: menos200 });
IND.push({ id: 'p_cc', sp: 'pato', g: 'MBA', n: 'Condición corporal', t: 'cc', ref: 'Tablas 27 y 28', esc: 'Escala 1 (delgado) a 5 (sobrepeso). Carne: 3 o 4 = 100 · 2 = 55 · 1 o 5 = 0. Huevo: 2 o 3 = 100 · 4 = 55 (supuesto) · 1 o 5 = 0' });
// ---------------- PATOS · gestión (10) ----------------
const G = (id, n, a, b, ref) => nivel(id, 'pato', 'MBG', n, N2(a, b), { ref, doc: true });
G('p_g_agua', 'Calidad del agua de bebida (análisis)', 'Certificado de análisis fisicoquímico y microbiológico vigente (1 año), de laboratorio autorizado, con medidas correctivas si hubo hallazgos', 'Sin análisis, certificado vencido o sin medidas correctivas', 'Tabla 29');
G('p_g_alim', 'Alimentación equilibrada', 'Soporte del alimento acorde a la etapa fisiológica, de una planta registrada ante el ICA', 'Sin documento que demuestre que el alimento es apropiado', 'Tabla 30');
G('p_g_vigil', 'Programas de vigilancia y gestión sanitaria', 'Existe plan o procedimiento para el control y erradicación de enfermedades de control oficial', 'No existe', 'Tabla 31');
G('p_g_poe', 'POE de bienestar animal', 'POE con plan de vacunación, densidades, manejo de enfermos y reducción del dolor, firmado por MV, MVZ o Z con matrícula vigente', 'Sin el contenido mínimo o sin firma profesional', 'Tabla 32');
G('p_g_term', 'Condiciones térmicas diarias y manejo de emergencias', 'Protocolo de emergencias térmicas dentro del POE, elaborado por profesional con matrícula', 'No existe o incumple los requisitos', 'Tabla 33');
G('p_g_ilum', 'Programa de iluminación', 'Programa luz-oscuridad de 24 horas y protocolo ante cambios abruptos, firmado por profesional', 'Sin evidencia documental', 'Tabla 34');
G('p_g_cap', 'Capacitación básica en bienestar animal', 'Todo el personal tiene certificado de curso de bienestar animal (ICA, SENA o entidad autorizada)', 'Sin evidencia o personal sin certificar', 'Tabla 35');
G('p_g_euta', 'Protocolo de sacrificio humanitario o eutanasia', 'Protocolo basado en el título 7 del Código Sanitario de la OMSA, firmado por profesional con matrícula', 'No existe o no cumple', 'Tabla 36');
G('p_g_capeuta', 'Capacitación en técnicas de sacrificio humanitario', 'Personal capacitado, o MV/MVZ con matrícula vigente responsable de la eutanasia', 'Sin evidencia de capacitación', 'Tabla 37');
nivel('p_g_med', 'pato', 'MBG', 'Uso responsable de medicamentos veterinarios', N3('Se cumplen todas las buenas prácticas (BPUMV)', 'Mínimo: registro ICA, prescripción MV/MVZ, registro de tratamientos y sin medicamentos vencidos', 'Medicamentos sin registro ICA, sustancias prohibidas, sin prescripción o sin registros'), { ref: 'Tabla 38', doc: true });
// ---------------- GANSOS · recursos (7) ----------------
nivel('g_alim', 'ganso', 'MBR', 'Suministro de alimento', N3('Alimento en buen estado, dieta balanceada por zootecnista o nutricionista, con registro ICA y buen almacenamiento', 'Sin dieta balanceada por profesional, pero alimento en buenas condiciones y adecuado a la especie', 'Alimento en malas condiciones o inadecuado, sin registro ICA o mal almacenado'), { ref: 'Tabla 40' });
pct('g_agua', 'ganso', 'MBR', 'Suministro y acceso al agua', '% de gansos evaluados con acceso permanente al agua. 100 % = 100 · ≥ 80 % = 55 · < 80 % = 0', v => (v >= 100 ? 100 : v >= 80 ? 55 : 0), { ref: 'Tabla 41', un: '% de gansos con acceso permanente' });
pct('g_comed', 'ganso', 'MBR', 'Estado y limpieza de los comederos', '% de comederos en buen estado, limpios y sin riesgo de lesión. 100 % = 100 · ≥ 80 % = 55 · 60 a 79 % = 20 · < 60 % = 0', v => (v >= 100 ? 100 : v >= 80 ? 55 : v >= 60 ? 20 : 0), { ref: 'Tabla 42', un: '% de comederos en buen estado' });
pct('g_bebed', 'ganso', 'MBR', 'Estado y limpieza de los bebederos', '% de bebederos en buen estado, limpios y sin riesgo de lesión. 100 % = 100 · ≥ 80 % = 55 · 60 a 79 % = 20 · < 60 % = 0', v => (v >= 100 ? 100 : v >= 80 ? 55 : v >= 60 ? 20 : 0), { ref: 'Tabla 43', un: '% de bebederos en buen estado' });
pct('g_limp', 'ganso', 'MBR', 'Limpieza del galpón o potrero', 'Supuesto del MVP (la Tabla 44 está invertida): % de galpones o potreros con elementos de riesgo. 0 % = 100 · < 20 % = 55 · 20 a 40 % = 20 · > 40 % = 0', v => (v <= 0 ? 100 : v < 20 ? 55 : v <= 40 ? 20 : 0), { ref: 'Tabla 44', un: '% de galpones o potreros con elementos de riesgo' });
nivel('g_estanque', 'ganso', 'MBR', 'Presencia de estanques, lagos o espejos de agua', N2('Los gansos tienen acceso permanente a estanques, lagos o espejos de agua', 'No tienen acceso'), { ref: 'Tabla 45' });
nivel('g_protec', 'ganso', 'MBR', 'Protección ante condiciones ambientales', N2('Las instalaciones o refugios protegen del clima y de los depredadores', 'No hay instalaciones o refugios que protejan'), { ref: 'Tabla 46' });
// ---------------- GANSOS · animal (10) ----------------
const trat = (v, x, t) => (v <= 0 ? 100 : v < t ? (x ? 55 : 20) : (x ? 20 : 0));
pct('g_heridas', 'ganso', 'MBA', 'Heridas o lesiones graves o profundas', 'Supuesto del MVP: 0 % = 100 · ≤ 15 % con tratamiento = 55 · ≤ 15 % sin tratar o 16 a 20 % = 20 · > 20 % = 0', (v, x) => (v <= 0 ? 100 : v <= 15 ? (x ? 55 : 20) : v <= 20 ? 20 : 0), { ref: 'Tabla 47', un: '% de gansos con heridas graves o profundas', tr: true });
pct('g_plumaje', 'ganso', 'MBA', 'Apariencia del plumaje', '% de gansos con plumaje inadecuado. 0 % = 100 · ≤ 40 % = 55 · > 40 % = 0', v => (v <= 0 ? 100 : v <= 40 ? 55 : 0), { ref: 'Tabla 48', un: '% de gansos con plumaje inadecuado' });
pct('g_podo', 'ganso', 'MBA', 'Podo dermatitis plantar', '0 % = 100 · < 20 % con tratamiento = 55 · < 20 % sin tratar o ≥ 20 % con tratamiento = 20 · ≥ 20 % sin tratar = 0 (supuesto en los casos no definidos)', (v, x) => trat(v, x, 20), { ref: 'Tabla 49', un: '% de gansos con podo dermatitis', tr: true });
pct('g_diarrea', 'ganso', 'MBA', 'Presencia de diarrea', '0 % = 100 · ≤ 10 % con tratamiento = 55 · > 10 % con tratamiento = 20 · > 10 % sin tratar = 0 (supuesto: ≤ 10 % sin tratar = 20)', (v, x) => (v <= 0 ? 100 : v <= 10 ? (x ? 55 : 20) : (x ? 20 : 0)), { ref: 'Tabla 50', un: '% de gansos con diarrea', tr: true });
pct('g_pico', 'ganso', 'MBA', 'Condición del pico', '% de gansos con lesiones en el pico. 0 % = 100 · ≤ 6 % = 55 · 6 a 8 % = 20 · > 8 % = 0', v => (v <= 0 ? 100 : v <= 6 ? 55 : v <= 8 ? 20 : 0), { ref: 'Tabla 51', un: '% de gansos con lesiones en el pico' });
pct('g_cojos', 'ganso', 'MBA', 'Animales cojos', '% de gansos cojos. < 3 % = 100 · 3 a 6 % = 55 · 6 a 8 % = 20 · > 8 % = 0 (se cierra el hueco 3–4 % de la Tabla 52)', v => (v < 3 ? 100 : v <= 6 ? 55 : v <= 8 ? 20 : 0), { ref: 'Tabla 52', un: '% de gansos cojos' });
pct('g_secrec', 'ganso', 'MBA', 'Secreciones oculares o conjuntivitis', '0 % = 100 · ≤ 10 % con tratamiento = 55 · > 10 % con tratamiento = 20 · > 10 % sin tratar = 0 (supuesto: ≤ 10 % sin tratar = 20)', (v, x) => (v <= 0 ? 100 : v <= 10 ? (x ? 55 : 20) : (x ? 20 : 0)), { ref: 'Tabla 53', un: '% de gansos con secreciones o conjuntivitis', tr: true });
pct('g_agres', 'ganso', 'MBA', 'Agresiones intraespecíficas', '% de gansos agresivos con otros gansos. < 5 % = 100 · 5 a 8 % = 55 · 8 a 10 % = 20 · > 10 % = 0', v => (v < 5 ? 100 : v <= 8 ? 55 : v <= 10 ? 20 : 0), { ref: 'Tabla 54', un: '% de gansos con agresiones' });
pct('g_humano', 'ganso', 'MBA', 'Interacción negativa con el humano', '% de gansos agresivos con el evaluador. < 3 % = 100 · 3 a 6 % = 55 · 6 a 8 % = 20 · > 8 % = 0', v => (v < 3 ? 100 : v <= 6 ? 55 : v <= 8 ? 20 : 0), { ref: 'Tabla 55', un: '% de gansos con conductas agresivas hacia el humano' });
pct('g_posit', 'ganso', 'MBA', 'Valoración de comportamientos positivos', '% de gansos con comportamientos positivos (observar mínimo 5 minutos). ≥ 70 % = 100 · 50 a 69 % = 55 · < 50 % = 0', v => (v >= 70 ? 100 : v >= 50 ? 55 : 0), { ref: 'Tabla 56', un: '% de gansos con comportamientos positivos' });
// ---------------- GANSOS · gestión (8) ----------------
nivel('g_g_conting', 'ganso', 'MBG', 'Plan de contingencia para desastres naturales', [[100, 'Plan escrito e implementado'], [55, 'Plan escrito, pero no implementado'], [20, 'No hay plan escrito, pero se evidencia el conocimiento'], [0, 'No existe plan de contingencia']], { ref: 'Tabla 57', doc: true });
nivel('g_g_sanit', 'ganso', 'MBG', 'Plan sanitario (prevención y diagnóstico)', N2('Plan sanitario firmado por MV o MVZ con matrícula vigente y se implementa', 'No hay evidencia del plan sanitario'), { ref: 'Tabla 58', doc: true });
nivel('g_g_sacreg', 'ganso', 'MBG', 'Plan de sacrificio humanitario (sistema de registro)', N2('Hay procedimiento escrito o registro de los sacrificios (o no se sacrificaron gansos en el último año)', 'No hay procedimiento ni sistema de registro'), { ref: 'Tabla 59', doc: true });
nivel('g_g_ident', 'ganso', 'MBG', 'Identificación de animales', N2('Se identifica con métodos sin daño (brazaletes, nombres, microchip) o no se identifica', 'Se usan tatuajes, hierro caliente o muescas con daño en tejidos'), { ref: 'Tabla 60' });
pct('g_g_capac', 'ganso', 'MBG', 'Capacitación del personal en bienestar animal', '% del personal que certifica su capacitación. > 80 % = 100 · 50 a 80 % = 55 · 20 a 49 % = 20 · < 20 % = 0 (se simplifica la condición de "demuestra conocimiento")', v => (v > 80 ? 100 : v >= 50 ? 55 : v >= 20 ? 20 : 0), { ref: 'Tabla 61', un: '% del personal certificado', doc: true });
nivel('g_g_med', 'ganso', 'MBG', 'Uso responsable de medicamentos e insumos', N2('Se cumplen todas las buenas prácticas de uso de medicamentos veterinarios', 'No se cumplen todas las buenas prácticas'), { ref: 'Tabla 62', doc: true });
IND.push({ id: 'g_g_mort', sp: 'ganso', g: 'MBG', n: 'Mortalidad (últimos dos años)', t: 'mortG', ref: 'Tabla 63', doc: true, esc: '≤ 3 % con registros escritos = 100 · ≤ 3 % sin registros = 55 · 3 a 5 % = 20 · > 5 % o sin información = 0', un: '% de mortalidad acumulada' });
nivel('g_g_prot', 'ganso', 'MBG', 'Protocolo de sacrificio humanitario', N2('Protocolo con método y criterios, firmado por MV/MVZ y acorde con el título 7 de la OMSA', 'No existe, no está firmado o no es acorde con la OMSA'), { ref: 'Tabla 64', doc: true, ap: p => (p.sistema === 'extensivo' ? 'Solo aplica a sistemas intensivo y semi-intensivo' : null) });

const CC_ETQ = { 1: 'Delgado', 2: 'Adecuada', 3: 'Buena (ideal)', 4: 'Musculosa', 5: 'Sobrepeso' };
const DENS = [[1.5, 17], [2, 18], [2.5, 20], [3, 21], [3.5, 22], [4, 23], [4.5, 24]];
function densPerm(peso) {
  if (peso <= DENS[0][0]) return DENS[0][1];
  if (peso >= DENS[DENS.length - 1][0]) return DENS[DENS.length - 1][1];
  for (let i = 1; i < DENS.length; i++) if (peso <= DENS[i][0]) { const [a, b] = DENS[i - 1], [c, d] = DENS[i]; return b + (d - b) * (peso - a) / (c - a); }
}
const ccPts = (n, prop) => (prop === 'huevo' ? ([2, 3].includes(n) ? 100 : n === 4 ? 55 : 0) : ([3, 4].includes(n) ? 100 : n === 2 ? 55 : 0));

const tipoPredio = n => (n >= 200 ? 'grande' : 'traspatio');
const indicadoresDe = sp => IND.filter(i => i.sp === sp);
function noAplica(ind, p) {
  if (ind.g === 'MBG' && tipoPredio(p.nAves) === 'traspatio') return 'La gestión solo se evalúa en predios de 200 aves o más';
  return ind.ap ? ind.ap(p) : null;
}
const num = x => (x === '' || x === null || x === undefined || isNaN(Number(x)) ? null : Number(x));

// puntaje de un indicador: {pts, txt} o null si falta información
function puntaje(ind, o, p) {
  if (!o) return null;
  if (ind.t === 'nivel') { if (o.i === undefined || !ind.ops[o.i]) return null; return { pts: ind.ops[o.i][0], txt: ind.ops[o.i][1] }; }
  if (ind.t === 'pct') { const v = num(o.v); if (v === null || v < 0 || v > 100) return null; return { pts: ind.f(v, !!o.x), txt: `${v} %` + (ind.tr ? (v > 0 ? (o.x ? ' · con evidencia de tratamiento' : ' · sin evidencia de tratamiento') : '') : '') }; }
  if (ind.t === 'mortG') { const v = num(o.v); if (v === null || v < 0 || v > 100) return null; return { pts: v <= 3 ? (o.x ? 100 : 55) : v <= 5 ? 20 : 0, txt: `${v} %` + (o.x ? ' · con registros escritos' : ' · sin registros escritos') }; }
  if (ind.t === 'dens') { const pe = num(o.peso), de = num(o.dens); if (pe === null || de === null || pe <= 0 || de < 0) return null; const perm = densPerm(pe); return { pts: de <= perm ? 100 : 0, txt: `Aves de ${pe} kg: ${de} kg/m² (máximo permitido ${perm.toFixed(1)})` }; }
  if (ind.t === 'cc') { const n = parseInt(o.cc, 10); if (!(n >= 1 && n <= 5)) return null; return { pts: ccPts(n, p.proposito), txt: `Condición corporal ${n} (${CC_ETQ[n]})` }; }
  return null;
}
const categoria = f => REGLAS.umbrales.find(u => f >= u[0])[1];

function evaluar(p, obs) {
  const tipo = tipoPredio(p.nAves), pesos = REGLAS.pesos[tipo];
  const lista = indicadoresDe(p.especie), detalle = [], faltan = [];
  for (const ind of lista) {
    const razon = noAplica(ind, p), o = obs[ind.id];
    const d = { id: ind.id, n: ind.n, g: ind.g, ref: ind.ref };
    if (razon) { d.estado = 'na-auto'; d.motivo = razon; }
    else if (o && o.na) { d.estado = 'na'; d.motivo = 'Marcado como no aplicable por el evaluador'; }
    else { const r = puntaje(ind, o, p); if (r) { d.estado = 'ok'; d.pts = r.pts; d.txt = r.txt; } else { d.estado = 'falta'; faltan.push(ind.id); } }
    detalle.push(d);
  }
  const grupos = {};
  let final = 0, pesoUsado = 0, completa = faltan.length === 0, sinDatos = [];
  for (const g of ['MBA', 'MBR', 'MBG']) {
    const ok = detalle.filter(d => d.g === g && d.estado === 'ok');
    const aplican = detalle.filter(d => d.g === g && (d.estado === 'ok' || d.estado === 'falta')).length;
    const w = pesos[g];
    const prom = ok.length ? ok.reduce((s, d) => s + d.pts, 0) / ok.length : null;
    grupos[g] = { w, n: ok.length, aplican, prom, aporte: prom === null ? 0 : w * prom / 100, perdidos: prom === null ? 0 : w * (100 - prom) / 100 };
    if (w > 0) { if (prom === null) sinDatos.push(g); else { final += grupos[g].aporte; pesoUsado += w; } }
  }
  if (sinDatos.length) completa = false;
  // si es provisional, se reescala sobre los pesos con datos
  const provisional = !completa;
  const finalR = pesoUsado > 0 ? Math.round((provisional ? final * 100 / pesoUsado : final) * 100) / 100 : null;
  const cat = finalR === null ? null : categoria(finalR);
  const mejoras = detalle.filter(d => d.estado === 'ok' && d.pts < 100).map(d => {
    const gr = grupos[d.g]; return { id: d.id, n: d.n, g: d.g, pts: d.pts, ganancia: gr.w * (100 - d.pts) / 100 / gr.n };
  }).sort((a, b) => b.ganancia - a.ganancia);
  const adv = [];
  if (finalR !== null && completa) for (const [u] of REGLAS.umbrales) { if (u > 0 && Math.abs(finalR - u) < REGLAS.zonaSensible) { adv.push(`Zona sensible: la calificación está a ${Math.abs(finalR - u).toFixed(2)} puntos del umbral ${u}. Una diferencia pequeña entre evaluadores podría cambiar la categoría.`); break; } }
  if (sinDatos.length) adv.push(`No hay indicadores evaluados en: ${sinDatos.join(', ')}.`);
  const nNa = detalle.filter(d => d.estado === 'na').length;
  if (nNa) adv.push(`${nNa} indicador(es) marcados manualmente como no aplicables: confirme que corresponde excluirlos del promedio.`);
  return { tipo, pesos, grupos, final: finalR, categoria: cat, completa, provisional, faltan, detalle, mejoras, advertencias: adv, versionReglas: REGLAS.version };
}

// ---- generador de observaciones de ejemplo (datos ilustrativos) ----
function candidatos(ind, p) {
  if (ind.t === 'nivel') return ind.ops.map((o, i) => ({ obs: { i }, pts: o[0] }));
  if (ind.t === 'pct') { const c = []; for (const v of [0, 1, 2, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 50, 60, 70, 90, 100]) for (const x of [true, false]) c.push({ obs: { v, x }, pts: ind.f(v, x) }); return c; }
  if (ind.t === 'mortG') return [{ obs: { v: 2, x: true }, pts: 100 }, { obs: { v: 2, x: false }, pts: 55 }, { obs: { v: 4, x: true }, pts: 20 }, { obs: { v: 8, x: false }, pts: 0 }];
  if (ind.t === 'dens') return [{ obs: { peso: 2, dens: 15 }, pts: 100 }, { obs: { peso: 2, dens: 25 }, pts: 0 }];
  if (ind.t === 'cc') return [1, 2, 3, 4, 5].map(n => ({ obs: { cc: n }, pts: ccPts(n, p.proposito) }));
}
function obsEjemplo(p, objetivos) {
  const obs = {};
  for (const g of ['MBA', 'MBR', 'MBG']) {
    const L = indicadoresDe(p.especie).filter(i => i.g === g && !noAplica(i, p));
    if (!L.length || objetivos[g] === undefined) continue;
    let resto = L.length * (100 - objetivos[g]);
    for (let j = L.length - 1; j >= 0; j--) {
      const c = candidatos(L[j], p);
      const niveles = [...new Set(c.map(x => x.pts))].sort((a, b) => a - b);   // de peor a mejor
      let pts = 100;
      for (const l of niveles) { if (100 - l <= resto + 22) { pts = l; break; } }
      resto -= 100 - pts;
      obs[L[j].id] = c.find(x => x.pts === pts).obs;
    }
  }
  return obs;
}
