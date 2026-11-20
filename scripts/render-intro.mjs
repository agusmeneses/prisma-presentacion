// Renderiza la intro a MP4 (1080p60) y exporta las capas de su último cuadro para la portada del PPTX.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import ffmpeg from 'ffmpeg-static';
import { iniciarServidor } from './serve.mjs';

const FPS = 60;
const carpeta = path.resolve('salida');
const carpetaCapas = path.join(carpeta, 'capas');
fs.mkdirSync(carpetaCapas, { recursive: true });

const servidor = await iniciarServidor(5182);
const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
pagina.on('pageerror', (e) => console.error('error:', e.message));
await pagina.goto('http://localhost:5182/src/intro.html?modo=captura');
await pagina.waitForFunction(() => window.introLista === true, null, { timeout: 30000 });
const duracion = await pagina.evaluate(() => window.duracion);
const totalCuadros = Math.round(duracion * FPS) + 1;

const soloCapas = process.argv.includes('--solo-capas');
const salidaVideo = path.join(carpeta, 'intro-prisma.mp4');
if (!soloCapas) {
const codificador = spawn(ffmpeg, [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
  '-profile:v', 'high', '-level', '4.2', '-movflags', '+faststart', salidaVideo,
], { stdio: ['pipe', 'ignore', 'pipe'] });
let errores = '';
codificador.stderr.on('data', (d) => { errores = (errores + d).slice(-2000); });

const inicio = Date.now();
for (let i = 0; i < totalCuadros; i++) {
  const t = Math.min(i / FPS, duracion);
  await pagina.evaluate((tt) => window.componer(tt), t);
  const cuadro = await pagina.screenshot({ type: 'png' });
  if (!codificador.stdin.write(cuadro)) await new Promise((r) => codificador.stdin.once('drain', r));
  if (i % 60 === 0) console.log(`cuadro ${i}/${totalCuadros} · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}
codificador.stdin.end();
const codigo = await new Promise((r) => codificador.on('close', r));
if (codigo !== 0) { console.error(errores); process.exit(1); }
console.log('video:', salidaVideo);
}

// Capas del último cuadro: la portada del PPTX se arma con estas tres imágenes superpuestas
const capas = {
  'portada-completa.png': { fondo: true, escena: true, palabra: true },
  'portada-fondo.png': { fondo: true, escena: false, palabra: false },
  'portada-cubo.png': { fondo: false, escena: true, palabra: false },
  'portada-palabra.png': { fondo: false, escena: false, palabra: true },
};
for (const [nombre, config] of Object.entries(capas)) {
  await pagina.evaluate(([tt, c]) => window.componer(tt, c), [duracion, config]);
  await pagina.screenshot({ path: path.join(carpetaCapas, nombre), omitBackground: !config.fondo });
  console.log('capa:', nombre);
}
await navegador.close();
servidor.close();
