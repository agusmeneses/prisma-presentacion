// Prueba el recorrido real desde file://: arranque, intro en video, empalme con la portada y transiciones.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const carpeta = path.resolve('salida/flujo');
fs.mkdirSync(carpeta, { recursive: true });
const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.goto(pathToFileURL(path.resolve('web/index.html')).href);
await pagina.waitForSelector('#inicio.listo', { timeout: 15000 });
const foto = async (nombre) => { await pagina.screenshot({ path: path.join(carpeta, `${nombre}.png`) }); console.log(nombre); };

await pagina.keyboard.press('ArrowRight');
await pagina.waitForTimeout(4000); await foto('a-intro-4s');
await pagina.waitForTimeout(7200); await foto('b-tras-intro');
const estado = await pagina.evaluate(() => ({ video: getComputedStyle(document.querySelector('#video-intro')).opacity, activa: document.querySelector('.slide.activa')?.dataset.slide }));
console.log('después de la intro:', estado);
await pagina.waitForTimeout(1500); await foto('c-portada');
await pagina.keyboard.press('ArrowRight');
await pagina.waitForTimeout(900); await foto('d-morph-logo');
await pagina.waitForTimeout(3500);
await pagina.keyboard.press('ArrowRight');
await pagina.waitForTimeout(1000); await foto('e-absorcion');
await pagina.waitForTimeout(1500); await foto('f-cubo-a-esquina');
if (errores.length) console.error('ERRORES:\n' + errores.join('\n'));
await navegador.close();
