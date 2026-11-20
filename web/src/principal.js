// Motor de la presentación PRISMA: intro en video, navegación, logo compartido entre slides (efecto Morph)
// y la animación de entrada de cada slide.
import gsap from 'gsap';
import { crearAmbiente } from './ambiente.js';
import { crearTelefono } from './telefono.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const parametros = new URLSearchParams(location.search);

// ---------- escala del escenario 1920×1080 a la ventana ----------
const escala = $('#escala');
function ajustarEscala() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  escala.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
}
addEventListener('resize', ajustarEscala);
ajustarEscala();

// ---------- títulos palabra por palabra ----------
function envolverPalabras(nodo) {
  for (const hijo of [...nodo.childNodes]) {
    if (hijo.nodeType === Node.TEXT_NODE) {
      const fragmento = document.createDocumentFragment();
      for (const parte of hijo.textContent.split(/(\s+)/)) {
        if (!parte) continue;
        if (/^\s+$/.test(parte)) { fragmento.append(document.createTextNode(parte)); continue; }
        const mascara = document.createElement('span');
        mascara.className = 'palabra-mascara';
        const palabra = document.createElement('span');
        palabra.textContent = parte;
        mascara.append(palabra);
        fragmento.append(mascara);
      }
      hijo.replaceWith(fragmento);
    } else if (hijo.nodeType === Node.ELEMENT_NODE) {
      envolverPalabras(hijo);
    }
  }
}
$$('[data-palabras]').forEach(envolverPalabras);
const palabrasDe = (el) => $$('.palabra-mascara > span', el);
function revelar(tl, el, posicion, opciones = {}) {
  tl.from(palabrasDe(el), { yPercent: 115, duration: 0.95, ease: 'expo.out', stagger: 0.045, ...opciones }, posicion);
}
function subir(tl, objetivos, posicion, opciones = {}) {
  tl.from(objetivos, { y: 40, opacity: 0, filter: 'blur(10px)', duration: 0.9, ease: 'expo.out', stagger: 0.09, ...opciones }, posicion);
}

// ---------- logo compartido ----------
const CUBO = { x: 457, y: 325, w: 279, h: 298 };
const PALABRA = { x: 801, y: 387, w: 634, h: 185 };
const logoCubo = $('#logo .logo-cubo');
const logoPalabra = $('#logo .logo-palabra');
Object.assign(logoCubo.style, { width: `${CUBO.w}px`, height: `${CUBO.h}px` });
Object.assign(logoPalabra.style, { width: `${PALABRA.w}px`, height: `${PALABRA.h}px` });
function posicionesLogo(modo) {
  if (modo === 'portada') return { cubo: { ...CUBO, s: 1 }, palabra: { ...PALABRA, s: 1 } };
  if (modo === 'cierre') return { cubo: { ...CUBO, y: CUBO.y - 120, s: 1 }, palabra: { ...PALABRA, y: PALABRA.y - 120, s: 1 } };
  // Esquina superior derecha, misma proporción que en la portada
  const s = 58 / CUBO.h;
  const ancho = (PALABRA.x + PALABRA.w - CUBO.x) * s;
  const x0 = 1920 - 96 - ancho, y0 = 58;
  return {
    cubo: { x: x0, y: y0, s },
    palabra: { x: x0 + (PALABRA.x - CUBO.x) * s, y: y0 + (PALABRA.y - CUBO.y) * s, s },
  };
}
function moverLogo(modo, inmediato = false) {
  const p = posicionesLogo(modo);
  const comun = { duration: inmediato ? 0 : 1.25, ease: 'expo.inOut', overwrite: true };
  gsap.to(logoCubo, { x: p.cubo.x, y: p.cubo.y, scale: p.cubo.s, ...comun });
  gsap.to(logoPalabra, { x: p.palabra.x, y: p.palabra.y, scale: p.palabra.s, ...comun, delay: inmediato ? 0 : 0.04 });
}

// ---------- capas globales ----------
const fondo = $('#fondo');
const ambiente = crearAmbiente($('#ambiente'));
const telefono = crearTelefono($('#telefono'));
const notas = $('#notas');
const progreso = $('#progreso');

