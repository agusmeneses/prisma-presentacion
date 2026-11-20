// Arma la presentación web en web/: pantallas del teléfono, íconos y QR en línea, recursos y bundle único.
import { chromium } from 'playwright';
import * as esbuild from 'esbuild';
import QRCode from 'qrcode';
import * as simpleIcons from 'simple-icons';
import fs from 'node:fs';
import path from 'node:path';
import { iniciarServidor } from './serve.mjs';

const raiz = path.resolve('.');
const web = path.join(raiz, 'web');
const generado = path.join(web, 'generado');
fs.mkdirSync(generado, { recursive: true });
fs.mkdirSync(path.join(web, 'img'), { recursive: true });
fs.mkdirSync(path.join(web, 'video'), { recursive: true });

// 1. Pantalla y notificación del teléfono (desde src/telefono-ui.html). Necesita Chromium de Playwright,
// así que solo se regenera si se pide con --telefono o si todavía no existe.
const renderizarTelefono = process.argv.includes('--telefono') || !fs.existsSync(path.join(generado, 'telefono-pantalla.png'));
if (renderizarTelefono) {
  const servidor = await iniciarServidor(5184);
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 3 });
  await pagina.goto('http://localhost:5184/src/telefono-ui.html');
  await pagina.waitForFunction(() => window.piezasListas === true, null, { timeout: 30000 });
  await pagina.locator('[data-pieza="telefono-pantalla"]').screenshot({ path: path.join(generado, 'telefono-pantalla.png') });
  const aviso = pagina.locator('[data-pieza="telefono-aviso"]');
  await aviso.screenshot({ path: path.join(generado, 'telefono-aviso.png'), omitBackground: true });
  const caja = await aviso.boundingBox();
  fs.writeFileSync(path.join(generado, 'telefono-aviso.json'), JSON.stringify({ ancho: caja.width, alto: caja.height }));
  await navegador.close();
  servidor.close();
  console.log('teléfono: pantalla y aviso');
}

// 2. Recursos de la portada y video
fs.copyFileSync(path.join(raiz, 'salida/piezas/portada-cubo.png'), path.join(web, 'img/portada-cubo.png'));
fs.copyFileSync(path.join(raiz, 'salida/piezas/portada-palabra.png'), path.join(web, 'img/portada-palabra.png'));
fs.copyFileSync(path.join(raiz, 'salida/capas/portada-fondo.png'), path.join(web, 'img/portada-fondo.png'));
fs.copyFileSync(path.join(raiz, 'salida/intro-prisma.mp4'), path.join(web, 'video/intro-prisma.mp4'));

// 3. HTML con íconos (Lucide, como en PRISMA), logos de tecnologías y QR en línea
const iconoLucide = (nombre) => fs.readFileSync(path.join(raiz, `node_modules/lucide-static/icons/${nombre}.svg`), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<svg[^>]*>/, '<svg class="ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">')
  .trim();
function iconoMarca(nombre) {
  const icono = Object.values(simpleIcons).find((i) => i?.slug === nombre);
  const hex = `#${icono.hex}`;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(icono.hex.slice(i - 1, i + 1), 16));
  // Los colores de marca muy oscuros no se leen sobre el fondo de PRISMA
  const color = 0.2126 * r + 0.7152 * g + 0.0722 * b < 70 ? '#d6e1e2' : hex;
  return `<svg class="marca" viewBox="0 0 24 24" fill="${color}" aria-hidden="true"><path d="${icono.path}"/></svg>`;
}
let html = fs.readFileSync(path.join(web, 'src/index.html'), 'utf8');
html = html.replace(/<i(?: class="([^"]+)")? data-icono="([^"]+)"><\/i>/g, (_, clase, nombre) =>
  clase ? `<span class="${clase}">${iconoLucide(nombre)}</span>` : iconoLucide(nombre));
html = html.replace(/<i data-marca="([^"]+)"><\/i>/g, (_, nombre) => iconoMarca(nombre));
const qrs = [...html.matchAll(/<div class="qr" data-qr="([^"]+)"><\/div>/g)];
for (const [completo, url] of qrs) {
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#070e10', light: '#ffffff' } });
  html = html.replace(completo, `<div class="qr">${svg}</div>`);
}
const restantes = html.match(/data-(icono|marca)="[^"]+"/g);
if (restantes) throw new Error(`Íconos sin reemplazar: ${restantes.join(', ')}`);
fs.writeFileSync(path.join(web, 'index.html'), html);

// 4. Bundle único (script clásico: funciona también abriendo el archivo con doble clic)
await esbuild.build({
  entryPoints: { app: path.join(web, 'src/principal.js') },
  outdir: web, bundle: true, format: 'iife', minify: true, target: 'chrome110',
  loader: { '.png': 'dataurl', '.json': 'json' }, logLevel: 'warning',
});
await esbuild.build({
  entryPoints: { app: path.join(web, 'src/app.css') },
  outdir: web, bundle: true, minify: true, loader: { '.ttf': 'dataurl' }, logLevel: 'warning',
});
const pesos = ['index.html', 'app.js', 'app.css'].map((f) => `${f} ${(fs.statSync(path.join(web, f)).size / 1024).toFixed(0)} KB`);
console.log('web:', pesos.join(' · '));
