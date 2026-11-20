// Captura pantallas reales de PRISMA (localhost:5173) para recortar fragmentos.
// Las credenciales llegan por variables de entorno: PRISMA_ADMIN, PRISMA_AUTORIZADO, PRISMA_TECNICO ("correo|clave").
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const carpeta = path.resolve('salida/app');
fs.mkdirSync(carpeta, { recursive: true });
const URL_APP = 'http://localhost:5173/';

const recorridos = [
  {
    cuenta: 'PRISMA_ADMIN', viewport: { width: 1600, height: 1000 }, escala: 2,
    pasos: [
      ['admin-analitica', []],
      ['admin-or', ['Mantenimientos', 'Órdenes de reparación']],
      ['admin-tickets', ['Tickets']],
      ['admin-planes', ['Planes preventivos']],
      ['admin-tecnicos', ['Usuarios', 'Técnicos']],
      ['admin-especialidades', ['Especialidades']],
      ['admin-equipos', ['Inventario', 'Equipos']],
      ['admin-tipos-equipo', ['Tipos de equipos']],
      ['admin-ubicaciones', ['Ubicaciones']],
      ['admin-proveedores', ['Proveedores']],
      ['admin-empresas', ['Empresas externas']],
      ['admin-fallas', ['Plantillas', 'Fallas genéricas']],
      ['admin-tareas', ['Tareas genéricas']],
    ],
  },
  { cuenta: 'PRISMA_AUTORIZADO', viewport: { width: 1600, height: 1000 }, escala: 2, pasos: [['autorizado-tickets', []]] },
  { cuenta: 'PRISMA_TECNICO', viewport: { width: 390, height: 844 }, escala: 3, movil: true, pasos: [['tecnico-tareas', []]] },
  { cuenta: 'PRISMA_TECNICO', viewport: { width: 1600, height: 1000 }, escala: 2, pasos: [['tecnico-escritorio', []]] },
];

const navegador = await chromium.launch();
for (const r of recorridos) {
  const [correo, clave] = (process.env[r.cuenta] ?? '').split('|');
  if (!correo) { console.error(`Falta ${r.cuenta}`); continue; }
  const contexto = await navegador.newContext({ viewport: r.viewport, deviceScaleFactor: r.escala, isMobile: Boolean(r.movil), hasTouch: Boolean(r.movil) });
  const pagina = await contexto.newPage();
  await pagina.goto(URL_APP);
  await pagina.locator('input[type="email"]').first().fill(correo);
  await pagina.locator('input[type="password"]').first().fill(clave);
  await pagina.locator('button[type="submit"]').first().click();
  await pagina.waitForTimeout(6000);
  for (const [nombre, clics] of r.pasos) {
    for (const texto of clics) {
      await pagina.getByRole('button', { name: texto, exact: true }).first().click();
      await pagina.waitForTimeout(700);
    }
    await pagina.waitForTimeout(3500);
    await pagina.screenshot({ path: path.join(carpeta, `${nombre}.png`), fullPage: Boolean(r.movil) });
    console.log(nombre);
  }
  await contexto.close();
}
await navegador.close();