// ---------- definición de slides ----------
const LOGO_ESQUINA = 'esquina';
const definiciones = {
  portada: {
    logo: 'portada', halo: [50, 45],
    construir(tl, el) {
      revelar(tl, $('.portada-bajada', el), 0.15, { duration: 1.1, stagger: 0.06 });
    },
  },

  problema: {
    logo: LOGO_ESQUINA, halo: [78, 50],
    construir(tl, el) {
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.5);
      revelar(tl, $('.titulo', el), 0.6);
      const piezas = $$('.pieza', el);
      tl.from(piezas, { opacity: 0, scale: 0.6, rotation: '+=12', y: 60, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.22 }, 1.1);
      subir(tl, $$('.dolor', el), 1.9, { stagger: 0.18 });
      // Flotación permanente de las piezas del caos
      piezas.forEach((p, i) => gsap.to(p.firstElementChild, { y: 10, rotation: i % 2 ? 1.2 : -1.2, duration: 2.6 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    },
  },

  solucion: {
    logo: LOGO_ESQUINA, halo: [50, 50],
    preparar(el) {
      // Copia exacta del caos de la slide anterior, en el mismo lugar, para que la transición sea continua
      const copia = $('.caos-copia', el);
      copia.innerHTML = $('[data-slide="problema"] .caos').innerHTML;
    },
    construir(tl, el) {
      const nucleo = $('.nucleo', el);
      const cubo = $('img', nucleo);
      tl.from(cubo, { scale: 0, rotation: -90, duration: 0.9, ease: 'back.out(1.7)' }, 0.1);
      tl.to($('.halo', nucleo), { opacity: 0.7, duration: 0.8 }, 0.2);
      $$('.caos-copia .pieza', el).forEach((pieza, i) => {
        const cx = pieza.offsetLeft + pieza.offsetWidth / 2;
        const cy = pieza.offsetTop + pieza.offsetHeight / 2;
        tl.to(pieza, { x: 960 - cx, y: 540 - cy, scale: 0.05, rotation: `+=${i % 2 ? 120 : -120}`, opacity: 0, duration: 0.95, ease: 'power3.in' }, 0.55 + i * 0.12);
      });
      tl.fromTo($('.onda', nucleo), { scale: 0.3, opacity: 1 }, { scale: 3.2, opacity: 0, duration: 1.1, ease: 'expo.out' }, 1.75);
      tl.to(cubo, { scale: 1.18, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 }, 1.7);
      tl.to($('.halo', nucleo), { opacity: 1, scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 }, 1.7);
      // El cubo vuela a la esquina y se funde con el logo
      const destino = posicionesLogo(LOGO_ESQUINA).cubo;
      tl.to(nucleo, { x: destino.x + 29 - 960, y: destino.y + 31 - 540, scale: 0.25, duration: 1.1, ease: 'expo.inOut' }, 2.3);
      tl.to(nucleo, { opacity: 0, duration: 0.3 }, 3.1);
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 2.5);
      revelar(tl, $('.titulo', el), 2.55);
      revelar(tl, $('.bajada', el), 2.9, { duration: 0.8, stagger: 0.02 });
      subir(tl, $$('.verbo', el), 3.2, { stagger: 0.12 });
      tl.from($$('.tarjetas-reales .recorte', el), { x: 160, opacity: 0, rotationY: -18, transformPerspective: 1400, duration: 1.1, ease: 'expo.out', stagger: 0.16 }, 2.8);
    },
  },

  roles: {
    logo: LOGO_ESQUINA, halo: [50, 42],
    preparar(el) {
      // Caras del cubo con los mismos degradados del ícono de carga del sistema
      const caras = [
        ['translateZ(100px)', 'linear-gradient(135deg,#2f7770,#123f3c)'],
        ['rotateY(180deg) translateZ(100px)', 'linear-gradient(135deg,#1f4d49,#020808)'],
        ['rotateY(90deg) translateZ(100px)', 'linear-gradient(135deg,#1a4440,#04100f)'],
        ['rotateY(-90deg) translateZ(100px)', 'linear-gradient(135deg,#34817a,#164541)'],
        ['rotateX(90deg) translateZ(100px)', 'linear-gradient(135deg,#e9f3f2,#6fa9a2)'],
        ['rotateX(-90deg) translateZ(100px)', 'linear-gradient(135deg,#0f3532,#010505)'],
      ];
      $$('.cubo3d i', el).forEach((cara, i) => { cara.style.transform = caras[i][0]; cara.style.background = caras[i][1]; });
    },
    construir(tl, el) {
      const cubo = $('.cubo3d', el);
      const roles = $$('.rol', el);
      roles.forEach((r) => r.classList.remove('encendido'));
      gsap.set(cubo, { rotationX: -28, rotationY: 40 });
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      tl.from(cubo, { scale: 0, duration: 0.9, ease: 'back.out(1.6)' }, 0.5);
      tl.from($$('.conectores path', el), { opacity: 0, duration: 0.8, stagger: 0.25 }, 1.0);
      roles.forEach((rol, i) => {
        const t = 1.2 + i * 1.1;
        // Vuelco de 90° con el rebote de marca (como el loader de PRISMA)
        tl.to(cubo, { [i % 2 ? 'rotationX' : 'rotationZ']: `+=${i === 1 ? -90 : 90}`, duration: 0.75, ease: 'back.out(1.4)' }, t);
        tl.from(rol, { y: 50, opacity: 0, duration: 0.9, ease: 'expo.out' }, t + 0.1);
        tl.call(() => { roles.forEach((r) => r.classList.toggle('encendido', r === rol)); }, null, t + 0.1);
      });
      gsap.to($$('.conectores path', el), { strokeDashoffset: -140, duration: 4, ease: 'none', repeat: -1 });
    },
  },

  entrega: {
    logo: LOGO_ESQUINA, halo: [70, 55],
    construir(tl, el) {
      const pasos = $$('.paso-entrega', el);
      const ventanas = $$('.pila .ventana', el);
      const relleno = $('.barra-carga .riel i', el);
      const porcentaje = $('.barra-carga b', el);
      pasos.forEach((p) => p.classList.remove('hecho', 'actual'));
      porcentaje.textContent = '0 %';
      gsap.set(ventanas, { opacity: 0 });
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      revelar(tl, $('.bajada', el), 0.7, { duration: 0.8, stagger: 0.02 });
      subir(tl, pasos, 0.9, { stagger: 0.05, filter: 'blur(0px)' });
      tl.from($('.barra-carga', el), { opacity: 0, duration: 0.6 }, 1.2);
      const contador = { v: 0 };
      ventanas.forEach((ventana, k) => {
        const t = 1.6 + k * 0.82;
        tl.fromTo(ventana, { y: 240, opacity: 0, rotationX: -28, scale: 0.92 }, { y: 0, opacity: 1, rotationX: 0, scale: 1, duration: 0.8, ease: 'expo.out' }, t);
        for (let j = 0; j < k; j++) {
          const profundidad = k - j;
          tl.to(ventanas[j], { y: -34 * profundidad, scale: 1 - 0.05 * profundidad, opacity: profundidad >= 4 ? 0 : 1 - 0.22 * profundidad, duration: 0.7, ease: 'expo.out' }, t);
        }
        tl.call(() => pasos.forEach((p, i) => { p.classList.toggle('hecho', i < k); p.classList.toggle('actual', i === k); }), null, t);
        tl.to(relleno, { width: `${((k + 1) / ventanas.length) * 100}%`, duration: 0.8, ease: 'power2.out' }, t);
        tl.to(contador, { v: ((k + 1) / ventanas.length) * 100, duration: 0.8, ease: 'power2.out', onUpdate: () => { porcentaje.textContent = `${Math.round(contador.v)} %`; } }, t);
      });
      const fin = 1.6 + ventanas.length * 0.82 + 0.3;
      tl.call(() => pasos.forEach((p) => { p.classList.add('hecho'); p.classList.remove('actual'); }), null, fin);
      tl.from($('.sello', el), { scale: 0.6, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, fin);
      tl.from($('.sello .circulo', el), { scale: 0, rotation: -90, duration: 0.8, ease: 'back.out(2)' }, fin + 0.15);
    },
  },

  nube: {
    logo: LOGO_ESQUINA, halo: [50, 40],
    construir(tl, el) {
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      const nodos = $$('.nodo', el);
      tl.from(nodos[2], { scale: 0.7, opacity: 0, duration: 0.9, ease: 'back.out(1.6)' }, 0.9);
      subir(tl, [nodos[0], nodos[1]], 1.2);
      subir(tl, [nodos[3], nodos[4]], 1.5);
      tl.from($$('.flujo .linea, .flujo .datos', el), { opacity: 0, duration: 0.8, stagger: 0.08 }, 1.4);
      gsap.to($$('.flujo .datos', el), { strokeDashoffset: -280, duration: 2.2, ease: 'none', repeat: -1 });
      tl.from($('.alta-titulo', el), { opacity: 0, x: -20, duration: 0.6 }, 2.2);
      const altas = $$('.alta', el);
      subir(tl, altas, 2.3, { stagger: 0.22 });
      const punto = $('.punto-viaje', el);
      const centros = altas.map((a) => a.offsetLeft + a.offsetWidth / 2);
      tl.set(punto, { x: centros[0], y: 870, opacity: 1 }, 3.4);
      centros.slice(1).forEach((x, i) => {
        tl.to(punto, { x, duration: 0.7, ease: 'power2.inOut' }, 3.5 + i * 0.85);
        tl.fromTo(altas[i + 1], { boxShadow: '0 0 0 rgba(60,194,194,0)' }, { boxShadow: '0 0 50px rgba(60,194,194,.35)', duration: 0.35, yoyo: true, repeat: 1 }, 4.1 + i * 0.85);
      });
      tl.to(punto, { scale: 2.2, opacity: 0, duration: 0.6 }, 3.5 + 3 * 0.85);
    },
  },

  ciclo: {
    logo: LOGO_ESQUINA, halo: [50, 45],
    construir(tl, el) {
      const etapas = $$('.etapa', el);
      const detalles = $$('.detalle-ciclo > *', el);
      etapas.forEach((e) => e.classList.remove('activa'));
      gsap.set(detalles, { opacity: 0 });
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      tl.from($('.en-vivo', el), { opacity: 0, y: -10, duration: 0.6 }, 0.9);
      subir(tl, etapas, 0.8, { stagger: 0.1 });
      const relleno = $('.riel-ciclo i', el);
      etapas.forEach((etapa, k) => {
        const t = 1.6 + k * 1.35;
        tl.to(relleno, { width: `${(k / (etapas.length - 1)) * 100}%`, duration: 0.6, ease: 'power2.inOut' }, t - 0.5);
        tl.call(() => etapas.forEach((e, i) => e.classList.toggle('activa', i <= k)), null, t);
        tl.fromTo($('.bola', etapa), { scale: 1 }, { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }, t);
        if (k > 0) tl.to(detalles[k - 1], { opacity: 0, y: -20, duration: 0.35 }, t);
        tl.fromTo(detalles[k], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, t + 0.1);
      });
    },
  },

  telefono: {
    logo: LOGO_ESQUINA, halo: [75, 50],
    entrar() { telefono.iniciar(); },
    salir() { telefono.detener(); },
    construir(tl, el) {
      telefono.estado.entrada = 0;
      telefono.estado.aviso = 0;
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      tl.to(telefono.estado, { entrada: 1, duration: 1.8, ease: 'expo.out' }, 0.4);
      subir(tl, $$('.funcion', el), 1.0, { stagger: 0.15 });
      tl.to(telefono.estado, { aviso: 1, duration: 0.7, ease: 'back.out(1.5)' }, 2.4);
    },
  },

  preventivos: {
    logo: LOGO_ESQUINA, halo: [72, 45],
    preparar(el) {
      // Diciembre de 2026 empieza en martes; semana de lunes a domingo
      const dias = $('.dias', el);
      dias.innerHTML = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span class="nombre">${d}</span>`).join('');
      const celdas = [];
      for (let i = 0; i < 1; i++) celdas.push('<span class="dia vacio"></span>');
      for (let d = 1; d <= 31; d++) {
        const plan = [7, 14, 21, 28].includes(d);
        celdas.push(`<span class="dia${d === 14 ? ' hoy' : ''}" data-dia="${d}">${d}${plan ? '<span class="marca-plan">Filtros</span>' : ''}</span>`);
      }
      while (celdas.length % 7) celdas.push('<span class="dia vacio"></span>');
      dias.insertAdjacentHTML('beforeend', celdas.join(''));
    },
    construir(tl, el) {
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      revelar(tl, $('.bajada', el), 0.7, { duration: 0.8, stagger: 0.02 });
      tl.from($('.plan-prev', el), { x: -80, opacity: 0, duration: 1, ease: 'expo.out' }, 1.0);
      tl.from($('.calendario', el), { y: 60, opacity: 0, duration: 1, ease: 'expo.out' }, 0.9);
      tl.from($$('.dia', el), { opacity: 0, scale: 0.85, duration: 0.4, stagger: 0.012, ease: 'power2.out' }, 1.2);
      tl.to($$('.marca-plan', el), { opacity: 1, duration: 0.01, stagger: 0.32 }, 1.9);
      tl.from($$('.marca-plan', el), { scaleX: 0, transformOrigin: '0 50%', duration: 0.4, stagger: 0.32, ease: 'expo.out' }, 1.9);
      tl.fromTo($('.dia.hoy', el), { boxShadow: '0 0 0 rgba(60,194,194,0)' }, { boxShadow: '0 0 40px rgba(60,194,194,.7)', duration: 0.4, yoyo: true, repeat: 3 }, 3.3);
      tl.from($('.or-auto', el), { y: -140, x: -200, scale: 0.4, opacity: 0, duration: 1, ease: 'expo.out' }, 3.6);
      tl.from($('.dato-grande', el), { opacity: 0, y: 30, duration: 0.9, ease: 'expo.out' }, 3.9);
    },
  },

  datos: {
    logo: LOGO_ESQUINA, halo: [50, 40],
    construir(tl, el) {
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      subir(tl, $$('.kpi', el), 0.8, { stagger: 0.12 });
      $$('[data-contar]', el).forEach((n, i) => {
        const meta = Number(n.dataset.contar);
        const decimales = Number(n.dataset.decimales ?? 0);
        const contador = { v: 0 };
        n.textContent = '0';
        tl.to(contador, { v: meta, duration: 1.6, ease: 'expo.out', onUpdate: () => { n.textContent = contador.v.toFixed(decimales).replace('.', ','); } }, 1.0 + i * 0.12);
      });
      tl.from($$('.kpi .delta', el), { opacity: 0, scale: 0.8, duration: 0.5, stagger: 0.1, ease: 'back.out(2)' }, 2.2);
      tl.from($$('.ventana', el), { y: 80, opacity: 0, rotationX: 12, transformPerspective: 1600, duration: 1.1, ease: 'expo.out', stagger: 0.15 }, 1.6);
      tl.from($('.pdf', el), { x: 80, opacity: 0, duration: 1, ease: 'expo.out' }, 2.1);
      tl.from($('.pdf .hoja', el), { rotation: -14, y: 30, duration: 1.2, ease: 'back.out(1.6)' }, 2.2);
    },
  },

  porque: {
    logo: LOGO_ESQUINA, halo: [80, 50],
    construir(tl, el) {
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      const filas = $$('.fila-c', el);
      subir(tl, filas, 0.8, { stagger: 0.07, y: 20, filter: 'blur(0px)' });
      tl.from($('.columna-prisma', el), { scaleY: 0, transformOrigin: '50% 0', opacity: 0, duration: 1, ease: 'expo.out' }, 1.3);
      tl.from($$('.fila-c > span:last-child .marca-si', el), { scale: 0, rotation: -120, duration: 0.5, stagger: 0.14, ease: 'back.out(2.2)' }, 1.8);
    },
    preparar(el) {
      // La columna resaltada se alinea con la última columna de la tabla
      const cabeza = $('.fila-c.cabeza', el);
      const ultima = cabeza.lastElementChild;
      Object.assign($('.columna-prisma', el).style, { left: `${ultima.offsetLeft - 10}px`, width: `${ultima.offsetWidth + 20}px` });
    },
  },

  equipo: {
    logo: LOGO_ESQUINA, halo: [50, 50],
    construir(tl, el) {
      tl.from($('.etiqueta', el), { opacity: 0, x: -20, duration: 0.6 }, 0.2);
      revelar(tl, $('.titulo', el), 0.3);
      tl.from($$('.integrante', el), { y: 70, opacity: 0, scale: 0.9, duration: 1, ease: 'expo.out', stagger: 0.12 }, 0.8);
    },
  },

  cierre: {
    logo: 'cierre', halo: [50, 35],
    construir(tl, el) {
      revelar(tl, $('.cierre-gracias', el), 1.0, { duration: 1.1, stagger: 0.06 });
      tl.from($('.cierre-qr', el), { y: 50, opacity: 0, duration: 1, ease: 'expo.out' }, 1.5);
    },
  },
};

const slides = $$('.slide').map((el) => ({ el, id: el.dataset.slide, ...definiciones[el.dataset.slide] }));
slides.forEach((s) => s.preparar?.(s.el));

// ---------- navegación ----------
let actual = -1;
let estado = 'inicio'; // inicio → video → deck

function irA(indice, { final = false, inmediato = false } = {}) {
  if (indice < 0 || indice >= slides.length || indice === actual) return;
  const anterior = slides[actual];
  if (anterior) {
    anterior.salir?.();
    const el = anterior.el;
    const ctx = anterior.ctx;
    gsap.to(el, {
      opacity: 0, duration: inmediato ? 0 : 0.45, ease: 'power2.in', overwrite: true,
      onComplete: () => { el.classList.remove('activa'); gsap.set(el, { opacity: 1 }); ctx?.revert(); },
    });
  }
  actual = indice;
  const s = slides[indice];
  gsap.killTweensOf(s.el);
  gsap.set(s.el, { opacity: 1 });
  s.el.classList.add('activa');
  s.ctx?.revert();
  s.ctx = gsap.context(() => {
    s.tl = gsap.timeline({ delay: anterior && !final ? 0.3 : 0 });
    s.construir(s.tl, s.el);
  }, s.el);
  s.entrar?.();
  if (final) s.tl.progress(1, false);
  moverLogo(s.logo, inmediato || final);
  gsap.to(fondo, { '--hx': `${s.halo[0]}%`, '--hy': `${s.halo[1]}%`, duration: inmediato ? 0 : 1.6, ease: 'expo.inOut' });
  ambiente.mover(indice);
  gsap.to(progreso, { width: `${((indice + 1) / slides.length) * 1920}px`, duration: 0.8, ease: 'expo.out' });
  notas.textContent = s.el.dataset.notas ?? '';
}

function siguiente() {
  if (estado === 'inicio') { comenzar(); return; }
  if (estado === 'video') { terminarVideo(); return; }
  const s = slides[actual];
  if (s?.tl && s.tl.progress() < 1) { s.tl.progress(1, false); return; }
  irA(actual + 1);
}
function anterior() {
  if (estado !== 'deck') return;
  irA(actual - 1, { final: true });
}

// ---------- intro en video ----------
const video = $('#video-intro');
const inicio = $('#inicio');
const logo = $('#logo');
let videoListo = false;

function marcarListo() { if (!videoListo) { videoListo = true; inicio.classList.add('listo'); } }
if (location.protocol.startsWith('http')) {
  // Online: se descarga el video completo antes de habilitar el arranque, así no se corta
  fetch(video.src).then((r) => r.blob()).then((b) => { video.src = URL.createObjectURL(b); video.addEventListener('canplaythrough', marcarListo, { once: true }); video.load(); });
} else {
  video.addEventListener('canplaythrough', marcarListo, { once: true });
  if (video.readyState >= 4) marcarListo();
}

function comenzar() {
  if (!videoListo) return;
  estado = 'video';
  gsap.set(video, { opacity: 1 });
  gsap.to(inicio, { opacity: 0, duration: 0.2, onComplete: () => { inicio.style.display = 'none'; } });
  video.currentTime = 0;
  video.play();
  video.onended = terminarVideo;
}

function terminarVideo() {
  if (estado !== 'video') return;
  estado = 'deck';
  video.pause();
  // El último cuadro del video es idéntico a la portada: se cambia la capa sin que se note
  gsap.set(logo, { opacity: 1 });
  irA(0, { inmediato: true });
  requestAnimationFrame(() => requestAnimationFrame(() => gsap.set(video, { opacity: 0 })));
  ambiente.iniciar();
  gsap.to('#ambiente', { opacity: 1, duration: 3, delay: 1.5 });
}

function saltarIntro(indice, final) {
  estado = 'deck';
  inicio.style.display = 'none';
  gsap.set(logo, { opacity: 1 });
  ambiente.iniciar();
  gsap.set('#ambiente', { opacity: 1 });
  irA(indice, { inmediato: true, final });
}

// ---------- controles ----------
addEventListener('keydown', (e) => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); siguiente(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); anterior(); }
  else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (e.key === 'n' || e.key === 'N') notas.classList.toggle('visible');
  else if (e.key === 'Home' && estado === 'deck') irA(0, { final: true });
  else if (e.key === 'End' && estado === 'deck') irA(slides.length - 1, { final: true });
});
addEventListener('click', (e) => { if (e.button === 0) siguiente(); });
addEventListener('contextmenu', (e) => { e.preventDefault(); anterior(); });
let temporizadorCursor;
addEventListener('mousemove', () => {
  document.body.classList.remove('sin-cursor');
  clearTimeout(temporizadorCursor);
  temporizadorCursor = setTimeout(() => document.body.classList.add('sin-cursor'), 2000);
});

// ?slide=N&final=1 abre directo una slide (para capturas y para ensayar)
if (parametros.has('slide')) saltarIntro(Number(parametros.get('slide')) - 1, parametros.get('final') === '1');
window.presentacion = { irA, slides, siguiente, anterior };
