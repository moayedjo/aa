#!/usr/bin/env python3
"""Derive web/app.js (Blender-GLB realistic version) from the procedural app.js."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'app.js').read_text()

def rep(a, b, count=1):
    global s
    assert a in s, 'missing anchor: ' + a[:80]
    s = s.replace(a, b, count)

rep("(function () {\n  'use strict';", "(async function () {\n  'use strict';")
rep("const CAPTURE = Q.has('capture');", "const CAPTURE = Q.has('capture');\n  const REAL = true;   // Blender glTF assets + post-processing\n  const FX = Q.get('fx') !== '0';")

# --- load glTF assets right before the environment section
rep("  // ---------- environment ----------", """  // ---------- Blender glTF assets (embedded as base64 so the page works from file://) ----------
  const GLB = new THREE.GLTFLoader();
  const b64buf = (str) => { const bin = atob(str), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const [GA, GS] = await Promise.all([GLB.parseAsync(b64buf(window.HILI_GLB.aircraft), ''), GLB.parseAsync(b64buf(window.HILI_GLB.site), '')]);
  GS.scene.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !/Desert|Lawns|Dunes|Road|YardSlab|HallFloor/.test(o.name);
    const m = o.material; if (!m) return; if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.8;
    if (/^Glass/.test(m.name)) { m.transmission = 0; m.transparent = true; m.opacity = 0.35; m.depthWrite = false; }
    if (m.name === 'Frond') { m.alphaTest = 0.45; m.transparent = false; m.side = THREE.DoubleSide; } } });
  scene.add(GS.scene);
  const hideSince = (n0) => { for (let i = n0; i < scene.children.length; i++) scene.children[i].visible = false; };

  // ---------- environment ----------""")
# procedural ground/slab hidden (the glTF site replaces them)
rep("ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true; scene.add(ground);", "ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true; ground.visible = false; scene.add(ground);")
rep("  B(168, 0.3, 54, slabM, 35, -0.15, -1, scene, false, 0.12);", "  const __n0 = scene.children.length;\n  B(168, 0.3, 54, slabM, 35, -0.15, -1, scene, false, 0.12);")
rep("  B(40.6, 0.02, 38, MM(0xe1e8ea), -26, 0.012, -2.6, scene, false, 0);", "  B(40.6, 0.02, 38, MM(0xe1e8ea), -26, 0.012, -2.6, scene, false, 0);\n  hideSince(__n0);")
# sections that the glTF site replaces
rep("  // ---------- factory hall (cut-away", "  const __nHall = scene.children.length;\n  // ---------- factory hall (cut-away")
rep("  // ---------- roads, parking, lamps ----------", "  hideSince(__nHall);\n  const __nRoad = scene.children.length;\n  // ---------- roads, parking, lamps ----------")
rep("  // ---------- vehicles ----------", "  hideSince(__nRoad);\n  // ---------- vehicles ----------")
rep("    [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => { const c = makeCar(", "    if (!REAL) [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => { const c = makeCar(")
rep("  // ---------- trees: palms, broad-leaf, conifers, shrubs ----------", "  const __nTree = scene.children.length;\n  // ---------- trees: palms, broad-leaf, conifers, shrubs ----------")
rep("  // ---------- VTOL landing pad (18 × 18 m) beside the factory ----------", "  hideSince(__nTree);\n  // ---------- VTOL landing pad (18 × 18 m) beside the factory ----------")
rep("  // ---------- Hili aircraft (shape follows", "  hideSince(__nHeli);\n  // ---------- Hili aircraft (shape follows")
rep("  (function helipad() {", "  const __nHeli = scene.children.length;\n  (function helipad() {")
# an invisible hit-box so the glTF landing pad stays clickable
rep("    fx.padLights = lights; fx.padRing = ringM;", "    fx.padLights = lights; fx.padRing = ringM;\n    const hit = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 18), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(HP.x, 0.3, HP.z); hit.userData.pick = { type: 'station', i: 5 }; scene.add(hit); pickables.push(hit);")

