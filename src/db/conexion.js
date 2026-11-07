// Conexión a SQLite (módulo integrado de Node 22). Es el ÚNICO archivo que conoce el motor de base de datos.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs'), path = require('path');
function abrir(ruta) {
  if (ruta !== ':memory:') fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  migrar(db);
  return db;
}
// Migraciones sencillas para bases creadas con versiones anteriores
function migrar(db) {
  const cols = db.prepare('PRAGMA table_info(predios)').all().map(c => c.name);
  if (!cols.includes('area_m2')) db.exec('ALTER TABLE predios ADD COLUMN area_m2 REAL CHECK (area_m2 IS NULL OR area_m2 > 0)');
}
module.exports = { abrir };
