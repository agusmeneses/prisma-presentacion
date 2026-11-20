// Arma el PPTX base (contenido editable + imágenes + video) y le inyecta la transición Morph.
// Las animaciones, la reproducción automática y la incrustación de fuentes las agrega postproceso.ps1 con PowerPoint.
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const PX = 1 / 144; // 1920 px = 13,333 in
const pulg = (px) => +(px * PX).toFixed(4);
const salida = path.resolve('salida');
const piezas = path.join(salida, 'piezas');
const capas = path.join(salida, 'capas');
const MARGEN_PIEZA = 120; // margen de sombra con que se exportaron las piezas (px CSS)

const COLOR = {
  fondo: '070E10', texto: 'FFFFFF', secundario: '8BA3A6', atenuado: '5A7376', brillante: '3CC2C2',
};
const FUENTE = { titular: 'Chillax Medium', cuerpo: 'Poppins Light', cuerpoMedia: 'Poppins Medium' };

// Primer cuadro del video como póster, para que no se vea nada antes de que arranque
const poster = path.join(capas, 'poster-intro.png');
spawnSync(ffmpeg, ['-y', '-i', path.join(salida, 'intro-prisma.mp4'), '-frames:v', '1', poster]);

const leerCaja = (nombre) => JSON.parse(fs.readFileSync(path.join(piezas, `${nombre}.json`), 'utf8'));
const cajaCubo = leerCaja('portada-cubo');
const cajaPalabra = leerCaja('portada-palabra');

// Ubica una pieza exportada con margen de sombra: (x, y, ancho) describen la tarjeta visible
function pieza(slide, nombre, { x, y, ancho, anchoCss, rotar = 0, objectName }) {
  const escala = ancho / anchoCss;
  const archivo = path.join(piezas, `${nombre}.png`);
  const { width, height } = tamanoPng(archivo);
  const anchoImg = (width / 2) * escala;
  const altoImg = (height / 2) * escala;
  slide.addImage({
    path: archivo,
    x: pulg(x - MARGEN_PIEZA * escala), y: pulg(y - MARGEN_PIEZA * escala),
    w: pulg(anchoImg), h: pulg(altoImg),
    rotate: rotar, objectName: objectName ?? nombre, altText: nombre,
  });
}

function tamanoPng(archivo) {
  const b = fs.readFileSync(archivo);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function logoChico(slide) {
  // Misma proporción y separación que el isotipo + palabra de la portada, para que Morph los encoja
  const s = 64 / cajaCubo.h;
  const x0 = 96, y0 = 60;
  slide.addImage({ path: path.join(piezas, 'portada-cubo.png'), x: pulg(x0), y: pulg(y0), w: pulg(cajaCubo.w * s), h: pulg(cajaCubo.h * s), objectName: '!!cubo', altText: 'Isotipo de PRISMA' });
  slide.addImage({
    path: path.join(piezas, 'portada-palabra.png'),
    x: pulg(x0 + (cajaPalabra.x - cajaCubo.x) * s), y: pulg(y0 + (cajaPalabra.y - cajaCubo.y) * s),
    w: pulg(cajaPalabra.w * s), h: pulg(cajaPalabra.h * s), objectName: '!!palabra', altText: 'prisma',
  });
}

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'PRISMA · Presentación comercial';
pres.author = 'Equipo PRISMA';

// ---------- 1. Intro ----------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR.fondo };
  slide.addMedia({ type: 'video', path: path.join(salida, 'intro-prisma.mp4'), cover: `image/png;base64,${fs.readFileSync(poster).toString('base64')}`, x: 0, y: 0, w: 13.333, h: 7.5, objectName: 'video-intro' });
  slide.addNotes('Arranca solo. Dejar correr la animación (10 s) sin hablar. Termina en la portada: un clic pasa a la portada editable sin que se note el cambio.');
}

// ---------- 2. Portada ----------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR.fondo };
  slide.addImage({ path: path.join(capas, 'portada-fondo.png'), x: 0, y: 0, w: 13.333, h: 7.5, objectName: '!!fondo', altText: 'Fondo' });
  slide.addImage({ path: path.join(piezas, 'portada-cubo.png'), x: pulg(cajaCubo.x), y: pulg(cajaCubo.y), w: pulg(cajaCubo.w), h: pulg(cajaCubo.h), objectName: '!!cubo', altText: 'Isotipo de PRISMA' });
  slide.addImage({ path: path.join(piezas, 'portada-palabra.png'), x: pulg(cajaPalabra.x), y: pulg(cajaPalabra.y), w: pulg(cajaPalabra.w), h: pulg(cajaPalabra.h), objectName: '!!palabra', altText: 'prisma' });
  slide.addText('El mantenimiento de tu empresa, en un solo lugar.', {
    x: pulg(360), y: pulg(668), w: pulg(1200), h: pulg(70),
    fontFace: FUENTE.cuerpo, fontSize: 21, color: COLOR.secundario, align: 'center', valign: 'middle',
    margin: 0, isTextBox: true, objectName: 'bajada-portada',
  });
  slide.addNotes('Presentarse: "Soy Agus y les vengo a presentar PRISMA". Pausa breve antes de pasar al problema.');
}

