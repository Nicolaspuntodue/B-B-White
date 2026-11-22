// White B&B demo: one fullscreen WebGL plane (the terrace photo on a white "cloth"
// with the room-colour stripes of the logo), driven by scroll; GSAP for the rest.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const canvas = $('#gl');
const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
const U = { tilt: 0, hero: 1, room: 0, col: [0.85, 0.15, 0.17], mouse: [0, 0] };
const T = { tilt: 0, hero: 1, room: 0, col: [0.85, 0.15, 0.17], mouse: [0, 0] };
const INTRO = { v: reduce ? 1 : 0 };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

if (gl) {
  document.documentElement.classList.add('webgl');
  const vs = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
  const fs = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uTilt, uHero, uRoom, uImgA, uIntro; uniform vec3 uCol; uniform vec2 uMouse;
uniform sampler2D uImg;
vec3 pal(float i){
  i = mod(i, 5.);
  if(i<1.) return vec3(.94,.45,.09);
  if(i<2.) return vec3(.12,.37,.77);
  if(i<3.) return vec3(.85,.15,.17);
  if(i<4.) return vec3(.45,.29,.69);
  return vec3(.36,.62,.22);
}
void main(){
  float r = uRes.x/uRes.y;
  vec2 p = (gl_FragCoord.xy - .5*uRes)/uRes.y;
  vec3 rd = normalize(vec3(p + uMouse*.012, -1.));
  float a = uTilt;
  vec3 n = vec3(0., sin(a), cos(a));
  vec3 p0 = vec3(0., 0., -1.);
  float t = dot(p0, n)/dot(rd, n);
  vec3 hit = rd*t;
  float u = hit.x;
  float v = dot(hit - p0, vec3(0., cos(a), -sin(a)));
  float w = sin(u*2.2 + v*1.3 + uTime*.7);
  v += w*.035*a;
  float s = v*5.5 + sin(u*1.3 + uTime*.35)*.4 + uTime*.04;
  float idx = floor(s), f = fract(s);
  float band = smoothstep(.0,.015,f)*smoothstep(.5,.485,f);
  vec3 bc = mix(pal(idx), uCol, uRoom);
  float shade = .88 + .12*w;
  vec3 paper = vec3(.965,.955,.935);
  vec3 cloth = mix(paper, bc, band) * shade;
  float k = 1. + a*.9;
  vec2 q = vec2(u*k/r + .5, v*k + .5);
  vec2 iu = q;
  if (r > uImgA) iu.y = (iu.y-.5)*uImgA/r + .5; else iu.x = (iu.x-.5)*r/uImgA + .5;
  iu = (iu-.5)*(.97 - .14*(1.-uIntro)) + .5 + uMouse*.006;
  float inside = step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
  vec3 img = texture2D(uImg, vec2(iu.x, 1.-iu.y)).rgb;
  vec3 col = mix(cloth, img, inside*uHero);
  col = mix(col, paper, smoothstep(2.5, 7., t)*(1.-uRoom*.6));
  if (t < 0.) col = paper;
  // intro: room-colour bands sweep in from the left, then peel off to the right
  vec2 sp = gl_FragCoord.xy/uRes;
  float bi = floor((1.-sp.y)*7.);
  float pr = clamp(uIntro*1.8 - bi*.1, 0., 1.);
  float ia = smoothstep(0.,1.,clamp(pr*2.,0.,1.)), ib = smoothstep(0.,1.,clamp(pr*2.-1.,0.,1.));
  if (pr < .5) col = paper;
  col = mix(col, pal(bi + 2.), step(sp.x, ia) * step(ib, sp.x));
  gl_FragColor = vec4(col, 1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(prog, n);
  const L = { res: u('uRes'), time: u('uTime'), tilt: u('uTilt'), hero: u('uHero'), room: u('uRoom'), col: u('uCol'), mouse: u('uMouse'), imgA: u('uImgA'), intro: u('uIntro') };

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.uniform1f(L.imgA, 4 / 3);
  const im = new Image();
  im.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); gl.uniform1f(L.imgA, im.width / im.height); };
  im.src = 'img/hero.webp';

  const resize = () => {
    const d = Math.min(devicePixelRatio, 1.75);
    canvas.width = innerWidth * d; canvas.height = innerHeight * d;
    gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(L.res, canvas.width, canvas.height);
  };
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => { T.mouse = [e.clientX / innerWidth - .5, .5 - e.clientY / innerHeight]; });

  const lerp = (a, b, k) => a + (b - a) * k;
  const frame = ms => {
    const k = reduce ? 1 : .08;
    U.tilt = lerp(U.tilt, T.tilt, k); U.hero = lerp(U.hero, T.hero, k); U.room = lerp(U.room, T.room, k);
    U.col = U.col.map((c, i) => lerp(c, T.col[i], k));
    U.mouse = U.mouse.map((c, i) => lerp(c, reduce ? 0 : T.mouse[i], .05));
    gl.uniform1f(L.time, reduce ? 0 : ms / 1000);
    gl.uniform1f(L.intro, INTRO.v); gl.uniform1f(L.tilt, U.tilt); gl.uniform1f(L.hero, U.hero); gl.uniform1f(L.room, U.room);
    gl.uniform3fv(L.col, U.col); gl.uniform2fv(L.mouse, U.mouse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

gsap.registerPlugin(ScrollTrigger);
if (!reduce && window.Lenis) {
  const lenis = new Lenis({ lerp: .1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = $(a.getAttribute('href')); if (el) { e.preventDefault(); lenis.scrollTo(el); }
  }));
}

const heroTilt = () => Math.min(1, scrollY / innerHeight) * 1.05;
ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top',
  onUpdate: () => { if (!T.room) T.tilt = heroTilt(); } });

