# Hili Smart Factory — interactive 3D assembly line

Open `index.html` in a browser (or the single-file `dist/hili-factory.html`). No build step, works offline
(only the Google Fonts stylesheet is optional).

## What it shows
- 3D warehouse with racks, autonomous carts, forklift and technicians.
- Five-station line that builds the Hili aircraft: Airframe → Wings & Tail → Propulsion & Power → Electronics → Final Inspection.
- Timer, overall % and per-stage %, play / pause / 1× 2× 4×, scrub bar, camera presets (Overview, Warehouse, Line, Follow, Auto tour).
- Click any station, part cart, forklift, technician, the warehouse or the aircraft for details. EN / AR (RTL) toggle.

## Files
- `index.html`, `style.css` — UI (LODD slate + green palette from the system-architecture poster).
- `data.js` — stage / part names, demo schedule, EN + AR strings. **Demo timings are illustrative** — replace `at` values and `STG` in `app.js` with real procedures.
- `app.js` — three.js scene; the whole simulation is a pure function of time, so it can be scrubbed and recorded frame by frame.
- `vendor/three.min.js` (r160), `assets/` logos, `build_single.py` bundles one HTML file into `dist/`.

## URL options
`?lang=ar` · `?cam=warehouse|line|follow|overview` · `?t=60&pause=1` · `?tour=1`
