-- Esquema relacional (SQLite). Para PostgreSQL: AUTOINCREMENT -> GENERATED ALWAYS AS IDENTITY, INTEGER 0/1 -> BOOLEAN, TEXT JSON -> JSONB.
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('evaluador','productor','administrador')),
  activo INTEGER NOT NULL DEFAULT 1,
  creado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  expira TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reglas (
  version INTEGER PRIMARY KEY,
  creada TEXT NOT NULL,
  creado_por TEXT NOT NULL,
  motivo TEXT NOT NULL,
  json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  ubicacion TEXT NOT NULL DEFAULT '',
  especie TEXT NOT NULL CHECK (especie IN ('pato','ganso')),
  proposito TEXT NOT NULL CHECK (proposito IN ('huevo','carne','otro')),
  sistema TEXT NOT NULL CHECK (sistema IN ('intensivo','semi','extensivo')),
  n_aves INTEGER NOT NULL CHECK (n_aves > 0),
  area_m2 REAL CHECK (area_m2 IS NULL OR area_m2 > 0),
  corral INTEGER NOT NULL DEFAULT 0,
  cama INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  dueno_id INTEGER REFERENCES usuarios(id),
  creado TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evaluaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  predio_id INTEGER NOT NULL REFERENCES predios(id),
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('borrador','cerrada','anulada')),
  version INTEGER NOT NULL DEFAULT 1,
  evaluador_id INTEGER REFERENCES usuarios(id),
  notas TEXT NOT NULL DEFAULT '',
  obs_json TEXT NOT NULL DEFAULT '{}',
  resultado_json TEXT,
  regla_version INTEGER REFERENCES reglas(version),
  creada TEXT NOT NULL,
  cerrada_en TEXT,
  motivo_anulacion TEXT
);
CREATE TABLE IF NOT EXISTS cambios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entidad TEXT NOT NULL,
  ref_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  usuario_id INTEGER,
  usuario_nombre TEXT NOT NULL,
  campo TEXT NOT NULL,
  antes TEXT NOT NULL,
  despues TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_eval_predio ON evaluaciones(predio_id);
CREATE INDEX IF NOT EXISTS ix_cambios_ref ON cambios(entidad, ref_id);
CREATE INDEX IF NOT EXISTS ix_predios_dueno ON predios(dueno_id);