const rooms = $$('.room');
const track = $('.rooms-track');
const stage = $('.rooms-stage');
const setRoom = i => { const c = rooms[i].dataset.color; T.col = hex(c); if (!gl) stage.style.background = c; };
setRoom(0);
ScrollTrigger.create({ trigger: '.rooms', start: 'top bottom', end: 'bottom top',
  onToggle: s => { T.hero = s.isActive ? 0 : 1; T.room = s.isActive ? 1 : 0; T.tilt = s.isActive ? .7 : heroTilt(); } });
gsap.to(track, {
  x: () => -(track.scrollWidth - innerWidth * .5 - rooms[0].offsetWidth * .5),
  ease: 'none',
  scrollTrigger: { trigger: '.rooms', start: 'top top', end: 'bottom bottom', scrub: reduce ? true : .6, invalidateOnRefresh: true,
    onUpdate: () => {
      let best = 0, d = 1e9;
      rooms.forEach((r, i) => { const b = r.getBoundingClientRect(), dd = Math.abs(b.left + b.width / 2 - innerWidth / 2); if (dd < d) { d = dd; best = i; } });
      setRoom(best);
    } }
});
gsap.to('.rooms-title', { yPercent: -60, opacity: 0, ease: 'none',
  scrollTrigger: { trigger: '.rooms', start: 'top top', end: '18% top', scrub: true } });

if (!reduce) {
  const D = gl ? 1.5 : .15;
  if (gl) gsap.to(INTRO, { v: 1, duration: 2.6, ease: 'power2.inOut', delay: .2 });
  gsap.from('.hero-title span span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .12, delay: D });
  gsap.from('.hero-mid > *', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08, delay: D + .45 });
  gsap.from('.nav', { opacity: 0, duration: .8, delay: D + .3 });
  $$('main > section').forEach(sec => {
    const els = $$('.reveal', sec);
    if (els.length) gsap.from(els, { y: 28, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08,
      scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
  });
  gsap.to('.bf-photo img', { yPercent: -16, ease: 'none', scrollTrigger: { trigger: '.breakfast', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.intro-big img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.intro', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.book-photo img', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.book', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}


// ---- scroll animations after the rooms (v4) ----
{
  // breakfast: still-life rises faster than the page, dots pop in
  if (!reduce) {
    gsap.fromTo('.bf-photo', { clipPath: 'inset(12% 8% 12% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: '.bf-photo', start: 'top bottom', end: 'center center', scrub: true } });
    gsap.fromTo('.bf-still', { yPercent: 40, rotate: 4 }, { yPercent: -30, rotate: -3, ease: 'none',
      scrollTrigger: { trigger: '.breakfast', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.bf-text li', { x: -16, opacity: 0, duration: .7, ease: 'back.out(3)', stagger: .12,
      scrollTrigger: { trigger: '.bf-text ul', start: 'top 85%', once: true } });
  }
  // quote: words light up as you scroll, photo turns in 3D
  const qp = document.querySelector('.quote blockquote p');
  qp.innerHTML = qp.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
  if (!reduce) {
    gsap.to('.quote .w', { opacity: 1, ease: 'none', stagger: .05,
      scrollTrigger: { trigger: '.quote', start: 'top 70%', end: 'center 40%', scrub: true } });
    gsap.fromTo('.quote-photo', { rotateY: 24, rotateX: 6, z: -120 }, { rotateY: -6, rotateX: 0, z: 0, ease: 'none',
      scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.quote', { backgroundColor: '#ffd23f' }, { backgroundColor: '#ef7317', ease: 'none',
      scrollTrigger: { trigger: '.quote', start: 'top bottom', end: 'center center', scrub: true } });
  } else document.querySelectorAll('.quote .w').forEach(w => { w.style.opacity = 1; });
  // marquee driven by scroll
  if (!reduce) gsap.fromTo('.mq-track', { xPercent: 0 }, { xPercent: -50, ease: 'none',
    scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: .5 } });
  // around: the place in focus swaps the sticky photo
  const list = document.querySelector('.around-list'), items = [...list.children];
  const pics = [...document.querySelectorAll('.around-stack img')];
  list.classList.add('live');
  items.forEach((li, i) => ScrollTrigger.create({ trigger: li, start: 'top 60%', end: 'bottom 60%',
    onToggle: s => { if (!s.isActive) return; items.forEach(x => x.classList.toggle('now', x === li)); pics.forEach((p, k) => p.classList.toggle('on', k === i)); } }));
  items[0].classList.add('now');
  if (!reduce) gsap.from(items, { x: 60, opacity: 0, duration: .9, ease: 'power3.out', stagger: .1,
    scrollTrigger: { trigger: list, start: 'top 80%', once: true } });
  // booking card tilts up into place
  if (!reduce) gsap.fromTo('.book-card', { rotateX: 14, y: 120, opacity: .4 }, { rotateX: 0, y: 0, opacity: 1, ease: 'none',
    scrollTrigger: { trigger: '.book', start: 'top bottom', end: 'top 25%', scrub: true } });
  // footer letters rise one by one
  if (!reduce) gsap.fromTo('.foot-mark span', { yPercent: 100, rotate: 8 }, { yPercent: 0, rotate: 0, ease: 'none', stagger: .08,
    scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}
