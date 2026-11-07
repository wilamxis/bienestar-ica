# Cómo publicar el sistema gratis

El proyecto usa un servidor Node.js y una base SQLite, así que no se puede publicar en hostings solo de páginas
(GitHub Pages, Netlify estático). Estas son las opciones **gratuitas** reales:

| Opción | Costo | Datos | Ideal para |
|---|---|---|---|
| **A. Render (plan gratis) con datos de ejemplo** | $0 | Se pierden al reiniciar; los de ejemplo se recrean solos | Presentación o sustentación con un enlace público |
| **B. Su computador + túnel gratuito** | $0 | Permanentes (en su equipo) | Mostrarlo en vivo sin depender de un servicio |
| **C. Render gratis + base Neon (PostgreSQL gratis)** | $0 | Permanentes | Datos que no se pueden perder (requiere un cambio de código, ver abajo) |
| D. Render de pago o servidor propio | Desde unos pocos dólares al mes | Permanentes | Uso real (verifique precios actuales) |

## Opción A: Render gratis (la más rápida)

**Qué limita el plan gratis:** el servicio se duerme tras unos 15 minutos sin visitas (la primera visita después tarda cerca de
1 minuto en despertar) y el disco es temporal, así que lo que se cree se pierde al reiniciar. Con `DEMO=1` los usuarios y
datos de ejemplo se vuelven a crear solos. Revise en render.com si le piden tarjeta; las condiciones pueden cambiar.

### 1. Subir el proyecto a GitHub
1. Cree una cuenta gratis en github.com e instale Git desde git-scm.com.
2. En GitHub: **New repository**, nombre `bienestar-ica`, déjelo vacío (sin README) y créelo.
3. En la terminal, dentro de la carpeta `bienestar-ica` (la que tiene `package.json`):
```
git init
git add .
git commit -m "Sistema experto de bienestar animal"
git branch -M main
git remote add origin https://github.com/SU_USUARIO/bienestar-ica.git
git push -u origin main
```
Si pide credenciales, use GitHub Desktop o un token de acceso personal. El archivo `.gitignore` ya excluye la base de datos y `.env`.

### 2. Crear el servicio en Render
1. Entre a render.com y regístrese con su cuenta de GitHub.
2. **New +** → **Web Service** → elija el repositorio `bienestar-ica`.
3. Complete:
   - Runtime: **Node**
   - Build Command: `npm install --omit=dev`
   - Start Command: `node server.js`
   - Instance Type: **Free**
   - Health Check Path: `/salud`
4. En **Environment Variables** agregue:
   - `NODE_VERSION` = `22`
   - `NODE_ENV` = `production`
   - `DEMO` = `1`
5. Pulse **Create Web Service** y espere unos minutos. Render le da una dirección como `https://bienestar-ica-xxxx.onrender.com`.

(Alternativa: **New +** → **Blueprint** y elija el repositorio; Render lee el archivo `render.yaml`.)

### 3. Probar
Abra la dirección. Entre con `evaluador@demo.co`, `productor@demo.co` o `admin@demo.co` (contraseña `Demo1234`).

### Antes de presentar
- Abra el enlace **3 a 5 minutos antes** para que el servicio despierte.
- Recuerde que con `DEMO=1` las contraseñas son públicas: no deje datos reales ahí.
- Tenga a mano la opción B como respaldo.

## Opción B: su computador con un túnel gratuito
Sirve para dejar que otras personas abran el sistema mientras su computador esté encendido, con datos permanentes.
1. En una terminal: `npm start` (déjela abierta).
2. Instale `cloudflared` (descarga en la documentación de Cloudflare) y en otra terminal ejecute:
```
cloudflared tunnel --url http://localhost:3000
```
3. Aparece una dirección `https://algo.trycloudflare.com`: compártala. Cambia cada vez que lo reinicia y solo funciona mientras
   el computador y las dos terminales sigan abiertos. Es un servicio pensado para pruebas.

## Opción C: datos permanentes y gratis en la nube
Combina Render gratis (aplicación) con **Neon** (PostgreSQL gratis, sin tarjeta, 0,5 GB; se suspende tras 5 minutos sin uso y
despierta en una fracción de segundo). Evite la base gratuita de Render (se elimina a los 30 días) y Supabase gratis (se pausa
tras una semana sin uso).

Para esto hay que **cambiar la capa de datos a PostgreSQL**: escribir `src/db/repositoriosPg.js` con las mismas funciones que
`src/db/repositorios.js` (con la librería `pg`, de forma asíncrona), adaptar los servicios a `await` y crear las tablas en
Neon. La arquitectura por capas ya lo prevé, pero no está hecho todavía.

## Opción D: pago o servidor propio
- Render de pago con disco persistente, o un servidor virtual con Docker (`Dockerfile` y `deploy/docker-compose.yml`, con HTTPS
  automático mediante Caddy).
- Variables: `NODE_ENV=production`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DB_PATH` (y **no** definir `DEMO`).

## Lista de verificación de seguridad
- [ ] En un uso real, no definir `DEMO` y crear el administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- [ ] La dirección debe ser `https://` (Render la da automáticamente).
- [ ] No subir `.env` ni archivos `.db` a GitHub.
- [ ] Respaldar `data/bienestar.db` si los datos importan (en la opción B).
