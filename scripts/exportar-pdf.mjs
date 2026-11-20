// PDF de respaldo: una página 16:9 por slide, con cada slide en su estado final.
import { PDFDocument } from 'pdf-lib';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const carpeta = path.resolve('salida/web');
const r = spawnSync(process.execPath, ['scripts/capturas-web.mjs', 'salida/web'], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);

const pdf = await PDFDocument.create();
pdf.setTitle('PRISMA · Presentación');
const capturas = fs.readdirSync(carpeta).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
for (const archivo of capturas) {
  const jpg = path.join(carpeta, archivo.replace('.png', '.jpg'));
  spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', path.join(carpeta, archivo), '-q:v', '2', jpg]);
  const imagen = await pdf.embedJpg(fs.readFileSync(jpg));
  const pagina = pdf.addPage([1920, 1080]);
  pagina.drawImage(imagen, { x: 0, y: 0, width: 1920, height: 1080 });
  fs.rmSync(jpg);
}
const salida = path.resolve('salida/PRISMA-presentacion.pdf');
fs.writeFileSync(salida, await pdf.save());
console.log(salida, `${(fs.statSync(salida).size / 1024 / 1024).toFixed(1)} MB`);
