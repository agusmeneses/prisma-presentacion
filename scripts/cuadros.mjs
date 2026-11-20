// Renderiza cuadros sueltos de la intro para revisarlos: node scripts/cuadros.mjs 1.5 3.3 9.5
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { iniciarServidor } from './serve.mjs';

const tiempos = process.argv.slice(2).map(Number);
const salida = path.resolve('salida/cuadros');
fs.mkdirSync(salida, { recursive: true });

const servidor = await iniciarServidor(5181);
const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
pagina.on('console', (m) => { if (m.type() === 'error') console.error('consola:', m.text()); });
pagina.on('pageerror', (e) => console.error('error:', e.message));
await pagina.goto('http://localhost:5181/src/intro.html?modo=captura');
await pagina.waitForFunction(() => window.introLista === true, null, { timeout: 30000 });

for (const t of tiempos) {
  await pagina.evaluate((tt) => window.componer(tt), t);
  const archivo = path.join(salida, `t${t.toFixed(2)}.png`);
  await pagina.screenshot({ path: archivo });
  console.log(archivo);
}
await navegador.close();
servidor.close();
