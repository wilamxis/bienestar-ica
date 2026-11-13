# Sistema experto de bienestar animal en patos y gansos (metodología ICA 2024)

Aplicación web con **servidor Node.js, base de datos SQLite y control de acceso por roles**, organizada en capas
(modelo–vista–controlador + servicios + motor de reglas). Es la evolución del MVP de un solo archivo.

## Ejecutar
Requisitos: **Node.js 22.13 o superior**.
```bash
npm install
npm start            # http://localhost:3000
npm test             # 17 pruebas (equivalencia del motor, API con roles y vista)
```
La primera vez, si la base está vacía, se crea el **modo demostración** con datos de ejemplo y estos usuarios
(contraseña `Demo1234`): `admin@demo.co`, `evaluador@demo.co`, `productor@demo.co`, `productora2@demo.co`.

Para un entorno real: `NODE_ENV=production ADMIN_EMAIL=... ADMIN_PASSWORD=... npm start` crea solo el administrador
(sin datos ni usuarios de demostración) y activa la cookie `Secure` (requiere HTTPS).

Variables: `PORT` (3000), `DB_PATH` (`data/bienestar.db`, solo SQLite), `DATABASE_URL` (si existe, usa PostgreSQL en lugar de SQLite),
`NODE_ENV`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO` (1 = usuarios y datos de ejemplo).

## Publicarlo en internet (gratis)
Vea **DESPLIEGUE.md**: guía paso a paso para Render (gratis), túnel desde su computador y alternativas con datos permanentes.

## Arquitectura (MVC por capas)
```
 Navegador (VISTA)                     Servidor
 public/js/vista-*.js   ──fetch──►  CONTROLADORES  ──►  SERVICIOS (reglas de negocio)  ──►  REPOSITORIOS ──► SQLite
 public/js/app.js (enrutador,         src/controladores    src/servicios                    src/db           data/*.db
 menú por rol, acciones)              + middleware (RBAC)  + motor de reglas (dominio)
        ▲                                                       src/dominio/motor.js  ◄── el MISMO archivo corre en el navegador (vista previa)
        └──── /js/motor.js ──────────────────────────────────────────────────────────────────┘
```
| Capa | Carpeta | Responsabilidad |
|---|---|---|
| **Modelo** (datos) | `src/db/` | Esquema SQL y repositorios: el único código que conoce la base de datos |
| **Modelo** (dominio) | `src/dominio/motor.js` | Motor de reglas: funciones puras, sin red ni base de datos |
| Servicios | `src/servicios/` | Reglas de negocio: predios, evaluaciones (borrador, cierre, corrección, anulación), reglas versionadas, usuarios, sesiones |
| **Controlador** | `src/controladores/`, `src/middleware/`, `src/app.js` | Rutas REST, autenticación y verificación de permisos |
| **Vista** | `public/` | Interfaz web que consume la API |

El cálculo de la calificación se hace **siempre en el servidor** al cerrar o corregir; el navegador solo muestra una vista previa.

## Roles y permisos (`src/permisos.js`, verificados en el servidor)
| Acción | Evaluador | Productor | Administrador |
|---|---|---|---|
| Crear/editar/desactivar predios y asignar dueño | Sí | No | No |
| Ver predios | Todos | Solo los suyos | No |
| Crear, cerrar, corregir y anular evaluaciones | Sí | No | No |
| Ver evaluaciones, histórico e informes | Todas | Cerradas de sus predios | No |
| Ver historial interno de cambios | Sí | No | No |
| Consultar reglas | Sí | Sí | Sí |
| Actualizar reglas (crea versión nueva) | No | No | Sí |
| Gestionar usuarios | No | No | Sí |

Ocultar un botón en la pantalla es solo comodidad: cada endpoint vuelve a comprobar el permiso. Un productor que pide
el predio de otro recibe «no encontrado».

## Reglas como datos y versionadas
Las escalas del ICA viven en la tabla `reglas` (JSON), no en el código. El administrador puede editar una escala o los
parámetros (pesos, umbrales); cada cambio se valida (`Motor.validarReglas`) y crea una **versión nueva**. Cada evaluación
guarda la versión con la que se calculó, así que cambiar las reglas no altera resultados antiguos. La carga inicial sale de
`src/dominio/reglas_ica_v1.json` (`npm run reglas` lo regenera desde `tests/motor_mvp_original.js`).
`tests/equivalencia.test.js` comprueba que el motor basado en datos da **los mismos resultados** que el del MVP.

## PostgreSQL
Ya está implementado: `src/db/conexionPg.js`, `src/db/repositoriosPg.js` y `src/db/schema_pg.sql`. Al definir `DATABASE_URL` el sistema usa
PostgreSQL (por ejemplo Neon, que tiene plan gratuito); sin ella usa SQLite local. Los servicios son asíncronos y no saben cuál hay debajo.
Para probar toda la suite contra PostgreSQL: `TEST_DATABASE_URL=postgres://usuario:clave@localhost:5432/prueba npm run test:pg`
(recrea las tablas de esa base: use una base de pruebas).

## Seguridad incluida
Contraseñas con `scrypt` y sal; sesiones con token aleatorio guardado como hash, cookie `HttpOnly` + `SameSite=Lax`;
límite de 5 intentos de acceso fallidos; validación de datos en el servidor; rechazo de peticiones de otro origen;
cabeceras de seguridad y CSP; sesiones cerradas al desactivar un usuario o cambiar su contraseña.

## Limitaciones conocidas
- Las escalas se transcribieron del documento del ICA v1.0 y deben validarse con el ICA (ver supuestos en la pantalla «Reglas»).
- Pendiente: recuperación de contraseña por correo, auditoría de inicios de sesión, informe comparativo entre predios,
  respaldo automático de la base, despliegue con HTTPS.
- `node:sqlite` (modo local) es un módulo experimental de Node: muestra un aviso al iniciar. Para producción use PostgreSQL con `DATABASE_URL`.
