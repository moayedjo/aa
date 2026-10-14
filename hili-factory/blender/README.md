# Hili — Blender scene (photoreal stills) + glTF export for the web viewer

Requires Blender 4.2+ (or `pip install bpy`). Everything is procedural Python — no external assets except the small
textures in `tex/` (UAE flag, Hili logo, palm frond) and the reference renders in `ref/`.

| file | what it does |
|---|---|
| `hili_aircraft.py` | Hili VTOL UAV, proportions taken from the supplied top/side/front/rear/x-ray renders. `build_aircraft('solid'\|'ghost')` — one empty per assembly part (`part_battery`, `part_wing`, ...), rotors are spinnable pivots. |
| `hili_site.py` | Factory site: hall, warehouse + racks, 5 stations, robot arms, AGVs, forklift, workers, conveyor, road, trucks, cars, palms, trees, annex, 18×18 m VTOL pad, Nishita sky. |
| `render_site.py` | `blender-python render_site.py -- <shot> [samples] [WxH] [out.png] [night]` — shots: aerial, hall, closeup, helipad, hero, warehouse, road, trucks. |
| `render_all.sh` | Renders every still with Cycles (set `PY=` to your Blender python, `SAMPLES=`). On a GPU machine switch `sc.cycles.device` to `'GPU'`. |
| `render_aircraft_test.py` | Quick studio renders of the aircraft (solid / x-ray) for comparison with `ref/`. |
| `export_aircraft_glb.py`, `export_site_glb.py` | glTF exports used by `../web` (`SITE_LIGHT=1` for the lighter site). |

Skin modes: *solid* = champagne metallic paint with orange-peel bump + clearcoat; *ghost* = clear glass with Fresnel edges,
which shows the internals (battery with Hili label, ICE + hoses, cargo pallets, avionics, ESCs with red LEDs).

For a fly-through video: add a camera path (Bezier / follow-path) in `render_site.py`, set 24 fps, render the frame range
with Cycles on a GPU, encode with ffmpeg. On CPU-only machines a still takes ~10 min at 1080p / 64 spp.
