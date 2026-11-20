// Muestra qué quedó dentro del PPTX final: fuentes incrustadas, medios, Morph, animaciones y tiempos por slide.
import JSZip from 'jszip';
import fs from 'node:fs';

const archivo = process.argv[2] ?? 'salida/PRISMA-prueba.pptx';
const zip = await JSZip.loadAsync(fs.readFileSync(archivo));
const presentacion = await zip.file('ppt/presentation.xml').async('string');
const fuentes = [...presentacion.matchAll(/<p:embeddedFont><p:font typeface="([^"]+)"/g)].map((m) => m[1]);
console.log('Fuentes incrustadas:', fuentes.join(', ') || 'ninguna');
console.log('Medios:', Object.keys(zip.files).filter((f) => f.startsWith('ppt/media/')).length);
const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/g).pop()) - Number(b.match(/\d+/g).pop()));
for (const ruta of slides) {
  const xml = await zip.file(ruta).async('string');
  const efectos = (xml.match(/presetClass="entr"/g) ?? []).length;
  const media = /presetClass="mediacall"|<p:video>/.test(xml);
  const avance = xml.match(/advTm="(\d+)"/)?.[1];
  console.log(`${ruta.split('/').pop()}: morph=${/p159:morph/.test(xml)} entradas=${efectos} video=${media} avance=${avance ?? '-'}ms`);
}
