// Captura cada slide de la presentación web en su estado final, abriendo el archivo como lo haría quien presenta (file://).
// Uso: node scripts/capturas-web.mjs [carpeta] [slides...]   ej.: node scripts/capturas-web.mjs salida/web 1 2 3
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [carpetaArg, ...lista] = process.argv.slice(2);
const carpeta = path.resolve(carpetaArg ?? 'salida/web');
fs.mkdirSync(carpeta, { recursive: true });
const indice = pathToFileURL(path.resolve('web/index.html')).href;

const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
await pagina.goto(indice);
const total = await pagina.evaluate(() => window.presentacion.slides.length);
const slides = lista.length ? lista.map(Number) : Array.from({ length: total }, (_, i) => i + 1);
for (const n of slides) {
  await pagina.goto(`${indice}?slide=${n}&final=1`);
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(n === 8 ? 2500 : 900);
  const archivo = path.join(carpeta, `slide-${String(n).padStart(2, '0')}.png`);
  await pagina.screenshot({ path: archivo });
  console.log(archivo);
}
if (errores.length) console.error('ERRORES:\n' + [...new Set(errores)].join('\n'));
await navegador.close();
