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
  const STG = 22, XFER = 3, NS = 5, PERIOD = STG + XFER, TOTAL = NS * STG + (NS - 1) * XFER; // 122 s demo time
  const SX = [8, 22, 36, 50, 64];
  const SPEED = 10; // cart speed (units/s)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const smr = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
  const eob = (t) => { t = clamp(t, 0, 1); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); };
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  // ---------- renderer / scene ----------
  const canvas = $('#stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: CAPTURE });
  renderer.setPixelRatio(CAPTURE ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const BG = 0xe4ecef;
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 230, 460);
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 800);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xaebdc3, 1.15));
  const sun = new THREE.DirectionalLight(0xfff6ea, 2.0);
  sun.position.set(60, 95, 55);
  sun.target.position.set(17, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(CAPTURE ? 4096 : 3072, CAPTURE ? 4096 : 3072);
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 55, bottom: -55, near: 10, far: 260 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  // ---------- helpers ----------
  const COL = { green: 0x00a878, greenD: 0x007f5b, slate: 0x44535b, white: 0xf7fafb, card: 0xcda46a, cardD: 0xb98f57, amber: 0xb8863b };
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
  function B(w, h, d, m, x, y, z, parent, cast) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    g.position.set(x || 0, y || 0, z || 0);
    g.castShadow = cast !== false; g.receiveShadow = true;
    if (parent) parent.add(g);
    return g;
  }
  function S(sx, sy, sz, m, x, y, z, parent, seg) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(1, seg || 32, seg ? seg * 0.66 : 20), m);
    g.scale.set(sx, sy, sz); g.position.set(x || 0, y || 0, z || 0);
    g.castShadow = true; g.receiveShadow = true;
    if (parent) parent.add(g);
    return g;
  }
  function CY(rt, rb, h, m, x, y, z, parent, seg) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), m);
    g.position.set(x || 0, y || 0, z || 0); g.castShadow = true; g.receiveShadow = true;
    if (parent) parent.add(g);
    return g;
  }
  function tex(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
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
  const pickables = [];
  function pickable(obj, info) { obj.userData.pick = info; pickables.push(obj); }

  // ---------- environment ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), M(0xd8e2e6));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true; scene.add(ground);
  B(134, 0.3, 54, M(0xf3f6f7), 17, -0.15, -1, scene, false);                     // factory slab
  B(134.6, 0.34, 0.5, M(COL.green), 17, -0.15, 26.2, scene, false);               // slab edge accents
  B(40.6, 0.02, 38, M(0xe7eef0), -26, 0.012, -2.6, scene, false);                // warehouse floor tint
  function strip(x1, z1, x2, z2, w, color, y) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const holder = new THREE.Group(); holder.position.set((x1 + x2) / 2, y || 0.03, (z1 + z2) / 2); holder.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), new THREE.MeshBasicMaterial({ color })); m.rotation.x = -Math.PI / 2;
    holder.add(m); scene.add(holder); return holder;
  }
  // AGV lane (z = 10) + edge lines
  strip(-8, 10, 66, 10, 2.0, 0xd5f0e7); strip(-8, 8.95, 66, 8.95, 0.12, COL.green); strip(-8, 11.05, 66, 11.05, 0.12, COL.green);
  strip(-8, -13.4, -8, 10, 1.6, 0xd5f0e7);
  // walkway lines around the assembly row
  strip(-3, -9.5, 70, -9.5, 0.14, 0xaec2c9); strip(-3, 14.2, 70, 14.2, 0.14, 0xaec2c9);

  // trees
  (function trees() {
    const r = rng(7);
    const trunk = M(0xa9b6a9), leaf = [M(0xb9dccd), M(0xa5d3c0), M(0xcbe6da)];
    for (let i = 0; i < 26; i++) {
      const x = -52 + i * 5.4 + r() * 2, z = (i % 2 ? 33 : -35) + r() * 6 * (i % 2 ? 1 : -1);
      CY(0.18, 0.22, 1.6, trunk, x, 0.8, z, scene, 8);
      S(1.6 + r() * 0.5, 1.9 + r() * 0.6, 1.6 + r() * 0.5, leaf[i % 3], x, 2.8, z, scene, 14);
    }
  })();

  // ---------- warehouse ----------
  const wh = new THREE.Group(); scene.add(wh);
  const ROWZ = [-16, -9, -2, 5];
  const unitX = (bay) => -39 + bay * 7.4;
  const crates = {}; // part id -> crate mesh in rack
  (function warehouse() {
    const wall = M(0xf1f5f6), band = M(COL.green), cap = M(COL.slate);
    B(40.6, 10, 0.5, wall, -26, 5, -21.2, wh); B(40.6, 1.1, 0.6, band, -26, 0.55, -20.9, wh, false); B(40.6, 0.8, 0.7, cap, -26, 10.2, -21.0, wh, false);
    B(0.5, 10, 38.6, wall, -46.2, 5, -2.2, wh); B(0.6, 1.1, 38.6, band, -45.9, 0.55, -2.2, wh, false); B(0.7, 0.8, 38.6, cap, -46.0, 10.2, -2.2, wh, false);
    // clerestory light band
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(36, 1.4), new THREE.MeshBasicMaterial({ color: 0xdff6ee }));
    glow.position.set(-26, 7.4, -20.9); wh.add(glow);
    // portal frames
    const fr = M(0xaebdc3);
    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 9.5;
      B(0.2, 0.2, 37.5, fr, x, 9.4, -2.3, wh);
    }
    // racks
    const r = rng(11), post = M(COL.green), beam = M(0x8fa1a9), pal = M(0xb8956a), boxes = [M(COL.card), M(COL.cardD), M(0xe9e6df), M(0xd7b98b)];
    const levels = [0.35, 2.55, 4.75];
    for (let row = 0; row < 4; row++) for (let bay = 0; bay < 4; bay++) {
      const ux = unitX(bay), uz = ROWZ[row];
      const u = new THREE.Group(); u.position.set(ux, 0, uz); wh.add(u);
      for (const sx of [-3.2, 3.2]) for (const sz of [-0.8, 0.8]) B(0.16, 6.4, 0.16, post, sx, 3.2, sz, u);
      for (const ly of levels) {
        B(6.4, 0.14, 0.14, beam, 0, ly, 0.8, u, false); B(6.4, 0.14, 0.14, beam, 0, ly, -0.8, u, false);
        B(6.2, 0.06, 1.55, M(0xdde4e7), 0, ly + 0.05, 0, u, false);
        // filler cartons
        const li = levels.indexOf(ly);
        for (let k = 0; k < 3; k++) {
          if (r() < 0.12) continue;
          const bw = 1.3 + r() * 0.5, bh = 0.8 + r() * 0.9, bd = 1.0 + r() * 0.35;
          const slotHere = D.parts.some((p) => p.row === row && p.bay === bay && p.lvl === li);
          if (slotHere && k === 0) continue;
          const b = B(bw, bh, bd, boxes[(r() * 4) | 0], -2.2 + k * 2.2 + (r() - 0.5) * 0.3, ly + 0.1 + bh / 2, 0, u, false);
          b.castShadow = false;
        }
      }
      u.traverse((o) => { if (o.isMesh) o.userData.rack = true; });
      pickable(u, { type: 'warehouse' });
    }
    // part crates (green banded)
    const crateM = M(0xe6eaec), bandM = M(COL.green, { emissive: COL.green, emissiveIntensity: 0.15 });
    D.parts.forEach((p) => {
      const g = new THREE.Group();
      B(1.9, 1.3, 1.2, crateM, 0, 0.65, 0, g); B(1.95, 0.22, 1.25, bandM, 0, 0.9, 0, g, false); B(1.95, 1.34, 0.22, bandM, 0, 0.67, 0, g, false);
      g.position.set(unitX(p.bay) + 1.2, levels[p.lvl] + 0.12, ROWZ[p.row]);
      scene.add(g); crates[p.id] = g;
    });
  })();

  // ---------- stations ----------
  const stationLED = [], stationRing = [], stationGroups = [];
  (function stations() {
    const slate = M(COL.slate), padM = M(0xffffff, { roughness: 0.5 });
    SX.forEach((x, k) => {
      const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g); stationGroups.push(g);
      const pad = CY(7.2, 7.4, 0.22, padM, 0, 0.11, 0, g, 64); pad.castShadow = false;
      const ringM = new THREE.MeshStandardMaterial({ color: COL.green, emissive: COL.green, emissiveIntensity: 0.2, roughness: 0.4 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.1, 8, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.24; g.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.04, 6, 96), M(0xc7d3d8)); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.23; g.add(ring2);
      stationRing.push(ringM);
      // gantry
      B(0.3, 7.4, 0.3, slate, 0, 3.7, 8.6, g); B(0.3, 7.4, 0.3, slate, 0, 3.7, -8.6, g); B(0.4, 0.34, 17.5, slate, 0, 7.5, 0, g);
      const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 0.2 });
      B(0.2, 0.14, 15.6, led, 0.1, 7.15, 0, g, false); stationLED.push(led);
      // workbench + tools
      B(2.6, 0.9, 1.0, slate, 3.8, 0.45, -9.8, g); B(2.7, 0.08, 1.1, M(0xffffff), 3.8, 0.94, -9.8, g);
      B(0.5, 0.35, 0.4, M(COL.green), 3.2, 1.2, -9.8, g); B(0.7, 0.05, 0.5, M(0x1d2a30), 4.4, 1.0, -9.8, g, false);
      pickable(pad, { type: 'station', i: k }); pickable(g.children[g.children.length - 1], { type: 'station', i: k });
      g.traverse((o) => { if (o.isMesh) o.userData.pick = { type: 'station', i: k }; });
      pickables.push(g);
    });
  })();

  // ---------- Hili aircraft ----------
  const ac = (function buildAircraft() {
    const root = new THREE.Group(); scene.add(root);
    const cart = new THREE.Group(); root.add(cart);
    const slate = M(0x7a8b93), cartLed = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 0.8 });
    B(8.6, 0.22, 3.8, slate, 0, 0.2, 0, cart); B(8.6, 0.08, 0.1, cartLed, 0, 0.3, 1.88, cart, false); B(8.6, 0.08, 0.1, cartLed, 0, 0.3, -1.88, cart, false);
    [[-3.6, 1.5], [3.6, 1.5], [-3.6, -1.5], [3.6, -1.5]].forEach((p) => { const w = CY(0.14, 0.14, 0.14, M(0x20272b), p[0], 0.1, p[1], cart, 12); w.rotation.x = Math.PI / 2; });
    const a = new THREE.Group(); a.position.y = 0.31; root.add(a);
    const P = {}; const mk = (id) => { const g = new THREE.Group(); a.add(g); P[id] = g; return g; };
    const bodyM = M(0xd8d4ba, { roughness: 0.36, metalness: 0.28 });
    const bodyD = M(0xc6c2a8, { roughness: 0.4, metalness: 0.25 });
    const hullM = new THREE.MeshStandardMaterial({ color: 0xd8d4ba, roughness: 0.36, metalness: 0.28, transparent: true, opacity: 1 });
    const carbon = M(0x24292c, { roughness: 0.4, metalness: 0.3 });
    const greenM = M(0x0aa073, { roughness: 0.4 });
    const darkM = M(0x20282d, { roughness: 0.6 });
    const HC = { x: 0.4, y: 1.35 }, HR = { x: 3.4, y: 1.0, z: 0.92 };
    const surf = (x, y) => { const u = (x - HC.x) / HR.x, v = (y - HC.y) / HR.y, q = 1 - u * u - v * v; return q > 0 ? HR.z * Math.sqrt(q) : 0; };
    function patch(w, h, cx, cy, side, m, off, sg) {
      const g = new THREE.PlaneGeometry(w, h, sg ? sg[0] : 20, sg ? sg[1] : 10), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = cx + p.getX(i), y = cy + p.getY(i); p.setXYZ(i, x, y, side * (surf(x, y) + (off || 0.012))); }
      g.computeVertexNormals();
      const me = new THREE.Mesh(g, m); me.receiveShadow = true; return me;
    }
    // --- fuselage
    const F = mk('fuselage');
    S(HR.x, HR.y, HR.z, hullM, HC.x, HC.y, 0, F, 56).castShadow = true;
    S(1.6, 0.8, 0.74, hullM, 2.5, 0.88, 0, F, 40);
    S(1.7, 0.85, 0.66, hullM, -2.6, 1.6, 0, F, 32);
    const stripe = [];
    [1, -1].forEach((side) => {
      const pts = [];
      for (let x = 3.05; x >= -2.3; x -= 0.15) {
        const yy = x > 0.9 ? lerp(1.5, 0.62, smr((x - 0.9) / 2.15)) : 1.5;
        const z = surf(x, yy); if (z < 0.08) continue;
        pts.push(new THREE.Vector3(x, yy, side * (z + 0.018)));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.045, 6), greenM);
      F.add(tube);
    });
    const logoT = tex(512, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#00a878'; c.translate(86, 120); c.rotate(Math.PI / 4); c.lineWidth = 16; c.strokeStyle = '#00a878'; c.strokeRect(-34, -34, 68, 68); c.rotate(-Math.PI / 4); c.translate(-86, -120);
      c.fillStyle = '#44535b'; c.font = '700 96px Inter, Arial, sans-serif'; c.fillText('Hili', 170, 120); c.font = '700 70px "IBM Plex Sans Arabic", Arial'; c.fillText('هيلي', 178, 196);
    });
    const logoM = new THREE.MeshBasicMaterial({ map: logoT, transparent: true, side: THREE.DoubleSide });
    [1, -1].forEach((s) => { const l = patch(1.15, 0.58, 2.35, 1.62, s, logoM, 0.02, [10, 5]); F.add(l); });
    // --- cargo bay
    const CG = mk('cargo');
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
    [1, -1].forEach((s) => CG.add(patch(2.8, 1.18, 0.55, 1.4, s, cargoM, 0.016, [24, 12])));
    // --- landing gear
    const G = mk('gear');
    [1, -1].forEach((s) => {
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 14), bodyM); pod.position.set(-1.9, 0.72, s * 1.1); pod.castShadow = true; G.add(pod);
      B(0.28, 0.3, 0.9, bodyM, -1.9, 1.15, s * 0.7, G);
      const w = CY(0.2, 0.2, 0.14, M(0x14191c), -1.9, 0.2, s * 1.1, G, 18); w.rotation.x = Math.PI / 2;
    });
    B(0.1, 0.3, 0.1, darkM, 2.9, 0.4, 0, G); { const w = CY(0.2, 0.2, 0.16, M(0x14191c), 2.9, 0.2, 0, G, 18); w.rotation.x = Math.PI / 2; }
    // --- wing
    const W = mk('wing');
    const wsh = new THREE.Shape(); wsh.absellipse(0, 0, 0.78, 0.115, 0, Math.PI * 2, false, 0);
    const wg = new THREE.ExtrudeGeometry(wsh, { depth: 11.95, bevelEnabled: false, curveSegments: 28 }); wg.translate(0, 0, -5.975);
    const wm = new THREE.Mesh(wg, bodyM); wm.position.set(0.3, 2.47, 0); wm.castShadow = true; wm.receiveShadow = true; W.add(wm);
    const lights = [];
    [[5.95, 0xff2a2a], [-5.95, 0x2aff88]].forEach((p) => {
      const lm = new THREE.MeshStandardMaterial({ color: 0x555555, emissive: p[1], emissiveIntensity: 0 }); lights.push(lm);
      S(0.1, 0.1, 0.1, lm, 0.3, 2.5, p[0], W, 10);
    });
    // --- booms (4) + pod fairings
    const BM = mk('booms');
    const boomZ = [[1.78, 6.61, -1.525], [-1.78, 6.61, -1.525], [4.75, 3.46, 0], [-4.75, 3.46, 0]];
    boomZ.forEach((b) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, b[1], 8, 16), bodyM); c.rotation.z = Math.PI / 2; c.position.set(b[2], 2.3, b[0]); c.castShadow = true; BM.add(c); });
    [1.78, -1.78, 4.75, -4.75].forEach((z) => [1.3, -1.3].forEach((x) => S(0.62, 0.2, 0.24, bodyM, x, 2.4, z, BM, 20)));
    // --- tail
    const T = mk('tail');
    const fsh = new THREE.Shape(); fsh.moveTo(-4.1, 0); fsh.lineTo(-5.2, 0); fsh.lineTo(-5.4, 1.0); fsh.lineTo(-4.75, 1.0); fsh.closePath();
    const fg = new THREE.ExtrudeGeometry(fsh, { depth: 0.09, bevelEnabled: false }); fg.translate(0, 0, -0.045);
    [1.78, -1.78].forEach((z) => { const f = new THREE.Mesh(fg, bodyM); f.position.set(0, 2.3, z); f.castShadow = true; T.add(f); });
    B(1.0, 0.07, 3.75, bodyM, -5.05, 3.3, 0, T);
    const flagT = tex(128, 80, (c, w, h) => { c.fillStyle = '#00732f'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#fff'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#111'; c.fillRect(0, 2 * h / 3, w, h / 3 + 1); c.fillStyle = '#ff0000'; c.fillRect(0, 0, w * 0.26, h); });
    const flagM = new THREE.MeshBasicMaterial({ map: flagT, side: THREE.DoubleSide });
    [1, -1].forEach((s) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), flagM); f.position.set(-4.85, 2.65, s * (1.78 + 0.05)); T.add(f); });
    // --- control surfaces
    const CS = mk('surfaces'); const csM = M(0xa8d5c5, { roughness: 0.45 });
    [[-0.6, 2.05], [-0.6, -2.05], [-0.6, 3.5], [-0.6, -3.5], [-0.6, 5.3], [-0.6, -5.3]].forEach((p) => B(0.34, 0.06, p[1] > 4 || p[1] < -4 ? 1.1 : 1.3, csM, p[0], 2.46, p[1], CS));
    B(0.34, 0.05, 3.5, csM, -5.5, 3.3, 0, CS); [1.78, -1.78].forEach((z) => B(0.3, 0.8, 0.07, csM, -5.4, 2.7, z, CS));
    // --- lift motors
    const props = [];
    function motorSet(id, xm) {
      const g = mk(id);
      [1.78, -1.78, 4.75, -4.75].forEach((z, i) => {
        CY(0.17, 0.2, 0.2, M(0x2c3338, { metalness: 0.4, roughness: 0.4 }), xm, 2.66, z, g, 16);
        const pg = new THREE.Group(); pg.position.set(xm, 2.82, z); g.add(pg);
        CY(0.07, 0.09, 0.1, greenM, 0, 0, 0, pg, 12);
        [1, -1].forEach((s) => { const bl = B(1.05, 0.022, 0.11, carbon, s * 0.57, 0, 0, pg); bl.rotation.x = s * 0.12; });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 36), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
        disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; disc.visible = false; disc.raycast = () => {}; pg.add(disc);
        props.push({ g: pg, disc, dir: (i + (xm > 0 ? 0 : 1)) % 2 ? 1 : -1 });
      });
    }
    motorSet('motorsF', 1.3); motorSet('motorsR', -1.3);
    // --- pusher + ICE + tank
    const PU = mk('pusher');
    S(0.75, 0.46, 0.46, bodyD, -3.3, 1.9, 0, PU, 24);
    B(0.95, 0.5, 0.55, M(COL.amber, { roughness: 0.5, metalness: 0.2 }), -2.45, 1.55, 0, PU);
    for (let i = 0; i < 4; i++) B(0.07, 0.3, 0.62, M(0x8c6a2f), -2.75 + i * 0.25, 1.85, 0, PU, false);
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 12), M(0xd8b36a, { roughness: 0.4 })); tank.rotation.z = Math.PI / 2; tank.position.set(-0.9, 0.85, 0); tank.castShadow = true; PU.add(tank);
    const pp = new THREE.Group(); pp.position.set(-3.95, 1.9, 0); PU.add(pp);
    CY(0.09, 0.14, 0.2, greenM, 0.04, 0, 0, pp, 12).rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const bl = B(0.03, 0.95, 0.1, carbon, 0, 0, 0, pp); bl.geometry.translate(0, 0.47, 0); bl.position.set(0, 0, 0); bl.rotation.x = (i * Math.PI * 2) / 3; }
    const pdisc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 32), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    pdisc.rotation.y = Math.PI / 2; pdisc.visible = false; pdisc.raycast = () => {}; pp.add(pdisc);
    // --- battery
    const BA = mk('battery');
    const batM = M(0x2c383e, { roughness: 0.5 });
    [1.05, 1.75].forEach((y) => { B(0.95, 0.55, 0.85, batM, 2.25, y, 0, BA); B(0.96, 0.08, 0.86, greenM, 2.25, y + 0.3, 0, BA, false); });
    B(0.5, 0.3, 0.5, M(0xe8eef0), 1.45, 1.95, 0, BA); B(0.1, 0.08, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 1 }), 1.45, 2.14, 0, BA, false);
    // --- avionics
    const AV = mk('avionics');
    B(0.55, 0.28, 0.7, M(0xe8eef0), 0.85, 1.95, 0, AV);
    [0.3, -0.3].forEach((z) => { B(0.4, 0.2, 0.4, slate, 0.2, 1.95, z, AV); B(0.06, 0.06, 0.06, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COL.green, emissiveIntensity: 1.2 }), 0.42, 2.0, z, AV, false); });
    // --- nav
    const NV = mk('nav');
    CY(0.14, 0.14, 0.06, M(0xffffff), 2.3, 2.23, 0, NV, 16); CY(0.014, 0.014, 0.5, darkM, 3.8, 1.35, 0, NV, 8).rotation.z = Math.PI / 2;
    CY(0.015, 0.015, 0.4, darkM, 1.0, 0.5, 0.2, NV, 6); B(0.2, 0.06, 0.2, M(0xffffff), 0.1, 0.4, 0, NV, false);
    // --- C2
    const C2 = mk('c2');
    [0.4, -0.4].forEach((z) => B(0.3, 0.02, 0.18, M(0xffffff), -2.2, 2.3, z, C2));
    const hp = [[2.2, 1.2, 0.12], [1.2, 1.55, 0.12], [0.5, 1.85, 0.05], [-0.6, 1.6, 0.05], [-1.8, 1.7, 0], [-2.5, 1.75, 0]].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    C2.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 40, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ffb0, emissiveIntensity: 1.1 })));
    // scan beam
    const scan = new THREE.Group(); root.add(scan);
    const sbm = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), new THREE.MeshBasicMaterial({ color: COL.green, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    sbm.rotation.y = Math.PI / 2; sbm.position.y = 2.2; sbm.raycast = () => {}; scan.add(sbm);
    const sedge = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.07), new THREE.MeshBasicMaterial({ color: 0x00ffb0 })); sedge.rotation.y = Math.PI / 2; sedge.position.y = 4.0; sedge.raycast = () => {}; scan.add(sedge);
    scan.visible = false;
    Object.values(P).forEach((g) => g.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; }));
    pickable(root, { type: 'aircraft' });
    return { root, a, P, hullM, props, pp, pdisc, lights, scan, cartLed };
  })();

  // ---------- parts schedule ----------
  const AGV_PATHS = {};
  const sched = D.parts.map((p) => {
    const px = unitX(p.bay), pz = ROWZ[p.row] + 2.6, xk = SX[p.st];
    const path = mkPath([[px, pz], [-8, pz], [-8, 10], [xk, 10], [xk, 8.3]]);
    const ti = p.st * PERIOD + p.at, arr = ti - 1.2, dep = Math.max(0, arr - path.L / SPEED);
    return Object.assign({ path, dep, arr, ti, garage: path.cum[2], retStart: ti + 0.3 }, p);
  });
  const stageParts = [0, 1, 2, 3, 4].map((k) => sched.filter((p) => p.st === k));
  const hullFullT = Math.max.apply(null, stageParts[3].map((p) => p.ti)) + 1.6;
  const INSP = 4 * PERIOD; // stage-5 start
  const SPIN_T = INSP + D.checks[2].at, LIGHT_T = INSP + D.checks[4].at, READY_T = INSP + 21;

  // AGVs
  const agvM = { slate: M(COL.slate), green: M(COL.green, { emissive: COL.green, emissiveIntensity: 0.4 }), crate: M(0xe6eaec) };
  const agvs = sched.map((p) => {
    const g = new THREE.Group();
    B(2.1, 0.32, 1.35, agvM.slate, 0, 0.32, 0, g); B(2.0, 0.07, 1.25, agvM.green, 0, 0.52, 0, g, false); B(0.1, 0.1, 1.0, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1.06, 0.34, 0, g, false);
    [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]].forEach((q) => { const w = CY(0.16, 0.16, 0.12, M(0x1c2226), q[0], 0.16, q[1], g, 12); w.rotation.x = Math.PI / 2; });
    const crate = new THREE.Group(); crate.position.set(0, 0.56, 0); g.add(crate);
    B(1.45, 1.0, 1.05, agvM.crate, 0, 0.5, 0, crate); B(1.5, 0.2, 1.1, agvM.green, 0, 0.72, 0, crate, false); B(1.5, 1.04, 0.2, agvM.green, 0, 0.52, 0, crate, false);
    g.visible = false; scene.add(g);
    pickable(g, { type: 'agv', id: p.id });
    return { g, crate };
  });

  // workers
  function makeWorker(vest) {
    const g = new THREE.Group(), pv = new THREE.Group(); g.add(pv);
    const over = M(0xe3e9eb), vestM = M(vest), skin = M(0xd7a67e), slate = M(COL.slate), helm = M(0xffffff);
    const legs = [-0.1, 0.1].map((x) => { const l = new THREE.Group(); l.position.set(x, 0.62, 0); B(0.16, 0.62, 0.18, slate, 0, -0.31, 0, l); pv.add(l); return l; });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 4, 10), over); torso.position.y = 1.08; torso.castShadow = true; pv.add(torso);
    const vv = CY(0.235, 0.235, 0.34, vestM, 0, 1.1, 0, pv, 14); vv.material = vestM;
    S(0.17, 0.18, 0.17, skin, 0, 1.6, 0, pv, 12);
    const hh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), helm); hh.position.y = 1.62; hh.castShadow = true; pv.add(hh);
    const arms = [-0.3, 0.3].map((x) => { const a = new THREE.Group(); a.position.set(x, 1.32, 0); B(0.1, 0.52, 0.11, over, 0, -0.26, 0, a); B(0.09, 0.09, 0.09, skin, 0, -0.55, 0, a, false); pv.add(a); return a; });
    g.userData.w = { pv, legs, arms, torso };
    g.scale.setScalar(1.45);
    scene.add(g); pickable(g, { type: 'worker' });
    return g;
  }
  const crew = [];
  SX.forEach((x, k) => {
    crew.push({ g: makeWorker(COL.green), k, x: x + 3.6, z: 8.1, face: Math.PI, ph: k }, { g: makeWorker(0x2a8fbf), k, x: x - 3.4, z: -8.2, face: 0, ph: k + 2 });
  });
  crew.push({ g: makeWorker(COL.green), k: 4, x: SX[4] - 7.4, z: 3.6, face: Math.PI / 2, ph: 5 });
  const patrols = [
    { g: makeWorker(0xe6a02a), path: mkPath([[-40, -3.6], [-12, -3.6], [-12, -10], [-40, -10], [-40, -3.6]]), v: 1.6, o: 0 },
    { g: makeWorker(0xe6a02a), path: mkPath([[-12, 3.2], [-40, 3.2], [-40, -3.6], [-12, -3.6], [-12, 3.2]]), v: 1.5, o: 20 },
  ];
  // forklift
  const fork = (function () {
    const g = new THREE.Group(), white = M(0xf4f7f8), gr = M(COL.green), blk = M(0x20272b);
    B(1.9, 0.9, 1.15, white, -0.1, 0.8, 0, g); B(1.92, 0.2, 1.17, gr, -0.1, 0.55, 0, g, false); B(1.0, 0.1, 1.0, blk, -0.3, 1.9, 0, g);
    [[-0.7, 0.55], [-0.7, -0.55]].forEach((q) => B(0.07, 1.0, 0.07, blk, q[0], 1.4, q[1], g)); [[0.1, 0.55], [0.1, -0.55]].forEach((q) => B(0.07, 1.0, 0.07, blk, q[0], 1.4, q[1], g));
    B(0.14, 3.0, 0.9, blk, 0.95, 1.6, 0, g); B(1.5, 0.08, 0.2, blk, 1.7, 0.2, 0.3, g); B(1.5, 0.08, 0.2, blk, 1.7, 0.2, -0.3, g);
    [[-0.7, 0.62], [0.6, 0.62], [-0.7, -0.62], [0.6, -0.62]].forEach((q) => { const w = CY(0.25, 0.25, 0.2, blk, q[0], 0.25, q[1], g, 14); w.rotation.x = Math.PI / 2; });
    const load = new THREE.Group(); load.position.set(1.8, 0.3, 0); g.add(load);
    B(1.3, 0.14, 1.2, M(0xb8956a), 0, 0.07, 0, load); B(1.15, 0.9, 1.0, M(COL.card), 0, 0.65, 0, load); B(1.18, 0.14, 1.04, gr, 0, 0.8, 0, load, false);
    g.userData.load = load; scene.add(g); pickable(g, { type: 'forklift' });
    return g;
  })();
  const forkPath = mkPath([[-10.8, -12.5], [-45, -12.5], [-45, 1.5], [-10.8, 1.5], [-10.8, -12.5]]);

  // ---------- labels ----------
  const labelsEl = $('#labels'), labels = [];
  function addLabel(cls, html, getPos, onClick) {
    const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = html; labelsEl.appendChild(el);
    if (onClick) el.addEventListener('click', onClick);
    const o = { el, getPos, v: new THREE.Vector3() }; labels.push(o); return o;
  }
  const stageLabels = [];
  function buildLabels() {
    labels.splice(0).forEach((l) => l.el.remove()); stageLabels.length = 0;
    SX.forEach((x, k) => {
      const l = addLabel('', '<span class="n">' + (k + 1) + '</span><span class="t">' + N(D.stages[k].n) + '<small>' + fmt(k * PERIOD) + ' – ' + fmt(k * PERIOD + STG) + '</small></span><span class="mini"><i></i></span>',
        () => new THREE.Vector3(x, 8.2, 0), () => select({ type: 'station', i: k }));
      stageLabels.push(l);
    });
    addLabel('zone small', '<span class="n">W</span><span class="t">' + L('lblWarehouse') + '</span>', () => new THREE.Vector3(-26, 11.6, -12), () => select({ type: 'warehouse' }));
    acLabel = addLabel('small', '<span class="n">H</span><span class="t">Hili A1<small class="pc"></small></span>', () => new THREE.Vector3(ac.root.position.x, 5.6, 0), () => select({ type: 'aircraft' }));
  }
  let acLabel = null;

  // ---------- camera ----------
  const cam = { t: new THREE.Vector3(20, 0, 0), r: 150, az: 0.44, ph: 1.0 };
  const PRESETS = {
    overview: { t: [20, 0, -5], r: 150, az: 0.44, ph: 1.0 },
    warehouse: { t: [-26, 1, -2], r: 62, az: -0.3, ph: 0.95 },
    line: { t: [36, 1, 0], r: 98, az: 0.34, ph: 1.0 },
    follow: { t: [8, 2, 0], r: 34, az: 0.55, ph: 1.0 },
  };
  const TOUR = [[0, [-24, 1, -2], 84, -0.25, 0.86], [5, [-14, 1, 4], 72, -0.1, 0.86], [8, [8, 1, 2], 48, 0.45, 0.82], [21, [8, 1, 0], 42, 1.0, 0.86]];
  for (let k = 1; k < 5; k++) { const sgn = k % 2 ? -1 : 1; TOUR.push([k * PERIOD + 3, [SX[k], 1, 0], k === 4 ? 38 : 42, sgn * 0.5, 0.84], [k * PERIOD + 21, [SX[k], 1, 0], k === 4 ? 34 : 38, sgn * 1.05, 0.88]); }
  TOUR.push([112, [34, 2, 0], 110, 0.44, 1.0], [122, [20, 0, 0], 150, 0.44, 1.0]);
  function tourCam(t) {
    let i = 0; while (i < TOUR.length - 2 && t > TOUR[i + 1][0]) i++;
    const a = TOUR[i], b = TOUR[i + 1], u = smr((t - a[0]) / (b[0] - a[0]));
    cam.t.set(lerp(a[1][0], b[1][0], u), lerp(a[1][1], b[1][1], u), lerp(a[1][2], b[1][2], u));
    cam.r = lerp(a[2], b[2], u); cam.az = lerp(a[3], b[3], u); cam.ph = lerp(a[4], b[4], u);
  }
  function applyCam() {
    const s = Math.sin(cam.ph);
    camera.position.set(cam.t.x + cam.r * s * Math.sin(cam.az), cam.t.y + cam.r * Math.cos(cam.ph), cam.t.z + cam.r * s * Math.cos(cam.az));
    camera.lookAt(cam.t);
  }
  let mode = 'overview', tween = null;
  function setMode(m, instant) {
    mode = m; document.querySelectorAll('#cams button').forEach((b) => b.classList.toggle('on', b.dataset.c === m));
    if (m === 'tour' || !PRESETS[m]) return;
    const p = PRESETS[m];
    const to = { t: new THREE.Vector3(...p.t), r: p.r, az: p.az, ph: p.ph };
    if (m === 'follow') to.t.set(ac.root.position.x, 2, 0);
    if (instant || CAPTURE) { cam.t.copy(to.t); cam.r = to.r; cam.az = to.az; cam.ph = to.ph; return; }
    tween = { t0: performance.now(), dur: 1300, from: { t: cam.t.clone(), r: cam.r, az: cam.az, ph: cam.ph }, to };
  }
  function stepTween() {
    if (!tween) return;
    const u = smr((performance.now() - tween.t0) / tween.dur), f = tween.from, o = tween.to;
    cam.t.lerpVectors(f.t, o.t, u); cam.r = lerp(f.r, o.r, u); cam.az = lerp(f.az, o.az, u); cam.ph = lerp(f.ph, o.ph, u);
    if (u >= 1) tween = null;
  }
  // input
  const ptrs = new Map(); let drag = null, lastPinch = 0;
  function userMoved() { tween = null; if (mode === 'tour' || ['overview', 'warehouse', 'line'].includes(mode)) { mode = mode === 'tour' ? 'free' : mode; document.querySelectorAll('#cams button').forEach((b) => b.classList.toggle('on', b.dataset.c === mode)); } }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now(), btn: e.button, shift: e.shiftKey };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) { hover(e); return; }
    const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) { cam.r = clamp(cam.r * (lastPinch / d), 12, 260); userMoved(); } lastPinch = d; drag && (drag.moved += 99); return;
    }
    if (!drag) return; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 4) return;
    userMoved();
    if (drag.btn === 2 || drag.shift) {
      const k = cam.r * 0.0017; if (mode === 'follow') { mode = 'free'; document.querySelectorAll('#cams button').forEach((b) => b.classList.remove('on')); }
      cam.t.x += (-dx * Math.cos(cam.az) - dy * Math.sin(cam.az)) * k; cam.t.z += (dx * Math.sin(cam.az) - dy * Math.cos(cam.az)) * k;
    } else { cam.az -= dx * 0.005; cam.ph = clamp(cam.ph - dy * 0.005, 0.18, 1.45); }
  });
  const endPtr = (e) => {
    const was = drag; ptrs.delete(e.pointerId); if (ptrs.size < 2) lastPinch = 0;
    if (was && e.type === 'pointerup' && was.moved < 5 && performance.now() - was.t < 600 && was.btn === 0) pick(e);
    if (!ptrs.size) drag = null;
  };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.r = clamp(cam.r * Math.exp(e.deltaY * 0.0012), 12, 260); userMoved(); }, { passive: false });

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
  const stageOf = (t) => Math.min(NS - 1, Math.floor(t / PERIOD));
  const stageProg = (k, t) => clamp((t - k * PERIOD) / STG, 0, 1);
  function acX(t) {
    for (let k = 0; k < NS; k++) {
      const s = k * PERIOD;
      if (t < s + STG) return SX[k];
      if (k < NS - 1 && t < s + PERIOD) return lerp(SX[k], SX[k + 1], sm((t - s - STG) / XFER));
    }
    return SX[NS - 1];
  }
  const inXfer = (t) => { const k = stageOf(t); return k < NS - 1 && t - k * PERIOD > STG; };
  const curStage = (t) => { const k = stageOf(t); return inXfer(t) ? k + 1 : k; };
  const tri = (u) => { u = ((u % 2) + 2) % 2; return u < 1 ? u : 2 - u; };
  const heading = (path, s) => { const a = path.at(s - 0.8), b = path.at(s + 0.8); return -Math.atan2(b[1] - a[1], b[0] - a[0]); };

  function simulate(t) {
    const x = acX(t); ac.root.position.x = x;
    // parts
    sched.forEach((p, i) => {
      const grp = ac.P[p.id], u = (t - p.ti) / 1.5;
      grp.visible = t >= p.ti;
      if (grp.visible) {
        const e = eob(u), c = p.c; const o0 = [x - x + 0 - c[0], 1.8 - c[1], 8.3 - c[2]];
        grp.position.set(o0[0] * (1 - e), o0[1] * (1 - e) + 2.4 * Math.sin(Math.PI * clamp(u, 0, 1)), o0[2] * (1 - e));
        grp.rotation.y = (1 - clamp(u, 0, 1)) * 0.5;
      }
      crates[p.id].visible = t < p.dep;
      // cart
      const a = agvs[i]; let s = -1;
      if (t >= p.dep && t < p.arr) s = (t - p.dep) * SPEED;
      else if (t >= p.arr && t < p.retStart) s = p.path.L;
      else if (t >= p.retStart) { s = p.path.L - (t - p.retStart) * SPEED; if (s <= p.garage) s = -1; }
      a.g.visible = s >= 0;
      if (s >= 0) { const q = p.path.at(s); a.g.position.set(q[0], 0, q[1]); a.g.rotation.y = heading(p.path, s); a.crate.visible = t < p.ti; }
    });
    // hull x-ray -> opaque
    const hv = ac.P.fuselage.visible;
    const op = t < hullFullT - 1.6 ? 0.26 : lerp(0.26, 1, sm((t - (hullFullT - 1.6)) / 1.5));
    ac.hullM.opacity = op; ac.hullM.depthWrite = op > 0.9; ac.hullM.needsUpdate = false;
    // props spin
    const spinning = t >= SPIN_T;
    ac.props.forEach((p) => { p.g.rotation.y = spinning ? (t - SPIN_T) * 38 * p.dir : 0.35; p.disc.visible = spinning && t > SPIN_T + 0.7; });
    ac.pp.rotation.x = spinning ? (t - SPIN_T) * 45 : 0; ac.pdisc.visible = spinning && t > SPIN_T + 0.7;
    ac.lights.forEach((l) => { l.emissiveIntensity = t >= LIGHT_T ? 2.5 : 0; });
    // scan beam
    const sc = t > INSP + 1 && t < INSP + 18.5;
    ac.scan.visible = sc; if (sc) ac.scan.position.x = lerp(-5, 4.2, tri((t - INSP - 1) / 5.3));
    ac.cartLed.emissiveIntensity = 0.5 + 0.4 * Math.sin(t * 3);
    // stations
    const cs = curStage(t);
    SX.forEach((_, k) => {
      const st = t >= k * PERIOD + STG ? 2 : (t >= k * PERIOD && !inXfer(t) || (k === cs && t >= k * PERIOD - 1e-6) ? 1 : 0);
      const ei = st === 1 ? 1.6 : st === 2 ? 0.7 : 0.12; stationLED[k].emissiveIntensity = ei; stationRing[k].emissiveIntensity = st === 1 ? 1.1 : st === 2 ? 0.5 : 0.1;
    });
    // crew
    crew.forEach((c) => {
      const w = c.g.userData.w, active = t >= c.k * PERIOD && t < c.k * PERIOD + STG;
      c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.face;
      const ph = t * 6.5 + c.ph;
      w.legs.forEach((l) => (l.rotation.x = 0));
      if (active) { w.arms[1].rotation.x = -1.25 + Math.sin(ph) * 0.35; w.arms[0].rotation.x = -0.9 + Math.cos(ph * 0.8) * 0.2; w.pv.position.y = Math.abs(Math.sin(ph * 0.5)) * 0.015; w.pv.rotation.x = 0.12; }
      else { w.arms[0].rotation.x = 0.05 + Math.sin(t * 1.3 + c.ph) * 0.04; w.arms[1].rotation.x = 0.05; w.pv.position.y = 0; w.pv.rotation.x = 0; }
    });
    patrols.forEach((pt) => {
      const d = ((t * pt.v + pt.o) % pt.path.L), q = pt.path.at(d), h = pt.path.at(d + 0.5), w = pt.g.userData.w, ph = t * 7;
      pt.g.position.set(q[0], 0, q[1]); pt.g.rotation.y = Math.atan2(h[0] - q[0], h[1] - q[1]);
      w.legs[0].rotation.x = Math.sin(ph) * 0.5; w.legs[1].rotation.x = -Math.sin(ph) * 0.5; w.arms[0].rotation.x = -Math.sin(ph) * 0.4; w.arms[1].rotation.x = Math.sin(ph) * 0.4;
    });
    { const d = (t * 2.6) % forkPath.L, q = forkPath.at(d); fork.position.set(q[0], 0, q[1]); fork.rotation.y = heading(forkPath, d); fork.userData.load.visible = ((t * 2.6) % forkPath.L) < forkPath.L * 0.5; }
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
      b.innerHTML = '<span class="dot">' + (k + 1) + '</span><span class="tx"><b>' + N(s.n) + '</b><small>' + fmt(k * PERIOD) + ' – ' + fmt(k * PERIOD + STG) + '</small></span>';
      b.addEventListener('click', () => { select({ type: 'station', i: k }); time = k * PERIOD + 0.2; if (!playing) refresh(); });
      els.steps.appendChild(b);
    });
  }
  const lastUi = {};
  function setText(el, key, v) { if (lastUi[key] !== v) { lastUi[key] = v; el.textContent = v; } }
  function updateHud(t) {
    const done = sched.filter((p) => t >= p.ti).length, ov = t / TOTAL, cs = curStage(t);
    setText(els.kOverall, 'ov', Math.round(ov * 100) + '%'); els.ring.style.strokeDashoffset = String(113.1 * (1 - ov));
    setText(els.kElapsed, 'el', fmt(t)); setText(els.kRemain, 'rm', fmt(TOTAL - t)); setText(els.kParts, 'pt', done + ' / ' + sched.length);
    const fin = t >= READY_T, label = fin ? L('ready') : (inXfer(t) ? L('moving') + ' ' + (cs + 1) : (cs + 1) + ' · ' + N(D.stages[cs].n));
    setText(els.kStage, 'st', label);
    if (document.activeElement !== els.scrub) els.scrub.value = String(Math.round((t / TOTAL) * 1000));
    els.steps.querySelectorAll('.step').forEach((s, k) => { s.classList.toggle('active', k === cs && !fin); s.classList.toggle('done', t >= k * PERIOD + STG || (fin && k === 4)); });
    stageLabels.forEach((l, k) => { l.el.classList.toggle('active', k === cs && t < k * PERIOD + STG); l.el.classList.toggle('done', t >= k * PERIOD + STG); l.el.classList.toggle('sel', !!selected && selected.type === 'station' && selected.i === k); l.el.querySelector('.mini i').style.width = Math.round(stageProg(k, t) * 100) + '%'; });
    if (acLabel) { const pc = acLabel.el.querySelector('.pc'); const v = Math.round(ov * 100) + '%'; if (pc && pc.textContent !== v) pc.textContent = v; }
  }
  function stateOf(k, t) { return t >= k * PERIOD + STG ? 'done' : (t >= k * PERIOD && !inXfer(t) ? 'run' : (k === curStage(t) && inXfer(t) ? 'wait' : (t >= k * PERIOD ? 'run' : 'wait'))); }
  let panelKey = '';
  function renderPanel(t) {
    if (!selected) return;
    let kind = '', title = '', icon = '', stat = '', cls = '', prog = 0, desc = '', list = '', foot = '';
    const s = selected;
    if (s.type === 'station') {
      const k = s.i, st = stateOf(k, t), sg = D.stages[k]; kind = L('station') + ' ' + (k + 1); title = N(sg.n); icon = String(k + 1); desc = N(sg.d);
      stat = st === 'done' ? L('done') : st === 'run' ? L('running') : L('waiting'); cls = st === 'done' ? '' : st === 'run' ? 'run' : 'wait'; prog = stageProg(k, t);
      if (k < 4) list = stageParts[k].map((p) => '<li class="' + (t >= p.ti ? 'ok' : t >= p.dep ? 'run' : '') + '"><i></i>' + N(p.n) + '<em>' + (t >= p.ti ? L('installed') : t >= p.dep ? '…' : fmt(p.ti)) + '</em></li>').join('');
      else list = D.checks.map((c, j) => { const ok = t >= INSP + c.at, run = !ok && t >= INSP + c.at - 4 && t >= INSP; return '<li class="' + (ok ? 'ok' : run ? 'run' : '') + '"><i></i>' + N(c.n) + '<em>' + (ok ? L('passed') : run ? L('scanning') : L('pending')) + '</em></li>'; }).join('');
      foot = L('stageTime') + ': ' + STG + ' ' + L('demoSec');
    } else if (s.type === 'aircraft') {
      kind = L('aircraft'); title = 'Hili A1'; icon = 'H'; desc = L('acDesc'); prog = t / TOTAL; stat = t >= READY_T ? L('ready') : L('running'); cls = t >= READY_T ? '' : 'run';
      list = [[L('span'), '11.9 m'], [L('length'), '8.9 m'], [L('height'), '3.1 m'], [L('payload'), '250 kg'], [L('cargoBay'), L('cargoV')]].map((r) => '<li class="ok"><i></i>' + r[0] + '<em>' + r[1] + '</em></li>').join('');
    } else if (s.type === 'warehouse') {
      const picked = sched.filter((p) => t >= p.dep).length; kind = L('warehouse'); title = L('whWarehouse'); icon = 'W'; desc = L('whDesc'); prog = picked / sched.length; stat = L('whStock') + ' ' + picked + ' / ' + sched.length; cls = 'run';
      list = sched.map((p) => '<li class="' + (t >= p.dep ? 'ok' : '') + '"><i></i>' + N(p.n) + '<em>' + (t >= p.dep ? L('picked') : L('inStock')) + '</em></li>').join('');
    } else if (s.type === 'agv') {
      const p = sched.find((q) => q.id === s.id); kind = L('vehicle'); title = L('cartCarrying') + ' ' + N(p.n); icon = 'A'; desc = L('cartDesc'); stat = t >= p.ti ? L('installed') : t >= p.dep ? L('running') : L('waiting'); cls = t >= p.dep && t < p.ti ? 'run' : t >= p.ti ? '' : 'wait'; prog = clamp((t - p.dep) / (p.ti - p.dep), 0, 1);
    } else if (s.type === 'forklift') { kind = L('vehicle'); title = L('forklift'); icon = 'F'; desc = L('forkliftDesc'); stat = L('running'); cls = 'run'; prog = (t * 2.6 % forkPath.L) / forkPath.L; }
    else { kind = L('team'); title = L('worker'); icon = 'T'; desc = L('workerDesc'); stat = L('running'); cls = 'run'; prog = 0.5; }
    const key = [s.type, s.i, s.id, lang, title, stat, Math.round(prog * 50), list].join('|');
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
    buildLabels(); buildSteps(); Object.keys(lastUi).forEach((k) => delete lastUi[k]); panelKey = '';
  }
  $('#lang').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('hili-lang', lang); } catch (e) { /* ignore */ } applyLang(); refresh(); });
  $('#play').addEventListener('click', () => togglePlay());
  function togglePlay(v) {
    playing = v === undefined ? !playing : v; if (playing && time >= TOTAL - 0.01) time = 0;
    els.play.textContent = playing ? '❚❚' : '▶';
  }
  $('#restart').addEventListener('click', () => { time = 0; togglePlay(true); });
  document.querySelectorAll('#speed button').forEach((b) => b.addEventListener('click', () => { speed = +b.dataset.s; document.querySelectorAll('#speed button').forEach((x) => x.classList.toggle('on', x === b)); }));
  document.querySelectorAll('#cams button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.c)));
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
  function refresh() {
    time = clamp(time, 0, TOTAL); simulate(time);
    if (mode === 'tour') tourCam(time);
    else if (mode === 'follow') { cam.t.x += (ac.root.position.x - cam.t.x) * (CAPTURE ? 1 : 0.08); cam.t.y = lerp(cam.t.y, 2, 0.1); cam.t.z = lerp(cam.t.z, 0, 0.1); }
    stepTween(); applyCam(); updateHud(time); renderPanel(time); projectLabels(); renderer.render(scene, camera);
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { time += dt * speed; if (time >= TOTAL) { time = TOTAL; togglePlay(false); } }
    refresh(); requestAnimationFrame(loop);
  }

  // ---------- boot ----------
  applyLang(); resize();
  if (Q.has('t')) time = +Q.get('t');
  simulate(time); setMode('overview', true);
  if (Q.get('cam') && PRESETS[Q.get('cam')]) setMode(Q.get('cam'), true);
  if (Q.has('sel')) select({ type: 'station', i: +Q.get('sel') });
  if (Q.has('pause') || CAPTURE) togglePlay(false);
  if (Q.get('tour') === '1') setMode('tour', true);
  ['r', 'az', 'ph'].forEach((k) => { if (Q.has(k)) cam[k] = +Q.get(k); });
  refresh();
  window.__hili = {
    frame: (t, m) => { if (m && mode !== m) setMode(m, true); time = t; refresh(); },
    TOTAL, ready: true, setLang: (l) => { lang = l; applyLang(); refresh(); },
    select, closePanel,
  };
  if (!CAPTURE) requestAnimationFrame(loop);
  setTimeout(() => $('#loading').classList.add('off'), 150);
})();
