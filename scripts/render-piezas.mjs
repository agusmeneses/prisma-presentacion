// Exporta cada [data-pieza] de src/piezas.html como PNG transparente (los fondos a 1×, el resto a 2×)
// y recorta al contenido las capas del cubo y la palabra de la portada.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { iniciarServidor } from './serve.mjs';

const carpeta = path.resolve('salida/piezas');
fs.mkdirSync(carpeta, { recursive: true });
const servidor = await iniciarServidor(5183);
const navegador = await chromium.launch();

async function exportar(escala, filtro) {
  const pagina = await navegador.newPage({ viewport: { width: 2100, height: 1200 }, deviceScaleFactor: escala });
  await pagina.goto('http://localhost:5183/src/piezas.html');
  await pagina.waitForFunction(() => window.piezasListas === true, null, { timeout: 30000 });
  const nombres = await pagina.$$eval('[data-pieza]', (els) => els.map((e) => e.dataset.pieza));
  for (const nombre of nombres.filter(filtro)) {
    const pieza = pagina.locator(`[data-pieza="${nombre}"]`);
    // Margen para que entren las sombras
    const caja = await pieza.boundingBox();
    const margen = nombre.startsWith('fondo') ? 0 : 120;
    await pagina.screenshot({
      path: path.join(carpeta, `${nombre}.png`),
      omitBackground: true,
      fullPage: true,
      clip: { x: caja.x - margen, y: caja.y - margen, width: caja.width + margen * 2, height: caja.height + margen * 2 },
    });
    console.log(nombre);
  }
  await pagina.close();
}

await exportar(1, (n) => n.startsWith('fondo'));
await exportar(2, (n) => !n.startsWith('fondo'));

// Recorte al contenido visible (alfa > 0) de las capas de portada
const pagina = await navegador.newPage();
await pagina.goto('http://localhost:5183/');
for (const nombre of ['portada-cubo', 'portada-palabra']) {
  const datos = fs.readFileSync(path.resolve(`salida/capas/${nombre}.png`)).toString('base64');
  const resultado = await pagina.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 2) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    const recorte = document.createElement('canvas');
    recorte.width = x1 - x0 + 1; recorte.height = y1 - y0 + 1;
    recorte.getContext('2d').drawImage(c, -x0, -y0);
    return { x: x0, y: y0, w: recorte.width, h: recorte.height, png: recorte.toDataURL('image/png').split(',')[1] };
  }, datos);
  fs.writeFileSync(path.join(carpeta, `${nombre}.png`), Buffer.from(resultado.png, 'base64'));
  const { png, ...caja } = resultado;
  fs.writeFileSync(path.join(carpeta, `${nombre}.json`), JSON.stringify(caja));
  console.log(nombre, caja);
}

await navegador.close();
servidor.close();