// ---------- 3. El problema ----------
{
  const slide = pres.addSlide();
  slide.background = { color: COLOR.fondo };
  slide.addImage({ path: path.join(piezas, 'fondo-problema.png'), x: 0, y: 0, w: 13.333, h: 7.5, objectName: '!!fondo', altText: 'Fondo' });
  logoChico(slide);

  slide.addText('EL PROBLEMA', {
    x: pulg(96), y: pulg(196), w: pulg(600), h: pulg(40), fontFace: FUENTE.cuerpoMedia, fontSize: 13,
    color: COLOR.brillante, charSpacing: 4, margin: 0, isTextBox: true, objectName: 'etiqueta-problema',
  });
  slide.addText([{ text: 'Hoy, el mantenimiento', options: { breakLine: true } }, { text: 'vive en cualquier lado' }], {
    x: pulg(96), y: pulg(244), w: pulg(900), h: pulg(180), fontFace: FUENTE.titular, fontSize: 34,
    color: COLOR.texto, valign: 'top', margin: 0, lineSpacingMultiple: 0.95, isTextBox: true, objectName: 'titulo-problema',
  });

  const dolores = [
    ['icono-pedidos', 'Los pedidos llegan por WhatsApp, mail o en el pasillo, y se pierden.'],
    ['icono-historial', 'Nadie sabe qué se le hizo a cada equipo ni cuándo.'],
    ['icono-preventivos', 'Los preventivos dependen de que alguien se acuerde.'],
    ['icono-datos', 'Sin datos no hay forma de medir tiempos ni de mejorar.'],
  ];
  dolores.forEach(([icono, texto], i) => {
    const y = 500 + i * 120;
    pieza(slide, icono, { x: 96, y, ancho: 76, anchoCss: 88, objectName: `dolor-icono-${i + 1}` });
    slide.addText(texto, {
      x: pulg(204), y: pulg(y - 4), w: pulg(800), h: pulg(84), fontFace: FUENTE.cuerpo, fontSize: 15,
      color: 'D6E1E2', valign: 'middle', margin: 0, isTextBox: true, objectName: `dolor-texto-${i + 1}`,
    });
  });

  // Collage del caos (las piezas son imágenes: ilustran, no se editan)
  pieza(slide, 'caos-chat', { x: 1090, y: 150, ancho: 470, anchoCss: 520, rotar: -4, objectName: 'caos-chat' });
  pieza(slide, 'caos-postit', { x: 1560, y: 110, ancho: 260, anchoCss: 300, rotar: 7, objectName: 'caos-postit' });
  pieza(slide, 'caos-planilla', { x: 1180, y: 600, ancho: 560, anchoCss: 560, rotar: 3, objectName: 'caos-planilla' });
  pieza(slide, 'caos-llamadas', { x: 1060, y: 900, ancho: 420, anchoCss: 470, rotar: -2, objectName: 'caos-llamadas' });

  slide.addNotes('Contar el problema con ejemplos cotidianos: el aire que no enfría, la planilla que nadie actualiza, el preventivo que se olvidó. No dar cifras.');
}

const base = path.join(salida, 'prueba-base.pptx');
await pres.writeFile({ fileName: base });

// ---------- Morph en la slide 3 (pptxgenjs no escribe transiciones) ----------
const MORPH = '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
  + '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
  + '<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" spd="slow" p14:dur="1600"><p159:morph option="byObject"/></p:transition>'
  + '</mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>';

const zip = await JSZip.loadAsync(fs.readFileSync(base));
for (const numero of [3]) {
  const ruta = `ppt/slides/slide${numero}.xml`;
  let xml = await zip.file(ruta).async('string');
  xml = xml.includes('</p:clrMapOvr>')
    ? xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${MORPH}`)
    : xml.replace('</p:cSld>', `</p:cSld>${MORPH}`);
  zip.file(ruta, xml);
}
fs.writeFileSync(base, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(base);