# --- aircraft from glTF
i = s.index("  const ac = (function buildAircraft() {"); j = s.index("  // ---------- parts schedule ----------")
cart_src = s[i:j]
cart_part = cart_src[cart_src.index("    // assembly cart"):cart_src.index("    // ---- skin materials")]
new_ac = """  const ac = (function buildAircraft() {
    const root = new THREE.Group(); scene.add(root);
    const a = new THREE.Group(); a.position.y = 0.31; root.add(a);
    const model = GA.scene; a.add(model);
    const P = {}; model.traverse((o) => { if (o.name && o.name.indexOf('part_') === 0) P[o.name.slice(5)] = o; });
""" + cart_part + """
    // ---- transparent "x-ray" skin (shared material) → solid champagne metal when the skin closes ----
    const skinM = new THREE.MeshPhysicalMaterial({ color: 0xc4d2d8, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const solid = new THREE.Color(0xc9b88a), ghost = new THREE.Color(0xc4d2d8), propDiscs = [], navMats = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const mat = o.material && o.material.name;
      if (mat === 'Skin_Solid') { solid.copy(o.material.color); o.material = skinM; }
      if (/^NavLight/.test(o.name)) { o.material = o.material.clone(); navMats.push(o.material); }
    });
    let skinK = -1;
    function setSkin(k) {
      if (Math.abs(k - skinK) < 1e-3) return; skinK = k;
      skinM.color.copy(ghost).lerp(solid, k); skinM.opacity = lerp(0.3, 1, k); skinM.metalness = lerp(0.05, 0.72, k); skinM.roughness = lerp(0.12, 0.26, k);
      skinM.depthWrite = k > 0.98; skinM.side = k > 0.98 ? THREE.FrontSide : THREE.DoubleSide; skinM.needsUpdate = true;
    }
    const props = [];
    ['motorsF', 'motorsR'].forEach((key) => { for (let k = 0; k < 4; k++) {
      const piv = model.getObjectByName('Rotor_' + key + '_' + k); if (!piv) continue;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 36), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.visible = false; disc.raycast = () => {}; piv.add(disc);
      props.push({ g: piv, disc, dir: (k + (key === 'motorsF' ? 0 : 1)) % 2 ? 1 : -1 });
    } });
    const pp = model.getObjectByName('PusherProp') || new THREE.Group();
    const pdisc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 32), new THREE.MeshBasicMaterial({ color: 0x24292c, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    pdisc.rotation.y = Math.PI / 2; pdisc.visible = false; pdisc.raycast = () => {}; pp.add(pdisc);
    const lights = navMats;   // nav lights: emissiveIntensity is driven by simulate()
    const scan = new THREE.Group(); root.add(scan);
    const sbm = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), new THREE.MeshBasicMaterial({ color: COL.green, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    sbm.rotation.y = Math.PI / 2; sbm.position.y = 2.0; sbm.raycast = () => {}; scan.add(sbm);
    const sedge = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.07), new THREE.MeshBasicMaterial({ color: 0x00ffb0 })); sedge.rotation.y = Math.PI / 2; sedge.position.y = 3.8; sedge.raycast = () => {}; scan.add(sedge);
    scan.visible = false;
    const livery = P.livery || new THREE.Group(); livery.visible = false;
    pickable(root, { type: 'aircraft' });
    return { root, a, cart, P, props, pp, pdisc, lights, scan, cartLed, setSkin, livery };
  })();

"""
s = s[:i] + new_ac + s[j:]

# --- post-processing pipeline
rep("  // ---------- loop ----------\n  function resize() {", """  // ---------- loop ----------
  let composer = null, gtao = null;
  if (FX && !CAPTURE) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    try { gtao = new THREE.GTAOPass(scene, camera, window.innerWidth, window.innerHeight); gtao.output = THREE.GTAOPass.OUTPUT.Default; composer.addPass(gtao); } catch (e) { gtao = null; }
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.14, 0.5, 1.05));
    composer.addPass(new THREE.OutputPass());
    composer.addPass(new THREE.SMAAPass(window.innerWidth, window.innerHeight));
  }
  function resize() {""")
rep("renderer.setSize(w, h, false); camera.aspect = w / h;", "renderer.setSize(w, h, false); if (composer) composer.setSize(w, h); camera.aspect = w / h;")
rep("projectLabels(); renderer.render(scene, camera);", "projectLabels(); if (composer) composer.render(); else renderer.render(scene, camera);")
rep("renderer.toneMappingExposure = 0.86;", "renderer.toneMappingExposure = 0.72;")
rep("document.title = lang === 'ar' ? 'مصنع هيلي الذكي' : 'Hili Smart Factory';", "document.title = lang === 'ar' ? 'مصنع هيلي الواقعي' : 'Hili Realistic Factory';")

