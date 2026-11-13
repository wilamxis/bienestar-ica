// Conexión a PostgreSQL (por ejemplo, la base gratuita de Neon). Se activa al definir DATABASE_URL.
const { Pool } = require('pg'), fs = require('fs'), path = require('path');
const { crearRepositoriosPg } = require('./repositoriosPg');
async function abrir(url, { reiniciar = false } = {}) {
  const u = new URL(url), local = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  u.searchParams.delete('sslmode'); u.searchParams.delete('channel_binding');       // el cifrado se configura abajo
  const pool = new Pool({ connectionString: u.toString(), ssl: local ? undefined : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 30000 });
  pool.on('error', e => console.error('Conexión inactiva de la base cerrada:', e.message));   // evita que el servidor se caiga si la base duerme
  if (reiniciar) await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');       // solo para pruebas
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema_pg.sql'), 'utf8'));
  return { repos: crearRepositoriosPg(pool), cerrar: () => pool.end() };
}
module.exports = { abrir };
