// Descarga Chillax desde Fontshare. Su licencia (ITF FFL) no permite redistribuirla en un repositorio,
// así que cada persona obtiene su propia copia oficial al instalar dependencias.
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';

const destino = path.resolve('assets/fuentes/chillax/Chillax_Complete/Fonts/WEB/fonts');
const necesarias = ['Chillax-Regular.ttf', 'Chillax-Medium.ttf', 'Chillax-Semibold.ttf'];

if (necesarias.every((f) => fs.existsSync(path.join(destino, f)))) {
  console.log('Chillax ya está descargada.');
} else {
  console.log('Descargando Chillax desde Fontshare (licencia ITF Free Font License)…');
  const respuesta = await fetch('https://api.fontshare.com/v2/fonts/download/chillax');
  if (!respuesta.ok) throw new Error(`No se pudo descargar Chillax (HTTP ${respuesta.status}). Revisá la conexión y volvé a correr npm install.`);
  const zip = await JSZip.loadAsync(await respuesta.arrayBuffer());
  fs.mkdirSync(destino, { recursive: true });
  for (const nombre of necesarias) {
    const entrada = zip.file(new RegExp(`Fonts/WEB/fonts/${nombre}$`))[0];
    if (!entrada) throw new Error(`El paquete de Fontshare no trae ${nombre}`);
    fs.writeFileSync(path.join(destino, nombre), await entrada.async('nodebuffer'));
  }
  const licencia = zip.file(/License\/FFL\.txt$/)[0];
  if (licencia) fs.writeFileSync(path.resolve('assets/fuentes/chillax/FFL.txt'), await licencia.async('nodebuffer'));
  console.log('Chillax lista.');
}
