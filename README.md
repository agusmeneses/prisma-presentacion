# Presentación PRISMA

Presentación comercial de PRISMA (parte de Agus: problema, solución y por qué elegirnos).
Es una página web con una intro 3D en video y 13 slides animadas. Corre en Chrome o Edge, también sin internet.

- **Verla online:** <https://prisma-presentacion.prisma-dev.workers.dev>
- **Ver el video de la intro:** [`salida/intro-prisma.mp4`](salida/intro-prisma.mp4)
- **Capturas completas del sistema:** [`salida/app/`](salida/app/)
- **Ver las slides sin instalar nada:** [`salida/PRISMA-presentacion.pdf`](salida/PRISMA-presentacion.pdf) (estado final de cada slide, sin animaciones)

## Instalación

Requisito: [Node.js](https://nodejs.org/) 20 o superior.

```bash
git clone https://github.com/agusmeneses/prisma-presentacion.git
cd prisma-presentacion
npm install
```

`npm install` baja la tipografía Chillax desde Fontshare y arma la presentación en `web/`. No hace falta nada más.

## Presentar

Abrí `web/index.html` con doble clic, apretá `F` (pantalla completa) y `→` para arrancar.
La intro dura 10 s y termina sola en la portada. También podés servirla con `npm run servir` y abrir <http://localhost:5180/web/>.

| Tecla | Acción |
|---|---|
| `→` `Espacio` `Enter` `Re Pág` / clic | Siguiente. Si la slide todavía se está animando, la completa |
| `←` `Av Pág` / clic derecho | Anterior |
| `F` | Pantalla completa |
| `N` | Notas del orador |
| `Inicio` / `Fin` | Primera / última slide |

Para llevarla en un pendrive, copiá la carpeta `web/` completa después de `npm install`.

## Editar

| Qué | Dónde |
|---|---|
| Textos de cada slide y notas del orador | `web/src/index.html` (cada `<section>` es una slide; las notas van en `data-notas`) |
| Animaciones de cada slide | `web/src/principal.js`, objeto `definiciones` |
| Colores, tipografías y posiciones | `web/src/estilos.css` |
| Teléfono 3D | `web/src/telefono.js` y su pantalla en `src/telefono-ui.html` |
| Intro 3D | `src/intro.js` |

Después de editar: `npm run build` y recargá `web/index.html`.

- **Fotos del equipo:** guardalas en `web/img/equipo/` y, en la slide «equipo», reemplazá `<i data-icono="user"></i>` por `<img src="img/equipo/nombre.jpg" alt="Nombre">`.
- **Pendientes:** los nombres y roles del equipo, la carrera y la facultad están entre corchetes (`[Integrante 2]`, `[Rol]`, …).

### Regenerar piezas pesadas (opcional)

Estas tareas usan el navegador de Playwright. Instalalo una vez con `npx playwright install chromium`.

| Comando | Qué regenera |
|---|---|
| `npm run intro` | Video de la intro (`salida/intro-prisma.mp4`) y las capas de la portada |
| `npm run telefono` | Pantalla y notificación del teléfono 3D |
| `npm run pdf` | PDF de respaldo |
| `npm run capturar` | Recortes reales de PRISMA (ver abajo) |

`npm run capturar` necesita PRISMA corriendo en `localhost:5173` y las cuentas en variables de entorno:

```powershell
$env:PRISMA_ADMIN='correo|clave'; $env:PRISMA_AUTORIZADO='correo|clave'; $env:PRISMA_TECNICO='correo|clave'
npm run capturar
```

Los mails y teléfonos de la lista de técnicos se difuminan solos (`scripts/recortar-app.mjs`).

## Publicar

La carpeta publicable es `web/` y el comando de build es `npm run build`.

- **Cloudflare (publicada en <https://prisma-presentacion.prisma-dev.workers.dev>):** Worker `prisma-presentacion` en la cuenta Prisma-dev, separado del deploy de la app. La configuración está en `wrangler.jsonc`.
  **Se publica sola con cada push a `main`** (Workers Builds corre `npm run build` y `npx wrangler deploy`). Las otras ramas generan una versión de vista previa sin tocar la publicada.
  La intro en video no se vuelve a renderizar en ese proceso: si cambia `src/intro.js`, corré `npm run intro` y subí el `salida/intro-prisma.mp4` nuevo.
  Para publicar a mano: `npx wrangler login` (una sola vez, con una cuenta que tenga acceso a Prisma-dev) y después `npm run publicar`.
- **Vercel:** importar el repo; `vercel.json` ya tiene la configuración.

## Licencias de recursos

- **Chillax** (Fontshare, ITF Free Font License): no se incluye en el repo porque su licencia prohíbe redistribuirla; `npm install` la descarga de la fuente oficial. Se puede incrustar en documentos y en sitios propios.
- **Poppins** y **Caveat** (Google Fonts, SIL Open Font License): incluidas en `assets/fuentes/`.
- **Íconos:** [Lucide](https://lucide.dev) (ISC), los mismos que usa PRISMA, y [Simple Icons](https://simpleicons.org) (CC0) para los logos de tecnologías.