# --- detailed props (workers, cars, trucks, racks) from the Blender props GLB
rep("const [GA, GS] = await Promise.all([GLB.parseAsync(b64buf(window.HILI_GLB.aircraft), ''), GLB.parseAsync(b64buf(window.HILI_GLB.site), '')]);",
    "const [GA, GS, GP] = await Promise.all([GLB.parseAsync(b64buf(window.HILI_GLB.aircraft), ''), GLB.parseAsync(b64buf(window.HILI_GLB.site), ''), GLB.parseAsync(b64buf(window.HILI_GLB.props), '')]);\n"
    "  const PR = {}; GP.scene.traverse((o) => { if (/^(Worker|CarSedan|CarSUV|TruckBox|TruckSemi|Rack\\d)$/.test(o.name)) PR[o.name] = o; });\n"
    "  GP.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.envMapIntensity !== undefined) o.material.envMapIntensity = 0.9; if (/^(CarGlass|GlassDark)$/.test(o.material.name)) { o.material.transparent = true; o.material.opacity = 0.82; } } });\n"
    "  const tinted = {}; const tint = (obj, matName, hex) => { obj.traverse((o) => { if (o.isMesh && o.material && o.material.name === matName) { const key = matName + '#' + hex; if (!tinted[key]) { tinted[key] = o.material.clone(); tinted[key].color.setHex(hex); } o.material = tinted[key]; } }); };")

# racks: GLB units instead of the procedural loop
i = s.index("    const r = rng(11), post = M(COL.green"); j = s.index("    // part crates: white glossy")
s = s[:i] + """    const wood = MM(0xc9a77a), levels = [0.35, 2.55, 4.75];
    for (let row = 0; row < 4; row++) for (let bay = 0; bay < 4; bay++) {
      const u = PR['Rack' + ((row * 3 + bay) % 4)].clone(true); u.position.set(unitX(bay), 0, ROWZ[row]); wh.add(u);
      pickable(u, { type: 'warehouse' });
    }
""" + s[j:]
rep("B(1.9, 1.3, 1.2, crateM, 0, 0.7, 0, g, true, 0.14);", "g.scale.set(0.62, 0.72, 0.7);\n      B(1.9, 1.3, 1.2, crateM, 0, 0.7, 0, g, true, 0.14);")
rep("g.position.set(unitX(p.bay) + 1.2, levels[p.lvl] + 0.22, ROWZ[p.row]);", "g.position.set(unitX(p.bay) + 0.85, levels[p.lvl] + 0.2, ROWZ[p.row]);")

# vehicles
i = s.index("  function makeCar(col, long) {"); j = s.index("  fx.traffic = [];")
s = s[:i] + """  function makeCar(col, long) {
    const g = new THREE.Group(), m = PR[long ? 'CarSUV' : 'CarSedan'].clone(true); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); g.add(m); tint(m, 'CarWhite', col); return g;
  }
  function makeTruck(semi) {
    const g = new THREE.Group(), m = PR[semi ? 'TruckSemi' : 'TruckBox'].clone(true); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); g.add(m); return g;
  }
""" + s[j:]

# workers
i = s.index("  function makeWorker(vest) {"); j = s.index("  const crew = [];")
s = s[:i] + """  function makeWorker(vest) {
    const g = new THREE.Group(), inner = new THREE.Group(), m = PR.Worker.clone(true); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
    inner.rotation.y = -Math.PI / 2; inner.scale.setScalar(1.3); inner.add(m); g.add(inner); tint(m, 'VestGreen', vest);
    const N = (n) => m.getObjectByName(n), ax = (n) => ({ rotation: { set x(v) { N(n).rotation.z = -v; } } });
    const spine = N('spine');
    const pv = { position: { set y(v) { inner.position.y = v; } }, rotation: { set x(v) { spine.rotation.z = -v; } } };
    g.userData.w = { pv, legs: [ax('legL'), ax('legR')], arms: [ax('armL'), ax('armR')] };
    scene.add(g); pickable(g, { type: 'worker' });
    return g;
  }
""" + s[j:]

rep('    select, closePanel,\n  };', '    select, closePanel, cam, fx,\n  };')
(root / 'web' / 'app.js').write_text(s)
print('web/app.js', len(s.splitlines()), 'lines')
