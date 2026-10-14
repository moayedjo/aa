# Hili Realistic Factory — web viewer (Three.js + Blender glTF)

`Hili_Realistic_Standalone.html` — one file, double-click to open (WebGL2 browser). Works offline.

- Aircraft and the static site (terrain, roads, hall, trees, annex, VTOL pad, parked cars) are the Blender models
  (`assets/*.glb`, embedded as base64 in `glb_data.js`).
- Detailed props are Blender models too (`assets/hili_props.glb`): articulated technicians (arms/legs/spine animated by `app.js`), sedan/SUV and box/semi
  trucks with LODD livery (traffic on the road), and the rack units with wrapped pallets and drums in the warehouse.
- Carts, robot arms, forklift, conveyor and drone stay procedural and are animated by `app.js`.
- Rendering: ACES tone mapping, environment reflections, soft shadows, GTAO ambient occlusion, bloom, SMAA. Add `?fx=0` to turn
  post-processing off on weak GPUs.
- The process loops forever; Camera tour button; AR / EN.

Rebuild: `python3 make_web_app.py && python3 build_web.py` (needs `../app.js`, `../vendor/three.bundle.js`; the bundle is built with esbuild
from three r160 + GLTFLoader/EffectComposer/GTAOPass/UnrealBloomPass/OutputPass/SMAAPass).
