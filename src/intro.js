// Animación de entrada de PRISMA.
// Todo el estado se calcula a partir del tiempo t (sin acumular física), así cada
// cuadro se puede renderizar por separado y el video termina siempre en la portada exacta.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const DURACION = 10.5;
export const ANCHO = 1920;
export const ALTO = 1080;

// Composición final de la portada (en px de 1920×1080)
export const PORTADA = {
  centroY: 470,       // centro vertical del isotipo + palabra
  alturaCubo: 300,    // alto en pantalla del cubo isométrico
  separacion: 56,     // espacio entre cubo y palabra
  tamanoPalabra: 200, // font-size de "prisma"
};

// ---------- utilidades deterministas ----------
const limitar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const tramo = (t, a, b) => limitar((t - a) / (b - a));
const suaveInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const suaveOut = (x) => 1 - Math.pow(1 - x, 3);
const suaveOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
const suaveIn = (x) => x * x * x;
// Mismo rebote que el CuboAnimado del sistema (c1 = 1.4)
const rebote = (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const mezclar = (a, b, x) => a + (b - a) * x;
const pulso = (x, tau) => (x <= 0 ? 0 : (x / tau) * Math.exp(1 - x / tau));

function generadorAleatorio(semilla) {
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let r = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- texturas de las caras (colores del logo y de CuboAnimado.tsx) ----------
function texturaGradiente(colorA, colorB, angulo = 135) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 512;
  const ctx = lienzo.getContext('2d');
  const rad = (angulo - 90) * Math.PI / 180;
  const dx = Math.cos(rad) * 256, dy = Math.sin(rad) * 256;
  const g = ctx.createLinearGradient(256 - dx, 256 - dy, 256 + dx, 256 + dy);
  g.addColorStop(0, colorA);
  g.addColorStop(1, colorB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const vertexPantalla = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragmentFondo = /* glsl */`
  uniform vec2 uCentro;      // centro del brillo en uv de pantalla
  uniform float uBrillo;
  uniform float uAspecto;
  varying vec2 vUv;
  void main() {
    // Colores de marca en sRGB, se pasan a lineal para que la salida coincida con o sin bloom
    vec3 base = pow(vec3(0.027, 0.055, 0.063), vec3(2.2));   // #070e10
    vec2 d = vUv - uCentro; d.x *= uAspecto;
    float halo = exp(-dot(d, d) * 5.5);
    vec3 teal = pow(vec3(0.176, 0.478, 0.482), vec3(2.2));   // #2d7a7b
    vec3 color = base + teal * halo * 0.16 * uBrillo;
    vec2 v = vUv - 0.5; v.x *= uAspecto;
    color *= 1.0 - smoothstep(0.55, 1.25, length(v)) * 0.6;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const vertexPiso = /* glsl */`
  varying vec3 vMundo;
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }
`;

const fragmentPiso = /* glsl */`
  uniform float uOpacidad;
  uniform float uRevelado;
  uniform vec3 uOndas[3];     // x, z, edad (s)
  uniform vec2 uContacto;     // posición del cubo sobre el piso
  uniform float uContactoBrillo;
  varying vec3 vMundo;
  float linea(float coord, float paso) {
    float f = abs(fract(coord / paso - 0.5) - 0.5) * paso;
    float w = fwidth(coord) * 1.2;
    return 1.0 - smoothstep(0.0, w, f);
  }
  void main() {
    vec2 p = vMundo.xz;
    float d = length(p);
    float rejilla = max(linea(p.x, 1.0), linea(p.y, 1.0)) * 0.55;
    rejilla *= 1.0 - smoothstep(4.0, 15.0, d);
    rejilla *= 1.0 - smoothstep(uRevelado - 1.5, uRevelado, d);
    vec3 teal = pow(vec3(0.235, 0.761, 0.761), vec3(2.2));   // #3cc2c2
    float alfa = rejilla * 0.32;
    vec3 color = teal * alfa;
    for (int i = 0; i < 3; i++) {
      float edad = uOndas[i].z;
      if (edad > 0.0 && edad < 1.6) {
        float r = edad * 5.2;
        float dist = length(p - uOndas[i].xy);
        float anillo = exp(-pow((dist - r) / 0.16, 2.0)) * (1.0 - edad / 1.6);
        float relleno = exp(-dist * dist * 1.5) * exp(-edad * 6.0);
        // Las ondas emiten por encima de 1.0 (HDR) para que solo ellas disparen el bloom
        color += teal * (anillo * 3.2 + relleno * 2.2);
        alfa += anillo * 0.9 + relleno * 0.5;
      }
    }
    float dc = length(p - uContacto);
    float contacto = exp(-dc * dc * 1.6) * uContactoBrillo;
    color += teal * contacto * 0.35;
    alfa += contacto * 0.35;
    float a = clamp(alfa, 0.0, 1.0) * uOpacidad;
    gl_FragColor = vec4(color / max(alfa, 0.001), a);
    #include <colorspace_fragment>
  }
`;

export function crearIntro({ lienzo, palabra, letras, escalaPixel = 1 }) {
  const renderizador = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderizador.setPixelRatio(escalaPixel);
  renderizador.setSize(ANCHO, ALTO, false);
  renderizador.setClearColor(0x000000, 0);
  renderizador.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(28, ANCHO / ALTO, 0.1, 200);

  // Fondo a pantalla completa dentro de WebGL (así el bloom no rompe la transparencia)
  const fondo = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: vertexPantalla,
      fragmentShader: fragmentFondo,
      depthWrite: false,
      depthTest: false,
      uniforms: { uCentro: { value: new THREE.Vector2(0.5, 0.5) }, uBrillo: { value: 0 }, uAspecto: { value: ANCHO / ALTO } },
    }),
  );
  fondo.frustumCulled = false;
  fondo.renderOrder = -10;
  escena.add(fondo);

  // Piso con rejilla y ondas de impacto
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.ShaderMaterial({
      vertexShader: vertexPiso,
      fragmentShader: fragmentPiso,
      transparent: true,
      depthWrite: false,
      extensions: { derivatives: true },
      uniforms: {
        uOpacidad: { value: 0 },
        uRevelado: { value: 0 },
        uOndas: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        uContacto: { value: new THREE.Vector2() },
        uContactoBrillo: { value: 0 },
      },
    }),
  );
  piso.rotation.x = -Math.PI / 2;
  escena.add(piso);

  // Cubo de marca: orden de caras de BoxGeometry = +x, -x, +y, -y, +z, -z
  const materialesCubo = [
    texturaGradiente('#1a4440', '#04100f'),
    texturaGradiente('#3f938d', '#0b2523', 160),
    texturaGradiente('#e9f3f2', '#6fa9a2', 120),
    texturaGradiente('#0f3532', '#010505'),
    texturaGradiente('#5bb3ad', '#17504c', 220),
    texturaGradiente('#1f4d49', '#020808'),
  ].map((map) => new THREE.MeshBasicMaterial({ map }));
  const geometriaCubo = new THREE.BoxGeometry(1, 1, 1);
  const cubo = new THREE.Mesh(geometriaCubo, materialesCubo);
  const bordesCubo = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometriaCubo),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }),
  );
  const brilloBordes = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometriaCubo),
    new THREE.LineBasicMaterial({ color: new THREE.Color(1.2, 3.2, 3.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  brilloBordes.scale.setScalar(1.002);
  const grupoCubo = new THREE.Group();
  grupoCubo.add(cubo, bordesCubo, brilloBordes);
  escena.add(grupoCubo);

  // Campo de cubos de alambre (como el fondo del login)
  const azar = generadorAleatorio(7);
  const geometriaAlambre = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  const alambres = [];
  for (let i = 0; i < 54; i++) {
    const claro = azar() < 0.35;
    const material = new THREE.LineBasicMaterial({
      color: claro ? 0xd9f2f0 : 0x3cc2c2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const malla = new THREE.LineSegments(geometriaAlambre, material);
    const radio = 3 + azar() * 9;
    const angulo = azar() * Math.PI * 2;
    alambres.push({
      malla,
      base: new THREE.Vector3(Math.cos(angulo) * radio, 0.4 + azar() * 5.5, Math.sin(angulo) * radio * 0.8 - 2.5),
      escala: 0.22 + azar() * 0.7,
      giro: new THREE.Vector3(azar() * 6, azar() * 6, azar() * 6),
      velocidad: new THREE.Vector3(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(0.5),
      deriva: new THREE.Vector3(azar() - 0.5, (azar() - 0.5) * 0.4, azar() - 0.5).multiplyScalar(0.25),
      opacidad: claro ? 0.55 : 0.42,
      aparicion: 0.3 + azar() * 1.6,
      absorcion: 5.55 + azar() * 1.1,
    });
    escena.add(malla);
  }

  // Posprocesado: el bloom solo se usa durante los impactos y se apaga antes de la portada
  const compositor = new EffectComposer(renderizador);
  compositor.setPixelRatio(escalaPixel);
  compositor.setSize(ANCHO, ALTO);
  compositor.addPass(new RenderPass(escena, camara));
  const bloom = new UnrealBloomPass(new THREE.Vector2(ANCHO, ALTO), 0.0, 0.55, 0.86);
  compositor.addPass(bloom);
  compositor.addPass(new OutputPass());

  // ---------- geometría de la portada ----------
  const posCamaraFinal = new THREE.Vector3(0, 0, 14);
  const pxPorUnidad = ALTO / (2 * posCamaraFinal.z * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)));
  // Un cubo isométrico de lado 1 mide √3·(2/√6)·… ≈ 1.633 de alto en proyección ortográfica
  const escalaFinal = PORTADA.alturaCubo / (1.633 * pxPorUnidad);
  const anchoCuboPx = 1.414 * escalaFinal * pxPorUnidad;

  const anchoPalabra = palabra ? palabra.getBoundingClientRect().width : 640;
  const anchoGrupo = anchoCuboPx + PORTADA.separacion + anchoPalabra;
  const izquierdaGrupo = (ANCHO - anchoGrupo) / 2;
  const centroCuboPx = izquierdaGrupo + anchoCuboPx / 2;
  const posCuboFinal = new THREE.Vector3(
    (centroCuboPx - ANCHO / 2) / pxPorUnidad,
    (ALTO / 2 - PORTADA.centroY) / pxPorUnidad,
    0,
  );
  if (palabra) {
    palabra.style.left = `${izquierdaGrupo + anchoCuboPx + PORTADA.separacion}px`;
    palabra.style.top = `${PORTADA.centroY}px`;
  }
  const centroBrillo = new THREE.Vector2(centroCuboPx / ANCHO, 1 - PORTADA.centroY / ALTO);

  // Orientaciones clave del cubo
  const qIso = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan(1 / Math.SQRT2))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4));
  const ejeZ = new THREE.Vector3(0, 0, 1);
  const ejeX = new THREE.Vector3(1, 0, 0);

  const T = {
    caida: [2.2, 3.25], botePico: 3.42, boteFin: 3.6,
    giro1: [3.8, 4.45], giro2: [4.75, 5.4],
    ascenso: [5.6, 7.5], encuadre: [7.3, 9.0],
    palabra: 8.0, quietud: 9.15,
  };
  const XAterrizaje = -1.0;
  const impactos = [
    { t: T.caida[1], x: XAterrizaje, z: 0 },
    // El rebote (c1 = 1.4) llega a 90° en el 41,7 % del tramo: ese es el instante del golpe
    { t: T.giro1[0] + 0.4167 * (T.giro1[1] - T.giro1[0]), x: XAterrizaje + 1, z: 0 },
    { t: T.giro2[0] + 0.4167 * (T.giro2[1] - T.giro2[0]), x: XAterrizaje + 2, z: 0 },
  ];

  const camDesde = new THREE.Vector3(0.4, 6.5, 17);
  const camHeroe = new THREE.Vector3(0.9, 2.5, 10.2);
  const miraDesde = new THREE.Vector3(0, 0, -1);
  const miraHeroe = new THREE.Vector3(0.2, 0.6, 0);
  const tmpQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const mira = new THREE.Vector3();

  function estadoCubo(t) {
    // Devuelve posición (centro) y orientación del cubo en el tiempo t (antes del ascenso)
    const pos = new THREE.Vector3(XAterrizaje, 0.5, 0);
    const q = new THREE.Quaternion();
    if (t < T.caida[1]) {
      const x = tramo(t, T.caida[0], T.caida[1]);
      pos.y = mezclar(7.5, 0.5, x * x);
      // Cae girando y aterriza con la cara clara hacia abajo (dos vuelcos la dejan arriba)
      const giro = (1 - x) * 1.35;
      q.setFromAxisAngle(ejeZ, Math.PI + giro * 1.9).multiply(tmpQ.setFromAxisAngle(ejeX, giro * 1.2));
      return { pos, q };
    }
    q.setFromAxisAngle(ejeZ, Math.PI);
    if (t < T.boteFin) {
      const subida = tramo(t, T.caida[1], T.botePico), bajada = tramo(t, T.botePico, T.boteFin);
      pos.y = 0.5 + (t < T.botePico ? suaveOut(subida) : 1 - suaveIn(bajada)) * 0.16;
      return { pos, q };
    }
    // Vuelcos sobre la arista inferior derecha, con el rebote de marca
    let vuelcos = 0, angulo = 0;
    for (const [a, b] of [T.giro1, T.giro2]) {
      if (t >= b) vuelcos += 1;
      else if (t > a) angulo = rebote(tramo(t, a, b)) * (Math.PI / 2);
    }
    // El sobrepaso del rebote no atraviesa el piso: el cubo se inclina sobre la arista siguiente
    if (angulo > Math.PI / 2) { vuelcos += 1; angulo -= Math.PI / 2; }
    const pivoteX = XAterrizaje + vuelcos + 0.5;
    const rel = new THREE.Vector3(-0.5, 0.5, 0).applyAxisAngle(ejeZ, -angulo);
    pos.set(pivoteX + rel.x, rel.y, 0);
    q.setFromAxisAngle(ejeZ, Math.PI - (vuelcos * Math.PI) / 2 - angulo);
    return { pos, q };
  }

  function componer(t, capas = { fondo: true, escena: true, palabra: true }) {
    t = limitar(t, 0, DURACION);

    // Cámara: desde arriba y lejos → vista héroe → encuadre frontal de la portada
    const llegada = suaveInOut(tramo(t, 0, 3.1));
    const encuadre = suaveInOut(tramo(t, T.encuadre[0], T.encuadre[1]));
    camara.position.lerpVectors(camDesde, camHeroe, llegada).lerp(posCamaraFinal, encuadre);
    mira.lerpVectors(miraDesde, miraHeroe, llegada).lerp(new THREE.Vector3(0, 0, 0), encuadre);
    // Sacudida mínima en cada impacto
    let sacudida = 0;
    for (const imp of impactos) sacudida += pulso(t - imp.t, 0.05) * (imp === impactos[0] ? 0.05 : 0.025);
    camara.position.y += Math.sin(t * 90) * sacudida;
    camara.lookAt(mira);

    // Cubo
    const asc = suaveInOut(tramo(t, T.ascenso[0], T.ascenso[1]));
    const e = estadoCubo(Math.min(t, T.ascenso[0]));
    const posAlto = new THREE.Vector3(0.2, 1.55, 0);
    const posPrevia = e.pos.clone().lerp(posAlto, asc);
    grupoCubo.position.copy(posPrevia).lerp(posCuboFinal, encuadre);
    tmpQ.copy(e.q).slerp(qIso, asc);
    grupoCubo.quaternion.copy(tmpQ);
    grupoCubo.scale.setScalar(mezclar(1, escalaFinal, encuadre));
    grupoCubo.visible = t >= T.caida[0];

    // Absorción: el brillo de bordes sube mientras entran los cubos de alambre y se apaga al final
    const absorbido = tramo(t, 5.6, 7.0);
    const destello = pulso(t - 7.05, 0.22);
    let brilloImpacto = 0;
    for (const imp of impactos) brilloImpacto += pulso(t - imp.t, 0.08);
    brilloBordes.material.opacity = limitar(brilloImpacto * 0.6 + absorbido * 0.35 * (1 - tramo(t, 7.4, 8.6)) + destello * 0.8);

    // Piso
    const uPiso = piso.material.uniforms;
    uPiso.uRevelado.value = mezclar(0, 22, suaveOutExpo(tramo(t, 0.15, 2.6)));
    uPiso.uOpacidad.value = 1 - suaveInOut(tramo(t, 6.0, 7.6));
    impactos.forEach((imp, i) => uPiso.uOndas.value[i].set(imp.x, imp.z, t - imp.t));
    uPiso.uContacto.value.set(grupoCubo.position.x, grupoCubo.position.z);
    uPiso.uContactoBrillo.value = tramo(t, 2.4, 3.25) * (1 - asc);
    piso.visible = uPiso.uOpacidad.value > 0.001;

    // Cubos de alambre
    for (const a of alambres) {
      const aparece = suaveOut(tramo(t, a.aparicion, a.aparicion + 1.2));
      const va = suaveIn(tramo(t, a.absorcion, a.absorcion + 0.9));
      tmpV.copy(a.base).addScaledVector(a.deriva, t);
      for (const imp of impactos) {
        const dir = new THREE.Vector3(tmpV.x - imp.x, 0, tmpV.z - imp.z);
        const dist = Math.max(dir.length(), 0.5);
        dir.normalize();
        const fuerza = pulso(t - imp.t - dist * 0.04, 0.22) * (imp === impactos[0] ? 0.55 : 0.32) / (1 + dist * 0.25);
        tmpV.addScaledVector(dir, fuerza);
        tmpV.y += fuerza * 0.4;
      }
      a.malla.position.copy(tmpV).lerp(grupoCubo.position, va);
      a.malla.rotation.set(a.giro.x + a.velocidad.x * t, a.giro.y + a.velocidad.y * t, a.giro.z + a.velocidad.z * t);
      a.malla.scale.setScalar(a.escala * (1 - va * 0.92));
      a.malla.material.opacity = a.opacidad * aparece * (1 - tramo(t, a.absorcion + 0.6, a.absorcion + 0.95));
      a.malla.visible = a.malla.material.opacity > 0.002;
    }

    // Fondo
    const uFondo = fondo.material.uniforms;
    const centroCubo = grupoCubo.position.clone().project(camara);
    uFondo.uCentro.value.set(centroCubo.x * 0.5 + 0.5, centroCubo.y * 0.5 + 0.5).lerp(centroBrillo, encuadre);
    uFondo.uBrillo.value = mezclar(0.35, 1, tramo(t, 2.0, 3.4)) * tramo(t, 0, 1.2);

    // Bloom: solo durante la acción; en la portada queda apagado para que coincida con las capas del PPTX
    const intensidadBloom = (0.35 + brilloImpacto * 0.5 + destello * 0.6) * (1 - tramo(t, 8.2, T.quietud)) * tramo(t, 0.2, 1.0);
    bloom.strength = intensidadBloom;

    // Palabra "prisma": cada letra sube detrás de una máscara
    if (letras) {
      letras.forEach((letra, i) => {
        const p = suaveOutExpo(tramo(t, T.palabra + i * 0.07, T.palabra + i * 0.07 + 0.75));
        letra.style.transform = `translateY(${(1 - p) * 105}%)`;
        letra.style.opacity = String(limitar(p * 1.6));
      });
    }

    fondo.visible = capas.fondo;
    const escenaVisible = capas.escena;
    grupoCubo.visible = grupoCubo.visible && escenaVisible;
    piso.visible = piso.visible && escenaVisible;
    for (const a of alambres) a.malla.visible = a.malla.visible && escenaVisible;
    if (palabra) palabra.style.visibility = capas.palabra ? 'visible' : 'hidden';

    if (intensidadBloom > 0.001 && capas.fondo) compositor.render();
    else renderizador.render(escena, camara);
  }

  return { componer, duracion: DURACION };
}
