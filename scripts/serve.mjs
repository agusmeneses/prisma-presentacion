// Servidor estático mínimo para que Playwright cargue los módulos ES sin restricciones de file://
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json',
};

export function iniciarServidor(puerto = 5180) {
  const servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let archivo = path.join(raiz, ruta);
    if (!archivo.startsWith(raiz)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, 'index.html');
    if (!fs.existsSync(archivo)) { res.writeHead(404); res.end('no encontrado'); return; }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] ?? 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
  });
  return new Promise((resolver) => servidor.listen(puerto, () => resolver(servidor)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.argv[2] ?? 5180);
  await iniciarServidor(puerto);
  console.log(`Sirviendo ${raiz} en http://localhost:${puerto}`);
}
