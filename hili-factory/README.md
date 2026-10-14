# Hili Smart Factory — interactive 3D assembly line

Open `index.html` in a browser, or the single-file `dist/hili-factory.html`. No build step; works offline
(only the Google Fonts stylesheet is optional).

## What it shows
- 3D factory site: warehouse with racks, autonomous carts, forklift, technicians; assembly hall with 5 stations,
  robot arms, material conveyor; access road with moving cars and trucks, palms and trees, parking lot,
  industrial annex, and an 18 × 18 m VTOL landing pad.
- Six stages: Structure & Landing Gear → Internal Systems → Wings, Booms & Tail → Lift & Pusher Propulsion →
  Scan, Skin & Inspection → **Test Flight** (roll-out, vertical take-off, circuit, vertical landing on the pad).
- The aircraft skin is transparent while it is built, so the internal systems (frame, battery, ICE, cargo bay,
  avionics, C2, ESCs) are visible; the skin closes with the Hili livery during the inspection stage.
- The whole process **loops forever**: when the aircraft has landed, a new one starts.
- Timer, overall / per-stage %, play / pause / 1× 2× 4×, scrub bar, camera presets and **Camera tour**
  (smooth spline path). Click any station, cart, vehicle, equipment or the aircraft for details. EN / AR (RTL).

## Files
- `index.html`, `style.css` — UI (LODD slate + green palette).
- `data.js` — stage / part names, demo schedule, EN + AR strings. **Demo timings are illustrative** — replace
  the `at` values in `data.js` and `STARTS` in `app.js` with real procedures.
- `app.js` — three.js scene; the whole simulation is a pure function of time (scrub / record frame by frame).
- `vendor/three.min.js` (r160), `assets/` logos, `build_single.py` bundles one HTML file into `dist/`.

## URL options
`?lang=ar` · `?cam=warehouse|line|follow|overview` · `?t=60&pause=1` · `?tour=1`
