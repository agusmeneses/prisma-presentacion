// Arma una hoja de contactos 3 columnas con las imágenes indicadas: node scripts/hoja.mjs salida.png a.png b.png ...
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const [salida, ...imagenes] = process.argv.slice(2);
const columnas = 3;
const ancho = 640, alto = 360;
const entradas = imagenes.flatMap((img) => ['-i', img]);
const escalas = imagenes.map((_, i) => `[${i}:v]scale=${ancho}:${alto}[v${i}]`).join(';');
const posiciones = imagenes.map((_, i) => `${(i % columnas) * ancho}_${Math.floor(i / columnas) * alto}`).join('|');
const filtro = `${escalas};${imagenes.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${imagenes.length}:layout=${posiciones}:fill=black`;
const r = spawnSync(ffmpeg, ['-y', ...entradas, '-filter_complex', filtro, '-frames:v', '1', salida], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr.slice(-1500)); process.exit(1); }
console.log(salida);
