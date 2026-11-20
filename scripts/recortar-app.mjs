// Recorta fragmentos de las capturas reales (coordenadas en px CSS de 1600x1000; las capturas son 2x).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const origen = path.resolve('salida/app');
const destino = path.resolve('web/img/app');
fs.mkdirSync(destino, { recursive: true });

// nombre: [captura, x, y, ancho, alto]
export const RECORTES = {
  'or-tarjetas': ['admin-or', 262, 180, 1302, 390],
  'tickets-tarjetas': ['admin-tickets', 262, 180, 1302, 390],
  'kpis': ['admin-analitica', 252, 205, 1330, 100],
  'grafico': ['admin-analitica', 252, 340, 880, 330],
  'atencion': ['admin-analitica', 1143, 340, 440, 300],
  'planes': ['admin-planes', 262, 255, 1302, 210],
  // Mails y teléfonos difuminados: la presentación y el repo son públicos
  'tecnicos': ['admin-tecnicos', 262, 195, 1302, 240, [[515, 52, 660, 188]]],
  'especialidades': ['admin-especialidades', 262, 195, 1302, 240],
  'equipos': ['admin-equipos', 262, 190, 1302, 250],
  'tipos-equipo': ['admin-tipos-equipo', 262, 190, 1302, 250],
  'ubicaciones': ['admin-ubicaciones', 262, 190, 1302, 200],
  'proveedores': ['admin-proveedores', 262, 190, 1302, 250],
  'empresas': ['admin-empresas', 262, 190, 1302, 250],
  'fallas': ['admin-fallas', 262, 190, 1302, 250],
  'tareas': ['admin-tareas', 262, 190, 1302, 250],
  'tarea-tecnico': ['tecnico-escritorio', 262, 175, 1302, 140],
  'or-card': ['admin-or', 264, 203, 1298, 132],
  'ticket-card': ['admin-tickets', 264, 203, 1298, 132],
  'plan-card': ['admin-planes', 264, 254, 1298, 100],
};

if (process.argv[1].endsWith('recortar-app.mjs')) {
  for (const [nombre, [captura, x, y, w, h, difuminar = []]] of Object.entries(RECORTES)) {
    // Zonas difuminadas en coordenadas del recorte (px CSS)
    let filtro = `[0]crop=${w * 2}:${h * 2}:${x * 2}:${y * 2}[base]`;
    difuminar.forEach(([dx, dy, dw, dh], i) => {
      filtro += `;[base]split[b${i}][z${i}];[z${i}]crop=${dw * 2}:${dh * 2}:${dx * 2}:${dy * 2},boxblur=14:3[d${i}];[b${i}][d${i}]overlay=${dx * 2}:${dy * 2}[base]`;
    });
    const r = spawnSync(ffmpeg, ['-y', '-i', path.join(origen, `${captura}.png`), '-filter_complex', filtro, '-map', '[base]', path.join(destino, `${nombre}.png`)], { encoding: 'utf8' });
    if (r.status !== 0) console.error(nombre, r.stderr.slice(-300));
    else console.log(nombre);
  }
}
