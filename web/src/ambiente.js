// Fondo vivo: cubos de alambre como los del login de PRISMA, flotando lento detrás de todas las slides.
import * as THREE from 'three';

export function crearAmbiente(lienzo) {
  const renderizador = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderizador.setSize(1920, 1080, false);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(40, 1920 / 1080, 0.1, 100);
  camara.position.set(0, 0, 14);

  let semilla = 11;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const geometria = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const cubos = [];
  for (let i = 0; i < 34; i++) {
    const claro = azar() < 0.3;
    const malla = new THREE.LineSegments(geometria, new THREE.LineBasicMaterial({
      color: claro ? 0xd9f2f0 : 0x3cc2c2, transparent: true, opacity: claro ? 0.13 : 0.11, depthWrite: false,
    }));
    // Lejos de cámara y bien tenues: dan profundidad sin competir con el texto
    malla.position.set((azar() - 0.5) * 44, (azar() - 0.5) * 25, -8 - azar() * 16);
    malla.scale.setScalar(0.3 + azar() * 1.1);
    malla.rotation.set(azar() * 6, azar() * 6, azar() * 6);
    escena.add(malla);
    cubos.push({ malla, giro: new THREE.Vector3(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(0.25), flote: azar() * 6 });
  }

  const objetivo = { x: 0, y: 0 };
  let activo = false;
  let ultimo = performance.now();
  function cuadro(ahora) {
    if (!activo) return;
    const dt = Math.min((ahora - ultimo) / 1000, 0.05);
    ultimo = ahora;
    camara.position.x += (objetivo.x - camara.position.x) * 0.02;
    camara.position.y += (objetivo.y - camara.position.y) * 0.02;
    camara.lookAt(camara.position.x * 0.3, camara.position.y * 0.3, -6);
    for (const c of cubos) {
      c.malla.rotation.x += c.giro.x * dt;
      c.malla.rotation.y += c.giro.y * dt;
      c.malla.position.y += Math.sin(ahora / 2400 + c.flote) * 0.0015;
    }
    renderizador.render(escena, camara);
    requestAnimationFrame(cuadro);
  }

  return {
    iniciar() { if (!activo) { activo = true; ultimo = performance.now(); requestAnimationFrame(cuadro); } },
    // Cada slide mueve un poco la cámara: da profundidad al pasar de una a otra
    mover(indice) { objetivo.x = Math.sin(indice * 1.7) * 1.6; objetivo.y = Math.cos(indice * 1.3) * 0.9; },
  };
}
