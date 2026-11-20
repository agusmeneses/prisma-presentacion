// Teléfono 3D con la pantalla "Mis tareas" del técnico y una notificación que entra en vivo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import pantallaUrl from '../generado/telefono-pantalla.png';
import avisoUrl from '../generado/telefono-aviso.png';
import medidasAviso from '../generado/telefono-aviso.json';

const ANCHO = 2.145, ALTO = 4.41, GROSOR = 0.24, RADIO = 0.32;

function rectanguloRedondeado(w, h, r) {
  const forma = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  forma.moveTo(x + r, y);
  forma.lineTo(x + w - r, y); forma.quadraticCurveTo(x + w, y, x + w, y + r);
  forma.lineTo(x + w, y + h - r); forma.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  forma.lineTo(x + r, y + h); forma.quadraticCurveTo(x, y + h, x, y + h - r);
  forma.lineTo(x, y + r); forma.quadraticCurveTo(x, y, x + r, y);
  const geometria = new THREE.ShapeGeometry(forma, 24);
  // UV normalizadas al rectángulo para que la textura cubra toda la pantalla
  const uv = geometria.attributes.uv;
  const pos = geometria.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return geometria;
}

function textura(url) {
  const t = new THREE.TextureLoader().load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function crearTelefono(lienzo) {
  const renderizador = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderizador.setSize(940, 1080, false);
  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;

  const escena = new THREE.Scene();
  escena.environment = new THREE.PMREMGenerator(renderizador).fromScene(new RoomEnvironment(), 0.04).texture;
  const camara = new THREE.PerspectiveCamera(30, 940 / 1080, 0.1, 100);
  camara.position.set(0, 0.25, 11.0);

  const telefono = new THREE.Group();
  const cuerpo = new THREE.Mesh(
    new RoundedBoxGeometry(ANCHO, ALTO, GROSOR, 8, RADIO),
    new THREE.MeshPhysicalMaterial({ color: 0x1d3134, metalness: 0.85, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  );
  telefono.add(cuerpo);
  const marco = new THREE.Mesh(rectanguloRedondeado(ANCHO - 0.07, ALTO - 0.07, RADIO - 0.03), new THREE.MeshBasicMaterial({ color: 0x020404 }));
  marco.position.z = GROSOR / 2 + 0.001;
  telefono.add(marco);
  const anchoPantalla = ANCHO - 0.17, altoPantalla = ALTO - 0.17;
  const pantalla = new THREE.Mesh(
    rectanguloRedondeado(anchoPantalla, altoPantalla, RADIO - 0.08),
    new THREE.MeshBasicMaterial({ map: textura(pantallaUrl), toneMapped: false }),
  );
  pantalla.position.z = GROSOR / 2 + 0.002;
  telefono.add(pantalla);
  const isla = new THREE.Mesh(rectanguloRedondeado(0.62, 0.18, 0.09), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  isla.position.set(0, altoPantalla / 2 - 0.17, GROSOR / 2 + 0.004);
  telefono.add(isla);
  for (const [y, h] of [[0.95, 0.45], [0.35, 0.45]]) {
    const boton = new THREE.Mesh(new RoundedBoxGeometry(0.04, h, 0.08, 2, 0.02), cuerpo.material);
    boton.position.set(-ANCHO / 2 - 0.012, y, 0);
    telefono.add(boton);
  }

  // Notificación: una placa apenas por encima de la pantalla (390 px de ancho de pantalla → 362 px de aviso)
  const anchoAviso = anchoPantalla * (362 / 390);
  const materialAviso = new THREE.MeshBasicMaterial({ map: textura(avisoUrl), transparent: true, opacity: 0, toneMapped: false });
  const aviso = new THREE.Mesh(new THREE.PlaneGeometry(anchoAviso, anchoAviso * (medidasAviso.alto / medidasAviso.ancho)), materialAviso);
  aviso.position.set(0, altoPantalla / 2 - 0.62, GROSOR / 2 + 0.01);
  telefono.add(aviso);
  escena.add(telefono);

  const luz = new THREE.DirectionalLight(0xbff5f2, 1.4);
  luz.position.set(-3, 4, 6);
  escena.add(luz);

  const estado = { entrada: 0, aviso: 0 };
  let activo = false;
  function cuadro(ahora) {
    if (!activo) return;
    const t = ahora / 1000;
    const e = estado.entrada;
    telefono.position.set(0.15, (1 - e) * -6.5, 0);
    telefono.rotation.set(0.06 + Math.sin(t * 0.6) * 0.03, -0.42 + (1 - e) * -1.6 + Math.sin(t * 0.45) * 0.08, -0.05 + (1 - e) * 0.3);
    materialAviso.opacity = estado.aviso;
    aviso.position.y = altoPantalla / 2 - 0.62 + (1 - estado.aviso) * 0.35;
    renderizador.render(escena, camara);
    requestAnimationFrame(cuadro);
  }

  return {
    estado,
    iniciar() { if (!activo) { activo = true; requestAnimationFrame(cuadro); } },
    detener() { activo = false; },
  };
}
