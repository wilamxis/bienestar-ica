# Cómo publicar el sistema gratis

El proyecto usa un servidor Node.js y una base SQLite, así que no se puede publicar en hostings solo de páginas
(GitHub Pages, Netlify estático). Estas son las opciones **gratuitas** reales:

| Opción | Costo | Datos | Ideal para |
|---|---|---|---|
| **A. Render (plan gratis) con datos de ejemplo** | $0 | Se pierden al reiniciar; los de ejemplo se recrean solos | Presentación o sustentación con un enlace público |
| **B. Su computador + túnel gratuito** | $0 | Permanentes (en su equipo) | Mostrarlo en vivo sin depender de un servicio |
| **C. Render gratis + base Neon (PostgreSQL gratis)** ✔ incluida | $0 | **Permanentes** | Que los datos queden guardados y se vean al volver a abrir |
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

## Opción C: datos permanentes y gratis (Render + Neon)
El sistema ya incluye soporte para PostgreSQL. Si define la variable `DATABASE_URL`, guarda todo en esa base en lugar de usar un
archivo local; así los datos **sobreviven** cuando Render duerme o reinicia el servicio. **Neon** ofrece PostgreSQL gratis, sin
tarjeta, con 0,5 GB. Se suspende tras unos 5 minutos sin uso y despierta en un instante, así que la primera consulta puede
tardar un poco más. Evite la base gratuita de Render (se elimina a los 30 días) y Supabase gratis (se pausa tras una semana sin uso).

### 1. Actualice el código en GitHub
Reemplace los archivos del proyecto por los de la versión nueva y, en la terminal dentro de la carpeta `bienestar-ica`:
```
git add .
git commit -m "Soporte para PostgreSQL"
git push
```

### 2. Cree la base en Neon
1. Entre a neon.com y pulse **Sign up** (puede usar su cuenta de GitHub o Google). No pide tarjeta en el plan gratis.
2. Cree un proyecto (**Create project**): nombre `bienestar-ica`; deje la versión de Postgres por defecto y elija una región cercana a la de su servicio en Render.
3. En el panel del proyecto pulse **Connect** y copie la **connection string**. Se parece a:
   `postgresql://usuario:clave@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
   Asegúrese de que incluya la contraseña (use «Show password» si aparece oculta).

### 3. Conéctela a Render
1. En render.com abra su servicio `bienestar-ica` → **Environment**.
2. **Add Environment Variable**: Key `DATABASE_URL`, Value: la connection string completa. Guarde. Render vuelve a desplegar solo.
3. En **Logs** debe aparecer: `Sistema experto de bienestar animal en el puerto ... · base de datos: PostgreSQL`.

La primera vez, con `DEMO=1`, se crean los usuarios y datos de ejemplo **una sola vez**; los reinicios siguientes no los vuelven a crear ni borran lo que usted agregue.

### 4. Compruebe que se guarda
1. Entre con `evaluador@demo.co` y cree un predio.
2. En Render pulse **Manual Deploy → Restart service** (o espere a que se duerma y vuelva a abrir la página).
3. Entre de nuevo: el predio debe seguir ahí.

**Cuidado:** la connection string es un secreto. Péguela solo en las variables de Render; nunca en GitHub ni en capturas.

## Opción D: pago o servidor propio
- Render de pago con disco persistente, o un servidor virtual con Docker (`Dockerfile` y `deploy/docker-compose.yml`, con HTTPS
  automático mediante Caddy).
- Variables: `NODE_ENV=production`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DB_PATH` (y **no** definir `DEMO`).

## Lista de verificación de seguridad
- [ ] En un uso real, no definir `DEMO` y crear el administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- [ ] La dirección debe ser `https://` (Render la da automáticamente).
- [ ] No subir `.env`, archivos `.db` ni la `DATABASE_URL` a GitHub.
- [ ] Respaldar `data/bienestar.db` si los datos importan (en la opción B).
