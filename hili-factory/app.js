/* Hili Smart Factory — interactive 3D assembly line (three.js, no build step).
   The whole simulation is a pure function of time t, so it can be scrubbed, replayed and captured frame-by-frame. */
(function () {
  'use strict';
  const D = window.HILI_DATA;
  const Q = new URLSearchParams(location.search);
  const CAPTURE = Q.has('capture');
  if (CAPTURE) document.body.classList.add('capture');
  const $ = (s) => document.querySelector(s);
  let lang = Q.get('lang') || (function () { try { return localStorage.getItem('hili-lang'); } catch (e) { return null; } })() || 'en';
  const L = (k) => D.str[lang][k] || k;
  const N = (o) => o[lang];

  // ---------- timeline ----------
  const STG = 22, NS = 6, STARTS = [0, 25, 50, 75, 100, 128], TOTAL = 153; // demo time in seconds; stage 6 = test flight, then a 3 s dwell before the loop restarts
  const SX = [8, 22, 36, 50, 64];
  const SPEED = 10; // cart cruise speed (units/s)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const smr = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
  const eob = (t) => { t = clamp(t, 0, 1); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); };
  const ease = (u) => { u = clamp(u, 0, 1); return 0.3 * u + 0.7 * sm(u); };   // gentle start / stop for vehicles
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  // ---------- renderer / scene ----------
  const canvas = $('#stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: CAPTURE });
  renderer.setPixelRatio(CAPTURE ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  const scene = new THREE.Scene();
  const BG = 0xdbe6e9;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 240, 480);
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 800);

  const sun = new THREE.DirectionalLight(0xfff1e0, 2.1);
  sun.position.set(55, 100, 60);
  sun.target.position.set(17, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CAPTURE ? 4096 : 3072, CAPTURE ? 4096 : 3072);
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 55, bottom: -55, near: 10, far: 270 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 4;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xffffff, 0xb0c0c6, 0.3));

  // ---------- helpers ----------
  const COL = { green: 0x00a878, greenD: 0x007f5b, slate: 0x44535b, white: 0xf7fafb, card: 0xdcb27a, amber: 0xe0a53a };
  const M = (c, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.48, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.85 }, o || {}));
  const MM = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0, envMapIntensity: 0.4 }, o || {}));
  function tex(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  // rounded box (cached extrude with bevel) — soft "toy" edges like the reference renders
  const RG = new Map();
  function rGeo(w, h, d, r) {
    const q = (v) => Math.max(0.03, Math.round(v * 40) / 40);
    w = q(w); h = q(h); d = q(d); r = Math.round(Math.min(r, w * 0.48, h * 0.48, d * 0.48) * 200) / 200;
    const key = w + ',' + h + ',' + d + ',' + r; if (RG.has(key)) return RG.get(key);
    const x = -w / 2, y = -h / 2, sh = new THREE.Shape(), P = Math.PI;
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.absarc(x + w - r, y + r, r, -P / 2, 0); sh.lineTo(x + w, y + h - r); sh.absarc(x + w - r, y + h - r, r, 0, P / 2);
    sh.lineTo(x + r, y + h); sh.absarc(x + r, y + h - r, r, P / 2, P); sh.lineTo(x, y + r); sh.absarc(x + r, y + r, r, P, P * 1.5);
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelOffset: -r, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -(d / 2 - r)); RG.set(key, g); return g;
  }
  function B(w, h, d, m, x, y, z, parent, cast, r) {
    const rr = r === undefined ? Math.min(0.1, Math.min(w, h, d) * 0.3) : r;
    const g = new THREE.Mesh(rr > 0.012 ? rGeo(w, h, d, rr) : new THREE.BoxGeometry(w, h, d), m);
    g.position.set(x || 0, y || 0, z || 0);
    g.castShadow = cast !== false; g.receiveShadow = true;
    if (parent) parent.add(g);
    return g;
  }
  function S(sx, sy, sz, m, x, y, z, parent, seg) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(1, seg || 32, seg ? Math.round(seg * 0.66) : 20), m);
    g.scale.set(sx, sy, sz); g.position.set(x || 0, y || 0, z || 0);
    g.castShadow = true; g.receiveShadow = true;
    if (parent) parent.add(g);
    return g;
  }
  function CY(rt, rb, h, m, x, y, z, parent, seg) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m);
    g.position.set(x || 0, y || 0, z || 0); g.castShadow = true; g.receiveShadow = true;
    if (parent) parent.add(g);
    return g;
  }
  function mkPath(pts) {
    const seg = [], cum = [0]; let Lt = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); Lt += d; cum.push(Lt); }
    const at = (s) => {
      s = clamp(s, 0, Lt); let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const u = (s - cum[i - 1]) / (seg[i - 1] || 1);
      return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
    };
    return { pts, cum, L: Lt, at };
  }
  // polyline with rounded (quadratic Bézier) corners → smooth vehicle turns
  function smoothPath(pts, rad) {
    const out = [pts[0].slice()];
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const d1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), r = Math.min(rad, d1 / 2, d2 / 2);
      const a = [p1[0] + (p0[0] - p1[0]) * r / d1, p1[1] + (p0[1] - p1[1]) * r / d1], b = [p1[0] + (p2[0] - p1[0]) * r / d2, p1[1] + (p2[1] - p1[1]) * r / d2];
      for (let k = 0; k <= 12; k++) { const u = k / 12, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; out.push([w0 * a[0] + w1 * p1[0] + w2 * b[0], w0 * a[1] + w1 * p1[1] + w2 * b[1]]); }
    }
    out.push(pts[pts.length - 1].slice());
    return mkPath(out);
  }
  function loopPath(pts, rad) { // pts closed (first == last): start mid-edge so every corner is rounded
    const m = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
    return smoothPath([m].concat(pts.slice(1), [m]), rad);
  }
  const pickables = [];
  function pickable(obj, info) { obj.userData.pick = info; pickables.push(obj); }

  // ---------- studio environment (soft boxes) → reflections on glossy materials ----------
  (function env() {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    const sky = tex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e6eef0'); g.addColorStop(0.56, '#c9d6da'); g.addColorStop(1, '#a3b4ba'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: sky })));
    const panel = (w, h, x, y, z, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    panel(30, 20, 25, 35, 25, 6); panel(14, 40, -38, 18, 10, 3.5); panel(40, 8, 0, 30, -35, 3); panel(20, 10, 35, 12, -20, 2.5); panel(10, 30, 38, 10, 20, 2);
    scene.environment = pm.fromScene(es, 0.03).texture;
  })();

  // ---------- environment ----------
  const HP = { x: 98, z: -6 };   // VTOL landing pad beside the factory
  const grassT = tex(256, 256, (c, w, h) => {
    c.fillStyle = '#86b87f'; c.fillRect(0, 0, w, h); const r = rng(5);
    for (let i = 0; i < 2600; i++) { c.fillStyle = 'rgba(' + (55 + r() * 50 | 0) + ',' + (115 + r() * 60 | 0) + ',' + (55 + r() * 40 | 0) + ',.35)'; c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
  });
  grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(80, 80);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), MM(0xffffff, { map: grassT, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true; scene.add(ground);
  const slabM = M(0xe9eff1, { roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.28, envMapIntensity: 0.5 });
  B(168, 0.3, 54, slabM, 35, -0.15, -1, scene, false, 0.12);                       // concrete yard x -49..119, z -28..26
  B(168.6, 0.34, 0.5, M(COL.green), 35, -0.15, 26.2, scene, false, 0.1);
  B(40.6, 0.02, 38, MM(0xe1e8ea), -26, 0.012, -2.6, scene, false, 0);
  function strip(x1, z1, x2, z2, w, color, y) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const holder = new THREE.Group(); holder.position.set((x1 + x2) / 2, y || 0.03, (z1 + z2) / 2); holder.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), new THREE.MeshBasicMaterial({ color })); m.rotation.x = -Math.PI / 2;
    holder.add(m); scene.add(holder); return holder;
  }
  strip(-8, 10, 66, 10, 2.0, 0xd8f1e8); strip(-8, 8.95, 66, 8.95, 0.12, COL.green); strip(-8, 11.05, 66, 11.05, 0.12, COL.green);
  strip(-8, -13.4, -8, 10, 1.6, 0xd8f1e8);
  strip(-3, -9.5, 78, -9.5, 0.14, 0xaec2c9); strip(-3, 14.2, 78, 14.2, 0.14, 0xaec2c9);

  // cartons share one label/tape texture
  const cartonT = tex(128, 128, (c, w, h) => {
    c.fillStyle = '#ececec'; c.fillRect(0, 0, w, h); c.fillStyle = '#c4c4c4'; c.fillRect(w / 2 - 11, 0, 22, h);
    c.fillStyle = '#fff'; c.fillRect(8, h - 44, 46, 32); c.fillStyle = '#7a7a7a'; for (let i = 0; i < 9; i++) c.fillRect(13 + i * 4.2, h - 38, 2 + (i % 3), 14); c.fillRect(13, h - 20, 36, 3);
  });
  const cartonTints = [0xdcb27a, 0xd2a76e, 0xe6c89c, 0xcfa468].map((c) => M(c, { map: cartonT, roughness: 0.7, clearcoat: 0.05 }));

  // ---------- warehouse ----------
  const wh = new THREE.Group(); scene.add(wh);
  const ROWZ = [-16, -9, -2, 5];
  const unitX = (bay) => -39 + bay * 7.4;
  const crates = {};
  (function warehouse() {
    const wall = M(0xf6f9fa, { roughness: 0.38, clearcoat: 0.5 }), band = M(COL.green, { roughness: 0.35, clearcoat: 0.8 }), cap = M(COL.slate, { roughness: 0.4 });
    const glass = M(0xa9ddcd, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    for (let i = 0; i < 10; i++) { // back wall panels
      const x = -44 + i * 4.04;
      B(3.9, 9.6, 0.5, wall, x, 4.8, -21.2, wh); B(2.9, 1.5, 0.14, glass, x, 7.4, -20.9, wh, false, 0.06);
    }
    for (let i = 0; i < 9; i++) { // left wall panels
      const z = -19 + i * 4.2;
      B(0.5, 9.6, 4.08, wall, -46.2, 4.8, z, wh); B(0.14, 1.5, 3.1, glass, -45.9, 7.4, z, wh, false, 0.06);
    }
    B(40.8, 0.9, 0.9, band, -26, 9.9, -21.1, wh, false, 0.3); B(0.9, 0.9, 38.8, band, -46.1, 9.9, -2.4, wh, false, 0.3); B(40.8, 1.0, 0.7, cap, -26, 0.5, -20.9, wh, false, 0.25);
    [-38, -26, -14].forEach((x) => { B(5.4, 5.8, 0.25, M(0xc9d4d9, { roughness: 0.5 }), x, 2.9, -20.8, wh, false, 0.1); for (let k = 0; k < 7; k++) B(5.0, 0.07, 0.1, MM(0x9aa9b0), x, 0.7 + k * 0.7, -20.62, wh, false, 0); B(5.9, 0.35, 0.3, band, x, 5.95, -20.7, wh, false, 0.1); });
    const fr = M(0xb7c6cc, { roughness: 0.4, metalness: 0.4 });
    for (let i = 0; i < 5; i++) B(0.18, 0.18, 37.5, fr, -44 + i * 9.5, 9.4, -2.3, wh, false, 0.05);
    // racks
    const r = rng(11), post = M(COL.green, { roughness: 0.35, clearcoat: 0.8 }), beam = M(0x9fb0b7, { roughness: 0.4, metalness: 0.3 }), deck = MM(0xe3e9ec), wood = MM(0xc9a77a);
    const levels = [0.35, 2.55, 4.75];
    for (let row = 0; row < 4; row++) for (let bay = 0; bay < 4; bay++) {
      const ux = unitX(bay), uz = ROWZ[row];
      const u = new THREE.Group(); u.position.set(ux, 0, uz); wh.add(u);
      for (const sx of [-3.2, 3.2]) for (const sz of [-0.8, 0.8]) B(0.17, 6.4, 0.17, post, sx, 3.2, sz, u, true, 0.06);
      B(6.6, 0.1, 0.1, post, 0, 6.35, 0.8, u, false, 0.04); B(6.6, 0.1, 0.1, post, 0, 6.35, -0.8, u, false, 0.04);
      for (const ly of levels) {
        B(6.4, 0.14, 0.14, beam, 0, ly, 0.8, u, false, 0.05); B(6.4, 0.14, 0.14, beam, 0, ly, -0.8, u, false, 0.05);
        B(6.2, 0.06, 1.55, deck, 0, ly + 0.05, 0, u, false, 0); B(6.0, 0.14, 1.3, wood, 0, ly + 0.15, 0, u, false, 0.04);
        const li = levels.indexOf(ly);
        for (let k = 0; k < 3; k++) {
          if (r() < 0.12) continue;
          const bw = 1.3 + r() * 0.5, bh = 0.8 + r() * 0.9, bd = 1.0 + r() * 0.35;
          const slotHere = D.parts.some((p) => p.row === row && p.bay === bay && p.lvl === li);
          if (slotHere && k === 0) continue;
          B(bw, bh, bd, cartonTints[(r() * 4) | 0], -2.2 + k * 2.2 + (r() - 0.5) * 0.3, ly + 0.22 + bh / 2, 0, u, false, 0.06);
        }
      }
      pickable(u, { type: 'warehouse' });
    }
    // part crates: white glossy, green bands
    const crateM = M(0xf3f6f7, { roughness: 0.3, clearcoat: 0.9 }), bandM = M(COL.green, { emissive: COL.green, emissiveIntensity: 0.2 });
    D.parts.forEach((p) => {
      const g = new THREE.Group();
      B(1.9, 1.3, 1.2, crateM, 0, 0.7, 0, g, true, 0.14); B(1.95, 0.22, 1.25, bandM, 0, 0.95, 0, g, false, 0.08); B(1.95, 1.34, 0.22, bandM, 0, 0.7, 0, g, false, 0.08); B(2.0, 0.12, 1.3, wood, 0, 0.06, 0, g, false, 0.04);
      g.position.set(unitX(p.bay) + 1.2, levels[p.lvl] + 0.22, ROWZ[p.row]);
      scene.add(g); crates[p.id] = g;
    });
  })();

  // ---------- stations ----------
  const stationLED = [], stationRing = [];
  const fx = { arms: [], conveyor: null, bot: null, drone: null, holo: null };
  function makeArm() {
    const g = new THREE.Group(), amber = M(COL.amber, { roughness: 0.3, clearcoat: 1 }), white = M(0xf4f7f8), dark = M(0x2a343a, { roughness: 0.4, metalness: 0.4 }), gr = M(COL.green);
    CY(0.95, 1.05, 0.3, white, 0, 0.15, 0, g, 36);
    const base = new THREE.Group(); base.position.y = 0.3; g.add(base);
    CY(0.55, 0.7, 0.9, white, 0, 0.45, 0, base, 28); CY(0.58, 0.58, 0.12, gr, 0, 0.55, 0, base, 28);
    const sh = new THREE.Group(); sh.position.y = 0.95; base.add(sh);
    const j1 = CY(0.36, 0.36, 0.95, dark, 0, 0, 0, sh, 22); j1.rotation.x = Math.PI / 2;
    const l1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 2.3, 8, 18), amber); l1.rotation.z = -Math.PI / 2; l1.position.x = 1.4; l1.castShadow = true; sh.add(l1);
    const el = new THREE.Group(); el.position.x = 2.8; sh.add(el);
    const j2 = CY(0.3, 0.3, 0.8, dark, 0, 0, 0, el, 20); j2.rotation.x = Math.PI / 2;
    const l2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.7, 8, 16), amber); l2.rotation.z = -Math.PI / 2; l2.position.x = 1.15; l2.castShadow = true; el.add(l2);
    const tool = CY(0.12, 0.2, 0.7, dark, 2.4, 0, 0, el, 14); tool.rotation.z = Math.PI / 2;
    S(0.1, 0.1, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 2 }), 2.8, 0, 0, el, 10);
    g.userData.arm = { base, sh, el };
    return g;
  }
  (function stations() {
    const slate = M(COL.slate, { roughness: 0.38 }), white = M(0xffffff, { roughness: 0.3, clearcoat: 0.9 });
    const padTop = tex(512, 512, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2);
      c.strokeStyle = '#e1e9ec'; c.lineWidth = 3; [70, 130, 190].forEach((r) => { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); });
      c.strokeStyle = '#b9e8d9'; c.lineWidth = 12; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, 232, i * Math.PI / 2 + 0.28, i * Math.PI / 2 + 1.28); c.stroke(); }
      c.strokeStyle = '#d2dce0'; c.lineWidth = 3; for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24; c.beginPath(); c.moveTo(Math.cos(a) * 214, Math.sin(a) * 214); c.lineTo(Math.cos(a) * 224, Math.sin(a) * 224); c.stroke(); }
    });
    SX.forEach((x, k) => {
      const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.4, 0.24, 72), [M(0xf0f4f5, { roughness: 0.35, clearcoat: 0.8 }), M(0xffffff, { map: padTop, roughness: 0.3, clearcoat: 0.9 }), white]);
      pad.position.y = 0.12; pad.receiveShadow = true; g.add(pad);
      const ringM = new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: 0.2, roughness: 0.4 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7.25, 0.1, 10, 120), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring);
      stationRing.push(ringM);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ transparent: true, map: tex(256, 128, (c, w, h) => { c.fillStyle = 'rgba(68,83,91,.35)'; c.font = '700 96px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('0' + (k + 1), w / 2, h / 2 + 4); }) }));
      num.rotation.x = -Math.PI / 2; num.position.set(0, 0.27, 5.4); g.add(num);
      // gantry arch
      B(0.34, 7.4, 0.34, slate, 0, 3.7, 8.6, g, true, 0.12); B(0.34, 7.4, 0.34, slate, 0, 3.7, -8.6, g, true, 0.12); B(0.5, 0.42, 17.5, slate, 0, 7.5, 0, g, true, 0.16);
      B(0.7, 0.5, 0.7, M(COL.green), 0, 0.25, 8.6, g, false, 0.18); B(0.7, 0.5, 0.7, M(COL.green), 0, 0.25, -8.6, g, false, 0.18);
      const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 0.2 });
      B(0.2, 0.14, 15.6, led, 0.1, 7.2, 0, g, false, 0.06); stationLED.push(led);
      [-3.5, 3.5].forEach((z) => { B(0.6, 0.35, 0.9, white, 0.1, 7.0, z, g, false, 0.12); S(0.2, 0.08, 0.3, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 }), 0.1, 6.78, z, g, 12); });
      // workbench
      B(2.8, 0.95, 1.1, slate, 3.8, 0.48, -9.8, g, true, 0.12); B(2.9, 0.1, 1.2, white, 3.8, 1.0, -9.8, g, true, 0.05);
      const screen = B(0.9, 0.55, 0.06, new THREE.MeshStandardMaterial({ color: 0x1d2a30, emissive: COL.green, emissiveIntensity: 0.5 }), 4.4, 1.5, -10.1, g, false, 0.04); screen.rotation.x = -0.12;
      B(0.18, 0.4, 0.18, slate, 4.4, 1.25, -10.1, g, false, 0.05); B(0.6, 0.4, 0.5, M(COL.green), 3.1, 1.25, -9.8, g, true, 0.1);
      // robot arm
      const arm = makeArm(); arm.position.set(2.6, 0, -6.9); g.add(arm); fx.arms.push({ arm, k });
      g.traverse((o) => { if (o.isMesh) o.userData.pick = { type: 'station', i: k }; });
      pickables.push(g);
    });
  })();

  // ---------- conveyor, service robot, drone, hologram ----------
  (function props() {
    const white = M(0xf5f8f9, { roughness: 0.3, clearcoat: 0.9 }), green = M(COL.green, { roughness: 0.3, clearcoat: 0.9 }), dark = M(0x2a343a, { roughness: 0.45 });
    // conveyor
    const cx0 = -5, cx1 = 72, CL = cx1 - cx0, cg = new THREE.Group(); cg.position.set(0, 0, -13.6); scene.add(cg);
    B(CL, 0.5, 1.9, white, (cx0 + cx1) / 2, 0.6, 0, cg, true, 0.18);
    B(CL, 0.22, 0.14, green, (cx0 + cx1) / 2, 0.92, 0.88, cg, false, 0.06); B(CL, 0.22, 0.14, green, (cx0 + cx1) / 2, 0.92, -0.88, cg, false, 0.06);
    const beltT = tex(128, 64, (c, w, h) => { c.fillStyle = '#4b5a62'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6a7b84'; c.lineWidth = 8; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 16, h / 2); c.lineTo(i * 32, h); c.stroke(); } });
    beltT.wrapS = beltT.wrapT = THREE.RepeatWrapping; beltT.repeat.set(CL / 4, 1);
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(CL, 1.45), new THREE.MeshStandardMaterial({ map: beltT, roughness: 0.6 })); belt.rotation.x = -Math.PI / 2; belt.position.set((cx0 + cx1) / 2, 0.86, 0); belt.receiveShadow = true; cg.add(belt);
    for (let x = cx0 + 2; x < cx1; x += 6) { B(0.3, 0.55, 1.7, dark, x, 0.28, 0, cg, false, 0.08); }
    const boxes = [];
    for (let i = 0; i < 11; i++) { const bx = B(1.1, 0.8, 0.9, cartonTints[i % 4], 0, 1.27, 0, cg, true, 0.08); boxes.push(bx); }
    // dispatch gate where boxes appear
    B(0.35, 3.2, 0.35, green, cx0, 1.6, 1.4, cg, true, 0.12); B(0.35, 3.2, 0.35, green, cx0, 1.6, -1.4, cg, true, 0.12); B(0.35, 0.4, 3.1, green, cx0, 3.2, 0, cg, true, 0.14);
    fx.conveyor = { beltT, boxes, cx0, cx1, CL }; pickable(cg, { type: 'info', key: 'conveyor' });
    // service robot (cute)
    const bot = new THREE.Group(); bot.scale.setScalar(1.7); scene.add(bot);
    B(0.9, 0.8, 0.8, white, 0, 0.62, 0, bot, true, 0.3); B(0.92, 0.12, 0.82, green, 0, 0.5, 0, bot, false, 0.05);
    S(0.5, 0.45, 0.5, white, 0, 1.35, 0, bot, 28); B(0.12, 0.34, 0.62, dark, 0.38, 1.38, 0, bot, false, 0.08);
    [0.14, -0.14].forEach((z) => S(0.05, 0.07, 0.05, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2bffc0, emissiveIntensity: 3 }), 0.45, 1.4, z, bot, 10));
    CY(0.025, 0.025, 0.3, dark, 0, 1.9, 0, bot, 8); S(0.06, 0.06, 0.06, green, 0, 2.06, 0, bot, 10);
    [0.38, -0.38].forEach((z) => { const w = CY(0.2, 0.2, 0.14, dark, 0, 0.2, z, bot, 18); w.rotation.x = Math.PI / 2; });
    fx.bot = bot; pickable(bot, { type: 'info', key: 'bot' });
    // inspection drone
    const dr = new THREE.Group(); dr.scale.setScalar(2.0); scene.add(dr);
    B(0.9, 0.28, 0.6, white, 0, 0, 0, dr, true, 0.12); B(0.5, 0.08, 0.4, green, 0, 0.17, 0, dr, false, 0.04);
    const props = [];
    [[0.8, 0.8], [0.8, -0.8], [-0.8, 0.8], [-0.8, -0.8]].forEach((p, i) => {
      const arm = B(1.2, 0.07, 0.09, white, p[0] / 2, 0, p[1] / 2, dr, false, 0.03); arm.rotation.y = -Math.atan2(p[1], p[0]); arm.scale.x = 1.0; arm.position.set(p[0] / 2, 0, p[1] / 2);
      CY(0.13, 0.13, 0.12, dark, p[0], 0.06, p[1], dr, 14);
      const pg = new THREE.Group(); pg.position.set(p[0], 0.15, p[1]); dr.add(pg);
      [1, -1].forEach((s) => B(0.65, 0.015, 0.07, dark, s * 0.32, 0, 0, pg, false, 0));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.66, 24), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.raycast = () => {}; pg.add(disc);
      props.push({ g: pg, dir: i % 2 ? 1 : -1 });
    });
    S(0.17, 0.17, 0.17, dark, 0.2, -0.22, 0, dr, 14); S(0.07, 0.07, 0.07, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 3 }), 0.34, -0.24, 0, dr, 10);
    fx.drone = { g: dr, props }; pickable(dr, { type: 'info', key: 'drone' });
    // hologram pad (LODD diamond in a glass cube) beside the final inspection
    const hg = new THREE.Group(); hg.position.set(SX[4] + 10.5, 0, 12.5); scene.add(hg);
    CY(2.3, 2.5, 0.3, white, 0, 0.15, 0, hg, 40);
    const edgeM = new THREE.LineBasicMaterial({ color: 0x2bffc0 });
    const cube = B(3.2, 3.2, 3.2, M(0x9fe6d0, { transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 }), 0, 2.0, 0, hg, false, 0.12); cube.raycast = () => {};
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.2, 3.2, 3.2)), edgeM); edges.position.y = 2.0; hg.add(edges);
    const dsh = new THREE.Shape(), rr = 0.55; dsh.moveTo(-rr, 0); dsh.lineTo(0, rr); dsh.lineTo(rr, 0); dsh.lineTo(0, -rr); dsh.closePath();
    const hole = new THREE.Path(); hole.moveTo(-0.3, 0); hole.lineTo(0, -0.3); hole.lineTo(0.3, 0); hole.lineTo(0, 0.3); hole.closePath(); dsh.holes.push(hole);
    const diamond = new THREE.Mesh(new THREE.ExtrudeGeometry(dsh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: 0.9, roughness: 0.3 }));
    diamond.geometry.translate(0, 0, -0.08); diamond.position.y = 2.0; diamond.castShadow = false; hg.add(diamond);
    fx.holo = { diamond, edgeM }; pickable(hg, { type: 'info', key: 'holo' });
  })();

  // ---------- factory hall (cut-away: back wall, east hangar door, roof frame) ----------
  (function hall() {
    const X0 = -4, X1 = 80, ZB = -25, ZF = 16, H = 12.5, g = new THREE.Group(); scene.add(g);
    const wall = M(0xf4f7f8, { roughness: 0.38, clearcoat: 0.5 }), band = M(COL.green, { roughness: 0.35, clearcoat: 0.8 }), cap = M(COL.slate, { roughness: 0.4 });
    const glass = M(0xa9ddcd, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    const steel = M(0xb4c3c9, { roughness: 0.4, metalness: 0.4 }), roofM = M(0xe9eef0, { roughness: 0.5, clearcoat: 0.3 });
    for (let i = 0; i < 14; i++) { const x = X0 + 3 + i * 6; B(5.9, H, 0.5, wall, x, H / 2, ZB, g); B(4.4, 2.4, 0.14, glass, x, 9.2, ZB + 0.3, g, false, 0.06); }
    B(84.8, 0.9, 0.9, band, (X0 + X1) / 2, H - 0.1, ZB + 0.1, g, false, 0.3); B(84.8, 1.0, 0.7, cap, (X0 + X1) / 2, 0.5, ZB + 0.2, g, false, 0.25);
    // sign on the back wall
    B(27, 3.6, 0.2, band, 38, 5.2, ZB + 0.38, g, false, 0.15);
    const signT = tex(1024, 140, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 84px Inter, Arial, sans-serif'; c.textBaseline = 'middle'; c.fillText('LODD', 230, h / 2 + 4);
      c.font = '600 40px Inter, Arial, sans-serif'; c.fillText('AUTONOMOUS  ·  HILI  هيلي', 470, h / 2 + 6);
      c.strokeStyle = '#fff'; c.lineWidth = 14; c.save(); c.translate(150, h / 2); c.rotate(Math.PI / 4); c.strokeRect(-26, -26, 52, 52); c.restore();
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.5), new THREE.MeshBasicMaterial({ map: signT, transparent: true })); sign.position.set(38, 5.2, ZB + 0.5); g.add(sign);
    // east wall with the hangar opening z -8..8
    B(0.5, H, 17, wall, X1, H / 2, ZB + 8.5, g); B(0.5, H, 8, wall, X1, H / 2, 12, g); B(0.5, H - 9.2, 16, wall, X1, 9.2 + (H - 9.2) / 2, 0, g);
    B(0.7, 0.45, 16.8, band, X1, 9.1, 0, g, false, 0.15); [8.3, -8.3].forEach((z) => B(0.7, 9, 0.45, band, X1, 4.5, z, g, true, 0.15));
    B(0.7, 1.0, 17, cap, X1, 0.5, ZB + 8.5, g, false, 0.25);
    // portal frame: front columns, roof beams, purlins
    for (let i = 0; i <= 7; i++) { const x = X0 + i * 12; B(0.5, H, 0.5, steel, x, H / 2, ZF, g, true, 0.12); B(0.4, 0.6, 41.6, steel, x, H, (ZF + ZB) / 2, g, true, 0.12); }
    B(84.6, 0.4, 0.5, steel, (X0 + X1) / 2, H, ZF, g, false, 0.12);
    [-20, -12, -4, 4, 12].forEach((z) => B(84.4, 0.2, 0.2, steel, (X0 + X1) / 2, H + 0.25, z, g, false, 0.05));
    // roof panels over the back part, with skylights and rooftop units
    for (let i = 0; i < 7; i++) {
      const x = X0 + 6 + i * 12; B(11.5, 0.3, 19, roofM, x, H + 0.4, -15.5, g, true, 0.1); B(7.5, 0.1, 4.2, glass, x, H + 0.62, -19, g, false, 0.04);
      if (i % 2 === 0) { B(3, 1.4, 2.2, wall, x - 1.5, H + 1.3, -11, g, true, 0.2); const f = CY(0.75, 0.75, 0.15, M(0x6d7d85), x - 1.5, H + 2.05, -11, g, 20); f.castShadow = false; }
    }
    // west side pillars (open towards the warehouse)
    [-25, -10, 5, 16].forEach((z) => B(0.5, H, 0.5, steel, X0, H / 2, z, g, true, 0.12));
    // ceiling lights
    for (let i = 0; i < 6; i++) B(6, 0.12, 0.5, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }), X0 + 8 + i * 13, H - 0.4, -1, g, false, 0.04);
  })();

  // ---------- roads, parking, lamps ----------
  const asphaltT = tex(256, 256, (c, w, h) => {
    c.fillStyle = '#4a5358'; c.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < 2800; i++) { const v = 60 + r() * 40 | 0; c.fillStyle = 'rgba(' + v + ',' + (v + 6) + ',' + (v + 8) + ',.45)'; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  });
  asphaltT.wrapS = asphaltT.wrapT = THREE.RepeatWrapping;
  const asphaltM = (rx, ry) => { const t = asphaltT.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, envMapIntensity: 0.3 }); };
  function flatPlane(w, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; }
  (function roads() {
    const RZ = 42;
    flatPlane(420, 12, asphaltM(70, 2), 50, 0.02, RZ);
    flatPlane(420, 0.35, new THREE.MeshBasicMaterial({ color: 0xe8ecee }), 50, 0.04, RZ - 5.6); flatPlane(420, 0.35, new THREE.MeshBasicMaterial({ color: 0xe8ecee }), 50, 0.04, RZ + 5.6);
    const dashT = tex(64, 8, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#f2d34a'; c.fillRect(0, 0, 36, h); }); dashT.wrapS = THREE.RepeatWrapping; dashT.repeat.set(210, 1);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(420, 0.3), new THREE.MeshBasicMaterial({ map: dashT, transparent: true })); dash.rotation.x = -Math.PI / 2; dash.position.set(50, 0.045, RZ); scene.add(dash);
    B(420, 0.22, 2.4, MM(0xcfd6d9), 50, 0.1, RZ - 7.4, scene, false, 0.05); B(420, 0.22, 2.4, MM(0xcfd6d9), 50, 0.1, RZ + 7.4, scene, false, 0.05);
    flatPlane(8, 14, asphaltM(2, 3), 30, 0.02, 33.5); // access road to the yard
    const lot = flatPlane(36, 20, asphaltM(8, 5), 100, 0.02, 17);
    const lineM = new THREE.MeshBasicMaterial({ color: 0xeef1f2 });
    for (let i = 0; i <= 8; i++) { flatPlane(0.18, 5, lineM, 84 + i * 4.4, 0.04, 11.5); flatPlane(0.18, 5, lineM, 84 + i * 4.4, 0.04, 22.5); }
    // hedges along the sidewalk
    for (let x = -50; x < 118; x += 14) if (Math.abs(x - 30) > 6) B(13, 1.0, 1.1, M(0x5fa86f, { roughness: 0.7, clearcoat: 0 }), x + 7, 0.5, 30.5, scene, false, 0.4);
    // lamp posts
    const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 1.4 }), pole = M(0x5d6d75, { roughness: 0.4, metalness: 0.4 });
    for (let x = -60; x <= 150; x += 24) { B(0.25, 7, 0.25, pole, x, 3.5, 34.8, scene, true, 0.1); B(2.2, 0.2, 0.2, pole, x, 7.0, 34.0, scene, false, 0.05); B(0.9, 0.22, 0.5, lampM, x, 6.85, 33.2, scene, false, 0.08); }
  })();

  // ---------- vehicles ----------
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 18), wheelM = M(0x1a2024, { roughness: 0.6, clearcoat: 0 }), hubM = M(0xc9d2d6, { roughness: 0.3, metalness: 0.5 });
  function wheel(x, z, parent, s) { const w = new THREE.Mesh(wheelGeo, wheelM); w.rotation.x = Math.PI / 2; w.position.set(x, 0.38 * (s || 1), z); w.scale.setScalar(s || 1); w.castShadow = true; parent.add(w); const h = CY(0.17, 0.17, 0.32, hubM, x, 0.38 * (s || 1), z, parent, 12); h.rotation.x = Math.PI / 2; h.scale.setScalar(s || 1); }
  const glassCar = M(0x22323a, { roughness: 0.06, clearcoat: 1, envMapIntensity: 1.8 }), headM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6dd, emissiveIntensity: 1.6 }), tailM = new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0xff2020, emissiveIntensity: 1.0 });
  function makeCar(col, long) {
    const g = new THREE.Group(), body = M(col, { roughness: 0.22, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
    B(4.3, 0.85, 1.85, body, 0, 0.72, 0, g, true, 0.32); B(2.3, 0.8, 1.65, glassCar, -0.2, 1.4, 0, g, true, 0.32); B(2.1, 0.1, 1.55, body, -0.2, 1.84, 0, g, true, 0.08);
    [1.35, -1.35].forEach((x) => [0.82, -0.82].forEach((z) => wheel(x, z, g)));
    [0.6, -0.6].forEach((z) => { B(0.1, 0.2, 0.42, headM, 2.15, 0.78, z, g, false, 0.04); B(0.1, 0.2, 0.42, tailM, -2.15, 0.78, z, g, false, 0.04); });
    if (long) B(1.4, 0.1, 1.4, M(0xdfe5e8), -1.6, 1.1, 0, g, false, 0.04);
    return g;
  }
  function makeTruck(semi) {
    const g = new THREE.Group(), cab = M(COL.slate, { roughness: 0.3, clearcoat: 1 }), white = M(0xf5f8f9, { roughness: 0.3, clearcoat: 0.8 }), green = M(COL.green, { roughness: 0.3, clearcoat: 0.8 });
    const bl = semi ? 12.5 : 6.4, bx = semi ? -4.4 : -1.3, cx = semi ? 3.2 : 3.6;
    B(2.2, 2.3, 2.45, cab, cx, 1.65, 0, g, true, 0.35); B(0.12, 1.0, 2.2, glassCar, cx + 1.1, 2.15, 0, g, false, 0.08);
    B(bl, 3.1, 2.55, white, bx, 2.35, 0, g, true, 0.2); B(bl + 0.02, 0.45, 2.6, green, bx, 1.35, 0, g, false, 0.12);
    const lg = tex(256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#00a878'; c.font = '800 70px Inter, Arial, sans-serif'; c.textBaseline = 'middle'; c.fillText('LODD', 20, h / 2); });
    [1, -1].forEach((s) => { const lm = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: lg, transparent: true, side: THREE.DoubleSide })); lm.position.set(bx, 2.7, s * 1.29); g.add(lm); });
    B(bl + 0.5, 0.3, 1.6, M(0x30383c), bx + (semi ? 0 : 0), 0.7, 0, g, false, 0.05);
    const axles = semi ? [cx, bx - 3.4, bx - 4.8, bx + 1.0] : [cx, bx - 1.7, bx - 2.9];
    axles.forEach((x) => [1.08, -1.08].forEach((z) => wheel(x, z, g, 1.15)));
    [0.8, -0.8].forEach((z) => { B(0.1, 0.22, 0.45, headM, cx + 1.12, 0.95, z, g, false, 0.04); B(0.1, 0.22, 0.45, tailM, bx - bl / 2 - 0.02, 0.95, z, g, false, 0.04); });
    return g;
  }
  fx.traffic = [];
  (function traffic() {
    const R = rng(21), cols = [0xe9eef0, 0x0a9d78, 0x44535b, 0xd8d4ba, 0xb7c3c9, 0xc84b3a, 0x2c6fa5, 0xf2f2f2];
    const X0 = -150, SPAN = 400, list = [];
    for (let i = 0; i < 9; i++) list.push({ g: makeCar(cols[i % cols.length], i % 4 === 0), dir: i % 3 === 0 ? -1 : 1, v: 8 + R() * 4, off: R() * SPAN });
    for (let i = 0; i < 3; i++) list.push({ g: makeTruck(false), dir: i % 2 ? 1 : -1, v: 6.5 + R() * 2, off: R() * SPAN });
    list.push({ g: makeTruck(true), dir: -1, v: 7, off: 120 }, { g: makeTruck(true), dir: 1, v: 6.5, off: 300 });
    list.forEach((v) => { v.g.userData.pick = { type: 'info', key: 'traffic' }; scene.add(v.g); pickables.push(v.g); v.z = v.dir > 0 ? 45.2 : 38.8; v.x0 = X0; v.span = SPAN; fx.traffic.push(v); });
    // parked cars in the lot
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => { const c = makeCar(cols[(i * 3) % cols.length]); c.position.set(86 + i * 4.4 + 1.6, 0, i % 2 ? 13.8 : 20.4); c.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1); c.userData.pick = { type: 'info', key: 'traffic' }; scene.add(c); pickables.push(c); });
  })();

  // ---------- trees: palms, broad-leaf, conifers, shrubs ----------
  (function trees() {
    const r = rng(31), trunkM = MM(0x9a8a6a, { roughness: 0.9 }), frondM = M(0x4f9a5c, { roughness: 0.55, clearcoat: 0.2 }), leaves = [0x5fa86f, 0x4e9a62, 0x73b97f, 0x8cc68d].map((c) => M(c, { roughness: 0.65, clearcoat: 0.05 })), pine = M(0x3f8a5a, { roughness: 0.65, clearcoat: 0.05 });
    function palm(x, z, s) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = r() * 6.28; scene.add(g);
      let y = 0, tilt = 0; const lean = (r() - 0.5) * 0.12;
      for (let i = 0; i < 5; i++) { const seg = CY(0.2 - i * 0.012, 0.23 - i * 0.012, 1.5, trunkM, Math.sin(tilt) * 0.8 * i * 0.5, y + 0.75, 0, g, 10); seg.rotation.z = -tilt; y += 1.45; tilt += lean + 0.03; }
      const top = new THREE.Group(); top.position.set(Math.sin(tilt) * 2, y + 0.3, 0); g.add(top);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, fr = new THREE.Group(); fr.rotation.y = a; top.add(fr); const f = S(1.9, 0.06, 0.42, frondM, 1.7, -0.1, 0, fr, 8); f.rotation.z = -0.35; f.castShadow = true; }
      for (let i = 0; i < 3; i++) S(0.2, 0.2, 0.2, MM(0x7a5a2a), (r() - 0.5) * 0.4, -0.1, (r() - 0.5) * 0.4, top, 8);
    }
    function round(x, z, s) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); CY(0.22, 0.32, 2.6, trunkM, 0, 1.3, 0, g, 10); const m = leaves[(r() * 4) | 0]; S(1.9, 1.7, 1.9, m, 0, 3.6, 0, g, 18); S(1.3, 1.2, 1.3, leaves[(r() * 4) | 0], 0.9, 4.4, 0.3, g, 14); S(1.2, 1.1, 1.2, leaves[(r() * 4) | 0], -0.8, 4.2, -0.4, g, 14); }
    function conifer(x, z, s) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); CY(0.18, 0.25, 1.2, trunkM, 0, 0.6, 0, g, 8); [[1.9, 2.2, 2.0], [1.5, 2.0, 3.6], [1.0, 1.8, 5.0]].forEach((c) => { const m = new THREE.Mesh(new THREE.ConeGeometry(c[0], c[1], 14), pine); m.position.y = c[2]; m.castShadow = true; g.add(m); }); }
    function shrub(x, z, s) { const m = leaves[(r() * 4) | 0]; S(1.0 * s, 0.7 * s, 1.0 * s, m, x, 0.5 * s, z, scene, 12); S(0.7 * s, 0.55 * s, 0.7 * s, m, x + 0.8 * s, 0.4 * s, z + 0.3 * s, scene, 10); }
    for (let x = -52; x < 122; x += 9) { if (Math.abs(x - 30) < 7) continue; (Math.floor(x / 9) % 3 === 0 ? round : palm)(x + r() * 2, 28.2 + r() * 1.2, 0.95 + r() * 0.3); }
    for (let x = -60; x < 150; x += 11) { palm(x + r() * 3, 55 + r() * 4, 1.05 + r() * 0.4); if (r() > 0.4) round(x + 5, 62 + r() * 6, 1 + r() * 0.5); }
    for (let x = -56; x < 125; x += 8) { (r() > 0.5 ? conifer : round)(x + r() * 3, -34 - r() * 8, 1.1 + r() * 0.6); if (r() > 0.5) conifer(x + 4, -46 - r() * 8, 1.4 + r() * 0.5); }
    for (let z = -26; z < 26; z += 9) { round(-54 - r() * 3, z + r() * 3, 1 + r() * 0.4); palm(124 + r() * 3, z + r() * 3, 1.1 + r() * 0.3); }
    for (let i = 0; i < 40; i++) shrub(-50 + r() * 175, 27.5 + r() * 2.5, 0.8 + r() * 0.6);
    for (let i = 0; i < 16; i++) palm(110 + r() * 14, -24 + r() * 12, 1 + r() * 0.3);
  })();

  // ---------- industrial annex behind the hall (white silos, tanks, pipe rack) ----------
  (function annex() {
    const white = M(0xf4f7f8, { roughness: 0.3, clearcoat: 0.8 }), band = M(COL.green, { roughness: 0.3, clearcoat: 0.8 }), pipe = M(0xd4dde1, { roughness: 0.3, metalness: 0.5 });
    [[22, -37], [29, -37]].forEach((p, i) => { CY(3.2, 3.2, 15, white, p[0], 7.5, p[1], scene, 36); CY(3.25, 3.25, 1.0, band, p[0], 11.5, p[1], scene, 36); S(3.2, 1.6, 3.2, white, p[0], 15, p[1], scene, 24); CY(0.14, 0.14, 4, pipe, p[0] + 1.2, 17.3, p[1], scene, 8); });
    CY(4.2, 4.2, 6.5, white, 40, 3.25, -36, scene, 40); CY(4.25, 4.25, 0.8, band, 40, 4.5, -36, scene, 40);
    B(14, 6, 9, white, 54, 3, -36, scene, true, 0.3); B(14.2, 0.9, 9.2, band, 54, 5.2, -36, scene, false, 0.2); B(11, 0.5, 1.2, M(0x9fd8c7, { transparent: true, opacity: 0.6 }), 54, 3.4, -31.5, scene, false, 0.1);
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 14, 6, 12), pipe); c.rotation.z = Math.PI / 2; c.position.set(30, 9, -32); scene.add(c);
    [[22, -33], [29, -33], [36, -33]].forEach((p) => { B(0.3, 9, 0.3, pipe, p[0], 4.5, p[1], scene, true, 0.1); });
  })();

  // ---------- VTOL landing pad (18 × 18 m) beside the factory ----------
  (function helipad() {
    const g = new THREE.Group(); g.position.set(HP.x, 0, HP.z); scene.add(g);
    const padT = tex(512, 512, (c, w, h) => {
      c.fillStyle = '#f6f9fa'; c.fillRect(0, 0, w, h); c.fillStyle = '#c3ccd0'; c.fillRect(80, 120, 352, 82); c.fillRect(80, 310, 352, 82);
      c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28); c.strokeStyle = '#9aa7ad'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 18), [MM(0xdfe6e9), MM(0xdfe6e9), new THREE.MeshStandardMaterial({ map: padT, roughness: 0.4 }), MM(0xdfe6e9), MM(0xdfe6e9), MM(0xdfe6e9)]);
    pad.position.y = 0.15; pad.receiveShadow = true; g.add(pad);
    const ringM = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.5, roughness: 0.4 });
    [7.6, 4.3].forEach((r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.14, 10, 120), ringM); t.rotation.x = Math.PI / 2; t.position.y = 0.34; g.add(t); });
    const lights = [];
    for (let i = 0; i < 32; i++) { const a = i / 32, side = Math.floor(a * 4), u = (a * 4 - side) * 18 - 9; const pos = [[u, -9], [9, u], [-u, 9], [-9, -u]][side]; const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 0.4 }); S(0.22, 0.12, 0.22, m, pos[0], 0.36, pos[1], g, 10); lights.push(m); }
    const hl = tex(512, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(68,83,91,.75)'; c.font = '800 70px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VTOL · 18 M', w / 2, h / 2); });
    const tm = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: hl, transparent: true })); tm.rotation.x = -Math.PI / 2; tm.position.set(0, 0.32, 6.9); g.add(tm);
    // windsock
    const ws = new THREE.Group(); ws.position.set(11.5, 0, -9); g.add(ws);
    CY(0.08, 0.1, 6, M(0xdde3e6), 0, 3, 0, ws, 8); const sock = new THREE.Group(); sock.position.y = 6; ws.add(sock);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xff7a1a, side: THREE.DoubleSide, roughness: 0.6 })); cone.rotation.z = Math.PI / 2 - 0.1; cone.position.x = 1.2; sock.add(cone);
    fx.windsock = sock;
    // yard markings leading to the pad from the hangar
    strip(80, 0, 89, -6, 3.4, 0xe3ebed); strip(80, 0, 89, 0, 0.12, COL.green);
    g.traverse((o) => { if (o.isMesh) o.userData.pick = { type: 'station', i: 5 }; }); pickables.push(g);
    stationRing[5] = { emissiveIntensity: 0 }; stationLED[5] = { emissiveIntensity: 0 };
    fx.padLights = lights; fx.padRing = ringM;
  })();

  // ---------- Hili aircraft (shape follows the supplied renders; transparent "x-ray" skin until the skin closes) ----------
  const ac = (function buildAircraft() {
    const root = new THREE.Group(); scene.add(root);
    const a = new THREE.Group(); a.position.y = 0.31; root.add(a);
    const P = {}; const mk = (id) => { const g = new THREE.Group(); a.add(g); P[id] = g; return g; };
    // assembly cart (stays on the ground; not part of the aircraft)
    const cart = new THREE.Group(); scene.add(cart);
    const slate = M(0x7a8b93), cartLed = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 0.8 });
    B(8.6, 0.22, 3.8, slate, 0, 0.2, 0, cart, true, 0.1); B(8.6, 0.08, 0.1, cartLed, 0, 0.3, 1.88, cart, false, 0); B(8.6, 0.08, 0.1, cartLed, 0, 0.3, -1.88, cart, false, 0);
    [[-3.6, 1.5], [3.6, 1.5], [-3.6, -1.5], [3.6, -1.5]].forEach((p) => { const w = CY(0.14, 0.14, 0.14, M(0x20272b), p[0], 0.1, p[1], cart, 14); w.rotation.x = Math.PI / 2; });

    // ---- skin materials (ghost → champagne) ----
    const skins = [];
    function skinMat(solid, met, rough) {
      const m = new THREE.MeshPhysicalMaterial({ color: 0xd2dadd, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
      skins.push({ m, solid: new THREE.Color(solid), ghost: new THREE.Color(0xc4d2d8), met: met, rough: rough }); return m;
    }
    const skinM = skinMat(0xd3c79d, 0.42, 0.26), skinD = skinMat(0xc2b78f, 0.4, 0.3), csM = skinMat(0xa6d3c3, 0.3, 0.3);
    let skinK = -1;
    function setSkin(k) {
      if (Math.abs(k - skinK) < 1e-3) return; skinK = k;
      skins.forEach((s) => { s.m.color.copy(s.ghost).lerp(s.solid, k); s.m.opacity = lerp(0.3, 1, k); s.m.metalness = lerp(0.05, s.met, k); s.m.roughness = lerp(0.12, s.rough, k); s.m.depthWrite = k > 0.98; s.m.side = k > 0.98 ? THREE.FrontSide : THREE.DoubleSide; });
    }
    const dark = M(0x2b353b, { roughness: 0.5, metalness: 0.3 }), metal = M(0x3b464c, { roughness: 0.35, metalness: 0.6 }), carbon = M(0x24292c, { roughness: 0.4, metalness: 0.3 }), greenM = M(0x0aa073, { roughness: 0.4 }), white = M(0xe9eef0, { roughness: 0.35 });
    const glowGreen = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 1.4 }), glowRed = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff2a2a, emissiveIntensity: 1.6 });

    const HC = { x: 0.35, y: 1.38 }, HR = { x: 3.2, y: 1.0, z: 0.62 };
    const surf = (x, y) => { const u = (x - HC.x) / HR.x, v = (y - HC.y) / HR.y, q = 1 - u * u - v * v; return q > 0 ? HR.z * Math.sqrt(q) : 0; };
    function patch(w, h, cx, cy, side, m, off, sg) {
      const g = new THREE.PlaneGeometry(w, h, sg ? sg[0] : 20, sg ? sg[1] : 10), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = cx + p.getX(i), y = cy + p.getY(i); p.setXYZ(i, x, y, side * (surf(x, y) + (off || 0.012))); }
      g.computeVertexNormals(); const me = new THREE.Mesh(g, m); me.receiveShadow = true; return me;
    }
    // ---- 1 · structure: internal frame & floor rails ----
    const FR = mk('frame');
    B(5.4, 0.06, 1.0, dark, 0.3, 0.55, 0, FR, false, 0.02);
    [-0.4, 0.4].forEach((z) => { B(5.2, 0.05, 0.05, dark, 0.3, 1.05, z, FR, false, 0.02); B(5.2, 0.05, 0.05, dark, 0.3, 2.05, z, FR, false, 0.02); });
    [-2.2, -1.0, 0.2, 1.4, 2.6].forEach((x) => [0.45, -0.45].forEach((z) => B(0.05, 1.55, 0.05, dark, x, 1.3, z, FR, false, 0.02)));
    [-2.2, 0.2, 2.6].forEach((x) => B(0.05, 0.05, 0.92, dark, x, 2.08, 0, FR, false, 0.02));
    // ---- fuselage skin ----
    const F = mk('fuselage');
    S(HR.x, HR.y, HR.z, skinM, HC.x, HC.y, 0, F, 56).castShadow = true;
    S(1.5, 0.75, 0.5, skinM, 2.35, 0.9, 0, F, 40); S(1.6, 0.8, 0.5, skinM, -2.5, 1.6, 0, F, 32);
    // ---- livery (appears when the skin closes) ----
    const livery = new THREE.Group(); a.add(livery); livery.visible = false;
    [1, -1].forEach((side) => {
      const pts = [];
      for (let x = 2.95; x >= -2.3; x -= 0.15) { const yy = x > 0.9 ? lerp(1.5, 0.62, smr((x - 0.9) / 2.05)) : 1.5; const z = surf(x, yy); if (z < 0.08) continue; pts.push(new THREE.Vector3(x, yy, side * (z + 0.018))); }
      livery.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.045, 6), greenM));
    });
    const logoT = tex(512, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#00a878'; c.translate(86, 120); c.rotate(Math.PI / 4); c.lineWidth = 16; c.strokeStyle = '#00a878'; c.strokeRect(-34, -34, 68, 68); c.rotate(-Math.PI / 4); c.translate(-86, -120);
      c.fillStyle = '#44535b'; c.font = '700 96px Inter, Arial, sans-serif'; c.fillText('Hili', 170, 120); c.font = '700 70px "IBM Plex Sans Arabic", Arial'; c.fillText('هيلي', 178, 196);
    });
    const logoM = new THREE.MeshBasicMaterial({ map: logoT, transparent: true, side: THREE.DoubleSide });
    [1, -1].forEach((s) => livery.add(patch(1.15, 0.58, 2.35, 1.62, s, logoM, 0.02, [10, 5])));
    const cargoT = tex(512, 256, (c, w, h) => {
      c.fillStyle = '#2a343a'; c.fillRect(0, 0, w, h); c.fillStyle = '#161d21'; c.fillRect(10, 10, w - 20, h - 20);
      c.strokeStyle = '#59666d'; c.lineWidth = 2; for (let i = -10; i < 30; i++) { c.beginPath(); c.moveTo(i * 24, 10); c.lineTo(i * 24 + 40, 70); c.lineTo(i * 24 + 80, 10); c.stroke(); }
      [[28, 0], [268, 0]].forEach(([x0]) => {
        for (let r = 0; r < 2; r++) for (let q = 0; q < 2; q++) { c.fillStyle = r ? '#a9855d' : '#b79364'; c.fillRect(x0 + q * 108, 62 + r * 74, 104, 70); c.fillStyle = '#4a3a2b'; c.fillRect(x0 + q * 108 + 60, 62 + r * 74, 22, 24); }
        c.fillStyle = '#d9dfe1'; for (let s = 0; s < 3; s++) c.fillRect(x0 + 40 + s * 70, 62, 7, 148);
        c.fillStyle = '#6e5a42'; c.fillRect(x0, 206, 214, 24); c.fillStyle = '#161d21'; for (let s = 0; s < 4; s++) c.fillRect(x0 + 24 + s * 50, 212, 24, 18);
      });
    });
    const cargoM = new THREE.MeshStandardMaterial({ map: cargoT, roughness: 0.7, side: THREE.DoubleSide });
    [1, -1].forEach((s) => livery.add(patch(2.5, 1.0, 0.55, 1.4, s, cargoM, 0.016, [24, 12])));
    const flagT = tex(128, 80, (c, w, h) => { c.fillStyle = '#00732f'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#fff'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#111'; c.fillRect(0, 2 * h / 3, w, h / 3 + 1); c.fillStyle = '#ff0000'; c.fillRect(0, 0, w * 0.26, h); });
    const flagM = new THREE.MeshBasicMaterial({ map: flagT, side: THREE.DoubleSide });
    [1, -1].forEach((s) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), flagM); f.position.set(-4.85, 2.65, s * (1.78 + 0.05)); livery.add(f); });
    // ---- 1 · landing gear ----
    const G = mk('gear');
    [1, -1].forEach((s) => {
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 14), skinD); pod.position.set(-1.35, 0.72, s * 0.95); pod.castShadow = true; G.add(pod);
      B(0.28, 0.3, 0.7, skinD, -1.35, 1.1, s * 0.6, G, true, 0.1);
      const w = CY(0.2, 0.2, 0.14, M(0x14191c), -1.35, 0.2, s * 0.95, G, 18); w.rotation.x = Math.PI / 2;
    });
    B(0.1, 0.3, 0.1, dark, 2.7, 0.4, 0, G); { const w = CY(0.2, 0.2, 0.16, M(0x14191c), 2.7, 0.2, 0, G, 18); w.rotation.x = Math.PI / 2; }
    // ---- 2 · internal systems ----
    const BA = mk('battery'), batM = M(0x2d393f, { roughness: 0.5 });
    const batT = tex(256, 128, (c, w, h) => { c.fillStyle = '#44535b'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a9d78'; c.fillRect(0, 0, w, 16); c.fillStyle = '#fff'; c.font = '800 54px Inter, Arial, sans-serif'; c.fillText('Hili', 76, 78); c.font = '700 36px Arial'; c.fillText('هيلي', 156, 112); c.strokeStyle = '#0a9d78'; c.lineWidth = 8; c.save(); c.translate(42, 70); c.rotate(Math.PI / 4); c.strokeRect(-16, -16, 32, 32); c.restore(); });
    [0.95, 1.55].forEach((y) => B(1.0, 0.55, 0.9, batM, 2.3, y, 0, BA, true, 0.06));
    [1, -1].forEach((s) => { const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshBasicMaterial({ map: batT, side: THREE.DoubleSide })); lb.position.set(2.3, 1.55, s * 0.455); BA.add(lb); });
    B(0.45, 0.3, 0.5, white, 1.5, 1.1, 0, BA, true, 0.06); B(0.1, 0.06, 0.1, glowGreen, 1.5, 1.28, 0, BA, false, 0.02);
    const IC = mk('ice');
    B(0.95, 0.55, 0.6, metal, -2.35, 1.45, 0, IC, true, 0.08);
    for (let i = 0; i < 4; i++) { CY(0.1, 0.1, 0.34, metal, -2.7 + i * 0.28, 1.88, 0, IC, 12); B(0.06, 0.2, 0.62, M(0x8c6a2f), -2.7 + i * 0.28, 1.72, 0, IC, false, 0); }
    [0.2, -0.2].forEach((z, i) => { const cu = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.0, 1.5, z), new THREE.Vector3(-1.5, 1.8, z * 1.6), new THREE.Vector3(-1.0, 1.4, z)]); IC.add(new THREE.Mesh(new THREE.TubeGeometry(cu, 20, 0.04, 6), i ? new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.4 }) : greenM)); });
    CY(0.08, 0.08, 0.9, M(0xc9d2d6, { metalness: 0.7, roughness: 0.3 }), -2.9, 1.1, 0.25, IC, 10).rotation.z = Math.PI / 2;
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 12), M(0xd8b36a, { roughness: 0.4 })); tank.rotation.z = Math.PI / 2; tank.position.set(-0.95, 0.8, 0); tank.castShadow = true; IC.add(tank);
    const CG = mk('cargo'), wood = MM(0xc9a77a);
    [-0.15, 1.3].forEach((x) => { B(1.3, 0.1, 0.9, wood, x, 0.66, 0, CG, true, 0.03); [[-0.3, 0], [0.3, 0], [-0.3, 0.5], [0.3, 0.5]].forEach((p, i) => B(0.6, 0.5, 0.42, cartonTints[i % 4], x + p[0], 0.96 + p[1], (i % 2 ? 0.22 : -0.22), CG, true, 0.04)); });
    [0.6, -0.6].forEach((z) => B(0.04, 0.04, 3.6, metal, 0.65, 0.65, z, CG, false, 0.01).rotation.y = Math.PI / 2);
    const AV = mk('avionics');
    B(1.2, 0.5, 0.75, dark, 0.6, 2.0, 0, AV, true, 0.1); B(0.5, 0.28, 0.7, M(0xe8eef0), 1.35, 1.95, 0, AV, true, 0.06);
    [0.3, -0.3].forEach((z) => { B(0.4, 0.2, 0.4, M(COL.slate), -0.3, 1.95, z, AV, true, 0.04); B(0.06, 0.06, 0.06, glowGreen, -0.1, 2.0, z, AV, false, 0.01); });
    const bronze = M(0xa87f3d, { roughness: 0.3, metalness: 0.7 }); CY(0.22, 0.22, 0.05, bronze, 0.1, 2.26, 0.1, AV, 24); CY(0.22, 0.22, 0.05, bronze, 0.8, 2.3, -0.1, AV, 24);
    const NV = mk('c2');
    CY(0.14, 0.14, 0.06, M(0xffffff), 2.2, 2.2, 0, NV, 16); CY(0.014, 0.014, 0.5, dark, 3.7, 1.35, 0, NV, 8).rotation.z = Math.PI / 2; CY(0.015, 0.015, 0.4, dark, 1.0, 0.5, 0.2, NV, 6);
    [0.4, -0.4].forEach((z) => B(0.3, 0.02, 0.18, M(0xffffff), -2.0, 2.3, z, NV, false, 0));
    B(0.4, 0.25, 0.5, white, -0.9, 1.15, 0, NV, true, 0.05);
    const hp = [[2.2, 1.2, 0.12], [1.2, 1.55, 0.12], [0.5, 1.85, 0.05], [-0.6, 1.6, 0.05], [-1.8, 1.7, 0], [-2.5, 1.75, 0]].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    NV.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 40, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ffb0, emissiveIntensity: 1.1 })));
    // ---- 3 · wing, booms, tail, control surfaces ----
    const W = mk('wing');
    const wsh = new THREE.Shape(); wsh.absellipse(0, 0, 0.66, 0.105, 0, Math.PI * 2, false, 0);
    const wg = new THREE.ExtrudeGeometry(wsh, { depth: 11.95, bevelEnabled: false, curveSegments: 28 }); wg.translate(0, 0, -5.975);
    const wm = new THREE.Mesh(wg, skinM); wm.position.set(0.3, 2.47, 0); wm.castShadow = true; wm.receiveShadow = true; W.add(wm);
    B(0.05, 0.1, 11.6, dark, 0.45, 2.47, 0, W, false, 0.01); for (let z = -5.4; z <= 5.4; z += 1.2) B(1.1, 0.04, 0.04, dark, 0.3, 2.47, z, W, false, 0);
    const lights = [];
    [[5.95, 0xff2a2a], [-5.95, 0x2aff88]].forEach((p) => { const lm = new THREE.MeshStandardMaterial({ color: 0x555555, emissive: p[1], emissiveIntensity: 0 }); lights.push(lm); S(0.1, 0.1, 0.1, lm, 0.3, 2.5, p[0], W, 10); });
    const BM = mk('booms');
    [[1.78, 6.69, -1.475], [-1.78, 6.69, -1.475], [4.17, 4.04, -0.15], [-4.17, 4.04, -0.15]].forEach((b) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, b[1], 8, 16), skinM); c.rotation.z = Math.PI / 2; c.position.set(b[2], 2.3, b[0]); c.castShadow = true; BM.add(c); });
    [1.78, -1.78, 4.17, -4.17].forEach((z) => [1.55, -1.63].forEach((x) => S(0.62, 0.2, 0.24, skinD, x, 2.4, z, BM, 20)));
    const T = mk('tail');
    const fsh = new THREE.Shape(); fsh.moveTo(-4.1, 0); fsh.lineTo(-5.2, 0); fsh.lineTo(-5.4, 1.0); fsh.lineTo(-4.75, 1.0); fsh.closePath();
    const fg = new THREE.ExtrudeGeometry(fsh, { depth: 0.09, bevelEnabled: false }); fg.translate(0, 0, -0.045);
    [1.78, -1.78].forEach((z) => { const f = new THREE.Mesh(fg, skinM); f.position.set(0, 2.3, z); f.castShadow = true; T.add(f); });
    B(1.0, 0.07, 3.75, skinM, -5.05, 3.3, 0, T, true, 0.03);
    const CS = mk('surfaces');
    [[2.05, 1.3], [-2.05, 1.3], [3.5, 1.1], [-3.5, 1.1], [5.3, 1.1], [-5.3, 1.1]].forEach((p) => B(0.34, 0.06, p[1], csM, -0.6, 2.46, p[0], CS, true, 0.02));
    B(0.34, 0.05, 3.5, csM, -5.5, 3.3, 0, CS, true, 0.02); [1.78, -1.78].forEach((z) => B(0.3, 0.8, 0.07, csM, -5.4, 2.7, z, CS, true, 0.02));
    // ---- 4 · lift motors (+ ESC) and pusher ----
    const props = [];
    function motorSet(id, xm) {
      const g = mk(id);
      [1.78, -1.78, 4.17, -4.17].forEach((z, i) => {
        CY(0.17, 0.2, 0.2, metal, xm, 2.66, z, g, 16);
        B(0.5, 0.2, 0.32, M(0xb9c2c6, { roughness: 0.4, metalness: 0.3 }), xm, 2.36, z, g, true, 0.04); B(0.34, 0.04, 0.05, glowRed, xm, 2.36, z + 0.17, g, false, 0.01); B(0.34, 0.04, 0.05, glowRed, xm, 2.36, z - 0.17, g, false, 0.01);
        const pg = new THREE.Group(); pg.position.set(xm, 2.82, z); g.add(pg);
        CY(0.07, 0.09, 0.1, greenM, 0, 0, 0, pg, 12);
        [1, -1].forEach((s) => { const bl = B(1.0, 0.022, 0.11, carbon, s * 0.55, 0, 0, pg, true, 0); bl.rotation.x = s * 0.12; });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 36), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
        disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; disc.visible = false; disc.raycast = () => {}; pg.add(disc);
        props.push({ g: pg, disc, dir: (i + (xm > 0 ? 0 : 1)) % 2 ? 1 : -1 });
      });
    }
    motorSet('motorsF', 1.55); motorSet('motorsR', -1.63);
    const PU = mk('pusher');
    S(0.7, 0.45, 0.45, skinD, -3.2, 1.7, 0, PU, 24);
    const pp = new THREE.Group(); pp.position.set(-3.8, 1.7, 0); PU.add(pp);
    CY(0.09, 0.14, 0.2, greenM, 0.04, 0, 0, pp, 12).rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const bl = B(0.03, 0.95, 0.1, carbon, 0, 0, 0, pp, true, 0); bl.geometry = bl.geometry.clone(); bl.geometry.translate(0, 0.47, 0); bl.rotation.x = (i * Math.PI * 2) / 3; }
    const pdisc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 32), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    pdisc.rotation.y = Math.PI / 2; pdisc.visible = false; pdisc.raycast = () => {}; pp.add(pdisc);
    // ---- scan beam ----
    const scan = new THREE.Group(); root.add(scan);
    const sbm = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), new THREE.MeshBasicMaterial({ color: COL.green, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    sbm.rotation.y = Math.PI / 2; sbm.position.y = 2.2; sbm.raycast = () => {}; scan.add(sbm);
    const sedge = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.07), new THREE.MeshBasicMaterial({ color: 0x00ffb0 })); sedge.rotation.y = Math.PI / 2; sedge.position.y = 4.0; sedge.raycast = () => {}; scan.add(sedge);
    scan.visible = false;
    Object.values(P).forEach((g) => g.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; }));
    pickable(root, { type: 'aircraft' });
    return { root, a, cart, P, props, pp, pdisc, lights, scan, cartLed, setSkin, livery };
  })();

  // ---------- parts schedule ----------
  const sched = D.parts.map((p) => {
    const px = unitX(p.bay), pz = ROWZ[p.row] + 2.6, xk = SX[p.st];
    const path = smoothPath([[px, pz], [-8, pz], [-8, 10], [xk, 10], [xk, 8.3]], 5);
    let gi = 0, gd = 1e9; path.pts.forEach((q, i) => { const d = Math.hypot(q[0] + 8, q[1] - 10); if (d < gd) { gd = d; gi = i; } });
    const garage = path.cum[gi], ti = STARTS[p.st] + p.at, arr = ti - 1.2, dep = Math.max(0, arr - (path.L / SPEED) * 1.12);
    const retDur = ((path.L - garage) / SPEED) * 1.12, retStart = ti + 0.3;
    return Object.assign({ path, dep, arr, ti, garage, retStart, retDur, retEnd: retStart + retDur }, p);
  });
  const stageParts = [0, 1, 2, 3, 4, 5].map((k) => sched.filter((p) => p.st === k));
  const INSP = STARTS[4], FT0 = STARTS[5];
  const SKIN_T = INSP + D.checks[1].at, SPIN_T = INSP + D.checks[2].at, LIGHT_T = INSP + D.checks[3].at, FLIGHT_END = FT0 + STG;

  // autonomous carts
  const agvM = { slate: M(0x5d6d75, { roughness: 0.35 }), green: M(COL.green, { emissive: COL.green, emissiveIntensity: 0.45, roughness: 0.3 }), crate: M(0xf3f6f7, { roughness: 0.3, clearcoat: 0.9 }) };
  const agvs = sched.map((p) => {
    const g = new THREE.Group();
    B(2.1, 0.34, 1.35, agvM.slate, 0, 0.34, 0, g, true, 0.14); B(2.0, 0.07, 1.25, agvM.green, 0, 0.55, 0, g, false, 0.03); B(0.1, 0.1, 1.0, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1.06, 0.36, 0, g, false, 0);
    [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]].forEach((q) => { const w = CY(0.17, 0.17, 0.12, M(0x1c2226, { roughness: 0.5 }), q[0], 0.17, q[1], g, 16); w.rotation.x = Math.PI / 2; });
    const crate = new THREE.Group(); crate.position.set(0, 0.58, 0); g.add(crate);
    B(1.45, 1.0, 1.05, agvM.crate, 0, 0.5, 0, crate, true, 0.12); B(1.5, 0.2, 1.1, agvM.green, 0, 0.72, 0, crate, false, 0.06); B(1.5, 1.04, 0.2, agvM.green, 0, 0.52, 0, crate, false, 0.06);
    g.visible = false; scene.add(g);
    pickable(g, { type: 'agv', id: p.id });
    return { g, crate };
  });

  // workers
  function makeWorker(vest) {
    const g = new THREE.Group(), pv = new THREE.Group(); g.add(pv);
    const over = M(0xe8eef0, { roughness: 0.6, clearcoat: 0.1 }), vestM = M(vest, { roughness: 0.55 }), skin = M(0xd7a67e, { roughness: 0.6, clearcoat: 0 }), slate = M(COL.slate, { roughness: 0.6 }), helm = M(0xffffff, { roughness: 0.25, clearcoat: 1 });
    const legs = [-0.1, 0.1].map((x) => { const l = new THREE.Group(); l.position.set(x, 0.62, 0); B(0.16, 0.62, 0.18, slate, 0, -0.31, 0, l, true, 0.06); pv.add(l); return l; });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 6, 14), over); torso.position.y = 1.08; torso.castShadow = true; pv.add(torso);
    CY(0.235, 0.235, 0.34, vestM, 0, 1.1, 0, pv, 18);
    S(0.17, 0.18, 0.17, skin, 0, 1.6, 0, pv, 16);
    const hh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), helm); hh.position.y = 1.62; hh.castShadow = true; pv.add(hh);
    const arms = [-0.3, 0.3].map((x) => { const a = new THREE.Group(); a.position.set(x, 1.32, 0); B(0.1, 0.52, 0.11, over, 0, -0.26, 0, a, true, 0.04); S(0.06, 0.06, 0.06, skin, 0, -0.55, 0, a, 10); pv.add(a); return a; });
    g.userData.w = { pv, legs, arms, torso };
    g.scale.setScalar(1.35);
    scene.add(g); pickable(g, { type: 'worker' });
    return g;
  }
  const crew = [];
  SX.forEach((x, k) => {
    crew.push({ g: makeWorker(COL.green), k, x: x + 3.6, z: 8.1, face: Math.PI, ph: k }, { g: makeWorker(0x2a8fbf), k, x: x - 3.4, z: -8.2, face: 0, ph: k + 2 });
  });
  crew.push({ g: makeWorker(COL.green), k: 4, x: SX[4] - 7.4, z: 3.6, face: Math.PI / 2, ph: 5 });
  // ground crew on the landing pad
  crew.push({ g: makeWorker(0xe6a02a), k: 5, x: HP.x + 11, z: HP.z + 6, face: -Math.PI / 2, ph: 1, idleOnly: true }, { g: makeWorker(0xe6a02a), k: 5, x: HP.x - 11, z: HP.z + 7, face: Math.PI / 2, ph: 3, idleOnly: true });
  const patrols = [
    { g: makeWorker(0xe6a02a), path: loopPath([[-40, -3.6], [-12, -3.6], [-12, -10], [-40, -10], [-40, -3.6]], 3), v: 1.6, o: 0 },
    { g: makeWorker(0xe6a02a), path: loopPath([[-12, 3.2], [-40, 3.2], [-40, -3.6], [-12, -3.6], [-12, 3.2]], 3), v: 1.5, o: 20 },
  ];
  // forklift
  const fork = (function () {
    const g = new THREE.Group(), white = M(0xf6f9fa, { roughness: 0.3, clearcoat: 0.9 }), gr = M(COL.green, { roughness: 0.3, clearcoat: 0.8 }), blk = M(0x20272b, { roughness: 0.5 });
    B(1.9, 0.9, 1.15, white, -0.1, 0.8, 0, g, true, 0.2); B(1.92, 0.2, 1.17, gr, -0.1, 0.55, 0, g, false, 0.08); B(1.0, 0.1, 1.0, blk, -0.3, 1.9, 0, g, true, 0.04);
    [[-0.7, 0.55], [-0.7, -0.55], [0.1, 0.55], [0.1, -0.55]].forEach((q) => B(0.07, 1.0, 0.07, blk, q[0], 1.4, q[1], g, true, 0));
    B(0.14, 3.0, 0.9, blk, 0.95, 1.6, 0, g, true, 0.04); B(1.5, 0.08, 0.2, blk, 1.7, 0.2, 0.3, g, true, 0.02); B(1.5, 0.08, 0.2, blk, 1.7, 0.2, -0.3, g, true, 0.02);
    [[-0.7, 0.62], [0.6, 0.62], [-0.7, -0.62], [0.6, -0.62]].forEach((q) => { const w = CY(0.27, 0.27, 0.22, blk, q[0], 0.27, q[1], g, 18); w.rotation.x = Math.PI / 2; });
    const load = new THREE.Group(); load.position.set(1.8, 0.3, 0); g.add(load);
    B(1.3, 0.14, 1.2, MM(0xc9a77a), 0, 0.07, 0, load, true, 0.04); B(1.15, 0.9, 1.0, cartonTints[0], 0, 0.65, 0, load, true, 0.08); B(1.18, 0.14, 1.04, gr, 0, 0.8, 0, load, false, 0.04);
    g.userData.load = load; scene.add(g); pickable(g, { type: 'forklift' });
    return g;
  })();
  const forkPath = loopPath([[-10.8, -12.5], [-45, -12.5], [-45, 1.5], [-10.8, 1.5], [-10.8, -12.5]], 6);

  // ---------- labels ----------
  const labelsEl = $('#labels'), labels = [];
  function addLabel(cls, html, getPos, onClick) {
    const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = html; labelsEl.appendChild(el);
    if (onClick) el.addEventListener('click', onClick);
    const o = { el, getPos, v: new THREE.Vector3() }; labels.push(o); return o;
  }
  const stageLabels = [];
  let acLabel = null;
  const stagePos = [0, 1, 2, 3, 4, 5].map((k) => (k < 5 ? new THREE.Vector3(SX[k], 8.2 + (k % 2) * 3.2, 0) : new THREE.Vector3(HP.x, 6.5, HP.z)));
  function buildLabels() {
    labels.splice(0).forEach((l) => l.el.remove()); stageLabels.length = 0;
    stagePos.forEach((pos, k) => {
      const l = addLabel('', '<span class="n">' + (k + 1) + '</span><span class="t">' + N(D.stages[k].n) + '<small>' + fmt(STARTS[k]) + ' – ' + fmt(STARTS[k] + STG) + '</small></span><span class="mini"><i></i></span>',
        () => pos, () => select({ type: 'station', i: k }));
      stageLabels.push(l);
    });
    addLabel('zone small', '<span class="n">W</span><span class="t">' + L('lblWarehouse') + '</span>', () => new THREE.Vector3(-26, 11.6, -12), () => select({ type: 'warehouse' }));
    acLabel = addLabel('small', '<span class="n">H</span><span class="t">Hili A1<small class="pc"></small></span>', () => new THREE.Vector3(ac.root.position.x, ac.root.position.y + 5.6, ac.root.position.z), () => select({ type: 'aircraft' }));
  }

  // ---------- camera ----------
  const cam = { t: new THREE.Vector3(35, 0, -4), r: 185, az: 0.44, ph: 1.0 };
  const PRESETS = {
    overview: { t: [35, 0, -4], r: 185, az: 0.44, ph: 1.0 },
    warehouse: { t: [-26, 1, -2], r: 62, az: -0.3, ph: 0.95 },
    line: { t: [36, 1, 0], r: 98, az: 0.34, ph: 1.0 },
    follow: { t: [8, 2, 0], r: 34, az: 0.55, ph: 1.0 },
  };
  // camera tour keyframes: [time, target, distance, azimuth, polar]; a cardinal spline keeps the move continuous (no stop-and-go)
  const TOUR = [[0, [-24, 1, -2], 84, -0.25, 0.86], [5, [-14, 1, 4], 72, -0.1, 0.86], [8, [8, 1, 2], 48, 0.45, 0.82], [21, [8, 1, 0], 42, 1.0, 0.86]];
  for (let k = 1; k < 5; k++) { const sgn = k % 2 ? -1 : 1; TOUR.push([STARTS[k] + 3, [SX[k], 1, 0], k === 4 ? 38 : 42, sgn * 0.5, 0.84], [STARTS[k] + 21, [SX[k], 1, 0], k === 4 ? 34 : 38, sgn * 1.05, 0.88]); }
  TOUR.push([FT0 - 1, [82, 3, -3], 62, 0.55, 0.85], [FT0 + 4, [HP.x, 2, HP.z], 40, 0.7, 0.8], [FT0 + 9, [HP.x - 4, 9, HP.z], 56, 1.05, 0.72], [FT0 + 12.5, [HP.x - 20, 8, HP.z], 92, 0.35, 0.8], [FT0 + 17, [HP.x - 4, 8, HP.z], 56, 0.7, 0.78], [FT0 + 22, [HP.x, 3, HP.z], 38, 1.0, 0.85], [TOTAL, [60, 2, -4], 140, 0.5, 0.95]);
  const TF = TOUR.map((k) => [k[1][0], k[1][1], k[1][2], k[2], k[3], k[4]]);
  function tourTan(j) { if (j <= 0 || j >= TOUR.length - 1) return [0, 0, 0, 0, 0, 0]; const dt = TOUR[j + 1][0] - TOUR[j - 1][0]; return TF[j].map((_, c) => (TF[j + 1][c] - TF[j - 1][c]) / dt); }
  function tourCam(t) {
    let i = 0; while (i < TOUR.length - 2 && t > TOUR[i + 1][0]) i++;
    const h = TOUR[i + 1][0] - TOUR[i][0], u = clamp((t - TOUR[i][0]) / h, 0, 1), u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2, m0 = tourTan(i), m1 = tourTan(i + 1);
    const v = TF[i].map((a, c) => h00 * a + h10 * h * m0[c] + h01 * TF[i + 1][c] + h11 * h * m1[c]);
    cam.t.set(v[0], v[1], v[2]); cam.r = v[3]; cam.az = v[4]; cam.ph = clamp(v[5], 0.3, 1.4);
  }
  function applyCam() {
    const s = Math.sin(cam.ph);
    camera.position.set(cam.t.x + cam.r * s * Math.sin(cam.az), cam.t.y + cam.r * Math.cos(cam.ph), cam.t.z + cam.r * s * Math.cos(cam.az));
    camera.lookAt(cam.t);
  }
  let mode = 'overview', tween = null, zoomT = null; const vel = { az: 0, ph: 0 };
  const followTarget = (v) => v.set(ac.root.position.x, ac.root.position.y + 2, ac.root.position.z);
  function syncModeUi() {
    document.querySelectorAll('#cams button').forEach((b) => b.classList.toggle('on', b.dataset.c === mode));
    const tb = $('#tourBtn'); tb.classList.toggle('on', mode === 'tour'); tb.querySelector('span').textContent = L(mode === 'tour' ? 'camTourStop' : 'camTour');
  }
  function setMode(m, instant) {
    mode = m; zoomT = null; vel.az = vel.ph = 0; syncModeUi();
    if (m === 'tour' || !PRESETS[m]) { tween = null; return; }
    const p = PRESETS[m], to = { t: new THREE.Vector3(...p.t), r: p.r, az: p.az, ph: p.ph };
    if (m === 'follow') followTarget(to.t);
    if (instant || CAPTURE) { cam.t.copy(to.t); cam.r = to.r; cam.az = to.az; cam.ph = to.ph; tween = null; return; }
    tween = { t0: performance.now(), dur: 1700, from: { t: cam.t.clone(), r: cam.r, az: cam.az, ph: cam.ph }, to };
  }
  function stepTween() {
    if (!tween) return;
    const u = smr((performance.now() - tween.t0) / tween.dur), f = tween.from, o = tween.to;
    if (mode === 'follow') followTarget(o.t);
    cam.t.lerpVectors(f.t, o.t, u); cam.r = lerp(f.r, o.r, u); cam.az = lerp(f.az, o.az, u); cam.ph = lerp(f.ph, o.ph, u);
    if (u >= 1) tween = null;
  }
  // input
  const ptrs = new Map(); let drag = null, lastPinch = 0;
  function userMoved() { tween = null; if (mode === 'tour') { mode = 'free'; syncModeUi(); } }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); vel.az = vel.ph = 0;
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), btn: e.button, shift: e.shiftKey };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) { hover(e); return; }
    const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) { cam.r = clamp(cam.r * (lastPinch / d), 12, 300); userMoved(); } lastPinch = d; drag && (drag.moved += 99); return;
    }
    if (!drag) return; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 4) return;
    userMoved();
    if (drag.btn === 2 || drag.shift) {
      const k = cam.r * 0.0017; if (mode === 'follow') { mode = 'free'; syncModeUi(); }
      cam.t.x += (-dx * Math.cos(cam.az) - dy * Math.sin(cam.az)) * k; cam.t.z += (dx * Math.sin(cam.az) - dy * Math.cos(cam.az)) * k;
    } else { cam.az -= dx * 0.005; cam.ph = clamp(cam.ph - dy * 0.005, 0.18, 1.45); vel.az = -dx * 0.0045; vel.ph = -dy * 0.0045; }
  });
  const endPtr = (e) => {
    const was = drag; ptrs.delete(e.pointerId); if (ptrs.size < 2) lastPinch = 0;
    if (was && e.type === 'pointerup' && was.moved < 5 && performance.now() - was.t < 600 && was.btn === 0) { vel.az = vel.ph = 0; pick(e); }
    if (!ptrs.size) drag = null;
  };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (zoomT === null) zoomT = cam.r; zoomT = clamp(zoomT * Math.exp(e.deltaY * 0.0012), 12, 300); userMoved(); }, { passive: false });
  function stepInput(dt) { // inertia + eased zoom (live view only)
    if (!drag && (Math.abs(vel.az) > 1e-4 || Math.abs(vel.ph) > 1e-4)) { cam.az += vel.az; cam.ph = clamp(cam.ph + vel.ph, 0.18, 1.45); const f = Math.pow(0.04, dt); vel.az *= f; vel.ph *= f; }
    if (zoomT !== null) { cam.r += (zoomT - cam.r) * (1 - Math.exp(-dt * 9)); if (Math.abs(zoomT - cam.r) < 0.02) zoomT = null; }
  }

  // picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let hoverT = 0;
  function infoAt(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, true);
    for (const h of hits) { let o = h.object; while (o) { if (o.userData.pick) return o.userData.pick; o = o.parent; } }
    return null;
  }
  function hover(e) { const n = performance.now(); if (n - hoverT < 80) return; hoverT = n; canvas.style.cursor = infoAt(e) ? 'pointer' : ''; }
  function pick(e) { const i = infoAt(e); if (i) select(i); else if (!CAPTURE) closePanel(); }

  // ---------- simulation ----------
  let time = 0, playing = true, speed = 1, selected = null;
  const stageOf = (t) => { let k = 0; for (let i = 0; i < NS; i++) if (t >= STARTS[i]) k = i; return k; };
  const stageProg = (k, t) => clamp((t - STARTS[k]) / STG, 0, 1);
  const inXfer = (t) => { const k = stageOf(t); return k < NS - 1 && t > STARTS[k] + STG && t < STARTS[k + 1]; };
  const curStage = (t) => { const k = stageOf(t); return inXfer(t) ? k + 1 : k; };
  const STN = SX.map((x) => [x, 0]).concat([[HP.x, HP.z]]);
  function groundPos(t) {
    for (let k = 0; k < NS; k++) {
      const s = STARTS[k];
      if (t < s + STG || k === NS - 1) return STN[k];
      if (t < STARTS[k + 1]) { const u = smr((t - s - STG) / (STARTS[k + 1] - s - STG)); return [lerp(STN[k][0], STN[k + 1][0], u), lerp(STN[k][1], STN[k + 1][1], u)]; }
    }
    return STN[NS - 1];
  }
  // test flight: roll-out → vertical take-off → circuit → vertical landing
  const FR_ = 20, FC = { x: HP.x - FR_, z: HP.z }, FY = 15;
  function acPose(t) {
    const g = groundPos(t), p = { x: g[0], y: 0, z: g[1], yaw: 0, roll: 0 };
    const u = t - FT0;
    if (u >= 3) {
      const rise = smr((u - 3) / 5), fall = smr((u - 16) / 5), th = Math.PI * 2 * sm((u - 8) / 7);
      p.y = FY * (rise - fall);
      p.x = FC.x + FR_ * Math.cos(th); p.z = FC.z - FR_ * Math.sin(th);
      p.yaw = (Math.PI / 2) * (sm((u - 5) / 3) - sm((u - 15) / 2.5));
      p.roll = -0.2 * Math.sin(Math.PI * clamp((u - 8.4) / 6.2, 0, 1));
    }
    return p;
  }
  const ramp = (t, a, b) => sm((t - a) / (b - a));
  const liftSpeed = (t) => { const u = t - FT0; return Math.max(ramp(t, SPIN_T, SPIN_T + 1.5) * (1 - ramp(t, FT0 - 3, FT0 - 1)), ramp(u, 1, 3) * (1 - ramp(u, 9, 11.5)) + ramp(u, 14, 16) * (1 - ramp(u, 21, 22.5))); };
  const pushSpeed = (t) => { const u = t - FT0; return ramp(u, 7, 9) * (1 - ramp(u, 16, 17.5)); };
  const ANG_DT = 0.02, angL = [0], angP = [0];
  for (let t = 0; t < TOTAL + 0.1; t += ANG_DT) { angL.push(angL[angL.length - 1] + liftSpeed(t) * 40 * ANG_DT); angP.push(angP[angP.length - 1] + pushSpeed(t) * 46 * ANG_DT); }
  const angAt = (arr, t) => { const f = clamp(t / ANG_DT, 0, arr.length - 2), i = Math.floor(f); return lerp(arr[i], arr[i + 1], f - i); };
  const tri = (u) => { u = ((u % 2) + 2) % 2; return u < 1 ? u : 2 - u; };
  const heading = (path, s) => { const a = path.at(s - 1.2), b = path.at(s + 1.2); return -Math.atan2(b[1] - a[1], b[0] - a[0]); };

  function simulate(t) {
    const pose = acPose(t), fade = sm((t - (TOTAL - 1.5)) / 1.5), sc = Math.max(0.001, 1 - fade);
    ac.root.position.set(pose.x, pose.y, pose.z); ac.root.rotation.y = pose.yaw; ac.a.rotation.x = pose.roll; ac.root.scale.setScalar(sc);
    // assembly cart: stays under the aircraft until take-off, then drives away
    { const u = t - FT0, g = groundPos(Math.min(t, FT0)), away = clamp((u - 3) / 1.6, 0, 1);
      ac.cart.position.set(g[0], 0, g[1] + sm(away) * 14); ac.cart.visible = away < 1 && t >= 0; ac.cart.scale.setScalar(Math.min(1, 0.02 + sm(t / 1.2)) * sc); }
    sched.forEach((p, i) => {
      const grp = ac.P[p.id], u = (t - p.ti) / 1.5;
      grp.visible = t >= p.ti;
      if (grp.visible) {
        const e = eob(u), c = p.c, o0 = [-c[0], 1.8 - c[1], 8.3 - c[2]];
        grp.position.set(o0[0] * (1 - e), o0[1] * (1 - e) + 2.4 * Math.sin(Math.PI * clamp(u, 0, 1)), o0[2] * (1 - e));
        grp.rotation.y = (1 - clamp(u, 0, 1)) * 0.5;
      }
      crates[p.id].visible = t < p.dep;
      const a = agvs[i]; let s = -1, back = false;
      if (t >= p.dep && t < p.arr) s = p.path.L * ease((t - p.dep) / (p.arr - p.dep));
      else if (t >= p.arr && t < p.retStart) s = p.path.L;
      else if (t >= p.retStart && t < p.retEnd) { s = p.path.L - (p.path.L - p.garage) * ease((t - p.retStart) / p.retDur); back = true; }
      a.g.visible = s >= 0;
      if (s >= 0) {
        const q = p.path.at(s); a.g.position.set(q[0], 0, q[1]); a.g.rotation.y = heading(p.path, s) + (back ? Math.PI : 0); a.crate.visible = t < p.ti;
        a.g.scale.setScalar(Math.min(sm((t - p.dep) / 0.5), 1 - sm((t - (p.retEnd - 0.6)) / 0.6)) * 0.98 + 0.02);
      }
    });
    // transparent skin → solid, livery appears
    const sk = sm((t - (SKIN_T - 1.4)) / 1.4); ac.setSkin(sk); ac.livery.visible = sk > 0.02;
    const aL = angAt(angL, t), aP = angAt(angP, t), ls = liftSpeed(t), ps = pushSpeed(t);
    ac.props.forEach((p) => { p.g.rotation.y = (aL + 0.35) * p.dir; p.disc.visible = ls > 0.45; });
    ac.pp.rotation.x = aP; ac.pdisc.visible = ps > 0.45;
    ac.lights.forEach((l) => { l.emissiveIntensity = t >= LIGHT_T && t < TOTAL - 1.5 ? 2.5 : 0; });
    const sc2 = t > INSP + 1 && t < INSP + 9.2;
    ac.scan.visible = sc2; if (sc2) ac.scan.position.x = lerp(-5, 4.2, smr(tri((t - INSP - 1) / 4.1)));
    ac.cartLed.emissiveIntensity = 0.5 + 0.4 * Math.sin(t * 3);
    const cs = curStage(t);
    SX.forEach((_, k) => {
      const st = t >= STARTS[k] + STG ? 2 : (k === cs && t >= STARTS[k] - 1e-6 ? 1 : 0);
      stationLED[k].emissiveIntensity = st === 1 ? 1.6 + 0.3 * Math.sin(t * 3) : st === 2 ? 0.7 : 0.12; stationRing[k].emissiveIntensity = st === 1 ? 1.1 + 0.25 * Math.sin(t * 3) : st === 2 ? 0.5 : 0.1;
    });
    { const fl = t > FT0 - 3 && t < FLIGHT_END + 1; fx.padLights.forEach((m, i) => { m.emissiveIntensity = fl ? 0.4 + 1.3 * Math.max(0, Math.sin(t * 4 - i * 0.5)) : 0.3; }); fx.padRing.emissiveIntensity = fl ? 0.9 + 0.3 * Math.sin(t * 3) : 0.45; fx.windsock.rotation.y = 0.5 * Math.sin(t * 0.45) + 0.2; }
    crew.forEach((c) => {
      const w = c.g.userData.w, active = !c.idleOnly && t >= STARTS[c.k] && t < STARTS[c.k] + STG;
      c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.face;
      const ph = t * 6.5 + c.ph;
      w.legs.forEach((l) => (l.rotation.x = 0));
      if (active) { w.arms[1].rotation.x = -1.25 + Math.sin(ph) * 0.35; w.arms[0].rotation.x = -0.9 + Math.cos(ph * 0.8) * 0.2; w.pv.position.y = Math.abs(Math.sin(ph * 0.5)) * 0.015; w.pv.rotation.x = 0.12; }
      else { w.arms[0].rotation.x = 0.05 + Math.sin(t * 1.3 + c.ph) * 0.04; w.arms[1].rotation.x = 0.05; w.pv.position.y = 0; w.pv.rotation.x = 0; }
    });
    patrols.forEach((pt) => {
      const d = ((t * pt.v + pt.o) % pt.path.L), q = pt.path.at(d), h = pt.path.at(d + 0.6), w = pt.g.userData.w, ph = t * 7;
      pt.g.position.set(q[0], 0, q[1]); pt.g.rotation.y = Math.atan2(h[0] - q[0], h[1] - q[1]);
      w.legs[0].rotation.x = Math.sin(ph) * 0.5; w.legs[1].rotation.x = -Math.sin(ph) * 0.5; w.arms[0].rotation.x = -Math.sin(ph) * 0.4; w.arms[1].rotation.x = Math.sin(ph) * 0.4;
    });
    { const d = (t * 2.6) % forkPath.L, q = forkPath.at(d); fork.position.set(q[0], 0, q[1]); fork.rotation.y = heading(forkPath, d); fork.userData.load.visible = d < forkPath.L * 0.5; }
    fx.arms.forEach((a) => {
      const A = a.arm.userData.arm, s0 = STARTS[a.k], act = sm((t - s0) / 1.6) * (1 - sm((t - (s0 + STG - 1.6)) / 1.6)), ph = t * 1.2 + a.k;
      A.base.rotation.y = lerp(-1.0, -2.2 + 0.35 * Math.sin(ph * 0.8), act);
      A.sh.rotation.z = lerp(1.35, 0.7 + 0.25 * Math.sin(ph * 1.3), act);
      A.el.rotation.z = lerp(-2.55, -1.15 + 0.3 * Math.cos(ph * 1.1), act);
    });
    { const c = fx.conveyor; c.beltT.offset.x = -((t * 2.4) / 4) % 1;
      c.boxes.forEach((b, i) => { const px = ((t * 2.4 + i * (c.CL / c.boxes.length)) % c.CL); b.position.x = c.cx0 + px; b.scale.setScalar(clamp(Math.min(px, c.CL - px) / 2, 0.01, 1)); }); }
    { const u = t * 0.042 * Math.PI * 2, bx = lerp(-4, 60, 0.5 - 0.5 * Math.cos(u)), dx = Math.sin(u), sg = Math.tanh(dx * 9);
      fx.bot.position.set(bx, 0, 12.6 + Math.sin(t * 0.5) * 0.4); fx.bot.rotation.y = (1 - sg) * 0.5 * Math.PI; }
    { const a = t * 0.13, dr = fx.drone; dr.g.position.set(34 + 40 * Math.cos(a), 17 + 1.2 * Math.sin(t * 0.8), 1 + 18 * Math.sin(a));
      dr.g.rotation.y = -Math.atan2(18 * Math.cos(a), -40 * Math.sin(a)); dr.g.rotation.z = 0.06 * Math.sin(t * 0.8); dr.props.forEach((p) => { p.g.rotation.y = t * 70 * p.dir; }); }
    fx.holo.diamond.rotation.y = t * 1.2; fx.holo.diamond.position.y = 2.0 + 0.12 * Math.sin(t * 2);
    fx.traffic.forEach((v) => { const m = (t * v.v + v.off) % v.span, x = v.dir > 0 ? v.x0 + m : v.x0 + v.span - m; v.g.position.set(x, 0, v.z); v.g.rotation.y = v.dir > 0 ? 0 : Math.PI; });
  }

  // ---------- UI ----------
  const els = {
    kOverall: $('#kOverall'), kElapsed: $('#kElapsed'), kRemain: $('#kRemain'), kParts: $('#kParts'), kStage: $('#kStage'), ring: $('#ringFg'),
    scrub: $('#scrub'), play: $('#play'), panel: $('#panel'), steps: $('#steps'),
  };
  function buildSteps() {
    els.steps.innerHTML = '';
    D.stages.forEach((s, k) => {
      const b = document.createElement('button'); b.className = 'step';
      b.innerHTML = '<span class="dot">' + (k + 1) + '</span><span class="tx"><b>' + N(s.n) + '</b><small>' + fmt(STARTS[k]) + ' – ' + fmt(STARTS[k] + STG) + '</small></span>';
      b.addEventListener('click', () => { select({ type: 'station', i: k }); time = STARTS[k] + 0.2; if (!playing) refresh(); });
      els.steps.appendChild(b);
    });
  }
  const lastUi = {};
  function setText(el, key, v) { if (lastUi[key] !== v) { lastUi[key] = v; el.textContent = v; } }
  function updateHud(t) {
    const done = sched.filter((p) => t >= p.ti).length, ov = t / TOTAL, cs = curStage(t), fin = t >= FLIGHT_END;
    setText(els.kOverall, 'ov', Math.round(ov * 100) + '%'); els.ring.style.strokeDashoffset = String(113.1 * (1 - ov));
    setText(els.kElapsed, 'el', fmt(t)); setText(els.kRemain, 'rm', fmt(TOTAL - t)); setText(els.kParts, 'pt', done + ' / ' + sched.length);
    const label = fin ? L('ready') : (inXfer(t) ? L('moving') + ' ' + (cs + 1) : (cs + 1) + ' · ' + N(D.stages[cs].n));
    setText(els.kStage, 'st', label);
    if (document.activeElement !== els.scrub) els.scrub.value = String(Math.round((t / TOTAL) * 1000));
    els.steps.querySelectorAll('.step').forEach((s, k) => { s.classList.toggle('active', k === cs && !fin); s.classList.toggle('done', t >= STARTS[k] + STG); });
    stageLabels.forEach((l, k) => { l.el.classList.toggle('active', k === cs && t < STARTS[k] + STG); l.el.classList.toggle('done', t >= STARTS[k] + STG); l.el.classList.toggle('sel', !!selected && selected.type === 'station' && selected.i === k); l.el.querySelector('.mini i').style.width = Math.round(stageProg(k, t) * 100) + '%'; });
    if (acLabel) { const pc = acLabel.el.querySelector('.pc'); const v = Math.round(ov * 100) + '%'; if (pc && pc.textContent !== v) pc.textContent = v; }
  }
  function stateOf(k, t) { return t >= STARTS[k] + STG ? 'done' : (t >= STARTS[k] ? 'run' : 'wait'); }
  let panelKey = '';
  function renderPanel(t) {
    if (!selected) return;
    let kind = '', title = '', icon = '', stat = '', cls = '', prog = 0, desc = '', list = '', foot = '';
    const s = selected;
    if (s.type === 'station') {
      const k = s.i, st = stateOf(k, t), sg = D.stages[k]; kind = L('station') + ' ' + (k + 1); title = N(sg.n); icon = String(k + 1); desc = N(sg.d);
      stat = st === 'done' ? L('done') : st === 'run' ? L('running') : L('waiting'); cls = st === 'done' ? '' : st === 'run' ? 'run' : 'wait'; prog = stageProg(k, t);
      const item = (ok, run, name, tag) => '<li class="' + (ok ? 'ok' : run ? 'run' : '') + '"><i></i>' + name + '<em>' + tag + '</em></li>';
      if (k < 4) list = stageParts[k].map((p) => item(t >= p.ti, t >= p.dep && t < p.ti, N(p.n), t >= p.ti ? L('installed') : t >= p.dep ? '…' : fmt(p.ti))).join('');
      else if (k === 4) list = D.checks.map((c) => { const ok = t >= INSP + c.at, run = !ok && t >= INSP && t >= INSP + c.at - 4; return item(ok, run, N(c.n), ok ? L('passed') : run ? L('scanning') : L('pending')); }).join('');
      else list = D.flight.map((c) => { const ok = t >= FT0 + c.at, run = !ok && t >= FT0 && t >= FT0 + c.at - 4; return item(ok, run, N(c.n), ok ? L('flown') : run ? L('running') : L('pending')); }).join('');
      foot = L('stageTime') + ': ' + STG + ' ' + L('demoSec');
    } else if (s.type === 'aircraft') {
      kind = L('aircraft'); title = 'Hili A1'; icon = 'H'; desc = L('acDesc'); prog = t / TOTAL; stat = t >= FLIGHT_END ? L('ready') : L('running'); cls = t >= FLIGHT_END ? '' : 'run';
      list = [[L('span'), '11.9 m'], [L('length'), '8.9 m'], [L('height'), '3.1 m'], [L('payload'), '250 kg'], [L('cargoBay'), L('cargoV')]].map((r) => '<li class="ok"><i></i>' + r[0] + '<em>' + r[1] + '</em></li>').join('');
    } else if (s.type === 'warehouse') {
      const picked = sched.filter((p) => t >= p.dep).length; kind = L('warehouse'); title = L('whWarehouse'); icon = 'W'; desc = L('whDesc'); prog = picked / sched.length; stat = L('whStock') + ' ' + picked + ' / ' + sched.length; cls = 'run';
      list = sched.map((p) => '<li class="' + (t >= p.dep ? 'ok' : '') + '"><i></i>' + N(p.n) + '<em>' + (t >= p.dep ? L('picked') : L('inStock')) + '</em></li>').join('');
    } else if (s.type === 'agv') {
      const p = sched.find((q) => q.id === s.id); kind = L('vehicle'); title = L('cartCarrying') + ' ' + N(p.n); icon = 'A'; desc = L('cartDesc'); stat = t >= p.ti ? L('installed') : t >= p.dep ? L('running') : L('waiting'); cls = t >= p.dep && t < p.ti ? 'run' : t >= p.ti ? '' : 'wait'; prog = clamp((t - p.dep) / (p.ti - p.dep), 0, 1);
    } else if (s.type === 'forklift') { kind = L('vehicle'); title = L('forklift'); icon = 'F'; desc = L('forkliftDesc'); stat = L('running'); cls = 'run'; prog = (t * 2.6 % forkPath.L) / forkPath.L; }
    else if (s.type === 'info') { kind = L('equipment'); title = L('info_' + s.key + '_t'); icon = title.charAt(0); desc = L('info_' + s.key + '_d'); stat = L('running'); cls = 'run'; prog = 0.5 + 0.5 * Math.sin(t * 0.3); }
    else { kind = L('team'); title = L('worker'); icon = 'T'; desc = L('workerDesc'); stat = L('running'); cls = 'run'; prog = 0.5; }
    const key = [s.type, s.i, s.id, s.key, lang, title, stat, Math.round(prog * 50), list].join('|');
    if (key === panelKey) return; panelKey = key;
    $('#pKind').textContent = kind; $('#pTitle').textContent = title; $('#pIcon').textContent = icon;
    const st = $('#pStatus'); st.textContent = stat; st.className = 'p-status ' + cls; $('#pBar').style.width = Math.round(prog * 100) + '%'; $('#pDesc').textContent = desc; $('#pList').innerHTML = list; $('#pFoot').textContent = foot;
  }
  function select(info) { selected = info; panelKey = ''; els.panel.classList.remove('hidden'); renderPanel(time); }
  function closePanel() { selected = null; els.panel.classList.add('hidden'); }
  $('#panelClose').addEventListener('click', closePanel);

  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i]').forEach((e) => { e.textContent = L(e.dataset.i); });
    document.querySelectorAll('[data-i-title]').forEach((e) => { e.title = L(e.dataset.iTitle); });
    $('#lang').textContent = lang === 'ar' ? 'EN' : 'AR';
    $('#specs').innerHTML = D.specs.map((s) => '<div><small>' + L(s.k) + '</small><b>' + s.v + '<i>' + s.u + '</i></b></div>').join('');
    document.title = lang === 'ar' ? 'مصنع هيلي الذكي' : 'Hili Smart Factory';
    buildLabels(); buildSteps(); syncModeUi(); Object.keys(lastUi).forEach((k) => delete lastUi[k]); panelKey = '';
  }
  $('#lang').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('hili-lang', lang); } catch (e) { /* ignore */ } applyLang(); refresh(); });
  $('#play').addEventListener('click', () => togglePlay());
  function togglePlay(v) { playing = v === undefined ? !playing : v; els.play.textContent = playing ? '❚❚' : '▶'; }
  $('#restart').addEventListener('click', () => { time = 0; togglePlay(true); });
  document.querySelectorAll('#speed button').forEach((b) => b.addEventListener('click', () => { speed = +b.dataset.s; document.querySelectorAll('#speed button').forEach((x) => x.classList.toggle('on', x === b)); }));
  document.querySelectorAll('#cams button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.c)));
  $('#tourBtn').addEventListener('click', () => { if (mode === 'tour') { setMode('free'); return; } togglePlay(true); setMode('tour'); });
  els.scrub.addEventListener('input', () => { time = (+els.scrub.value / 1000) * TOTAL; refresh(); });
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); togglePlay(); } });

  // ---------- loop ----------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    if (w / h < 1) camera.fov = 28 * Math.min(2.2, 1.3 / (w / h) ** 0.7); else camera.fov = 28; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  const tmp = new THREE.Vector3();
  function projectLabels() {
    const w = window.innerWidth, h = window.innerHeight;
    labels.forEach((l) => {
      tmp.copy(l.getPos()).project(camera);
      const vis = tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
      l.el.style.opacity = vis ? '1' : '0'; l.el.style.pointerEvents = vis ? 'auto' : 'none';
      l.el.style.transform = 'translate(' + ((tmp.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-tmp.y * 0.5 + 0.5) * h - 4).toFixed(1) + 'px) translate(-50%,-100%)';
    });
  }
  function refresh(dt) {
    time = clamp(time, 0, TOTAL); simulate(time);
    if (mode === 'tour') tourCam(time);
    else if (mode === 'follow' && !tween) { const k = CAPTURE ? 1 : 1 - Math.exp(-(dt || 0.016) * 4); followTarget(tmp); cam.t.lerp(tmp, k); }
    if (dt !== undefined) stepInput(dt);
    stepTween(); applyCam(); updateHud(time); renderPanel(time); projectLabels(); renderer.render(scene, camera);
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { time += dt * speed; if (time >= TOTAL) time -= TOTAL; }   // endless loop: a new aircraft starts as soon as the last one has landed
    refresh(dt); requestAnimationFrame(loop);
  }

  // ---------- boot ----------
  applyLang(); resize();
  if (Q.has('t')) time = +Q.get('t');
  simulate(time); setMode('overview', true);
  if (Q.get('cam') && PRESETS[Q.get('cam')]) setMode(Q.get('cam'), true);
  if (Q.get('tour') === '1') setMode('tour', true);
  ['r', 'az', 'ph'].forEach((k) => { if (Q.has(k)) cam[k] = +Q.get(k); });
  if (Q.has('sel')) select({ type: 'station', i: +Q.get('sel') });
  if (Q.has('pause') || CAPTURE) togglePlay(false);
  refresh();
  window.__hili = {
    frame: (t, m) => { if (m && mode !== m) setMode(m, true); time = t; refresh(); },
    TOTAL, ready: true, setLang: (l) => { lang = l; applyLang(); refresh(); },
    select, closePanel,
  };
  if (!CAPTURE) requestAnimationFrame(loop);
  setTimeout(() => $('#loading').classList.add('off'), 150);
})();
